'use client';
import { useState } from 'react';
import { PresenciaOperacion } from '@/components/ui/primitives';
import { C, radius, shadow, TABLA } from '@/components/ui/tokens';
import { Monto } from '@/components/ui/montos';
import { AFILIADOS, BANCOS, BRAND, CUENTAS_TRANSITO, ESTADO_STYLE, F, type Liquidacion, VOUCHERS_MOCK, type Voucher, fmt2 } from './datos';
import { ImportarVouchersModal, VouchersModal } from './modales';
import { Btn, Pill } from './piezas';

// ── Modal: nueva liquidación ──────────────────────────────────────────────────
export function NuevaLiquidacionModal({ onClose, onSave }: { onClose: () => void; onSave: (liq: Liquidacion) => void }) {
  const [afiliado, setAfiliado] = useState(AFILIADOS[0]);
  const [vouchers, setVouchers] = useState<Voucher[]>(VOUCHERS_MOCK);
  const [showVouchers, setShowVouchers] = useState(false);
  const [showImportar, setShowImportar] = useState(false);
  const [vouchersOpen, setVouchersOpen] = useState(true);
  // línea(s) de ajuste - para cosas que no son comisión ni
  // retención por voucher, como el cobro anual de suscripción del datáfono.
  const [ajustes, setAjustes] = useState<{id:number; descripcion:string; monto:number}[]>([]);
  const [nuevoAjusteDesc, setNuevoAjusteDesc] = useState('');
  const [nuevoAjusteMonto, setNuevoAjusteMonto] = useState('');

  const totalBruto = vouchers.reduce((s,v)=>s+v.bruto,0);
  const comision  = totalBruto * (afiliado.comision/100);
  const retFuente = totalBruto * (afiliado.retFuente/100);
  const retIVA    = totalBruto * (afiliado.retIVA/100);
  const totalAjustes = ajustes.reduce((s,a)=>s+a.monto,0);
  const neto      = totalBruto - comision - retFuente - retIVA + totalAjustes;

  function agregarAjuste() {
    const monto = parseFloat(nuevoAjusteMonto);
    if (!nuevoAjusteDesc.trim() || isNaN(monto) || monto === 0) return;
    setAjustes(p=>[...p, { id:Date.now(), descripcion:nuevoAjusteDesc.trim(), monto }]);
    setNuevoAjusteDesc(''); setNuevoAjusteMonto('');
  }

  // Número de la liquidación nueva (de ejemplo); se fija al abrir el modal
  const [LIQ_NUM] = useState(() => `GT-${Math.floor(Math.random()*100+100)}`);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20, overflowY:'auto' }}
      onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:'100%', maxWidth:1480, boxShadow:shadow.modal, fontFamily:F, display:'flex', flexDirection:'column' }}
        onClick={e=>e.stopPropagation()}>

        {/* Título */}
        <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:14, fontWeight:600 }}>Nueva liquidación de tarjeta</span>
          <span style={{ fontSize:13, color:C.n700 }}>14</span>
          <Pill color={ESTADO_STYLE['Pendiente'][0]} bg={ESTADO_STYLE['Pendiente'][1]}>Pendiente</Pill>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:14 }}>
            <PresenciaOperacion/>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, fontSize:20 }}>×</button>
          </div>
        </div>

        {/* Info banner */}
        <div style={{ padding:'10px 24px', background:C.n200, borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', gap:8 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#3B82F6" strokeWidth="1.3"><circle cx="8" cy="8" r="6.33"/><path d="M8 5v3M8 10.5h.01"/></svg>
          <span style={{ fontSize:11, color:'#1E40AF' }}>Registra las ventas cobradas por datáfono en el período. El sistema calcula automáticamente la comisión del afiliado y las retenciones según el perfil configurado.</span>
        </div>

        <div style={{ display:'flex', flex:1 }}>
          {/* Formulario principal */}
          <div style={{ flex:1, padding:'16px 20px', overflowY:'auto', display:'flex', flexDirection:'column', gap:16 }}>
            {/* Información general */}
            <div>
              <p style={{ fontSize:10.5, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>INFORMACIÓN GENERAL</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'8px 14px' }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Cuenta de depósitos en tránsito <span style={{ color:C.error }}>*</span></label>
                  <select aria-label="Cuenta de depósitos en tránsito" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', appearance:'none' }}>
                    {CUENTAS_TRANSITO.map(c=><option key={c}>{c}</option>)}
                  </select>
                  <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:'3px 0' }}>Cuentas de tipo &quot;Depósitos en tránsito&quot;</button>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Afiliado <span style={{ color:C.error }}>*</span></label>
                  <select aria-label="Afiliado" value={afiliado.code} onChange={e=>setAfiliado(AFILIADOS.find(a=>a.code===e.target.value)??AFILIADOS[0])}
                    style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', appearance:'none' }}>
                    {AFILIADOS.map(a=><option key={a.code} value={a.code}>{a.label}</option>)}
                  </select>
                  <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:'3px 0' }}>Afiliados configurados en la cuenta</button>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Título / Leyenda</label>
                  <input aria-label="Título / Leyenda" defaultValue={`Gestión de tarjetas - Datáfono BAC ¢ - 14`} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                  <p style={{ fontSize:11, color:BRAND, margin:'3px 0 0' }}>Auto-propuesto.</p>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Flujo</label>
                  <input placeholder="Gestión de tarjetas" aria-label="Gestión de tarjetas" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box', color:C.n700 }}/>
                </div>
              </div>
            </div>

            {/* Detalle del traslado */}
            <div>
              <p style={{ fontSize:10.5, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>DETALLE DEL TRASLADO</p>
              <div style={{ display:'grid', gridTemplateColumns:'155px 175px 1fr 1fr 1fr', gap:'8px 14px', alignItems:'end' }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Fecha <span style={{ color:C.error }}>*</span></label>
                  <input aria-label="Fecha" type="date" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Moneda <span style={{ color:C.error }}>*</span></label>
                  <div style={{ display:'flex', gap:4 }}>
                    <button style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:11, fontFamily:F, fontWeight:500, background:BRAND, color:'#FFFFFF' }}>¢ CRC</button>
                    <button style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:11, fontFamily:F, background:C.n200 }}>$ USD</button>
                  </div>
                  <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:'3px 0' }}>Tipo de cambio: 1.0000</button>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Banco de acreditación <span style={{ color:C.error }}>*</span></label>
                  <select aria-label="Banco de acreditación" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', appearance:'none' }}>
                    {BANCOS.map(b=><option key={b}>{b}</option>)}
                  </select>
                  <span style={{ fontSize:11, color:BRAND }}>Filtrado por moneda CRC</span>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Referencia bancaria</label>
                  <input placeholder="Nro. transacción del banco" aria-label="Nro. transacción del banco" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box', color:C.n700 }}/>
                </div>
              </div>
              {/* Comision pills */}
              <div style={{ display:'flex', gap:10, marginTop:8, fontSize:11 }}>
                <span style={{ padding:'3px 10px', borderRadius:radius.lg, background:'rgba(239,159,39,.12)', color:'#7A5C00' }}>
                  Comisión afiliado <strong>{afiliado.comision}%</strong>
                </span>
                <span style={{ padding:'3px 10px', borderRadius:radius.lg, background:'rgba(226,75,74,.1)', color:'#C62828' }}>
                  Retención en la fuente <strong>{afiliado.retFuente}%</strong>
                </span>
                <span style={{ padding:'3px 10px', borderRadius:radius.lg, background:'rgba(59,130,246,.1)', color:'#1E3FAF' }}>
                  Retención IVA tarjetas <strong>{afiliado.retIVA}%</strong>
                </span>
                <span style={{ fontSize:10.5, color:C.n700, alignSelf:'center' }}>Porcentajes del perfil del afiliado. Se aplican automáticamente a cada voucher.</span>
              </div>
            </div>

            {/* Vouchers */}
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:600 }}>Vouchers del período <span style={{ fontSize:11, color:C.n700, fontWeight:400 }}>({vouchers.length} vouchers)</span></span>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>setShowImportar(true)} style={{ height:28, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#FFFFFF', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3"/><path d="M8 10V2M5 5l3-3 3 3"/></svg>
                    Importar vouchers
                  </button>
                  <button onClick={()=>setShowVouchers(true)} style={{ height:28, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#FFFFFF', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l-2-2"/></svg>
                    Seleccionar vouchers
                  </button>
                  <button onClick={()=>setVouchersOpen(v=>!v)} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      {vouchersOpen?<path d="M3.5 8.75L7 5.25L10.5 8.75"/>:<path d="M3.5 5.25L7 8.75L10.5 5.25"/>}
                    </svg>
                  </button>
                </div>
              </div>
              {vouchersOpen && (
                <div style={TABLA.wrap}><table className="tabla" style={TABLA.table}>
                  <thead><tr style={TABLA.headRow}>
                    {['Fecha','Documento','Descripción','Bruto','Neto',''].map(h=>(
                      <th key={h} style={{ ...TABLA.th, textAlign:h==='Bruto'||h==='Neto'?'right':'left' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {vouchers.map(v=>(
                      <tr key={v.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                        <td style={{ padding:'8px 12px' }}>{v.fecha}</td>
                        <td style={{ padding:'8px 12px', color:BRAND, fontFamily:F }}>{v.codigo}</td>
                        <td style={{ padding:'8px 12px' }}>{v.descripcion}</td>
                        <td style={{ padding:'8px 12px', textAlign:'right' }}><Monto sym="₡" valor={fmt2(v.bruto)}/></td>
                        <td style={{ padding:'8px 12px', textAlign:'right' }}><Monto sym="₡" valor={fmt2(v.neto)}/></td>
                        <td style={{ padding:'8px 12px' }}><button onClick={()=>setVouchers(p=>p.filter(x=>x.id!==v.id))} style={{ background:'none', border:'none', cursor:'pointer', color:C.error, fontSize:14 }}>×</button></td>
                      </tr>
                    ))}
                    <tr style={{ background:'#F9F9F9', borderTop:`2px solid ${C.n500}` }}>
                      <td colSpan={3} style={{ padding:'8px 12px', fontWeight:600, fontSize:12 }}>Total bruto</td>
                      <td style={{ padding:'8px 12px', fontWeight:600 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', gap:6 }}>
                          <span style={{ color:C.n700 }}>₡</span>
                          <span>{fmt2(totalBruto)}</span>
                        </div>
                      </td>
                      <td colSpan={2}/>
                    </tr>
                  </tbody>
                </table></div>
              )}
            </div>

            {/* Ajustes: espacio para cargos que no son comisión ni
                retención por voucher (ej. cobro anual de suscripción del datáfono) */}
            <div>
              <p style={{ fontSize:10.5, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>
                AJUSTES <span style={{ fontWeight:400, textTransform:'none', letterSpacing:'normal' }}>(opcional)</span>
              </p>
              {ajustes.length > 0 && (
                <div style={TABLA.wrap}><table className="tabla" style={{ ...TABLA.table, marginBottom:8 }}>
                  <tbody>
                    {ajustes.map(a=>(
                      <tr key={a.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                        <td style={{ padding:'8px 12px' }}>{a.descripcion}</td>
                        <td style={{ padding:'8px 12px', textAlign:'right', color:a.monto<0?C.error:C.success, whiteSpace:'nowrap' }}>
                          <Monto sym="₡" valor={(a.monto<0?'-':'+')+fmt2(Math.abs(a.monto))}/>
                        </td>
                        <td style={{ padding:'8px 12px', width:26 }}>
                          <button onClick={()=>setAjustes(p=>p.filter(x=>x.id!==a.id))} style={{ background:'none', border:'none', cursor:'pointer', color:C.error, fontSize:14 }}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
              <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3 }}>Descripción del ajuste</label>
                  <input value={nuevoAjusteDesc} onChange={e=>setNuevoAjusteDesc(e.target.value)} placeholder="Ej. Cobro anual de suscripción del datáfono" aria-label="Ej. Cobro anual de suscripción del datáfono"
                    style={{ width:'100%', height:34, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div style={{ width:150 }}>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3 }}>Monto (+/-)</label>
                  <input type="number" step="0.01" value={nuevoAjusteMonto} onChange={e=>setNuevoAjusteMonto(e.target.value)} placeholder="-15000" aria-label="-15000"
                    style={{ width:'100%', height:34, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <button onClick={agregarAjuste} style={{ height:34, padding:'0 14px', border:`1px solid ${BRAND}`, borderRadius:radius.md, background:'#FFF8EC', color:BRAND, cursor:'pointer', fontSize:11, fontWeight:500, fontFamily:F, whiteSpace:'nowrap' }}>
                  + Agregar ajuste
                </button>
              </div>
              <p style={{ fontSize:10.5, color:C.n700, margin:'6px 0 0' }}>Usa un monto negativo para cargos (ej. suscripción del datáfono) y positivo para créditos o correcciones a favor.</p>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ width:340, borderLeft:`1px solid ${C.n500}`, padding:'16px 18px', flexShrink:0 }}>
            <p style={{ fontSize:10.5, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 8px' }}>AFILIADO SELECCIONADO</p>
            <p style={{ fontSize:13, fontWeight:600, margin:'0 0 2px' }}>{afiliado.label.split('·')[1]?.trim() ?? afiliado.label}</p>
            <p style={{ fontSize:11, color:C.n700, margin:'0 0 3px', fontFamily:F }}>{afiliado.code} · Terminal 4654897</p>
            <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:0 }}>3 vouchers</button>

            <div style={{ marginTop:16 }}>
              <p style={{ fontSize:13, fontWeight:600, margin:'0 0 10px' }}>Resumen</p>
              {[
                ['Total bruto',         totalBruto, '#0F0F0F'],
                [`Comisión afiliado (${afiliado.comision}%)`, -comision, C.error],
                [`Comisión en la fuente (${afiliado.retFuente}%)`, -retFuente, C.error],
                [`Ret. IVA tarjetas (${afiliado.retIVA}%)`, -retIVA, C.error],
                ...(ajustes.length>0 ? [['Ajustes', totalAjustes, totalAjustes<0?C.error:C.success] as [string,number,string]] : []),
                ['Neto a acreditar', neto, BRAND],
              ].map(([l,v,color]) => (
                <div key={l as string} style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:11 }}>
                  <span style={{ color:C.n700 }}>{l as string}</span>
                  <span style={{ fontWeight: l==='Neto a acreditar'?700:500, color: color as string }}>
                    {(v as number)<0?'-':''}₡ {fmt2(Math.abs(v as number))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pie */}
        <div style={{ borderTop:`1px solid ${C.n500}`, padding:'12px 24px', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <Btn variant="danger" onClick={onClose}>Descartar</Btn>
          <Btn onClick={()=>{ onSave({ id:Date.now(), consecutivo:LIQ_NUM, fecha:'00/00/00', afiliado:afiliado.label, afiliadoCode:afiliado.code, cuentaTransito:CUENTAS_TRANSITO[0], referencia:'LIQ-'+Math.floor(Math.random()*99999), moneda:'CRC', importe:neto, usuario:'jperez', estado:'Pendiente' }); onClose(); }}>
            Aplicar operación
          </Btn>
        </div>

        {showVouchers && <VouchersModal onSelect={()=>{}} onClose={()=>setShowVouchers(false)}/>}
        {showImportar && <ImportarVouchersModal onClose={()=>setShowImportar(false)}/>}
      </div>
    </div>
  );
}
