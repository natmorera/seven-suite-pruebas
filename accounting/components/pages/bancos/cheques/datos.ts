'use client';
import { C, FONT } from '@/components/ui/tokens';

export const F = FONT;
export const BRAND = '#A77600';
export const RED = '#F44336';
export function fmtN(n: number, dec=2): string {
  return Math.abs(n).toLocaleString('en-US', { minimumFractionDigits:dec, maximumFractionDigits:dec });
}
export type Estado = 'Pendiente'|'Emitido'|'Generado'|'Contabilizado'|'Anulado';
export const EST_STYLE: Record<Estado,{bg:string;color:string;border:string}> = {
  Pendiente:     { bg:'#FFF8EC', color:BRAND,     border:'#EED89A' },
  Emitido:       { bg:'#E6F1FB', color:'#185FA5', border:'#B5D4F4' },
  Generado:      { bg:'#E8F5E9', color:'#2E7D32', border:'#A5D6A7' },
  Contabilizado: { bg:'#E3F2FD', color:'#1565C0', border:'#90CAF9' },
  Anulado:       { bg:C.errorBg, color:'#B71C1C', border:`${C.errorBorder}` },
};
export interface Retencion { tipo:string; imp:number; }
export interface Cheque {
  id:string; estado:Estado; consec:string; chequeNro:string|null;
  proveedor:string; cuenta:string; fecha:string; nroAsiento:string|null;
  moneda:'CRC'|'USD'; importe:number; usuario:string;
  totalDoc:number; retencion:number; retenciones:Retencion[];
  banco:string;
}
export const MOCK: Cheque[] = [
  { id:'c1',estado:'Pendiente',    consec:'3635',chequeNro:null,       proveedor:'Materiales Occidente...',  cuenta:'100-001-0001-0001',fecha:'02/06/26',nroAsiento:null,      moneda:'CRC',importe:100000,usuario:'jperez',   totalDoc:100000,retencion:0,    retenciones:[], banco:'Banpro CRC'},
  { id:'c2',estado:'Emitido',      consec:'3634',chequeNro:'CK-124',   proveedor:'Ferretero Monteverd...',   cuenta:'100-001-0001-0003',fecha:'01/06/26',nroAsiento:'GP-5520', moneda:'CRC',importe:350000,usuario:'sblandon', totalDoc:350000,retencion:0,    retenciones:[], banco:'BAC CRC'},
  { id:'c3',estado:'Contabilizado',consec:'3633',chequeNro:'CK-125',   proveedor:'Ferretero Monteverd...',   cuenta:'100-001-0001-0004', fecha:'30/05/26',nroAsiento:'GP-5510', moneda:'CRC',importe:100000,usuario:'sblandon', totalDoc:100000,retencion:0,    retenciones:[], banco:'BAC CRC'},
  { id:'c4',estado:'Contabilizado',   consec:'3632',chequeNro:'CK-123',   proveedor:'Insumos del Norte Ltda.', cuenta:'100-001-0001-0002',fecha:'28/05/26',nroAsiento:'GP-5500', moneda:'CRC',importe:820000,usuario:'sblandon', totalDoc:820000,retencion:8200, retenciones:[{tipo:'01 - Retención 2% Compras/Servicios',imp:8200}], banco:'BNCR'},
  { id:'c5',estado:'Anulado',      consec:'3631',chequeNro:'CK-122',   proveedor:'Proveedor General CR S.A.',cuenta:'100-001-0001-0001',fecha:'25/05/26',nroAsiento:null,     moneda:'CRC',importe:0,    usuario:'jperez',   totalDoc:280000,retencion:0,    retenciones:[], banco:'BAC CRC'},
];
export const inputStyle = (active=false): React.CSSProperties => ({
  width:'100%', height:34, padding:'0 10px',
  border:`1px solid ${active?BRAND:'#ECECEC'}`,
  borderRadius:7, fontSize:12, fontFamily:F, outline:'none',
  color:'#0F0F0F', background:'#FFFFFF', boxSizing:'border-box',
});
export const selectStyle: React.CSSProperties = {
  width:'100%', height:34, padding:'0 28px 0 10px',
  border:'1px solid #ECECEC', borderRadius:7, fontSize:12, fontFamily:F,
  outline:'none', appearance:'none', background:'#FFFFFF', color:'#0F0F0F', cursor:'pointer',
};
export const BANCOS_CTA = ['11020101 - Banpro Cta$ 1001000200','100-002-0001 - BAC CRC','100-003-0001 - BNCR CRC'];
export function toIsoFromDDMMYY(s:string): string {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if(!m) return '';
  const [,d,mo,y] = m;
  return `20${y}-${mo}-${d}`;
}
export function fromIsoToDDMMYY(s:string): string {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return s;
  const [,y,mo,d] = m;
  return `${d}/${mo}/${y.slice(2)}`;
}
