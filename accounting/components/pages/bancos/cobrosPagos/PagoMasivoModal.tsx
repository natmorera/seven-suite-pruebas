'use client';
import { useState } from 'react';
import { PresenciaOperacion } from '@/components/ui/primitives';
import { C, radius, shadow, TABLA } from '@/components/ui/tokens';
import { Monto } from '@/components/ui/montos';
import { BANCOS, BRAND, ESTADO_STYLE, F, PROVEEDORES_LOTE, type ProveedorLote, fmt2 } from './datos';
import { Btn, Pill } from './piezas';

export function PagoMasivoModal({ onClose }: { onClose: () => void }) {
  const [proveedores] = useState<ProveedorLote[]>(PROVEEDORES_LOTE);
  const [expandedP, setExpandedP] = useState<Set<string>>(new Set(['p1','p2']));
  const [lineasAjuste] = useState([
    { id:1, cuenta:'650001001-1001: Retención en la fuente 2%', documento:'FE00000003', moneda:'¢ CRC', monto:12069 },
    { id:2, cuenta:'650001002-1001: Retención IMI 1%',          documento:'FE00000003', moneda:'¢ CRC', monto:5035  },
  ]);
  const [detallado, setDetallado] = useState(false);

  const totalPagado = proveedores.reduce((s,p) => s + p.documentos.reduce((ss,d) => ss + (d.abono??0), 0), 0);

  function toggleP(id: string) {
    setExpandedP(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20, overflowY:'auto' }}
      onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:'100%', maxWidth: detallado ? 1280 : 1080, boxShadow:shadow.modal, fontFamily:F, display:'flex', flexDirection:'column' }}
        onClick={e => e.stopPropagation()}>

        {/* Título */}
        <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:15, fontWeight:600 }}>Gestión de pago masivos</span>
          <span style={{ fontSize:13, color:C.n700 }}>67</span>
          <Pill color={ESTADO_STYLE['Pendiente'][0]} bg={ESTADO_STYLE['Pendiente'][1]}>Pendiente</Pill>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:14 }}>
            <PresenciaOperacion/>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, fontSize:20 }}>×</button>
          </div>
        </div>

        <div style={{ display:'flex', flex:1 }}>
          {/* Pantalla principal */}
          <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:16 }}>
            {/* Datos del encabezado */}
            <div>
              <p style={{ fontSize:10.5, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 8px' }}>INFORMACIÓN DEL PROVEEDOR</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px 16px' }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, whiteSpace:'nowrap', margin:'0 0 3px', display:'block' }}>Cuenta contable <span style={{ color:C.error }}>*</span></label>
                  <select aria-label="Cuenta contable" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none' }}>
                    <option>2 cuentas seleccionadas</option>
                  </select>
                  <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:'3px 0', fontFamily:F }}>Cuentas por pagar</button>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Título / Leyenda</label>
                  <input aria-label="Título / Leyenda" defaultValue="Gestión de pago masivos - 67"
                    style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                  <p style={{ fontSize:11, color:BRAND, margin:'3px 0 0' }}>Auto-propuesto. Editable.</p>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Flujo</label>
                  <input placeholder="Pago de proveedores - según catálogo" aria-label="Pago de proveedores - según catálogo" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box', color:C.n700 }}/>
                </div>
              </div>
            </div>

            {/* Detalle del pago */}
            <div>
              <p style={{ fontSize:10.5, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 8px' }}>DETALLE DEL PAGO</p>
              <div style={{ display:'grid', gridTemplateColumns:'160px 140px 180px 1fr', gap:'8px 16px', alignItems:'flex-start' }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Fecha <span style={{ color:C.error }}>*</span></label>
                  <input aria-label="Fecha" type="date" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Moneda <span style={{ color:C.error }}>*</span></label>
                  <div style={{ display:'flex', gap:5 }}>
                    <button style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:12, fontFamily:F, fontWeight:500, background:BRAND, color:'#FFFFFF' }}>¢ CRC</button>
                    <button style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:12, fontFamily:F, background:C.n200, color:'#0F0F0F' }}>$ USD</button>
                  </div>
                  <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:'3px 0', fontFamily:F }}>Tipo de cambio: 10000</button>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Banco <span style={{ color:C.error }}>*</span></label>
                  <select aria-label="Banco" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none' }}>
                    {BANCOS.map(b => <option key={b}>{b}</option>)}
                  </select>
                  <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:'3px 0', display:'flex', alignItems:'center', gap:4 }}>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke={BRAND} strokeWidth="1.3"><path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3"/><path d="M11 6l-3 4-3-4M8 10V2"/></svg>
                    Exportar archivo bancario
                  </button>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Referencia bancaria <span style={{ color:C.error }}>*</span></label>
                  <input placeholder="Nro. transacción del banco" aria-label="Nro. transacción del banco" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box', color:C.n700 }}/>
                </div>
              </div>
              <div style={{ marginTop:8, padding:'7px 12px', background:C.brandBg, borderRadius:radius.sm, fontSize:11, border:`1px solid ${C.brandBd}` }}>
              </div>
            </div>

            {/* Proveedores */}
            {proveedores.map(p => (
              <div key={p.id} style={{ border:`1px solid ${C.n500}`, borderRadius:10, overflow:'hidden' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:C.n200 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:'#0F0F0F' }}>{p.nombre}</span>
                    <span style={{ fontSize:10.5, color:C.n700, fontFamily:F }}>{p.cuentaContable}</span>
                    <span style={{ fontSize:10.5, padding:'2px 8px', borderRadius:radius.lg, fontWeight:500,
                      background: p.tieneDatosBancarios ? 'rgba(29,158,117,.15)' : 'rgba(226,75,74,.12)',
                      color: p.tieneDatosBancarios ? C.success : C.error }}>
                      {p.tieneDatosBancarios ? 'Con datos bancarios' : 'Sin datos bancarios'}
                    </span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <button style={{ height:28, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#FFFFFF', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l-2-2"/></svg>
                      Seleccionar facturas
                    </button>
                    <button onClick={() => toggleP(p.id)} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, padding:4 }}>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        {expandedP.has(p.id) ? <path d="M3.5 8.75L7 5.25L10.5 8.75"/> : <path d="M3.5 5.25L7 8.75L10.5 5.25"/>}
                      </svg>
                    </button>
                  </div>
                </div>
                {expandedP.has(p.id) && (
                  <div>
                    {detallado ? (
                      <table className="tabla" style={TABLA.table}>
                        <thead>
                          <tr style={TABLA.headRow}>
                            {['Fecha','Documento','Saldo pendiente','Abono','Retención IR','Retención IMI','Ajuste','Valor neto',''].map(h => (
                              <th key={h} style={TABLA.th}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {p.documentos.map(d => (
                            <tr key={d.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                              <td style={{ padding:'8px 12px', color:'#0F0F0F' }}>{d.fecha}</td>
                              <td style={{ padding:'8px 12px', color:BRAND, fontFamily:F }}>{d.documento}</td>
                              <td style={{ padding:'8px 12px' }}><Monto sym="₡" valor={fmt2(d.saldoPendiente)}/></td>
                              <td style={{ padding:'8px 12px' }}><Monto sym="₡" valor={fmt2(d.abono ?? d.saldoPendiente)}/></td>
                              <td style={{ padding:'8px 12px', color:C.error }}><Monto sym="₡" valor={'-'+fmt2((d.abono ?? d.saldoPendiente) * 0.02)}/></td>
                              <td style={{ padding:'8px 12px', color:C.error }}><Monto sym="₡" valor={'-'+fmt2((d.abono ?? d.saldoPendiente) * 0.01)}/></td>
                              <td style={{ padding:'8px 12px' }}>₡ 0.00</td>
                              <td style={{ padding:'8px 12px' }}><Monto sym="₡" valor={fmt2((d.abono ?? d.saldoPendiente) * 0.97)}/></td>
                              <td style={{ padding:'8px 12px' }}>
                                <button style={{ background:'none', border:'none', cursor:'pointer', color:C.error, fontSize:14 }}>×</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}
                    <div style={{ padding:'8px 14px', borderTop: detallado ? `1px solid ${C.n500}` : 'none', fontSize:11, color:C.n700, display:'flex', justifyContent:'flex-end' }}>
                      {p.documentos.length} documentos seleccionados &nbsp;·&nbsp; Subtotal ₡ {fmt2(p.documentos.reduce((s,d) => s+(d.abono??d.saldoPendiente),0))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Agregar otro proveedor */}
            <button style={{ fontSize:12, color:BRAND, background:'none', border:'none', cursor:'pointer', fontFamily:F, textAlign:'left', padding:0 }}>
              + Agregar otro proveedor
            </button>

            {/* Líneas de ajuste */}
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:13, fontWeight:600 }}>Líneas de ajuste</span>
                <button style={{ height:28, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#FFFFFF', cursor:'pointer', fontSize:11, fontFamily:F }}>+ Agregar línea</button>
              </div>
              <div style={TABLA.wrap}><table className="tabla" style={TABLA.table}>
                <thead><tr style={TABLA.headRow}>
                  {['Cuenta / Centro de costos','Documento','Moneda','Monto',''].map(h => (
                    <th key={h} style={TABLA.th}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {lineasAjuste.map(l => (
                    <tr key={l.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                      <td style={{ padding:'8px 12px' }}><span style={{ fontSize:11 }}>{l.cuenta}</span></td>
                      <td style={{ padding:'8px 12px', fontFamily:F, fontSize:11 }}>{l.documento}</td>
                      <td style={{ padding:'8px 12px' }}><span style={{ fontSize:11, padding:'2px 8px', background:C.n200, borderRadius:4 }}>{l.moneda}</span></td>
                      <td style={{ padding:'8px 12px', fontSize:11 }}>{fmt2(l.monto)}</td>
                      <td style={{ padding:'8px 12px' }}><button style={{ background:'none', border:'none', cursor:'pointer', color:C.error }}>×</button></td>
                    </tr>
                  ))}
                  <tr style={{ background:'#F9F9F9', borderTop:`2px solid ${C.n500}` }}>
                    <td colSpan={3} style={{ padding:'8px 12px', fontWeight:600, fontSize:12 }}>Total</td>
                    <td style={{ padding:'8px 12px', fontSize:12 }}><Monto sym="₡" valor={fmt2(lineasAjuste.reduce((s,l)=>s+l.monto,0))}/></td>
                    <td/>
                  </tr>
                </tbody>
              </table></div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ width:200, borderLeft:`1px solid ${C.n500}`, padding:'16px 14px', flexShrink:0 }}>
            <p style={{ fontSize:12, fontWeight:600, margin:'0 0 12px' }}>RESUMEN DEL LOTE</p>
            <p style={{ fontSize:11, fontWeight:600, color:BRAND, margin:'0 0 8px' }}>ARCHIVO BANCARIO</p>
            {proveedores.map(p => (
              <div key={p.id} style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
                <span style={{ color:'#0F0F0F' }}>{p.nombre.split(' ').slice(0,2).join(' ')}</span>
                <span>₡ {fmt2(p.documentos.reduce((s,d)=>s+(d.abono??d.saldoPendiente),0))}</span>
              </div>
            ))}
            <div style={{ borderTop:`1px solid ${C.n500}`, paddingTop:6, marginTop:6 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:600 }}>
                <span>Total pagado</span><span>₡ {fmt2(totalPagado)}</span>
              </div>
            </div>
            <div style={{ marginTop:14 }}>
              <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, cursor:'pointer' }}>
                <input type="checkbox" aria-label="Seleccionar" checked={detallado} onChange={e => setDetallado(e.target.checked)} style={{ accentColor:BRAND }}/>
                Vista detallada (retenciones)
              </label>
            </div>
          </div>
        </div>

        {/* Pie */}
        <div style={{ borderTop:`1px solid ${C.n500}`, padding:'12px 24px', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <Btn variant="danger" onClick={onClose}>Descartar</Btn>
          <Btn onClick={onClose}>Aplicar operación</Btn>
        </div>
      </div>
    </div>
  );
}
