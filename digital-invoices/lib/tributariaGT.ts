// Información tributaria del emisor cuando la empresa es de Guatemala:
// afiliación al IVA, régimen de ISR, frases, certificadores y dirección
// fiscal. Las contraseñas de los certificadores se guardan aquí y nunca se
// devuelven a las pantallas: solo se indica si hay una guardada.
import type { Client } from '@libsql/client';
import {
  frasesDelRtu, pideNumeroResolucion, pideFechaResolucion, escenarioFrase, CERTIFICADORES_GT,
  type FraseEmisor, type CertificadorEmisor,
} from '@/lib/perfilPais';

interface CertificadorGuardado extends Omit<CertificadorEmisor, 'tieneClave'> { clave: string }
interface Guardado {
  afiliacionIva: string; vigenteDesde: string; regimenIsr: string; agenteRetencionIva: boolean;
  frases: FraseEmisor[];             // solo las agregadas a mano; las del RTU se calculan
  certificadores: CertificadorGuardado[];
}
export interface TributariaGT extends Omit<Guardado, 'certificadores'> {
  frasesRtu: FraseEmisor[];
  certificadores: CertificadorEmisor[];
}

const CLAVE = 'gt_tributaria';
// Empresa de demostración de Guatemala (Hotel Guatemala): afiliación General y DIGIFACT como
// certificador principal, para poder emitir desde el primer momento
const INICIAL: Guardado = {
  afiliacionIva: 'GEN', vigenteDesde: '2026-01-01', regimenIsr: '1', agenteRetencionIva: false, frases: [],
  certificadores: [{ id: 'cert-digifact', certificador: 'DIGIFACT', usuario: 'SEVEN', identificador: '', certificado: 'SEVEN', principal: true, verificado: true, clave: 'demo' }],
};

async function leerGuardado(db: Client): Promise<Guardado> {
  const { rows } = await db.execute({ sql: 'SELECT valor FROM app_meta WHERE clave = ?', args: [CLAVE] });
  if (!rows[0]) return { ...INICIAL };
  try { return { ...INICIAL, ...JSON.parse(String(rows[0].valor)) }; } catch { return { ...INICIAL }; }
}
async function escribir(db: Client, g: Guardado) {
  await db.execute({ sql: 'INSERT INTO app_meta (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor', args: [CLAVE, JSON.stringify(g)] });
}

export async function leerTributariaGT(db: Client): Promise<TributariaGT> {
  const g = await leerGuardado(db);
  return {
    ...g,
    frasesRtu: frasesDelRtu(g.afiliacionIva, g.regimenIsr, g.agenteRetencionIva),
    certificadores: g.certificadores.map(({ clave, ...c }) => ({ ...c, tieneClave: Boolean(clave) })),
  };
}

// Revisa una frase agregada a mano; devuelve el error o null
export function errorFrase(f: FraseEmisor): string | null {
  if (!escenarioFrase(f.tipo, f.escenario)) return `El escenario ${f.escenario} no existe para la frase tipo ${f.tipo}.`;
  if (pideNumeroResolucion(f.tipo, f.escenario) && !f.resolucion.trim()) return `La frase tipo ${f.tipo} escenario ${f.escenario} lleva el número de resolución.`;
  if (pideFechaResolucion(f.tipo, f.escenario) && !f.fecha) return `La frase tipo ${f.tipo} escenario ${f.escenario} lleva la fecha de resolución.`;
  return null;
}

export async function guardarTributariaGT(db: Client, cambios: Partial<Guardado> & { certificadores?: (CertificadorEmisor & { clave?: string })[] }): Promise<string | null> {
  const actual = await leerGuardado(db);
  const nuevo: Guardado = { ...actual };
  if (cambios.afiliacionIva !== undefined) nuevo.afiliacionIva = String(cambios.afiliacionIva);
  if (cambios.vigenteDesde !== undefined) nuevo.vigenteDesde = String(cambios.vigenteDesde);
  if (cambios.regimenIsr !== undefined) nuevo.regimenIsr = String(cambios.regimenIsr);
  if (cambios.agenteRetencionIva !== undefined) nuevo.agenteRetencionIva = Boolean(cambios.agenteRetencionIva);
  if (cambios.frases !== undefined) {
    // Número y fecha solo quedan en los escenarios que los piden
    const frases = cambios.frases.map(f => ({
      tipo: Number(f.tipo), escenario: Number(f.escenario), origen: 'manual' as const,
      resolucion: pideNumeroResolucion(Number(f.tipo), Number(f.escenario)) ? String(f.resolucion ?? '').trim() : '',
      fecha: pideFechaResolucion(Number(f.tipo), Number(f.escenario)) ? String(f.fecha ?? '') : '',
    }));
    for (const f of frases) { const e = errorFrase(f); if (e) return e; }
    const claves = frases.map(f => `${f.tipo}-${f.escenario}`);
    if (new Set(claves).size !== claves.length) return 'Una frase con el mismo tipo y escenario solo puede ir una vez.';
    nuevo.frases = frases;
  }
  if (cambios.certificadores !== undefined) {
    const lista: CertificadorGuardado[] = [];
    for (const c of cambios.certificadores) {
      if (!CERTIFICADORES_GT.includes(c.certificador)) return 'Elige un certificador del catálogo.';
      if (!String(c.usuario ?? '').trim()) return `Escribe el usuario de ${c.certificador}.`;
      const anterior = actual.certificadores.find(x => x.id === c.id);
      const clave = String(c.clave ?? '') || anterior?.clave || '';
      // Si cambian el usuario o la contraseña, hay que volver a verificar
      const cambio = !anterior || anterior.usuario !== c.usuario || Boolean(c.clave);
      lista.push({
        id: c.id || 'cert-' + Math.random().toString(36).slice(2), certificador: c.certificador, usuario: String(c.usuario).trim(),
        identificador: String(c.identificador ?? '').trim(), certificado: String(c.certificado ?? '').trim(),
        principal: Boolean(c.principal), verificado: cambio ? false : Boolean(anterior?.verificado), clave,
      });
    }
    if (lista.length && lista.filter(c => c.principal).length !== 1) return 'Marca un solo certificador como principal.';
    nuevo.certificadores = lista;
  }
  await escribir(db, nuevo);
  return null;
}

// Verifica las credenciales de un certificador. En este prototipo no hay
// conexión real: basta con que tenga usuario y contraseña guardados.
export async function verificarCertificadorGT(db: Client, id: string): Promise<{ ok: boolean; mensaje: string }> {
  const g = await leerGuardado(db);
  const c = g.certificadores.find(x => x.id === id);
  if (!c) return { ok: false, mensaje: 'No se encontró el certificador.' };
  if (!c.usuario || !c.clave) return { ok: false, mensaje: `Falta el usuario o la contraseña de ${c.certificador}.` };
  c.verificado = true;
  await escribir(db, g);
  return { ok: true, mensaje: `Las credenciales de ${c.certificador} son válidas.` };
}
