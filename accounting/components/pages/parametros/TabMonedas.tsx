'use client';
import { useState, useEffect } from 'react';
import { Section, InfoBox, Toast, RowAction } from '../../ui/primitives';
import { Button, FormField, Input, Select } from '../../ui/formulario';
import { DataTable, DataRow, Td } from '../../ui/tabla';
import { radius, TABLA } from '../../ui/tokens';
import { IcPlus, IcTrash } from '../../ui/icons';
import { C, FONT } from '../../ui/tokens';

const F = FONT;
const MONEDAS_NAC=[{value:'CRC',label:'¢ Colón costarricense'},{value:'NIO',label:'C$ Córdoba nicaragüense'},{value:'GTQ',label:'Q Quetzal guatemalteco'},{value:'HNL',label:'L Lempira hondureña'}];
// Issue: se permitía agregar cualquier divisa (USD, EUR, GBP, CAD, JPY) - el
// sistema solo debe manejar dólares y euros como divisa extranjera.
const DIVISAS_ALL=[{value:'USD',label:'$ Dólar estadounidense'},{value:'EUR',label:'€ Euro'}];
const SIMBOLOS: Record<string,string>={CRC:'¢',NIO:'C$',GTQ:'Q',HNL:'L',USD:'$',EUR:'€',GBP:'£',CAD:'CA$',JPY:'¥'};

interface Divisa { id:string; code:string; enabled:boolean; tasa:string; }

export function TabMonedas({ config, patch, addSignal, onAddHandled, onAvailabilidadChange }: { config:any; patch:(p:any)=>void; addSignal?: number; onAddHandled?: () => void; onAvailabilidadChange?: (hayDisponibles:boolean) => void }) {
  const [divisas,setDivisas]=useState<Divisa[]>([
    { id:'d1', code:'USD', enabled:true,  tasa:'498.50' },
    { id:'d2', code:'EUR', enabled:false, tasa:'541.20' },
  ]);
  const usedCodes=new Set(divisas.map((d:Divisa)=>d.code));
  const availDivisas=DIVISAS_ALL.filter((d:{value:string;label:string})=>!usedCodes.has(d.value));

  // Issue: con solo USD/EUR permitidas y las dos ya precargadas por defecto,
  // "Agregar divisa" (en el header) quedaba siempre sin nada para agregar -
  // se avisa al padre para que lo deshabilite en vez de dejarlo ahí sin uso.
  useEffect(() => { onAvailabilidadChange?.(availDivisas.length > 0); }, [availDivisas.length]);

  function toggleDivisa(id:string){ setDivisas(p=>p.map(d=>d.id===id?{...d,enabled:!d.enabled}:d)); patch({}); }
  function removeDivisa(id:string){ setDivisas(p=>p.filter(d=>d.id!==id)); patch({}); }
  function addDivisa(){ if(!availDivisas.length) return; setDivisas(p=>[...p,{id:`d${Date.now()}`,code:availDivisas[0].value,enabled:false,tasa:''}]); patch({}); }

  // Issue #10: "Agregar divisa" ahora vive en el header de la página
  useEffect(() => {
    if (addSignal) { addDivisa(); onAddHandled?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSignal]);

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
      <Section title="Configuración de monedas" hint="Moneda principal del sistema y divisas extranjeras disponibles.">
        <InfoBox>La moneda principal no puede cambiarse una vez se registren asientos. Las divisas pueden activarse o desactivarse en cualquier momento. El tipo de cambio se gestiona en la pestaña <strong>Tipo de cambio</strong>.</InfoBox>

        {/* Moneda principal */}
        <div>
          <p style={{ fontSize:12,fontWeight:500,color:C.n900,marginBottom:4,fontFamily:F }}>Moneda principal</p>
          <p style={{ fontSize:11,color:C.n700,marginBottom:10,fontFamily:F }}>Moneda base del sistema.</p>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 80px',gap:10 }}>
            <FormField label="Moneda"><Select value={config.monedaPrincipal} onChange={v=>patch({monedaPrincipal:v})} options={MONEDAS_NAC} /></FormField>
            <FormField label="Símbolo">
              <div style={{ height:32,padding:'0 10px',display:'flex',alignItems:'center',fontSize:13,fontFamily:"'Montserrat',sans-serif",color:C.n900,background:C.n200,border:'1px solid #ECECEC',borderRadius:radius.sm }}>
                {SIMBOLOS[config.monedaPrincipal]??'¢'}
              </div>
            </FormField>
          </div>
        </div>

        {/* Divisas */}
        <div style={{ borderTop:'1px solid #ECECEC',paddingTop:16,display:'flex',flexDirection:'column',gap:16 }}>
          {divisas.map((d,idx)=>(
            <div key={d.id}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
                <p style={{ fontSize:12,fontWeight:500,color:C.n900,margin:0,fontFamily:F }}>Divisa {idx+1}</p>
                <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                  <button onClick={()=>toggleDivisa(d.id)}
                    style={{ fontSize:10,padding:'2px 10px',borderRadius:radius.pill,cursor:'pointer',
                      border:`1px solid ${d.enabled?C.brand:C.n500}`,
                      background:d.enabled?C.brandBg:C.n200,
                      color:d.enabled?C.brand:C.n700,fontFamily:F }}>
                    {d.enabled?'Activa':'Desactivada'}
                  </button>
                  <RowAction title="Eliminar" danger onClick={()=>removeDivisa(d.id)}><IcTrash className="w-3.5 h-3.5"/></RowAction>
                </div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 80px',gap:10 }}>
                <FormField label="Moneda">
                  <Select value={d.code} onChange={v=>setDivisas(p=>p.map(x=>x.id===d.id?{...x,code:v}:x))} options={DIVISAS_ALL} disabled={!d.enabled} />
                </FormField>
                <FormField label="Símbolo">
                  <div style={{ height:32,padding:'0 10px',display:'flex',alignItems:'center',fontSize:13,fontFamily:"'Montserrat',sans-serif",color:C.n900,background:C.n200,border:'1px solid #ECECEC',borderRadius:radius.sm }}>
                    {SIMBOLOS[d.code]??'$'}
                  </div>
                </FormField>
              </div>
              {d.enabled&&<p style={{ fontSize:11,color:C.n700,marginTop:6,fontFamily:F }}>Tasa actual (BCCR): <strong style={{ color:C.n900 }}>{d.tasa}</strong> · Se actualiza en Tipo de cambio</p>}
            </div>
          ))}
          {/* Issue #10: "Agregar divisa" se movió al header */}
        </div>
      </Section>
    </div>
  );
}

// ── Tab Tipo de Cambio ────────────────────────────────────────────────────────
interface TasaRec { id:number; fecha:string; divisa:string; tasa:string; fuente:string; }

export function TabTipoCambio({ addSignal, onAddHandled }: { addSignal?: number; onAddHandled?: () => void }) {
  const [rows,setRows]=useState<TasaRec[]>([
    {id:1,fecha:'2026-05-01',divisa:'USD',tasa:'498.50',fuente:'Manual'},
    {id:2,fecha:'2026-05-01',divisa:'EUR',tasa:'541.20',fuente:'Manual'},
    {id:3,fecha:'2026-04-30',divisa:'USD',tasa:'497.80',fuente:'Manual'},
  ]);
  const [adding,setAdding]=useState(false);
  const [form,setForm]=useState({fecha:'',divisa:'USD',tasa:''});
  const [editingId,setEditingId]=useState<number|null>(null);
  const [toast,setToast]=useState<{message:string;type:'success'|'error'}|null>(null);
  const today=new Date().toISOString().split('T')[0];

  function add(){ if(!form.fecha||!form.tasa) return; setRows(p=>[{id:Date.now(),...form,fuente:'Manual'},...p]); setForm({fecha:'',divisa:'USD',tasa:''}); setAdding(false); setToast({message:'Tipo de cambio registrado.',type:'success'}); setTimeout(()=>setToast(null),3000); }
  function saveTasa(id:number){ setEditingId(null); setToast({message:'Tipo de cambio actualizado.',type:'success'}); setTimeout(()=>setToast(null),3000); }

  // Issue #10: "Nuevo registro" ahora vive en el header de la página
  useEffect(() => {
    if (addSignal) { setAdding(v=>!v); onAddHandled?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSignal]);

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
      <Section title="Historial de tipo de cambio" hint="Registre las tasas de cambio de divisas por fecha.">
        <InfoBox>Las tasas se aplican a asientos según la fecha del registro.</InfoBox>

        {adding&&(
          <div style={{ background:C.n200,border:'1px solid #ECECEC',borderRadius:radius.md,padding:16 }}>
            <p style={{ fontSize:12,fontWeight:500,marginBottom:12,fontFamily:F }}>Nuevo tipo de cambio</p>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12 }}>
              <FormField label="Fecha" required><Input type="date" value={form.fecha} onChange={v=>setForm(f=>({...f,fecha:v}))} /></FormField>
              <FormField label="Divisa"><Select value={form.divisa} onChange={v=>setForm(f=>({...f,divisa:v}))} options={DIVISAS_ALL} /></FormField>
              <FormField label="Tasa" required><Input type="number" value={form.tasa} placeholder="Ej. 498.50" onChange={v=>setForm(f=>({...f,tasa:v}))} /></FormField>
            </div>
            <div style={{ display:'flex',gap:8 }}><Button onClick={add}>Guardar</Button><Button variant="secondary" onClick={()=>setAdding(false)}>Cancelar</Button></div>
          </div>
        )}

        {/* Table - all Montserrat, black text */}
        <div style={TABLA.wrap}>
          <table className="tabla" style={TABLA.table}>
            <thead><tr style={TABLA.headRow}>
              {['Fecha','Divisa','Tasa','Fuente','Acciones'].map(h=>(
                <th key={h} style={TABLA.th}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map(r=>(
                <tr key={r.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                  <td style={{ padding:'8px 12px', fontFamily:F, color:C.n900 }}>
                    {r.fecha}
                    {r.fecha===today&&<span style={{ marginLeft:8,fontSize:9,background:C.brandBg,color:C.brand,padding:'1px 6px',borderRadius:10,border:`1px solid ${C.brandBd}` }}>Hoy</span>}
                  </td>
                  <td style={{ padding:'8px 12px', fontFamily:F, color:C.n900 }}>{r.divisa}</td>
                  <td style={{ padding:'8px 12px', fontFamily:F, color:C.n900 }}>
                    {r.fecha>=today?(
                      editingId===r.id?(
                        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                          <input type="number" value={r.tasa} step="0.01" onChange={e=>setRows(p=>p.map(x=>x.id===r.id?{...x,tasa:e.target.value}:x))}
                            style={{ width:90,height:28,padding:'0 8px',fontSize:12,fontFamily:F,border:'1px solid #ECECEC',borderRadius:4,outline:'none',color:C.n900 }} />
                          <button onClick={()=>saveTasa(r.id)} style={{ height:28,padding:'0 8px',fontSize:11,background:C.brand,color:'#FFFFFF',border:'none',borderRadius:4,cursor:'pointer',fontFamily:F }}>Guardar</button>
                          <button onClick={()=>setEditingId(null)} style={{ height:28,padding:'0 8px',fontSize:11,background:'#FFFFFF',color:C.n700,border:'1px solid #ECECEC',borderRadius:4,cursor:'pointer',fontFamily:F }}>Cancelar</button>
                        </div>
                      ):(
                        <span onClick={()=>setEditingId(r.id)} style={{ cursor:'pointer',color:C.n900,borderBottom:`1px dashed ${C.n500}` }}>{Number(r.tasa).toFixed(2)}</span>
                      )
                    ):(
                      <span style={{ color:C.n900 }}>{Number(r.tasa).toFixed(2)}</span>
                    )}
                  </td>
                  <td style={{ padding:'8px 12px', fontFamily:F }}>{r.fuente}</td>
                  <td style={{ padding:'8px 12px', textAlign:'right' }}>
                    {/* Issue: antes se podía borrar cualquier tasa con fecha de
                        hoy en adelante (incluidas las futuras) - ahora solo la
                        de hoy es borrable; una tasa futura ya programada o una
                        pasada no se tocan. */}
                    {r.fecha===today&&<RowAction title="Eliminar" danger onClick={()=>setRows(p=>p.filter(x=>x.id!==r.id))}><IcTrash className="w-3.5 h-3.5"/></RowAction>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      {toast&&<Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  );
}
