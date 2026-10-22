'use client';
import { useState } from 'react';
import { C, FONT, radius } from '@/components/ui/tokens';

const F = FONT;
const BRAND = C.brand;

// Ícono de «Descontabilizar»: reloj de arena, el asiento vuelve a quedar pendiente.
export function IcDescontabilizar({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2.2h8M4 13.8h8"/>
      <path d="M4.6 2.2c0 3.1 2.5 3.9 2.5 5.8s-2.5 2.7-2.5 5.8"/>
      <path d="M11.4 2.2c0 3.1-2.5 3.9-2.5 5.8s2.5 2.7 2.5 5.8"/>
      <path d="M5.3 3.4h5.4M5.3 12.6h5.4" opacity=".55"/>
    </svg>
  );
}

export interface ConciliacionAfectada { id: string; detalle: string }

interface Props {
  consecutivo: string;
  titulo: string;
  conciliacion?: ConciliacionAfectada | null;
  tienePermiso?: boolean;
  onClose: () => void;
  onConfirm: (payload: { motivo: string; desconciliar: boolean }) => void;
}

// ── Modal único de descontabilización - cubre los 3 estados posibles:
// 1) sin permisos → bloquea la acción y explica a quién contactar
// 2) asiento normal → pide motivo y confirma
// 3) asiento con conciliación bancaria vinculada → además exige decidir si se
//    desconcilia, mostrando qué conciliación se ve afectada ──────────────────
export default function ModalDescontabilizar({ consecutivo, titulo, conciliacion, tienePermiso = true, onClose, onConfirm }: Props) {
  const [motivo, setMotivo] = useState('');
  const [desconciliar, setDesconciliar] = useState(false);
  const [tocado, setTocado] = useState(false);

  const overlay: React.CSSProperties = {
    position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:1200,
    display:'flex', alignItems:'center', justifyContent:'center', padding:20,
  };
  const card: React.CSSProperties = {
    background:'#FFFFFF', borderRadius:radius.lg, width:440, boxShadow:'0 20px 60px rgba(0,0,0,.25)', fontFamily:F,
  };

  // ── Estado 1: sin permisos ──────────────────────────────────────────────
  if (!tienePermiso) {
    return (
      <div style={overlay} onClick={onClose}>
        <div style={{ ...card, padding:'28px 26px', textAlign:'center' }} onClick={e=>e.stopPropagation()}>
          <button onClick={onClose} aria-label="Cerrar" style={{ position:'absolute', top:16, right:16, background:'none', border:'none', cursor:'pointer', color:'#757575', fontSize:18, lineHeight:1 }}>×</button>
          <div style={{ width:56, height:56, borderRadius:'50%', border:`2px solid ${C.error}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'8px auto 18px' }}>
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke={C.error} strokeWidth="1.6" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
          </div>
          <p style={{ fontSize:15, fontWeight:600, color:'#0F0F0F', margin:'0 0 8px', lineHeight:1.4 }}>
            No tienes permiso para descontabilizar asientos.
          </p>
          <p style={{ fontSize:12, color:'#757575', margin:'0 0 20px', lineHeight:1.5 }}>
            Contacta a tu administrador del sistema si necesitas realizar esta acción.
          </p>
          <button onClick={onClose}
            style={{ height:36, padding:'0 24px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:F }}>
            Entendido
          </button>
        </div>
      </div>
    );
  }

  const motivoInvalido = tocado && !motivo.trim();

  function handleConfirmar() {
    setTocado(true);
    if (!motivo.trim()) return;
    onConfirm({ motivo: motivo.trim(), desconciliar });
  }

  // ── Estados 2 y 3: normal / con conciliación ────────────────────────────
  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...card, maxHeight:'90vh', display:'flex', flexDirection:'column' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'18px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexShrink:0 }}>
          <div>
            <p style={{ fontSize:15, fontWeight:600, color:'#0F0F0F', margin:0 }}>Descontabilizar asiento</p>
            <p style={{ fontSize:12, margin:'3px 0 0' }}>
              <span style={{ color:BRAND, fontWeight:500 }}>{consecutivo}</span>
              <span style={{ color:'#757575' }}> · {titulo}</span>
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ background:'none', border:'none', cursor:'pointer', color:'#757575', fontSize:18, lineHeight:1 }}>×</button>
        </div>

        <div style={{ padding:'18px 24px', overflowY:'auto', flex:1 }}>
          <div style={{ padding:'12px 14px', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:radius.md, marginBottom:16 }}>
            <p style={{ fontSize:12, color:'#1D4ED8', margin:0, lineHeight:1.5 }}>
              El asiento volverá a la bandeja de pendientes. El libro mayor se actualizará y los saldos anteriores a esta fecha se recalcularán.
            </p>
          </div>

          {conciliacion && (
            <div style={{ border:`1px solid ${C.n500}`, borderRadius:radius.md, padding:14, marginBottom:16 }}>
              <label style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }}>
                <input type="checkbox" aria-label="Seleccionar" checked={desconciliar} onChange={e=>setDesconciliar(e.target.checked)}
                  style={{ width:15, height:15, marginTop:2, accentColor:BRAND, cursor:'pointer', flexShrink:0 }}/>
                <span>
                  <span style={{ fontSize:13, fontWeight:600, color:'#0F0F0F', display:'block' }}>Desconciliar</span>
                  <span style={{ fontSize:12, color:'#757575', lineHeight:1.5 }}>
                    Este asiento pertenece a la conciliación {conciliacion.id}. Al desconciliar, el asiento saldrá de esa conciliación.
                  </span>
                </span>
              </label>
              <p style={{ fontSize:11, color:'#757575', margin:'12px 0 4px' }}>Conciliación afectada</p>
              <div style={{ background:C.n200, border:`1px solid ${C.n500}`, borderRadius:radius.sm, padding:'8px 10px', fontSize:12, color:'#0F0F0F' }}>
                {conciliacion.id} · {conciliacion.detalle}
              </div>
            </div>
          )}

          <label style={{ fontSize:12, fontWeight:500, color:'#0F0F0F', display:'block', marginBottom:6 }}>
            Motivo{conciliacion ? '' : ' de descontabilización'} <span style={{ color:C.error }}>*</span>
          </label>
          <textarea value={motivo} onChange={e=>setMotivo(e.target.value)} rows={3}
            placeholder="Ej. Error en la descripción de la línea 2, se corregirá y reconcontabilizará…" aria-label="Ej. Error en la descripción de la línea 2, se corregirá y reconcontabilizará…"
            style={{ width:'100%', padding:'10px 12px', border:`1px solid ${motivoInvalido?C.error:C.n500}`, borderRadius:radius.md,
              fontSize:12, fontFamily:F, outline:'none', resize:'vertical', boxSizing:'border-box' }}/>
          {motivoInvalido && <p style={{ fontSize:11, color:C.error, margin:'4px 0 0' }}>Indica el motivo antes de continuar.</p>}
        </div>

        <div style={{ padding:'14px 24px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8, flexShrink:0 }}>
          <button onClick={onClose}
            style={{ height:36, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>
            Cancelar
          </button>
          <button onClick={handleConfirmar}
            style={{ height:36, padding:'0 16px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F, display:'flex', alignItems:'center', gap:7 }}>
            {conciliacion ? 'Sí, confirmar' : <><IcDescontabilizar/> Descontabilizar (enviar pendiente)</>}
          </button>
        </div>
      </div>
    </div>
  );
}
