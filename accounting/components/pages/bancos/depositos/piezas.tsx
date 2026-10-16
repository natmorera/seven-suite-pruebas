'use client';
import React, { useState, useRef, useEffect } from 'react';
import { C, radius, shadow } from '../../../ui/tokens';
import { BRAND, F } from './datos';

export function FechasFilter({ value, onChange, onClear }: { value:{from:string;to:string}; onChange:(v:{from:string;to:string})=>void; onClear:()=>void; }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(value);
  const active = !!(value.from||value.to);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(()=>{ function h(e:MouseEvent){if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);} if(open)document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h); },[open]);
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
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:300, background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:10, width:230, boxShadow:shadow.panel, fontFamily:F, padding:'12px 14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:12, fontWeight:600 }}>Período de fecha</span>
            <button onClick={()=>{ setLocal({from:'',to:''}); onClear(); }} style={{ fontSize:11, color:C.error, background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Limpiar</button>
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
export function Pill({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return <span style={{ fontSize:11, padding:'2px 9px', borderRadius:radius.pill, fontWeight:500, color, background:bg, whiteSpace:'nowrap', fontFamily:F }}>{children}</span>;
}
export function Btn({ children, onClick, variant='primary', disabled=false, icon }: { children: React.ReactNode; onClick?: ()=>void; variant?: 'primary'|'secondary'|'danger'|'ghost'; disabled?: boolean; icon?: React.ReactNode }) {
  const vs: Record<string,React.CSSProperties> = {
    primary:   { background:BRAND, color:'#FFFFFF', border:`1px solid ${BRAND}` },
    secondary: { background:'#FFFFFF', color:'#0F0F0F', border:`1px solid ${C.n500}` },
    ghost:     { background:'transparent', color:C.success, border:`1px solid #1D9E75` },
    danger:    { background:'transparent', color:C.error, border:'none' },
  };
  return <button onClick={onClick} disabled={disabled} style={{ height:34, padding:'0 16px', borderRadius:radius.md, cursor:disabled?'default':'pointer', fontSize:12, fontFamily:F, fontWeight:500, display:'flex', alignItems:'center', gap:6, opacity:disabled?.5:1, ...vs[variant] }}>{icon}{children}</button>;
}
