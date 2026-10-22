import { FONT } from '@/components/ui/tokens';
import { type Cuenta } from '../catalogoData';

export const F = FONT;
export const codeStyle = { fontFamily: F, fontVariantNumeric: 'tabular-nums' as const, letterSpacing: '0.02em' };
// ── Ejercicios disponibles (de ejemplo; con backend salen de Ejercicio fiscal) ──
export const EJERCICIOS_VIGENTES = [
  { value: '2026', label: '2026 - Vigente (activo)' },
  { value: '2025', label: '2025 - Vigente (segundo abierto)' },
];
// Today formatted as YYYY-MM-DD
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
// Fechas mínima y máxima del ejercicio elegido
export function yearBounds(yr: string) {
  return { min: `${yr}-01-01`, max: `${yr}-12-31` };
}
export interface Props {
  cuentaDestino: Cuenta;          // la cuenta recién creada
  cuentas: Cuenta[];              // todas las cuentas para elegir el origen
  onConfirm: (trasladoInfo: TrasladoResult) => void;
  onCancel: () => void;
}
export interface TrasladoResult {
  origenId: string;
  origenCodigo: string;
  origenNombre: string;
  origenSaldo: number;
  destinoCodigo: string;
  destinoNombre: string;
  fecha: string;
  ejercicio: string;
  asientoRef: string;
}
