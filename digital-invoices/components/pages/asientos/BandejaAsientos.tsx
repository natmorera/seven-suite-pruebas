'use client';
import { ExportListModal } from '@/components/ui/primitives';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { C, fmtNum, Pagination, PERMISOS_ACTUAL, BotonExportarUnico, FONT, radius, shadow, PageHeader, Switch, SearchInput, TabBar, Checkbox, FilterDropdown, BulkActionBar } from '../../ui/primitives';
import { GRUPOS_NIIF, flattenAll } from '../catalogo/catalogoData';
import { useCatalogo } from '../catalogo/catalogoStore';
import { useVisualizacionAsientosDefault, VisualizacionAsiento } from '../config/visualizacionAsientos';
import ModalDescontabilizar, { IcDescontabilizar, ConciliacionAfectada } from './DescontabilizarModal';
import ModalEnviarCorreo from '../../ui/ModalEnviarCorreo';
import DocumentoOrigen from './DocumentoOrigen';
import VistaPreviaAdjunto, { guardarContenidoArchivo } from '@/components/ui/VistaPreviaAdjunto';
import { simboloLocal } from '@/lib/paisActual';

const F = FONT;
const BRAND = C.brand;
function fmt2(n: number) { return fmtNum(n, 2); }
function genConsecutivo(fecha: string, todos: Asiento[]) {
  const [y, m] = fecha.split('-');
  const prefix = `${y}${m.padStart(2, '0')}`;
  const existing = todos.filter(a => a.consecutivo.startsWith(prefix)).map(a => parseInt(a.consecutivo.slice(6)) || 0);
  const next = (existing.length ? Math.max(...existing) : 0) + 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}

// ── Types ──────────────────────────────────────────────────────────────────────
type TipoAsiento = 'A' | 'M' | 'I' | 'D' | 'P';
type Moneda = 'CRC' | 'USD';
interface LineaAsiento { id: number; cuenta: string; descripcion: string; cCostos: string; debe: number; haber: number; }
interface Asiento {
  id: number; tipo: TipoAsiento; origen: string; fecha: string; consecutivo: string;
  titulo: string; moneda: Moneda; importe: number; usuario: string; documento: string;
  observacion: string; contabilizado: boolean; lineas: LineaAsiento[];
  archivos?: string[]; historial?: { color: string; texto: string; fecha: string; usuario: string }[];
  motivoAnulacion?: string;
  conciliacion?: ConciliacionAfectada | null;
  documentoRefId?: string | null;   // venta o compra que lo generó
}

// ── Constants ──────────────────────────────────────────────────────────────────
const TIPOS_LABEL: Record<TipoAsiento, string> = { A:'Automático', M:'Manual', I:'Importado', D:'Duplicado', P:'Plantilla' };
const TIPO_BG:    Record<TipoAsiento, string>  = { A:'#3B82F6', M:'#A77600', I:'#7C3AED', D:'#6B7280', P:'#059669' };
const MON_SYM:    Record<Moneda, string>        = { get CRC() { return simboloLocal(); }, USD:'$' };
const ORIGENES = ['FrontDesk','Accounting','Inventario','Activos fijos','POS'];
const USUARIOS = ['jperez','sblandon','yader','glopez'];
const MONEDAS: Moneda[] = ['CRC','USD'];

// ── Cuentas disponibles para las líneas del asiento (código + nombre + grupo NIIF) ──
const CUENTAS_LINEA: { code:string; nombre:string; grupo:string }[] = [
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
// ── Selector de cuenta para líneas del asiento - nombre visible, búsqueda y filtro por grupo NIIF ──
function CuentaLineaSelect({ value, onChange }: { value:string; onChange:(code:string)=>void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [gruposSel, setGruposSel] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ(''); } }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  // Cuentas que aceptan movimientos del catálogo guardado (más las de ejemplo que no estén)
  const catalogo = useCatalogo();
  const cuentasLinea = React.useMemo(() => {
    const delCatalogo = flattenAll(catalogo).filter(c => c.posteable && !c.inactiva).map(c => ({ code: c.code, nombre: c.nombre, grupo: c.grupo }));
    const vistos = new Set(delCatalogo.map(c => c.code));
    return [...delCatalogo, ...CUENTAS_LINEA.filter(c => !vistos.has(c.code))];
  }, [catalogo]);
  const seleccionada = cuentasLinea.find(c=>c.code===value);
  const filtradas = cuentasLinea.filter(c =>
    (!q || c.code.includes(q) || c.nombre.toLowerCase().includes(q.toLowerCase())) &&
    (gruposSel.size===0 || gruposSel.has(c.grupo)));

  function toggleGrupo(v: string) {
    setGruposSel(p => { const n = new Set(p); n.has(v) ? n.delete(v) : n.add(v); return n; });
  }

  return (
    <div ref={ref} style={{ position:'relative', width:210 }}>
      <button type="button" onClick={()=>setOpen(o=>!o)}
        style={{ width:'100%', height:30, padding:'0 24px 0 7px', border:`1px solid ${value?BRAND:C.n500}`, borderRadius:5,
          fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box', textAlign:'left', background:'#fff', cursor:'pointer',
          color:value?'#0F0F0F':C.n700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', position:'relative' }}>
        {seleccionada ? <><span style={{ color:BRAND, fontWeight:500 }}>{seleccionada.code}</span> - {seleccionada.nombre}</> : 'Seleccionar…'}
        <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round"
          style={{ position:'absolute', right:7, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:400, background:'#fff', border:`1px solid #EBEBEB`,
          borderRadius:radius.md, boxShadow:shadow.panel, width:300, padding:8 }}>
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por código o nombre…"
            style={{ width:'100%', height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box', marginBottom:8 }}/>

          {/* Filtro por grupo NIIF */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
            {GRUPOS_NIIF.map(g=>{
              const active = gruposSel.has(g.value);
              return (
                <button key={g.value} type="button" onClick={()=>toggleGrupo(g.value)}
                  style={{ height:22, padding:'0 8px', border:`1px solid ${active?BRAND:C.n500}`, borderRadius:radius.pill,
                    background:active?C.brandBg:'#fff', color:active?BRAND:C.n700, fontSize:10, fontFamily:F,
                    cursor:'pointer', whiteSpace:'nowrap' }}>
                  {g.label}
                </button>
              );
            })}
            {gruposSel.size>0 && (
              <button type="button" onClick={()=>setGruposSel(new Set())}
                style={{ height:22, padding:'0 8px', border:'none', borderRadius:radius.pill, background:'none', color:C.error, fontSize:10, fontFamily:F, cursor:'pointer' }}>
                × Limpiar
              </button>
            )}
          </div>

          <div style={{ maxHeight:200, overflowY:'auto', display:'flex', flexDirection:'column', gap:1, borderTop:`1px solid #F0F0F0`, paddingTop:4 }}>
            {filtradas.length===0 && <p style={{ fontSize:11, color:C.n700, textAlign:'center', padding:'10px 0', margin:0 }}>Sin resultados.</p>}
            {filtradas.map(c=>(
              <button key={c.code} type="button" onClick={()=>{ onChange(c.code); setOpen(false); setQ(''); }}
                style={{ display:'block', textAlign:'left', padding:'7px 8px', border:'none', borderRadius:5,
                  background:value===c.code?C.brandBg:'transparent', cursor:'pointer', fontSize:11, fontFamily:F }}>
                <span style={{ color:BRAND, fontWeight:500 }}>{c.code}</span> - <span style={{ color:'#333' }}>{c.nombre}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface Programado { id:string; nombre:string; frecuencia:string; proxima:string; moneda:Moneda; activo:boolean; }
const PROGRAMADOS_INIT: Programado[] = [
  { id:'p1', nombre:'Depreciación mensual activos', frecuencia:'Mensual',   proxima:'15/02/2026', moneda:'CRC', activo:true },
  { id:'p2', nombre:'Amortización préstamo BAC',    frecuencia:'Mensual',   proxima:'15/02/2026', moneda:'CRC', activo:true },
  { id:'p3', nombre:'Reserva de vacaciones',        frecuencia:'Quincenal', proxima:'15/02/2026', moneda:'CRC', activo:false },
];
interface Plantilla { id:string; nombre:string; cuentas:number; moneda:Moneda; ultima:string; lineas:LineaAsiento[]; }
const PLANTILLAS_INIT: Plantilla[] = [
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
const COLS_DEF = [
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

const ORIGEN_COLORS: Record<string,string> = {
  FrontDesk:'#3B82F6', Accounting:C.success, Inventario:'#EF9F27', 'Activos fijos':'#7C3AED', POS:C.error,
};

// ── Icons ──────────────────────────────────────────────────────────────────────
const IcX     = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>;
const IcCheck = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6.33"/><path d="M5 8l2 2 4-4"/></svg>;
const IcEdit  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-9 9H2v-3l9-9z"/></svg>;
const IcBan   = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="8" r="6.33"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5"/></svg>;
const IcCopy  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3h8"/></svg>;
const IcPrint = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6V2h8v4"/><rect x="1" y="6" width="14" height="6" rx="1.5"/><path d="M4 9v5h8V9"/></svg>;
const IcClip  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M12.5 7.5l-5.5 5.5a4 4 0 01-5.66-5.66l6-6a2.67 2.67 0 013.77 3.77L5 11.23a1.33 1.33 0 01-1.89-1.89l5.5-5.5"/></svg>;
const IcMail  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="3" width="13" height="10" rx="1.5"/><path d="M2 4l6 5 6-5"/></svg>;
const IcChev  = ({ up=false }) => <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d={up?"M3.5 8.75L7 5.25L10.5 8.75":"M3.5 5.25L7 8.75L10.5 5.25"}/></svg>;
const IcPlus  = () => <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>;

function TipoPill({ tipo }: { tipo: TipoAsiento }) {
  return (
    <span style={{ width:22, height:22, borderRadius:radius.sm, display:'inline-flex', alignItems:'center', justifyContent:'center',
      background:TIPO_BG[tipo], color:'#fff', fontSize:10, fontWeight:700, fontFamily:F, flexShrink:0 }}>
      {tipo}
    </span>
  );
}

// ── Tooltip wrapper ────────────────────────────────────────────────────────────
function TT({ label, children }: { label: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position:'relative', display:'inline-flex' }}
      onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}
      onFocus={()=>setShow(true)} onBlur={()=>setShow(false)}>
      {children}
      {show && (
        <div style={{ position:'absolute', bottom:'110%', left:'50%', transform:'translateX(-50%)',
          background:'#0F0F0F', color:'#fff', fontSize:10, fontFamily:F, padding:'4px 8px',
          borderRadius:5, whiteSpace:'nowrap', pointerEvents:'none', zIndex:9999,
          boxShadow:'0 2px 8px rgba(0,0,0,.25)' }}>
          {label}
        </div>
      )}
    </div>
  );
}

// ── Action icon button ─────────────────────────────────────────────────────────
function ActBtn({ label, onClick, danger=false, children }: { label: string; onClick: (e: React.MouseEvent)=>void; danger?: boolean; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <TT label={label}>
      <button onClick={onClick} aria-label={label} title={label}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        style={{ width:27, height:27, borderRadius:radius.sm, border:'none', cursor:'pointer', display:'flex',
          alignItems:'center', justifyContent:'center', transition:'all .12s',
          background: hov ? (danger ? C.errorBg : '#F5F5F5') : 'transparent',
          color: hov ? (danger ? C.error : BRAND) : '#9E9E9E' }}>
        {children}
      </button>
    </TT>
  );
}

// ── Date range filter ──────────────────────────────────────────────────────────
type DateRange = { from:string; to:string };

function toISO(d: Date) { const p=(n:number)=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
const MES_CORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function fmtDMY(iso: string) { if(!iso) return ''; const [y,m,d]=iso.split('-'); return `${d} ${MES_CORTO[parseInt(m,10)-1]} ${y}`; }

const FECHA_PRESETS: { id:string; label:string }[] = [
  { id:'hoy',        label:'Hoy' },
  { id:'semana',     label:'Esta semana' },
  { id:'mes',        label:'Este mes' },
  { id:'mesAnt',     label:'Mes anterior' },
  { id:'trimestre',  label:'Este trimestre' },
  { id:'anio',       label:'Este año' },
];

function computeFechaPreset(id: string): DateRange {
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
function detectFechaPreset(v: DateRange): string|null {
  if (!v.from || !v.to) return null;
  for (const p of FECHA_PRESETS) { const r = computeFechaPreset(p.id); if (r.from===v.from && r.to===v.to) return p.id; }
  return null;
}

function DateFilter({ label, value, onChange, onClear }: { label: string; value: DateRange; onChange: (v:DateRange)=>void; onClear:()=>void }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<DateRange>(value);
  const [preset, setPreset] = useState<string|null>(detectFechaPreset(value));
  const ref = useRef<HTMLDivElement>(null);
  const active = !!(value.from || value.to);

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  function applyPreset(id: string) { setLocal(computeFechaPreset(id)); setPreset(id); }
  function editManual(field: 'from'|'to', v: string) { setLocal(p=>({...p,[field]:v})); setPreset(null); }

  const days = local.from && local.to ? Math.round((new Date(local.to+'T00:00:00').getTime() - new Date(local.from+'T00:00:00').getTime())/86400000) + 1 : 0;
  const summary = local.from && local.to ? `${fmtDMY(local.from)} - ${fmtDMY(local.to)} · ${days} día${days===1?'':'s'}` : '';

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={()=>{ setLocal(value); setPreset(detectFechaPreset(value)); setOpen(v=>!v); }}
        style={{ height:32, padding:'0 12px', border:`1px solid ${active?BRAND:C.n500}`, borderRadius:4,
          background:active?C.brandBg:'#fff', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center',
          gap:5, color:active?BRAND:'#0F0F0F', fontFamily:F, fontWeight:active?500:400 }}>
        {label} <IcChev/>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:300,
          background:'#fff', border:`1px solid ${C.n500}`, borderRadius:10, width:280,
          boxShadow:shadow.panel, fontFamily:F }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderBottom:`1px solid ${C.n500}` }}>
            <span style={{ fontSize:13, fontWeight:600 }}>Período de fecha</span>
            <button onClick={()=>{ setLocal({from:'',to:''}); setPreset(null); onClear(); setOpen(false); }}
              style={{ fontSize:12, color:C.error, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Limpiar</button>
          </div>
          <div style={{ padding:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              {FECHA_PRESETS.map(p=>(
                <button key={p.id} onClick={()=>applyPreset(p.id)}
                  style={{ height:34, borderRadius:radius.md, border:`1px solid ${preset===p.id?BRAND:C.n500}`,
                    background:preset===p.id?C.brandBg:'#fff', color:preset===p.id?BRAND:'#0F0F0F',
                    fontWeight:preset===p.id?600:400, cursor:'pointer', fontSize:12, fontFamily:F }}>
                  {p.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize:10, fontWeight:600, color:'#9E9E9E', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 8px' }}>Rango personalizado</p>
            <div style={{ marginBottom:8 }}>
              <label style={{ fontSize:11, color:'#757575', display:'block', marginBottom:3 }}>Desde</label>
              <input type="date" value={local.from} onChange={e=>editManual('from', e.target.value)}
                style={{ width:'100%', height:32, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:7, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'#757575', display:'block', marginBottom:3 }}>Hasta</label>
              <input type="date" value={local.to} onChange={e=>editManual('to', e.target.value)}
                style={{ width:'100%', height:32, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:7, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
            </div>
            {summary && (
              <div style={{ padding:'8px 10px', background:C.brandBg, border:`1px solid ${C.brandBd}`, borderRadius:radius.md, fontSize:12, color:BRAND, fontWeight:500 }}>
                {summary}
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:8, padding:'12px 14px', borderTop:`1px solid ${C.n500}` }}>
            <button onClick={()=>setOpen(false)} style={{ flex:1, height:32, border:`1px solid ${C.n500}`, borderRadius:7, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
            <button onClick={()=>{ onChange(local); setOpen(false); }} style={{ flex:1, height:32, border:'none', borderRadius:7, background:BRAND, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Importe range filter ───────────────────────────────────────────────────────
export interface ImporteRange { moneda: Moneda; min: number; max: number }
const IMPORTE_MAX = 2000000;
const IMPORTE_DEFAULT: ImporteRange = { moneda:'CRC', min:0, max:IMPORTE_MAX };
function fmtInt(n: number) { return Math.round(n).toLocaleString('en-US'); }

function ImporteFilter({ value, onChange, onClear }: { value: ImporteRange; onChange: (v:ImporteRange)=>void; onClear:()=>void }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<ImporteRange>(value);
  const ref = useRef<HTMLDivElement>(null);
  const active = value.min > 0 || value.max < IMPORTE_MAX;

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const sym = MON_SYM[local.moneda];
  const pct = Math.min(100, Math.max(0, (local.max / IMPORTE_MAX) * 100));

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={()=>{ setLocal(value); setOpen(v=>!v); }}
        style={{ height:32, padding:'0 12px', border:`1px solid ${active?BRAND:C.n500}`, borderRadius:4,
          background:active?C.brandBg:'#fff', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center',
          gap:5, color:active?BRAND:'#0F0F0F', fontFamily:F, fontWeight:active?500:400 }}>
        Importe <IcChev/>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:300,
          background:'#fff', border:`1px solid ${C.n500}`, borderRadius:10, width:300,
          boxShadow:shadow.panel, fontFamily:F }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderBottom:`1px solid ${C.n500}` }}>
            <span style={{ fontSize:13, fontWeight:600 }}>Rango de importe</span>
            <button onClick={()=>{ setLocal(IMPORTE_DEFAULT); onClear(); setOpen(false); }}
              style={{ fontSize:12, color:C.error, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Limpiar</button>
          </div>
          <div style={{ padding:14 }}>
            <p style={{ fontSize:10, fontWeight:600, color:'#9E9E9E', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 8px' }}>Moneda de referencia</p>
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              {(['CRC','USD'] as const).map(mo=>(
                <button key={mo} onClick={()=>setLocal(p=>({...p,moneda:mo}))}
                  style={{ flex:1, height:32, borderRadius:radius.md, border:`1px solid ${local.moneda===mo?BRAND:C.n500}`,
                    background:local.moneda===mo?C.brandBg:'#fff', color:local.moneda===mo?BRAND:'#0F0F0F',
                    fontWeight:local.moneda===mo?600:400, cursor:'pointer', fontSize:12, fontFamily:F }}>
                  {mo==='CRC'?`${MON_SYM.CRC} CRC`:`${MON_SYM.USD} USD`}
                </button>
              ))}
            </div>

            <div style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:11 }}>
                <span style={{ color:'#9E9E9E' }}>{sym} 0</span>
                <span style={{ color:BRAND, fontWeight:600 }}>{sym} {fmtInt(local.max)}</span>
                <span style={{ color:'#9E9E9E' }}>{sym} {fmtInt(IMPORTE_MAX)}</span>
              </div>
              <div style={{ position:'relative', height:6, borderRadius:3, background:'#F0F0F0' }}>
                <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${pct}%`, background:BRAND, borderRadius:3 }}/>
              </div>
              <input type="range" min={0} max={IMPORTE_MAX} step={1000} value={local.max}
                onChange={e=>setLocal(p=>({...p, max:Number(e.target.value)}))}
                style={{ width:'100%', marginTop:6, accentColor:BRAND }}/>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={{ fontSize:11, color:'#757575', display:'block', marginBottom:3 }}>Mínimo</label>
                <input type="number" min={0} value={local.min} onChange={e=>setLocal(p=>({...p,min:Number(e.target.value)||0}))}
                  style={{ width:'100%', height:32, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:7, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#757575', display:'block', marginBottom:3 }}>Máximo</label>
                <input type="number" min={0} value={local.max} onChange={e=>setLocal(p=>({...p,max:Number(e.target.value)||0}))}
                  style={{ width:'100%', height:32, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:7, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, padding:'12px 14px', borderTop:`1px solid ${C.n500}` }}>
            <button onClick={()=>setOpen(false)} style={{ flex:1, height:32, border:`1px solid ${C.n500}`, borderRadius:7, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
            <button onClick={()=>{ onChange(local); setOpen(false); }} style={{ flex:1, height:32, border:'none', borderRadius:7, background:BRAND, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Footer de paginación funcional (Pendientes / Anulados) ─────────────────────
function PaginationFooter({ total, porPagina, setPorPagina, pagina, setPagina }: {
  total: number; porPagina: number; setPorPagina: React.Dispatch<React.SetStateAction<number>>;
  pagina: number; setPagina: React.Dispatch<React.SetStateAction<number>>;
}) {
  return (
    <div style={{ background:'#fff', borderTop:`1px solid ${C.n500}`, padding:'8px 24px', flexShrink:0 }}>
      <Pagination page={pagina} pageSize={porPagina} total={total}
        onPageChange={setPagina} onPageSizeChange={setPorPagina}/>
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────────
type ToastType = 'success'|'error'|'info'|'warning';
function ToastContainer({ toasts, onDismiss }: { toasts:{id:number;type:ToastType;msg:string}[]; onDismiss:(id:number)=>void }) {
  const COLORS: Record<ToastType,[string,string]> = { success:[C.success,C.successBg], error:[C.error,C.errorBg], info:['#378ADD','#EFF6FF'], warning:['#EF9F27','#FFFBEB'] };
  return (
    <div style={{ position:'fixed', bottom:48, right:20, display:'flex', flexDirection:'column', gap:8, zIndex:9999 }}>
      {toasts.map(t => {
        const [color,bg] = COLORS[t.type];
        return (
          <div key={t.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', background:bg, border:`1px solid ${color}30`, borderRadius:10, maxWidth:340, boxShadow:'0 4px 16px rgba(0,0,0,.12)', fontFamily:F }}>
            <span style={{ width:18,height:18,borderRadius:'50%',background:color,color:'#fff',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>!</span>
            <span style={{ fontSize:12, color:'#0F0F0F', flex:1 }}>{t.msg}</span>
            <button onClick={()=>onDismiss(t.id)} aria-label="Cerrar notificación" title="Cerrar notificación" style={{ background:'none',border:'none',cursor:'pointer',color:'#757575',padding:0,fontSize:14 }}>×</button>
          </div>
        );
      })}
    </div>
  );
}

// ── Modal de adjuntos - 2 estados visuales: vacío (dropzone prominente) vs. con archivos (lista compacta + control secundario) ──
function ModalAdjuntos({ archivos, onSave, onClose, title='Gestionar adjuntos' }: {
  archivos: string[]; onSave:(archivos:string[])=>void; onClose:()=>void; title?:string;
}) {
  const [local, setLocal] = useState<string[]>(archivos);
  // El nombre se guarda en el asiento; el contenido queda en la sesión para la vista previa
  function agregarFake(e?: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e?.target.files?.[0];
    const nombre = archivo?.name ?? `adjunto-${Date.now()}.pdf`;
    if (archivo) guardarContenidoArchivo(nombre, archivo);
    setLocal(p=>[...p.filter(x=>x!==nombre), nombre]);
  }
  function quitar(f: string) { setLocal(p=>p.filter(x=>x!==f)); }
  const vacio = local.length === 0;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:380, padding:'20px', boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>{title}</p>
          <button onClick={onClose} aria-label="Cerrar" title="Cerrar" style={{ background:'none',border:'none',cursor:'pointer',color:'#757575',fontSize:18 }}>×</button>
        </div>

        {vacio ? (
          // Estado vacío - dropzone prominente, sin lista debajo
          <label style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'28px 16px', border:`2px dashed ${C.n500}`, borderRadius:radius.md, cursor:'pointer', background:C.n200, marginBottom:14 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            <span style={{ fontSize:13, fontWeight:500, fontFamily:F }}>Clic o arrastrá para adjuntar</span>
            <span style={{ fontSize:11, color:C.n700, fontFamily:F }}>.pdf .jpg .png .xml .xlsx · 10 MB</span>
            <input type="file" style={{ display:'none' }} onChange={agregarFake}/>
          </label>
        ) : (
          // Estado con archivos - lista compacta arriba + control secundario (no dropzone gigante) para agregar más
          <>
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
              {local.map(a=>(
                <div key={a} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F }}>
                  <IcClip/>
                  <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a}</span>
                  <button onClick={()=>quitar(a)} aria-label={`Quitar ${a}`} title={`Quitar ${a}`}
                    style={{ background:'none',border:'none',cursor:'pointer',color:C.error,fontSize:14,padding:0,lineHeight:1 }}>×</button>
                </div>
              ))}
            </div>
            <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, height:34, border:`1px dashed ${C.n500}`, borderRadius:radius.md, cursor:'pointer', fontSize:11, color:C.n700, fontFamily:F, marginBottom:14 }}>
              <IcPlus/> Agregar más archivos
              <input type="file" style={{ display:'none' }} onChange={agregarFake}/>
            </label>
          </>
        )}

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={()=>onSave(local)} style={{ height:34, padding:'0 14px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// Consolida las líneas de un asiento sumando por cuenta + centro de costos -
// no cambia el asiento real (sigue detallado en el origen), solo cómo se ve.
function consolidarLineas(lineas: LineaAsiento[]): LineaAsiento[] {
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

// ── Right drawer: detalle asiento ──────────────────────────────────────────────
// Nombre legal de la empresa (Configuración › Empresa) para el detalle y la impresión
let nombreEmpresaCache = '';
function useNombreEmpresa() {
  const [nombre, setNombre] = useState(nombreEmpresaCache);
  useEffect(() => {
    if (nombreEmpresaCache) return;
    let vivo = true;
    fetch('/api/empresa').then(r => r.json()).then(d => { nombreEmpresaCache = String(d?.datos?.nombreLegal ?? ''); if (vivo) setNombre(nombreEmpresaCache); }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  return nombre;
}

function DetalleDrawer({ asiento, anulado=false, onClose, onAnular, onDuplicar, onContabilizar, onRestaurar, onUpdateArchivos, tienePermisoDescontabilizar = PERMISOS_ACTUAL.descontabilizarAsientos }: {
  asiento: Asiento; anulado?: boolean; onClose:()=>void;
  onAnular?:()=>void; onDuplicar?:()=>void;
  onContabilizar?:(payload?:{motivo:string; desconciliar:boolean})=>void;
  onRestaurar?:()=>void;
  onUpdateArchivos?:(archivos:string[])=>void; tienePermisoDescontabilizar?: boolean;
}) {
  const sym = MON_SYM[asiento.moneda];
  const totalDebe  = asiento.lineas.reduce((s,l)=>s+l.debe,0);
  const totalHaber = asiento.lineas.reduce((s,l)=>s+l.haber,0);
  const fechaHoy = new Date().toLocaleDateString('es-CR');
  const empresa = useNombreEmpresa();
  const { default_: vista } = useVisualizacionAsientosDefault();
  const lineasVista = vista === 'consolidado' ? consolidarLineas(asiento.lineas) : asiento.lineas;
  const [obsOpen,  setObsOpen]  = useState(true);
  const [histOpen, setHistOpen] = useState(true);
  const [filesOpen,setFilesOpen]= useState(true);
  const [previa, setPrevia] = useState<number | null>(null);
  const [showAdjuntos, setShowAdjuntos] = useState(false);
  const [showDescontabilizar, setShowDescontabilizar] = useState(false);

  return (
    <>
      <style>{`
        #asiento-print-area { display:none; }
        @media print {
          body * { visibility:hidden; }
          #asiento-print-area, #asiento-print-area * { visibility:visible; }
          #asiento-print-area { display:block !important; position:absolute; left:0; top:0; width:100%; padding:32px; }
          #asiento-print-area table thead { display: table-header-group; }
          #asiento-print-area table tr { page-break-inside: avoid; }
        }
      `}</style>
      <div id="asiento-print-area">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <p style={{ fontSize:18, fontWeight:700, margin:0, fontFamily:F }}>{empresa}</p>
            <p style={{ fontSize:13, color:'#757575', margin:'3px 0 0', fontFamily:F }}>Comprobante de asiento contable</p>
          </div>
          <p style={{ fontSize:11, color:'#757575', margin:0, fontFamily:F }}>Generado: {fechaHoy}</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px 16px', fontSize:12, padding:'14px 0', borderTop:'1px solid #ccc', borderBottom:'1px solid #ccc', marginBottom:16 }}>
          {[['N.º Asiento',asiento.consecutivo],['Título',asiento.titulo],['Fecha',asiento.fecha.split('-').reverse().join('/')],
            ['Moneda',`${asiento.moneda} ${sym}`],['Tipo',TIPOS_LABEL[asiento.tipo]],['Módulo/Origen',asiento.origen],
            ['Estado',anulado?'Anulado':asiento.contabilizado?'Contabilizado':'Pendiente'],['Libro','General']]
            .map(([l,v])=>(
            <div key={l as string}>
              <p style={{ fontSize:10, color:'#757575', margin:'0 0 2px', fontFamily:F }}>{l as string}</p>
              <p style={{ fontSize:12, fontWeight:500, color:'#0F0F0F', margin:0, fontFamily:F }}>{v as string}</p>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <p style={{ fontSize:13, fontWeight:600, color:'#0F0F0F', margin:0, fontFamily:F }}>Líneas del asiento</p>
          <span style={{ fontSize:11, color:'#555', fontFamily:F }}>
            Vista: <strong>{vista==='detallado'?'Detallado':'Consolidado'}</strong>
          </span>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F, marginBottom:16 }}>
          <thead>
            <tr style={{ borderBottom:'2px solid #999' }}>
              {['Cuenta','Descripción','C.C','Debe','Haber'].map(h=>(
                <th key={h} style={{ padding:'6px 8px', textAlign:h==='Debe'||h==='Haber'?'right':'left', fontSize:11, fontWeight:500, color:'#555' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lineasVista.map(l=>(
              <tr key={l.id} style={{ borderBottom:'1px solid #eee' }}>
                <td style={{ padding:'6px 8px', fontSize:11 }}>{l.cuenta}</td>
                <td style={{ padding:'6px 8px', fontSize:11 }}>{l.descripcion}</td>
                <td style={{ padding:'6px 8px', fontSize:11, color:'#757575' }}>{l.cCostos||'-'}</td>
                <td style={{ padding:'6px 8px', fontSize:11, textAlign:'right' }}>{l.debe>0?`${sym} ${fmt2(l.debe)}`:'-'}</td>
                <td style={{ padding:'6px 8px', fontSize:11, textAlign:'right' }}>{l.haber>0?`${sym} ${fmt2(l.haber)}`:'-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop:'2px solid #999' }}>
              <td colSpan={3} style={{ padding:'6px 8px', fontWeight:700, fontSize:12 }}>Totales</td>
              <td style={{ padding:'6px 8px', fontWeight:700, fontSize:12, textAlign:'right' }}>{sym} {fmt2(totalDebe)}</td>
              <td style={{ padding:'6px 8px', fontWeight:700, fontSize:12, textAlign:'right' }}>{sym} {fmt2(totalHaber)}</td>
            </tr>
          </tfoot>
        </table>
        {asiento.observacion && (
          <div>
            <p style={{ fontSize:12, fontWeight:600, color:'#0F0F0F', margin:'0 0 4px', fontFamily:F }}>Observación</p>
            <p style={{ fontSize:12, color:'#333', margin:0, lineHeight:1.5, fontFamily:F }}>{asiento.observacion}</p>
          </div>
        )}
      </div>

      {/* Overlay semi-transparente */}
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.2)', zIndex:998 }}/>
      {/* Panel derecho */}
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:640, background:'#fff',
        boxShadow:'-8px 0 32px rgba(0,0,0,.14)', zIndex:999, display:'flex', flexDirection:'column',
        fontFamily:F, overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.n500}`, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:16, fontWeight:600, margin:0, color:'#0F0F0F' }}>{asiento.titulo}</p>
              <p style={{ fontSize:12, color:BRAND, margin:'3px 0 0', fontFamily:F }}>{asiento.consecutivo}</p>
            </div>
            <button onClick={onClose} aria-label="Cerrar" title="Cerrar" style={{ background:'none',border:'none',cursor:'pointer',color:'#757575',fontSize:22,padding:4,lineHeight:1,marginTop:-4 }}>×</button>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10 }}>
            <TipoPill tipo={asiento.tipo}/>
            <span style={{ fontSize:12, color:'#757575' }}>{TIPOS_LABEL[asiento.tipo]} · {asiento.origen}</span>
            <span style={{ marginLeft:'auto', fontSize:11, padding:'2px 10px', borderRadius:radius.pill, fontWeight:500,
              background: anulado?C.errorBg: asiento.contabilizado?C.successBg:'#FFFBEB',
              color: anulado?C.error: asiento.contabilizado?C.success:'#A07000',
              border: `1px solid ${anulado?`${C.errorBorder}`:asiento.contabilizado?`${C.successBorder}`:'#EEB30030'}` }}>
              {anulado?'Anulado':asiento.contabilizado?'Contabilizado':'Pendiente'}
            </span>
          </div>
        </div>

        {/* Meta */}
        <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}`, flexShrink:0 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px 16px', fontSize:12 }}>
            {[['N.º Asiento',asiento.consecutivo,true],['Fecha',asiento.fecha.split('-').reverse().join('/'),false],
              ['Moneda',`${asiento.moneda} ${sym}`,false],['Tasa',asiento.moneda==='CRC'?'1.00':'-',false],['Libro','General',false],['Empresa',empresa||'-',false]]
              .map(([l,v,mono])=>(
              <div key={l as string}>
                <p style={{ fontSize:10, color:'#757575', margin:'0 0 2px' }}>{l as string}</p>
                <p style={{ fontSize:12, fontWeight:500, color:'#0F0F0F', margin:0, fontFamily: F }}>{v as string}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Documento de facturación que lo generó */}
        {asiento.documentoRefId && <DocumentoOrigen asientoNum={asiento.id} />}

        <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>

        {/* Líneas */}
        <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}` }}>
          <p style={{ fontSize:13, fontWeight:600, color:'#0F0F0F', margin:'0 0 10px' }}>Líneas del asiento</p>
          {lineasVista.length === 0
            ? <p style={{ fontSize:12, color:'#757575', margin:0 }}>Sin líneas registradas.</p>
            : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${C.n500}` }}>
                  {['Cuenta','Descripción','C.C','Debe','Haber'].map(h=>(
                    <th key={h} style={{ padding:'6px 8px', textAlign:h==='Debe'||h==='Haber'?'right':'left', fontSize:11, fontWeight:500, color:'#757575' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineasVista.map(l=>(
                  <tr key={l.id} style={{ borderBottom:`1px solid #F5F5F5` }}>
                    <td style={{ padding:'6px 8px', color:BRAND, fontFamily:F, fontSize:11 }}>{l.cuenta}</td>
                    <td style={{ padding:'6px 8px', fontSize:11 }}>{l.descripcion}</td>
                    <td style={{ padding:'6px 8px', fontSize:11, color:'#757575' }}>{l.cCostos||'-'}</td>
                    <td style={{ padding:'6px 8px', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:6, minWidth:90 }}>
                        <span style={{ color:l.debe>0?C.n700:'#D0D0D0' }}>{sym}</span>
                        <span style={{ fontSize:11, color:l.debe>0?'#0F0F0F':'#D0D0D0' }}>{l.debe>0?fmt2(l.debe):'-'}</span>
                      </div>
                    </td>
                    <td style={{ padding:'6px 8px', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:6, minWidth:90 }}>
                        <span style={{ color:l.haber>0?C.n700:'#D0D0D0' }}>{sym}</span>
                        <span style={{ fontSize:11, color:l.haber>0?'#0F0F0F':'#D0D0D0' }}>{l.haber>0?fmt2(l.haber):'-'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:`2px solid ${C.n500}` }}>
                  <td colSpan={3} style={{ padding:'6px 8px', fontWeight:600, fontSize:12 }}>Totales</td>
                  <td style={{ padding:'6px 8px', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:6, minWidth:90 }}>
                        <span style={{ color:C.n700, fontWeight:600 }}>{sym}</span>
                        <span style={{ fontWeight:700, fontSize:12 }}>{fmt2(totalDebe)}</span>
                      </div>
                    </td>
                  <td style={{ padding:'6px 8px', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:6, minWidth:90 }}>
                        <span style={{ color:C.n700, fontWeight:600 }}>{sym}</span>
                        <span style={{ fontWeight:700, fontSize:12 }}>{fmt2(totalHaber)}</span>
                      </div>
                    </td>
                </tr>
                {Math.abs(totalDebe-totalHaber)>0.01 && (
                  <tr><td colSpan={5} style={{ padding:'4px 8px', color:C.error, fontSize:11 }}>⚠ Desbalanceado: {sym} {fmt2(Math.abs(totalDebe-totalHaber))}</td></tr>
                )}
              </tfoot>
            </table>
          )}
        </div>

        {/* Observación */}
        {asiento.observacion && (
          <div style={{ padding:'12px 24px', borderBottom:`1px solid ${C.n500}` }}>
            <button onClick={()=>setObsOpen(v=>!v)} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', padding:0, fontSize:12, fontWeight:500, color:'#0F0F0F' }}>
              Observación <IcChev up={obsOpen}/>
            </button>
            {obsOpen && <p style={{ fontSize:12, color:'#0F0F0F', margin:'8px 0 0', lineHeight:1.6 }}>{asiento.observacion}</p>}
          </div>
        )}

        {/* Archivos */}
        {((asiento.archivos?.length ?? 0) > 0 || onUpdateArchivos) && (
          <div style={{ padding:'12px 24px', borderBottom:`1px solid ${C.n500}` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <button onClick={()=>setFilesOpen(v=>!v)} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', padding:0, fontSize:12, fontWeight:500, color:'#0F0F0F' }}>
                Archivos adjuntos ({asiento.archivos?.length ?? 0}) {(asiento.archivos?.length??0) > 0 && <IcChev up={filesOpen}/>}
              </button>
              {onUpdateArchivos && (
                <button onClick={()=>setShowAdjuntos(true)} aria-label="Gestionar adjuntos" title="Gestionar adjuntos"
                  style={{ fontSize:11, color:BRAND, background:'none', border:`1px solid ${C.brandBd}`, borderRadius:radius.sm, padding:'4px 10px', cursor:'pointer', fontFamily:F }}>
                  Gestionar adjuntos
                </button>
              )}
            </div>
            {filesOpen && (asiento.archivos?.length??0) > 0 && (asiento.archivos!.map((f, k)=>(
              <button key={f} onClick={()=>setPrevia(k)} title={`Ver ${f}`}
                style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, padding:'3px 10px', border:`1px solid ${C.n500}`, borderRadius:radius.pill, marginRight:6, marginBottom:4, background:'#fff', cursor:'pointer', fontFamily:F, color:'#0F0F0F' }}>
                <IcClip/> {f}
              </button>
            )))}
            {previa !== null && <VistaPreviaAdjunto titulo={`Adjuntos del asiento ${asiento.consecutivo}`} archivos={(asiento.archivos ?? []).map(n => ({ nombre: n }))} inicial={previa} onClose={()=>setPrevia(null)}
              contexto={{ titulo: asiento.titulo, consecutivo: asiento.consecutivo, fecha: asiento.fecha, moneda: asiento.moneda, importe: asiento.importe }} />}
          </div>
        )}

        {/* Historial */}
        {(asiento.historial?.length ?? 0) > 0 && (
          <div style={{ padding:'12px 24px', borderBottom:`1px solid ${C.n500}` }}>
            <button onClick={()=>setHistOpen(v=>!v)} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', padding:0, fontSize:12, fontWeight:500, color:'#0F0F0F', marginBottom:8 }}>
              Historial <IcChev up={histOpen}/>
            </button>
            {histOpen && asiento.historial!.map((h,i)=>(
              <div key={i} style={{ display:'flex', gap:8, marginBottom:10 }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:h.color, flexShrink:0, marginTop:2 }}/>
                <div>
                  <p style={{ margin:0, fontSize:12, color:'#0F0F0F' }}>{h.texto}</p>
                  <p style={{ margin:0, fontSize:10, color:'#757575' }}>{h.fecha} - {h.usuario}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        </div>

        {/* Footer actions */}
        <div style={{ borderTop:`1px solid ${C.n500}`, padding:'14px 24px', display:'flex', gap:8, justifyContent:'flex-end', flexShrink:0 }}>
          {anulado ? (
            <button onClick={onRestaurar} style={{ height:34, padding:'0 16px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:F }}>
              ↺ Restaurar asiento
            </button>
          ) : asiento.contabilizado ? (
            <>
              <button onClick={()=>setShowDescontabilizar(true)} style={{ height:36, padding:'0 18px', border:`1px solid ${C.n500}`, background:'#fff', color:'#0F0F0F', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F, display:'flex', alignItems:'center', gap:7 }}>
                <IcDescontabilizar/>
                Descontabilizar (enviar pendiente)
              </button>
            </>
          ) : (
            <>
              {onAnular    && <button onClick={onAnular}    style={{ height:34, padding:'0 14px', border:`1px solid ${C.brandBd}`, background:'transparent', color:BRAND, borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F }}>⊘ Anular</button>}
              {onDuplicar  && <button onClick={onDuplicar}  style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, background:'#fff', color:'#0F0F0F', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F }}>Duplicar</button>}
              <button onClick={()=>window.print()} style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, background:'#fff', color:'#0F0F0F', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F }}>Imprimir</button>
              {onContabilizar && (
                <button onClick={()=>onContabilizar()} style={{ height:34, padding:'0 14px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Contabilizar</button>
              )}
            </>
          )}
        </div>
      </div>

      {showAdjuntos && onUpdateArchivos && (
        <ModalAdjuntos archivos={asiento.archivos ?? []}
          onSave={(archivos)=>{ onUpdateArchivos(archivos); setShowAdjuntos(false); }}
          onClose={()=>setShowAdjuntos(false)}/>
      )}
      {showDescontabilizar && (
        <ModalDescontabilizar
          consecutivo={asiento.consecutivo}
          titulo={asiento.titulo}
          conciliacion={asiento.conciliacion}
          tienePermiso={tienePermisoDescontabilizar}
          onClose={()=>setShowDescontabilizar(false)}
          onConfirm={(payload)=>{ setShowDescontabilizar(false); onContabilizar?.(payload); }}
        />
      )}
    </>
  );
}

// ── Input de monto - decimales fijos (2 por defecto) y separador de miles con coma
// (Debe/Haber de las líneas usan 2; Tasa usa 5, convención de tipo de cambio CR) ──
function fmtMontoDisplay(n: number, decimals: number = 2): string {
  if (!n) return '';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function parseMontoInput(raw: string): number {
  const n = parseFloat(raw.replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}
function formatMontoTyping(raw: string, decimals: number = 2): string {
  let s = raw.replace(/[^\d.]/g, '');
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  const [intRaw, decRaw] = s.split('.');
  const intPart = intRaw ? Number(intRaw).toLocaleString('en-US') : '';
  return decRaw !== undefined ? `${intPart}.${decRaw.slice(0, decimals)}` : intPart;
}
function MontoInput({ value, onChange, style, decimals=2, placeholder }: { value: number; onChange: (v:number)=>void; style?: React.CSSProperties; decimals?: number; placeholder?: string }) {
  // Mientras se escribe se muestra el texto tecleado; fuera del campo, el monto con formato
  const [text, setText] = useState(fmtMontoDisplay(value, decimals));
  const [focused, setFocused] = useState(false);
  return (
    <input type="text" inputMode="decimal" placeholder={placeholder ?? (0).toFixed(decimals)} value={focused ? text : fmtMontoDisplay(value, decimals)}
      onFocus={() => { setText(fmtMontoDisplay(value, decimals)); setFocused(true); }}
      onChange={e => { const display = formatMontoTyping(e.target.value, decimals); setText(display); onChange(parseMontoInput(display)); }}
      onBlur={() => { setFocused(false); setText(fmtMontoDisplay(value, decimals)); }}
      style={style}/>
  );
}

// Identificador local para filas y asientos nuevos antes de guardarlos
let ultimoIdTemporal = 0;
function idTemporal() { ultimoIdTemporal = Math.max(ultimoIdTemporal + 1, Date.now()); return ultimoIdTemporal; }

// ── Crear asiento form ─────────────────────────────────────────────────────────
interface CrearAsientoInitial { titulo:string; moneda:Moneda; lineas:LineaAsiento[]; origen?:string; documento?:string; observacion?:string; duplicadoDe?:string; }
function CrearAsientoDrawer({ asientos, onClose, onSave, plantillas, onSavePlantilla, onToast, initial }: {
  asientos: Asiento[]; onClose:()=>void; onSave:(a:Asiento)=>void;
  plantillas: Plantilla[]; onSavePlantilla:(p:Plantilla)=>void; onToast?:(msg:string, type?:ToastType)=>void;
  initial?: CrearAsientoInitial | null;
}) {
  const hoy = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState({
    tipo: 'General', titulo: initial?.titulo ?? '', fecha: hoy,
    moneda: (initial?.moneda ?? 'CRC') as Moneda, origen: initial?.origen ?? 'Accounting', documento: initial?.documento ?? '',
  });
  const [tasa, setTasa] = useState<number>(1);
  const [lineas, setLineas] = useState<LineaAsiento[]>(initial?.lineas ?? [
    { id:1, cuenta:'100-001-0001', descripcion:'Ingreso producción', cCostos:'ADM001', debe:1250, haber:0 },
    { id:2, cuenta:'', descripcion:'', cCostos:'ADM', debe:0, haber:1250 },
  ]);
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [showArchivos,  setShowArchivos]  = useState(false);
  const [showObs,       setShowObs]       = useState(false);
  const [showProg,      setShowProg]      = useState(false);
  const [programar,     setProgramar]     = useState(false);
  const [archivos,      setArchivos]      = useState<string[]>([]);
  const [observacion,   setObservacion]   = useState(initial?.observacion ?? '');
  const [showPlantillas,setShowPlantillas]= useState(false);
  const [paginaLineas, setPaginaLineas] = useState(1);
  const LINEAS_POR_PAG = 10;
  const [plantillaSelId, setPlantillaSelId] = useState('');
  const [consecRefreshing, setConsecRefreshing] = useState(false);

  const TIPOS_ASIENTO = ['General','Apertura','Cierre','Ajuste','Reclasificación'];

  const totalDebe  = lineas.reduce((s,l)=>s+l.debe,0);
  const totalHaber = lineas.reduce((s,l)=>s+l.haber,0);
  const balanceado = Math.abs(totalDebe-totalHaber)<0.01;
  const diffBalance = Math.abs(totalDebe-totalHaber);
  const totalPags  = Math.max(1, Math.ceil(lineas.length / LINEAS_POR_PAG));
  const lineasVisible = lineas.length > LINEAS_POR_PAG
    ? lineas.slice((paginaLineas-1)*LINEAS_POR_PAG, paginaLineas*LINEAS_POR_PAG)
    : lineas;
  const camposCompletos = !!form.titulo.trim() && !!form.fecha;

  function setF(k: keyof typeof form, v: string) { setForm(p=>({...p,[k]:v})); setErrors(p=>({...p,[k]:''})); }
  function setL(id: number, k: keyof LineaAsiento, v: string|number) { setLineas(p=>p.map(l=>l.id===id?{...l,[k]:v}:l)); }
  function addLinea() { setLineas(p=>[...p,{ id:Date.now(), cuenta:'', descripcion:'', cCostos:'ADM', debe:0, haber:0 }]); }
  function removeLinea(id: number) { setLineas(p=>p.filter(l=>l.id!==id)); }

  function refreshConsecutivo() {
    setConsecRefreshing(true);
    onToast?.('Número de asiento actualizado.', 'info');
    setTimeout(()=>setConsecRefreshing(false), 400);
  }

  function guardarComoPlantilla() {
    const lineasValidas = lineas.filter(l => l.cuenta.trim() || l.debe > 0 || l.haber > 0);
    if (lineasValidas.length === 0) {
      onToast?.('No hay nada que guardar: agregá al menos una línea con cuenta o monto antes de guardar como plantilla.', 'warning');
      return;
    }
    const nueva: Plantilla = {
      id: `pl-${Date.now()}`,
      nombre: form.titulo.trim() || `Plantilla ${new Date().toLocaleDateString('es-CR')}`,
      cuentas: lineasValidas.length,
      moneda: form.moneda,
      ultima: new Date().toLocaleDateString('es-CR'),
      lineas: lineasValidas,
    };
    onSavePlantilla(nueva);
    onToast?.('Plantilla guardada.', 'success');
  }

  function cargarPlantilla() {
    const p = plantillas.find(x=>x.id===plantillaSelId);
    if (p) {
      setLineas(p.lineas);
      setForm(prev=>({ ...prev, titulo: prev.titulo || p.nombre, moneda: p.moneda }));
      onToast?.(`Plantilla "${p.nombre}" cargada.`, 'success');
    }
    setShowPlantillas(false);
  }

  function handleSave(contabilizar=false) {
    if (!form.titulo.trim()) { setErrors({titulo:'Requerido'}); return; }
    if (!form.fecha) { setErrors(p=>({...p, fecha:'Requerido'})); return; }
    if (contabilizar && !balanceado) return;
    const consecutivo = genConsecutivo(form.fecha, asientos);
    const lineasValidas = lineas.filter(l => l.cuenta.trim() || l.debe > 0 || l.haber > 0);
    const nuevo: Asiento = {
      id: idTemporal(),
      tipo: 'M',
      origen: form.origen,
      fecha: form.fecha,
      consecutivo,
      titulo: form.titulo.trim(),
      moneda: form.moneda,
      importe: totalDebe,
      usuario: 'jperez',
      documento: form.documento,
      observacion,
      contabilizado: contabilizar,
      archivos,
      historial: [{ color:C.success, texto: contabilizar ? 'Asiento creado y contabilizado' : 'Asiento creado manualmente', fecha: new Date().toLocaleString('es-CR'), usuario:'jperez' }],
      lineas: lineasValidas.length > 0 ? lineasValidas : lineas,
    };
    onSave(nuevo);
  }

  const NUM_COL: React.CSSProperties = { padding:'5px 3px', whiteSpace:'nowrap' };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:998 }}/>
      <div style={{ position:'fixed', inset:0, zIndex:999, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'32px 20px', overflow:'auto' }}>
        <div style={{ background:'#fff', borderRadius:radius.lg, width:'100%', maxWidth:1360, minHeight:'88vh', maxHeight:'95vh', boxShadow:shadow.modal, fontFamily:F, display:'flex', flexDirection:'column' }}>

          {/* Title bar + plantilla selector */}
          <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
            <span style={{ fontSize:15, fontWeight:600, flexShrink:0 }}>Nuevo asiento manual</span>
            {/* Plantilla dropdown */}
            <div style={{ position:'relative', flex:1 }}>
              <button onClick={()=>setShowPlantillas(v=>!v)} style={{ width:'100%', height:36, padding:'0 12px', border:`1px solid ${showPlantillas?BRAND:C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F, display:'flex', alignItems:'center', justifyContent:'space-between', color:plantillaSelId?'#0F0F0F':C.n700 }}>
                <span>{plantillas.find(p=>p.id===plantillaSelId)?.nombre || 'Seleccionar plantilla para cargar líneas…'}</span>
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
              </button>
              {showPlantillas && (
                <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:400, background:'#fff', border:`1px solid ${C.n500}`, borderRadius:10, boxShadow:'0 8px 32px rgba(0,0,0,.16)', fontFamily:F, overflow:'hidden' }}
                  onClick={e=>e.stopPropagation()}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
                    <thead><tr style={{ background:'#F9F9F9' }}>
                      <th style={{ width:32, padding:'8px 12px' }}/>
                      <th style={{ padding:'8px 12px', textAlign:'left', fontWeight:500, color:C.n700, fontSize:11 }}>Nombre</th>
                      <th style={{ padding:'8px 12px', textAlign:'right', fontWeight:500, color:C.n700, fontSize:11 }}>Líneas</th>
                      <th style={{ padding:'8px 12px', textAlign:'left', fontWeight:500, color:C.n700, fontSize:11 }}>Moneda</th>
                    </tr></thead>
                    <tbody>
                      {plantillas.map(p=>(
                        <tr key={p.id} onClick={()=>setPlantillaSelId(p.id)}
                          style={{ borderTop:`1px solid #F5F5F5`, cursor:'pointer', background:plantillaSelId===p.id?C.brandBg:'#fff' }}
                          onMouseEnter={e=>{if(plantillaSelId!==p.id)e.currentTarget.style.background=C.n200;}}
                          onMouseLeave={e=>{if(plantillaSelId!==p.id)e.currentTarget.style.background='#fff';}}>
                          <td style={{ padding:'8px 12px' }}>
                            <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${plantillaSelId===p.id?BRAND:C.n500}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                              {plantillaSelId===p.id && <div style={{ width:8, height:8, borderRadius:'50%', background:BRAND }}/>}
                            </div>
                          </td>
                          <td style={{ padding:'8px 12px' }}>{p.nombre}</td>
                          <td style={{ padding:'8px 12px', textAlign:'right', color:BRAND, fontWeight:600 }}>{p.lineas.length}</td>
                          <td style={{ padding:'8px 12px', color:C.n700 }}>{p.moneda}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding:'8px 14px', background:C.brandBg, borderTop:`1px solid ${C.n500}`, fontSize:11, color:BRAND }}>
                    Cargar una plantilla reemplazará las líneas actuales del asiento.
                  </div>
                  <div style={{ padding:'10px 14px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
                    <button onClick={()=>setShowPlantillas(false)} style={{ height:32, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:7, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
                    <button onClick={cargarPlantilla} disabled={!plantillaSelId}
                      style={{ height:32, padding:'0 14px', border:'none', borderRadius:7, background:plantillaSelId?BRAND:'#ccc', color:'#fff', cursor:plantillaSelId?'pointer':'default', fontSize:12, fontWeight:500, fontFamily:F }}>Cargar plantilla</button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={()=>setShowPlantillas(true)} style={{ height:36, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F, flexShrink:0 }}>Cargar</button>
            <button onClick={()=>{ setForm({tipo:'General',titulo:'',fecha:hoy,moneda:'CRC' as Moneda,origen:'Accounting',documento:''}); setTasa(1); setLineas([{id:1,cuenta:'',descripcion:'',cCostos:'ADM',debe:0,haber:0},{id:2,cuenta:'',descripcion:'',cCostos:'ADM',debe:0,haber:0}]); setErrors({}); setPlantillaSelId(''); }}
      style={{ height:36, padding:'0 12px', border:'none', borderRadius:radius.md, background:'none', cursor:'pointer', fontSize:12, fontFamily:F, color:C.error, flexShrink:0 }}>Limpiar</button>
            <button onClick={onClose} aria-label="Cerrar" title="Cerrar" style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, fontSize:20, padding:'0 4px', flexShrink:0 }}>×</button>
          </div>

          {initial?.duplicadoDe && (
            <div style={{ padding:'8px 24px', background:C.brandBg, borderBottom:`1px solid ${C.n500}`, fontSize:12, color:BRAND, display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              <IcCopy/> Duplicando el asiento {initial.duplicadoDe}. Revisá los datos y confirmá - se asignará automáticamente el número <b>{genConsecutivo(form.fecha, asientos)}</b>.
            </div>
          )}

          {/* Cabecera del asiento */}
          <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}`, flexShrink:0 }}>
            <div style={{ display:'grid', gridTemplateColumns:'130px 1fr 140px 170px 155px 155px', gap:'0 10px', alignItems:'end' }}>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Tipo de asiento <span style={{ color:C.error }}>*</span></label>
                <div style={{ position:'relative' }}>
                  <select value={form.tipo} onChange={e=>setF('tipo',e.target.value)} style={{ width:'100%', height:36, padding:'0 10px 0 10px', paddingRight:30, border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', appearance:'none' }}>
                    {TIPOS_ASIENTO.map(t=><option key={t}>{t}</option>)}
                  </select>
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round" style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Título del asiento <span style={{ color:C.error }}>*</span></label>
                <input value={form.titulo} onChange={e=>setF('titulo',e.target.value)} placeholder="Ingresos de producción del día"
                  style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${errors.titulo?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Fecha <span style={{ color:C.error }}>*</span></label>
                <input type="date" value={form.fecha} onChange={e=>setF('fecha',e.target.value)} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Moneda</label>
                <div style={{ display:'flex', gap:4 }}>
                  {MONEDAS.map(m=>(
                    <button key={m} onClick={()=>setF('moneda',m)} style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:12, fontFamily:F, fontWeight:500, background:form.moneda===m?BRAND:C.n200, color:form.moneda===m?'#fff':'#0F0F0F', whiteSpace:'nowrap', padding:'0 8px' }}>
                      {MON_SYM[m]} {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Tasa (5 decimales)</label>
                <MontoInput value={tasa} onChange={setTasa} decimals={5}
                  style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>N.° Asiento</label>
                <div style={{ height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, display:'flex', alignItems:'center', justifyContent:'space-between', background:C.brandBg }}>
                  <span style={{ color:BRAND, fontWeight:600 }}>{genConsecutivo(form.fecha, asientos)}</span>
                  <button aria-label="Actualizar número de asiento" title="Actualizar número de asiento"
                    style={{ background:'none', border:'none', cursor:'pointer', padding:'2px 4px', color:BRAND, display:'flex', alignItems:'center' }}
                    onClick={refreshConsecutivo}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ animation: consecRefreshing ? 'bandeja-spin .4s linear' : undefined }}>
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                      <path d="M21 3v5h-5"/>
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                      <path d="M8 16H3v5"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            {/* Adjuntos y observaciones */}
            <div style={{ display:'flex', gap:10, marginTop:12 }}>
              <button onClick={()=>setShowArchivos(true)} style={{ height:32, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F, display:'flex', alignItems:'center', gap:7, color:'#0F0F0F' }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M11.5 6.5L6 12a3.5 3.5 0 01-5-5l5.5-5.5a2 2 0 012.8 2.8L4 9.5a.5.5 0 01-.7-.7L8.5 3.5"/></svg>
                Agregar archivos
                {archivos.length>0&&<span style={{ fontSize:11, color:BRAND, fontWeight:600 }}>{archivos.length} agregados</span>}
              </button>
              <button onClick={()=>setShowObs(true)} style={{ height:32, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F, display:'flex', alignItems:'center', gap:7, color:'#0F0F0F' }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M2 3h10M2 7h7M2 11h4"/></svg>
                Agregar observación
                {observacion&&<span style={{ fontSize:11, color:C.success, fontWeight:600 }}>Agregada</span>}
              </button>
            </div>
          </div>

          {/* Líneas del asiento */}
          <div style={{ flex:1, overflowY:'auto', padding:'14px 24px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <span style={{ fontSize:11, fontWeight:600, letterSpacing:'.06em', color:C.n700, textTransform:'uppercase' }}>LÍNEAS DEL ASIENTO</span>
              <button onClick={addLinea} style={{ height:30, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#fff', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>
                + Agregar línea
              </button>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
              <thead>
                <tr style={{ background:C.n200, borderBottom:`1px solid ${C.n500}` }}>
                  {['Cuenta','C.Costo','Operación','Documento','Descripción','','Debe','','Haber',''].map((h,i)=>{
                    // Debe/Haber (i=6,8) comparten el padding de la celda del input para que el rótulo
                    // quede alineado con el número de abajo; el ¢ (i=5,7,9) comparte el de su columna.
                    const pad = (i===6||i===8) ? '7px 2px' : (i===5||i===7||i===9) ? '7px 1px' : '7px 4px';
                    return (
                      <th key={i} style={{ padding:pad, textAlign:i>=5?'right':'left', fontWeight:500, color:'#757575', fontSize:11, whiteSpace:'nowrap' }}>
                        {(i===6||i===8) ? <div style={{ width:130, textAlign:'right', paddingRight:7, boxSizing:'border-box' }}>{h}</div> : h}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {lineasVisible.map(l=>(
                  <tr key={l.id} style={{ borderBottom:`1px solid #F5F5F5` }}>
                    <td style={NUM_COL}>
                      <CuentaLineaSelect value={l.cuenta} onChange={v=>setL(l.id,'cuenta',v)}/>
                    </td>
                    <td style={NUM_COL}>
                      <input value={l.cCostos} onChange={e=>setL(l.id,'cCostos',e.target.value)} placeholder="ADM"
                        style={{ width:70, height:30, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                    </td>
                    <td style={NUM_COL}>
                      <select style={{ width:90, height:30, padding:'0 6px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', appearance:'none' }}>
                        <option>-</option><option>Impuestos</option><option>Ventas</option><option>Compras</option>
                      </select>
                    </td>
                    <td style={NUM_COL}>
                      <input placeholder="N.° doc" style={{ width:90, height:30, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                    </td>
                    <td style={{ ...NUM_COL, flex:1 }}>
                      <input value={l.descripcion} onChange={e=>setL(l.id,'descripcion',e.target.value)} placeholder="Descripción…"
                        style={{ width:'100%', minWidth:120, height:30, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                    </td>
                    <td style={{ padding:'5px 1px', color:C.n700, fontSize:11, textAlign:'right', verticalAlign:'middle' }}>{MON_SYM[form.moneda]}</td>
                    <td style={{ padding:'5px 2px', verticalAlign:'middle' }}>
                      <MontoInput value={l.debe} onChange={v=>setL(l.id,'debe',v)}
                        style={{ width:130, height:30, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', textAlign:'right', boxSizing:'border-box' }}/>
                    </td>
                    <td style={{ padding:'5px 1px', color:C.n700, fontSize:11, textAlign:'right', verticalAlign:'middle' }}>{MON_SYM[form.moneda]}</td>
                    <td style={{ padding:'5px 2px', verticalAlign:'middle' }}>
                      <MontoInput value={l.haber} onChange={v=>setL(l.id,'haber',v)}
                        style={{ width:130, height:30, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', textAlign:'right', boxSizing:'border-box' }}/>
                    </td>
                    <td style={{ padding:'5px 4px' }}>
                      {lineas.length>2 && <button onClick={()=>removeLinea(l.id)} aria-label="Quitar línea" title="Quitar línea" style={{ background:'none',border:'none',cursor:'pointer',color:C.error, padding:'0 4px', display:'flex', alignItems:'center' }}>
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,4 12,4"/><path d="M5.33 4V2.67h3.34V4"/><path d="M11.33 4l-.67 8H3.34L2.67 4"/></svg>
                    </button>}
                    </td>
                  </tr>
                ))}
                <tr style={{ background:C.n200, borderTop:`2px solid ${C.n500}` }}>
                  <td colSpan={5} style={{ padding:'8px 8px', fontWeight:700, fontSize:12 }}>Totales</td>
                  {/* Mismo padding de celda (1px) y mismo ancho/padding interno (90 / 7px) que el símbolo
                      y el input de las líneas de arriba, para que quede alineado con esos valores. */}
                  <td style={{ padding:'8px 1px', textAlign:'right', color:C.n700, fontSize:11, verticalAlign:'middle' }}>{MON_SYM[form.moneda]}</td>
                  <td style={{ padding:'8px 2px', verticalAlign:'middle' }}>
                    <div style={{ width:130, paddingRight:7, boxSizing:'border-box', textAlign:'right', fontWeight:700, fontSize:13, color:'#0F0F0F', whiteSpace:'nowrap' }}>
                      {fmt2(totalDebe)}
                    </div>
                  </td>
                  <td style={{ padding:'8px 1px', textAlign:'right', color:C.n700, fontSize:11, verticalAlign:'middle' }}>{MON_SYM[form.moneda]}</td>
                  <td style={{ padding:'8px 2px', verticalAlign:'middle' }}>
                    <div style={{ width:130, paddingRight:7, boxSizing:'border-box', textAlign:'right', fontWeight:700, fontSize:13, color:'#0F0F0F', whiteSpace:'nowrap' }}>
                      {fmt2(totalHaber)}
                    </div>
                  </td>
                  <td/>
                </tr>
              </tbody>
            </table>
            {/* Paginación funcional si hay más de 10 líneas */}
            {lineas.length > LINEAS_POR_PAG && (
              <div style={{ marginTop:8 }}>
                <Pagination page={paginaLineas} pageSize={LINEAS_POR_PAG} total={lineas.length} onPageChange={setPaginaLineas}/>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ borderTop:`1px solid ${C.n500}`, padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, flexWrap:'wrap', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {/* Toggle programar asiento */}
              <Switch checked={programar} onChange={()=>setProgramar(v=>!v)} label="Programar asiento"/>
              {programar && (
                <button onClick={()=>setShowProg(true)} style={{ fontSize:12, color:BRAND, background:'none', border:'none', cursor:'pointer', fontFamily:F, textDecoration:'underline' }}>
                  Ver programación
                </button>
              )}
              {!camposCompletos && (
                <span style={{ fontSize:11, color:'#A07000' }}>⚠ Completá título y fecha para continuar</span>
              )}
              {camposCompletos && !balanceado && (
                <span style={{ fontSize:11, color:C.error }}>⚠ Desbalanceado: no se puede contabilizar ({simboloLocal()} {fmt2(diffBalance)} de diferencia)</span>
              )}
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              {/* Cancelar - ghost/texto, menor peso visual */}
              <button onClick={onClose} style={{ height:36, padding:'0 14px', border:'none', borderRadius:radius.md, background:'none', cursor:'pointer', fontSize:12, fontFamily:F, color:C.n700 }}>Cancelar</button>
              {/* Guardar como plantilla - secundario outline */}
              <button onClick={guardarComoPlantilla} style={{ height:36, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F, color:'#0F0F0F' }}>Guardar como plantilla</button>
              {/* Finalizar como pendiente - outline más marcado (color de marca) */}
              <button onClick={()=>handleSave(false)} disabled={!camposCompletos}
                style={{ height:36, padding:'0 16px', border:`1px solid ${BRAND}`, borderRadius:radius.md, background:'#fff', cursor:camposCompletos?'pointer':'default', fontSize:12, fontWeight:500, fontFamily:F, color:BRAND, opacity:camposCompletos?1:.5 }}>
                Finalizar como pendiente
              </button>
              {/* Contabilizar - primario, mayor peso visual, extremo derecho */}
              <button onClick={()=>handleSave(true)} disabled={!camposCompletos || !balanceado}
                title={!balanceado ? 'No se puede contabilizar: el asiento está desbalanceado' : undefined}
                style={{ height:36, padding:'0 20px', background:(camposCompletos&&balanceado)?BRAND:'#ccc', color:'#fff', border:'none', borderRadius:radius.md, cursor:(camposCompletos&&balanceado)?'pointer':'default', fontSize:12, fontWeight:500, fontFamily:F, display:'flex', alignItems:'center', gap:6 }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M2 7l3.5 3.5L12 3"/></svg>
                Contabilizar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Archivos - mismo componente de 2 estados (vacío/con archivos) que usa el drawer de detalle */}
      {showArchivos && (
        <ModalAdjuntos archivos={archivos} title="Adjuntar archivos"
          onSave={(a)=>{ setArchivos(a); setShowArchivos(false); }}
          onClose={()=>setShowArchivos(false)}/>
      )}

      {/* Modal Observaciones */}
      {showObs && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setShowObs(false)}>
          <div style={{ background:'#fff', borderRadius:radius.lg, width:440, padding:'20px', boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
            <p style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Observaciones</p>
            <textarea value={observacion} onChange={e=>setObservacion(e.target.value)} placeholder="Información adicional opcional…" rows={5}
              style={{ width:'100%', padding:'10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, resize:'vertical', outline:'none', boxSizing:'border-box', marginBottom:14 }}/>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={()=>setShowObs(false)} style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
              <button onClick={()=>setShowObs(false)} style={{ height:34, padding:'0 14px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Programar asiento */}
      {showProg && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setShowProg(false)}>
          <div style={{ background:'#fff', borderRadius:radius.lg, width:380, padding:'20px', boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
            <p style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Programar asiento</p>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Frecuencia <span style={{ color:C.error }}>*</span></label>
                <div style={{ position:'relative' }}>
                  <select defaultValue="Mensual" style={{ width:'100%', height:36, padding:'0 10px', paddingRight:28, border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', appearance:'none' }}>
                    <option>Diaria</option><option>Semanal</option><option>Quincenal</option>
                    <option>Mensual</option><option>Bimestral</option><option>Trimestral</option>
                    <option>Semestral</option><option>Anual</option>
                  </select>
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round" style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Primera ejecución <span style={{ color:C.error }}>*</span></label>
                <input type="date" defaultValue={hoy} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Finalización</label>
                <input type="date" defaultValue={hoy} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
              <button onClick={()=>setShowProg(false)} style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
              <button onClick={()=>setShowProg(false)} style={{ height:34, padding:'0 14px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// ── Confirm modals ─────────────────────────────────────────────────────────────
function AnularModal({ asientos, onConfirm, onClose }: { asientos:Asiento[]; onConfirm:(m:string)=>void; onClose:()=>void }) {
  const [motivo, setMotivo] = useState('');
  const n = asientos.length;
  const primero = asientos[0];
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1001, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:440, boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between' }}>
          <div>
            <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Confirmar anulación</p>
            <p style={{ fontSize:11, color:'#757575', margin:'3px 0 0' }}>
              {n>1 ? `${n} asientos seleccionados` : `${primero.consecutivo} · ${primero.titulo.slice(0,35)}`}
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" title="Cerrar" style={{ background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#757575' }}>×</button>
        </div>
        <div style={{ padding:'16px 20px' }}>
          <div style={{ padding:'10px 12px', background:C.errorBg, borderRadius:radius.md, border:`1px solid ${C.errorBorder}`, marginBottom:14 }}>
            <p style={{ fontSize:12, color:C.error, margin:0 }}>
              {n>1
                ? <>Vas a anular <strong style={{ fontFamily:F }}>{n} asientos</strong>. Quedarán en el registro de anulados.</>
                : <>Esta acción anulará el asiento <strong style={{ fontFamily:F }}>{primero.consecutivo}</strong>. Quedará en el registro de anulados.</>}
            </p>
          </div>
          <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:5 }}>Motivo <span style={{ color:C.error }}>*</span></label>
          <textarea value={motivo} onChange={e=>setMotivo(e.target.value)} rows={3} placeholder="Ej. Error en cuenta contable…"
            style={{ width:'100%', padding:'8px 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, resize:'vertical', outline:'none', boxSizing:'border-box' }}/>
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={()=>motivo.trim()&&onConfirm(motivo)} disabled={!motivo.trim()}
            style={{ height:34, padding:'0 16px', background:C.error, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F, opacity:motivo.trim()?1:.5 }}>
            {n>1 ? `Anular ${n} asientos` : 'Anular asiento'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de confirmación con preview - Contabilizar (individual o en masa) ────────
const CONTABILIZAR_GREEN = C.success;
function ContabilizarModal({ asientos, onConfirm, onClose }: { asientos:Asiento[]; onConfirm:()=>void; onClose:()=>void }) {
  const n = asientos.length;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1001, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:560, maxHeight:'80vh', display:'flex', flexDirection:'column', boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <p style={{ fontSize:16, fontWeight:600, margin:0 }}>Confirmar contabilización</p>
          <button onClick={onClose} aria-label="Cerrar" title="Cerrar"
            style={{ width:28, height:28, border:`1px solid ${C.n500}`, borderRadius:7, background:'#fff', cursor:'pointer', color:'#757575', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        <div style={{ overflowY:'auto', flex:1 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
            <thead style={{ position:'sticky', top:0, background:'#fff' }}>
              <tr style={{ borderBottom:`1px solid ${C.n500}` }}>
                <th style={{ padding:'10px 20px', textAlign:'left', fontWeight:500, color:'#757575', fontSize:11 }}>N.º Asiento</th>
                <th style={{ padding:'10px 20px', textAlign:'left', fontWeight:500, color:'#757575', fontSize:11 }}>Descripción</th>
                <th style={{ padding:'10px 20px', textAlign:'left', fontWeight:500, color:'#757575', fontSize:11 }}>Moneda</th>
                <th style={{ padding:'10px 20px', textAlign:'right', fontWeight:500, color:'#757575', fontSize:11 }}>Importe</th>
              </tr>
            </thead>
            <tbody>
              {asientos.map(a=>{
                const sym = MON_SYM[a.moneda];
                return (
                  <tr key={a.id} style={{ borderBottom:`1px solid #F5F5F5` }}>
                    <td style={{ padding:'10px 20px', color:BRAND, fontWeight:600, fontFamily:F }}>{a.consecutivo}</td>
                    <td style={{ padding:'10px 20px', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.titulo}</td>
                    <td style={{ padding:'10px 20px', color:'#0F0F0F' }}>{a.moneda}</td>
                    <td style={{ padding:'10px 20px', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                        <span style={{ color:'#757575' }}>{sym}</span>
                        <span style={{ fontWeight:500 }}>{fmt2(a.importe)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'14px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8, flexShrink:0 }}>
          <button onClick={onClose} style={{ height:36, padding:'0 18px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={onConfirm}
            style={{ height:36, padding:'0 18px', background:CONTABILIZAR_GREEN, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F, display:'flex', alignItems:'center', gap:6 }}>
            <IcCheck/> {n>1 ? `Contabilizar ${n} asientos` : 'Contabilizar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de confirmación genérico (Eliminar programación / plantilla) ─────────
function ConfirmModal({ title, message, onConfirm, onClose, confirmLabel='Eliminar' }: {
  title:string; message:string; onConfirm:()=>void; onClose:()=>void; confirmLabel?:string;
}) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1001, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:380, boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between' }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>{title}</p>
          <button onClick={onClose} aria-label="Cerrar" title="Cerrar" style={{ background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#757575' }}>×</button>
        </div>
        <div style={{ padding:'16px 20px' }}>
          <p style={{ fontSize:12, color:'#0F0F0F', margin:0 }}>{message}</p>
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={onConfirm} style={{ height:34, padding:'0 16px', background:C.error, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: editar programación ──────────────────────────────────────────────────
function dmyToIso(s: string) { const [d,m,y] = s.split('/'); return y&&m&&d ? `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` : ''; }
function isoToDmy(s: string) { if (!s) return ''; const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`; }

function EditProgramadoModal({ programado, onSave, onClose }: { programado:Programado; onSave:(nombre:string,frecuencia:string,proxima:string,moneda:Moneda)=>void; onClose:()=>void }) {
  const [nombre, setNombre] = useState(programado.nombre);
  const [frecuencia, setFrecuencia] = useState(programado.frecuencia);
  const [proximaIso, setProximaIso] = useState(dmyToIso(programado.proxima));
  const [moneda, setMoneda] = useState<Moneda>(programado.moneda);
  const FRECUENCIAS = ['Diaria','Semanal','Quincenal','Mensual','Bimestral','Trimestral','Semestral','Anual'];
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1001, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:400, boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between' }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Editar programación</p>
          <button onClick={onClose} aria-label="Cerrar" title="Cerrar" style={{ background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#757575' }}>×</button>
        </div>
        <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Nombre</label>
            <input value={nombre} onChange={e=>setNombre(e.target.value)} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Frecuencia</label>
              <select value={frecuencia} onChange={e=>setFrecuencia(e.target.value)} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}>
                {FRECUENCIAS.map(f=><option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Próxima ejecución</label>
              <input type="date" value={proximaIso} onChange={e=>setProximaIso(e.target.value)} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Moneda</label>
            <div style={{ display:'flex', gap:4 }}>
              {MONEDAS.map(m=>(
                <button key={m} onClick={()=>setMoneda(m)} style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:12, fontFamily:F, fontWeight:500, background:moneda===m?BRAND:C.n200, color:moneda===m?'#fff':'#0F0F0F' }}>
                  {MON_SYM[m]} {m}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={()=>onSave(nombre.trim()||programado.nombre, frecuencia, proximaIso?isoToDmy(proximaIso):programado.proxima, moneda)} style={{ height:34, padding:'0 16px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: editar plantilla - incluye las líneas reales, no solo nombre/moneda ──
function EditPlantillaModal({ plantilla, onSave, onClose }: { plantilla:Plantilla; onSave:(nombre:string,moneda:Moneda,lineas:LineaAsiento[])=>void; onClose:()=>void }) {
  const [nombre, setNombre] = useState(plantilla.nombre);
  const [moneda, setMoneda] = useState<Moneda>(plantilla.moneda);
  const [lineas, setLineas] = useState<LineaAsiento[]>(() => plantilla.lineas.length ? plantilla.lineas : [{ id:idTemporal(), cuenta:'', descripcion:'', cCostos:'', debe:0, haber:0 }]);

  function setL(id: number, k: keyof LineaAsiento, v: string|number) { setLineas(p=>p.map(l=>l.id===id?{...l,[k]:v}:l)); }
  function addLinea() { setLineas(p=>[...p,{ id:Date.now(), cuenta:'', descripcion:'', cCostos:'', debe:0, haber:0 }]); }
  function removeLinea(id: number) { setLineas(p=>p.length>1 ? p.filter(l=>l.id!==id) : p); }

  const totalDebe = lineas.reduce((s,l)=>s+l.debe,0);
  const totalHaber = lineas.reduce((s,l)=>s+l.haber,0);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1001, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:760, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between', flexShrink:0 }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Editar plantilla</p>
          <button onClick={onClose} aria-label="Cerrar" title="Cerrar" style={{ background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#757575' }}>×</button>
        </div>
        <div style={{ padding:'16px 20px', overflowY:'auto', flex:1 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 160px', gap:12, marginBottom:16 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Nombre</label>
              <input value={nombre} onChange={e=>setNombre(e.target.value)} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Moneda</label>
              <div style={{ display:'flex', gap:4 }}>
                {MONEDAS.map(m=>(
                  <button key={m} onClick={()=>setMoneda(m)} style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:12, fontFamily:F, fontWeight:500, background:moneda===m?BRAND:C.n200, color:moneda===m?'#fff':'#0F0F0F' }}>
                    {MON_SYM[m]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <p style={{ fontSize:12, fontWeight:600, margin:0 }}>Líneas de la plantilla ({lineas.length})</p>
            <button onClick={addLinea} style={{ height:28, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#fff', cursor:'pointer', fontSize:11, fontFamily:F, display:'flex', alignItems:'center', gap:4 }}><IcPlus/> Agregar línea</button>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${C.n500}` }}>
                <th style={{ padding:'6px 4px', textAlign:'left', fontSize:10, fontWeight:500, color:'#757575' }}>Cuenta</th>
                <th style={{ padding:'6px 4px', textAlign:'left', fontSize:10, fontWeight:500, color:'#757575' }}>Descripción</th>
                <th style={{ padding:'6px 4px', textAlign:'left', fontSize:10, fontWeight:500, color:'#757575', width:70 }}>C.C.</th>
                <th style={{ padding:'6px 4px', textAlign:'right', fontSize:10, fontWeight:500, color:'#757575', width:110 }}>Debe</th>
                <th style={{ padding:'6px 4px', textAlign:'right', fontSize:10, fontWeight:500, color:'#757575', width:110 }}>Haber</th>
                <th style={{ width:28 }}/>
              </tr>
            </thead>
            <tbody>
              {lineas.map(l=>(
                <tr key={l.id}>
                  <td style={{ padding:'4px 4px' }}><CuentaLineaSelect value={l.cuenta} onChange={v=>setL(l.id,'cuenta',v)}/></td>
                  <td style={{ padding:'4px 4px' }}>
                    <input value={l.descripcion} onChange={e=>setL(l.id,'descripcion',e.target.value)} placeholder="Descripción…"
                      style={{ width:'100%', height:30, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                  </td>
                  <td style={{ padding:'4px 4px' }}>
                    <input value={l.cCostos} onChange={e=>setL(l.id,'cCostos',e.target.value)} placeholder="-"
                      style={{ width:'100%', height:30, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                  </td>
                  <td style={{ padding:'4px 4px' }}>
                    <MontoInput value={l.debe} onChange={v=>setL(l.id,'debe',v)} style={{ width:'100%', height:30, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box', textAlign:'right' }}/>
                  </td>
                  <td style={{ padding:'4px 4px' }}>
                    <MontoInput value={l.haber} onChange={v=>setL(l.id,'haber',v)} style={{ width:'100%', height:30, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box', textAlign:'right' }}/>
                  </td>
                  <td style={{ padding:'4px 0', textAlign:'center' }}>
                    <button onClick={()=>removeLinea(l.id)} aria-label="Quitar línea" title="Quitar línea" disabled={lineas.length===1}
                      style={{ background:'none', border:'none', cursor:lineas.length===1?'default':'pointer', color:lineas.length===1?'#D0D0D0':C.error, fontSize:15, lineHeight:1 }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop:`1px solid ${C.n500}` }}>
                <td colSpan={3} style={{ padding:'6px 4px', textAlign:'right', fontSize:11, fontWeight:600, color:'#757575' }}>Totales</td>
                <td style={{ padding:'6px 4px', textAlign:'right', fontSize:11, fontWeight:600 }}>{fmt2(totalDebe)}</td>
                <td style={{ padding:'6px 4px', textAlign:'right', fontSize:11, fontWeight:600 }}>{fmt2(totalHaber)}</td>
                <td/>
              </tr>
            </tfoot>
          </table>
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8, flexShrink:0 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={()=>onSave(nombre.trim()||plantilla.nombre, moneda, lineas.filter(l=>l.cuenta.trim()||l.debe>0||l.haber>0))} style={{ height:34, padding:'0 16px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

// ── Modal: Exportar listado de la bandeja (preview + PDF/CSV) ──────────────────
function csvEscape(v: string) { return `"${String(v).replace(/"/g,'""')}"`; }

function ModalExportarListado({ rows, tabLabel, filtrosResumen, onClose }: {
  rows: Asiento[]; tabLabel: string; filtrosResumen: string[]; onClose:()=>void;
}) {
  const total = (m: 'CRC' | 'USD') => rows.filter(a => a.moneda === m).reduce((s, a) => s + a.importe, 0);
  return (
    <ExportListModal title={`Bandeja de asientos · ${tabLabel}`} subtitulo={filtrosResumen.join(' · ')} onClose={onClose}
      filename={`bandeja-asientos-${tabLabel.toLowerCase()}-${new Date().toISOString().slice(0, 10)}`}
      columns={[
        { key: 'tipo', label: 'Tipo' }, { key: 'origen', label: 'Origen' }, { key: 'fecha', label: 'Fecha' }, { key: 'consecutivo', label: 'N.º Asiento' },
        { key: 'titulo', label: 'Título' }, { key: 'moneda', label: 'Moneda' }, { key: 'importe', label: 'Importe', align: 'right' },
        { key: 'usuario', label: 'Usuario' }, { key: 'documento', label: 'Documento' },
      ]}
      rows={[
        ...rows.map(a => ({ tipo: TIPOS_LABEL[a.tipo], origen: a.origen, fecha: a.fecha, consecutivo: a.consecutivo, titulo: a.titulo, moneda: a.moneda,
          importe: `${MON_SYM[a.moneda]} ${fmt2(a.importe)}`, usuario: a.usuario, documento: a.documento })),
        ...(['CRC', 'USD'] as const).filter(m => total(m) > 0).map(m => ({ tipo: `Total ${m}`, origen: '', fecha: '', consecutivo: '', titulo: '', moneda: m,
          importe: `${MON_SYM[m]} ${fmt2(total(m))}`, usuario: '', documento: '' })),
      ]} />
  );
}

// ── Modal: Importar asiento ────────────────────────────────────────────────────
function ImportarAsientoModal({ onClose }: { onClose:()=>void }) {
  const [file, setFile] = useState<string|null>(null);
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1001, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:480, boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between' }}>
          <div>
            <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Importar asiento</p>
            <p style={{ fontSize:11, color:C.n700, margin:'3px 0 0' }}>El archivo debe seguir el formato de la plantilla descargable</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" title="Cerrar" style={{ background:'none',border:'none',cursor:'pointer',fontSize:18,color:C.n700 }}>×</button>
        </div>
        <div style={{ padding:'20px' }}>
          <label style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'32px 16px', border:`2px dashed ${C.n500}`, borderRadius:radius.md, cursor:'pointer', background:C.n200, marginBottom:14 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            <span style={{ fontSize:13, fontWeight:500, fontFamily:F }}>Arrastrá tu archivo aquí o hacé clic</span>
            <span style={{ fontSize:11, color:C.n700, fontFamily:F }}>Solo .xlsx o .csv - máximo 10 MB</span>
            <input type="file" accept=".xlsx,.csv" style={{ display:'none' }} onChange={e=>setFile(e.target.files?.[0]?.name||null)}/>
          </label>
          {file && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, marginBottom:14 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#1D9E75" strokeWidth="1.5"><path d="M9 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6L9 2z"/><path d="M9 2v4h4"/></svg>
              <span style={{ fontSize:12, flex:1, fontFamily:F }}>{file}</span>
              <button onClick={()=>setFile(null)} aria-label="Quitar archivo" title="Quitar archivo" style={{ background:'none',border:'none',cursor:'pointer',color:C.n700,fontSize:16 }}>×</button>
            </div>
          )}
          <button onClick={()=>{
              const headers = ['tipo','origen','fecha','titulo','moneda','importe','usuario','documento','cuenta','descripcion','centro_costo','debe','haber'];
              const blob = new Blob(['﻿'+headers.map(csvEscape).join(',')+'\n'], { type:'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url; link.download = 'plantilla-importar-asientos.csv';
              document.body.appendChild(link); link.click(); document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
            style={{ fontSize:12, color:BRAND, background:'none', border:'none', cursor:'pointer', fontFamily:F, textDecoration:'underline', display:'flex', alignItems:'center', gap:5 }}>
            <IcCopy/> Descargar plantilla
          </button>
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={onClose} disabled={!file}
            style={{ height:34, padding:'0 16px', background:file?BRAND:'#ccc', color:'#fff', border:'none', borderRadius:radius.md, cursor:file?'pointer':'default', fontSize:12, fontWeight:500, fontFamily:F }}>
            Importar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BandejaAsientos() {
  const [tab, setTab] = useState<'pendientes'|'anulados'|'programados'|'plantillas'>('pendientes');
  // Los asientos viven en la base (lib/asientosDb.ts): los de facturación y los de esta Bandeja
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [anulados, setAnulados] = useState<Asiento[]>([]);
  const [cargandoAsientos, setCargandoAsientos] = useState(true);
  useEffect(() => {
    let vivo = true;
    fetch('/api/asientos').then(r => r.json()).then((d: { activos: Asiento[]; anulados: Asiento[] }) => {
      if (!vivo) return;
      setAsientos(d.activos ?? []); setAnulados(d.anulados ?? []); setCargandoAsientos(false);
    }).catch(() => { if (vivo) setCargandoAsientos(false); });
    return () => { vivo = false; };
  }, []);
  const guardarCambio = (ids: number[], cambios: Record<string, unknown>) =>
    fetch('/api/asientos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, ...cambios }) }).catch(() => {});
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [cols, setCols] = useState(COLS_DEF);
  const [searchQ, setSearch] = useState('');

  // Filtros funcionales
  const [filtMoneda,  setFiltMoneda]  = useState<Set<string>>(new Set());
  const [filtTipo,    setFiltTipo]    = useState<Set<string>>(new Set());
  const [filtOrigen,  setFiltOrigen]  = useState<Set<string>>(new Set());
  const [filtUsuario, setFiltUsuario] = useState<Set<string>>(new Set());
  const [filtCC,      setFiltCC]      = useState<Set<string>>(new Set());
  const [filtDoc,     setFiltDoc]     = useState('');
  const [filtEstadoA, setFiltEstadoA] = useState<Set<string>>(new Set());
  const [filtFecha,   setFiltFecha]   = useState({ from:'', to:'' });
  const [filtImporte, setFiltImporte] = useState<ImporteRange>(IMPORTE_DEFAULT);

  // Filtros funcionales - Anulados (mismo patrón que Pendientes, con estado propio e independiente)
  const [searchQA,     setSearchA]     = useState('');
  const [filtMonedaA,  setFiltMonedaA]  = useState<Set<string>>(new Set());
  const [filtTipoA,    setFiltTipoA]    = useState<Set<string>>(new Set());
  const [filtOrigenA,  setFiltOrigenA]  = useState<Set<string>>(new Set());
  const [filtUsuarioA, setFiltUsuarioA] = useState<Set<string>>(new Set());
  const [filtFechaA,   setFiltFechaA]   = useState({ from:'', to:'' });
  const [filtImporteA, setFiltImporteA] = useState<ImporteRange>(IMPORTE_DEFAULT);

  // Paginación - Pendientes y Anulados
  const [porPagina,   setPorPagina]   = useState(10);
  const [pagina,      setPagina]      = useState(1);
  const [porPaginaA,  setPorPaginaA]  = useState(10);
  const [paginaA,     setPaginaA]     = useState(1);

  // Programados y Plantillas - lifted a estado para que sean editables/eliminables/usables
  const [programados, setProgramados] = useState<Programado[]>(PROGRAMADOS_INIT);
  const [plantillas,  setPlantillas]  = useState<Plantilla[]>(PLANTILLAS_INIT);
  // a Programados y Plantillas les faltaba su propia barra de
  // búsqueda (las demás pestañas ya la tienen) - un solo campo de texto,
  // sin los filtros avanzados de Pendientes/Anulados porque estas listas
  // son mucho más chicas y no los necesitan.
  const [searchProg,  setSearchProg]  = useState('');
  const [filtFrecuencia, setFiltFrecuencia] = useState<Set<string>>(new Set());
  const [soloActivos, setSoloActivos] = useState(false);
  const [searchPlant, setSearchPlant] = useState('');
  const [filtMonedaPlant, setFiltMonedaPlant] = useState<Set<string>>(new Set());
  const [editProgramado,  setEditProgramado]  = useState<Programado|null>(null);
  const [delProgramado,   setDelProgramado]   = useState<Programado|null>(null);
  const [editPlantilla,   setEditPlantilla]   = useState<Plantilla|null>(null);
  const [delPlantilla,    setDelPlantilla]    = useState<Plantilla|null>(null);
  const [crearInitial,    setCrearInitial]    = useState<CrearAsientoInitial|null>(null);

  // Drawers
  const [detalle,     setDetalle]     = useState<{ a:Asiento; anulado:boolean }|null>(null);
  // Enlace desde una venta o compra: /asientos?asiento=AUT00000033 abre su detalle
  const [enlaceAtendido, setEnlaceAtendido] = useState(false);
  if (!cargandoAsientos && !enlaceAtendido && typeof window !== 'undefined') {
    setEnlaceAtendido(true);
    const solicitud = new URLSearchParams(window.location.search).get('asiento');
    if (solicitud) {
      const coincide = (x: Asiento) => x.consecutivo === solicitud || String(x.id) === solicitud;
      const activo = asientos.find(coincide), anulado = anulados.find(coincide);
      if (activo) setDetalle({ a: activo, anulado: false });
      else if (anulado) { setTab('anulados'); setDetalle({ a: anulado, anulado: true }); }
    }
  }
  // Ya atendido el enlace, se quita de la dirección para que un recargar no lo vuelva a abrir
  useEffect(() => {
    if (enlaceAtendido && new URLSearchParams(window.location.search).has('asiento')) window.history.replaceState(null, '', window.location.pathname);
  }, [enlaceAtendido]);
  const [crearOpen,   setCrearOpen]   = useState(false);
  const [importarOpen, setImportarOpen] = useState(false);
  const [nuevoOpen,   setNuevoOpen]   = useState(false);
  const [exportarOpen, setExportarOpen] = useState(false);

  // Modales confirmación
  const [modalAnular,    setModalAnular]    = useState<Asiento[]|null>(null);
  const [modalContabilizar, setModalContabilizar] = useState<Asiento[]|null>(null);

  // Adjuntos y correo - acciones rápidas por fila
  const [modalAdjuntosRow, setModalAdjuntosRow] = useState<{ a:Asiento; anulado:boolean }|null>(null);
  const [modalCorreo,      setModalCorreo]      = useState<Asiento|null>(null);

  // Toasts
  const [toasts, setToasts] = useState<{id:number;type:ToastType;msg:string}[]>([]);
  const toastId = useRef(0);
  function addToast(msg: string, type: ToastType='success') {
    const id = ++toastId.current;
    setToasts(p=>[...p,{ id, type, msg }]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)), 4000);
  }

  // Filtered list
  const contabilizados = asientos.filter(a => a.contabilizado);
  // Para pendientes solo mostramos los NO contabilizados
  const pendientes = asientos.filter(a => !a.contabilizado).filter(a => {
    if (searchQ && !a.titulo.toLowerCase().includes(searchQ.toLowerCase()) && !a.consecutivo.includes(searchQ) && !a.usuario.includes(searchQ.toLowerCase()) && !a.documento.toLowerCase().includes(searchQ.toLowerCase())) return false;
    if (filtMoneda.size > 0  && !filtMoneda.has(a.moneda))         return false;
    if (filtTipo.size > 0    && !filtTipo.has(TIPOS_LABEL[a.tipo])) return false;
    if (filtOrigen.size > 0  && !filtOrigen.has(a.origen))         return false;
    if (filtUsuario.size > 0 && !filtUsuario.has(a.usuario))       return false;
    if (filtFecha.from && a.fecha < filtFecha.from) return false;
    if (filtFecha.to   && a.fecha > filtFecha.to)   return false;
    if ((filtImporte.min>0 || filtImporte.max<IMPORTE_MAX)) {
      if (a.moneda !== filtImporte.moneda) return false;
      if (a.importe < filtImporte.min || a.importe > filtImporte.max) return false;
    }

    return true;
  });

  const totalCRC = pendientes.filter(a=>a.moneda==='CRC').reduce((s,a)=>s+a.importe,0);
  const totalUSD = pendientes.filter(a=>a.moneda==='USD').reduce((s,a)=>s+a.importe,0);

  const origenesCounts = pendientes.reduce<Record<string,number>>((acc,a)=>{ acc[a.origen]=(acc[a.origen]??0)+1; return acc; }, {});

  // Anulados - filtros funcionales propios (mismo patrón que Pendientes)
  const anuladosFiltrados = anulados.filter(a => {
    if (searchQA && !a.titulo.toLowerCase().includes(searchQA.toLowerCase()) && !a.consecutivo.includes(searchQA) && !a.usuario.includes(searchQA.toLowerCase()) && !a.documento.toLowerCase().includes(searchQA.toLowerCase())) return false;
    if (filtMonedaA.size > 0  && !filtMonedaA.has(a.moneda))          return false;
    if (filtTipoA.size > 0    && !filtTipoA.has(TIPOS_LABEL[a.tipo])) return false;
    if (filtOrigenA.size > 0  && !filtOrigenA.has(a.origen))          return false;
    if (filtUsuarioA.size > 0 && !filtUsuarioA.has(a.usuario))        return false;
    if (filtFechaA.from && a.fecha < filtFechaA.from) return false;
    if (filtFechaA.to   && a.fecha > filtFechaA.to)   return false;
    if (filtImporteA.min>0 || filtImporteA.max<IMPORTE_MAX) {
      if (a.moneda !== filtImporteA.moneda) return false;
      if (a.importe < filtImporteA.min || a.importe > filtImporteA.max) return false;
    }
    return true;
  });
  const totalCRC_A = anuladosFiltrados.filter(a=>a.moneda==='CRC').reduce((s,a)=>s+a.importe,0);

  // Programados y Plantillas filtrados por su barra de búsqueda 
  const programadosFiltrados = programados.filter(p => {
    if (!(!searchProg || p.nombre.toLowerCase().includes(searchProg.toLowerCase()) || p.frecuencia.toLowerCase().includes(searchProg.toLowerCase()))) return false;
    if (filtFrecuencia.size > 0 && !filtFrecuencia.has(p.frecuencia)) return false;
    if (soloActivos && !p.activo) return false;
    return true;
  });
  const plantillasFiltradas = plantillas.filter(t => {
    if (!(!searchPlant || t.nombre.toLowerCase().includes(searchPlant.toLowerCase()))) return false;
    if (filtMonedaPlant.size > 0 && !filtMonedaPlant.has(t.moneda)) return false;
    return true;
  });

  // Al cambiar filtros o búsqueda se vuelve a la primera página
  const claveFiltros = JSON.stringify([searchQ, [...filtMoneda], [...filtTipo], [...filtOrigen], [...filtUsuario], filtFecha, filtImporte, [...filtCC]]);
  const claveFiltrosA = JSON.stringify([searchQA, [...filtMonedaA], [...filtTipoA], [...filtOrigenA], [...filtUsuarioA], filtFechaA, filtImporteA]);
  const [filtrosAnt, setFiltrosAnt] = useState(claveFiltros);
  const [filtrosAntA, setFiltrosAntA] = useState(claveFiltrosA);
  if (claveFiltros !== filtrosAnt) { setFiltrosAnt(claveFiltros); setPagina(1); }
  if (claveFiltrosA !== filtrosAntA) { setFiltrosAntA(claveFiltrosA); setPaginaA(1); }

  // Paginación aplicada
  const totalPagsP = Math.max(1, Math.ceil(pendientes.length / porPagina));
  const paginaClamp = Math.min(pagina, totalPagsP);
  const pendientesVisibles = pendientes.slice((paginaClamp-1)*porPagina, paginaClamp*porPagina);
  const totalPagsA = Math.max(1, Math.ceil(anuladosFiltrados.length / porPaginaA));
  const paginaAClamp = Math.min(paginaA, totalPagsA);
  const anuladosVisibles = anuladosFiltrados.slice((paginaAClamp-1)*porPaginaA, paginaAClamp*porPaginaA);

  // Asiento nuevo (creado, duplicado o importado): se guarda y toma el id de la base
  async function crearEnBase(a: Asiento) {
    setAsientos(p=>[a,...p]);
    const r = await fetch('/api/asientos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok && d.id) setAsientos(p=>p.map(x=>x===a?{...a,id:Number(d.id)}:x));
    else addToast(d.error ?? 'No se pudo guardar el asiento.', 'error');
  }
  function handleSelectAll(checked: boolean) { setSeleccion(checked?new Set(pendientes.map(a=>a.id)):new Set()); }
  function handleSelectOne(id: number) { setSeleccion(p=>{ const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; }); }

  function handleAnular(motivo: string, targets?: Asiento[]) {
    const items = targets ?? modalAnular ?? [];
    if (items.length === 0) return;
    const ids = new Set(items.map(a=>a.id));
    setAsientos(p=>p.filter(a=>!ids.has(a.id)));
    setAnulados(p=>[...p, ...items.map(a=>({...a, motivoAnulacion:motivo}))]);
    guardarCambio([...ids], { anulado: true, motivoAnulacion: motivo });
    addToast(items.length>1 ? `${items.length} asientos anulados.` : `Asiento ${items[0].consecutivo} anulado.`, 'warning');
    setModalAnular(null);
    setSeleccion(new Set());
    setDetalle(null);
  }
  function openDuplicar(a: Asiento) {
    setCrearInitial({
      titulo: a.titulo,
      moneda: a.moneda,
      lineas: a.lineas.map((l,i)=>({ ...l, id: Date.now()+i })),
      origen: a.origen,
      documento: a.documento,
      observacion: a.observacion,
      duplicadoDe: a.consecutivo,
    });
    setCrearOpen(true);
    setDetalle(null);
  }
  function handleEnviarCorreo(a: Asiento, email: string, mensaje: string) {
    addToast(`Asiento ${a.consecutivo} enviado por correo a ${email}.`, 'success');
    setModalCorreo(null);
  }
  // Contabilizar siempre pasa por ContabilizarModal (preview de los asientos afectados),
  // igual que Anular - sirve tanto para una fila individual como para selección masiva.
  function handleContabilizar(targets: Asiento[]) {
    if (targets.length === 0) return;
    const ids = new Set(targets.map(a=>a.id));
    setAsientos(p=>p.map(a=>ids.has(a.id)?{...a,contabilizado:true}:a));
    guardarCambio([...ids], { contabilizado: true });
    addToast(targets.length>1 ? `${targets.length} asientos contabilizados.` : `Asiento ${targets[0].consecutivo} contabilizado.`, 'success');
    setSeleccion(new Set());
    setModalContabilizar(null);
    if (detalle && ids.has(detalle.a.id)) setDetalle(p=>p?{...p,a:{...p.a,contabilizado:true}}:null);
  }
  function handleDescontabilizar(id: number) {
    setAsientos(p=>p.map(a=>a.id===id?{...a,contabilizado:false}:a));
    guardarCambio([id], { contabilizado: false });
    addToast('Asiento enviado a Pendientes.','info');
    if (detalle) setDetalle(p=>p?{...p,a:{...p.a,contabilizado:false}}:null);
  }
  async function handleRestaurar(a: Asiento) {
    // Se restaura solo si el servidor lo permite (un documento no puede tener dos asientos activos)
    const r = await fetch('/api/asientos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [a.id], anulado: false, motivoAnulacion: null }) }).catch(() => null);
    if (!r?.ok) { const d = await r?.json().catch(() => null); addToast(d?.error ?? 'No se pudo restaurar el asiento.', 'error'); return; }
    const resto: Asiento = { ...a, motivoAnulacion: undefined };
    setAnulados(p=>p.filter(x=>x.id!==a.id));
    setAsientos(p=>[...p, resto]);
    addToast(`Asiento ${a.consecutivo} restaurado.`,'info');
    setDetalle(null);
  }
  function handleUpdateArchivos(id: number, archivos: string[], isAnulado: boolean) {
    if (isAnulado) setAnulados(p=>p.map(a=>a.id===id?{...a,archivos}:a));
    else           setAsientos(p=>p.map(a=>a.id===id?{...a,archivos}:a));
    guardarCambio([id], { archivos });
    if (detalle && detalle.a.id===id) setDetalle(p=>p?{...p,a:{...p.a,archivos}}:null);
  }

  // Plantillas
  function handleSavePlantilla(p: Plantilla) { setPlantillas(prev=>[...prev, p]); }
  function handleUsarPlantilla(p: Plantilla) {
    setCrearInitial({ titulo:p.nombre, moneda:p.moneda, lineas:p.lineas });
    setCrearOpen(true);
  }
  function handleGuardarEditPlantilla(id: string, nombre: string, moneda: Moneda, lineas: LineaAsiento[]) {
    setPlantillas(prev=>prev.map(p=>p.id===id?{...p, nombre, moneda, lineas, cuentas:lineas.length, ultima:new Date().toLocaleDateString('es-CR')}:p));
    addToast('Plantilla actualizada.','success');
    setEditPlantilla(null);
  }
  function handleEliminarPlantilla(p: Plantilla) {
    setPlantillas(prev=>prev.filter(x=>x.id!==p.id));
    addToast(`Plantilla "${p.nombre}" eliminada.`,'warning');
    setDelPlantilla(null);
  }

  // Programados
  function handleToggleProgramado(id: string) {
    setProgramados(prev=>prev.map(p=>p.id===id?{...p, activo:!p.activo}:p));
  }
  function handleGuardarEditProgramado(id: string, nombre: string, frecuencia: string, proxima: string, moneda: Moneda) {
    setProgramados(prev=>prev.map(p=>p.id===id?{...p, nombre, frecuencia, proxima, moneda}:p));
    addToast('Programación actualizada.','success');
    setEditProgramado(null);
  }
  function handleEliminarProgramado(p: Programado) {
    setProgramados(prev=>prev.filter(x=>x.id!==p.id));
    addToast(`Programación "${p.nombre}" eliminada.`,'warning');
    setDelProgramado(null);
  }

  const visibles = cols.filter(c=>c.visible);
  const tieneSeleccion = seleccion.size > 0;

  // Resumen de filtros activos - se muestra en el modal de exportar de Pendientes
  const resumenFiltros: string[] = [];
  if (filtTipo.size)    resumenFiltros.push(`Tipo: ${[...filtTipo].join(', ')}`);
  if (filtFecha.from || filtFecha.to) resumenFiltros.push(`Fecha: ${filtFecha.from?fmtDMY(filtFecha.from):'…'} - ${filtFecha.to?fmtDMY(filtFecha.to):'…'}`);
  if (filtImporte.min>0 || filtImporte.max<IMPORTE_MAX) resumenFiltros.push(`Importe (${filtImporte.moneda}): ${MON_SYM[filtImporte.moneda]}${fmtInt(filtImporte.min)} – ${MON_SYM[filtImporte.moneda]}${fmtInt(filtImporte.max)}`);
  if (filtOrigen.size)  resumenFiltros.push(`Origen: ${[...filtOrigen].join(', ')}`);
  if (filtMoneda.size)  resumenFiltros.push(`Moneda: ${[...filtMoneda].join(', ')}`);
  if (filtUsuario.size) resumenFiltros.push(`Usuario: ${[...filtUsuario].join(', ')}`);
  if (filtCC.size)      resumenFiltros.push(`Centro de costos: ${[...filtCC].join(', ')}`);
  if (searchQ)          resumenFiltros.push(`Búsqueda: "${searchQ}"`);

  // Resumen de filtros activos - versión propia para el modal de exportar de Anulados
  const resumenFiltrosA: string[] = [];
  if (filtTipoA.size)    resumenFiltrosA.push(`Tipo: ${[...filtTipoA].join(', ')}`);
  if (filtFechaA.from || filtFechaA.to) resumenFiltrosA.push(`Fecha: ${filtFechaA.from?fmtDMY(filtFechaA.from):'…'} - ${filtFechaA.to?fmtDMY(filtFechaA.to):'…'}`);
  if (filtOrigenA.size)  resumenFiltrosA.push(`Origen: ${[...filtOrigenA].join(', ')}`);
  if (filtMonedaA.size)  resumenFiltrosA.push(`Moneda: ${[...filtMonedaA].join(', ')}`);
  if (filtUsuarioA.size) resumenFiltrosA.push(`Usuario: ${[...filtUsuarioA].join(', ')}`);
  if (filtImporteA.min>0 || filtImporteA.max<IMPORTE_MAX) resumenFiltrosA.push(`Importe (${filtImporteA.moneda}): ${MON_SYM[filtImporteA.moneda]}${fmtInt(filtImporteA.min)} – ${MON_SYM[filtImporteA.moneda]}${fmtInt(filtImporteA.max)}`);
  if (searchQA)          resumenFiltrosA.push(`Búsqueda: "${searchQA}"`);

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#F9F9F9' }}>
      {/* Accesibilidad: foco visible por teclado (restaura outline aun con estilos inline que lo desactivan) + animación de refresco */}
      <style>{`
        button:focus-visible, input:focus-visible, select:focus-visible, [role="switch"]:focus-visible, [tabindex]:focus-visible {
          outline: 2px solid ${BRAND} !important;
          outline-offset: 2px;
        }
        @keyframes bandeja-spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <PageHeader title="Bandeja de asientos">
        {(tab==='pendientes' || tab==='anulados') && (
          <BotonExportarUnico onClick={()=>setExportarOpen(true)}/>
        )}
        <div style={{ display:'flex', position:'relative' }}>
          <button onClick={()=>setCrearOpen(true)}
            style={{ height:32, padding:'0 12px', borderRadius:'4px 0 0 4px', background:BRAND, color:'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>
            Nuevo asiento
          </button>
          <button onClick={()=>setNuevoOpen(v=>!v)} aria-label="Más opciones para crear asiento" title="Más opciones para crear asiento"
            style={{ height:32, width:30, borderRadius:'0 4px 4px 0', background:BRAND, color:'#fff', border:'none', borderLeft:'1px solid rgba(255,255,255,.3)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg className="w-4 h-4" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
          </button>
          {nuevoOpen && (
            <div style={{ position:'absolute', top:'calc(100% + 4px)', right:0, zIndex:400, background:'#fff', border:`1px solid ${C.n500}`, borderRadius:radius.md, boxShadow:'0 4px 16px rgba(0,0,0,.12)', overflow:'hidden', minWidth:180 }}>
              <button onClick={()=>{ setNuevoOpen(false); setCrearOpen(true); }} style={{ display:'block', width:'100%', textAlign:'left', padding:'10px 16px', fontSize:12, border:'none', background:'none', cursor:'pointer', fontFamily:F }}>Crear asiento manual</button>
              <button onClick={()=>{ setNuevoOpen(false); setImportarOpen(true); }} style={{ display:'block', width:'100%', textAlign:'left', padding:'10px 16px', fontSize:12, border:'none', background:'none', cursor:'pointer', fontFamily:F }}>Importar asiento</button>
            </div>
          )}
        </div>
      </PageHeader>

      {/* Tabs */}
      <TabBar
        tabs={[
          { label:'Pendientes',  count:pendientes.length },
          { label:'Anulados',    count:anuladosFiltrados.length },
          { label:'Programados', count:programadosFiltrados.length },
          { label:'Plantillas',  count:plantillasFiltradas.length },
        ]}
        active={['pendientes','anulados','programados','plantillas'].indexOf(tab)}
        onChange={i=>setTab((['pendientes','anulados','programados','plantillas'] as const)[i])}
      />

      {tab==='pendientes' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Filtros */}
          <div style={{ background:'#fff', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px', display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap' }}>
            <SearchInput value={searchQ} onChange={setSearch} placeholder="Buscar asiento, título, N° documento…" width={300} />
            <FilterDropdown label="Tipo"           options={Object.values(TIPOS_LABEL)}    selected={filtTipo}   onApply={setFiltTipo}   onClear={()=>setFiltTipo(new Set())}/>
            <DateFilter     label="Fechas"         value={filtFecha}                       onChange={setFiltFecha} onClear={()=>setFiltFecha({from:'',to:''})}/>
            <FilterDropdown label="Origen"         options={ORIGENES}                      selected={filtOrigen} onApply={setFiltOrigen} onClear={()=>setFiltOrigen(new Set())}/>
            <FilterDropdown label="Moneda"         options={MONEDAS}                       selected={filtMoneda}  onApply={setFiltMoneda}  onClear={()=>setFiltMoneda(new Set())}/>
            <ImporteFilter  value={filtImporte}    onChange={setFiltImporte}               onClear={()=>setFiltImporte(IMPORTE_DEFAULT)}/>
            <FilterDropdown label="Centro de costos" options={['ADM','RST','SPA','MNT']}  selected={filtCC}  onApply={setFiltCC} onClear={()=>setFiltCC(new Set())}/>
            <FilterDropdown label="Usuario"        options={USUARIOS}                      selected={filtUsuario} onApply={setFiltUsuario} onClear={()=>setFiltUsuario(new Set())}/>

            {(filtMoneda.size||filtTipo.size||filtOrigen.size||filtUsuario.size||filtFecha.from||filtFecha.to||filtImporte.min>0||filtImporte.max<IMPORTE_MAX) ? (
              <button onClick={()=>{ setFiltMoneda(new Set());setFiltTipo(new Set());setFiltOrigen(new Set());setFiltUsuario(new Set());setFiltFecha({from:'',to:''});setFiltImporte(IMPORTE_DEFAULT);setFiltCC(new Set());setFiltDoc(''); }}
                style={{ height:28, padding:'0 10px', border:'none', background:C.errorBg, color:C.error, borderRadius:radius.sm, cursor:'pointer', fontSize:11, fontFamily:F }}>
                × Limpiar filtros
              </button>
            ) : null}
          </div>

          {/* Banner selección masiva - componente compartido BulkActionBar */}
          {tieneSeleccion && (
            <BulkActionBar count={seleccion.size} onClose={()=>setSeleccion(new Set())} actions={[
              { label:'Contabilizar', onClick:()=>{ if(seleccion.size>=1) setModalContabilizar(asientos.filter(a=>seleccion.has(a.id))); } },
              { label:'Anular', variant:'outline', onClick:()=>{ if(seleccion.size>=1) setModalAnular(asientos.filter(a=>seleccion.has(a.id))); } },
            ]}/>
          )}



          {/* Tabla */}
          <div style={{ flex:1, overflowY:'auto', background:'#fff' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
              <thead style={{ position:'sticky', top:0, zIndex:2, background:'#fff' }}>
                <tr style={{ borderBottom:`1px solid ${C.n500}` }}>
                  <th style={{ width:40, padding:'10px 12px' }}>
                    <input type="checkbox" checked={pendientes.length>0&&seleccion.size===pendientes.length} onChange={e=>handleSelectAll(e.target.checked)} style={{ width:14, height:14, accentColor:BRAND }}/>
                  </th>
                  {visibles.map(c=>(
                    <th key={c.id} style={{ padding:'10px 12px', textAlign:c.id==='importe'?'right':'left', fontWeight:500, color:'#757575', fontSize:11, whiteSpace:'nowrap' }}>{c.label}</th>
                  ))}
                  <th style={{ width:140, padding:'10px 8px', textAlign:'left', fontWeight:500, color:'#757575', fontSize:11 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.length===0 ? (
                  <tr><td colSpan={visibles.length+2} style={{ padding:40, textAlign:'center', color:'#757575', fontSize:12 }}>{cargandoAsientos ? 'Cargando asientos…' : 'Sin asientos con los filtros actuales.'}</td></tr>
                ) : pendientesVisibles.map(a=>{
                  const isSel = seleccion.has(a.id);
                  const sym   = MON_SYM[a.moneda];
                  return (
                    <tr key={a.id} onClick={()=>setDetalle({a,anulado:false})}
                      style={{ borderBottom:`1px solid #F5F5F5`, cursor:'pointer', background:isSel?C.brandBg:'#fff', transition:'background .1s' }}
                      onMouseEnter={e=>!isSel&&(e.currentTarget.style.background='#FAFAFA')}
                      onMouseLeave={e=>!isSel&&(e.currentTarget.style.background='#fff')}>
                      <td onClick={e=>e.stopPropagation()} style={{ padding:'8px 12px' }}>
                        <input type="checkbox" checked={isSel} onChange={()=>handleSelectOne(a.id)} style={{ width:14, height:14, accentColor:BRAND }}/>
                      </td>
                      {visibles.map(c=>{
                        if (c.id==='tipo')        return <td key={c.id} style={{ padding:'8px 12px' }}><TipoPill tipo={a.tipo}/></td>;
                        if (c.id==='origen')      return <td key={c.id} style={{ padding:'8px 12px', color:'#0F0F0F' }}>{a.origen}</td>;
                        if (c.id==='fecha')       return <td key={c.id} style={{ padding:'8px 12px', color:'#0F0F0F', whiteSpace:'nowrap' }}>{a.fecha.split('-').reverse().join('/')}</td>;
                        if (c.id==='consecutivo') return <td key={c.id} style={{ padding:'8px 12px' }}><span style={{ color:BRAND, fontFamily:F, fontWeight:500 }}>{a.consecutivo}</span></td>;
                        if (c.id==='titulo')      return <td key={c.id} style={{ padding:'8px 12px', maxWidth:280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.titulo}</td>;
                        if (c.id==='moneda')      return <td key={c.id} style={{ padding:'8px 12px' }}><span style={{ fontSize:11, padding:'2px 7px', borderRadius:4, background:'#F5F5F5' }}>{a.moneda} {sym}</span></td>;
                        if (c.id==='importe')     return (
                          <td key={c.id} style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', gap:8, minWidth:100 }}>
                              <span style={{ color:'#757575', flexShrink:0 }}>{sym}</span>
                              <span style={{ fontWeight:500, textAlign:'right', flex:1 }}>{fmt2(a.importe)}</span>
                            </div>
                          </td>
                        );
                        if (c.id==='usuario')     return <td key={c.id} style={{ padding:'8px 12px', color:'#757575' }}>{a.usuario}</td>;
                        if (c.id==='documento')   return <td key={c.id} style={{ padding:'8px 12px', color:'#757575', fontFamily:F }}>{a.documento}</td>;
                        if (c.id==='observacion') return <td key={c.id} style={{ padding:'8px 12px', color:'#757575', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.observacion}</td>;
                        return <td key={c.id}/>;
                      })}
                      {/* Acciones rápidas de fila - el detalle/edición completa vive en el drawer de detalle */}
                      <td onClick={e=>e.stopPropagation()} style={{ padding:'6px 8px' }}>
                        <div style={{ display:'flex', gap:2 }}>
                          <ActBtn label="Contabilizar" onClick={e=>{ e.stopPropagation(); setModalContabilizar([a]); }}><IcCheck/></ActBtn>
                          <ActBtn label="Adjuntos" onClick={e=>{ e.stopPropagation(); setModalAdjuntosRow({a,anulado:false}); }}><IcClip/></ActBtn>
                          <ActBtn label="Duplicar" onClick={e=>{ e.stopPropagation(); openDuplicar(a); }}><IcCopy/></ActBtn>
                          <ActBtn label="Enviar por correo" onClick={e=>{ e.stopPropagation(); setModalCorreo(a); }}><IcMail/></ActBtn>
                          <ActBtn label="Anular" danger onClick={e=>{ e.stopPropagation(); setModalAnular([a]); }}><IcBan/></ActBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* 5. Totales al final alineados con columna importe */}
              {pendientes.length > 0 && (
                <tfoot>
                  <tr style={{ background:'#F9F9F9', borderTop:`2px solid ${C.n500}` }}>
                    <td/>
                    {visibles.map(col => {
                      if (col.id === 'titulo') return <td key={col.id} style={{ padding:'9px 12px', fontWeight:600, fontSize:12 }}>Totales</td>;
                      if (col.id === 'importe') return (
                        <td key={col.id} style={{ padding:'9px 12px', whiteSpace:'nowrap' }}>
                          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                            {totalCRC > 0 && <div style={{ display:'flex', justifyContent:'space-between', gap:8, minWidth:100 }}><span style={{ color:'#757575', fontSize:11 }}>{simboloLocal()}</span><span style={{ fontWeight:700, fontSize:12 }}>{fmt2(totalCRC)}</span></div>}
                            {totalUSD > 0 && <div style={{ display:'flex', justifyContent:'space-between', gap:8, minWidth:100 }}><span style={{ color:'#757575', fontSize:11 }}>$</span><span style={{ fontWeight:700, fontSize:12 }}>{fmt2(totalUSD)}</span></div>}
                          </div>
                        </td>
                      );
                      return <td key={col.id}/>;
                    })}
                    <td/>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {/* Footer */}
          <PaginationFooter total={pendientes.length} porPagina={porPagina} setPorPagina={setPorPagina} pagina={pagina} setPagina={setPagina}/>
        </div>
      )}

      {tab==='anulados' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Filtros - estado propio e independiente de Pendientes */}
          <div style={{ background:'#fff', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px', display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap' }}>
            <SearchInput value={searchQA} onChange={setSearchA} placeholder="Buscar…" width={200} />
            <FilterDropdown label="Tipo"    options={Object.values(TIPOS_LABEL)} selected={filtTipoA}    onApply={setFiltTipoA}    onClear={()=>setFiltTipoA(new Set())}/>
            <DateFilter     label="Fechas"  value={filtFechaA}                   onChange={setFiltFechaA} onClear={()=>setFiltFechaA({from:'',to:''})}/>
            <FilterDropdown label="Origen"  options={ORIGENES}                   selected={filtOrigenA}  onApply={setFiltOrigenA}  onClear={()=>setFiltOrigenA(new Set())}/>
            <FilterDropdown label="Moneda"  options={MONEDAS}                    selected={filtMonedaA}  onApply={setFiltMonedaA}  onClear={()=>setFiltMonedaA(new Set())}/>
            <ImporteFilter  value={filtImporteA} onChange={setFiltImporteA}      onClear={()=>setFiltImporteA(IMPORTE_DEFAULT)}/>
            <FilterDropdown label="Usuario" options={USUARIOS}                   selected={filtUsuarioA} onApply={setFiltUsuarioA} onClear={()=>setFiltUsuarioA(new Set())}/>

            {(filtTipoA.size||filtOrigenA.size||filtMonedaA.size||filtUsuarioA.size||filtFechaA.from||filtFechaA.to||filtImporteA.min>0||filtImporteA.max<IMPORTE_MAX||searchQA) ? (
              <button onClick={()=>{ setFiltTipoA(new Set());setFiltOrigenA(new Set());setFiltMonedaA(new Set());setFiltUsuarioA(new Set());setFiltFechaA({from:'',to:''});setFiltImporteA(IMPORTE_DEFAULT);setSearchA(''); }}
                style={{ height:28, padding:'0 10px', border:'none', background:C.errorBg, color:C.error, borderRadius:radius.sm, cursor:'pointer', fontSize:11, fontFamily:F }}>
                × Limpiar filtros
              </button>
            ) : null}
          </div>
          <div style={{ flex:1, overflowY:'auto', background:'#fff' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
              <thead><tr style={{ background:'#fff', borderBottom:`1px solid ${C.n500}` }}>
                {['Tipo','Origen','Fecha','N.º Asiento','Título','Moneda','Importe','Usuario','Acciones'].map(h=>(
                  <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:500, color:'#757575', fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {anuladosVisibles.map(a=>{
                  const sym = MON_SYM[a.moneda];
                  return (
                    <tr key={a.id} onClick={()=>setDetalle({a,anulado:true})} style={{ borderBottom:`1px solid #F5F5F5`, cursor:'pointer' }}
                      onMouseEnter={e=>(e.currentTarget.style.background='#FAFAFA')} onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>
                      <td style={{ padding:'8px 12px' }}><TipoPill tipo={a.tipo}/></td>
                      <td style={{ padding:'8px 12px', color:'#0F0F0F' }}>{a.origen}</td>
                      <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>{a.fecha.split('-').reverse().join('/')}</td>
                      <td style={{ padding:'8px 12px' }}><span style={{ color:BRAND, fontFamily:F, fontWeight:600 }}>{a.consecutivo}</span></td>
                      <td style={{ padding:'8px 12px', maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.titulo}</td>
                      <td style={{ padding:'8px 12px' }}><span style={{ fontSize:11, padding:'2px 7px', borderRadius:4, background:'#F5F5F5' }}>{a.moneda} {sym}</span></td>
                      <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', gap:8, minWidth:100 }}>
                          <span style={{ color:'#757575' }}>{sym}</span>
                          <span style={{ fontWeight:500 }}>{fmt2(a.importe)}</span>
                        </div>
                      </td>
                      <td style={{ padding:'8px 12px', color:'#757575' }}>{a.usuario}</td>
                      {/* Acciones - solo Restaurar; el motivo de anulación ya se ve al abrir el drawer con clic en la fila */}
                      <td onClick={e=>e.stopPropagation()} style={{ padding:'6px 8px' }}>
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={e=>{e.stopPropagation();handleRestaurar(a);}}
                            aria-label="Restaurar asiento" title="Restaurar asiento"
                            style={{ height:26, padding:'0 8px', fontSize:11, color:C.success, background:'rgba(29,158,117,.08)', border:'1px solid rgba(29,158,117,.25)', borderRadius:5, cursor:'pointer', fontFamily:F }}>
                            ↺ Restaurar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {anuladosFiltrados.length===0 && <tr><td colSpan={9} style={{ padding:40, textAlign:'center', color:'#757575', fontSize:12 }}>Sin asientos anulados con los filtros actuales.</td></tr>}
              </tbody>
              {anuladosFiltrados.length > 0 && (
                <tfoot>
                  <tr style={{ background:'#F9F9F9', borderTop:`2px solid ${C.n500}` }}>
                    <td colSpan={5} style={{ padding:'9px 12px', fontWeight:600, fontSize:12 }}>Totales</td>
                    <td/>
                    <td style={{ padding:'9px 12px', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:8, minWidth:100 }}>
                        <span style={{ color:'#757575', fontSize:11 }}>{simboloLocal()}</span>
                        <span style={{ fontWeight:700, fontSize:12 }}>{fmt2(totalCRC_A)}</span>
                      </div>
                    </td>
                    <td colSpan={2}/>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <PaginationFooter total={anuladosFiltrados.length} porPagina={porPaginaA} setPorPagina={setPorPaginaA} pagina={paginaA} setPagina={setPaginaA}/>
        </div>
      )}

      {tab==='programados' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* barra de búsqueda */}
          <div style={{ background:'#fff', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px', display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap' }}>
            <SearchInput value={searchProg} onChange={setSearchProg} placeholder="Buscar por nombre o frecuencia…" width={300} />
            <FilterDropdown label="Frecuencia" options={Array.from(new Set(programados.map(p=>p.frecuencia)))} selected={filtFrecuencia} onApply={setFiltFrecuencia} onClear={()=>setFiltFrecuencia(new Set())}/>
            <Checkbox label="Mostrar activos" checked={soloActivos} onChange={setSoloActivos} />
            {(searchProg || filtFrecuencia.size>0 || soloActivos) && (
              <button onClick={()=>{ setSearchProg(''); setFiltFrecuencia(new Set()); setSoloActivos(false); }}
                style={{ height:28, padding:'0 10px', border:'none', background:C.errorBg, color:C.error, borderRadius:radius.sm, cursor:'pointer', fontSize:11, fontFamily:F }}>
                × Limpiar
              </button>
            )}
          </div>
          <div style={{ flex:1, overflowY:'auto', background:'#fff' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
            <thead><tr style={{ borderBottom:`1px solid ${C.n500}` }}>
              {['Nombre','Frecuencia','Próxima ejecución','Moneda','Activo','Acciones'].map(h=>(
                <th key={h} style={{ padding:'10px 20px', textAlign:'left', fontWeight:500, color:'#757575', fontSize:11 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {programadosFiltrados.map(p=>(
                <tr key={p.id} style={{ borderBottom:`1px solid #F5F5F5` }} onMouseEnter={e=>(e.currentTarget.style.background='#FAFAFA')} onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>
                  <td style={{ padding:'12px 20px', color:'#0F0F0F' }}>{p.nombre}</td>
                  <td style={{ padding:'12px 20px', color:'#757575' }}>{p.frecuencia}</td>
                  <td style={{ padding:'12px 20px', color:'#0F0F0F' }}>{p.proxima}</td>
                  <td style={{ padding:'12px 20px' }}><span style={{ fontSize:11, padding:'2px 7px', borderRadius:4, background:'#F5F5F5' }}>{p.moneda} {simboloLocal()}</span></td>
                  <td style={{ padding:'12px 20px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div onClick={()=>handleToggleProgramado(p.id)} role="switch" aria-checked={p.activo}
                        aria-label={`${p.activo?'Desactivar':'Activar'} programación ${p.nombre}`} tabIndex={0}
                        onKeyDown={e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); handleToggleProgramado(p.id); } }}
                        style={{ width:36, height:20, borderRadius:10, background:p.activo?BRAND:'#E0E0E0', position:'relative', cursor:'pointer' }}>
                        <span style={{ position:'absolute', width:14, height:14, borderRadius:'50%', background:'#fff', top:3, left:p.activo?18:3, transition:'left .15s' }}/>
                      </div>
                      <span style={{ fontSize:11, color:p.activo?BRAND:'#757575' }}>{p.activo?'Activo':'Inactivo'}</span>
                    </div>
                  </td>
                  <td style={{ padding:'12px 20px' }}>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={()=>setEditProgramado(p)} style={{ fontSize:11, color:'#0F0F0F', background:'none', border:`1px solid ${C.n500}`, borderRadius:radius.sm, padding:'3px 10px', cursor:'pointer', fontFamily:F }}>Editar</button>
                      <button onClick={()=>setDelProgramado(p)} style={{ fontSize:11, color:C.error, background:'none', border:'none', cursor:'pointer', fontFamily:F }}>✕ Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {programadosFiltrados.length===0 && (
                <tr><td colSpan={6} style={{ padding:40, textAlign:'center', color:'#757575', fontSize:12 }}>
                  {searchProg ? 'Sin resultados para tu búsqueda.' : 'Sin asientos programados.'}
                </td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {tab==='plantillas' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* barra de búsqueda */}
          <div style={{ background:'#fff', borderBottom:`1px solid ${C.n500}`, padding:'8px 24px', display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap' }}>
            <SearchInput value={searchPlant} onChange={setSearchPlant} placeholder="Buscar por nombre de plantilla…" width={300} />
            <FilterDropdown label="Moneda" options={MONEDAS} selected={filtMonedaPlant} onApply={setFiltMonedaPlant} onClear={()=>setFiltMonedaPlant(new Set())}/>
            {(searchPlant || filtMonedaPlant.size>0) && (
              <button onClick={()=>{ setSearchPlant(''); setFiltMonedaPlant(new Set()); }}
                style={{ height:28, padding:'0 10px', border:'none', background:C.errorBg, color:C.error, borderRadius:radius.sm, cursor:'pointer', fontSize:11, fontFamily:F }}>
                × Limpiar
              </button>
            )}
          </div>
          <div style={{ flex:1, overflowY:'auto', background:'#fff' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
            <thead><tr style={{ borderBottom:`1px solid ${C.n500}` }}>
              {['Nombre','N.º cuentas','Moneda','Última modificación','Acciones'].map(h=>(
                <th key={h} style={{ padding:'10px 20px', textAlign:'left', fontWeight:500, color:'#757575', fontSize:11 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {plantillasFiltradas.map(t=>(
                <tr key={t.id} style={{ borderBottom:`1px solid #F5F5F5` }} onMouseEnter={e=>(e.currentTarget.style.background='#FAFAFA')} onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>
                  <td style={{ padding:'12px 20px', fontWeight:500 }}>{t.nombre}</td>
                  <td style={{ padding:'12px 20px', color:'#757575' }}>{t.cuentas}</td>
                  <td style={{ padding:'12px 20px' }}><span style={{ fontSize:11, padding:'2px 7px', borderRadius:4, background:'#F5F5F5' }}>{t.moneda} {MON_SYM[t.moneda]}</span></td>
                  <td style={{ padding:'12px 20px', color:'#757575' }}>{t.ultima}</td>
                  <td style={{ padding:'12px 20px' }}>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={()=>handleUsarPlantilla(t)} style={{ fontSize:11, border:`1px solid ${C.n500}`, borderRadius:radius.sm, padding:'3px 10px', cursor:'pointer', background:'#fff', fontFamily:F }}>Usar</button>
                      <button onClick={()=>setEditPlantilla(t)} style={{ fontSize:11, border:`1px solid ${C.n500}`, borderRadius:radius.sm, padding:'3px 10px', cursor:'pointer', background:'#fff', fontFamily:F }}>Editar</button>
                      <button onClick={()=>setDelPlantilla(t)} style={{ fontSize:11, color:C.error, background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {plantillasFiltradas.length===0 && (
                <tr><td colSpan={5} style={{ padding:40, textAlign:'center', color:'#757575', fontSize:12 }}>
                  {searchPlant ? 'Sin resultados para tu búsqueda.' : 'Sin plantillas guardadas.'}
                </td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Drawers */}
      {detalle && (
        <DetalleDrawer
          asiento={detalle.a} anulado={detalle.anulado}
          onClose={()=>setDetalle(null)}
          onAnular={()=>{ setModalAnular([detalle.a]); }}
          onDuplicar={()=>openDuplicar(detalle.a)}
          onContabilizar={()=>setModalContabilizar([detalle.a])}
          onRestaurar={()=>handleRestaurar(detalle.a)}
          onUpdateArchivos={(archivos)=>handleUpdateArchivos(detalle.a.id, archivos, detalle.anulado)}
        />
      )}
      {importarOpen && <ImportarAsientoModal onClose={()=>setImportarOpen(false)}/>}
      {exportarOpen && (
        <ModalExportarListado
          rows={tab==='anulados' ? anuladosFiltrados : pendientes}
          tabLabel={tab==='anulados' ? 'Anulados' : 'Pendientes'}
          filtrosResumen={tab==='anulados' ? resumenFiltrosA : resumenFiltros}
          onClose={()=>setExportarOpen(false)}
        />
      )}
      {crearOpen && (
        <CrearAsientoDrawer
          asientos={asientos}
          plantillas={plantillas}
          onSavePlantilla={handleSavePlantilla}
          onToast={addToast}
          initial={crearInitial}
          onClose={()=>{ setCrearOpen(false); setCrearInitial(null); }}
          onSave={a=>{ crearEnBase(a); setCrearOpen(false); setCrearInitial(null); addToast(`Asiento ${a.consecutivo} ${a.contabilizado?'creado y contabilizado':'creado como pendiente'}.`,'success'); }}
        />
      )}

      {/* Modales confirmación */}
      {modalAnular    && <AnularModal    asientos={modalAnular}    onConfirm={m=>handleAnular(m)} onClose={()=>setModalAnular(null)}/>}
      {modalContabilizar && <ContabilizarModal asientos={modalContabilizar} onConfirm={()=>handleContabilizar(modalContabilizar)} onClose={()=>setModalContabilizar(null)}/>}

      {/* Adjuntos y correo - acciones rápidas por fila */}
      {modalAdjuntosRow && (
        <ModalAdjuntos archivos={modalAdjuntosRow.a.archivos ?? []}
          onSave={(archivos)=>{ handleUpdateArchivos(modalAdjuntosRow.a.id, archivos, modalAdjuntosRow.anulado); addToast('Adjuntos actualizados.','success'); setModalAdjuntosRow(null); }}
          onClose={()=>setModalAdjuntosRow(null)}/>
      )}
      {modalCorreo && (
        <ModalEnviarCorreo subtitulo={`Asiento ${modalCorreo.consecutivo} · ${modalCorreo.titulo}`}
          adjuntos={[{ id: 'pdf', label: 'Asiento en PDF', marcado: true }]}
          onEnviar={({ para, mensaje })=>handleEnviarCorreo(modalCorreo, para.join(', '), mensaje)}
          onClose={()=>setModalCorreo(null)}/>
      )}

      {/* Modales Programados / Plantillas */}
      {editProgramado && (
        <EditProgramadoModal programado={editProgramado}
          onSave={(nombre,frecuencia,proxima,moneda)=>handleGuardarEditProgramado(editProgramado.id, nombre, frecuencia, proxima, moneda)}
          onClose={()=>setEditProgramado(null)}/>
      )}
      {delProgramado && (
        <ConfirmModal title="Eliminar programación" confirmLabel="Eliminar"
          message={`¿Seguro que querés eliminar la programación "${delProgramado.nombre}"? Esta acción no se puede deshacer.`}
          onConfirm={()=>handleEliminarProgramado(delProgramado)} onClose={()=>setDelProgramado(null)}/>
      )}
      {editPlantilla && (
        <EditPlantillaModal plantilla={editPlantilla}
          onSave={(nombre,moneda,lineas)=>handleGuardarEditPlantilla(editPlantilla.id, nombre, moneda, lineas)}
          onClose={()=>setEditPlantilla(null)}/>
      )}
      {delPlantilla && (
        <ConfirmModal title="Eliminar plantilla" confirmLabel="Eliminar"
          message={`¿Seguro que querés eliminar la plantilla "${delPlantilla.nombre}"? Esta acción no se puede deshacer.`}
          onConfirm={()=>handleEliminarPlantilla(delPlantilla)} onClose={()=>setDelPlantilla(null)}/>
      )}

      <ToastContainer toasts={toasts} onDismiss={id=>setToasts(p=>p.filter(t=>t.id!==id))}/>
    </div>
  );
}
