'use client';
import { C, FONT } from '@/components/ui/tokens';
import { fmtNum } from '@/components/ui/formato';

export const F = FONT;
export const BRAND = C.brand;
export function fmt2(n: number) { return fmtNum(n, 2); }
// ── Types ─────────────────────────────────────────────────────────────────────
type EstadoLiq = 'Pendiente' | 'Contabilizada' | 'Anulada';
export interface Liquidacion {
  id: number;
  consecutivo: string;
  fecha: string;
  afiliado: string;
  afiliadoCode: string;
  cuentaTransito: string;
  referencia: string;
  moneda: 'CRC' | 'USD';
  importe: number;
  usuario: string;
  estado: EstadoLiq;
  nroAsiento?: string | null;
}
export interface Voucher {
  id: string;
  codigo: string;
  fecha: string;
  descripcion: string;
  bruto: number;
  neto: number;
}
// ── Datos de ejemplo ──────────────────────────────────────────────────────────────────────
export const AFILIADOS = [
  { code:'AFI-001', label:'AFI-001 · BAC Visa/Master - Terminal 4654897', comision:1.85, retFuente:2.0, retIVA:1.0 },
  { code:'AFI-002', label:'AFI-002 · BAC Amex - Terminal 4654898',        comision:2.10, retFuente:2.0, retIVA:1.0 },
  { code:'AFI-003', label:'AFI-003 · BNCR Visa - Terminal 7812300',       comision:1.85, retFuente:2.0, retIVA:1.0 },
];
export const CUENTAS_TRANSITO = [
  '100-003-0001 · Datáfono BAC ¢',
  '100-003-0002 · Datáfono BAC $',
  '100-003-0003 · Datáfono BNCR ¢',
];
export const BANCOS = ['BAC ¢ - Cta. 4646545466888', 'BNCR ¢ - Cta. 5565545547777'];
export const LIQUIDACIONES_INIT: Liquidacion[] = [
  { id:1, consecutivo:'GT-124', fecha:'00/00/00', afiliado:'AFI-001 · BAC Visa/Master', afiliadoCode:'AFI-001', cuentaTransito:'100-003-0001 · Datafono BAC ¢', referencia:'LIQ-00489', moneda:'USD', importe:14309.10, usuario:'jperez', estado:'Pendiente' },
  { id:2, consecutivo:'GT-123', fecha:'00/00/00', afiliado:'AFI-002 · BAC Amex',        afiliadoCode:'AFI-002', cuentaTransito:'100-003-0002 · Datafono BAC ¢', referencia:'-',         moneda:'CRC', importe:450000,  usuario:'sblandon', estado:'Pendiente' },
  { id:3, consecutivo:'GT-122', fecha:'00/00/00', afiliado:'AFI-003 · BNCR Visa',       afiliadoCode:'AFI-003', cuentaTransito:'100-003-0001 · Datafono BAC ¢', referencia:'-',         moneda:'CRC', importe:1450000, usuario:'yader', estado:'Contabilizada' },
  { id:4, consecutivo:'GT-121', fecha:'00/00/00', afiliado:'AFI-003 · BNCR Visa',       afiliadoCode:'AFI-003', cuentaTransito:'100-003-0001 · Datafono BAC ¢', referencia:'-',         moneda:'USD', importe:14309.10, usuario:'yader', estado:'Pendiente' },
];
export const VOUCHERS_MOCK: Voucher[] = [
  { id:'v1', codigo:'VC-00021', fecha:'00/00/0000', descripcion:'Habitaciones standard', bruto:380000, neto:372020 },
  { id:'v2', codigo:'VC-00022', fecha:'00/00/0000', descripcion:'Restaurante y bar',      bruto:245000, neto:239855 },
  { id:'v3', codigo:'VC-00023', fecha:'00/00/0000', descripcion:'Servicios de spa',       bruto:195000, neto:190905 },
];
export const ESTADO_STYLE: Record<EstadoLiq, [string,string]> = {
  Pendiente:     ['#EF9F27','rgba(239,159,39,.12)'],
  Contabilizada: [C.success,'rgba(29,158,117,.12)'],
  Anulada:       [C.error,'rgba(226,75,74,.12)'],
};
