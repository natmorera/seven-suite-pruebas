'use client';
import { TABLA , C } from '@/components/ui/tokens';
import { F } from './datos';
import { EstadoDropdown } from './piezas';
import { type EstadoEjercicioFiscal } from './useEjercicioFiscal';

// Períodos del ejercicio desplegado
export function PeriodosEjercicio({ e, ej }: { e: EstadoEjercicioFiscal; ej: EstadoEjercicioFiscal['ejercicios'][number] }) {
  const { cambiarEstadoPeriodo, setCierrePeriodo } = e;
  return (
                  <tr>
                    <td colSpan={7} style={{ padding:0, background:'#F9F9F9' }}>
                      <div style={{ padding:'4px 12px 16px 40px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap', padding:'10px 0 12px' }}>
                          <div>
                            <p style={{ fontSize:10.5, color:C.n700, margin:0 }}>N.° pág. cheque</p>
                            <p style={{ fontSize:12, fontWeight:500, color:C.n900, margin:0, fontFamily:F }}>{ej.nPagCheque}</p>
                          </div>
                          <div>
                            <p style={{ fontSize:10.5, color:C.n700, margin:0 }}>Inicio</p>
                            <p style={{ fontSize:12, fontWeight:500, color:C.n900, margin:0, fontFamily:F }}>{ej.inicio}</p>
                          </div>
                          <div>
                            <p style={{ fontSize:10.5, color:C.n700, margin:0 }}>Cierre</p>
                            <p style={{ fontSize:12, fontWeight:500, color:C.n900, margin:0, fontFamily:F }}>{ej.cierre}</p>
                          </div>
                        </div>
                        <div style={TABLA.wrap}><table className="tabla" style={{ ...TABLA.table, background:'#FFFFFF' }}>
                          <thead>
                            <tr style={TABLA.headRow}>
                              {(['Orden','Desde','Hasta','Título','Días','Estado'] as const).map(h=>(
                                <th key={h} style={{ ...TABLA.th, textAlign:h==='Orden'||h==='Días'?'right':'left' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {ej.periodos.map(p=>{
                              const isAct=p.estado==='Activo';
                              return (
                                <tr key={p.orden} style={{ borderBottom:'1px solid #ECECEC', background:isAct?C.brandBg:'transparent' }}>
                                  <td style={{ padding:'8px 12px', fontWeight:isAct?600:400, textAlign:'right' }}>{p.orden}</td>
                                  <td style={{ padding:'8px 12px', fontWeight:isAct?600:400 }}>{p.desde}</td>
                                  <td style={{ padding:'8px 12px', fontWeight:isAct?600:400 }}>{p.hasta}</td>
                                  <td style={{ padding:'8px 12px', fontWeight:isAct?600:400 }}>{p.titulo}</td>
                                  <td style={{ padding:'8px 12px', textAlign:'right' }}>
                                    {p.dias>0&&<span style={{ color:C.success }}>{p.dias}</span>}
                                  </td>
                                  <td style={{ padding:'8px 12px' }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                      <EstadoDropdown periodo={p} onCambiar={estado=>cambiarEstadoPeriodo(ej.id,p.orden,estado)} />
                                      {isAct && (
                                        <button onClick={()=>setCierrePeriodo({ejercicioId:ej.id, orden:p.orden})}
                                          style={{ height:26, padding:'0 10px', fontSize:11, fontFamily:F, border:'none',
                                            borderRadius:5, background:'#A77600', color:'#FFFFFF', cursor:'pointer', fontWeight:500, whiteSpace:'nowrap' }}>
                                          Cierre
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table></div>
                      </div>
                    </td>
                  </tr>
  );
}
