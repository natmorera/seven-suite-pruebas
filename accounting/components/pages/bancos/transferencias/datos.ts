'use client';
import { C, FONT } from '@/components/ui/tokens';
import { fmtNum } from '@/components/ui/formato';

export const F = FONT;
export const BRAND = C.brand;
export function fmt2(n: number) { return fmtNum(n, 2); }
// Tipo de cambio de referencia (mock) usado cuando origen y destino están en monedas distintas.
const FX_USD_CRC = 545.00;
export function tipoCambio(monedaOrigen: 'CRC'|'USD', monedaDestino: 'CRC'|'USD'): number {
  if (monedaOrigen === monedaDestino) return 1;
  return monedaOrigen === 'USD' ? FX_USD_CRC : 1 / FX_USD_CRC;
}
type EstadoTrf = 'Pendiente' | 'Contabilizado' | 'Anulados';
export interface Transferencia {
  id: number; consecutivo: string; fecha: string; estado: EstadoTrf;
  cuentaOrigen: string; monedaOrigen: 'CRC'|'USD'; importeOrigen: number;
  cuentaDestino: string; monedaDestino: 'CRC'|'USD'; importeDestino: number;
  comision: number; usuario: string; referOrigen: string; referDestino: string;
  titulo: string;
}
export const CUENTAS_BANCO = [
  { code:'12002004', label:'BAC San José C.C. – USD (12002004)' },
  { code:'12001003', label:'BAC San José C.C. – CRC (12001003)' },
  { code:'10020001', label:'BNCR CRC 015-004943-0' },
  { code:'10020002', label:'BCR USD 001-04745094' },
  { code:'10020003', label:'BCR CRC 001-0252067-2' },
];
export const TRFS_INIT: Transferencia[] = [
  { id:1, consecutivo:'TRF-5095', fecha:'02/06/26', estado:'Pendiente',
    cuentaOrigen:'BAC San José – USD',  monedaOrigen:'USD',  importeOrigen:20000,
    cuentaDestino:'BAC San José – CRC', monedaDestino:'CRC', importeDestino:0,
    comision:0, usuario:'jperez',  referOrigen:'', referDestino:'', titulo:'Transferencia interbancaria - 5095' },
  { id:2, consecutivo:'TRF-5088', fecha:'28/05/26', estado:'Contabilizado',
    cuentaOrigen:'BNCR CRC 015-004943-0', monedaOrigen:'CRC', importeOrigen:20000,
    cuentaDestino:'BAC San José – CRC', monedaDestino:'CRC', importeDestino:10000000,
    comision:0, usuario:'yader',  referOrigen:'REF-88213', referDestino:'REF-88214', titulo:'Transferencia interbancaria - 5088' },
  { id:3, consecutivo:'TRF-5084', fecha:'25/05/26', estado:'Anulados',
    cuentaOrigen:'BCR USD 001-04745094', monedaOrigen:'USD', importeOrigen:200900,
    cuentaDestino:'BCR CRC 001-0252067-2', monedaDestino:'CRC', importeDestino:0,
    comision:0, usuario:'yader',  referOrigen:'REF-84001', referDestino:'', titulo:'Transferencia interbancaria - 5084' },
];
export const ESTADO_STYLE: Record<EstadoTrf,[string,string]> = {
  Pendiente:  ['#EF9F27','rgba(239,159,39,.12)'],
  Contabilizado: [C.success,'rgba(29,158,117,.12)'],
  Anulados:   [C.error,'rgba(226,75,74,.12)'],
};
export function toIso(s:string): string {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if(!m) return '';
  const [,d,mo,y] = m;
  return `20${y}-${mo}-${d}`;
}
export function fromIso(s:string): string {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return s;
  const [,y,mo,d] = m;
  return `${d}/${mo}/${y.slice(2)}`;
}
