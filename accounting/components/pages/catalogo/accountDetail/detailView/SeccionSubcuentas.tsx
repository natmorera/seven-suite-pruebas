'use client';
import { radius , C } from '@/components/ui/tokens';
import { IcPlus } from '@/components/ui/icons';
import { BRAND, F } from '../datos';
import { Label } from '../piezas';
import { type EstadoDetailView } from './useDetailView';

// Subcuentas de la cuenta seleccionada
export function SeccionSubcuentas({ e }: { e: EstadoDetailView }) {
  const { esAuxiliar, esCliente, subcuentas, canAddChild, onAddChild, account, onSelect } = e;
  return (
          <div style={{ padding:'7px 14px', borderTop:`1px solid ${C.n500}` }}>
            {esAuxiliar ? (
              <>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
                  <Label>{esCliente ? `Clientes (${subcuentas.length})` : `Proveedores (${subcuentas.length})`}</Label>
                  {canAddChild && (
                    <button onClick={()=>onAddChild(account)}
                      style={{ display:'flex', alignItems:'center', gap:4, fontSize:10.5, color:BRAND, background:C.brandBg, border:`1px solid ${C.brandBd}`, borderRadius:radius.sm, padding:'3px 8px', cursor:'pointer', fontFamily:F }}>
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
                        <span style={{ fontSize:10.5, fontWeight:600, color: esCliente ? '#185FA5' : C.successDk }}>
                          {child.nombre.split(' ').slice(0,2).map((w:string)=>w[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:2 }}>
                          <span style={{ fontSize:10.5, fontWeight:600, color: esCliente ? '#185FA5' : C.successDk, fontFamily:F, background: esCliente ? '#E6F1FB' : '#E1F5EE', padding:'1px 4px', borderRadius:3 }}>
                            {child.code.split('-').pop()}
                          </span>
                          <span style={{ fontSize:10.5, padding:'1px 5px', borderRadius:3, background:'#ECECEC', color:C.n700, fontFamily:F }}>{esCliente?'Cliente':'Proveedor'}</span>
                          <span style={{ fontSize:11, fontWeight:500, color:C.n900, fontFamily:F, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{child.nombre}</span>
                        </div>
                        <p style={{ fontSize:10.5, color:BRAND, margin:0, fontFamily:F, fontWeight:500 }}>
                          {child.code}
                          {/* identificación legible junto al código */}
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
                        <p style={{ fontSize:10.5, color:C.n700, margin:0, fontFamily:F }}>{child.nombre}</p>
                      </div>
                      <div style={{ display:'flex', gap:4 }}>
                        <span style={{ fontSize:10.5, padding:'2px 5px', borderRadius:4, background:child.nivel==='detalle'?C.brandBg:'#F9F9F9', color:child.nivel==='detalle'?BRAND:C.n700, fontFamily:F }}>
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
  );
}
