'use client';
import React, { useState } from 'react';
import { C, radius, shadow } from '../../../ui/tokens';
import { BRAND, F } from './datos';

// ── Shared UI ─────────────────────────────────────────────────────────────────
export function Pill({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return <span style={{ fontSize:11, padding:'2px 9px', borderRadius:radius.pill, fontWeight:500, color, background:bg, whiteSpace:'nowrap', fontFamily:F }}>{children}</span>;
}
export function Btn({ children, onClick, variant='primary', disabled=false, size='md', icon }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: 'primary'|'secondary'|'ghost'|'danger'; disabled?: boolean; size?: 'sm'|'md'; icon?: React.ReactNode;
}) {
  const h = size === 'sm' ? 30 : 36;
  const px = size === 'sm' ? 12 : 18;
  const fs = size === 'sm' ? 11 : 13;
  const vs: Record<string,React.CSSProperties> = {
    primary:   { background:BRAND,   color:'#FFFFFF',    border:`1px solid ${BRAND}` },
    secondary: { background:'#FFFFFF',  color:'#0F0F0F', border:`1px solid ${C.n500}` },
    ghost:     { background:'transparent', color:BRAND, border:`1px solid ${C.brandBd}` },
    danger:    { background:'transparent', color:C.error, border:'none' },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ height:h, padding:`0 ${px}px`, borderRadius:radius.md,
      cursor:disabled?'default':'pointer', fontSize:fs, fontFamily:F, fontWeight:500,
      display:'flex', alignItems:'center', gap:6, opacity:disabled?.5:1, ...vs[variant] }}>
      {icon}{children}
    </button>
  );
}
// ── Main page ─────────────────────────────────────────────────────────────────
// Tipos de operación para los chips de filtro rápido

// ── Icono acción con tooltip ───────────────────────────────────────────────
export function ActIcon({ label, children, color, hoverBg, onClick }: {
  label:string; children:React.ReactNode; color?:string; hoverBg?:string; onClick?:()=>void;
}) {
  const [hov, setHov] = React.useState(false);
  return (
    <div style={{ position:'relative', display:'inline-flex' }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <button onClick={onClick}
        style={{ width:26, height:26, borderRadius:5, border:'none', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          background: hov ? (hoverBg||'rgba(167,118,0,.08)') : 'transparent',
          color: hov ? (color||BRAND) : C.n700, transition:'all .1s' }}>
        {children}
      </button>
      {hov && (
        <div style={{ position:'absolute', bottom:'calc(100% + 4px)', left:'50%', transform:'translateX(-50%)',
          background:'#0F0F0F', color:'#FFFFFF', fontSize:10, padding:'3px 7px', borderRadius:4,
          whiteSpace:'nowrap', pointerEvents:'none', zIndex:500 }}>
          {label}
        </div>
      )}
    </div>
  );
}
export function CobrosFechasFilter({ value, onChange, onClear }: { value:{from:string;to:string}; onChange:(v:{from:string;to:string})=>void; onClear:()=>void; }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(value);
  const active = !!(value.from||value.to);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(()=>{ function h(e:MouseEvent){if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);} if(open)document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h); },[open]);
  function fmtD(d:string){ if(!d)return''; const[y,m,day]=d.split('-'); return `${day}/${m}/${y}`; }
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={()=>{ setLocal(value); setOpen(v=>!v); }}
        style={{ height:32, padding:'0 12px', border:`1px solid ${active?BRAND:C.n500}`, borderRadius:4,
          background:active?C.brandBg:'#FFFFFF', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center',
          gap:5, color:active?BRAND:'#0F0F0F', fontFamily:F, fontWeight:active?500:400 }}>
        {active?`${fmtD(value.from)} - ${fmtD(value.to)}`:'Fechas'}
        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100%+4px)', left:0, zIndex:300, background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:10, width:260, boxShadow:shadow.panel, fontFamily:F, padding:'12px 14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:12, fontWeight:600 }}>Período de fecha</span>
            <button onClick={()=>{ setLocal({from:'',to:''}); onClear(); }} style={{ fontSize:11, color:C.error, background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Limpiar</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:10 }}>
            {[{label:'Hoy',f:()=>{const h=new Date().toISOString().slice(0,10);return{from:h,to:h};}},{label:'Esta semana',f:()=>({from:'2026-06-01',to:'2026-06-07'})},{label:'Este mes',f:()=>({from:'2026-06-01',to:'2026-06-30'})},{label:'Mes anterior',f:()=>({from:'2026-05-01',to:'2026-05-31'})},{label:'Este trimestre',f:()=>({from:'2026-04-01',to:'2026-06-30'})},{label:'Este año',f:()=>({from:'2026-01-01',to:'2026-12-31'})}].map(p=>(
              <button key={p.label} onClick={()=>setLocal(p.f())} style={{ height:28, border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#FFFFFF', cursor:'pointer', fontSize:11, fontFamily:F }}>{p.label}</button>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'4px 8px', alignItems:'center', marginBottom:10 }}>
            <span style={{ fontSize:11, color:C.n700 }}>Desde</span>
            <input type="date" value={local.from} onChange={e=>setLocal(p=>({...p,from:e.target.value}))} style={{ height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none' }}/>
            <span style={{ fontSize:11, color:C.n700 }}>Hasta</span>
            <input type="date" value={local.to} onChange={e=>setLocal(p=>({...p,to:e.target.value}))} style={{ height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none' }}/>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setOpen(false)} style={{ flex:1, height:30, border:`1px solid ${C.n500}`, borderRadius:7, background:'#FFFFFF', cursor:'pointer', fontSize:11, fontFamily:F }}>Cancelar</button>
            <button onClick={()=>{ onChange(local); setOpen(false); }} style={{ flex:1, height:30, border:'none', borderRadius:7, background:BRAND, color:'#FFFFFF', cursor:'pointer', fontSize:11, fontWeight:500, fontFamily:F }}>Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
}
