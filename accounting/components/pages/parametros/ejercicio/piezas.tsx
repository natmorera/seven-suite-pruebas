'use client';
import { useState, useRef, useEffect } from 'react';
import { radius } from '../../../ui/tokens';
import { C } from '../../../ui/tokens';
import { ESTADO_STYLE, F, type Periodo } from './datos';

export function EstadoDropdown({ periodo, onCambiar }: { periodo:Periodo; onCambiar:(e:Periodo['estado'])=>void }) {
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e:MouseEvent) { if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown',h); return () => document.removeEventListener('mousedown',h);
  },[]);
  const s=ESTADO_STYLE[periodo.estado];
  const canChange=periodo.estado!=='Apertura'&&periodo.estado!=='Cierre';
  if(!canChange) return <span style={{ fontSize:11,padding:'3px 10px',borderRadius:radius.pill,color:s.color,background:s.bg,border:`1px solid ${s.border}`,fontFamily:F }}>{periodo.estado}</span>;
  const opciones: Periodo['estado'][] =
    periodo.estado==='Bloqueado'   ? ['Activo'] :
    periodo.estado==='Activo'    ? ['Bloqueado'] :
    periodo.estado==='Pendiente' ? ['Activo'] :
    [];
  const labelFor = (op: Periodo['estado']) => {
    if (op === 'Activo' && periodo.estado === 'Pendiente') return 'Abrir';
    if (op === 'Activo') return 'Reaperturar';
    if (op === 'Bloqueado') return 'Bloquear';
    return op;
  };
  return (
    <div ref={ref} style={{ position:'relative', display:'inline-block' }}>
      <button onClick={()=>setOpen(v=>!v)}
        style={{ display:'flex',alignItems:'center',gap:6,fontSize:11,padding:'3px 10px',border:`1px solid ${s.border}`,borderRadius:radius.pill,background:s.bg,color:s.color,cursor:'pointer',fontFamily:F }}>
        {periodo.estado}
        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor"><path d="M11.62 5.22L7.82 9.02C7.37 9.47 6.63 9.47 6.18 9.02L2.38 5.22" strokeLinecap="round"/></svg>
      </button>
      {open && (
        <div style={{ position:'absolute',top:'100%',left:0,background:'#FFFFFF',border:'1px solid #ECECEC',borderRadius:radius.md,zIndex:50,minWidth:130,boxShadow:'0 4px 12px rgba(0,0,0,.12)',marginTop:4,overflow:'hidden' }}>
          {opciones.map(op => (
            <button key={op} onClick={()=>{ onCambiar(op); setOpen(false); }}
              style={{ display:'block',width:'100%',textAlign:'left',padding:'9px 14px',fontSize:12,border:'none',background:'none',cursor:'pointer',fontFamily:F,color:'#0F0F0F' }}>
              {labelFor(op)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
// Ícono de "más acciones" (recalcular saldo / documentos pendientes) - acciones
// de mantenimiento poco frecuentes, agrupadas para no saturar la fila.
export function MenuMas({ onActualizarSaldo, onRecalcularDocs }: { onActualizarSaldo:()=>void; onRecalcularDocs:()=>void }) {
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e:MouseEvent) { if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown',h); return () => document.removeEventListener('mousedown',h);
  },[]);
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={()=>setOpen(v=>!v)} title="Más acciones"
        style={{ width:28, height:28, border:'1px solid #ECECEC', borderRadius:5, background:'#FFFFFF', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.n700 }}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><circle cx="3" cy="7" r="1.3"/><circle cx="7" cy="7" r="1.3"/><circle cx="11" cy="7" r="1.3"/></svg>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'100%', right:0, background:'#FFFFFF', border:'1px solid #ECECEC', borderRadius:radius.md, zIndex:50, minWidth:220, boxShadow:'0 4px 12px rgba(0,0,0,.12)', marginTop:4, overflow:'hidden' }}>
          <button onClick={()=>{ onActualizarSaldo(); setOpen(false); }}
            style={{ display:'block', width:'100%', textAlign:'left', padding:'10px 14px', fontSize:12, border:'none', background:'none', cursor:'pointer', fontFamily:F, color:'#0F0F0F' }}>
            Actualizar saldo de cuentas
          </button>
          <button onClick={()=>{ onRecalcularDocs(); setOpen(false); }}
            style={{ display:'block', width:'100%', textAlign:'left', padding:'10px 14px', fontSize:12, border:'none', background:'none', cursor:'pointer', fontFamily:F, color:'#0F0F0F' }}>
            Recálculo de documentos pendientes
          </button>
        </div>
      )}
    </div>
  );
}
