'use client';
import { useState } from 'react';
import { PresenciaOperacion } from '../../../ui/primitives';
import { C, radius, shadow, TABLA } from '../../../ui/tokens';
import { BANCOS_DESTINO, BRAND, CUENTAS_EFECTIVO, type Deposito, ESTADO_STYLE, F, PARTIDAS_MOCK, type Partida, fmt2 } from './datos';
import { Btn, Pill } from './piezas';

// ── Modal: Nuevo depósito ─────────────────────────────────────────────────────
export function NuevoDepositoModal({ onClose, onSave }: { onClose: ()=>void; onSave: (d: Deposito)=>void }) {
  const [partidas, setPartidas] = useState<Partida[]>(PARTIDAS_MOCK);
  const [partidasOpen, setPartidasOpen] = useState(true);
  const [importe, setImporte] = useState(55500);
  const [guardado, setGuardado] = useState(false); // simula estado contabilizado

  const incluidas    = partidas.filter(p=>p.incluida);
  const totalIncluidas = incluidas.reduce((s,p)=>s+p.importe, 0);
  const diferencia   = importe - totalIncluidas;
  const ajusteDif    = Math.abs(diferencia);

  function togglePartida(id: string) {
    setPartidas(p => p.map(x => x.id===id ? { ...x, incluida:!x.incluida } : x));
  }

  const IcCheck = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6.33"/><path d="M5 8l2 2 4-4"/></svg>;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20, overflowY:'auto' }}
      onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:'100%', maxWidth:1240, boxShadow:shadow.modal, fontFamily:F, display:'flex', flexDirection:'column' }}
        onClick={e=>e.stopPropagation()}>

        {/* Title */}
        <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:14, fontWeight:600 }}>Nuevo depósito en efectivo</span>
          <span style={{ fontSize:13, color:C.n700 }}>4340</span>
          <Pill color={ESTADO_STYLE['Pendiente'][0]} bg={ESTADO_STYLE['Pendiente'][1]}>Pendiente</Pill>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:14 }}>
            <PresenciaOperacion/>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, fontSize:20 }}>×</button>
          </div>
        </div>

        <div style={{ display:'flex', flex:1 }}>
          {/* Main */}
          <div style={{ flex:1, padding:'16px 20px', overflowY:'auto', display:'flex', flexDirection:'column', gap:16 }}>
            {/* Origen y destino */}
            <div>
              <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>ORIGEN Y DESTINO</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px 16px' }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Cuenta origen (efectivo) <span style={{ color:C.error }}>*</span></label>
                  <select style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', appearance:'none' }}>
                    {CUENTAS_EFECTIVO.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Banco y cuenta destino <span style={{ color:C.error }}>*</span></label>
                  <select style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', appearance:'none' }}>
                    {BANCOS_DESTINO.map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Título / Leyenda</label>
                  <input defaultValue="Depósito en efectivo - 4340" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                  <p style={{ fontSize:11, color:BRAND, margin:'3px 0 0' }}>Auto-propuesto.</p>
                </div>
              </div>
            </div>

            {/* Detalle del pago */}
            <div>
              <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>DETALLE DEL PAGO</p>
              <div style={{ display:'grid', gridTemplateColumns:'155px 155px 140px 190px 1fr', gap:'8px 14px', alignItems:'end' }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Fecha <span style={{ color:C.error }}>*</span></label>
                  <input type="date" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Moneda <span style={{ color:C.error }}>*</span></label>
                  <div style={{ display:'flex', gap:4 }}>
                    <button style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:11, fontFamily:F, fontWeight:500, background:BRAND, color:'#FFFFFF' }}>¢ CRC</button>
                    <button style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:11, fontFamily:F, background:C.n200 }}>$ USD</button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Tipo de cambio</label>
                  <input defaultValue="1.00" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Importe <span style={{ color:C.error }}>*</span></label>
                  <div style={{ display:'flex', alignItems:'center', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, gap:6 }}>
                    <span style={{ color:C.n700, fontSize:11 }}>₡</span>
                    <input type="number" value={importe} onChange={e=>setImporte(+e.target.value)} style={{ flex:1, border:'none', outline:'none', fontSize:12, fontFamily:F }}/>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Referencia bancaria</label>
                  <input placeholder="Nro. transacción del banco" style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box', color:C.n700 }}/>
                </div>
              </div>
            </div>

            {/* Partidas pendientes */}
            <div style={{ border:`1px solid ${C.n500}`, borderRadius:10, overflow:'hidden' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:C.n200 }}>
                <span style={{ fontSize:13, fontWeight:600 }}>Partidas pendientes de efectivo</span>
                <button onClick={()=>setPartidasOpen(v=>!v)} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    {partidasOpen?<path d="M3.5 8.75L7 5.25L10.5 8.75"/>:<path d="M3.5 5.25L7 8.75L10.5 5.25"/>}
                  </svg>
                </button>
              </div>
              {partidasOpen && (
                <>
                  {/* Summary row */}
                  <div style={{ display:'grid', gridTemplateColumns:'auto 1fr 1fr 1fr', gap:'4px 20px', padding:'10px 14px', background:'#F9F9F9', borderBottom:`1px solid ${C.n500}`, fontSize:12 }}>
                    <div>
                      <p style={{ fontSize:10, color:C.n700, margin:'0 0 2px' }}>Partidas</p>
                      <p style={{ fontSize:14, fontWeight:700, color:'#0F0F0F', margin:0 }}>{partidas.length}</p>
                    </div>
                    <div>
                      <p style={{ fontSize:10, color:C.n700, margin:'0 0 2px' }}>Total pendiente</p>
                      <p style={{ fontSize:12, fontWeight:600, color:'#0F0F0F', margin:0 }}>₡ {fmt2(partidas.reduce((s,p)=>s+p.importe,0))}</p>
                    </div>
                    <div>
                      <p style={{ fontSize:10, color:C.n700, margin:'0 0 2px' }}>Incluidas</p>
                      <p style={{ fontSize:12, fontWeight:600, color:BRAND, margin:0 }}>₡ {fmt2(totalIncluidas)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize:10, color:C.n700, margin:'0 0 2px' }}>Diferencia</p>
                      <p style={{ fontSize:12, fontWeight:600, color: ajusteDif>0 ? C.error : C.success, margin:0 }}>₡ {fmt2(ajusteDif)}</p>
                    </div>
                  </div>
                  {/* Rows */}
                  <table className="tabla" style={TABLA.table}>
                    <thead><tr style={TABLA.headRow}>
                      {['Comprobante','Fecha','Descripción','Importe CRC',''].map(h=>(
                        <th key={h} style={{ ...TABLA.th, textAlign:h==='Importe CRC'?'right':'left' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {partidas.map(p=>(
                        <tr key={p.id} style={{ borderBottom:'1px solid #ECECEC', background:p.incluida ? C.brandBg : '#FFFFFF' }}>
                          <td style={{ padding:'8px 12px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <input type="checkbox" checked={p.incluida} onChange={()=>togglePartida(p.id)} style={{ width:14, height:14, accentColor:BRAND }}/>
                              <span style={{ color: p.incluida ? BRAND : '#0F0F0F', fontFamily:F, fontWeight: p.incluida ? 600 : 400 }}>{p.comprobante}</span>
                            </div>
                          </td>
                          <td style={{ padding:'8px 12px' }}>{p.fecha}</td>
                          <td style={{ padding:'8px 12px', color:'#0F0F0F' }}>{p.descripcion}</td>
                          <td style={{ padding:'8px 12px', fontWeight:p.incluida ? 600 : 400 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', gap:6, minWidth:100 }}>
                            <span>₡</span>
                            <span>{fmt2(p.importe)}</span>
                          </div>
                        </td>
                          <td style={{ padding:'8px 12px' }}>
                            <button onClick={()=>setPartidas(ps=>ps.filter(x=>x.id!==p.id))} style={{ background:'none', border:'none', cursor:'pointer', color: p.incluida ? C.error : C.n500, fontSize:16 }}>×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>

          {/* Sidebar resumen */}
          <div style={{ width:230, borderLeft:`1px solid ${C.n500}`, padding:'16px 16px', flexShrink:0 }}>
            <p style={{ fontSize:13, fontWeight:600, margin:'0 0 14px' }}>Resumen</p>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:12 }}>
              <span style={{ color:C.n700 }}>Ajuste diferencial</span>
              <span style={{ fontWeight:600, color: ajusteDif>0 ? C.error : C.success }}>₡{fmt2(ajusteDif)}</span>
            </div>
            <div>
              <p style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, margin:'0 0 6px' }}>Cuenta para depositar el diferencial (opcional)</p>
              <select style={{ width:'100%', height:34, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:11, fontFamily:F, outline:'none', appearance:'none', background:'#FFFFFF' }}>
                <option>Seleccionar</option>
                <option>600-002-0001 – Diferencias</option>
              </select>
              <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:'4px 0', display:'block', fontFamily:F }}>Diferencia de vueltos</button>
            </div>
          </div>
        </div>

        {/* Footer - cambia según estado */}
        <div style={{ borderTop:`1px solid ${C.n500}`, padding:'12px 24px', display:'flex', justifyContent:'flex-end', gap:8 }}>
          {guardado ? (
            <>
              <Btn variant="danger" onClick={onClose}>Anular</Btn>
              <Btn variant="secondary" onClick={()=>{}}>Visualizar asiento</Btn>
              <Btn variant="ghost" icon={<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6.33"/><path d="M5 8l2 2 4-4"/></svg>}>
                Contabilizar
              </Btn>
            </>
          ) : (
            <>
              <Btn variant="danger" onClick={onClose}>Descartar</Btn>
              <Btn onClick={()=>{
                onSave({ id:Date.now(), consecutivo:`DEP-${Math.floor(Math.random()*1000+4000)}`, fecha:'00/00/00', estado:'Pendiente', cuentaOrigen:CUENTAS_EFECTIVO[0], bancoDestino:BANCOS_DESTINO[0], referencia:'-', moneda:'CRC', importe, usuario:'jperez' });
                onClose();
              }}>Aplicar operación</Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
