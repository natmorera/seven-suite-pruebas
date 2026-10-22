'use client';
import { C, radius, shadow } from '@/components/ui/tokens';
import { BRAND, F } from './datos';
import { type EstadoAnalitico } from './useAnalitico';

// Confirmación de desmayorizar varios asientos
export function ConfirmarDesmayorizacionMasiva({ e }: { e: EstadoAnalitico }) {
  const { setConfirmDesmayMasivo, selectedCount, setMovimientos, selected, setSelected } = e;
  return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:600,
          display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => setConfirmDesmayMasivo(false)}>
          <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:420, boxShadow:shadow.modal, fontFamily:F }}
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
                style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>
                Cancelar
              </button>
              <button onClick={() => {
                  setMovimientos(p => p.map(m => selected.has(m.id) ? { ...m, estado:'Pendiente' } : m));
                  setSelected(new Set());
                  setConfirmDesmayMasivo(false);
                }}
                style={{ height:34, padding:'0 14px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>
                Confirmar descontabilización
              </button>
            </div>
          </div>
        </div>
  );
}
