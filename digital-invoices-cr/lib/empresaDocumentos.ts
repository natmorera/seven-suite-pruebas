// Consecutivos de documentos e impresoras de la empresa (app_meta).
import type { Client } from '@libsql/client';
import { CONSECUTIVOS_DEFECTO, periodoDe, validarFormato, type ConsecutivoDoc, type Reinicio } from '@/lib/consecutivosDocumentos';

async function meta(db: Client, clave: string) {
  const { rows } = await db.execute({ sql: 'SELECT valor FROM app_meta WHERE clave = ?', args: [clave] });
  return rows[0] ? String(rows[0].valor) : null;
}
async function setMeta(db: Client, clave: string, valor: string) {
  await db.execute({ sql: 'INSERT INTO app_meta (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor', args: [clave, valor] });
}
async function leerJson<T>(db: Client, clave: string): Promise<T | null> {
  const v = await meta(db, clave);
  if (!v) return null;
  try { return JSON.parse(v) as T; } catch { return null; }
}

// ── Consecutivos ─────────────────────────────────────────────────────────
// Documentos ya emitidos en la empresa de demostración
const EMITIDOS_DEMO: Record<string, number> = { asientos: 188, cobros: 13, pagos: 10, anticipos_clientes: 5, interbancarias: 33 };

export async function leerConsecutivos(db: Client): Promise<ConsecutivoDoc[]> {
  const guardado = await leerJson<Record<string, Partial<ConsecutivoDoc>>>(db, 'consecutivos_documentos') ?? {};
  return CONSECUTIVOS_DEFECTO.map(d => {
    const g = guardado[d.id];
    if (g) return { ...d, ...g, nombre: d.nombre } as ConsecutivoDoc;
    const emitidos = EMITIDOS_DEMO[d.id] ?? 0;
    const enPeriodo = d.reinicio === 'mensual' && emitidos ? 29 : emitidos;
    return { ...d, emitidos, enPeriodo, periodo: periodoDe(d.reinicio) };
  });
}

export async function guardarConsecutivo(db: Client, id: string, formato: string, reinicio: Reinicio): Promise<string | null> {
  const lista = await leerConsecutivos(db);
  const c = lista.find(x => x.id === id);
  if (!c) return 'Documento desconocido.';
  if (!['nunca', 'anual', 'mensual'].includes(reinicio)) return 'Reinicio no válido.';
  const error = validarFormato(formato, reinicio);
  if (error) return error;
  // Al cambiar el reinicio el contador del período empieza de nuevo
  const cambiado: ConsecutivoDoc = { ...c, formato: formato.trim(), reinicio, ...(reinicio !== c.reinicio ? { enPeriodo: 0, periodo: periodoDe(reinicio) } : {}) };
  const todo = Object.fromEntries(lista.map(x => [x.id, x.id === id ? cambiado : x]));
  await setMeta(db, 'consecutivos_documentos', JSON.stringify(todo));
  return null;
}

// ── Impresoras ───────────────────────────────────────────────────────────
export interface Impresora { id: string; nombre: string; habilitada: boolean }
export interface TipoDocumento { codigo: string; nombre: string }
export interface DatosImpresion { impresoras: Impresora[]; tipos: TipoDocumento[]; asignaciones: Record<string, string> }

const IMPRESION_DEMO: DatosImpresion = {
  impresoras: [
    { id: 'imp-1', nombre: 'Contabilidad', habilitada: true },
    { id: 'imp-2', nombre: 'Imp POS 80-C', habilitada: true },
    { id: 'imp-3', nombre: 'Recepción P90-C30 2020 (POS CANON 91)', habilitada: true },
  ],
  tipos: [
    { codigo: 'Asiento', nombre: 'Asiento' },
    { codigo: 'CHECK', nombre: 'Cheque' },
    { codigo: 'JOURNAL_VOUCHER', nombre: 'Comprobante de asiento' },
  ],
  asignaciones: { Asiento: 'imp-1', JOURNAL_VOUCHER: 'imp-3' },
};

export async function leerImpresion(db: Client): Promise<DatosImpresion> {
  return (await leerJson<DatosImpresion>(db, 'impresion')) ?? IMPRESION_DEMO;
}

export async function guardarImpresion(db: Client, d: DatosImpresion): Promise<string | null> {
  if (!Array.isArray(d?.impresoras) || !Array.isArray(d?.tipos) || typeof d?.asignaciones !== 'object') return 'Datos incompletos.';
  if (d.impresoras.some(i => !i.nombre?.trim())) return 'Cada impresora necesita un nombre.';
  const nombres = d.impresoras.map(i => i.nombre.trim().toLowerCase());
  if (new Set(nombres).size !== nombres.length) return 'Ya hay una impresora con ese nombre.';
  if (d.tipos.some(t => !t.codigo?.trim() || !t.nombre?.trim())) return 'Cada tipo de documento necesita código y nombre.';
  const codigos = d.tipos.map(t => t.codigo.trim());
  if (new Set(codigos).size !== codigos.length) return 'Ya existe un tipo de documento con ese código.';
  const ids = new Set(d.impresoras.map(i => i.id));
  const asignaciones = Object.fromEntries(Object.entries(d.asignaciones).filter(([c, id]) => codigos.includes(c) && ids.has(id)));
  await setMeta(db, 'impresion', JSON.stringify({ impresoras: d.impresoras, tipos: d.tipos, asignaciones }));
  return null;
}
