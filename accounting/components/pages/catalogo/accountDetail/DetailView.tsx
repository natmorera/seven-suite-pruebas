'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '../../../ui/primitives';
import { Button } from '../../../ui/formulario';
import { radius } from '../../../ui/tokens';
import { IcClose, IcEdit, IcTrash, IcCheck, IcCopy, IcPlus, IcUser } from '../../../ui/icons';
import { C } from '../../../ui/tokens';
import { Cuenta, GRUPOS_NIIF, TIPOS_ESPECIAL, NIVEL_LABELS, MONEDAS, TIPOS_IDENTIFICACION_FISCAL } from '../catalogoData';
import { fmt } from '../datos/arbol';
import { EnlaceAjuste, OPERACIONES_AJUSTE } from '../datos/ajustes';
import { useCentrosCostoConfig } from '../centrosCostoConfig';
import { TrasladoResult } from '../modalTrasladoSaldo/datos';
import { BRAND, F, GRUPOS_PATRIMONIO } from './datos';
import { Field2, Label } from './piezas';

// ── View mode ─────────────────────────────────────────────────────────────────
export function DetailView({ account, onEdit, onDelete, onAddChild, onClose, onSelect, allNodes, onTraslado, trasladoResult, enlacesAjuste }: {
  account:Cuenta; onEdit:()=>void; onDelete:(id:string)=>void; onAddChild:(p:Cuenta)=>void;
  onClose:()=>void; onSelect:(n:Cuenta)=>void; allNodes:Cuenta[];
  onTraslado:()=>void; trasladoResult:TrasladoResult|null;
  enlacesAjuste?: EnlaceAjuste[];
}) {
  const router = useRouter();
  const { centrosCosto: CENTROS_COSTO } = useCentrosCostoConfig();
  const [confirmDel, setConfirmDel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ccAsignados, setCcAsignados] = useState<string[]>(account.centrosCostoIds??[]);

  useEffect(()=>{ setCcAsignados(account.centrosCostoIds??[]); },[account.id]);

  const isRoot = account.nivel === 'grupo';
  const esCliente = account.tipoEspecial==='02'||account.tipoEspecial==='03';
  const esProveedor = account.tipoEspecial==='04';
  const esAuxiliar = esCliente || esProveedor;
  const esBanco = account.tipoEspecial==='05';
  // Issue #2: esta cuenta ES un cliente/proveedor puntual (nivel auxiliar bajo un
  // Detalle 02/03/04) - tiene entornoFiscal propio y perfil en Clientes/Proveedores.
  const esFichaAuxiliar = esAuxiliar && account.nivel === 'auxiliar';
  const tipoIdLabel = TIPOS_IDENTIFICACION_FISCAL.find(t=>t.value===account.entornoFiscal?.tipoIdentificacion)?.label ?? '';
  // Issue #7: movimientos de ajuste (Catálogo > Movimientos de ajuste) enlazados a esta cuenta
  const ajustesEnlazados = (enlacesAjuste??[]).filter(e => e.cuentaCode === account.code);
  // Issue #4: detalle accounts with tipo 02/03/04 can add "auxiliar" subcuentas (clients/providers)
  const canAddChild = account.nivel !== 'detalle' || esAuxiliar;
  const canDelete = !account.children?.length && !isRoot;
  const esPatrimonio = account.grupo==='3';
  const grupoLabel = GRUPOS_NIIF.find(g=>g.value===account.grupo)?.label??'';
  const monedaLabel = MONEDAS.find(m=>m.value===account.moneda)?.label??'Colón costarricense';
  const espLabel = TIPOS_ESPECIAL.find(t=>t.value===account.tipoEspecial)?.label??'';
  const patriLabel = GRUPOS_PATRIMONIO.find(g=>g.value===account.grupoPatrimonio)?.label;
  const subcuentas = account.children??[];
  const hasCCSection = esBanco || account.centroCostoObligatorio || account.usaCentroCosto;

  return (
    <>
      {/* Header */}
      <div style={{ padding:'0 14px', height:52, borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <p style={{ fontSize:13, fontWeight:600, color:C.n900, margin:0, fontFamily:F, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{account.nombre}</p>
            {account.tipoEspecial && <span style={{ fontSize:9, color:'#7C3AED', background:'rgba(124,58,237,.08)', padding:'2px 6px', borderRadius:4, fontWeight:500, flexShrink:0, fontFamily:F }}>Especial</span>}
            {account.inactiva && <span style={{ fontSize:9, color:C.n700, background:'#F9F9F9', padding:'2px 6px', borderRadius:4, border:'1px solid #ECECEC', flexShrink:0, fontFamily:F }}>Inactiva</span>}
          </div>
          <p style={{ fontSize:10, color:C.n700, margin:'2px 0 0', fontFamily:F }}>{account.code}</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0, marginLeft:7 }}>
          {!isRoot && <Button variant="primary" icon={<IcEdit className="w-3 h-3"/>} onClick={onEdit} style={{ height:24 }}>Editar</Button>}
          {canAddChild && (
            <Button variant="secondary" icon={<IcPlus className="w-3 h-3"/>} onClick={()=>onAddChild(account)} style={{ height:24 }}>
              {esCliente ? 'Cliente' : esProveedor ? 'Proveedor' : 'Subcuenta'}
            </Button>
          )}
          {canDelete && (
            <button onClick={()=>setConfirmDel(true)} style={{ width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:radius.sm, border:'none', background:'none', cursor:'pointer', color:C.error }}>
              <IcTrash className="w-3.5 h-3.5"/>
            </button>
          )}
          <button onClick={onClose} style={{ width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:radius.sm, border:'none', background:'none', cursor:'pointer', color:C.n700 }}>
            <IcClose className="w-4 h-4"/>
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto' }}>
        {/* NIIF root banner */}
        {isRoot && (
          <div style={{ margin:'14px 14px 0', display:'flex', alignItems:'flex-start', gap:7, padding:'9px 12px', background:C.brandBg, border:`1px solid ${C.brandBd}`, borderRadius:radius.md }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={BRAND}><circle cx="7" cy="7" r="5.83"/><path d="M7 4.67v2.33M7 9.33h.01" strokeLinecap="round"/></svg>
            <span style={{ fontSize:10, color:'#8A6200', fontFamily:F }}>Cuenta raíz NIIF · define la estructura contable base. No se puede editar ni eliminar.</span>
          </div>
        )}

        {/* Datos de la cuenta */}
        <div style={{ padding:'14px 14px 7px' }}>
          <Label>Datos de la cuenta</Label>
          {/* Code box */}
          <div style={{ background:C.n200, borderRadius:radius.md, padding:'9px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div>
              <p style={{ fontSize:9, color:C.n700, margin:'0 0 2px', fontFamily:F }}>Código contable</p>
              <p style={{ fontSize:13, fontWeight:600, color:C.n900, margin:0, fontFamily:F }}>{account.code}</p>
            </div>
            <button onClick={()=>{ navigator.clipboard.writeText(account.code); setCopied(true); setTimeout(()=>setCopied(false),1500); }} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', color:BRAND, fontSize:10, fontFamily:F }}>
              {copied?<IcCheck className="w-3 h-3"/>:<IcCopy className="w-3 h-3"/>}
              {copied?'Copiado':'Copiar'}
            </button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <Field2 label="Nivel" value={NIVEL_LABELS[account.nivel]??account.nivel}/>
              <p style={{ fontSize:9, color:account.posteable?BRAND:C.n700, margin:'3px 0 0', lineHeight:1.5, fontFamily:F }}>
                {account.nivel==='mayor'&&'Raíz del árbol NIIF. Agrupa grandes categorías. No registra movimientos.'}
                {account.nivel==='submajor'&&'Subdivide la cuenta Mayor en grupos específicos. No registra movimientos.'}
                {account.nivel==='detalle'&&'Cuenta final donde se registran débitos y créditos.'}
              </p>
            </div>
            <Field2 label="Grupo NIIF" value={grupoLabel}/>
            <Field2 label="Naturaleza" value={account.naturaleza}/>
            <Field2 label="Moneda" value={monedaLabel}/>
            <Field2 label="Posteable" value={account.posteable?'Sí · acepta movimientos':'No · agrupadora'} color={account.posteable?BRAND:C.n700}/>
            <Field2 label="Centro de costo" value={(account.centroCostoObligatorio||account.usaCentroCosto)?'Obligatorio':'Opcional'} color={(account.centroCostoObligatorio||account.usaCentroCosto)?BRAND:C.n700}/>
            {account.tipoEspecial && <div style={{ gridColumn:'1/-1' }}><Field2 label="Tipo especial" value={espLabel} color={BRAND}/></div>}
            {esPatrimonio && account.grupoPatrimonio && <div style={{ gridColumn:'1/-1' }}><Field2 label="Grupo de patrimonio" value={patriLabel??'Sin asignar'}/></div>}
            {/* Issue #2: N° de identificación legible en la ficha de cliente/proveedor */}
            {esFichaAuxiliar && (
              <div style={{ gridColumn:'1/-1' }}>
                <Field2
                  label={`N° de identificación${tipoIdLabel?` (${tipoIdLabel})`:''}`}
                  value={account.entornoFiscal?.numeroIdentificacion || 'Sin registrar'}
                  color={account.entornoFiscal?.numeroIdentificacion ? C.n900 : C.n700}
                />
              </div>
            )}
          </div>
          {account.descripcion && <p style={{ fontSize:10, color:C.n700, lineHeight:1.6, margin:'10px 0 0', padding:'10px 0 0', borderTop:`1px solid ${C.n500}`, fontFamily:F }}>{account.descripcion}</p>}
          {/* Issue #2: acceso directo al perfil completo en Clientes / Proveedores */}
          {esFichaAuxiliar && (
            <button onClick={()=>router.push(`/clientes?open=${encodeURIComponent(account.code)}&nombre=${encodeURIComponent(account.nombre)}&tipo=${esCliente?'02':'04'}`)}
              style={{ marginTop:10, width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6, height:30, border:`1px solid ${C.brandBd}`, background:C.brandBg, color:BRAND, borderRadius:radius.sm, fontSize:11, fontWeight:500, cursor:'pointer', fontFamily:F }}>
              <IcUser className="w-3.5 h-3.5"/>
              Ver perfil completo en {esCliente?'Clientes':'Proveedores'}
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke={BRAND} strokeWidth="1.6"><path d="M5.25 2.33L9.92 7L5.25 11.67" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>

        {/* Subcuentas / Auxiliares */}
        {subcuentas.length>0 && (
          <div style={{ padding:'7px 14px', borderTop:`1px solid ${C.n500}` }}>
            {esAuxiliar ? (
              <>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
                  <Label>{esCliente ? `Clientes (${subcuentas.length})` : `Proveedores (${subcuentas.length})`}</Label>
                  {canAddChild && (
                    <button onClick={()=>onAddChild(account)}
                      style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:BRAND, background:C.brandBg, border:`1px solid ${C.brandBd}`, borderRadius:radius.sm, padding:'3px 8px', cursor:'pointer', fontFamily:F }}>
                      <IcPlus className="w-3 h-3"/>
                      {esCliente ? 'Agregar cliente' : 'Agregar proveedor'}
                    </button>
                  )}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {subcuentas.map(child=>(
                    <button key={child.id} onClick={()=>onSelect(child)}
                      style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'9px 10px', background:'#FFFFFF', borderRadius:radius.md, border:`1px solid ${C.n500}`, cursor:'pointer', textAlign:'left', fontFamily:F, width:'100%' }}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=C.brandBg}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='#FFFFFF'}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background: esCliente ? '#E6F1FB' : '#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <span style={{ fontSize:10, fontWeight:600, color: esCliente ? '#185FA5' : C.successDk }}>
                          {child.nombre.split(' ').slice(0,2).map((w:string)=>w[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:2 }}>
                          <span style={{ fontSize:9, fontWeight:600, color: esCliente ? '#185FA5' : C.successDk, fontFamily:F, background: esCliente ? '#E6F1FB' : '#E1F5EE', padding:'1px 4px', borderRadius:3 }}>
                            {child.code.split('-').pop()}
                          </span>
                          <span style={{ fontSize:9, padding:'1px 5px', borderRadius:3, background:'#ECECEC', color:C.n700, fontFamily:F }}>{esCliente?'Cliente':'Proveedor'}</span>
                          <span style={{ fontSize:11, fontWeight:500, color:C.n900, fontFamily:F, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{child.nombre}</span>
                        </div>
                        <p style={{ fontSize:10, color:BRAND, margin:0, fontFamily:F, fontWeight:500 }}>
                          {child.code}
                          {/* Issue #2: identificación legible junto al código */}
                          {child.entornoFiscal?.numeroIdentificacion && (
                            <span style={{ color:C.n700, fontWeight:400 }}> · Id. {child.entornoFiscal.numeroIdentificacion}</span>
                          )}
                        </p>
                      </div>
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.5" style={{ flexShrink:0, marginTop:7 }}><path d="M5.25 2.33L9.92 7L5.25 11.67" strokeLinecap="round"/></svg>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <Label>Subcuentas ({subcuentas.length})</Label>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {subcuentas.map(child=>(
                    <button key={child.id} onClick={()=>onSelect(child)}
                      style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 10px', background:C.n200, borderRadius:radius.md, border:`1px solid ${C.n500}`, cursor:'pointer', textAlign:'left', fontFamily:F, width:'100%' }}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=C.brandBg}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=C.n200}>
                      <div>
                        <p style={{ fontSize:11, fontWeight:500, color:C.n900, margin:0, fontFamily:F }}>{child.code}</p>
                        <p style={{ fontSize:10, color:C.n700, margin:0, fontFamily:F }}>{child.nombre}</p>
                      </div>
                      <div style={{ display:'flex', gap:4 }}>
                        <span style={{ fontSize:9, padding:'2px 5px', borderRadius:4, background:child.nivel==='detalle'?C.brandBg:'#F9F9F9', color:child.nivel==='detalle'?BRAND:C.n700, fontFamily:F }}>
                          {child.nivel==='detalle'?'Plan':'Estructura'}
                        </span>
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.5"><path d="M5.25 2.33L9.92 7L5.25 11.67" strokeLinecap="round"/></svg>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

                {/* Centros de costo - Issue 6: view mode shows only assigned ones, read-only */}
        {hasCCSection && (
          <div style={{ padding:'7px 14px', borderTop:`1px solid ${C.n500}` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
              <Label>Centros de costo{ccAsignados.length>0&&` (${ccAsignados.length})`}</Label>
              {(account.centroCostoObligatorio||account.usaCentroCosto) && (
                <span style={{ fontSize:9, color:BRAND, background:C.brandBg, padding:'2px 7px', borderRadius:10, fontFamily:F }}>Obligatorio</span>
              )}
            </div>
            {ccAsignados.length === 0 ? (
              <p style={{ fontSize:11, color:C.n700, margin:0, fontFamily:F }}>Sin centros de costo asignados. Podés asignarlos al editar la cuenta.</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {CENTROS_COSTO.filter(cc=>ccAsignados.includes(cc.id)).map(cc=>(
                  <div key={cc.id} style={{ display:'flex', alignItems:'center', gap:9, padding:'6px 10px', borderRadius:radius.sm, border:`1px solid ${C.brandBd}`, background:C.brandBg }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:BRAND, flexShrink:0 }}/>
                    <div>
                      <p style={{ fontSize:10, fontWeight:500, color:C.n900, margin:0, fontFamily:F }}>{cc.descripcion}</p>
                      <p style={{ fontSize:9, color:C.n700, margin:0, fontFamily:F }}>{cc.codigo}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chequera - solo cuentas Banco */}
        {esBanco && (
          <div style={{ padding:'7px 14px', borderTop:`1px solid ${C.n500}` }}>
            <Label>Chequera</Label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:7 }}>
              {['Prefijo','Consecutivo','Reporte'].map(f=>(
                <div key={f}>
                  <p style={{ fontSize:9, color:C.n700, margin:'0 0 4px', fontFamily:F }}>{f}</p>
                  <input placeholder="-" style={{ width:'100%', height:26, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:10, fontFamily:F, outline:'none' }}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saldo - solo posteables */}
        {account.posteable && (
          <div style={{ padding:'7px 14px', borderTop:`1px solid ${C.n500}` }}>
            <div style={{ background:C.brandBg, border:`1px solid ${C.brandBd}`, borderRadius:radius.md, padding:12 }}>
              <p style={{ fontSize:9, color:C.n700, margin:'0 0 4px', fontFamily:F }}>Saldo actual</p>
              <div style={{ display:'flex', alignItems:'baseline', gap:5 }}>
                <span style={{ fontSize:11, color:C.brand, fontFamily:F }}>{account.moneda==='USD'?'$':account.moneda==='EUR'?'€':'¢'}</span>
                <span style={{ fontSize:18, fontWeight:600, color:BRAND, fontFamily:F }}>{fmt(account.saldo??0)}</span>
              </div>
              <p style={{ fontSize:9, color:C.n700, margin:'6px 0 0', fontFamily:F }}>
                Al {account.fechaUltimoAsiento ? account.fechaUltimoAsiento : 'último asiento contabilizado (sin movimientos aún)'}
              </p>
            </div>
          </div>
        )}

        {/* Issue #7: Movimientos de ajuste (Catálogo > Movimientos de ajuste) enlazados a esta cuenta */}
        {ajustesEnlazados.length > 0 && (
          <div style={{ padding:'7px 14px', borderTop:`1px solid ${C.n500}` }}>
            <Label>Movimientos de ajuste enlazados ({ajustesEnlazados.length})</Label>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {ajustesEnlazados.map(e=>(
                <div key={e.id} style={{ padding:'8px 10px', background:C.n200, borderRadius:radius.md, border:`1px solid ${C.n500}` }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
                    <span style={{ fontSize:11, fontWeight:500, color:C.n900, fontFamily:F }}>{e.tipoMovimiento}</span>
                    <span style={{ fontSize:9, fontWeight:600, color:e.signo===1?C.successDk:C.error, fontFamily:F }}>{e.signo===1?'Suma':'Resta'}</span>
                  </div>
                  {e.porcentaje !== undefined && (
                    <p style={{ fontSize:10, color:C.n700, margin:'3px 0 0', fontFamily:F }}>
                      Porcentaje: <strong style={{color:C.n900}}>{e.porcentaje}%</strong>
                    </p>
                  )}
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:5 }}>
                    {e.aplicaA.map(op=>(
                      <span key={op} style={{ fontSize:9, padding:'1px 6px', borderRadius:radius.pill, background:'#FFFFFF', border:`1px solid ${C.n500}`, color:C.n700, fontFamily:F }}>
                        {OPERACIONES_AJUSTE.find(o=>o.value===op)?.label ?? op}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete */}
        {canDelete && (
          <div style={{ padding:'7px 14px 14px' }}>
            <button onClick={()=>setConfirmDel(true)} style={{ fontSize:11, color:C.error, background:'none', border:`1px solid ${C.error}`, borderRadius:radius.sm, padding:'5px 10px', cursor:'pointer', fontFamily:F }}>
              Eliminar cuenta
            </button>
          </div>
        )}

        {/* Traslado de saldo - only for posteable accounts */}
        {account.posteable && (
          <div style={{ padding:'0 14px 14px', borderTop:`1px solid ${C.n500}`, paddingTop:10 }}>
            {trasladoResult ? (
              // Show completed traslado info
              <div style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', background:'rgba(29,158,117,.08)', border:'1px solid rgba(29,158,117,.25)', borderRadius:radius.md }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="rgba(29,158,117,.15)"/><path d="M5 8.5L7 10.5L11 6" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:10, fontWeight:600, color:C.success, margin:'0 0 2px', fontFamily:F }}>Traslado realizado</p>
                  <p style={{ fontSize:10, color:C.n700, margin:0, fontFamily:F }}>
                    Desde <strong>{trasladoResult.origenCodigo}</strong> el {trasladoResult.fecha}. Ref: {trasladoResult.asientoRef}
                  </p>
                </div>
              </div>
            ) : (
              // Show traslado offer
              <div style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', background:C.n200, border:`1px solid ${C.n500}`, borderRadius:radius.md }}>
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke={C.n700} strokeWidth="1.4">
                  <path d="M3 9h12M9 3l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p style={{ fontSize:10, color:C.n700, margin:0, flex:1, fontFamily:F }}>
                  Puede migrar el saldo de una cuenta existente a esta.
                </p>
                <button onClick={onTraslado}
                  style={{ fontSize:10, color:BRAND, background:'none', border:`1px solid ${C.brandBd}`, borderRadius:radius.sm, padding:'4px 10px', cursor:'pointer', fontFamily:F, whiteSpace:'nowrap' }}>
                  Trasladar saldo
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {confirmDel && (
        <Modal open title="Eliminar cuenta" onClose={()=>setConfirmDel(false)}
          footer={<div style={{ display:'flex', gap:7, justifyContent:'flex-end' }}>
            <Button variant="secondary" onClick={()=>setConfirmDel(false)}>Cancelar</Button>
            <Button variant="danger" onClick={()=>{ onDelete(account.id); setConfirmDel(false); }}>Eliminar</Button>
          </div>}>
          <p style={{ fontSize:11, color:C.n700, fontFamily:F }}>¿Seguro que querés eliminar <strong>{account.nombre}</strong> ({account.code})? Esta acción no se puede deshacer.</p>
        </Modal>
      )}
    </>
  );
}
