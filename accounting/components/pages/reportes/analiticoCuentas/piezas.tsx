'use client';
import React, { useState, useRef, useEffect } from 'react';
import { C, radius, shadow } from '../../../ui/tokens';
import { Monto } from '../../../ui/montos';
import { IcDescontabilizar } from '../../asientos/DescontabilizarModal';
import { BRAND, type Cuenta, ESTADO_STYLE, type EstadoMov, F, type Movimiento, TIPO_CONFIG, type TipoMov, fmt2 } from './datos';

// ── Shared UI ─────────────────────────────────────────────────────────────────
export function TipoPill({ tipo }: { tipo: TipoMov }) {
  const cfg = TIPO_CONFIG[tipo];
  return (
    <span style={{ width:28, height:28, borderRadius:7, display:'inline-flex', alignItems:'center',
      justifyContent:'center', background:cfg.bg, color:cfg.color, fontSize:12, fontWeight:600, fontFamily:F, flexShrink:0 }}>
      {tipo}
    </span>
  );
}
export function EstadoBadge({ estado }: { estado: EstadoMov }) {
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
export function ActIc({ label, children, onClick }: { label:string; children:React.ReactNode; onClick?:()=>void }) {
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
          background:'#0F0F0F', color:'#FFFFFF', fontSize:10, fontFamily:F, padding:'3px 7px',
          borderRadius:4, whiteSpace:'nowrap', pointerEvents:'none', zIndex:9999 }}>
          {label}
        </div>
      )}
    </div>
  );
}
export const IcEye  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>;
export const IcPrint = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6V2h8v4"/><rect x="2" y="6" width="12" height="6" rx="1"/><path d="M4 12v2h8v-2"/></svg>;
export const IcLoop = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>;
export const IcCopy = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3h8"/></svg>;
export const IcBan  = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="8" r="6.33"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5"/></svg>;
export function ActionIcons({ mov, onDescontabilizar }: { mov: Movimiento; onDescontabilizar: (m:Movimiento)=>void }) {
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
export function SaldoRow({ label, sym, valor, colSpan, mostrarColAux, mostrarColCuenta }: {
  label:string; sym:string; valor:number; colSpan:number; mostrarColAux?:boolean; mostrarColCuenta?:boolean;
}) {
  // Count columns before Debe: checkbox(1)+tipo(1)+fecha(1)+asiento(1)+desc(1)+estado(1)+[aux]+modulo(1)+doc(1) = 8 base + aux
  const baseColsBefore = 8 + (mostrarColAux?1:0) + (mostrarColCuenta?1:0);
  return (
    <tr style={{ background:'#F9F9F9', borderTop:`1px solid ${C.n500}`, borderBottom:`1px solid ${C.n500}` }}>
      <td colSpan={baseColsBefore} style={{ padding:'8px 12px', textAlign:'right', fontSize:11, fontWeight:600, color:'#757575', fontFamily:F }}>
        {label}
      </td>
      <td colSpan={2} style={{ padding:'8px 12px', textAlign:'center', whiteSpace:'nowrap' }}>
        <div style={{ display:'inline-flex', alignItems:'baseline', gap:3 }}>
          <span style={{ color:'#757575', fontSize:11, fontFamily:F }}>{sym}</span>
          <span style={{ fontSize:12, fontWeight:600, color:'#0F0F0F', fontFamily:F }}>{fmt2(valor)}</span>
        </div>
      </td>
      <td/>
    </tr>
  );
}
// Issue #17: el "totalizado" (suma de Debe y de Haber de los movimientos
// visibles) antes solo aparecía cuando había una cuenta seleccionada - al ver
// "todas las cuentas" desaparecía por completo. Ahora es siempre visible, y
// muestra el Debe y el Haber en columnas separadas (Issue #17: la sumatoria
// del Debe y la del Haber son distintas salvo que la selección esté balanceada).
export function TotalizadoRow({ sym, totalDebe, totalHaber, colSpan, mostrarColAux, mostrarColCuenta }: {
  sym:string; totalDebe:number; totalHaber:number; colSpan:number; mostrarColAux?:boolean; mostrarColCuenta?:boolean;
}) {
  const baseColsBefore = 8 + (mostrarColAux?1:0) + (mostrarColCuenta?1:0);
  const cuadra = Math.abs(totalDebe - totalHaber) < 0.005;
  return (
    <tr style={{ background:'#F9F9F9', borderTop:`2px solid ${C.n500}` }}>
      <td colSpan={baseColsBefore} style={{ padding:'8px 12px', textAlign:'right', fontWeight:700, fontFamily:F }}>
        Totalizado {!cuadra && <span style={{ fontWeight:400, color:'#E07B00' }}>· Debe y Haber no cuadran (cuenta/rango parcial)</span>}
      </td>
      <td style={{ padding:'8px 12px', fontWeight:700, fontFamily:F }}>
        <Monto sym={sym} valor={fmt2(totalDebe)}/>
      </td>
      <td style={{ padding:'8px 12px', fontWeight:700, fontFamily:F }}>
        <Monto sym={sym} valor={fmt2(totalHaber)}/>
      </td>
      <td/>
    </tr>
  );
}
// ── Main ──────────────────────────────────────────────────────────────────────

// ── DateRangeFilter: modal de período ─────────────────────────────────────────
export function DateRangeFilter({ label, value, onChange, onClear }: {
  label: string;
  value: {from:string; to:string};
  onChange: (v:{from:string;to:string}) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(value);
  const active = !!(value.from || value.to);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(()=>{
    function h(e: MouseEvent) { if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false); }
    if(open) document.addEventListener('mousedown',h);
    return ()=>document.removeEventListener('mousedown',h);
  },[open]);

  function fmtD(d: string) {
    if(!d) return '';
    const [y,m,day] = d.split('-');
    return `${day}/${m}/${y}`;
  }
  function diffDays(a: string, b: string) {
    if(!a||!b) return null;
    const d = Math.round((new Date(b).getTime()-new Date(a).getTime())/(1000*86400));
    return d >= 0 ? `${d} días` : null;
  }

  const PRESETS = [
    { label:'Hoy',         get:()=>{ const h=new Date().toISOString().slice(0,10); return {from:h,to:h}; } },
    { label:'Esta semana', get:()=>{ const n=new Date(); const s=new Date(n); s.setDate(n.getDate()-n.getDay()); const e=new Date(s); e.setDate(s.getDate()+6); return {from:s.toISOString().slice(0,10),to:e.toISOString().slice(0,10)}; } },
    { label:'Este mes',    get:()=>{ const n=new Date(); return {from:new Date(n.getFullYear(),n.getMonth(),1).toISOString().slice(0,10), to:new Date(n.getFullYear(),n.getMonth()+1,0).toISOString().slice(0,10)}; } },
    { label:'Mes anterior',get:()=>{ const n=new Date(); return {from:new Date(n.getFullYear(),n.getMonth()-1,1).toISOString().slice(0,10), to:new Date(n.getFullYear(),n.getMonth(),0).toISOString().slice(0,10)}; } },
    { label:'Este trimestre',get:()=>{ const n=new Date(); const q=Math.floor(n.getMonth()/3); return {from:new Date(n.getFullYear(),q*3,1).toISOString().slice(0,10), to:new Date(n.getFullYear(),q*3+3,0).toISOString().slice(0,10)}; } },
    { label:'Este año',    get:()=>{ const n=new Date(); return {from:new Date(n.getFullYear(),0,1).toISOString().slice(0,10), to:new Date(n.getFullYear(),11,31).toISOString().slice(0,10)}; } },
  ];

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={()=>{ setLocal(value); setOpen(v=>!v); }}
        style={{ height:32, padding:'0 12px', border:`1px solid ${active?BRAND:C.n500}`, borderRadius:4,
          background:active?C.brandBg:'#FFFFFF', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center',
          gap:5, color:active?BRAND:'#0F0F0F', fontFamily:F, fontWeight:active?500:400 }}>
        {active ? `${fmtD(value.from)} - ${fmtD(value.to)}` : label}
        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100%+4px)', left:0, zIndex:300, background:'#FFFFFF',
          border:`1px solid ${C.n500}`, borderRadius:10, width:280, boxShadow:shadow.panel, fontFamily:F, padding:'12px 14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:12, fontWeight:600 }}>Período de fecha</span>
            <button onClick={()=>{ setLocal({from:'',to:''}); onClear(); }} style={{ fontSize:11, color:C.error, background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Limpiar</button>
          </div>
          {/* Presets */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:10 }}>
            {PRESETS.map(p=>(
              <button key={p.label} onClick={()=>setLocal(p.get())}
                style={{ height:28, border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#FFFFFF', cursor:'pointer', fontSize:11, fontFamily:F, color:'#0F0F0F' }}>
                {p.label}
              </button>
            ))}
          </div>
          {/* Rango personalizado */}
          <p style={{ fontSize:11, fontWeight:500, color:C.n700, margin:'0 0 6px' }}>Rango personalizado</p>
          <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'4px 8px', alignItems:'center', marginBottom:8 }}>
            <span style={{ fontSize:11, color:C.n700 }}>Desde</span>
            <input type="date" value={local.from} onChange={e=>setLocal(p=>({...p,from:e.target.value}))}
              style={{ height:32, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none' }}/>
            <span style={{ fontSize:11, color:C.n700 }}>Hasta</span>
            <input type="date" value={local.to} onChange={e=>setLocal(p=>({...p,to:e.target.value}))}
              style={{ height:32, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none' }}/>
          </div>
          {local.from && local.to && diffDays(local.from,local.to) && (
            <div style={{ padding:'5px 10px', background:C.brandBg, borderRadius:radius.sm, fontSize:11, color:BRAND, marginBottom:8 }}>
              {`${fmtD(local.from)} - ${fmtD(local.to)} · ${diffDays(local.from,local.to)}`}
            </div>
          )}
          {/* Hoy label */}
          <p style={{ fontSize:10, color:C.n700, margin:'0 0 10px' }}>Hoy · {new Date().toLocaleDateString('es-CR',{day:'numeric',month:'long',year:'numeric'})}</p>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setOpen(false)} style={{ flex:1, height:30, border:`1px solid ${C.n500}`, borderRadius:7, background:'#FFFFFF', cursor:'pointer', fontSize:11, fontFamily:F }}>Cancelar</button>
            <button onClick={()=>{ onChange(local); setOpen(false); }} style={{ flex:1, height:30, border:'none', borderRadius:7, background:BRAND, color:'#FFFFFF', cursor:'pointer', fontSize:11, fontWeight:500, fontFamily:F }}>Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
}
// ── RangoImporteFilter ─────────────────────────────────────────────────────────
export function RangoImporteFilter({ minimo, maximo, onApply, onClear }: {
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
          background:active?C.brandBg:'#FFFFFF', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center',
          gap:5, color:active?BRAND:'#0F0F0F', fontFamily:F, fontWeight:active?500:400 }}>
        Importe
        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100%+4px)', left:0, zIndex:300, background:'#FFFFFF',
          border:`1px solid ${C.n500}`, borderRadius:10, width:260, boxShadow:shadow.panel, fontFamily:F, padding:'12px 14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:12, fontWeight:600 }}>Importe</span>
            <button onClick={()=>{ setLocalMin(0); setLocalMax(0); onClear(); }} style={{ fontSize:11, color:C.error, background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Limpiar</button>
          </div>
          <p style={{ fontSize:11, color:C.n700, margin:'0 0 4px' }}>Moneda de referencia</p>
          <div style={{ display:'flex', gap:6, marginBottom:12 }}>
            <button style={{ flex:1, height:28, border:`2px solid ${BRAND}`, borderRadius:radius.sm, background:C.brandBg, cursor:'pointer', fontSize:12, fontFamily:F, color:BRAND, fontWeight:500 }}>₡ CRC</button>
            <button style={{ flex:1, height:28, border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F, color:'#0F0F0F' }}>$ USD</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:6, alignItems:'center', marginBottom:12 }}>
            <input type="number" value={localMin||''} onChange={e=>setLocalMin(+e.target.value||0)} placeholder="₡ 0"
              style={{ height:32, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', width:'100%', boxSizing:'border-box' }}/>
            <span style={{ color:C.n700, textAlign:'center', fontSize:12 }}>-</span>
            <input type="number" value={localMax||''} onChange={e=>setLocalMax(+e.target.value||0)} placeholder="₡ 2,000,000"
              style={{ height:32, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', width:'100%', boxSizing:'border-box' }}/>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setOpen(false)} style={{ flex:1, height:30, border:`1px solid ${C.n500}`, borderRadius:7, background:'#FFFFFF', cursor:'pointer', fontSize:11, fontFamily:F }}>Cancelar</button>
            <button onClick={()=>{ onApply(localMin,localMax); setOpen(false); }} style={{ flex:1, height:30, border:'none', borderRadius:7, background:BRAND, color:'#FFFFFF', cursor:'pointer', fontSize:11, fontWeight:500, fontFamily:F }}>Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
}
// ── Mini combobox reutilizable para elegir una cuenta (usado en Desde/Hasta del rango) ──
export function MiniCuentaCombo({ cuentas, value, onSelect, placeholder }: {
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
          background:value?C.brandBg:'#FFFFFF', cursor:'pointer', fontSize:11, fontFamily:F, textAlign:'left',
          color: value?BRAND:C.n700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {value ? value.code : placeholder}
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:40, background:'#FFFFFF', border:`1px solid ${C.n500}`,
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
