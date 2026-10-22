'use client';
import ComprobanteOperacionModal from '@/components/ui/documento/ComprobanteOperacion';
import { useEmpresaDoc } from '@/components/ui/documento/useEmpresaDoc';
import { comprobantesDeOp } from './comprobante';
import { useState } from 'react';
import { PresenciaOperacion } from '@/components/ui/primitives';
import { C, radius, shadow } from '@/components/ui/tokens';
import { FacturasModal } from './FacturasModal';
import { BANCOS, BRAND, CUENTAS_CLIENTES, CUENTAS_PROVEEDORES, ESTADO_STYLE, F, FACTURAS_MOCK, FACTURAS_PAGO_MOCK, fmt2 } from './datos';
import { SelAuxModal } from './modales';
import { Btn, Pill } from './piezas';
import { useGestion } from './gestion/useGestion';
import { SeccionChequera } from './gestion/SeccionChequera';
import { SeccionFacturas } from './gestion/SeccionFacturas';
import { SeccionLineasAjuste } from './gestion/SeccionLineasAjuste';

export function GestionModal(props: Parameters<typeof useGestion>[0]) {
  const e = useGestion(props);
  const [verComprobante, setVerComprobante] = useState(false);
  const empresaDoc = useEmpresaDoc();
  const { onClose, isCobro, form, tipoInfo, setForm, autopropuesto, setShowSelAux, auxNombre, editingTipoCambio, setEditingTipoCambio, tipoCambio, setTipoCambio, sym, bancoTieneChequera, generarCheque, setShowFacturas, setFacturasOpen, facturasOpen, addLinea, setLineasOpen, lineasOpen, hasDiferencia, importe, asignado, ajuste, diferencia, onSave, showSelAux, showFacturas } = e;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20, overflowY:'auto' }}
      onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:'100%', maxWidth:1180, boxShadow:shadow.modal, fontFamily:F, display:'flex', flexDirection:'column' }}
        onClick={e => e.stopPropagation()}>

        {/* Barra de título */}
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
          {/* Izquierda: formulario principal */}
          <div style={{ flex:1, overflowY:'auto', padding:'18px 24px', display:'flex', flexDirection:'column', gap:18 }}>

            {/* Sección cliente/proveedor */}
            <div>
              <p style={{ fontSize:10.5, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>{tipoInfo}</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px 16px' }}>
                <div>
                  <label style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, margin:'0 0 4px', display:'block' }}>
                    Cuenta contable <span style={{ color:C.error }}>*</span>
                  </label>
                  <div style={{ position:'relative' }}>
                    <select aria-label="Cuenta contable"
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
                    placeholder={form.nombreAux ? autopropuesto(form.nombreAux) : 'Auto-propuesto al seleccionar cliente'} aria-label={form.nombreAux ? autopropuesto(form.nombreAux) : 'Auto-propuesto al seleccionar cliente'}
                    style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                  <p style={{ fontSize:11, color:BRAND, margin:'3px 0 0', cursor:'pointer' }}>Auto-propuesto. Editable.</p>
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, display:'block', marginBottom:4 }}>Flujo (opcional)</label>
                  <input value={form.flujo} onChange={e => setForm(f => ({ ...f, flujo:e.target.value }))} placeholder={`${isCobro?'Cobro':'Pago'} de ${isCobro?'clientes':'proveedores'} - según catálogo`} aria-label={`${isCobro?'Cobro':'Pago'} de ${isCobro?'clientes':'proveedores'} - según catálogo`}
                    style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box', color:C.n700 }}/>
                </div>
              </div>
            </div>

            {/* Detalle del pago */}
            <div>
              <p style={{ fontSize:10.5, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>DETALLE DEL PAGO</p>
              <div style={{ display:'grid', gridTemplateColumns:'160px 180px 160px 1fr 1fr', gap:'8px 14px', alignItems:'flex-start' }}>
                <div>
                  <label style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, display:'block', marginBottom:4 }}>Fecha <span style={{ color:C.error }}>*</span></label>
                  <input aria-label="Fecha" type="date" value={form.fecha || ''} onChange={e => setForm(f => ({ ...f, fecha:e.target.value }))}
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
                        <input aria-label="Tipo de cambio" value={tipoCambio} onChange={e => setTipoCambio(e.target.value)} onBlur={() => setEditingTipoCambio(false)}
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
                      <input aria-label="Importe" type="number" value={form.importe||''} onChange={e => setForm(f => ({ ...f, importe:+e.target.value }))}
                        style={{ flex:1, border:'none', outline:'none', fontSize:12, fontFamily:F }}/>
                    </div>
                  </div>
                )}
                <div>
                  <label style={{ fontSize:11, color:'#0F0F0F', fontWeight:500, display:'block', marginBottom:4 }}>Banco <span style={{ color:C.error }}>*</span></label>
                  <div style={{ position:'relative' }}>
                    <select aria-label="Banco" style={{ width:'100%', height:36, paddingLeft:10, paddingRight:28, border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', appearance:'none', background:'#FFFFFF' }}>
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
                    placeholder="Nro. transacción del banco" aria-label="Nro. transacción del banco"
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
              {/* Interruptor para generar cheque, visible cuando el banco tiene chequera */}
              {!isCobro && bancoTieneChequera && <SeccionChequera e={e} />}
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
                      <input placeholder="Ej. 0001234" aria-label="Ej. 0001234"
                        style={{ width:'100%', height:32, padding:'0 9px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                    </div>
                    <div>
                      <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>A nombre de</label>
                      <input aria-label="A nombre de" defaultValue={form.nombreAux || ''}
                        style={{ width:'100%', height:32, padding:'0 9px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                    </div>
                    <div>
                      <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:3, whiteSpace:'nowrap' }}>Fecha del cheque</label>
                      <input aria-label="Fecha del cheque" type="date"
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
              {facturasOpen && <SeccionFacturas e={e} />}
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
              {lineasOpen && <SeccionLineasAjuste e={e} />}
              {/* Con tipo de movimiento el monto siempre se escribe positivo -
                  el sistema aplica el signo correcto solo (retenciones y
                  ajuste débito restan, ajuste crédito y nota administrativa suman). */}
              {form.lineasAjuste.some(l=>l.tipoMovimiento) && (
                <p style={{ fontSize:10.5, color:C.n700, margin:'6px 0 0' }}>
                  Con &quot;Tipo de movimiento&quot; seleccionado no hace falta escribir el monto en negativo - el sistema aplica el efecto contable correcto.
                </p>
              )}
              {hasDiferencia && (
                <p style={{ fontSize:11, color:C.error, margin:'6px 0 0' }}>
                  No puedes finalizar esta operación con una diferencia.
                </p>
              )}
            </div>
          </div>

          {/* Columna derecha: datos del auxiliar y resumen */}
          <div style={{ width:220, borderLeft:`1px solid ${C.n500}`, padding:'18px 16px', flexShrink:0, display:'flex', flexDirection:'column', gap:16 }}>
            {form.cuenta ? (
              <div>
                <p style={{ fontSize:10.5, fontWeight:600, color:C.n700, textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 8px' }}>
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

        {verComprobante && <ComprobanteOperacionModal titulo={`Comprobante · ${form.titulo}`} comprobantes={comprobantesDeOp(form, empresaDoc)} archivo={`comprobante-${form.tipo.toLowerCase()}-${form.consecutivo}`} onClose={() => setVerComprobante(false)} marca={C.brand} />}
        {/* Pie */}
        <div style={{ borderTop:`1px solid ${C.n500}`, padding:'12px 24px', display:'flex', justifyContent:'flex-end', gap:8, flexShrink:0 }}>
          <Btn variant="danger" onClick={onClose}>Descartar</Btn>
          {form.estado === 'Pendiente' && (
            <Btn variant="secondary" onClick={() => { onSave({ ...form, estado:'Borrador' }); onClose(); }}>Guardar como borrador</Btn>
          )}
          {(form.estado === 'Aplicado' || form.estado === 'Contabilizado') && (
            <Btn variant="secondary" onClick={() => setVerComprobante(true)}>Ver comprobante</Btn>
          )}
          {form.estado === 'Aplicado' ? (
            <Btn onClick={() => { onSave({ ...form, estado:'Contabilizado' }); onClose(); }}>
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
