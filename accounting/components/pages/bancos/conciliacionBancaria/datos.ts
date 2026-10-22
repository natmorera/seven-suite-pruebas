'use client';
import { useEffect } from 'react';
import { C, FONT } from '@/components/ui/tokens';
import { fmtNum } from '@/components/ui/formato';

export const F = FONT;
export const BRAND = C.brand;
export function fmt2(n: number) { return fmtNum(n, 2); }
export function sym(moneda: string) { return moneda === 'USD' ? '$' : '₡'; }
type EstadoCon = 'En proceso' | 'Sin saldo' | 'Cerrada';
export type EstadoMov = 'Conciliado' | 'Pendiente' | 'Futuro';
export interface Movimiento {
  id: number; fecha: string; comprobante: string; documento: string;
  descripcion: string; moneda: string; debitos: number; creditos: number;
  importeCRC: number; estado: EstadoMov;
}
export interface Conciliacion {
  id: number; consecutivo: string; estado: EstadoCon;
  cuentaBancaria: string; cuentaCode: string; moneda: string;
  desde: string; hasta: string; saldoBanco: number; saldoLibros: number;
  diferencia: number; saldoInicial: number; usuario: string; movimientos: Movimiento[];
  cerradaPor?: string; fechaCierre?: string;
}
export const MOVIMIENTOS_MOCK: Movimiento[] = [
  { id:1,  fecha:'05/01/2026', comprobante:'60103736', documento:'25959549', descripcion:'PAGO ANUAL BIENES INMUEBLES 2026/R',         moneda:'CRC', debitos:0,          creditos:442949.96,  importeCRC:442949.96,  estado:'Conciliado' },
  { id:2,  fecha:'05/01/2026', comprobante:'60103737', documento:'25959991', descripcion:'CXC Socios Pago Imp. Municipales Forest',    moneda:'CRC', debitos:0,          creditos:94338.00,   importeCRC:94338.00,   estado:'Conciliado' },
  { id:3,  fecha:'05/01/2026', comprobante:'60103738', documento:'25958967', descripcion:'Pago Impuestos Municipales / 01-2026',        moneda:'CRC', debitos:0,          creditos:1711689.85, importeCRC:1711689.85, estado:'Futuro' },
  { id:4,  fecha:'06/01/2026', comprobante:'60102294', documento:'96501703', descripcion:'Alquiler Soda La Vieja Enero 2026',           moneda:'CRC', debitos:148500.00,  creditos:0,          importeCRC:148500.00,  estado:'Conciliado' },
  { id:5,  fecha:'06/01/2026', comprobante:'60102301', documento:'96499282', descripcion:'Consignación Diciembre Angélica Mayorg',      moneda:'CRC', debitos:1072541.25, creditos:0,          importeCRC:1072541.25, estado:'Pendiente' },
  { id:6,  fecha:'09/01/2026', comprobante:'60100721', documento:'26336023', descripcion:'Pago Luis Rivas ¢1,000,000.00',               moneda:'CRC', debitos:0,          creditos:1000000.00, importeCRC:1000000.00, estado:'Conciliado' },
  { id:7,  fecha:'09/01/2026', comprobante:'60101631', documento:'26286424', descripcion:'Pago Agrícola La Candelaria Limitada',        moneda:'CRC', debitos:3960198.00, creditos:0,          importeCRC:3960198.00, estado:'Conciliado' },
  { id:8,  fecha:'09/01/2026', comprobante:'60101632', documento:'26286425', descripcion:'Comisión bancaria enero 2026',                moneda:'CRC', debitos:3987986.71, creditos:0,          importeCRC:3987986.71, estado:'Pendiente' },
];
export const CONCILIACIONES_INIT: Conciliacion[] = [
  { id:1, consecutivo:'CON-004', estado:'En proceso', cuentaBancaria:'BAC San José C…', cuentaCode:'12002003', moneda:'CRC', desde:'01/06/26', hasta:'30/06/26', saldoBanco:47519110.28, saldoLibros:47519110.28, diferencia:0,      saldoInicial:34766025.69, usuario:'jperez',   movimientos:MOVIMIENTOS_MOCK.map(m=>({...m})) },
  { id:2, consecutivo:'CON-005', estado:'En proceso', cuentaBancaria:'BCR 001-02520…', cuentaCode:'12001002', moneda:'CRC', desde:'01/06/26', hasta:'30/06/26', saldoBanco:8247956.66,  saldoLibros:8247534.00,  diferencia:422.66, saldoInicial:7825107.34,  usuario:'sblandon', movimientos:[] },
  { id:3, consecutivo:'CON-006', estado:'Sin saldo',  cuentaBancaria:'BNCR 015-0049…', cuentaCode:'1002001',  moneda:'CRC', desde:'01/06/26', hasta:'30/06/26', saldoBanco:0,           saldoLibros:0,           diferencia:0,      saldoInicial:0,           usuario:'yader',    movimientos:[] },
  { id:4, consecutivo:'CON-007', estado:'Cerrada',    cuentaBancaria:'BNCR 015-0049…', cuentaCode:'1002001',  moneda:'CRC', desde:'01/05/26', hasta:'31/05/26', saldoBanco:43159.84,    saldoLibros:43159.84,    diferencia:0,      saldoInicial:34766025.69, usuario:'yader',    movimientos:[], cerradaPor:'yader', fechaCierre:'01/06/26' },
];
export const ESTADO_CON_STYLE: Record<EstadoCon,[string,string]> = {
  'En proceso':['#EF9F27','rgba(239,159,39,.12)'],
  'Sin saldo': ['#EF9F27','rgba(239,159,39,.08)'],
  'Cerrada':   ['#757575','rgba(117,117,117,.1)'],
};
export function useEscClose(onClose:()=>void){
  useEffect(()=>{
    function esc(e:KeyboardEvent){if(e.key==='Escape')onClose();}
    document.addEventListener('keydown',esc);
    return ()=>document.removeEventListener('keydown',esc);
  },[onClose]);
}
