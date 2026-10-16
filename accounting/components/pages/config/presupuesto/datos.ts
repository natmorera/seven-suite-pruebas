import { FONT } from '../../../ui/tokens';
import { fmtNum } from '../../../ui/formato';
import { MESES, TIPOS_DE_CUENTA, PresRow } from '../presupuestoData';
import { CentroCosto } from '../../catalogo/centrosCostoConfig';

export const F = FONT;
// ── Helpers ───────────────────────────────────────────────────────────────────
export function fmtCelda(n: number) {
  const s = fmtNum(Math.abs(n), 2);
  return n < 0 ? `(${s})` : s;
}
export function labelTipoCuenta(codigo: string) {
  const t = TIPOS_DE_CUENTA.find(x => x.codigo === codigo);
  return t ? `${t.codigo} - ${t.nombre}` : codigo;
}
export function cloneRows(rows: PresRow[]): PresRow[] {
  return rows.map(r => ({ ...r, valores: [...r.valores] }));
}
export function labelCentro(centros: CentroCosto[], id: string) {
  const c = centros.find(x => x.id === id);
  return c ? c.descripcion : id;
}
// Issue: al elegir una cuenta/centro desde el buscador de "Rango de cuenta", el
// campo quedaba mostrando solo el código ("600-002-0001"), sin el nombre - se
// guarda "código - nombre" para que se entienda qué cuenta es, y esta función
// extrae solo el código (la parte antes de " - ") para las comparaciones de
// rango, sea que el usuario lo haya elegido del buscador o escrito a mano.
export function soloCodigo(v: string) { return v.split(' - ')[0].trim(); }
// ── Importar presupuesto desde Excel ─────────────────────────────────────────
export function descargarPlantilla() {
  const headers = ['Cuenta','Centro','Descripción', ...MESES];
  const filaEjemplo = ['600-001-0001','ADM','Ingresos hospedaje', ...MESES.map(()=>'0.00')];
  const lines = [headers, filaEjemplo].map(row => row.map(v=>`"${v}"`).join(','));
  const blob = new Blob(['\ufeff'+lines.join('\n')], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'plantilla-presupuesto.csv';
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
// ── Recalcular presupuesto (global, desde el header) ─────────────────────────
export interface RecalcParams {
  accion: 'cero'|'aumentar'|'disminuir'; pct: number;
  rango?: { inicial:string; final:string };
  centro?: { inicial:string; final:string };
  tipoCuenta?: string;
  soloPeriodo?: number; // índice de mes 0-11
}
// ── Proyectar presupuesto ─────────────────────────────────────────────────────
// Nota de alcance: esta maqueta trabaja con un único año de datos en memoria
// (no hay un almacén multi-ejercicio real), así que "Proyectar" aplica la
// fórmula elegida directamente sobre las filas visibles en vez de crear un
// ejercicio 2027 aparte. El selector Año base/destino queda funcional en la
// UI y se refleja en el mensaje de confirmación, pero no persiste un segundo
// año de datos independiente.
export const ANIOS_PROYECCION = ['2024','2025','2026','2027','2028'];
export interface ProyectarParams {
  accion: 'cero'|'copiar'|'aumentar'|'disminuir'; pct:number;
  rango?: { inicial:string; final:string }; tipoCuenta?: string;
  anioBase:string; anioDestino:string;
  rangoPeriodo?: { desde:number; hasta:number };
}
// ── Exportar presupuesto ──────────────────────────────────────────────────────
export const NIVELES_DETALLE = ['Mayor','Submayor','Detalle','Auxiliar','Todo'] as const;
export type NivelDetalle = typeof NIVELES_DETALLE[number];
export type Comparativo = 'solo'|'vs_real'|'vs_anterior';
export const MESES_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
