
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
  if (!res.ok) throw new Error(`No se pudo autenticar contra Hacienda (${res.status}): ${await res.text()}`);
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
      return { simulado: false, estadoInicial: 'Error', error: `Hacienda respondió ${res.status}: ${res.headers.get('x-error-cause') ?? await res.text()}` };
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
