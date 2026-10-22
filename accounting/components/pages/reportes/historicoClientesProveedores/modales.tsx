'use client';
import { useState } from 'react';
import { C, radius, shadow } from '@/components/ui/tokens';
import { BRAND, F } from './datos';

// ── Enviar por correo ────────────────────────────────────────────
export function EnviarCorreoModal({ tipo, vista, cuentaLabel, periodoLabel, onClose, onEnviar }: {
  tipo:'clientes'|'proveedores'; vista:'estado'|'antiguedad'; cuentaLabel:string; periodoLabel:string;
  onClose:()=>void; onEnviar:(correo:string)=>void;
}) {
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  const reporteLabel = vista==='estado' ? 'Estado de cuenta' : 'Antigüedad de saldos';
  function enviar() {
    if (!correo.trim() || !/^\S+@\S+\.\S+$/.test(correo.trim())) { setError('Ingresá un correo válido'); return; }
    onEnviar(correo.trim());
  }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1002, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:420, boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between' }}>
          <p style={{ fontSize:14, fontWeight:600, margin:0 }}>Enviar por correo</p>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#757575' }}>×</button>
        </div>
        <div style={{ padding:'18px 24px' }}>
          <div style={{ background:'#F9F9F9', border:`1px solid ${C.n500}`, borderRadius:radius.md, padding:'10px 12px', marginBottom:14 }}>
            <p style={{ fontSize:10.5, fontWeight:600, color:'#757575', textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 6px' }}>Se va a enviar</p>
            <p style={{ fontSize:12, fontWeight:600, color:'#0F0F0F', margin:'0 0 3px' }}>{reporteLabel} · {tipo==='clientes'?'Clientes':'Proveedores'}</p>
            <p style={{ fontSize:11, color:'#757575', margin:0 }}>{cuentaLabel}</p>
            <p style={{ fontSize:11, color:'#757575', margin:'2px 0 0' }}>Período: {periodoLabel}</p>
          </div>
          <p style={{ fontSize:11, color:'#0F0F0F', margin:'0 0 5px' }}>Correo del destinatario</p>
          <input value={correo} onChange={e=>{setCorreo(e.target.value); setError('');}} placeholder="nombre@empresa.com" aria-label="nombre@empresa.com" autoFocus
            style={{ width:'100%', height:34, padding:'0 10px', border:`1px solid ${error?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
          {error && <p style={{ fontSize:10.5, color:C.error, margin:'5px 0 0' }}>{error}</p>}
        </div>
        <div style={{ padding:'12px 24px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={enviar} style={{ height:34, padding:'0 16px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Enviar</button>
        </div>
      </div>
    </div>
  );
}
