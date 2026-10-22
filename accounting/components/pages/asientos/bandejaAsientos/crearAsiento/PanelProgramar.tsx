'use client';
import { C, radius, shadow } from '@/components/ui/tokens';
import { BRAND, F } from '../datos';
import { type EstadoCrearAsiento } from './useCrearAsiento';

// Programación recurrente del asiento en el drawer Nuevo asiento
export function PanelProgramar({ e }: { e: EstadoCrearAsiento }) {
  const { setShowProg, hoy } = e;
  return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setShowProg(false)}>
          <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:380, padding:'20px', boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
            <p style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Programar asiento</p>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Frecuencia <span style={{ color:C.error }}>*</span></label>
                <div style={{ position:'relative' }}>
                  <select aria-label="Frecuencia" defaultValue="Mensual" style={{ width:'100%', height:36, padding:'0 10px', paddingRight:28, border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', appearance:'none' }}>
                    <option>Diaria</option><option>Semanal</option><option>Quincenal</option>
                    <option>Mensual</option><option>Bimestral</option><option>Trimestral</option>
                    <option>Semestral</option><option>Anual</option>
                  </select>
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round" style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Primera ejecución <span style={{ color:C.error }}>*</span></label>
                <input aria-label="Primera ejecución" type="date" defaultValue={hoy} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Finalización</label>
                <input aria-label="Finalización" type="date" defaultValue={hoy} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
              <button onClick={()=>setShowProg(false)} style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
              <button onClick={()=>setShowProg(false)} style={{ height:34, padding:'0 14px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Guardar</button>
            </div>
          </div>
        </div>
  );
}
