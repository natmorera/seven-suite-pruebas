'use client';
import { C, radius, TABLA } from '@/components/ui/tokens';
import { Monto } from '@/components/ui/montos';
import { ENLACES_AJUSTE_INIT, enlacesPara, NOTA_ADMINISTRATIVA } from '@/components/pages/catalogo/datos/ajustes';
import { F, fmt2 } from '../datos';
import { type EstadoGestion } from './useGestion';

// Líneas de ajuste del cobro o pago
export function SeccionLineasAjuste({ e }: { e: EstadoGestion }) {
  const { form, isCobro, updateLinea, removeLinea, totalAjuste } = e;
  return (
                <div style={TABLA.wrap}><table className="tabla" style={TABLA.table}>
                  <thead>
                    <tr style={TABLA.headRow}>
                      {['Tipo de movimiento','Cuenta / Centro de costos','Documento','Justificación','Monto',''].map(h => (
                        <th key={h} style={TABLA.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.lineasAjuste.map(l => {
                      const operacionActual = isCobro ? 'cobros' : 'pagos';
                      const esNotaAdmin = l.tipoMovimiento === NOTA_ADMINISTRATIVA.value;
                      const opcionesCuenta = l.tipoMovimiento && l.tipoMovimiento !== NOTA_ADMINISTRATIVA.value
                        ? enlacesPara(l.tipoMovimiento, operacionActual)
                        : [];
                      // Tipos de movimiento disponibles: los que la persona configuró en
                      // Catálogo > Movimientos de ajuste para esta operación (cobros/pagos).
                      const tiposDisponibles = Array.from(new Set(
                        ENLACES_AJUSTE_INIT.filter(e => e.activo && e.aplicaA.includes(operacionActual)).map(e => e.tipoMovimiento)
                      ));
                      return (
                      <tr key={l.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                        <td style={{ padding:'6px 12px' }}>
                          <select aria-label="Tipo de movimiento" value={l.tipoMovimiento} onChange={e => updateLinea(l.id,'tipoMovimiento',e.target.value)}
                            style={{ width:170, height:30, padding:'0 6px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none' }}>
                            <option value="">Sin tipo (manual)</option>
                            <option value={NOTA_ADMINISTRATIVA.value}>{NOTA_ADMINISTRATIVA.label}</option>
                            {tiposDisponibles.map((t:string)=>(
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding:'6px 12px' }}>
                          {esNotaAdmin ? (
                            <span style={{ display:'inline-flex', alignItems:'center', height:30, fontSize:11, color:C.n700, fontStyle:'italic' }}>
                              {l.cuenta} (cuenta del {isCobro?'cliente':'proveedor'})
                            </span>
                          ) : opcionesCuenta.length > 0 ? (
                            <select aria-label="Tipo" value={l.cuenta} onChange={e => updateLinea(l.id,'cuenta',e.target.value)}
                              style={{ width:'100%', height:30, padding:'0 6px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none' }}>
                              <option value="">Seleccioná una cuenta…</option>
                              {opcionesCuenta.map(o=>(
                                <option key={o.id} value={`${o.cuentaCode}: ${o.cuentaNombre}`}>{o.cuentaCode} - {o.cuentaNombre}</option>
                              ))}
                            </select>
                          ) : (
                            <input value={l.cuenta} onChange={e => updateLinea(l.id,'cuenta',e.target.value)} placeholder="Cuenta / centro de costos" aria-label="Cuenta / centro de costos"
                              style={{ width:'100%', height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                          )}
                        </td>
                        <td style={{ padding:'6px 12px' }}>
                          <input value={l.documento} onChange={e => updateLinea(l.id,'documento',e.target.value)} placeholder="N° Documento" aria-label="N° Documento"
                            style={{ width:110, height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                        </td>
                        <td style={{ padding:'6px 12px' }}>
                          <input value={l.justificacion} onChange={e => updateLinea(l.id,'justificacion',e.target.value)} placeholder="Motivo del ajuste" aria-label="Motivo del ajuste"
                            style={{ width:160, height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                        </td>
                        <td style={{ padding:'6px 12px' }}>
                          <input aria-label="Monto" type="number" min={0} value={l.monto||''} onChange={e => updateLinea(l.id,'monto',+e.target.value)}
                            style={{ width:90, height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none', textAlign:'right', boxSizing:'border-box' }}/>
                        </td>
                        <td style={{ padding:'8px 12px', textAlign:'center' }}>
                          <button onClick={() => removeLinea(l.id)} style={{ background:'none', border:'none', cursor:'pointer', color:C.error, fontSize:16, padding:0 }}>×</button>
                        </td>
                      </tr>
                      );
                    })}
                    {form.lineasAjuste.length === 0 && (
                      <tr><td colSpan={6} style={TABLA.empty}>Sin líneas de ajuste - agregá la primera.</td></tr>
                    )}
                    <tr style={{ borderTop:`2px solid ${C.n500}`, background:'#F9F9F9' }}>
                      <td colSpan={4} style={{ padding:'8px 12px', fontWeight:600, fontSize:12 }}>Total</td>
                      <td colSpan={2} style={{ padding:'8px 12px', fontSize:12 }}>
                        <Monto sym="₡" valor={fmt2(totalAjuste)} style={{ fontWeight:600 }}/>
                      </td>
                    </tr>
                  </tbody>
                </table></div>
  );
}
