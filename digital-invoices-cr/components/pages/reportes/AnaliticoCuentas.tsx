'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { C, fmtNum, Pagination, PERMISOS_ACTUAL, FONT, radius, shadow, PageHeader, SearchInput, FilterDropdown } from '../../ui/primitives';
import DetalleDrawer from '../asientos/DetalleDrawer';
import DateRangeFilter from '../../ui/DateRangeFilter';
import ModalDescontabilizar, { IcDescontabilizar, ConciliacionAfectada } from '../asientos/DescontabilizarModal';
import { useFirmasConfig, firmasParaReporte, EncabezadoAlternativoBloque, FirmasBloque } from '../config/firmasConfig';

// ── CRÍTICO: toda la tipografía usa Montserrat explícitamente ─────────────────
const F = FONT;
const BRAND = C.brand;
function fmt2(n: number) { return fmtNum(n, 2); }

const EMPRESA_PAIS: 'CR' | 'NI' | 'GT' | 'HN' = 'CR';

// ── Types ─────────────────────────────────────────────────────────────────────
type TipoMov = 'A' | 'M' | 'I' | 'D';
type EstadoMov = 'Contabilizado' | 'Pendiente' | 'Anulado';
type NivelCuenta = 'mayor' | 'submajor' | 'detalle' | 'auxiliar';

interface Movimiento {
  id: number; asientoId?: number; tipo: TipoMov; fecha: string; consecutivo: string;
  descripcion: string; estado: EstadoMov; idAuxiliar: string;
  modulo: string; documento: string; moneda: string;
  debe: number; haber: number; cuentaCode: string;
  observacion?: string; archivos?: string[];
  historial?: { color:string; texto:string; fecha:string; usuario:string }[];
  conciliacion?: ConciliacionAfectada | null;
}
interface Cuenta {
  code: string; nombre: string; banco?: string;
  nivel: NivelCuenta; moneda: string; saldoInicial: number;
}

// ── Data ──────────────────────────────────────────────────────────────────────
const CUENTAS: Cuenta[] = [
  { code:'100-001-0001',         nombre:'Fondo de caja general',    nivel:'detalle',  moneda:'CRC', saldoInicial:150000 },
  { code:'100-002-0001',         nombre:'BAC ¢ 4546545466888',      banco:'BAC ¢ 4546545466888', nivel:'detalle',  moneda:'CRC', saldoInicial:0 },
  { code:'100-002-0001-AuraTours',nombre:'AuraTours',               banco:'BAC ¢ 4546545466888', nivel:'auxiliar', moneda:'CRC', saldoInicial:0 },
  { code:'100-003-0001',         nombre:'BAC $ 4563212454587',      nivel:'detalle',  moneda:'USD', saldoInicial:0 },
  { code:'200-001-0001',         nombre:'Proveedores nacionales',   nivel:'detalle',  moneda:'CRC', saldoInicial:0 },
  { code:'200-002-0001',         nombre:'Depósitos adelantados de clientes', nivel:'detalle', moneda:'CRC', saldoInicial:0 },
  { code:'400-001-0001',         nombre:'Habitaciones estándar',    nivel:'detalle',  moneda:'CRC', saldoInicial:0 },
  { code:'600-001-0001',         nombre:'Sueldos y salarios',       nivel:'detalle',  moneda:'CRC', saldoInicial:0 },
];

const MOVIMIENTOS_INIT: Movimiento[] = [
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

const TIPO_CONFIG: Record<TipoMov,{bg:string;color:string}> = {
  A: { bg:'#DBEAFE', color:'#1D4ED8' },  // azul claro - Automático
  M: { bg:'#DCFCE7', color:'#166534' },  // verde claro - Manual
  I: { bg:'#FEF3C7', color:'#92400E' },  // beige/amber - Importado
  D: { bg:'#EDE9FE', color:'#5B21B6' },  // morado claro - Duplicado
};
const ESTADO_STYLE: Record<EstadoMov,[string,string]> = {
  Contabilizado: [C.success,'rgba(29,158,117,.1)'],
  Pendiente:  ['#EF9F27','rgba(239,159,39,.1)'],
  Anulado:    [C.error,'rgba(226,75,74,.1)'],
};

const TIPO_OPTIONS: { value:TipoMov; label:string }[] = [
  { value:'A', label:'Automático' },
  { value:'M', label:'Manual' },
  { value:'I', label:'Importado' },
  { value:'D', label:'Duplicado' },
];

// filtro de Módulo
const MODULOS: { value:string; label:string }[] = [
  { value:'FDK',  label:'Front Desk (FDK)' },
  { value:'POS',  label:'Point of Sales (POS)' },
  { value:'ACC',  label:'Accounting (ACC)' },
  { value:'INV',  label:'Inventory (INV)' },
  { value:'TO',   label:'Tour Operador (TO)' },
  { value:'DICR', label:'Digital Invoices (DICR)' },
];

// ── Shared UI ─────────────────────────────────────────────────────────────────
function TipoPill({ tipo }: { tipo: TipoMov }) {
  const cfg = TIPO_CONFIG[tipo];
  return (
    <span style={{ width:28, height:28, borderRadius:7, display:'inline-flex', alignItems:'center',
      justifyContent:'center', background:cfg.bg, color:cfg.color, fontSize:12, fontWeight:600, fontFamily:F, flexShrink:0 }}>
      {tipo}
    </span>
  );
}
function EstadoBadge({ estado }: { estado: EstadoMov }) {
  const [color,bg] = ESTADO_STYLE[estado];
  return (
    <span style={{ fontSize:11, padding:'2px 9px', borderRadius:radius.pill, fontWeight:500, fontFamily:F, color, background:bg, whiteSpace:'nowrap' }}>
      {estado}
    </span>
  );
}

// ── CuentaSelector ────────────────────────────────────────────────────────────
// Solo permite seleccionar cuentas de nivel detalle o auxiliar
// ── Acción icon con tooltip ───────────────────────────────────────────────────
function ActIc({ label, children, onClick }: { label:string; children:React.ReactNode; onClick?:()=>void }) {
  const [hov,setHov] = useState(false);
  return (
    <div style={{ position:'relative', display:'inline-flex' }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <button onClick={onClick} style={{ width:26, height:26, borderRadius:5, border:'none', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
        background:hov?C.brandBg:'transparent', color:hov?BRAND:C.n700, transition:'all .12s' }}>
        {children}
      </button>
      {hov && (
        <div style={{ position:'absolute', bottom:'110%', left:'50%', transform:'translateX(-50%)',
          background:'#0F0F0F', color:'#fff', fontSize:10, fontFamily:F, padding:'3px 7px',
          borderRadius:4, whiteSpace:'nowrap', pointerEvents:'none', zIndex:9999 }}>
          {label}
        </div>
      )}
    </div>
  );
}
const IcEye  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>;
const IcPrint = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6V2h8v4"/><rect x="2" y="6" width="12" height="6" rx="1"/><path d="M4 12v2h8v-2"/></svg>;
const IcLoop = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>;
const IcCopy = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3h8"/></svg>;
const IcBan  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="8" r="6.33"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5"/></svg>;

function ActionIcons({ mov, onDescontabilizar }: { mov: Movimiento; onDescontabilizar: (m:Movimiento)=>void }) {
  return (
    <div style={{ display:'flex', gap:2 }}>
      <ActIc label="Ver asiento"><IcEye/></ActIc>
      <ActIc label="Imprimir"><IcPrint/></ActIc>
      {mov.estado === 'Contabilizado' && (
        <ActIc label="Descontabilizar (enviar a pendiente)" onClick={() => onDescontabilizar(mov)}>
          <IcDescontabilizar/>
        </ActIc>
      )}
      <ActIc label="Duplicar"><IcCopy/></ActIc>
      <ActIc label="Anular"><IcBan/></ActIc>
    </div>
  );
}

// ── SaldoRow ──────────────────────────────────────────────────────────────────
function SaldoRow({ label, sym, valor, colSpan, mostrarColAux, mostrarColCuenta }: {
  label:string; sym:string; valor:number; colSpan:number; mostrarColAux?:boolean; mostrarColCuenta?:boolean;
}) {
  // Count columns before Debe: checkbox(1)+tipo(1)+fecha(1)+asiento(1)+desc(1)+estado(1)+[aux]+modulo(1)+doc(1) = 8 base + aux
  const baseColsBefore = 8 + (mostrarColAux?1:0) + (mostrarColCuenta?1:0);
  return (
    <tr style={{ background:'#F9F9F9', borderTop:`1px solid ${C.n500}`, borderBottom:`1px solid ${C.n500}` }}>
      <td colSpan={baseColsBefore} style={{ padding:'8px 12px', textAlign:'right', fontSize:11, fontWeight:600, color:'#555', fontFamily:F }}>
        {label}
      </td>
      <td colSpan={2} style={{ padding:'8px 12px', textAlign:'center', whiteSpace:'nowrap' }}>
        <div style={{ display:'inline-flex', alignItems:'baseline', gap:3 }}>
          <span style={{ color:'#9E9E9E', fontSize:11, fontFamily:F }}>{sym}</span>
          <span style={{ fontSize:12, fontWeight:600, color:'#0F0F0F', fontFamily:F }}>{fmt2(valor)}</span>
        </div>
      </td>
      <td/>
    </tr>
  );
}

function TotalizadoRow({ sym, totalDebe, totalHaber, colSpan, mostrarColAux, mostrarColCuenta }: {
  sym:string; totalDebe:number; totalHaber:number; colSpan:number; mostrarColAux?:boolean; mostrarColCuenta?:boolean;
}) {
  const baseColsBefore = 8 + (mostrarColAux?1:0) + (mostrarColCuenta?1:0);
  const cuadra = Math.abs(totalDebe - totalHaber) < 0.005;
  return (
    <tr style={{ background:'#FAFAFA', borderTop:`2px solid ${C.n500}` }}>
      <td colSpan={baseColsBefore} style={{ padding:'9px 12px', textAlign:'right', fontSize:11, fontWeight:700, color:'#333', fontFamily:F }}>
        Totalizado {!cuadra && <span style={{ fontWeight:400, color:'#E07B00' }}>· Debe y Haber no cuadran (cuenta/rango parcial)</span>}
      </td>
      <td style={{ padding:'9px 12px', textAlign:'right', whiteSpace:'nowrap' }}>
        <span style={{ display:'inline-flex', alignItems:'baseline', gap:3 }}>
          <span style={{ color:'#9E9E9E', fontSize:11, fontFamily:F }}>{sym}</span>
          <span style={{ fontSize:12, fontWeight:700, color:'#0F0F0F', fontFamily:F }}>{fmt2(totalDebe)}</span>
        </span>
      </td>
      <td style={{ padding:'9px 12px', textAlign:'right', whiteSpace:'nowrap' }}>
        <span style={{ display:'inline-flex', alignItems:'baseline', gap:3 }}>
          <span style={{ color:'#9E9E9E', fontSize:11, fontFamily:F }}>{sym}</span>
          <span style={{ fontSize:12, fontWeight:700, color:'#0F0F0F', fontFamily:F }}>{fmt2(totalHaber)}</span>
        </span>
      </td>
      <td/>
    </tr>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────


// ── RangoImporteFilter ─────────────────────────────────────────────────────────
function RangoImporteFilter({ minimo, maximo, onApply, onClear }: {
  minimo:number; maximo:number;
  onApply:(min:number,max:number)=>void; onClear:()=>void;
}) {
  const [open, setOpen] = useState(false);
  const [localMin, setLocalMin] = useState(minimo);
  const [localMax, setLocalMax] = useState(maximo);
  const active = minimo > 0 || maximo > 0;
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(()=>{
    function h(e:MouseEvent){if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);}
    if(open)document.addEventListener('mousedown',h);
    return()=>document.removeEventListener('mousedown',h);
  },[open]);
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={()=>{ setLocalMin(minimo); setLocalMax(maximo); setOpen(v=>!v); }}
        style={{ height:32, padding:'0 12px', border:`1px solid ${active?BRAND:C.n500}`, borderRadius:4,
          background:active?C.brandBg:'#fff', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center',
          gap:5, color:active?BRAND:'#0F0F0F', fontFamily:F, fontWeight:active?500:400 }}>
        Importe
        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100%+4px)', left:0, zIndex:300, background:'#fff',
          border:`1px solid ${C.n500}`, borderRadius:10, width:260, boxShadow:shadow.panel, fontFamily:F, padding:'12px 14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:12, fontWeight:600 }}>Importe</span>
            <button onClick={()=>{ setLocalMin(0); setLocalMax(0); onClear(); }} style={{ fontSize:11, color:C.error, background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Limpiar</button>
          </div>
          <p style={{ fontSize:11, color:C.n700, margin:'0 0 4px' }}>Moneda de referencia</p>
          <div style={{ display:'flex', gap:6, marginBottom:12 }}>
            <button style={{ flex:1, height:28, border:`2px solid ${BRAND}`, borderRadius:radius.sm, background:C.brandBg, cursor:'pointer', fontSize:12, fontFamily:F, color:BRAND, fontWeight:500 }}>₡ CRC</button>
            <button style={{ flex:1, height:28, border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F, color:'#0F0F0F' }}>$ USD</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:6, alignItems:'center', marginBottom:12 }}>
            <input type="number" value={localMin||''} onChange={e=>setLocalMin(+e.target.value||0)} placeholder="₡ 0"
              style={{ height:32, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', width:'100%', boxSizing:'border-box' }}/>
            <span style={{ color:C.n700, textAlign:'center', fontSize:12 }}>-</span>
            <input type="number" value={localMax||''} onChange={e=>setLocalMax(+e.target.value||0)} placeholder="₡ 2,000,000"
              style={{ height:32, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', width:'100%', boxSizing:'border-box' }}/>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setOpen(false)} style={{ flex:1, height:30, border:`1px solid ${C.n500}`, borderRadius:7, background:'#fff', cursor:'pointer', fontSize:11, fontFamily:F }}>Cancelar</button>
            <button onClick={()=>{ onApply(localMin,localMax); setOpen(false); }} style={{ flex:1, height:30, border:'none', borderRadius:7, background:BRAND, color:'#fff', cursor:'pointer', fontSize:11, fontWeight:500, fontFamily:F }}>Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mini combobox reutilizable para elegir una cuenta (usado en Desde/Hasta del rango) ──
function MiniCuentaCombo({ cuentas, value, onSelect, placeholder }: {
  cuentas: Cuenta[]; value: Cuenta|null; onSelect:(c:Cuenta)=>void; placeholder:string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const filtered = cuentas.filter(c => !q || c.code.toLowerCase().includes(q.toLowerCase()) || c.nombre.toLowerCase().includes(q.toLowerCase()));
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button type="button" onClick={()=>{ setOpen(v=>!v); setQ(''); }}
        style={{ width:'100%', height:32, padding:'0 10px', border:`1px solid ${value?BRAND:C.n500}`, borderRadius:radius.sm,
          background:value?C.brandBg:'#fff', cursor:'pointer', fontSize:11, fontFamily:F, textAlign:'left',
          color: value?BRAND:C.n700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {value ? value.code : placeholder}
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:40, background:'#fff', border:`1px solid ${C.n500}`,
          borderRadius:radius.md, width:260, boxShadow:shadow.panel }}>
          <div style={{ padding:6 }}>
            <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Código o nombre…"
              style={{ width:'100%', height:28, padding:'0 8px', border:`1px solid ${BRAND}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
          </div>
          <div style={{ maxHeight:160, overflowY:'auto' }}>
            {filtered.map(c=>(
              <button key={c.code} type="button" onClick={()=>{ onSelect(c); setOpen(false); }}
                style={{ display:'block', width:'100%', textAlign:'left', padding:'6px 10px', border:'none', background:'none', cursor:'pointer', fontFamily:F }}
                onMouseEnter={e=>(e.currentTarget.style.background=C.n200)} onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                <span style={{ display:'block', fontSize:11, fontWeight:600, color:BRAND }}>{c.code}</span>
                <span style={{ display:'block', fontSize:10, color:C.n700 }}>{c.nombre}</span>
              </button>
            ))}
            {filtered.length===0 && <p style={{ padding:'8px 10px', fontSize:11, color:C.n700, margin:0 }}>Sin resultados</p>}
          </div>
        </div>
      )}
    </div>
  );
}

interface RangoCuentas { desde:Cuenta; hasta:Cuenta }

// ── CuentaFiltroUnico - un solo filtro: busca por código/nombre, una cuenta o un rango ──
function CuentaFiltroUnico({ cuenta, rango, onSelectCuenta, onSelectRango, onClear }: {
  cuenta: Cuenta|null; rango: RangoCuentas|null;
  onSelectCuenta:(c:Cuenta)=>void; onSelectRango:(r:RangoCuentas)=>void; onClear:()=>void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'una'|'rango'>(rango ? 'rango' : 'una');
  const [nivel, setNivel] = useState<'detalle'|'auxiliar'>('detalle');
  const [rDesde, setRDesde] = useState<Cuenta|null>(rango?.desde ?? null);
  const [rHasta, setRHasta] = useState<Cuenta|null>(rango?.hasta ?? null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const elegibles = CUENTAS.filter(c => c.nivel === nivel);
  const filtered = elegibles.filter(c =>
    !q || c.code.toLowerCase().includes(q.toLowerCase()) || c.nombre.toLowerCase().includes(q.toLowerCase())
  );

  const label = rango ? `Rango: ${rango.desde.code} → ${rango.hasta.code}`
    : cuenta ? `Cuenta: ${cuenta.code}`
    : 'Todas las cuentas';

  function aplicarRango() {
    if (rDesde && rHasta) {
      const [a,b] = rDesde.code <= rHasta.code ? [rDesde,rHasta] : [rHasta,rDesde];
      onSelectRango({ desde:a, hasta:b });
      setOpen(false);
    }
  }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={()=>{ setQ(''); setOpen(v=>!v); }}
        style={{ height:34, padding:'0 14px', border:`1px solid ${(cuenta||rango)?BRAND:C.n500}`, borderRadius:radius.md,
          background:(cuenta||rango)?C.brandBg:'#fff', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:6,
          color:(cuenta||rango)?BRAND:'#0F0F0F', fontFamily:F, fontWeight:(cuenta||rango)?500:400, maxWidth:280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {label}
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink:0 }}><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
      </button>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:500, background:'#fff',
          border:`1px solid ${C.n500}`, borderRadius:radius.lg, boxShadow:'0 8px 32px rgba(0,0,0,.16)', width:460, fontFamily:F }}>

          <div style={{ padding:'10px 14px', borderBottom:`1px solid ${C.n500}` }}>
            <p style={{ fontSize:12, fontWeight:600, margin:'0 0 8px' }}>Seleccionar cuenta</p>

            {/* Nivel tabs */}
            <div style={{ display:'flex', gap:4, marginBottom:8 }}>
              {(['detalle','auxiliar'] as const).map(n=>(
                <button key={n} onClick={()=>setNivel(n)}
                  style={{ height:26, padding:'0 12px', border:`1px solid ${nivel===n?BRAND:C.n500}`, borderRadius:radius.pill,
                    background:nivel===n?BRAND:'#fff', color:nivel===n?'#fff':'#0F0F0F', cursor:'pointer', fontSize:11, fontFamily:F, fontWeight:nivel===n?600:400 }}>
                  {n==='detalle'?'Detalle':'Auxiliar'}
                </button>
              ))}
            </div>

            {/* Una cuenta / Rango tabs - mutuamente excluyentes */}
            <div style={{ display:'flex', borderBottom:`2px solid ${C.n500}` }}>
              {(['una','rango'] as const).map(t=>(
                <button key={t} onClick={()=>setTab(t)}
                  style={{ height:30, padding:'0 12px', border:'none', background:'none', cursor:'pointer', fontSize:12, fontFamily:F,
                    color:tab===t?BRAND:'#0F0F0F', borderBottom:`2px solid ${tab===t?BRAND:'transparent'}`, marginBottom:-2, fontWeight:tab===t?600:400 }}>
                  {t==='una'?'Una cuenta':'Rango de cuentas'}
                </button>
              ))}
            </div>
          </div>

          {tab === 'una' && (
            <>
              <div style={{ padding:'10px 14px 0' }}>
                <div style={{ position:'relative' }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.3" style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)' }}><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l-2-2"/></svg>
                  <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por código o nombre…"
                    style={{ width:'100%', height:32, paddingLeft:26, paddingRight:8, border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                </div>
              </div>
              <div style={{ maxHeight:220, overflowY:'auto', padding:'6px 0 4px' }}>
                <div onClick={()=>{ onClear(); setOpen(false); }}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', cursor:'pointer', background: (!cuenta&&!rango) ? C.brandBg:'#fff', fontSize:12, fontFamily:F, color: (!cuenta&&!rango)?BRAND:C.n700 }}
                  onMouseEnter={e=>(e.currentTarget.style.background=C.n200)} onMouseLeave={e=>(e.currentTarget.style.background=(!cuenta&&!rango)?C.brandBg:'#fff')}>
                  <span>Todas las cuentas</span>
                  {!cuenta && !rango && <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={BRAND} strokeWidth="2.5" strokeLinecap="round"><path d="M2 7l3.5 3.5L12 3"/></svg>}
                </div>
                {filtered.map(ct=>{
                  const isSel = cuenta?.code === ct.code;
                  return (
                    <div key={ct.code} onClick={()=>{ onSelectCuenta(ct); setOpen(false); }}
                      style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 14px', cursor:'pointer', fontSize:12, fontFamily:F,
                        background:isSel?C.brandBg:'#fff' }}
                      onMouseEnter={e=>(e.currentTarget.style.background=C.n200)} onMouseLeave={e=>(e.currentTarget.style.background=isSel?C.brandBg:'#fff')}>
                      <div style={{ display:'flex', gap:10, minWidth:0 }}>
                        <span style={{ color:BRAND, fontWeight:600, minWidth:110, flexShrink:0 }}>{ct.code}</span>
                        <span style={{ color:'#0F0F0F', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ct.nombre}</span>
                      </div>
                      {isSel && <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={BRAND} strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0}}><path d="M2 7l3.5 3.5L12 3"/></svg>}
                    </div>
                  );
                })}
                {filtered.length===0 && <p style={{ padding:'10px 14px', fontSize:12, color:C.n700, margin:0 }}>Sin resultados</p>}
              </div>
            </>
          )}

          {tab === 'rango' && (
            <div style={{ padding:'12px 14px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <label style={{ fontSize:11, color:C.n700, display:'block', marginBottom:4 }}>Desde</label>
                  <MiniCuentaCombo cuentas={elegibles} value={rDesde} onSelect={setRDesde} placeholder="Buscar…"/>
                </div>
                <div>
                  <label style={{ fontSize:11, color:C.n700, display:'block', marginBottom:4 }}>Hasta</label>
                  <MiniCuentaCombo cuentas={elegibles} value={rHasta} onSelect={setRHasta} placeholder="Buscar…"/>
                </div>
              </div>
              {rDesde && rHasta && (() => {
                const [a,b] = rDesde.code <= rHasta.code ? [rDesde,rHasta] : [rHasta,rDesde];
                const n = elegibles.filter(c=>c.code>=a.code && c.code<=b.code).length;
                return (
                  <div style={{ marginTop:10, padding:'7px 10px', background:C.brandBg, borderRadius:radius.sm, fontSize:11, color:BRAND }}>
                    {a.code} → {b.code} · {n} cuenta{n!==1?'s':''}
                  </div>
                );
              })()}
            </div>
          )}

          <div style={{ padding:'8px 14px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
            <button onClick={()=>setOpen(false)} style={{ height:28, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#fff', cursor:'pointer', fontSize:11, fontFamily:F }}>Cancelar</button>
            {tab==='rango' && (
              <button onClick={aplicarRango} disabled={!rDesde || !rHasta}
                style={{ height:28, padding:'0 12px', border:'none', borderRadius:radius.sm, background:(rDesde&&rHasta)?BRAND:C.n500, color:'#fff', cursor:(rDesde&&rHasta)?'pointer':'default', fontSize:11, fontWeight:500, fontFamily:F }}>
                Aplicar rango
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function csvEscapeAnalitico(v: string) { return `"${String(v).replace(/"/g,'""')}"`; }

// ── Tipos de consolidación del libro diario ─────────────────────────────────
type TipoLibro = 'general' | 'resumen' | 'porLibro';

const TIPO_LIBRO_OPTIONS: { value: TipoLibro; label: string; desc: string; soloPais?: 'GT' }[] = [
  { value:'general', label:'Diario general',
    desc:'Detalle línea por línea de cada asiento, ordenado por fecha.' },
  { value:'resumen', label:'Diario general resumen',
    desc:'Un total consolidado por cuenta, sin desglosar cada asiento.' },
  { value:'porLibro', label:'Diario general por libro',
    desc:'Un total por cuenta y por tipo de libro (front, tour operador, etc.).', soloPais:'GT' },
];

interface FilaResumen { clave: string; etiqueta: string; debe: number; haber: number; cantidad: number; }

function agruparPorCuenta(rows: Movimiento[]): FilaResumen[] {
  const mapa = new Map<string, FilaResumen>();
  rows.forEach(m => {
    const f = mapa.get(m.cuentaCode) ?? { clave:m.cuentaCode, etiqueta:m.cuentaCode, debe:0, haber:0, cantidad:0 };
    f.debe += m.debe; f.haber += m.haber; f.cantidad += 1;
    mapa.set(m.cuentaCode, f);
  });
  return [...mapa.values()].sort((a,b)=>a.clave.localeCompare(b.clave));
}

function agruparPorLibro(rows: Movimiento[]): FilaResumen[] {
  const mapa = new Map<string, FilaResumen>();
  rows.forEach(m => {
    const clave = `${m.cuentaCode}__${m.modulo}`;
    const f = mapa.get(clave) ?? { clave, etiqueta:`${m.cuentaCode} · ${m.modulo}`, debe:0, haber:0, cantidad:0 };
    f.debe += m.debe; f.haber += m.haber; f.cantidad += 1;
    mapa.set(clave, f);
  });
  return [...mapa.values()].sort((a,b)=>a.clave.localeCompare(b.clave));
}

function ModalExportarAnalitico({ rows, filasResumen, tipoActivo, cuentaLabel, saldoInicial, saldoFinal, sym, filtrosResumen, onClose }: {
  rows: Movimiento[]; filasResumen: FilaResumen[] | null; tipoActivo: TipoLibro;
  cuentaLabel: string|null; saldoInicial: number|null; saldoFinal: number|null; sym: string;
  filtrosResumen: string[]; onClose: () => void;
}) {
  const [formato, setFormato] = useState<'pdf'|'csv'>('pdf');
  const fechaHoy = new Date().toLocaleDateString('es-CR');
  const router = useRouter();
  const totalDebe  = rows.reduce((s,m)=>s+m.debe,  0);
  const totalHaber = rows.reduce((s,m)=>s+m.haber, 0);
  const tituloReporte = TIPO_LIBRO_OPTIONS.find(o => o.value === tipoActivo)?.label ?? 'Diario general';
  const { firmas } = useFirmasConfig();
  const mostrarOpcionEncabezado = true;
  const firmasDelReporte = firmasParaReporte(firmas, 'analitico');
  const mostrarOpcionFirmas = true;
  const [encabezadoAlt, setEncabezadoAlt] = useState(false);
  const [incluirFirmas, setIncluirFirmas] = useState(false);

  function descargarCSV() {
    const lines: string[] = [];
    if (filasResumen) {
      const headers = ['Cuenta','Cantidad de asientos','Debe','Haber'];
      lines.push(headers.map(csvEscapeAnalitico).join(','));
      filasResumen.forEach(f=>{
        lines.push([f.etiqueta, String(f.cantidad), f.debe.toFixed(2), f.haber.toFixed(2)]
          .map(v=>csvEscapeAnalitico(String(v))).join(','));
      });
    } else {
      const headers = cuentaLabel
        ? ['Tipo','Fecha','N.º Asiento','Descripción','Estado','Módulo','Documento','Debe','Haber']
        : ['Tipo','Fecha','N.º Asiento','Cuenta','Descripción','Estado','Módulo','Documento','Debe','Haber'];
      lines.push(headers.map(csvEscapeAnalitico).join(','));
      rows.forEach(m=>{
        const fila = cuentaLabel
          ? [m.tipo, m.fecha, m.consecutivo, m.descripcion, m.estado, m.modulo, m.documento, m.debe.toFixed(2), m.haber.toFixed(2)]
          : [m.tipo, m.fecha, m.consecutivo, m.cuentaCode, m.descripcion, m.estado, m.modulo, m.documento, m.debe.toFixed(2), m.haber.toFixed(2)];
        lines.push(fila.map(v=>csvEscapeAnalitico(String(v))).join(','));
      });
    }
    const blob = new Blob(['﻿'+lines.join('\n')], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analitico-cuentas-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleDescargar() { formato==='csv' ? descargarCSV() : window.print(); }

  const toggleBtn = (active: boolean): React.CSSProperties => ({
    flex:1, height:32, borderRadius:radius.md, border:`1px solid ${active?BRAND:C.n500}`,
    background:active?C.brandBg:'#fff', color:active?BRAND:'#0F0F0F',
    fontWeight:active?600:400, cursor:'pointer', fontSize:12, fontFamily:F,
    padding:'0 10px', whiteSpace:'nowrap', display:'flex', alignItems:'center', justifyContent:'center',
  });

  return (
    <div className="export-modal-root" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1001, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <style>{`@media print {
        body * { visibility:hidden; }
        #export-print-area-analitico, #export-print-area-analitico * { visibility:visible; }
        #export-print-area-analitico { position:absolute; left:0; top:0; width:100%; padding:24px; }
        /* display:flex en los contenedores del modal rompe la paginación al
           imprimir - se fuerza a block solo en @media print. */
        .export-modal-root, .export-modal-dialog, .export-modal-scroll {
          position:static !important; overflow:visible !important; height:auto !important;
          max-height:none !important; width:auto !important; display:block !important; box-shadow:none !important;
        }
        #export-print-area-analitico table thead { display: table-header-group; }
        #export-print-area-analitico table tr { page-break-inside: avoid; }
      }`}</style>
      <div className="export-modal-dialog" style={{ background:'#fff', borderRadius:radius.lg, width:'min(1100px, 95vw)', maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Exportar analítico de cuentas</p>
            <p style={{ fontSize:11, color:'#757575', margin:'3px 0 0' }}>{rows.length} movimiento{rows.length===1?'':'s'} con los filtros actuales</p>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#757575' }}>×</button>
        </div>

        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', gap:24, flexShrink:0, flexWrap:'wrap' }}>
          <div>
            <p style={{ fontSize:10, fontWeight:600, color:'#9E9E9E', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 8px' }}>Formato de descarga</p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setFormato('pdf')} style={toggleBtn(formato==='pdf')}>PDF</button>
              <button onClick={()=>setFormato('csv')} style={toggleBtn(formato==='csv')}>Excel (CSV)</button>
            </div>
          </div>
          {filtrosResumen.length > 0 && (
            <div style={{ flex:1, minWidth:220 }}>
              <p style={{ fontSize:10, fontWeight:600, color:'#9E9E9E', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 8px' }}>Filtros aplicados</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {filtrosResumen.map((f,i)=>(
                  <span key={i} style={{ fontSize:11, padding:'3px 9px', borderRadius:radius.pill, background:C.brandBg, color:BRAND, border:`1px solid ${C.brandBd}` }}>{f}</span>
                ))}
              </div>
            </div>
          )}
          {(mostrarOpcionEncabezado || mostrarOpcionFirmas) && (
            <div>
              <p style={{ fontSize:10, fontWeight:600, color:'#9E9E9E', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 8px' }}>Opciones</p>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {mostrarOpcionEncabezado && (
                  <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:12, fontFamily:F, color:'#0F0F0F' }}>
                    <input type="checkbox" checked={encabezadoAlt} onChange={e=>setEncabezadoAlt(e.target.checked)} style={{ accentColor:BRAND }} />
                    Encabezado alternativo
                  </label>
                )}
                {mostrarOpcionFirmas && (
                  firmasDelReporte.length > 0 ? (
                    <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:12, fontFamily:F, color:'#0F0F0F' }}>
                      <input type="checkbox" checked={incluirFirmas} onChange={e=>setIncluirFirmas(e.target.checked)} style={{ accentColor:BRAND }} />
                      Incluir firma{firmasDelReporte.length > 1 ? `s (${firmasDelReporte.length})` : ''}
                    </label>
                  ) : (
                    <div style={{ fontSize:11.5, color:C.n700, fontFamily:F, lineHeight:1.5, maxWidth:260 }}>
                      No hay firmas configuradas para este reporte.{' '}
                      <button type="button" onClick={()=>router.push('/parametros?tab=firmas')}
                        style={{ background:'none', border:'none', padding:0, color:BRAND, fontWeight:500, cursor:'pointer', fontSize:11.5, fontFamily:F, textDecoration:'underline' }}>
                        Configuralas en Parámetros generales &gt; Firmas
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>


        <div className="export-modal-scroll" style={{ flex:1, overflowY:'auto', padding:'16px 24px', background:'#F5F5F5' }}>
          <div id="export-print-area-analitico" style={{ background:'#fff', border:`1px solid ${C.n500}`, borderRadius:radius.md, padding:24 }}>
            {encabezadoAlt ? (
              <EncabezadoAlternativoBloque titulo={tituloReporte + (cuentaLabel?` · ${cuentaLabel}`:'')} moneda={sym}/>
            ) : (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
              <div>
                <p style={{ fontSize:16, fontWeight:700, margin:0 }}>Hotel Fortuna S.A.</p>
                <p style={{ fontSize:12, color:'#757575', margin:'2px 0 0' }}>{tituloReporte}{cuentaLabel?` · ${cuentaLabel}`:''}</p>
              </div>
              <p style={{ fontSize:11, color:'#757575', margin:0 }}>Generado: {fechaHoy}</p>
            </div>
            )}
            {filtrosResumen.length > 0 && (
              <p style={{ fontSize:11, color:'#757575', margin:'0 0 12px' }}>Filtros: {filtrosResumen.join(' · ')}</p>
            )}
            {saldoInicial !== null && (
              <p style={{ fontSize:11, color:'#555', margin:'0 0 8px' }}>Saldo inicial: <strong>{sym} {fmt2(saldoInicial)}</strong></p>
            )}
            {filasResumen ? (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead><tr style={{ borderBottom:`2px solid ${C.n500}` }}>
                  {[tipoActivo==='porLibro'?'Cuenta y libro':'Cuenta','Asientos','Debe','Haber'].map((h,i)=>(
                    <th key={h} style={{ padding:'6px 8px', textAlign:i>=2?'right':'left', fontWeight:500, color:'#555' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filasResumen.length===0 ? (
                    <tr><td colSpan={4} style={{ padding:20, textAlign:'center', color:'#9E9E9E' }}>Sin movimientos para exportar.</td></tr>
                  ) : filasResumen.map(f=>(
                    <tr key={f.clave} style={{ borderBottom:'1px solid #F0F0F0' }}>
                      <td style={{ padding:'5px 8px', color:BRAND }}>{f.etiqueta}</td>
                      <td style={{ padding:'5px 8px' }}>{f.cantidad}</td>
                      <td style={{ padding:'5px 8px', textAlign:'right', whiteSpace:'nowrap' }}>{f.debe>0?fmt2(f.debe):'-'}</td>
                      <td style={{ padding:'5px 8px', textAlign:'right', whiteSpace:'nowrap' }}>{f.haber>0?fmt2(f.haber):'-'}</td>
                    </tr>
                  ))}
                </tbody>
                {filasResumen.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop:`2px solid ${C.n500}` }}>
                      <td colSpan={2} style={{ padding:'6px 8px', fontWeight:700 }}>Totales</td>
                      <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>{sym} {fmt2(totalDebe)}</td>
                      <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>{sym} {fmt2(totalHaber)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead><tr style={{ borderBottom:`2px solid ${C.n500}` }}>
                  {(cuentaLabel ? ['Tipo','Fecha','N.º Asiento','Descripción','Estado','Módulo','Documento','Debe','Haber'] : ['Tipo','Fecha','N.º Asiento','Cuenta','Descripción','Estado','Módulo','Documento','Debe','Haber']).map(h=>(
                    <th key={h} style={{ padding:'6px 8px', textAlign:(h==='Debe'||h==='Haber')?'right':'left', fontWeight:500, color:'#555' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {rows.length===0 ? (
                    <tr><td colSpan={cuentaLabel?9:10} style={{ padding:20, textAlign:'center', color:'#9E9E9E' }}>Sin movimientos para exportar.</td></tr>
                  ) : rows.map(m=>(
                    <tr key={m.id} style={{ borderBottom:'1px solid #F0F0F0' }}>
                      <td style={{ padding:'5px 8px' }}>{m.tipo}</td>
                      <td style={{ padding:'5px 8px', whiteSpace:'nowrap' }}>{m.fecha.split('-').reverse().join('/')}</td>
                      <td style={{ padding:'5px 8px', color:BRAND }}>{m.consecutivo}</td>
                      {!cuentaLabel && <td style={{ padding:'5px 8px', whiteSpace:'nowrap' }}>{m.cuentaCode}</td>}
                      <td style={{ padding:'5px 8px' }}>{m.descripcion}</td>
                      <td style={{ padding:'5px 8px' }}>{m.estado}</td>
                      <td style={{ padding:'5px 8px' }}>{m.modulo}</td>
                      <td style={{ padding:'5px 8px' }}>{m.documento}</td>
                      <td style={{ padding:'5px 8px', textAlign:'right', whiteSpace:'nowrap' }}>{m.debe>0?fmt2(m.debe):'-'}</td>
                      <td style={{ padding:'5px 8px', textAlign:'right', whiteSpace:'nowrap' }}>{m.haber>0?fmt2(m.haber):'-'}</td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop:`2px solid ${C.n500}` }}>
                      <td colSpan={cuentaLabel?7:8} style={{ padding:'6px 8px', fontWeight:700 }}>Totales</td>
                      <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>{sym} {fmt2(totalDebe)}</td>
                      <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>{sym} {fmt2(totalHaber)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
            {saldoFinal !== null && (
              <p style={{ fontSize:11, color:'#555', margin:'12px 0 0', textAlign:'right' }}>Saldo final: <strong>{sym} {fmt2(saldoFinal)}</strong></p>
            )}
            {incluirFirmas && <FirmasBloque firmas={firmasDelReporte}/>}
          </div>
        </div>

        <div style={{ padding:'12px 24px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8, flexShrink:0 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={handleDescargar} style={{ height:34, padding:'0 16px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F, display:'flex', alignItems:'center', gap:6 }}>
            <IcPrint/> Descargar {formato==='pdf'?'PDF':'Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnaliticoCuentas() {
  const [cuentaSel,  setCuentaSel]  = useState<Cuenta|null>(null);
  const [rangoSel,   setRangoSel]   = useState<RangoCuentas|null>(null);
  const [mostrarNum, setMostrarNum] = useState(false);
  const [searchQ,    setSearch]     = useState('');
  // Movimientos de los asientos guardados (Bandeja y facturación) y las cuentas del catálogo
  const [movimientos, setMovimientosLocal] = useState<Movimiento[]>([]);
  const [cargandoMov, setCargandoMov] = useState(true);
  useEffect(() => {
    let vivo = true;
    fetch('/api/contabilidad/analitico').then(r => r.json()).then((d: { cuentas: (Cuenta & { saldoInicial: number })[]; movimientos: Movimiento[] }) => {
      if (!vivo) return;
      CUENTAS.splice(0, CUENTAS.length, ...d.cuentas.filter(c => c.nivel === 'detalle' || c.nivel === 'auxiliar' || c.nivel === 'mayor' || c.nivel === 'submajor'));
      setMovimientosLocal(d.movimientos);
      setCargandoMov(false);
    }).catch(() => { if (vivo) { setMovimientosLocal(MOVIMIENTOS_INIT); setCargandoMov(false); } });
    return () => { vivo = false; };
  }, []);
  // Contabilizar o descontabilizar cambia el asiento completo (todas sus líneas) y se guarda
  const setMovimientos = (fn: (p: Movimiento[]) => Movimiento[]) => {
    setMovimientosLocal(prev => {
      const next = fn(prev);
      const cambios = new Map<number, boolean>();
      next.forEach((m, i) => { if (m.asientoId && prev[i] && prev[i].estado !== m.estado) cambios.set(m.asientoId, m.estado === 'Contabilizado'); });
      if (!cambios.size) return next;
      for (const v of [true, false]) {
        const ids = [...cambios].filter(([, c]) => c === v).map(([id]) => id);
        if (ids.length) fetch('/api/asientos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, contabilizado: v }) }).catch(() => {});
      }
      return next.map(m => m.asientoId && cambios.has(m.asientoId) && m.estado !== 'Anulado' ? { ...m, estado: cambios.get(m.asientoId) ? 'Contabilizado' : 'Pendiente' } : m);
    });
  };
  const [confirmDesmay, setConfirmDesmay] = useState<Movimiento|null>(null);
  const [detalleAsiento, setDetalleAsiento] = useState<Movimiento|null>(null);
  const [filtTipo,   setFiltTipo]   = useState<Set<string>>(new Set());
  const [filtOrigen, setFiltOrigen] = useState<Set<string>>(new Set());
  const [filtEstado, setFiltEstado] = useState<Set<string>>(new Set(['Contabilizado']));
  const [filtMoneda, setFiltMoneda] = useState<Set<string>>(new Set());
  const [filtMinimo, setFiltMin]    = useState(0);
  const [filtMaximo, setFiltMax]    = useState(0);
  const [filtFecha,  setFiltFecha]  = useState({ from:'', to:'' });
  const [filtUsuario,setFiltUsuario]= useState<Set<string>>(new Set());
  const [selected,   setSelected]   = useState<Set<number>>(new Set());
  const [confirmDesmayMasivo, setConfirmDesmayMasivo] = useState(false);
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exportarOpen, setExportarOpen] = useState(false);
  const [vista, setVista] = useState<TipoLibro>('general');

  const toggleSelected = (id: number) => {
    setSelected(p => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // ── Determinar escenario ──────────────────────────────────────────────────
  // Escenario A: ninguna cuenta - mostrar todas
  // Escenario B: cuenta detalle - encabezado, saldo ini/fin, col ID auxiliar
  // Escenario C: cuenta auxiliar - igual que B pero SIN col ID auxiliar
  const esDetalle  = cuentaSel?.nivel === 'detalle';
  const esAuxiliar = cuentaSel?.nivel === 'auxiliar';
  const tieneCuenta = esDetalle || esAuxiliar;
  // Escenario D: rango de cuentas - varias cuentas de un mismo nivel, se comportan como "todas" pero acotadas
  const tieneRango = !!rangoSel;
  // Vista global (todas las cuentas, sin filtrar a una cuenta o rango puntual) es la
  // única donde tiene sentido consolidar por cuenta o por libro; con una cuenta
  // específica seleccionada siempre se ve el detalle.
  const vistaGlobal = !tieneCuenta && !tieneRango;
  const vistaActiva: TipoLibro = vistaGlobal ? vista : 'general';
  const tipoLibroOpciones = TIPO_LIBRO_OPTIONS.filter(o => !o.soloPais || o.soloPais === EMPRESA_PAIS);

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const movsFiltrados = movimientos.filter(m => {
    // 9. Por defecto solo Contabilizados; si usuario activa Pendiente en filtro Estado se incluyen
    // 10. Anulados nunca se muestran
    if (m.estado === 'Anulado') return false;
    // Si no hay filtro de estado activo → solo Contabilizados
    if (filtEstado.size === 0 && m.estado !== 'Contabilizado') return false;
    // Si hay filtro de estado → respetar selección (excepto Anulados)
    if (filtEstado.size > 0 && !filtEstado.has(m.estado)) return false;

    if (tieneCuenta && m.cuentaCode !== cuentaSel!.code) return false;
    if (tieneRango && !(m.cuentaCode >= rangoSel!.desde.code && m.cuentaCode <= rangoSel!.hasta.code)) return false;
    // una sola barra de búsqueda cubre descripción, N° asiento, ID auxiliar y documento
    if (searchQ) {
      const q = searchQ.toLowerCase();
      const matches = m.descripcion.toLowerCase().includes(q)
        || m.documento.toLowerCase().includes(q)
        || m.idAuxiliar.toLowerCase().includes(q)
        || m.consecutivo.includes(searchQ);
      if (!matches) return false;
    }
    if (filtTipo.size   > 0 && !filtTipo.has(m.tipo))     return false;
    if (filtOrigen.size > 0 && !filtOrigen.has(m.modulo)) return false;
    if (filtMoneda.size > 0 && !filtMoneda.has(m.moneda)) return false;
    if (filtFecha.from && m.fecha < filtFecha.from) return false;
    if (filtFecha.to   && m.fecha > filtFecha.to)   return false;
    // Rango importe
    const total = m.debe + m.haber;
    if (filtMinimo > 0  && total < filtMinimo)  return false;
    if (filtMaximo > 0  && total > filtMaximo)  return false;
    return true;
  });

  // paginación - se deriva de movsFiltrados/pageSize, sin necesidad de un efecto;
  // paginaActual siempre queda acotada al rango válido aunque los filtros reduzcan el total.
  const totalPaginas = Math.max(1, Math.ceil(movsFiltrados.length / pageSize));
  const paginaActual = Math.min(page, totalPaginas);
  const movsPagina   = movsFiltrados.slice((paginaActual-1)*pageSize, paginaActual*pageSize);

  // selección masiva - solo filas Contabilizado pueden descontabilizarse en bloque
  const selectableIds = movsFiltrados.filter(m=>m.estado==='Contabilizado').map(m=>m.id);
  const allSelected    = selectableIds.length > 0 && selectableIds.every(id=>selected.has(id));
  const selectedCount  = selectableIds.filter(id=>selected.has(id)).length;
  const toggleSelectAll = () => {
    setSelected(p => {
      const n = new Set(p);
      if (allSelected) { selectableIds.forEach(id=>n.delete(id)); }
      else { selectableIds.forEach(id=>n.add(id)); }
      return n;
    });
  };

  const totalDebe    = movsFiltrados.reduce((s,m)=>s+m.debe,  0);
  const totalHaber   = movsFiltrados.reduce((s,m)=>s+m.haber, 0);
  const saldoInicial = cuentaSel?.saldoInicial ?? 0;
  const saldoFinal   = saldoInicial + totalDebe - totalHaber;
  const sym          = cuentaSel?.moneda === 'USD' ? '$' : '₡';

  // Filas consolidadas para la vista "Ver como" activa (null = detalle normal)
  const filasResumenVista = vistaActiva === 'resumen' ? agruparPorCuenta(movsFiltrados)
    : vistaActiva === 'porLibro' ? agruparPorLibro(movsFiltrados)
    : null;

  // ── Columnas según escenario ──────────────────────────────────────────────
  // Escenario A (todas): Tipo | Fecha | N°Asiento | Descripción | Estado | [Cuenta si mostrarNum] | Módulo | Doc | Debe | Haber | Acciones
  // Escenario B (detalle): Tipo | Fecha | N°Asiento | Descripción | Estado | ID Auxiliar | Módulo | Doc | Debe | Haber | Acciones
  // Escenario C (auxiliar): Tipo | Fecha | N°Asiento | Descripción | Estado | Módulo | Doc | Debe | Haber | Acciones

  // Columna "Cuenta" se muestra en escenario A cuando mostrarNum=true, y siempre en un rango (varias cuentas a la vez)
  const mostrarColCuenta = tieneRango || (!tieneCuenta && mostrarNum);
  // Columna "ID Auxiliar" se muestra en Todas las cuentas y en cuenta detalle; se omite solo si la cuenta seleccionada ya es auxiliar
  const mostrarColAux    = !esAuxiliar;

  const thStyle: React.CSSProperties = { padding:'10px 12px', textAlign:'left', fontWeight:500, color:C.n700, fontSize:11, whiteSpace:'nowrap', fontFamily:F };
  const thR:     React.CSSProperties = { ...thStyle, textAlign:'right' };

  // colspan para SaldoRow (todo menos última col de haber y acciones)
  const colspanSaldo = 3 + (mostrarColCuenta?1:0) + (mostrarColAux?1:0) + 1 + 1;

  // resumen de filtros aplicados, para el modal de exportar
  const resumenFiltros: string[] = [];
  if (filtTipo.size)    resumenFiltros.push(`Tipo: ${[...filtTipo].map(v=>TIPO_OPTIONS.find(t=>t.value===v)?.label ?? v).join(', ')}`);
  if (filtOrigen.size)  resumenFiltros.push(`Módulo: ${[...filtOrigen].map(v=>MODULOS.find(m=>m.value===v)?.label ?? v).join(', ')}`);
  if (filtEstado.size)  resumenFiltros.push(`Estado: ${[...filtEstado].join(', ')}`);
  if (filtMoneda.size)  resumenFiltros.push(`Moneda: ${[...filtMoneda].join(', ')}`);
  if (filtUsuario.size) resumenFiltros.push(`Usuario: ${[...filtUsuario].join(', ')}`);
  if (filtFecha.from || filtFecha.to) resumenFiltros.push(`Fecha: ${filtFecha.from?filtFecha.from.split('-').reverse().join('/'):'…'} - ${filtFecha.to?filtFecha.to.split('-').reverse().join('/'):'…'}`);
  if (filtMinimo>0 || filtMaximo>0) resumenFiltros.push(`Importe: ${filtMinimo>0?fmt2(filtMinimo):'0'} – ${filtMaximo>0?fmt2(filtMaximo):'∞'}`);
  if (searchQ)  resumenFiltros.push(`Búsqueda: ${searchQ}`);
  if (cuentaSel) resumenFiltros.push(`Cuenta: ${cuentaSel.code}`);
  if (rangoSel)  resumenFiltros.push(`Rango: ${rangoSel.desde.code} – ${rangoSel.hasta.code}`);

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#F9F9F9' }}>

      {/* Header */}
      <PageHeader title="Analítico de cuentas" left={
        <>
          <CuentaFiltroUnico cuenta={cuentaSel} rango={rangoSel}
            onSelectCuenta={c=>{ setCuentaSel(c); setRangoSel(null); }}
            onSelectRango={r=>{ setRangoSel(r); setCuentaSel(null); }}
            onClear={()=>{ setCuentaSel(null); setRangoSel(null); }}/>
          {vistaGlobal && (
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:11.5, color:C.n700, fontFamily:F, whiteSpace:'nowrap' }}>Ver como:</span>
              {tipoLibroOpciones.map(o=>(
                <button key={o.value} title={o.desc} onClick={()=>setVista(o.value)}
                  style={{ height:28, padding:'0 10px', borderRadius:radius.sm, cursor:'pointer', fontSize:11.5, fontFamily:F, whiteSpace:'nowrap',
                    border:`1px solid ${vista===o.value?BRAND:C.n500}`, background:vista===o.value?C.brandBg:'#fff',
                    color:vista===o.value?BRAND:C.n700, fontWeight:vista===o.value?600:400 }}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
          {!tieneCuenta && !tieneRango && (
            <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:12, color:C.n700, fontFamily:F }}>
              <input type="checkbox" checked={mostrarNum} onChange={e=>setMostrarNum(e.target.checked)}
                style={{ width:14, height:14, accentColor:BRAND }}/>
              Mostrar número de cuenta
            </label>
          )}
        </>
      }>
        <button onClick={()=>setExportarOpen(true)} style={{ height:32, padding:'0 13px', border:`1px solid ${C.n500}`, borderRadius:radius.md,
          background:'#fff', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:6,
          color:C.n700, fontFamily:F }}>
          <IcPrint/> Exportar
        </button>
      </PageHeader>

      {/* Filtros */}
      <div style={{ background:'#fff', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px',
        display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap' }}>
        <SearchInput value={searchQ} onChange={setSearch} placeholder="Buscar por descripción, N° asiento, ID auxiliar o documento…" width={300} />
        <DateRangeFilter label="Fecha" value={filtFecha} onChange={setFiltFecha} onClear={()=>setFiltFecha({from:'',to:''})}/>
        <FilterDropdown label="Tipo de asiento" options={TIPO_OPTIONS.map(t=>({ value:t.value, label:t.label, icon:<TipoPill tipo={t.value}/> }))} selected={filtTipo}   onApply={setFiltTipo}   onClear={()=>setFiltTipo(new Set())}/>
        <FilterDropdown label="Módulo"  options={MODULOS}                                   selected={filtOrigen} onApply={setFiltOrigen} onClear={()=>setFiltOrigen(new Set())}/>
        <RangoImporteFilter minimo={filtMinimo} maximo={filtMaximo} onApply={(mn,mx)=>{ setFiltMin(mn); setFiltMax(mx); }} onClear={()=>{ setFiltMin(0); setFiltMax(0); }}/>
        <FilterDropdown label="Estado"  options={['Contabilizado','Pendiente']}                selected={filtEstado} onApply={setFiltEstado} onClear={()=>setFiltEstado(new Set())}/>
        <FilterDropdown label="Moneda"  options={['CRC','USD']}                             selected={filtMoneda} onApply={setFiltMoneda} onClear={()=>setFiltMoneda(new Set())}/>
        <FilterDropdown label="Usuario" options={['jperez','sblandon','yader','glopez']}   selected={filtUsuario} onApply={setFiltUsuario} onClear={()=>setFiltUsuario(new Set())}/>
        {(filtTipo.size+filtOrigen.size+filtEstado.size+filtMoneda.size+(filtFecha.from?1:0)+filtUsuario.size+(searchQ?1:0)+(cuentaSel?1:0)+(rangoSel?1:0))>0 && (
          <button onClick={()=>{ setFiltTipo(new Set()); setFiltOrigen(new Set()); setFiltEstado(new Set()); setFiltMoneda(new Set()); setFiltFecha({from:'',to:''}); setFiltMin(0); setFiltMax(0); setFiltUsuario(new Set()); setSearch(''); setCuentaSel(null); setRangoSel(null); }}
            style={{ height:28, padding:'0 10px', border:'none', background:C.errorBg, color:C.error, borderRadius:radius.sm, cursor:'pointer', fontSize:11, fontFamily:F }}>
            × Limpiar
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto', background:'#fff' }}>

        {/* Encabezado de cuenta - solo cuando hay cuenta seleccionada */}
        {tieneCuenta && cuentaSel && (
          <div style={{ padding:'12px 24px', borderBottom:`1px solid ${C.n500}`,
            background:C.brandBg, display:'flex', gap:32, alignItems:'flex-start', flexShrink:0 }}>
            <div>
              <p style={{ fontSize:10, color:C.n700, textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 2px', fontFamily:F }}>CUENTA</p>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:13, fontWeight:700, color:BRAND, fontFamily:F }}>{cuentaSel.code}</span>
                {cuentaSel.banco && <span style={{ fontSize:12, color:'#0F0F0F', fontFamily:F }}>{cuentaSel.banco}</span>}
                <span style={{ fontSize:10, padding:'1px 7px', borderRadius:radius.lg, background:esAuxiliar?'rgba(91,33,182,.1)':C.n200,
                  color:esAuxiliar?'#5B21B6':C.n700, fontFamily:F, fontWeight:500 }}>
                  {esAuxiliar ? 'Auxiliar' : 'Detalle'}
                </span>
              </div>
            </div>
            <div>
              <p style={{ fontSize:10, color:C.n700, textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 2px', fontFamily:F }}>Período</p>
              <p style={{ fontSize:12, color:'#0F0F0F', margin:0, fontFamily:F }}>00/00/000 - 00/00/000</p>
            </div>
            <div>
              <p style={{ fontSize:10, color:C.n700, textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 2px', fontFamily:F }}>Moneda</p>
              <p style={{ fontSize:12, color:'#0F0F0F', margin:0, fontFamily:F }}>{cuentaSel.moneda} {sym}</p>
            </div>
            <div>
              <p style={{ fontSize:10, color:C.n700, textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 2px', fontFamily:F }}>Saldo inicial</p>
              <p style={{ fontSize:12, color:'#0F0F0F', margin:0, fontFamily:F, fontWeight:600 }}>{sym} {fmt2(saldoInicial)}</p>
            </div>
            <button onClick={()=>setCuentaSel(null)}
              style={{ marginLeft:'auto', height:30, padding:'0 12px', border:`1px solid ${C.brandBd}`, borderRadius:7,
                background:'#fff', cursor:'pointer', fontSize:11, color:BRAND, fontFamily:F }}>
              × Todas las cuentas
            </button>
          </div>
        )}

        {/* Barra de acciones masivas - mismo estilo oscuro que Bandeja de asientos */}
        {selectedCount > 0 && (
          <div style={{ background:'#2D2A00', padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <span style={{ fontSize:12, color:'#fff', fontWeight:500, fontFamily:F }}>
              {selectedCount} asiento{selectedCount===1?'':'s'} seleccionado{selectedCount===1?'':'s'}
            </span>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setConfirmDesmayMasivo(true)}
                style={{ height:30, padding:'0 12px', border:'none', borderRadius:radius.sm, background:BRAND, color:'#fff',
                  cursor:'pointer', fontSize:11, fontWeight:500, fontFamily:F }}>
                Descontabilizar
              </button>
              <button onClick={()=>setSelected(new Set())}
                style={{ height:30, padding:'0 12px', border:'1px solid rgba(255,255,255,.3)', borderRadius:radius.sm, background:'transparent',
                  color:'#fff', cursor:'pointer', fontSize:11, fontFamily:F }}>
                Limpiar selección
              </button>
            </div>
          </div>
        )}

        {/* Tabla */}
        {filasResumenVista ? (
          <div style={{ padding:'0 24px 24px' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
              <thead style={{ position:'sticky', top:0, zIndex:2, background:'#fff' }}>
                <tr style={{ borderBottom:`2px solid ${C.n500}` }}>
                  {[vistaActiva==='porLibro'?'Cuenta y libro':'Cuenta','Asientos','Debe','Haber'].map((h,i)=>(
                    <th key={h} style={{ padding:'10px 12px', textAlign:i>=2?'right':'left', fontWeight:500, color:C.n700, fontSize:11, fontFamily:F }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filasResumenVista.length===0 ? (
                  <tr><td colSpan={4} style={{ padding:30, textAlign:'center', color:C.n700, fontSize:12 }}>{cargandoMov ? 'Cargando movimientos…' : 'Sin movimientos para los filtros seleccionados.'}</td></tr>
                ) : filasResumenVista.map(f=>(
                  <tr key={f.clave} style={{ borderBottom:'1px solid #F0F0F0' }}>
                    <td style={{ padding:'8px 12px', color:BRAND, fontFamily:F }}>{f.etiqueta}</td>
                    <td style={{ padding:'8px 12px', fontFamily:F }}>{f.cantidad}</td>
                    <td style={{ padding:'8px 12px', textAlign:'right', fontFamily:F, whiteSpace:'nowrap' }}>{f.debe>0?`${sym} ${fmt2(f.debe)}`:'-'}</td>
                    <td style={{ padding:'8px 12px', textAlign:'right', fontFamily:F, whiteSpace:'nowrap' }}>{f.haber>0?`${sym} ${fmt2(f.haber)}`:'-'}</td>
                  </tr>
                ))}
              </tbody>
              {filasResumenVista.length > 0 && (
                <tfoot>
                  <tr style={{ background:'#F8F8F8', borderTop:`2px solid ${C.n500}` }}>
                    <td colSpan={2} style={{ padding:'9px 12px', fontWeight:600, fontFamily:F }}>Totales</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', fontWeight:700, fontFamily:F, whiteSpace:'nowrap' }}>{sym} {fmt2(totalDebe)}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', fontWeight:700, fontFamily:F, whiteSpace:'nowrap' }}>{sym} {fmt2(totalHaber)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
        <div style={{ padding:'0 24px' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
          <thead style={{ position:'sticky', top:0, zIndex:2, background:'#fff' }}>
            <tr style={{ borderBottom:`1px solid ${C.n500}` }}>
              <th style={{ width:36, padding:'10px 12px' }}>
                <input type="checkbox" checked={allSelected} disabled={selectableIds.length===0} onChange={toggleSelectAll}
                  style={{ width:13, height:13, accentColor:BRAND, cursor:selectableIds.length===0?'default':'pointer' }}/>
              </th>
              <th style={thStyle}>Tipo</th>
              <th style={thStyle}>Fecha</th>
              <th style={thStyle}>N° Asiento</th>
              <th style={thStyle}>Descripción</th>
              <th style={thStyle}>Estado</th>
              {/* Columna Cuenta: solo escenario A con mostrarNum */}
              {mostrarColCuenta && <th style={thStyle}>Cuenta</th>}
              {/* Columna ID Auxiliar: solo escenario B (detalle) */}
              {mostrarColAux    && <th style={thStyle}>ID Auxiliar</th>}
              <th style={thStyle}>Módulo</th>
              <th style={thStyle}>Doc.</th>
              <th style={thR}>Debe</th>
              <th style={thR}>Haber</th>
              <th style={{ width:130 }}/>
            </tr>
          </thead>
          <tbody>

            {movsFiltrados.length === 0 ? (
              <tr>
                <td colSpan={10 + (mostrarColCuenta?1:0) + (mostrarColAux?1:0)}
                  style={{ padding:'40px', textAlign:'center', color:C.n700, fontSize:12, fontFamily:F }}>
                  {tieneCuenta
                    ? 'Sin movimientos en esta cuenta para el período seleccionado.'
                    : 'Sin movimientos para los filtros seleccionados.'}
                </td>
              </tr>
            ) : (
              movsPagina.map((m, idx) => {
                const msym = m.moneda === 'USD' ? '$' : '₡';
                const zebra = idx % 2 === 1 ? '#FCFCFA' : '#fff';
                return (
                  <tr key={m.id} style={{ borderBottom:`1px solid #F5F5F5`, cursor:'pointer', background:zebra }}
                    onClick={()=>setDetalleAsiento(m)}
                    onMouseEnter={e=>(e.currentTarget.style.background=C.n200)}
                    onMouseLeave={e=>(e.currentTarget.style.background=zebra)}>
                    <td style={{ padding:'8px 12px' }} onClick={e=>e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(m.id)} disabled={m.estado!=='Contabilizado'} onChange={()=>toggleSelected(m.id)}
                        style={{ width:13, height:13, accentColor:BRAND, cursor:m.estado!=='Contabilizado'?'default':'pointer', opacity:m.estado!=='Contabilizado'?.35:1 }}/>
                    </td>
                    <td style={{ padding:'8px 12px' }}><TipoPill tipo={m.tipo}/></td>
                    <td style={{ padding:'8px 12px', color:'#0F0F0F', whiteSpace:'nowrap', fontFamily:F }}>
                      {m.fecha.split('-').reverse().join('/')}
                    </td>
                    <td style={{ padding:'8px 12px' }}>
                      <button onClick={e=>{e.stopPropagation();setDetalleAsiento(m);}} style={{ color:BRAND, fontFamily:F, fontSize:12, fontWeight:500, textDecoration:'underline', textUnderlineOffset:2, background:'none', border:'none', cursor:'pointer', padding:0 }}>{m.consecutivo}</button>
                    </td>
                    <td style={{ padding:'8px 12px', maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:F }}>{m.descripcion}</td>
                    <td style={{ padding:'8px 12px' }}><EstadoBadge estado={m.estado}/></td>

                    {/* Cuenta - solo escenario A con mostrarNum */}
                    {mostrarColCuenta && (
                      <td style={{ padding:'8px 12px' }}>
                        <span style={{ color:BRAND, fontFamily:F, fontSize:11, fontWeight:600 }}>{m.cuentaCode}</span>
                      </td>
                    )}
                    {/* ID Auxiliar - solo escenario B */}
                    {mostrarColAux && (
                      <td style={{ padding:'8px 12px', fontSize:11, color:C.n700, fontFamily:F }}>
                        {m.idAuxiliar || '-'}
                      </td>
                    )}
                    <td style={{ padding:'8px 12px', fontSize:11, color:C.n700, fontFamily:F }}>{m.modulo}</td>
                    <td style={{ padding:'8px 12px', fontSize:11, color:C.n700, fontFamily:F }}>{m.documento}</td>
                    <td style={{ padding:'8px 12px', textAlign:'right', whiteSpace:'nowrap' }}>
                      {m.debe > 0
                        ? <><span style={{ color:C.n700, marginRight:3, fontFamily:F }}>{msym}</span><span style={{ fontWeight:500, fontFamily:F }}>{fmt2(m.debe)}</span></>
                        : <span style={{ color:C.n500, fontFamily:F }}>-</span>}
                    </td>
                    <td style={{ padding:'8px 12px', textAlign:'right', whiteSpace:'nowrap' }}>
                      {m.haber > 0
                        ? <><span style={{ color:C.n700, marginRight:3, fontFamily:F }}>{msym}</span><span style={{ fontWeight:500, fontFamily:F }}>{fmt2(m.haber)}</span></>
                        : <span style={{ color:C.n500, fontFamily:F }}>-</span>}
                    </td>
                    <td style={{ padding:'6px 8px' }}><ActionIcons mov={m} onDescontabilizar={setConfirmDesmay}/></td>
                  </tr>
                );
              })
            )}

            {/* Totalizado siempre visible, con o sin cuenta seleccionada */}
            <TotalizadoRow sym={sym} totalDebe={totalDebe} totalHaber={totalHaber}
              colSpan={6} mostrarColAux={mostrarColAux} mostrarColCuenta={mostrarColCuenta}/>

            {tieneCuenta && (
              <SaldoRow label="Saldo final" sym={sym} valor={saldoFinal}
                colSpan={6} mostrarColAux={mostrarColAux} mostrarColCuenta={mostrarColCuenta}/>
            )}
          </tbody>
        </table>
        </div>
        )}
      </div>

      {/* Footer - la paginación solo aplica a la vista detalle; los consolidados
          (resumen / por libro) se muestran completos en una sola tabla. */}
      {!filasResumenVista && (
        <div style={{ background:'#fff', borderTop:`1px solid ${C.n500}`, padding:'8px 24px', flexShrink:0 }}>
          <Pagination page={paginaActual} pageSize={pageSize} total={movsFiltrados.length} onPageChange={setPage} onPageSizeChange={setPageSize}/>
        </div>
      )}


      {detalleAsiento && (
        <DetalleDrawer
          asiento={{
            id: detalleAsiento.id,
            tipo: detalleAsiento.tipo,
            origen: detalleAsiento.modulo,
            fecha: detalleAsiento.fecha,
            consecutivo: detalleAsiento.consecutivo,
            titulo: detalleAsiento.descripcion,
            moneda: detalleAsiento.moneda as 'CRC'|'USD',
            importe: detalleAsiento.debe || detalleAsiento.haber,
            usuario: 'sistema',
            documento: detalleAsiento.documento,
            observacion: detalleAsiento.observacion ?? '',
            contabilizado: detalleAsiento.estado === 'Contabilizado',
            archivos: detalleAsiento.archivos ?? [],
            historial: detalleAsiento.historial ?? [],
            conciliacion: detalleAsiento.conciliacion ?? null,
            lineas: [
              { id:1, cuenta:detalleAsiento.cuentaCode, descripcion:detalleAsiento.descripcion, cCostos:'-', debe:detalleAsiento.debe, haber:0 },
              { id:2, cuenta:'400-010-0001', descripcion:'Contrapartida', cCostos:'-', debe:0, haber:detalleAsiento.debe },
            ],
          }}
          onClose={()=>setDetalleAsiento(null)}
          onAnular={()=>{}}
          onDuplicar={()=>{}}
          tienePermisoDescontabilizar={PERMISOS_ACTUAL.descontabilizarAsientos}
          onContabilizar={(payload)=>{
            // La confirmación (motivo, desconciliar, permisos) ya ocurrió dentro del propio drawer.
            if (detalleAsiento.estado === 'Contabilizado') {
              setMovimientos(p => p.map(x => x.id === detalleAsiento.id ? { ...x, estado:'Pendiente' as EstadoMov,
                historial:[...(x.historial??[]), { color:'#EF9F27', texto:`Descontabilizado${payload?.desconciliar?' y desconciliado':''} - ${payload?.motivo ?? ''}`, fecha:new Date().toLocaleString('es-CR'), usuario:'usuario actual' }] } : x));
            } else {
              setMovimientos(p => p.map(x => x.id === detalleAsiento.id ? { ...x, estado:'Contabilizado' as EstadoMov } : x));
            }
            setDetalleAsiento(null);
          }}
        />
      )}
      {/* Modal descontabilizar - disparado desde el ícono de la fila (ActionIcons) */}
      {confirmDesmay && (
        <ModalDescontabilizar
          consecutivo={confirmDesmay.consecutivo}
          titulo={confirmDesmay.descripcion}
          conciliacion={confirmDesmay.conciliacion}
          tienePermiso={PERMISOS_ACTUAL.descontabilizarAsientos}
          onClose={() => setConfirmDesmay(null)}
          onConfirm={({ motivo, desconciliar }) => {
            setMovimientos(p => p.map(m => m.id === confirmDesmay.id ? { ...m, estado:'Pendiente' as EstadoMov,
              historial:[...(m.historial??[]), { color:'#EF9F27', texto:`Descontabilizado${desconciliar?' y desconciliado':''} - ${motivo}`, fecha:new Date().toLocaleString('es-CR'), usuario:'usuario actual' }] } : m));
            setConfirmDesmay(null);
          }}
        />
      )}
      {/* Modal confirmación descontabilización masiva */}
      {confirmDesmayMasivo && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:600,
          display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => setConfirmDesmayMasivo(false)}>
          <div style={{ background:'#fff', borderRadius:radius.lg, width:420, boxShadow:shadow.modal, fontFamily:F }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.n500}` }}>
              <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Confirmar descontabilización masiva</p>
            </div>
            <div style={{ padding:'18px 20px' }}>
              <div style={{ display:'flex', gap:10, padding:'12px 14px', background:'#FFF8EC', border:`1px solid ${C.brandBd}`, borderRadius:radius.md }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={BRAND} strokeWidth="1.4" style={{ flexShrink:0, marginTop:1 }}><circle cx="8" cy="8" r="6.33"/><path d="M8 5.33v2.34M8 10h.01" strokeLinecap="round"/></svg>
                <p style={{ fontSize:12, color:'#7a5c00', margin:0, lineHeight:1.5 }}>
                  Los <strong>{selectedCount}</strong> asientos seleccionados regresarán a estado <strong>Pendiente</strong> y quedarán disponibles para modificación o anulación. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button onClick={() => setConfirmDesmayMasivo(false)}
                style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>
                Cancelar
              </button>
              <button onClick={() => {
                  setMovimientos(p => p.map(m => selected.has(m.id) ? { ...m, estado:'Pendiente' } : m));
                  setSelected(new Set());
                  setConfirmDesmayMasivo(false);
                }}
                style={{ height:34, padding:'0 14px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>
                Confirmar descontabilización
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal exportar analítico */}
      {exportarOpen && (
        <ModalExportarAnalitico
          rows={movsFiltrados}
          filasResumen={filasResumenVista}
          tipoActivo={vistaActiva}
          cuentaLabel={cuentaSel ? cuentaSel.code : (rangoSel ? `${rangoSel.desde.code} – ${rangoSel.hasta.code}` : null)}
          saldoInicial={tieneCuenta ? saldoInicial : null}
          saldoFinal={tieneCuenta ? saldoFinal : null}
          sym={sym}
          filtrosResumen={resumenFiltros}
          onClose={()=>setExportarOpen(false)}
        />
      )}
    </div>
  );
}
