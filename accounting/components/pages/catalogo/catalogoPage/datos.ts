'use client';
import { FONT } from '../../../ui/tokens';

export const F = FONT;
export const BRAND = '#A77600';
// Formatea saldo: negativo entre paréntesis, miles con coma
export function fmtSaldo(n: number): string {
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
  return n < 0 ? `(${abs})` : abs;
}
// ── Row component ─────────────────────────────────────────────────────────────
// indent px por nivel - igual al HTML de referencia
export const IND: Record<string,number> = { grupo:12, subgrupo:16, subsubgrupo:32, mayor:16, submajor:32, detalle:32, auxiliar:48 };
// ── Main page ─────────────────────────────────────────────────────────────────
// Issue #11: "Movimientos de ajuste" va antes de "Grupo de patrimonio".
export const TABS = ['Plan de cuentas','Centros de costo','Cuentas especiales','Movimientos de ajuste','Grupo de patrimonio'];
