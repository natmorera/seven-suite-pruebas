import { autoridad, Autoridad } from '@/lib/paisActual';

interface ConfigHacienda {
  ambiente: 'sandbox' | 'produccion';
  clientId: string;
  usuario: string;
  contrasena: string;
  simulado: boolean;
}

function leerConfig(): ConfigHacienda {
  const usuario = process.env.HACIENDA_USERNAME ?? '';
  const contrasena = process.env.HACIENDA_PASSWORD ?? '';
  const clientId = process.env.HACIENDA_CLIENT_ID ?? (process.env.HACIENDA_AMBIENTE === 'produccion' ? 'api-prod' : 'api-stag');
  const ambiente = (process.env.HACIENDA_AMBIENTE as 'sandbox' | 'produccion') ?? 'sandbox';
  const simulado = process.env.HACIENDA_MODO_SIMULACION === 'true' || !usuario || !contrasena;
  return { ambiente, clientId, usuario, contrasena, simulado };
}

function urlIdp(ambiente: string) {
  return ambiente === 'produccion'
    ? 'https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token'
    : 'https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token';
}
function urlRecepcion(ambiente: string) {
  return ambiente === 'produccion'
    ? 'https://api.comprobanteselectronicos.go.cr/recepcion/v1/recepcion'
    : 'https://api-sandbox.comprobanteselectronicos.go.cr/recepcion/v1/recepcion';
}

async function obtenerToken(cfg: ConfigHacienda): Promise<string> {
  const res = await fetch(urlIdp(cfg.ambiente), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId, grant_type: 'password', username: cfg.usuario, password: cfg.contrasena,
    }),
  });
  if (!res.ok) throw new Error(`No se pudo autenticar contra ${autoridad()} (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

// Estados de un comprobante ante Hacienda:
//   Recibido: Hacienda lo recibió y lo tiene en cola.
//   Procesando: Hacienda lo está validando.
//   Aceptado / Rechazado: respuesta final (el rechazo trae el motivo).
//   Error: no se pudo entregar (credenciales, conexión o formato inválido).
export type EstadoHacienda = 'Recibido' | 'Procesando' | 'Aceptado' | 'Rechazado' | 'Error';

export interface ResultadoEnvio {
  simulado: boolean;
  estadoInicial: 'Recibido' | 'Error';
  error?: string;
}

export async function enviarComprobante(claveNumerica: string, xmlFirmadoBase64: string, cedulaEmisor: string, cedulaReceptor?: string): Promise<ResultadoEnvio> {
  const cfg = leerConfig();
  if (cfg.simulado) {
    return { simulado: true, estadoInicial: 'Recibido' };
  }
  try {
    const token = await obtenerToken(cfg);
    const res = await fetch(urlRecepcion(cfg.ambiente), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clave: claveNumerica,
        fecha: new Date().toISOString(),
        emisor: { tipoIdentificacion: '02', numeroIdentificacion: cedulaEmisor.replace(/\D/g, '') },
        ...(cedulaReceptor ? { receptor: { tipoIdentificacion: '01', numeroIdentificacion: cedulaReceptor.replace(/\D/g, '') } } : {}),
        comprobanteXml: xmlFirmadoBase64,
      }),
    });
    if (res.status !== 201 && res.status !== 202) {
      return { simulado: false, estadoInicial: 'Error', error: `${Autoridad()} respondió ${res.status}: ${res.headers.get('x-error-cause') ?? await res.text()}` };
    }
    return { simulado: false, estadoInicial: 'Recibido' };
  } catch (e) {
    return { simulado: false, estadoInicial: 'Error', error: e instanceof Error ? e.message : String(e) };
  }
}

export interface ConsultaEstado { estado: EstadoHacienda; respuestaXml?: string; detalle?: string }

export async function consultarEstado(claveNumerica: string): Promise<ConsultaEstado | null> {
  const cfg = leerConfig();
  if (cfg.simulado) return null; // el llamador debe simular
  try {
    const token = await obtenerToken(cfg);
    const res = await fetch(`${urlRecepcion(cfg.ambiente)}/${claveNumerica}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = await res.json();
    const ind = String(data['ind-estado'] ?? '').toLowerCase();
    const respuestaXml = data['respuesta-xml'] ? Buffer.from(String(data['respuesta-xml']), 'base64').toString('utf8') : undefined;
    const detalle = respuestaXml?.match(/<DetalleMensaje>([\s\S]*?)<\/DetalleMensaje>/)?.[1]?.trim();
    const estado: EstadoHacienda = ind === 'aceptado' ? 'Aceptado' : ind === 'rechazado' ? 'Rechazado' : ind === 'recibido' ? 'Recibido' : ind === 'error' ? 'Error' : 'Procesando';
    return { estado, respuestaXml, detalle };
  } catch {
    return null;
  }
}

export function haciendaEnModoSimulacion(): boolean {
  return leerConfig().simulado;
}

// Verifica un usuario y contraseña de Hacienda pidiendo un token al IDP del
// ambiente que corresponde. En modo simulación solo se revisa el formato.
export interface ResultadoCredenciales { ok: boolean; mensaje: string; simulado?: boolean }
export async function verificarCredenciales(usuario: string, clave: string, ambiente: 'pruebas' | 'produccion'): Promise<ResultadoCredenciales> {
  const u = usuario.trim();
  if (!u || !clave) return { ok: false, mensaje: 'Escribe el usuario y la contraseña.' };
  const m = u.match(/^cp[fj]-[\w-]+@(stag|prod)\.comprobanteselectronicos\.go\.cr$/i);
  if (!m) return { ok: false, mensaje: `El usuario no tiene el formato de ${autoridad()} (cpj-…@prod.comprobanteselectronicos.go.cr).` };
  const deUsuario = m[1].toLowerCase() === 'prod' ? 'produccion' : 'pruebas';
  if (deUsuario !== ambiente) {
    return { ok: false, mensaje: ambiente === 'produccion' ? 'Ese usuario es de pruebas (@stag); para producción usa el de @prod.' : 'Ese usuario es de producción (@prod); para pruebas usa el de @stag.' };
  }
  if (process.env.HACIENDA_MODO_SIMULACION === 'true') return { ok: true, simulado: true, mensaje: `Formato correcto (modo simulación: no se consultó a ${autoridad()}).` };
  try {
    const res = await fetch(urlIdp(ambiente === 'produccion' ? 'produccion' : 'sandbox'), {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: ambiente === 'produccion' ? 'api-prod' : 'api-stag', grant_type: 'password', username: u, password: clave }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { ok: true, mensaje: `${Autoridad()} aceptó el usuario y la contraseña.` };
    if (res.status === 400 || res.status === 401) return { ok: false, mensaje: `${Autoridad()} rechazó el usuario o la contraseña.` };
    return { ok: false, mensaje: `${Autoridad()} respondió con un error (${res.status}). Intenta de nuevo.` };
  } catch {
    return { ok: false, mensaje: `No se pudo conectar con ${autoridad()}. Revisa la conexión e intenta de nuevo.` };
  }
}
