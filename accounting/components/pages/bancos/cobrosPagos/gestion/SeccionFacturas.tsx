'use client';
import { C, radius, TABLA } from '@/components/ui/tokens';
import { Monto } from '@/components/ui/montos';
import { BRAND, F, fmt2 } from '../datos';
import { type EstadoGestion } from './useGestion';

// Facturas aplicadas al cobro o pago
export function SeccionFacturas({ e }: { e: EstadoGestion }) {
  const { isCobro, form, setForm, totalFacturas } = e;
  return (
                <div style={TABLA.wrap}><table className="tabla" style={TABLA.table}>
                  <thead>
                    <tr style={TABLA.headRow}>
                      {['Documento','Fecha','Descripción','Importe pendiente', isCobro?'Abono':'Pago',''].map(h => (
                        <th key={h} style={{ ...TABLA.th, textAlign:h.includes('Importe')||h.includes('Abono')||h.includes('Pago')?'right':'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.facturas.length === 0 ? (
                      <tr><td colSpan={6} style={TABLA.empty}>Sin facturas seleccionadas</td></tr>
                    ) : (
                      form.facturas.map(f => (
                        <tr key={f.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                          <td style={{ padding:'8px 12px', color:BRAND, fontFamily:F }}>{f.documento}</td>
                          <td style={{ padding:'8px 12px', color:'#0F0F0F' }}>{f.fecha}</td>
                          <td style={{ padding:'8px 12px', color:'#0F0F0F', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={f.descripcion}>{f.descripcion}</td>
                          <td style={{ padding:'8px 12px', textAlign:'right' }}><Monto sym="₡" valor={fmt2(f.saldoPendiente)}/></td>
                          <td style={{ padding:'8px 12px', textAlign:'right' }}>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:4 }}>
                              <span>₡</span>
                              <input aria-label="Monto" type="number" defaultValue={f.abono ?? f.saldoPendiente}
                                style={{ width:90, height:26, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', textAlign:'right' }}/>
                            </div>
                          </td>
                          <td style={{ padding:'8px 12px' }}>
                            <button onClick={() => setForm(p => ({ ...p, facturas: p.facturas.filter(x => x.id!==f.id) }))}
                              style={{ background:'none', border:'none', cursor:'pointer', color:C.error, fontSize:16, padding:0 }}>×</button>
                          </td>
                        </tr>
                      ))
                    )}
                    <tr style={{ borderTop:`2px solid ${C.n500}`, background:'#F9F9F9' }}>
                      <td colSpan={3} style={{ padding:'8px 12px', fontWeight:600 }}>Total</td>
                      <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:600 }}><Monto sym="₡" valor={fmt2(form.facturas.reduce((s,f)=>s+f.saldoPendiente,0))}/></td>
                      <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:600 }}><Monto sym="₡" valor={fmt2(totalFacturas)}/></td>
                      <td/>
                    </tr>
                  </tbody>
                </table></div>
  );
}
