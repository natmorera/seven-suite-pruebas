'use client';
import { C, FONT } from '../../../ui/tokens';
import { fmtNum } from '../../../ui/formato';
import { ConciliacionAfectada } from '../DescontabilizarModal';

export const F = FONT;
export const BRAND = C.brand;
export function fmt2(n: number) { return fmtNum(n, 2); }
export function genConsecutivo(fecha: string, todos: Asiento[]) {
  const [y, m] = fecha.split('-');
  const prefix = `${y}${m.padStart(2, '0')}`;
  const existing = todos.filter(a => a.consecutivo.startsWith(prefix)).map(a => parseInt(a.consecutivo.slice(6)) || 0);
  const next = (existing.length ? Math.max(...existing) : 0) + 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}
// ── Types ──────────────────────────────────────────────────────────────────────
export type TipoAsiento = 'A' | 'M' | 'I' | 'D' | 'P';
export type Moneda = 'CRC' | 'USD';
export interface LineaAsiento { id: number; cuenta: string; descripcion: string; cCostos: string; debe: number; haber: number; }
export interface Asiento {
  id: number; tipo: TipoAsiento; origen: string; fecha: string; consecutivo: string;
  titulo: string; moneda: Moneda; importe: number; usuario: string; documento: string;
  observacion: string; contabilizado: boolean; lineas: LineaAsiento[];
  archivos?: string[]; historial?: { color: string; texto: string; fecha: string; usuario: string }[];
  motivoAnulacion?: string;
  conciliacion?: ConciliacionAfectada | null;
}
// ── Constants ──────────────────────────────────────────────────────────────────
export const TIPOS_LABEL: Record<TipoAsiento, string> = { A:'Automático', M:'Manual', I:'Importado', D:'Duplicado', P:'Plantilla' };
export const TIPO_BG:    Record<TipoAsiento, string>  = { A:'#3B82F6', M:'#A77600', I:'#7C3AED', D:'#6B7280', P:'#059669' };
export const MON_SYM:    Record<Moneda, string>        = { CRC:'₡', USD:'$' };
export const ORIGENES = ['FrontDesk','Accounting','Inventario','Activos fijos','POS'];
export const USUARIOS = ['jperez','sblandon','yader','glopez'];
export const MONEDAS: Moneda[] = ['CRC','USD'];
// ── Cuentas disponibles para las líneas del asiento (código + nombre + grupo NIIF) ──
export const CUENTAS_LINEA: { code:string; nombre:string; grupo:string }[] = [
  { code:'100-001-0001', nombre:'Fondo de caja general',        grupo:'1' },
  { code:'100-002-0001', nombre:'BAC ¢ 4546545466888',          grupo:'1' },
  { code:'100-003-0001', nombre:'BAC $ 4563212454587',          grupo:'1' },
  { code:'120-001-0001', nombre:'Inventario general almacén',   grupo:'1' },
  { code:'120-010-0001', nombre:'Inventario de suministros',    grupo:'1' },
  { code:'140-010-0001', nombre:'Cuentas por cobrar diversas',  grupo:'1' },
  { code:'200-001-0001', nombre:'Proveedores nacionales',       grupo:'2' },
  { code:'200-002-0001', nombre:'Depreciación acumulada',       grupo:'2' },
  { code:'300-000-0001', nombre:'Capital social',               grupo:'3' },
  { code:'400-001-0001', nombre:'Habitaciones estándar',        grupo:'4' },
  { code:'400-010-0001', nombre:'Ingresos varios de operación', grupo:'4' },
  { code:'500-010-0001', nombre:'Gastos operativos generales',  grupo:'5' },
  { code:'500-020-0001', nombre:'Ajustes de inventario',        grupo:'5' },
  { code:'600-001-0001', nombre:'Sueldos y salarios',           grupo:'6' },
  { code:'600-002-0004', nombre:'Seguros',                      grupo:'6' },
  { code:'600-030-0001', nombre:'Gasto por depreciación',       grupo:'6' },
];
export const ASIENTOS_INIT: Asiento[] = [
  { id:1, tipo:'A', origen:'FrontDesk', fecha:'2026-02-15', consecutivo:'20260200001',
    titulo:'Ingresos de producción del día', moneda:'USD', importe:14309.10,
    usuario:'jperez', documento:'FE0002093', observacion:'Movimientos automáticos del día de Front Desk.',
    contabilizado:false, archivos:['factura-001.pdf','detalle.xlsx'],
    historial:[
      { color:C.success, texto:'Asiento creado desde FrontDesk', fecha:'15/02/2026 08:14', usuario:'sistema' },
      { color:C.error, texto:'Contabilización fallida - desbalanceado (₡ 0.12)', fecha:'15/02/2026 10:32', usuario:'jperez' },
      { color:C.success, texto:'Línea 100-002-0001 corregida a ₡ 467,779.00', fecha:'15/02/2026 11:05', usuario:'jperez' },
      { color:'#EF9F27', texto:'Observación editada', fecha:'16/02/2026 09:22', usuario:'sblandon' },
      { color:C.success, texto:'Adjunto: factura-001.pdf', fecha:'17/02/2026 08:50', usuario:'yader' },
    ],
    lineas:[
      { id:1, cuenta:'100-002-0001', descripcion:'Depósito adelantado',  cCostos:'',    debe:50000.12,  haber:0 },
      { id:2, cuenta:'100-002-0001', descripcion:'Depósito en efectivo', cCostos:'',    debe:417778.88, haber:0 },
      { id:3, cuenta:'400-010-0001', descripcion:'Ingresos del día',     cCostos:'',    debe:0, haber:467779.00 },
      { id:4, cuenta:'400-010-0001', descripcion:'Ingresos hospedaje',   cCostos:'10002',debe:28000.00, haber:0 },
      { id:5, cuenta:'200-001-0001', descripcion:'Pago proveedor',       cCostos:'',    debe:0, haber:28000.00 },
      { id:6, cuenta:'500-010-0001', descripcion:'Gasto operativo',      cCostos:'ADM', debe:9800.00, haber:0 },
      { id:7, cuenta:'100-001-0001', descripcion:'Caja chica',           cCostos:'ADM', debe:0, haber:9800.00 },
    ],
  },
  { id:2, tipo:'M', origen:'Accounting', fecha:'2026-02-15', consecutivo:'20260200002',
    titulo:'Registro de póliza de incendios', moneda:'CRC', importe:450000,
    usuario:'sblandon', documento:'FE0000001', observacion:'Póliza anual contra incendios de la propiedad principal, vigencia 15/02/2026 a 14/02/2027.',
    contabilizado:false, archivos:['poliza-incendios-2026.pdf'],
    conciliacion:{ id:'BAC-CRC-ABR26', detalle:'BAC ¢ 4546545466888 · Abril 2026' },
    historial:[
      { color:C.success, texto:'Asiento creado manualmente', fecha:'15/02/2026 09:05', usuario:'sblandon' },
      { color:C.success, texto:'Adjunto: poliza-incendios-2026.pdf', fecha:'15/02/2026 09:07', usuario:'sblandon' },
    ],
    lineas:[{ id:1, cuenta:'600-002-0004', descripcion:'Seguro incendio', cCostos:'', debe:450000, haber:0 },{ id:2, cuenta:'200-001-0001', descripcion:'Por pagar', cCostos:'', debe:0, haber:450000 }] },
  { id:3, tipo:'I', origen:'Accounting', fecha:'2026-02-15', consecutivo:'20260200025',
    titulo:'Importación saldo de clientes', moneda:'CRC', importe:1450000,
    usuario:'yader', documento:'IMP001', observacion:'Carga de saldos iniciales de clientes desde el sistema anterior, archivo IMP001.',
    contabilizado:false, archivos:['saldos-clientes-imp001.xlsx'],
    historial:[
      { color:C.success, texto:'Asiento importado desde archivo IMP001.xlsx', fecha:'15/02/2026 07:40', usuario:'yader' },
      { color:C.success, texto:'Validación de saldos completada sin errores', fecha:'15/02/2026 07:41', usuario:'sistema' },
    ],
    lineas:[{ id:1, cuenta:'100-002-0001', descripcion:'Saldo importado', cCostos:'', debe:1450000, haber:0 },{ id:2, cuenta:'300-000-0001', descripcion:'Apertura', cCostos:'', debe:0, haber:1450000 }] },
  { id:4, tipo:'D', origen:'Accounting', fecha:'2026-02-15', consecutivo:'20260200030',
    titulo:'(Dup. 20260200001) Ingresos de producción del día', moneda:'USD', importe:14309.10,
    usuario:'yader', documento:'FE0002093', observacion:'Duplicado del asiento 20260200001 para revisión de diferencial cambiario.',
    contabilizado:false, archivos:[],
    historial:[
      { color:'#6B7280', texto:'Duplicado a partir de 20260200001', fecha:'15/02/2026 14:12', usuario:'yader' },
    ],
    lineas:[
      { id:1, cuenta:'100-002-0001', descripcion:'Depósito adelantado (revisión)', cCostos:'', debe:14309.10, haber:0 },
      { id:2, cuenta:'400-010-0001', descripcion:'Ingresos del día (revisión)',    cCostos:'', debe:0, haber:14309.10 },
    ] },
  { id:5, tipo:'A', origen:'Inventario', fecha:'2026-02-15', consecutivo:'20260200032',
    titulo:'Ajuste inventario almacén principal', moneda:'CRC', importe:88500,
    usuario:'glopez', documento:'AJ-001', observacion:'Ajuste por diferencia de conteo físico vs. sistema en el almacén principal.',
    contabilizado:false, archivos:['conteo-fisico-feb2026.xlsx'],
    historial:[
      { color:C.success, texto:'Asiento generado automáticamente desde Inventario', fecha:'15/02/2026 18:00', usuario:'sistema' },
      { color:'#EF9F27', texto:'Adjunto conteo físico agregado', fecha:'15/02/2026 18:03', usuario:'glopez' },
    ],
    lineas:[
      { id:1, cuenta:'500-020-0001', descripcion:'Ajuste por faltante de inventario', cCostos:'ADM', debe:88500, haber:0 },
      { id:2, cuenta:'120-001-0001', descripcion:'Inventario general almacén',        cCostos:'',    debe:0, haber:88500 },
    ] },
  { id:6, tipo:'A', origen:'Activos fijos', fecha:'2026-02-15', consecutivo:'20260200033',
    titulo:'Depreciación mensual activos fijos', moneda:'CRC', importe:210000,
    usuario:'glopez', documento:'', observacion:'Depreciación mensual calculada automáticamente sobre el catálogo de activos fijos vigente.',
    contabilizado:false, archivos:[],
    historial:[
      { color:C.success, texto:'Asiento generado automáticamente desde Activos fijos', fecha:'15/02/2026 23:50', usuario:'sistema' },
    ],
    lineas:[
      { id:1, cuenta:'600-030-0001', descripcion:'Gasto por depreciación',       cCostos:'ADM', debe:210000, haber:0 },
      { id:2, cuenta:'200-002-0001', descripcion:'Depreciación acumulada',      cCostos:'',    debe:0, haber:210000 },
    ] },
];
export const ANULADOS_INIT: Asiento[] = [
  { id:99, tipo:'M', origen:'Accounting', fecha:'2026-02-15', consecutivo:'20260200000',
    titulo:'Asiento de prueba eliminado', moneda:'CRC', importe:5000,
    usuario:'sblandon', documento:'', observacion:'Movimientos automáticos.',
    motivoAnulacion:'Error en cuenta contable asignada. Se re-registró con 100-002-0001.',
    contabilizado:false, archivos:['factura-001.pdf'],
    historial:[
      { color:C.success, texto:'Asiento creado manualmente', fecha:'15/02/2026 08:00', usuario:'sblandon' },
      { color:C.error, texto:'Asiento anulado - error en cuenta contable asignada', fecha:'15/02/2026 08:20', usuario:'sblandon' },
    ],
    lineas:[{ id:1, cuenta:'100-002-0001', descripcion:'Dep. adelantado', cCostos:'', debe:50000, haber:0 }] },
];
export interface Programado { id:string; nombre:string; frecuencia:string; proxima:string; moneda:Moneda; activo:boolean; }
export const PROGRAMADOS_INIT: Programado[] = [
  { id:'p1', nombre:'Depreciación mensual activos', frecuencia:'Mensual',   proxima:'15/02/2026', moneda:'CRC', activo:true },
  { id:'p2', nombre:'Amortización préstamo BAC',    frecuencia:'Mensual',   proxima:'15/02/2026', moneda:'CRC', activo:true },
  { id:'p3', nombre:'Reserva de vacaciones',        frecuencia:'Quincenal', proxima:'15/02/2026', moneda:'CRC', activo:false },
];
export interface Plantilla { id:string; nombre:string; cuentas:number; moneda:Moneda; ultima:string; lineas:LineaAsiento[]; }
export const PLANTILLAS_INIT: Plantilla[] = [
  { id:'t1', nombre:'Nómina mensual', cuentas:3, moneda:'CRC', ultima:'31/01/2026', lineas:[
    { id:1, cuenta:'600-001-0001', descripcion:'Sueldos y salarios',      cCostos:'ADM', debe:1200000, haber:0 },
    { id:2, cuenta:'600-002-0004', descripcion:'Seguros sobre planilla',  cCostos:'ADM', debe:85000,   haber:0 },
    { id:3, cuenta:'100-002-0001', descripcion:'Pago de planilla',        cCostos:'',    debe:0,       haber:1285000 },
  ] },
  { id:'t2', nombre:'Cierre mensual IVA', cuentas:3, moneda:'CRC', ultima:'31/01/2026', lineas:[
    { id:1, cuenta:'400-010-0001', descripcion:'Ventas gravadas',   cCostos:'', debe:0,      haber:250000 },
    { id:2, cuenta:'200-001-0001', descripcion:'IVA por pagar',     cCostos:'', debe:0,      haber:32500 },
    { id:3, cuenta:'100-002-0001', descripcion:'Liquidación de IVA',cCostos:'', debe:282500, haber:0 },
  ] },
  { id:'t3', nombre:'Ajuste inventario', cuentas:2, moneda:'CRC', ultima:'28/01/2026', lineas:[
    { id:1, cuenta:'500-020-0001', descripcion:'Ajuste por faltante de inventario', cCostos:'ADM', debe:45000, haber:0 },
    { id:2, cuenta:'120-001-0001', descripcion:'Inventario general almacén',        cCostos:'',    debe:0,     haber:45000 },
  ] },
];
export const COLS_DEF = [
  { id:'tipo',       label:'Tipo',            fija:true,  visible:true  },
  { id:'origen',     label:'Origen',          fija:false, visible:true  },
  { id:'fecha',      label:'Fecha',           fija:true,  visible:true  },
  { id:'consecutivo',label:'N.º Asiento',     fija:true,  visible:true  },
  { id:'titulo',     label:'Título',          fija:false, visible:true  },
  { id:'moneda',     label:'Moneda',          fija:false, visible:true  },
  { id:'importe',    label:'Importe',         fija:false, visible:true  },
  { id:'usuario',    label:'Usuario',         fija:false, visible:true  },
  { id:'documento',  label:'Documento',       fija:false, visible:false },
  { id:'observacion',label:'Observación',     fija:false, visible:false },
];
export const ORIGEN_COLORS: Record<string,string> = {
  FrontDesk:'#3B82F6', Accounting:C.success, Inventario:'#EF9F27', 'Activos fijos':'#7C3AED', POS:C.error,
};
// ── Date range filter ──────────────────────────────────────────────────────────
export type DateRange = { from:string; to:string };
export function toISO(d: Date) { const p=(n:number)=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
export const MES_CORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
export function fmtDMY(iso: string) { if(!iso) return ''; const [y,m,d]=iso.split('-'); return `${d} ${MES_CORTO[parseInt(m,10)-1]} ${y}`; }
export const FECHA_PRESETS: { id:string; label:string }[] = [
  { id:'hoy',        label:'Hoy' },
  { id:'semana',     label:'Esta semana' },
  { id:'mes',        label:'Este mes' },
  { id:'mesAnt',     label:'Mes anterior' },
  { id:'trimestre',  label:'Este trimestre' },
  { id:'anio',       label:'Este año' },
];
export function computeFechaPreset(id: string): DateRange {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  switch (id) {
    case 'hoy': { const iso = toISO(now); return { from:iso, to:iso }; }
    case 'semana': {
      const day = now.getDay();
      const diffToMonday = day===0 ? -6 : 1-day;
      return { from:toISO(new Date(y,m,d+diffToMonday)), to:toISO(new Date(y,m,d+diffToMonday+6)) };
    }
    case 'mes':       return { from:toISO(new Date(y,m,1)), to:toISO(new Date(y,m+1,0)) };
    case 'mesAnt':    return { from:toISO(new Date(y,m-1,1)), to:toISO(new Date(y,m,0)) };
    case 'trimestre': { const q=Math.floor(m/3); return { from:toISO(new Date(y,q*3,1)), to:toISO(new Date(y,q*3+3,0)) }; }
    case 'anio':      return { from:toISO(new Date(y,0,1)), to:toISO(new Date(y,11,31)) };
    default:          return { from:'', to:'' };
  }
}
export function detectFechaPreset(v: DateRange): string|null {
  if (!v.from || !v.to) return null;
  for (const p of FECHA_PRESETS) { const r = computeFechaPreset(p.id); if (r.from===v.from && r.to===v.to) return p.id; }
  return null;
}
// ── Importe range filter ───────────────────────────────────────────────────────
export interface ImporteRange { moneda: Moneda; min: number; max: number }
export const IMPORTE_MAX = 2000000;
export const IMPORTE_DEFAULT: ImporteRange = { moneda:'CRC', min:0, max:IMPORTE_MAX };
export function fmtInt(n: number) { return Math.round(n).toLocaleString('en-US'); }
// ── Toast ──────────────────────────────────────────────────────────────────────
export type ToastType = 'success'|'error'|'info'|'warning';
// Consolida las líneas de un asiento sumando por cuenta + centro de costos -
// no cambia el asiento real (sigue detallado en el origen), solo cómo se ve.
export function consolidarLineas(lineas: LineaAsiento[]): LineaAsiento[] {
  const mapa = new Map<string, LineaAsiento & { n: number }>();
  lineas.forEach(l => {
    const clave = `${l.cuenta}__${l.cCostos || ''}`;
    const existente = mapa.get(clave);
    if (existente) {
      existente.debe += l.debe; existente.haber += l.haber; existente.n += 1;
    } else {
      mapa.set(clave, { ...l, n:1 });
    }
  });
  return [...mapa.values()].map(l => ({ ...l, descripcion: l.n > 1 ? `${l.descripcion} (+${l.n-1} línea${l.n-1===1?'':'s'})` : l.descripcion }));
}
// ── Input de monto - decimales fijos (2 por defecto) y separador de miles con coma
// (Debe/Haber de las líneas usan 2; Tasa usa 5, convención de tipo de cambio CR) ──
export function fmtMontoDisplay(n: number, decimals: number = 2): string {
  if (!n) return '';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
export function parseMontoInput(raw: string): number {
  const n = parseFloat(raw.replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}
export function formatMontoTyping(raw: string, decimals: number = 2): string {
  let s = raw.replace(/[^\d.]/g, '');
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  const [intRaw, decRaw] = s.split('.');
  const intPart = intRaw ? Number(intRaw).toLocaleString('en-US') : '';
  return decRaw !== undefined ? `${intPart}.${decRaw.slice(0, decimals)}` : intPart;
}
// ── Crear asiento form ─────────────────────────────────────────────────────────
export interface CrearAsientoInitial { titulo:string; moneda:Moneda; lineas:LineaAsiento[]; origen?:string; documento?:string; observacion?:string; duplicadoDe?:string; }
// ── Modal de confirmación con preview - Contabilizar (individual o en masa) ────────
export const CONTABILIZAR_GREEN = C.success;
// ── Modal: editar programación ──────────────────────────────────────────────────
export function dmyToIso(s: string) { const [d,m,y] = s.split('/'); return y&&m&&d ? `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` : ''; }
export function isoToDmy(s: string) { if (!s) return ''; const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`; }
