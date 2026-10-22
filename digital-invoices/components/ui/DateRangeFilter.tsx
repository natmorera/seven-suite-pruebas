'use client';
// Filtro de fechas estándar de los reportes: botón «Fecha» que abre un panel
// con atajos (hoy, esta semana, este mes…) y un rango personalizado.
import React, { useState } from 'react';
import { C, FONT, radius, shadow } from './primitives';

const F = FONT;
const BRAND = C.brand;

// ── DateRangeFilter: modal de período ─────────────────────────────────────────
export default function DateRangeFilter({ label, value, onChange, onClear }: {
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
    function esc(e: KeyboardEvent) { if(e.key==='Escape') { e.preventDefault(); setOpen(false); } }
    if(open) { document.addEventListener('mousedown',h); document.addEventListener('keydown',esc); }
    return ()=>{ document.removeEventListener('mousedown',h); document.removeEventListener('keydown',esc); };
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

  // Fechas locales (toISOString usa UTC: en Costa Rica, después de las 6 p. m.
  // «Hoy» salía como mañana).
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const PRESETS = [
    { label:'Hoy',         get:()=>{ const h=iso(new Date()); return {from:h,to:h}; } },
    { label:'Esta semana', get:()=>{ const n=new Date(); const s=new Date(n); s.setDate(n.getDate()-((n.getDay()+6)%7)); const e=new Date(s); e.setDate(s.getDate()+6); return {from:iso(s),to:iso(e)}; } },
    { label:'Este mes',    get:()=>{ const n=new Date(); return {from:iso(new Date(n.getFullYear(),n.getMonth(),1)), to:iso(new Date(n.getFullYear(),n.getMonth()+1,0))}; } },
    { label:'Mes anterior',get:()=>{ const n=new Date(); return {from:iso(new Date(n.getFullYear(),n.getMonth()-1,1)), to:iso(new Date(n.getFullYear(),n.getMonth(),0))}; } },
    { label:'Este trimestre',get:()=>{ const n=new Date(); const q=Math.floor(n.getMonth()/3); return {from:iso(new Date(n.getFullYear(),q*3,1)), to:iso(new Date(n.getFullYear(),q*3+3,0))}; } },
    { label:'Este año',    get:()=>{ const n=new Date(); return {from:iso(new Date(n.getFullYear(),0,1)), to:iso(new Date(n.getFullYear(),11,31))}; } },
  ];

  return (
    <div ref={ref} style={{ position:'relative', flexShrink:0 }}>
      <button onClick={()=>{ setLocal(value); setOpen(v=>!v); }}
        style={{ height:32, padding:'0 12px', border:`1px solid ${active?BRAND:C.n500}`, borderRadius:4,
          background:active?C.brandBg:'#fff', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center',
          gap:5, color:active?BRAND:'#0F0F0F', fontFamily:F, fontWeight:active?500:400, whiteSpace:'nowrap' }}>
        {active ? `${value.from ? fmtD(value.from) : '…'} - ${value.to ? fmtD(value.to) : '…'}` : label}
        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:300, background:'#fff',
          border:`1px solid ${C.n500}`, borderRadius:10, width:280, boxShadow:shadow.panel, fontFamily:F, padding:'12px 14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:12, fontWeight:600 }}>Período de fecha</span>
            <button onClick={()=>{ setLocal({from:'',to:''}); onClear(); }} style={{ fontSize:11, color:C.error, background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Limpiar</button>
          </div>
          {/* Presets */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:10 }}>
            {PRESETS.map(p=>(
              <button key={p.label} onClick={()=>setLocal(p.get())}
                style={{ height:28, border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#fff', cursor:'pointer', fontSize:11, fontFamily:F, color:'#0F0F0F' }}>
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
            <button onClick={()=>setOpen(false)} style={{ flex:1, height:30, border:`1px solid ${C.n500}`, borderRadius:7, background:'#fff', cursor:'pointer', fontSize:11, fontFamily:F }}>Cancelar</button>
            <button onClick={()=>{ onChange(local); setOpen(false); }} style={{ flex:1, height:30, border:'none', borderRadius:7, background:BRAND, color:'#fff', cursor:'pointer', fontSize:11, fontWeight:500, fontFamily:F }}>Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
}
