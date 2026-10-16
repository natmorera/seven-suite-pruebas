import { FONT } from '../../../ui/tokens';
import { Cuenta } from '../catalogoData';

export const F = FONT;
export const codeStyle = { fontFamily: F, fontVariantNumeric: 'tabular-nums' as const, letterSpacing: '0.02em' };
// ── Fiscal years available (mock - in production would come from TabEjercicio state) ──
export const EJERCICIOS_VIGENTES = [
  { value: '2026', label: '2026 - Vigente (activo)' },
  { value: '2025', label: '2025 - Vigente (segundo abierto)' },
];
// Today formatted as YYYY-MM-DD
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
// Min/max dates for chosen fiscal year
export function yearBounds(yr: string) {
  return { min: `${yr}-01-01`, max: `${yr}-12-31` };
}
export interface Props {
  cuentaDestino: Cuenta;          // the newly-created account
  cuentas: Cuenta[];              // all accounts for the origen picker
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
