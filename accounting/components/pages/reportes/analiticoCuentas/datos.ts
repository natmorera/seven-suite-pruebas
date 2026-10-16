'use client';
import { C, FONT } from '../../../ui/tokens';
import { fmtNum } from '../../../ui/formato';
import { ConciliacionAfectada } from '../../asientos/DescontabilizarModal';

// ── CRÍTICO: toda la tipografía usa Montserrat explícitamente ─────────────────
export const F = FONT;
export const BRAND = C.brand;
export function fmt2(n: number) { return fmtNum(n, 2); }
// País de la empresa activa. Hoy vive hardcodeado aquí porque Empresa.tsx todavía
// no expone un contexto compartido (ver components/pages/empresa/Empresa.tsx).
// Cuando exista, reemplazar este valor por el país real de la empresa en sesión.
export const EMPRESA_PAIS: 'CR' | 'NI' | 'GT' | 'HN' = 'CR';
// ── Types ─────────────────────────────────────────────────────────────────────
export type TipoMov = 'A' | 'M' | 'I' | 'D';
export type EstadoMov = 'Contabilizado' | 'Pendiente' | 'Anulado';
export type NivelCuenta = 'mayor' | 'submajor' | 'detalle' | 'auxiliar';
export interface Movimiento {
  id: number; tipo: TipoMov; fecha: string; consecutivo: string;
  descripcion: string; estado: EstadoMov; idAuxiliar: string;
  modulo: string; documento: string; moneda: string;
  debe: number; haber: number; cuentaCode: string;
  observacion?: string; archivos?: string[];
  historial?: { color:string; texto:string; fecha:string; usuario:string }[];
  conciliacion?: ConciliacionAfectada | null;
}
export interface Cuenta {
  code: string; nombre: string; banco?: string;
  nivel: NivelCuenta; moneda: string; saldoInicial: number;
}
// ── Data ──────────────────────────────────────────────────────────────────────
export const CUENTAS: Cuenta[] = [
  { code:'100-001-0001',         nombre:'Fondo de caja general',    nivel:'detalle',  moneda:'CRC', saldoInicial:150000 },
  { code:'100-002-0001',         nombre:'BAC ¢ 4546545466888',      banco:'BAC ¢ 4546545466888', nivel:'detalle',  moneda:'CRC', saldoInicial:0 },
  { code:'100-002-0001-AuraTours',nombre:'AuraTours',               banco:'BAC ¢ 4546545466888', nivel:'auxiliar', moneda:'CRC', saldoInicial:0 },
  { code:'100-003-0001',         nombre:'BAC $ 4563212454587',      nivel:'detalle',  moneda:'USD', saldoInicial:0 },
  { code:'200-001-0001',         nombre:'Proveedores nacionales',   nivel:'detalle',  moneda:'CRC', saldoInicial:0 },
  { code:'200-002-0001',         nombre:'Depósitos adelantados de clientes', nivel:'detalle', moneda:'CRC', saldoInicial:0 },
  { code:'400-001-0001',         nombre:'Habitaciones estándar',    nivel:'detalle',  moneda:'CRC', saldoInicial:0 },
  { code:'600-001-0001',         nombre:'Sueldos y salarios',       nivel:'detalle',  moneda:'CRC', saldoInicial:0 },
];
export const MOVIMIENTOS_INIT: Movimiento[] = [
  { id:1,  tipo:'A', fecha:'2026-04-01', consecutivo:'20260400001', descripcion:'Depósito adelantado en efectivo', estado:'Contabilizado', idAuxiliar:'0001', modulo:'FDK', documento:'DA23400', moneda:'CRC', debe:50000.12,  haber:0,         cuentaCode:'100-002-0001',
    observacion:'Depósito adelantado de huésped, reserva confirmada para el 10/04.', archivos:['comprobante-da23400.pdf'],
    historial:[
      { color:C.success, texto:'Asiento creado desde FrontDesk', fecha:'01/04/2026 08:10', usuario:'sistema' },
      { color:C.success, texto:'Contabilizado', fecha:'01/04/2026 09:00', usuario:'jperez' },
    ] },
  { id:2,  tipo:'A', fecha:'2026-04-01', consecutivo:'20260400001', descripcion:'Depósito adelantado en efectivo', estado:'Contabilizado', idAuxiliar:'0002', modulo:'FDK', documento:'DA23399', moneda:'CRC', debe:417778.88, haber:0,         cuentaCode:'100-002-0001',
    observacion:'Depósito adelantado de huésped, reserva confirmada para el 10/04.', archivos:['comprobante-da23399.pdf'],
    historial:[
      { color:C.success, texto:'Asiento creado desde FrontDesk', fecha:'01/04/2026 08:12', usuario:'sistema' },
      { color:C.success, texto:'Contabilizado', fecha:'01/04/2026 09:00', usuario:'jperez' },
    ] },
  { id:3,  tipo:'M', fecha:'2026-04-02', consecutivo:'20260400005', descripcion:'TJ Lafise Colones',               estado:'Pendiente',     idAuxiliar:'',     modulo:'ACC', documento:'DA23388', moneda:'CRC', debe:35500.00,  haber:0,         cuentaCode:'100-002-0001',
    observacion:'Comisión por transacción de tarjeta Lafise, pendiente de confirmar con el banco.', archivos:['tj-lafise-023388.pdf'],
    historial:[
      { color:C.success, texto:'Asiento creado manualmente', fecha:'02/04/2026 10:20', usuario:'sblandon' },
    ] },
  { id:4,  tipo:'M', fecha:'2026-04-03', consecutivo:'20260400010', descripcion:'Transferencia a proveedores',     estado:'Contabilizado', idAuxiliar:'',     modulo:'ACC', documento:'TR00123', moneda:'CRC', debe:0,         haber:120000.00, cuentaCode:'100-002-0001',
    observacion:'Transferencia SINPE a proveedor Materiales Occidente S.A.', archivos:['sinpe-tr00123.pdf'],
    conciliacion:{ id:'BAC-CRC-ABR26', detalle:'BAC ¢ 4546545466888 · Abril 2026' },
    historial:[
      { color:C.success, texto:'Asiento creado manualmente', fecha:'03/04/2026 11:00', usuario:'sblandon' },
      { color:C.success, texto:'Contabilizado', fecha:'03/04/2026 15:40', usuario:'jperez' },
    ] },
  { id:5,  tipo:'A', fecha:'2026-04-01', consecutivo:'20260400001', descripcion:'Depósito adelantado en efectivo', estado:'Contabilizado', idAuxiliar:'0001', modulo:'FDK', documento:'DA23400', moneda:'CRC', debe:50000.12,  haber:0,         cuentaCode:'100-002-0001-AuraTours',
    observacion:'Depósito adelantado - auxiliar AuraTours.', archivos:['comprobante-da23400.pdf'],
    historial:[
      { color:C.success, texto:'Asiento creado desde FrontDesk', fecha:'01/04/2026 08:10', usuario:'sistema' },
      { color:C.success, texto:'Contabilizado', fecha:'01/04/2026 09:00', usuario:'jperez' },
    ] },
  { id:6,  tipo:'A', fecha:'2026-04-01', consecutivo:'20260400001', descripcion:'Depósito adelantado en efectivo', estado:'Contabilizado', idAuxiliar:'0002', modulo:'FDK', documento:'DA23399', moneda:'CRC', debe:417778.88, haber:0,         cuentaCode:'100-002-0001-AuraTours',
    observacion:'Depósito adelantado - auxiliar AuraTours.', archivos:['comprobante-da23399.pdf'],
    historial:[
      { color:C.success, texto:'Asiento creado desde FrontDesk', fecha:'01/04/2026 08:12', usuario:'sistema' },
      { color:C.success, texto:'Contabilizado', fecha:'01/04/2026 09:00', usuario:'jperez' },
    ] },
  { id:7,  tipo:'M', fecha:'2026-04-02', consecutivo:'20260400005', descripcion:'TJ Lafise Colones',               estado:'Pendiente',     idAuxiliar:'',     modulo:'ACC', documento:'DA23388', moneda:'CRC', debe:35500.00,  haber:0,         cuentaCode:'100-002-0001-AuraTours',
    observacion:'Comisión por transacción de tarjeta Lafise - auxiliar AuraTours.', archivos:[],
    historial:[
      { color:C.success, texto:'Asiento creado manualmente', fecha:'02/04/2026 10:22', usuario:'sblandon' },
    ] },
  { id:8,  tipo:'M', fecha:'2026-04-03', consecutivo:'20260400010', descripcion:'Transferencia a proveedores',     estado:'Contabilizado', idAuxiliar:'',     modulo:'ACC', documento:'TR00123', moneda:'CRC', debe:0,         haber:120000.00, cuentaCode:'100-002-0001-AuraTours',
    observacion:'Transferencia SINPE - auxiliar AuraTours.', archivos:['sinpe-tr00123.pdf'],
    historial:[
      { color:C.success, texto:'Asiento creado manualmente', fecha:'03/04/2026 11:02', usuario:'sblandon' },
      { color:C.success, texto:'Contabilizado', fecha:'03/04/2026 15:40', usuario:'jperez' },
    ] },
  { id:9,  tipo:'A', fecha:'2026-04-15', consecutivo:'20260400025', descripcion:'Ingreso por ventas habitaciones', estado:'Contabilizado', idAuxiliar:'',     modulo:'FDK', documento:'FE00001', moneda:'CRC', debe:0,         haber:380000.00, cuentaCode:'400-001-0001',
    observacion:'Ingresos consolidados del día por venta de habitaciones estándar.', archivos:['fe00001.xml','fe00001.pdf'],
    historial:[
      { color:C.success, texto:'Asiento creado desde FrontDesk', fecha:'15/04/2026 23:50', usuario:'sistema' },
      { color:C.success, texto:'Contabilizado', fecha:'16/04/2026 07:15', usuario:'sblandon' },
    ] },
  { id:10, tipo:'M', fecha:'2026-04-20', consecutivo:'20260400033', descripcion:'Sueldos abril 2026',              estado:'Contabilizado', idAuxiliar:'',     modulo:'ACC', documento:'NOM001',  moneda:'CRC', debe:850000.00, haber:0,         cuentaCode:'600-001-0001',
    observacion:'Planilla mensual de sueldos, quincena del 16 al 30 de abril.', archivos:['planilla-abril-2026.xlsx'],
    historial:[
      { color:C.success, texto:'Asiento creado manualmente', fecha:'20/04/2026 09:00', usuario:'glopez' },
      { color:C.success, texto:'Contabilizado', fecha:'20/04/2026 16:30', usuario:'jperez' },
    ] },
  // Issue #18: contrapartidas - antes cada asiento solo tenía un lado (debe o
  // haber) registrado, así que la sumatoria general nunca cuadraba aunque se
  // seleccionaran todas las cuentas. Cada línea de abajo completa su asiento.
  { id:11, tipo:'A', fecha:'2026-04-01', consecutivo:'20260400001', descripcion:'Depósito adelantado en efectivo', estado:'Contabilizado', idAuxiliar:'',     modulo:'FDK', documento:'DA23400/DA23399', moneda:'CRC', debe:0, haber:935558.00, cuentaCode:'200-002-0001',
    observacion:'Contrapartida: pasivo por depósitos de huéspedes aún no aplicados a factura.', archivos:[],
    historial:[ { color:C.success, texto:'Contabilizado', fecha:'01/04/2026 09:00', usuario:'jperez' } ] },
  { id:12, tipo:'M', fecha:'2026-04-02', consecutivo:'20260400005', descripcion:'TJ Lafise Colones',               estado:'Pendiente',     idAuxiliar:'',     modulo:'ACC', documento:'DA23388', moneda:'CRC', debe:0, haber:71000.00, cuentaCode:'100-001-0001',
    observacion:'Contrapartida: comisión de tarjeta pagada desde el fondo de caja.', archivos:[],
    historial:[ { color:C.success, texto:'Asiento creado manualmente', fecha:'02/04/2026 10:20', usuario:'sblandon' } ] },
  { id:13, tipo:'M', fecha:'2026-04-03', consecutivo:'20260400010', descripcion:'Transferencia a proveedores',     estado:'Contabilizado', idAuxiliar:'',     modulo:'ACC', documento:'TR00123', moneda:'CRC', debe:240000.00, haber:0, cuentaCode:'200-001-0001',
    observacion:'Contrapartida: disminución de la cuenta por pagar al proveedor.', archivos:[],
    historial:[ { color:C.success, texto:'Contabilizado', fecha:'03/04/2026 15:40', usuario:'jperez' } ] },
  { id:14, tipo:'A', fecha:'2026-04-15', consecutivo:'20260400025', descripcion:'Ingreso por ventas habitaciones', estado:'Contabilizado', idAuxiliar:'',     modulo:'FDK', documento:'FE00001', moneda:'CRC', debe:380000.00, haber:0, cuentaCode:'100-001-0001',
    observacion:'Contrapartida: ingreso recibido en efectivo en el fondo de caja.', archivos:[],
    historial:[ { color:C.success, texto:'Contabilizado', fecha:'16/04/2026 07:15', usuario:'sblandon' } ] },
  { id:15, tipo:'M', fecha:'2026-04-20', consecutivo:'20260400033', descripcion:'Sueldos abril 2026',              estado:'Contabilizado', idAuxiliar:'',     modulo:'ACC', documento:'NOM001',  moneda:'CRC', debe:0, haber:850000.00, cuentaCode:'100-001-0001',
    observacion:'Contrapartida: sueldos pagados desde el fondo de caja.', archivos:[],
    historial:[ { color:C.success, texto:'Contabilizado', fecha:'20/04/2026 16:30', usuario:'jperez' } ] },
];
export const TIPO_CONFIG: Record<TipoMov,{bg:string;color:string}> = {
  A: { bg:'#DBEAFE', color:'#1D4ED8' },  // azul claro - Automático
  M: { bg:'#DCFCE7', color:'#166534' },  // verde claro - Manual
  I: { bg:'#FEF3C7', color:'#92400E' },  // beige/amber - Importado
  D: { bg:'#EDE9FE', color:'#5B21B6' },  // morado claro - Duplicado
};
export const ESTADO_STYLE: Record<EstadoMov,[string,string]> = {
  Contabilizado: [C.success,'rgba(29,158,117,.1)'],
  Pendiente:  ['#EF9F27','rgba(239,159,39,.1)'],
  Anulado:    [C.error,'rgba(226,75,74,.1)'],
};
// Issue #13: opciones de Tipo de asiento con su código real (m.tipo es 'A'|'M'|'I'|'D',
// no la palabra completa) - antes el filtro comparaba contra la palabra y nunca coincidía.
export const TIPO_OPTIONS: { value:TipoMov; label:string }[] = [
  { value:'A', label:'Automático' },
  { value:'M', label:'Manual' },
  { value:'I', label:'Importado' },
  { value:'D', label:'Duplicado' },
];
// Issue #11: filtro de Módulo
export const MODULOS: { value:string; label:string }[] = [
  { value:'FDK',  label:'Front Desk (FDK)' },
  { value:'POS',  label:'Point of Sales (POS)' },
  { value:'ACC',  label:'Accounting (ACC)' },
  { value:'INV',  label:'Inventory (INV)' },
  { value:'TO',   label:'Tour Operador (TO)' },
  { value:'DICR', label:'Digital Invoices (DICR)' },
];
export interface RangoCuentas { desde:Cuenta; hasta:Cuenta }
export function csvEscapeAnalitico(v: string) { return `"${String(v).replace(/"/g,'""')}"`; }
// ── Tipos de consolidación del libro diario ─────────────────────────────────
export type TipoLibro = 'general' | 'resumen' | 'porLibro';
export const TIPO_LIBRO_OPTIONS: { value: TipoLibro; label: string; desc: string; soloPais?: 'GT' }[] = [
  { value:'general', label:'Diario general',
    desc:'Detalle línea por línea de cada asiento, ordenado por fecha.' },
  { value:'resumen', label:'Diario general resumen',
    desc:'Un total consolidado por cuenta, sin desglosar cada asiento.' },
  { value:'porLibro', label:'Diario general por libro',
    desc:'Un total por cuenta y por tipo de libro (front, tour operador, etc.).', soloPais:'GT' },
];
export interface FilaResumen { clave: string; etiqueta: string; debe: number; haber: number; cantidad: number; }
export function agruparPorCuenta(rows: Movimiento[]): FilaResumen[] {
  const mapa = new Map<string, FilaResumen>();
  rows.forEach(m => {
    const f = mapa.get(m.cuentaCode) ?? { clave:m.cuentaCode, etiqueta:m.cuentaCode, debe:0, haber:0, cantidad:0 };
    f.debe += m.debe; f.haber += m.haber; f.cantidad += 1;
    mapa.set(m.cuentaCode, f);
  });
  return [...mapa.values()].sort((a,b)=>a.clave.localeCompare(b.clave));
}
export function agruparPorLibro(rows: Movimiento[]): FilaResumen[] {
  const mapa = new Map<string, FilaResumen>();
  rows.forEach(m => {
    const clave = `${m.cuentaCode}__${m.modulo}`;
    const f = mapa.get(clave) ?? { clave, etiqueta:`${m.cuentaCode} · ${m.modulo}`, debe:0, haber:0, cantidad:0 };
    f.debe += m.debe; f.haber += m.haber; f.cantidad += 1;
    mapa.set(clave, f);
  });
  return [...mapa.values()].sort((a,b)=>a.clave.localeCompare(b.clave));
}
