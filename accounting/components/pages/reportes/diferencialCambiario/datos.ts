'use client';
import { C, FONT } from '@/components/ui/tokens';
import { fmtNum } from '@/components/ui/formato';

export const F = FONT;
export const BRAND = '#A77600';
export const RED = C.error;
export const GREEN = C.success;
export function fmt(n: number) {
  const abs = Math.abs(n);
  const s = fmtNum(abs, 2);
  return n < 0 ? `(${s})` : s;
}
export type TipoCuenta = 'cobrar'|'pagar'|'bancos';
type EstadoDC = 'Pendiente'|'Contabilizado'|'Anulado';
export interface AsientoDC {
  id:number; tipo:'G'|'O'; nroAsiento:string; fecha:string; libro:'G'|'O';
  titulo:string; cuenta:string; cuentaNombre:string; descripcion:string;
  debe:number; haber:number; tipoCuenta:TipoCuenta; estado:EstadoDC;
}
// cada tipo de cuenta (cobrar/pagar/bancos) tiene su propio asiento
// balanceado (debe = haber), para que el filtro "Aplicar a cuentas por" tenga
// datos reales que mostrar. cada línea incluye el nombre de la
// cuenta, para que quede claro qué se debita y qué se acredita.
export const MOCK: AsientoDC[] = [
  // ── Cuentas por cobrar ──
  { id:1, tipo:'G', nroAsiento:'GP-60102637', fecha:'01/01/2026', libro:'G',
    titulo:'Diferencial cambiario - imp. servicio', cuenta:'120-001-0001', cuentaNombre:'Clientes extranjeros USD',
    descripcion:'Ajuste por diferencial cambiario - revaluación de saldo en USD', debe:335700.43, haber:0,
    tipoCuenta:'cobrar', estado:'Contabilizado' },
  { id:2, tipo:'G', nroAsiento:'GP-60102637', fecha:'01/01/2026', libro:'G',
    titulo:'Diferencial cambiario - imp. servicio', cuenta:'810-001-0001', cuentaNombre:'Ganancia por diferencial cambiario',
    descripcion:'Contrapartida: ganancia cambiaria por revaluación de cuentas por cobrar', debe:0, haber:335700.43,
    tipoCuenta:'cobrar', estado:'Contabilizado' },
  // ── Cuentas por pagar ──
  { id:3, tipo:'O', nroAsiento:'GP-60102638', fecha:'02/01/2026', libro:'O',
    titulo:'Diferencia de tasa al 31-12-2025', cuenta:'200-001-0001', cuentaNombre:'Proveedores extranjeros USD',
    descripcion:'Ajuste por diferencial cambiario - revaluación de saldo por pagar', debe:0, haber:13892.17,
    tipoCuenta:'pagar', estado:'Pendiente' },
  { id:4, tipo:'O', nroAsiento:'GP-60102638', fecha:'02/01/2026', libro:'O',
    titulo:'Diferencia de tasa al 31-12-2025', cuenta:'820-001-0001', cuentaNombre:'Pérdida por diferencial cambiario',
    descripcion:'Contrapartida: pérdida cambiaria por revaluación de cuentas por pagar', debe:13892.17, haber:0,
    tipoCuenta:'pagar', estado:'Pendiente' },
  // ── Cuentas bancarias ──
  { id:5, tipo:'O', nroAsiento:'GP-60102639', fecha:'02/01/2026', libro:'O',
    titulo:'Extra tips - rebajo comisión TC', cuenta:'100-003-0001', cuentaNombre:'BAC $ 4563212454587',
    descripcion:'Ajuste por diferencial cambiario - revaluación de cuenta bancaria en USD', debe:1575050.98, haber:0,
    tipoCuenta:'bancos', estado:'Contabilizado' },
  { id:6, tipo:'O', nroAsiento:'GP-60102639', fecha:'02/01/2026', libro:'O',
    titulo:'Extra tips - rebajo comisión TC', cuenta:'810-001-0001', cuentaNombre:'Ganancia por diferencial cambiario',
    descripcion:'Contrapartida: ganancia cambiaria por revaluación de cuenta bancaria', debe:0, haber:1575050.98,
    tipoCuenta:'bancos', estado:'Contabilizado' },
];
export const ESTADO_STYLE: Record<EstadoDC,[string,string]> = {
  Contabilizado: [GREEN, 'rgba(29,158,117,.1)'],
  Pendiente:     [BRAND, '#FFF8EC'],
  Anulado:       [RED,   'rgba(226,75,74,.1)'],
};
