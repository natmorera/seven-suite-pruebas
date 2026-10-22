'use client';
import { Fragment } from 'react';
import { Modal, Toast, Section } from '@/components/ui/primitives';
import { Button, FormField, Input, Select } from '@/components/ui/formulario';
import { radius, shadow, TABLA, PAGE_PAD , C } from '@/components/ui/tokens';
import { ExportListModal } from '@/components/ui/exportar';
import { ModalNuevoEjercicio } from './ModalNuevoEjercicio';
import { F } from './datos';
import { ModalEditarEjercicio } from './modales';
import { MenuMas } from './piezas';
import { useEjercicioFiscal } from './useEjercicioFiscal';
import { PeriodosEjercicio } from './PeriodosEjercicio';

export function TabEjercicioFiscal(props: Parameters<typeof useEjercicioFiscal>[0]) {
  const e = useEjercicioFiscal(props);
  const { ejercicios, expandedId, setExpandedId, setEditId, setModalCierreId, setModalRevertirId, showT, cierrePeriodo, ejercicioById, cierreStep, setCierrePeriodo, setCierreStep, cambiarEstadoPeriodo, confirm, setConfirm, confirmCambio, modalCierreId, ejecutarCierre, cuentaRes, setCuentaRes, modalRevertirId, revertirCierre, motivo, setMotivo, editId, setEjercicios, modalNuevo, onModalNuevoChange, showExportar, exportEjercicio, onShowExportarChange, toast, setToast } = e;
  return (
    <div style={{ height:'100%', overflowY:'auto', padding:PAGE_PAD }}><Section title="Ejercicios fiscales" hint="Cada ejercicio con sus períodos. Expandí una fila para ver y cerrar sus períodos.">

      {/* Lista de ejercicios - una sola pantalla, sin pestañas. Cada fila trae
          sus propias acciones, mostradas u ocultas según el estado del
          ejercicio (ej. "Revertir cierre" no aparece si nunca se cerró). */}
      <div style={TABLA.wrap}>
        <table className="tabla" style={TABLA.table}>
          <thead style={{ position:'sticky', top:0, background:'#FFFFFF', zIndex:1 }}>
            <tr style={TABLA.headRow}>
              {['','Ejercicio','Empresa','Código','Estado','Períodos cerrados','Acciones'].map((h,i)=>(
                <th key={h+i} style={TABLA.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ejercicios.map(ej=>{
              const isOpen = expandedId===ej.id;
              const cerrados = ej.periodos.filter(p=>p.estado==='Bloqueado').length;
              return (
                <Fragment key={ej.id}>
                <tr style={{ borderBottom:'1px solid #ECECEC', cursor:'pointer', background:ej.estado==='activo' ? C.brandBg : '#FFFFFF' }}
                  onClick={()=>setExpandedId(isOpen?null:ej.id)}>
                  <td style={{ padding:'8px 12px', width:28 }}>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.6" strokeLinecap="round"
                      style={{ transform:isOpen?'rotate(90deg)':'none', transition:'transform .12s' }}>
                      <path d="M5 3l5 4-5 4"/>
                    </svg>
                  </td>
                  <td style={{ padding:'8px 12px', color:C.n900 }}>{ej.anio}</td>
                  <td style={{ padding:'8px 12px' }}>{ej.empresa}</td>
                  <td style={{ padding:'8px 12px' }}>{ej.codigo}</td>
                  <td style={{ padding:'8px 12px' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11, fontWeight:500, color: ej.estado==='activo'?C.success:C.n700 }}>
                      <span style={{ width:7, height:7, borderRadius:'50%', background: ej.estado==='activo'?C.success:C.n700 }}/>
                      {ej.estado==='activo'?'Activa':'Cerrada'}
                    </span>
                  </td>
                  <td style={{ padding:'8px 12px' }}>{cerrados} de {ej.periodos.length}</td>
                  <td style={{ padding:'8px 12px' }} onClick={e=>e.stopPropagation()}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                      <button title="Editar" onClick={()=>setEditId(ej.id)}
                        style={{ width:28, height:28, border:'none', borderRadius:5, background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.n700 }}>
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-9 9H2v-3l9-9z"/></svg>
                      </button>
                      {/* Cierre fiscal / Revertir cierre - mutuamente excluyentes según estado,
                          nunca los dos a la vez: no tiene sentido revertir un ejercicio que
                          nunca se cerró, ni volver a cerrar uno que ya está cerrado. */}
                      {ej.estado==='activo' ? (
                        <Button onClick={()=>setModalCierreId(ej.id)}>Cierre fiscal</Button>
                      ) : (
                        <Button variant="danger" onClick={()=>setModalRevertirId(ej.id)}>Revertir cierre</Button>
                      )}
                      <MenuMas
                        onActualizarSaldo={()=>showT(`Saldo de cuentas del ejercicio ${ej.anio} actualizado.`)}
                        onRecalcularDocs={()=>showT(`Documentos pendientes del ejercicio ${ej.anio} recalculados.`)}
                      />
                    </div>
                  </td>
                </tr>
                {isOpen && <PeriodosEjercicio e={e} ej={ej} />}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Modal cierre de período ── */}
      {cierrePeriodo && (() => {
        const ej = ejercicioById(cierrePeriodo.ejercicioId);
        const per = ej.periodos.find(p=>p.orden===cierrePeriodo.orden)!;
        const step = cierreStep || 'validando';
        const isListo = step === 'listo';
        return (
          <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center' }}>
            <div style={{ background:'#FFFFFF',borderRadius:radius.lg,width:520,fontFamily:F,boxShadow:shadow.modal }}>
              <div style={{ padding:'16px 20px',borderBottom:'1px solid #ECECEC',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <div>
                  <span style={{ fontSize:14,fontWeight:600,color:'#0F0F0F' }}>Cierre de periodo / {per.titulo} {ej.anio}</span>
                  <span style={{ fontSize:11,color:'#757575',marginLeft:8 }}>{isListo?'Todas las validaciones completadas. Listo para cerrar.':'Complete todas las validaciones antes de cerrar el período.'}</span>
                </div>
                <button onClick={()=>{setCierrePeriodo(null);setCierreStep(null);}} style={{ background:'none',border:'none',cursor:'pointer',color:'#757575',fontSize:20 }}>×</button>
              </div>
              <div style={{ padding:20, display:'flex', flexDirection:'column', gap:10 }}>
                {!isListo && (
                  <div style={{ padding:'10px 14px',background:'#FFF8EC',border:'1px solid #EED89A',borderRadius:radius.md,display:'flex',gap:8,alignItems:'flex-start' }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#A77600"><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3M7 9.5h.01" strokeLinecap="round"/></svg>
                    <span style={{ fontSize:11,color:'#7A5800' }}>El sistema verificó las condiciones del período. Complete las validaciones pendientes para habilitar el cierre.</span>
                  </div>
                )}
                {[
                  { label:'Asientos pendientes de contabilizar', sub:'Todos los asientos del mes han sido contabilizados. (12 asientos)', ok:true, badge:'Completado' },
                  { label:'Diferencial cambiario', sub:'Aplicado el 06/06/2026 al tipo 450.85. Asiento: 60200001.', ok:isListo, badge:isListo?'Completado':'Pendiente', action:!isListo },
                  { label:'Conciliaciones bancarias', sub:'3 cuentas de tipo banco no han realizado la conciliación', ok:isListo, badge:isListo?'Advertencia aceptada':'Advertencia', warn:!isListo },
                  { label:'Asientos de cierre', sub:'Se generarán al ejecutar el cierre.', ok:isListo, badge:isListo?'Listo':'En espera' },
                ].map((item,i)=>(
                  <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:10,padding:'10px 14px',border:'1px solid #ECECEC',borderRadius:radius.md }}>
                    <div style={{ width:18,height:18,borderRadius:'50%',flexShrink:0,marginTop:1,display:'flex',alignItems:'center',justifyContent:'center',
                      background:item.ok?'#4CAF50':item.warn?'#EEB300':'#ECECEC' }}>
                      {item.ok && <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                      {!item.ok && !item.warn && <span style={{ fontSize:10.5,color:'#757575',fontWeight:600 }}>{i+1}</span>}
                      {item.warn && <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"><path d="M7 4v4M7 10h.01"/></svg>}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:12,fontWeight:500,color:'#0F0F0F',margin:'0 0 2px',fontFamily:F }}>{item.label}</p>
                      <p style={{ fontSize:11,color:item.warn&&!isListo?'#A77600':'#757575',margin:0,fontFamily:F }}>{item.sub}</p>
                      {item.action && (
                        <div style={{ display:'flex',alignItems:'center',gap:8,marginTop:6 }}>
                          <span style={{ fontSize:11,color:'#757575' }}>Tipo de cambio:</span>
                          <input aria-label="Tipo de cambio:" defaultValue="450.85" style={{ width:80,height:26,padding:'0 8px',border:'1px solid #ECECEC',borderRadius:5,fontSize:12,fontFamily:F,outline:'none' }}/>
                          <button onClick={()=>setCierreStep('listo')}
                            style={{ height:26,padding:'0 10px',border:'none',borderRadius:5,background:'#A77600',color:'#FFFFFF',fontSize:11,cursor:'pointer',fontFamily:F,fontWeight:500 }}>
                            Calcular y aplicar
                          </button>
                        </div>
                      )}
                      {item.warn && !isListo && (
                        <label style={{ display:'flex',alignItems:'center',gap:6,marginTop:6,cursor:'pointer',fontSize:11,fontFamily:F,color:'#757575' }}>
                          <input type="checkbox" aria-label="Seleccionar" onChange={e=>e.target.checked&&setCierreStep('listo')} style={{ accentColor:'#A77600' }}/>
                          Continuar sin conciliarlas
                        </label>
                      )}
                    </div>
                    <span style={{ fontSize:10.5,fontWeight:500,padding:'2px 8px',borderRadius:radius.pill,whiteSpace:'nowrap',flexShrink:0,
                      color:item.ok?'#2E7D32':item.warn?'#E07B00':'#757575',
                      background:item.ok?'#E8F5E9':item.warn?'#FFF3E0':'#F9F9F9',
                      border:`1px solid ${item.ok?'#A5D6A7':item.warn?'#FFCC80':'#ECECEC'}` }}>
                      {item.badge}
                    </span>
                  </div>
                ))}
                {isListo && (
                  <div style={{ padding:'10px 14px',background:'#E3F2FD',border:'1px solid #90CAF9',borderRadius:radius.md }}>
                    <span style={{ fontSize:11,color:'#1565C0',fontFamily:F }}>
                      Al ejecutar el cierre el período <strong>{per.titulo} {ej.anio}</strong> quedará bloqueado. El saldo de cierre se traslada automáticamente como saldo de apertura del siguiente período.
                    </span>
                  </div>
                )}
              </div>
              <div style={{ padding:'12px 20px',borderTop:'1px solid #ECECEC',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <button onClick={()=>{setCierrePeriodo(null);setCierreStep(null);}}
                  style={{ height:32,padding:'0 14px',border:'1px solid #ECECEC',borderRadius:7,background:'#FFFFFF',cursor:'pointer',fontSize:12,fontFamily:F,color:'#757575' }}>
                  {isListo?'Cancelar':'Cerrar sin guardar'}
                </button>
                {isListo && (
                  <button onClick={()=>{
                    cambiarEstadoPeriodo(cierrePeriodo.ejercicioId,cierrePeriodo.orden,'Bloqueado');
                    setCierrePeriodo(null);setCierreStep(null);
                    showT(`Período ${per.titulo} cerrado correctamente.`);
                  }} style={{ height:32,padding:'0 18px',border:'none',borderRadius:7,background:'#A77600',color:'#FFFFFF',cursor:'pointer',fontSize:12,fontFamily:F,fontWeight:500 }}>
                    Ejecutar cierre
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Confirm estado change */}
      {confirm && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.35)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <div style={{ background:'#FFFFFF',borderRadius:10,padding:24,maxWidth:400,width:'90%',fontFamily:F,boxShadow:'0 8px 40px rgba(0,0,0,.18)' }}>
            <h3 style={{ fontSize:14,fontWeight:500,margin:'0 0 12px' }}>
              {confirm.estado==='Bloqueado'?'Cerrar período':'Reaperturar período'}
            </h3>
            <p style={{ fontSize:12,color:C.n700,marginBottom:20 }}>
              ¿Está seguro que desea {confirm.estado==='Bloqueado'?'cerrar':'reaperturar'} este período?
              {confirm.estado==='Bloqueado'?' Los asientos no se podrán modificar una vez cerrado.':`  El período volverá a estar activo para edición.`}
            </p>
            <div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>
              <Button variant="secondary" onClick={()=>setConfirm(null)}>Cancelar</Button>
              <Button variant={confirm.estado==='Bloqueado'?'primary':'secondary'} onClick={confirmCambio}>Confirmar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de cierre */}
      {modalCierreId && (() => { const ej = ejercicioById(modalCierreId); return (
        <Modal open title={`Ejecutar cierre de ejercicio ${ej.anio}`} onClose={()=>setModalCierreId(null)}
          footer={<div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}><Button variant="secondary" onClick={()=>setModalCierreId(null)}>Cancelar</Button><Button onClick={()=>ejecutarCierre(ej.id)}>Ejecutar cierre</Button></div>}>
          <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
            <div style={{ marginBottom:4 }}>
              <span style={{ fontSize:11,background:C.brandBg,color:C.brand,padding:'2px 10px',borderRadius:radius.pill,border:`1px solid ${C.brandBd}` }}>Tipo de cierre: Automático</span>
            </div>
            <FormField label="Empresa"><Input value={ej.empresa} onChange={()=>{}} readOnly /></FormField>
            <FormField label="Cuenta de resultados" required>
              <Select value={cuentaRes} onChange={setCuentaRes} options={[{value:'015-004943-0',label:'015-004943-0'},{value:'300-001-0001',label:'300-001-0001'}]} />
            </FormField>
          </div>
        </Modal>
      ); })()}

      {/* Modal para revertir */}
      {modalRevertirId && (() => { const ej = ejercicioById(modalRevertirId); return (
        <Modal open title={`Revertir cierre de ejercicio ${ej.anio}`} onClose={()=>setModalRevertirId(null)}
          footer={<div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}><Button variant="secondary" onClick={()=>setModalRevertirId(null)}>Cancelar</Button><Button variant="danger" onClick={()=>revertirCierre(ej.id)}>Revertir cierre</Button></div>}>
          <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
            <span style={{ fontSize:11,background:C.brandBg,color:C.brand,padding:'2px 10px',borderRadius:radius.pill,border:`1px solid ${C.brandBd}` }}>Tipo de cierre: Automático</span>
            <FormField label="Ejercicio a revertir" required>
              <Input value={`${ej.anio} – Bloqueado el 15/01/${ej.anio+1}`} onChange={()=>{}} readOnly />
            </FormField>
            <FormField label="Motivo de reversión" required>
              <Input value={motivo} onChange={setMotivo} placeholder="Ej. Corrección de asientos de cierre" />
            </FormField>
          </div>
        </Modal>
      ); })()}

      {/* Modal de edición */}
      {editId && (
        <ModalEditarEjercicio ejercicio={ejercicioById(editId)} onClose={()=>setEditId(null)}
          onGuardar={(patch)=>{ setEjercicios(list=>list.map(e=>e.id===editId?{...e,...patch}:e)); setEditId(null); showT('Ejercicio actualizado correctamente.'); }}/>
      )}

      {modalNuevo && (
        <ModalNuevoEjercicio ejercicios={ejercicios} onClose={()=>onModalNuevoChange(false)}
          onCrear={(nuevo)=>{ setEjercicios(p=>[nuevo,...p]); setExpandedId(nuevo.id); onModalNuevoChange(false); showT(`Ejercicio ${nuevo.anio} creado correctamente.`); }}/>
      )}
      {showExportar && exportEjercicio && (
        <ExportListModal
          title={`Ejercicios Fiscales - ${exportEjercicio.empresa}`}
          subtitulo={`Listado de Ejercicio: ${exportEjercicio.anio}`}
          filename={`ejercicios-fiscales-${exportEjercicio.anio}`}
          columns={[
            { key:'orden', label:'Orden', align:'right' }, { key:'desde', label:'Desde' }, { key:'hasta', label:'Hasta' },
            { key:'titulo', label:'Título' }, { key:'dias', label:'Días', align:'right' }, { key:'estado', label:'Estado' },
          ]}
          rows={exportEjercicio.periodos.map(p=>({ orden:p.orden, desde:p.desde, hasta:p.hasta, titulo:p.titulo, dias:p.dias||'', estado:p.estado }))}
          onClose={()=>onShowExportarChange(false)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)} />}
    </Section></div>
  );
}
