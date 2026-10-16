'use client';
// Consecutivos de documentos contables. El formato es texto fijo con
// marcadores: {AAAA} año, {MM} mes y {N:k} el contador con k dígitos (1 a 18).
// Año, mes y reinicio salen de la fecha contable del documento.
import { crearAlmacen } from './almacen';

export type Reinicio = 'nunca' | 'anual' | 'mensual';
export interface ConsecutivoDoc { id: string; nombre: string; formato: string; reinicio: Reinicio; emitidos: number; enPeriodo: number; periodo: string }

export const REINICIOS: { value: Reinicio; label: string }[] = [
  { value: 'nunca', label: 'Nunca' }, { value: 'anual', label: 'Anual' }, { value: 'mensual', label: 'Mensual' },
];

function periodoDe(reinicio: Reinicio, f = new Date()) {
  return reinicio === 'mensual' ? `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}` : reinicio === 'anual' ? String(f.getFullYear()) : '*';
}

// Error del formato, o null si es válido
export function validarFormato(formato: string, reinicio: Reinicio): string | null {
  const f = formato.trim();
  if (!f) return 'Escribe el formato.';
  const marcas = f.match(/\{[^}]*\}/g) ?? [];
  const malas = marcas.filter(m => !/^\{(AAAA|MM|N:\d{1,2})\}$/.test(m));
  if (malas.length) return `No se reconoce ${malas[0]}. Usa {AAAA}, {MM} y {N:k}.`;
  if (/[{}]/.test(f.replace(/\{[^}]*\}/g, ''))) return 'Hay una llave sin cerrar.';
  const ns = marcas.filter(m => m.startsWith('{N:'));
  if (ns.length !== 1) return 'El formato debe tener un solo {N:k}.';
  const k = Number(ns[0].slice(3, -1));
  if (k < 1 || k > 18) return 'En {N:k}, k va de 1 a 18.';
  if (reinicio === 'mensual' && !(f.includes('{AAAA}') && f.includes('{MM}'))) return 'Con reinicio mensual el formato debe tener {AAAA} y {MM}.';
  if (reinicio === 'anual' && !f.includes('{AAAA}')) return 'Con reinicio anual el formato debe tener {AAAA}.';
  return null;
}

function formatear(formato: string, n: number, f = new Date()) {
  return formato
    .replace(/\{AAAA\}/g, String(f.getFullYear()))
    .replace(/\{MM\}/g, String(f.getMonth() + 1).padStart(2, '0'))
    .replace(/\{N:(\d{1,2})\}/g, (_, k) => String(n).padStart(Number(k), '0'));
}

// Próximo número con la fecha indicada: el contador del período, o 1 si el período cambió
export function proximoNumero(c: Pick<ConsecutivoDoc, 'formato' | 'reinicio' | 'enPeriodo' | 'periodo'>, f = new Date()) {
  const n = c.periodo === periodoDe(c.reinicio, f) ? c.enPeriodo + 1 : 1;
  return formatear(c.formato, n, f);
}

// Datos de ejemplo: documentos ya emitidos y, para los de reinicio mensual, los del mes en curso
const d = (id: string, nombre: string, formato: string, emitidos: number, reinicio: Reinicio = 'nunca', enPeriodo = emitidos): ConsecutivoDoc =>
  ({ id, nombre, formato, reinicio, emitidos, enPeriodo, periodo: periodoDe(reinicio) });

export const consecutivosAlmacen = crearAlmacen<ConsecutivoDoc[]>([
  d('asientos', 'Asientos manuales', '{AAAA}{MM}{N:5}', 222, 'mensual', 54),
  d('cobros', 'Cobros', 'GC-{N:1}', 15),
  d('pagos', 'Pagos', 'GP-{N:1}', 12),
  d('anticipos_clientes', 'Anticipos de clientes', 'AC-{N:1}', 5),
  d('anticipos_proveedores', 'Anticipos a proveedores', 'AP-{N:1}', 0),
  d('transferencias', 'Transferencias bancarias', 'TRF-{N:6}', 0),
  d('interbancarias', 'Transferencias interbancarias', 'TRI-{N:6}', 34),
  d('depositos', 'Depósitos en efectivo', 'DEP-{N:6}', 0),
  d('liquidaciones', 'Liquidaciones de tarjeta', 'GT-{N:6}', 0),
  d('conciliaciones', 'Conciliaciones bancarias', 'CON-{N:6}', 0),
]);

// Guarda el formato; al cambiar el reinicio el contador del período empieza de nuevo
export function guardarConsecutivo(id: string, formato: string, reinicio: Reinicio) {
  consecutivosAlmacen.guardar(lista => lista.map(c => c.id !== id ? c
    : { ...c, formato: formato.trim(), reinicio, ...(reinicio !== c.reinicio ? { enPeriodo: 0, periodo: periodoDe(reinicio) } : {}) }));
}
