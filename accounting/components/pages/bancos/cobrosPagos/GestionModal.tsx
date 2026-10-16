'use client';
import { useState } from 'react';
import { PresenciaOperacion } from '../../../ui/primitives';
import { C, radius, shadow, TABLA } from '../../../ui/tokens';
import { Monto } from '../../../ui/montos';
import { ENLACES_AJUSTE_INIT, enlacesPara, NOTA_ADMINISTRATIVA } from '../../catalogo/datos/ajustes';
import { FacturasModal } from './FacturasModal';
import { BANCOS, BANCOS_CON_CHEQUERA, BRAND, CUENTAS_CLIENTES, CUENTAS_PROVEEDORES, ESTADO_STYLE, F, FACTURAS_MOCK, FACTURAS_PAGO_MOCK, type LineaAjuste, type Operacion, fmt2 } from './datos';
import { SelAuxModal } from './modales';
import { Btn, Pill } from './piezas';

export function GestionModal({ op, onClose, onSave }: {
  op: Operacion; onClose: () => void; onSave: (updated: Operacion) => void;
}) {
  const isCobro = op.tipo === 'Cobro';
  const [form, setForm] = useState({ ...op });
  const [showSelAux, setShowSelAux] = useState(false);
  const [showFacturas, setShowFacturas] = useState(false);
  const [editingTipoCambio, setEditingTipoCambio] = useState(false);
  const [tipoCambio, setTipoCambio] = useState('10000');
  const [lineasOpen, setLineasOpen] = useState(true);
  const [facturasOpen, setFacturasOpen] = useState(true);
  const [generarCheque, setGenerarCheque] = useState(false);

  // Generar título autopropuesto: "Gestión de cobro/pago - {cliente} - {consecutivo}"
  function autopropuesto(nombre: string) {
    return `${isCobro ? 'Gestión de cobro' : 'Gestión de pago'} - ${nombre} - ${op.consecutivo}`;
  }

  const bancoTieneChequera = BANCOS_CON_CHEQUERA.has(form.banco);

  const sym = form.moneda === 'USD' ? '$' : '₡';
  const totalFacturas = form.facturas.reduce((s,f) => s + (f.abono ?? f.saldoPendiente), 0);
  // Signo automático según el tipo de movimiento: la persona solo escribe el
  // monto positivo, el sistema decide si suma o resta (retenciones y ajuste
  // débito restan porque representan dinero que no entró al banco; ajuste
  // crédito y nota administrativa suman porque es dinero de más). Sin tipo
  // (línea manual, como funcionaba antes) se respeta el signo tal cual se
  // escribió, para no romper nada existente.
  function montoEfectivo(l: LineaAjuste) {
    if (!l.tipoMovimiento) return l.monto;
    if (l.tipoMovimiento === NOTA_ADMINISTRATIVA.value) return Math.abs(l.monto) * NOTA_ADMINISTRATIVA.signo;
    const signo = ENLACES_AJUSTE_INIT.find(e=>e.tipoMovimiento===l.tipoMovimiento)?.signo ?? 1;
    return Math.abs(l.monto) * signo;
  }
  const totalAjuste   = form.lineasAjuste.reduce((s,l) => s + montoEfectivo(l), 0);
  const importe       = form.importe;
  const asignado      = totalFacturas;
  const ajuste        = totalAjuste;
  const diferencia    = importe - asignado - ajuste;
  const hasDiferencia = Math.abs(diferencia) > 0.01;

  function addLinea() {
    setForm(f => ({ ...f, lineasAjuste: [...f.lineasAjuste, { id:Date.now(), cuenta:'', documento:'', moneda:`¢ ${f.moneda}`, monto:0, tipoMovimiento:'', justificacion:'' }] }));
  }
  function removeLinea(id: number) {
    setForm(f => ({ ...f, lineasAjuste: f.lineasAjuste.filter(l => l.id !== id) }));
  }
  function updateLinea(id: number, field: string, value: string | number) {
    setForm(f => ({ ...f, lineasAjuste: f.lineasAjuste.map(l => {
      if (l.id !== id) return l;
      const next = { ...l, [field]: value };
      // Al elegir "Nota administrativa" se fuerza la cuenta del cliente/proveedor
      // de la operación - no admite otra cuenta.
      if (field === 'tipoMovimiento' && value === NOTA_ADMINISTRATIVA.value) {
        next.cuenta = `${f.cuentaContable}: ${f.nombreAux}`;
      }
      // Al cambiar de tipo, si la cuenta ya no aplica (venía de otro tipo), la
      // limpiamos para que se vuelva a elegir entre las cuentas enlazadas.
      if (field === 'tipoMovimiento' && value !== NOTA_ADMINISTRATIVA.value && l.tipoMovimiento !== value) {
        next.cuenta = '';
      }
      return next;
    }) }));
  }

  const auxNombre = isCobro ? 'Cuentas por cobrar' : 'Cuentas por pagar';
  const tipoInfo  = isCobro ? 'INFORMACIÓN DEL CLIENTE' : 'INFORMACIÓN DEL PROVEEDOR';

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20, overflowY:'auto' }}
      onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:'100%', maxWidth:1180, boxShadow:shadow.modal, fontFamily:F, display:'flex', flexDirection:'column' }}
        onClick={e => e.stopPropagation()}>

        {/* Title bar */}
        <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
          <span style={{ fontSize:15, fontWeight:600 }}>Gestión de {isCobro?'cobro':'pago'}</span>
          <span style={{ fontSize:13, color:C.n700 }}>{form.consecutivo}</span>
          <Pill color={ESTADO_STYLE[form.estado][0]} bg={ESTADO_STYLE[form.estado][1]}>{form.estado}</Pill>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:14 }}>
            <PresenciaOperacion/>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, fontSize:20, padding:4 }}>×</button>
          </div>
        </div>

        <div style={{ display:'flex', flex:1, minHeight:0 }}>
          {/* Left - main form */}
          <div style={{ flex:1, overflowY:'auto', padding:'18px 24px', display:'flex', flexDirection:'column', gap:18 }}>

            {/* Sección cliente/proveedor */}
            <div>
              <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>{tipoInfo}</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px 16px' }}>
                <div>
                  <label style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, margin:'0 0 4px', display:'block' }}>
                    Cuenta contable <span style={{ color:C.error }}>*</span>
                  </label>
                  <div style={{ position:'relative' }}>
                    <select
                      value={form.cuenta}
                      onChange={e => {
                        const lista = isCobro ? CUENTAS_CLIENTES : CUENTAS_PROVEEDORES;
                        const sel = lista.find(c => c.code === e.target.value);
                        if (sel) setForm(f => ({
                          ...f,
                          cuenta: sel.code,
                          nombreAux: sel.nombre,
                          auxId: sel.auxId,
                          cuentaContable: sel.code.split('-CLI')[0].split('-PRO')[0],
                          titulo: autopropuesto(sel.nombre),
                        }));
                      }}
                      style={{ width:'100%', height:36, paddingLeft:10, paddingRight:28, border:`1px solid ${form.cuenta?BRAND:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', appearance:'none', background:'#FFFFFF' }}>
                      <option value="">- {isCobro?'Seleccionar cliente':'Seleccionar proveedor'} -</option>
                      {(isCobro ? CUENTAS_CLIENTES : CUENTAS_PROVEEDORES).map(ct=>(
                        <option key={ct.code} value={ct.code}>{ct.code} · {ct.nombre}</option>
                      ))}
                    </select>
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round"
                      style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
                      <path d="M3.5 5.25L7 8.75L10.5 5.25"/>
                    </svg>
                  </div>
                  <button onClick={() => setShowSelAux(true)} style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', fontFamily:F, padding:0, marginTop:4 }}>
                    {auxNombre}
                  </button>
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, display:'block', marginBottom:4 }}>Título / Leyenda</label>
                  <input value={form.titulo || (form.nombreAux ? autopropuesto(form.nombreAux) : '')}
                    onChange={e => setForm(f => ({ ...f, titulo:e.target.value }))}
                    placeholder={form.nombreAux ? autopropuesto(form.nombreAux) : 'Auto-propuesto al seleccionar cliente'}
                    style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                  <p style={{ fontSize:11, color:BRAND, margin:'3px 0 0', cursor:'pointer' }}>Auto-propuesto. Editable.</p>
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, display:'block', marginBottom:4 }}>Flujo (opcional)</label>
                  <input value={form.flujo} onChange={e => setForm(f => ({ ...f, flujo:e.target.value }))} placeholder={`${isCobro?'Cobro':'Pago'} de ${isCobro?'clientes':'proveedores'} - según catálogo`}
                    style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box', color:C.n700 }}/>
                </div>
              </div>
            </div>

            {/* Detalle del pago */}
            <div>
              <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>DETALLE DEL PAGO</p>
              <div style={{ display:'grid', gridTemplateColumns:'160px 180px 160px 1fr 1fr', gap:'8px 14px', alignItems:'flex-start' }}>
                <div>
                  <label style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, display:'block', marginBottom:4 }}>Fecha <span style={{ color:C.error }}>*</span></label>
                  <input type="date" value={form.fecha || ''} onChange={e => setForm(f => ({ ...f, fecha:e.target.value }))}
                    style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, display:'block', marginBottom:4 }}>Moneda <span style={{ color:C.error }}>*</span></label>
                  <div style={{ display:'flex', gap:6 }}>
                    {(['CRC','USD'] as const).map(m => (
                      <button key={m} onClick={() => setForm(f => ({ ...f, moneda:m }))} style={{
                        flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:12, fontFamily:F, fontWeight:500,
                        background: form.moneda===m ? BRAND : C.n200, color: form.moneda===m ? '#FFFFFF' : '#0F0F0F',
                      }}>{m === 'CRC' ? '¢ CRC' : '$ USD'}</button>
                    ))}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:4 }}>
                    {!editingTipoCambio ? (
                      <button onClick={() => setEditingTipoCambio(true)} style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, padding:0 }}>
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke={BRAND} strokeWidth="1.3"><path d="M9 2l3 3-9 9H2v-3l9-9z"/></svg>
                        Tipo de cambio: {tipoCambio}
                      </button>
                    ) : (
                      <>
                        <input value={tipoCambio} onChange={e => setTipoCambio(e.target.value)} onBlur={() => setEditingTipoCambio(false)}
                          style={{ height:26, width:90, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none' }} autoFocus/>
                        <button onClick={() => { setTipoCambio('10000'); setEditingTipoCambio(false); }}
                          style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                          ↺ Restaurar tipo de cambio
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {/* Importe - solo cobro */}
                {isCobro && (
                  <div>
                    <label style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, display:'block', marginBottom:4 }}>Importe</label>
                    <div style={{ display:'flex', alignItems:'center', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, gap:6 }}>
                      <span style={{ color:C.n700, fontSize:12 }}>{sym}</span>
                      <input type="number" value={form.importe||''} onChange={e => setForm(f => ({ ...f, importe:+e.target.value }))}
                        style={{ flex:1, border:'none', outline:'none', fontSize:12, fontFamily:F }}/>
                    </div>
                  </div>
                )}
                <div>
                  <label style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, display:'block', marginBottom:4 }}>Banco <span style={{ color:C.error }}>*</span></label>
                  <div style={{ position:'relative' }}>
                    <select style={{ width:'100%', height:36, paddingLeft:10, paddingRight:28, border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', appearance:'none', background:'#FFFFFF' }}>
                      {BANCOS.map(b => <option key={b}>{b}</option>)}
                    </select>
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round"
                      style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
                      <path d="M3.5 5.25L7 8.75L10.5 5.25"/>
                    </svg>
                  </div>
                  <span style={{ fontSize:11, color:BRAND, marginTop:3, display:'block' }}>Filtrado por moneda {form.moneda}</span>
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, display:'block', marginBottom:4 }}>
                    Referencia bancaria {!isCobro && <span style={{ color:C.error }}>*</span>}
                  </label>
                  <input value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia:e.target.value }))}
                    placeholder="Nro. transacción del banco"
                    style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box', color:C.n700 }}/>
                  {!isCobro && (
                    <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', marginTop:3, display:'flex', alignItems:'center', gap:4, padding:0 }}>
                      <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke={BRAND} strokeWidth="1.3"><path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3"/><path d="M11 6l-3 4-3-4M8 10V2"/></svg>
                      Exportar archivo bancario
                    </button>
                  )}
                </div>
              </div>
              {!isCobro && (
                <div style={{ marginTop:8, padding:'8px 12px', background:C.brandBg, borderRadius:radius.sm, fontSize:11, color:'#0F0F0F', border:`1px solid ${C.brandBd}` }}>
                  </div>
              )}
              {/* Toggle generar cheque - visible cuando banco tiene chequera */}
              {!isCobro && bancoTieneChequera && (
                <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                  border:`1px solid ${generarCheque ? C.brandBd : C.n500}`,
                  borderRadius:radius.md, background: generarCheque ? C.brandBg : '#FFFFFF', cursor:'pointer' }}
                  onClick={() => setGenerarCheque(v => !v)}>
                  <span style={{ position:'relative', width:16, height:16, flexShrink:0 }}>
                    <input type="checkbox" checked={generarCheque} onChange={e => setGenerarCheque(e.target.checked)}
                      onClick={e => e.stopPropagation()}
                      style={{ position:'absolute', opacity:0, width:16, height:16, margin:0, cursor:'pointer' }}/>
                    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', width:16, height:16, borderRadius:4,
                      border:`1.5px solid ${generarCheque ? BRAND : C.n500}`,
                      background: generarCheque ? BRAND : '#FFFFFF', transition:'all .12s' }}>
                      {generarCheque && (
                        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2.33 7L5.25 9.92L11.67 4.08"/>
                        </svg>
                      )}
                    </span>
                  </span>
                  <div>
                    <p style={{ fontSize:12, fontWeight:600, margin:0, color: generarCheque ? BRAND : '#0F0F0F' }}>Generar cheque</p>
                    <p style={{ fontSize:11, color:C.n700, margin:0 }}>Este banco tiene chequera habilitada. Se generará un cheque al aplicar.</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={generarCheque ? BRAND : C.n700} strokeWidth="1.4" style={{ marginLeft:'auto', flexShrink:0 }}>
                    <rect x="1" y="3" width="12" height="8" rx="1.5"/><path d="M4 6h4M4 8.5h2" strokeLinecap="round"/>
                  </svg>
                </div>
              )}
              {/* Datos del cheque */}
              {!isCobro && generarCheque && (
                <div style={{ marginTop:10, padding:'12px 14px', border:`1px solid ${C.brandBd}`, borderRadius:radius.md, background:'#FFFDF5' }}>
                  <p style={{ fontSize:11, fontWeight:600, color:'#0F0F0F', margin:'0 0 10px', display:'flex', alignItems:'center', gap:6 }}>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke={BRAND} strokeWidth="1.4"><rect x="1" y="3" width="12" height="8" rx="1.5"/><path d="M4 6h4M4 8.5h2" strokeLinecap="round"/></svg>
                    Datos del cheque
                  </p>
                  <div style={{ display:'grid', gridTemplateColumns:'160px 1fr 1fr', gap:'8px 14px' }}>
                    <div>
                      <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>N° cheque <span style={{ color:C.error }}>*</span></label>
                      <input placeholder="Ej. 0001234"
                        style={{ width:'100%', height:32, padding:'0 9px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                    </div>
                    <div>
                      <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>A nombre de</label>
                      <input defaultValue={form.nombreAux || ''}
                        style={{ width:'100%', height:32, padding:'0 9px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                    </div>
                    <div>
                      <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Fecha del cheque</label>
                      <input type="date"
                        style={{ width:'100%', height:32, padding:'0 9px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Facturas */}
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:'#0F0F0F' }}>Facturas a {isCobro?'cobrar':'pagar'}</span>
                  <span style={{ fontSize:11, color:C.n700 }}>({form.facturas.length} documento{form.facturas.length!==1?'s':''} seleccionado{form.facturas.length!==1?'s':''})</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <button onClick={() => setShowFacturas(true)} style={{ height:30, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:7, background:'#FFFFFF', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l-2-2"/></svg>
                    Seleccionar facturas
                  </button>
                  <button onClick={() => setFacturasOpen(v => !v)} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, padding:4 }}>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      {facturasOpen ? <path d="M3.5 8.75L7 5.25L10.5 8.75"/> : <path d="M3.5 5.25L7 8.75L10.5 5.25"/>}
                    </svg>
                  </button>
                </div>
              </div>
              {facturasOpen && (
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
                              <input type="number" defaultValue={f.abono ?? f.saldoPendiente}
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
              )}
            </div>

            {/* Líneas de ajuste */}
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:'#0F0F0F' }}>Líneas de ajuste</span>
                  <span style={{ fontSize:11, color:C.n700 }}>({form.lineasAjuste.length} línea{form.lineasAjuste.length!==1?'s':''})</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <button onClick={addLinea} style={{ height:30, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:7, background:'#FFFFFF', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>
                    + Agregar línea
                  </button>
                  <button onClick={() => setLineasOpen(v => !v)} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, padding:4 }}>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      {lineasOpen ? <path d="M3.5 8.75L7 5.25L10.5 8.75"/> : <path d="M3.5 5.25L7 8.75L10.5 5.25"/>}
                    </svg>
                  </button>
                </div>
              </div>
              {lineasOpen && (
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
                          <select value={l.tipoMovimiento} onChange={e => updateLinea(l.id,'tipoMovimiento',e.target.value)}
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
                            <select value={l.cuenta} onChange={e => updateLinea(l.id,'cuenta',e.target.value)}
                              style={{ width:'100%', height:30, padding:'0 6px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none' }}>
                              <option value="">Seleccioná una cuenta…</option>
                              {opcionesCuenta.map(o=>(
                                <option key={o.id} value={`${o.cuentaCode}: ${o.cuentaNombre}`}>{o.cuentaCode} - {o.cuentaNombre}</option>
                              ))}
                            </select>
                          ) : (
                            <input value={l.cuenta} onChange={e => updateLinea(l.id,'cuenta',e.target.value)} placeholder="Cuenta / centro de costos"
                              style={{ width:'100%', height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                          )}
                        </td>
                        <td style={{ padding:'6px 12px' }}>
                          <input value={l.documento} onChange={e => updateLinea(l.id,'documento',e.target.value)} placeholder="N° Documento"
                            style={{ width:110, height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                        </td>
                        <td style={{ padding:'6px 12px' }}>
                          <input value={l.justificacion} onChange={e => updateLinea(l.id,'justificacion',e.target.value)} placeholder="Motivo del ajuste"
                            style={{ width:160, height:30, padding:'0 8px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                        </td>
                        <td style={{ padding:'6px 12px' }}>
                          <input type="number" min={0} value={l.monto||''} onChange={e => updateLinea(l.id,'monto',+e.target.value)}
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
              )}
              {/* Con tipo de movimiento el monto siempre se escribe positivo -
                  el sistema aplica el signo correcto solo (retenciones y
                  ajuste débito restan, ajuste crédito y nota administrativa suman). */}
              {form.lineasAjuste.some(l=>l.tipoMovimiento) && (
                <p style={{ fontSize:10, color:C.n700, margin:'6px 0 0' }}>
                  Con "Tipo de movimiento" seleccionado no hace falta escribir el monto en negativo - el sistema aplica el efecto contable correcto.
                </p>
              )}
              {hasDiferencia && (
                <p style={{ fontSize:11, color:C.error, margin:'6px 0 0' }}>
                  No puedes finalizar esta operación con una diferencia.
                </p>
              )}
            </div>
          </div>

          {/* Right sidebar - info auxiliar + resumen */}
          <div style={{ width:220, borderLeft:`1px solid ${C.n500}`, padding:'18px 16px', flexShrink:0, display:'flex', flexDirection:'column', gap:16 }}>
            {form.cuenta ? (
              <div>
                <p style={{ fontSize:10, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 8px' }}>
                  {isCobro ? 'AUXILIAR SELECCIONADO' : 'PROVEEDOR SELECCIONADO'}
                </p>
                <p style={{ fontSize:13, fontWeight:600, color:'#0F0F0F', margin:'0 0 3px' }}>{form.nombreAux}</p>
                <p style={{ fontSize:11, color:C.n700, margin:'0 0 3px', fontFamily:F }}>
                  {form.auxId} · {form.cuentaContable}
                </p>
                <button style={{ fontSize:11, color:BRAND, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                  4 documentos pendientes
                </button>
              </div>
            ) : (
              <div style={{ padding:'20px 0', textAlign:'center' }}>
                <p style={{ fontSize:12, color:C.n700, margin:0 }}>Selecciona un {isCobro?'cliente':'proveedor'}</p>
              </div>
            )}

            {/* Resumen */}
            <div>
              <p style={{ fontSize:13, fontWeight:600, color:'#0F0F0F', margin:'0 0 10px' }}>Resumen</p>
              {[
                ['Importe',   importe,   false],
                ['Asignado',  asignado,  false],
                ['Ajuste',    ajuste !== 0 ? -ajuste : 0, ajuste !== 0],
                ['Diferencia',diferencia, hasDiferencia],
              ].map(([label, valor, isNeg]) => (
                <div key={label as string} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, fontSize:12 }}>
                  <span style={{ color:C.n700 }}>{label as string}</span>
                  <span style={{ fontWeight:500, color: isNeg ? C.error : label === 'Diferencia' && (valor as number) === 0 ? C.n700 : '#0F0F0F' }}>
                    {(valor as number) === 0 && label === 'Diferencia' ? '-' : `₡ ${fmt2(valor as number)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop:`1px solid ${C.n500}`, padding:'12px 24px', display:'flex', justifyContent:'flex-end', gap:8, flexShrink:0 }}>
          <Btn variant="danger" onClick={onClose}>Descartar</Btn>
          {form.estado === 'Pendiente' && (
            <Btn variant="secondary" onClick={() => { onSave({ ...form, estado:'Borrador' }); onClose(); }}>Guardar como borrador</Btn>
          )}
          {form.estado === 'Aplicado' ? (
            <Btn onClick={() => { onSave({ ...form, estado:'Contabilizado' as any }); onClose(); }}>
              Contabilizar
            </Btn>
          ) : (
            <Btn onClick={() => { onSave({ ...form, estado:'Aplicado' }); onClose(); }}
              disabled={hasDiferencia}>
              Aplicar operación
            </Btn>
          )}
        </div>
      </div>

      {/* Sub-modales */}
      {showSelAux && (
        <SelAuxModal tipo={isCobro ? 'Cliente' : 'Proveedor'}
          onSelect={c => setForm(f => ({ ...f, cuenta:c.code, nombreAux:c.nombre, auxId:c.auxId }))}
          onClose={() => setShowSelAux(false)}/>
      )}
      {showFacturas && (
        <FacturasModal
          facturas={isCobro ? FACTURAS_MOCK : FACTURAS_PAGO_MOCK}
          onApply={selected => setForm(f => ({ ...f, facturas: selected }))}
          onClose={() => setShowFacturas(false)}/>
      )}
    </div>
  );
}
