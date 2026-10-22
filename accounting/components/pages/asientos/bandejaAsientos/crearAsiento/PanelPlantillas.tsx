'use client';
import { C, TABLA } from '@/components/ui/tokens';
import { BRAND, F } from '../datos';
import { type EstadoCrearAsiento } from './useCrearAsiento';

// Selector de plantillas del drawer Nuevo asiento
export function PanelPlantillas({ e }: { e: EstadoCrearAsiento }) {
  const { plantillas, setPlantillaSelId, plantillaSelId, setShowPlantillas, cargarPlantilla } = e;
  return (
                <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:400, background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:10, boxShadow:'0 8px 32px rgba(0,0,0,.16)', fontFamily:F, overflow:'hidden' }}
                  onClick={e=>e.stopPropagation()}>
                  <table className="tabla" style={TABLA.table}>
                    <thead><tr style={TABLA.headRow}>
                      <th style={{ ...TABLA.th, width:32 }}/>
                      <th style={TABLA.th}>Nombre</th>
                      <th style={{ ...TABLA.th, textAlign:'right' }}>Líneas</th>
                      <th style={TABLA.th}>Moneda</th>
                    </tr></thead>
                    <tbody>
                      {plantillas.map(p=>(
                        <tr key={p.id} onClick={()=>setPlantillaSelId(p.id)}
                          style={{ borderTop:'1px solid #ECECEC', cursor:'pointer', background:plantillaSelId===p.id?C.brandBg:'#FFFFFF' }}
                          onMouseEnter={e=>{if(plantillaSelId!==p.id)e.currentTarget.style.background=C.n200;}}
                          onMouseLeave={e=>{if(plantillaSelId!==p.id)e.currentTarget.style.background='#FFFFFF';}}>
                          <td style={{ padding:'8px 12px' }}>
                            <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${plantillaSelId===p.id?BRAND:C.n500}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                              {plantillaSelId===p.id && <div style={{ width:8, height:8, borderRadius:'50%', background:BRAND }}/>}
                            </div>
                          </td>
                          <td style={{ padding:'8px 12px' }}>{p.nombre}</td>
                          <td style={{ padding:'8px 12px', textAlign:'right', color:BRAND }}>{p.lineas.length}</td>
                          <td style={{ padding:'8px 12px' }}>{p.moneda}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding:'8px 14px', background:C.brandBg, borderTop:`1px solid ${C.n500}`, fontSize:11, color:BRAND }}>
                    Cargar una plantilla reemplazará las líneas actuales del asiento.
                  </div>
                  <div style={{ padding:'10px 14px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
                    <button onClick={()=>setShowPlantillas(false)} style={{ height:32, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:7, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
                    <button onClick={cargarPlantilla} disabled={!plantillaSelId}
                      style={{ height:32, padding:'0 14px', border:'none', borderRadius:7, background:plantillaSelId?BRAND:'#ECECEC', color:'#FFFFFF', cursor:plantillaSelId?'pointer':'default', fontSize:12, fontWeight:500, fontFamily:F }}>Cargar plantilla</button>
                  </div>
                </div>
  );
}
