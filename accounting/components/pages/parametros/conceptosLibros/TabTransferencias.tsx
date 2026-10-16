'use client';
import { useState, useEffect } from 'react';
import { Toast, RowAction } from '../../../ui/primitives';
import { Button, FormField, Input, Select } from '../../../ui/formulario';
import { radius, TABLA } from '../../../ui/tokens';
import { IcPlus, IcTrash, IcCopy } from '../../../ui/icons';
import { C } from '../../../ui/tokens';
import { CUENTAS_BANCARIAS, F, FORMATOS, F_INIT, type Formulario, TIPOS_EXP } from './datos';

export function TabTransferencias({ addSignal, onAddHandled }: { addSignal?: number; onAddHandled?: () => void }) {
  const [forms,setForms]=useState<Formulario[]>(F_INIT);
  const [selId,setSelId]=useState(F_INIT[0].id);
  const [editing,setEditing]=useState<Formulario>({...F_INIT[0]});
  const [dirty,setDirty]=useState(false);
  const [confirmDup,setConfirmDup]=useState(false);
  const [toast,setToast]=useState<{message:string;type:'success'|'error'}|null>(null);

  const sel=forms.find(f=>f.id===selId)!;

  function selectForm(f:Formulario){ setSelId(f.id); setEditing({...f}); setDirty(false); }
  function patch(p:Partial<Formulario>){ setEditing(e=>({...e,...p})); setDirty(true); }
  function save(){
    setForms(p=>p.map(x=>{
      if(x.id===editing.id) return editing;
      // Solo un formulario puede ser por defecto (#13)
      return editing.porDefecto ? {...x, porDefecto:false} : x;
    }));
    setDirty(false); setToast({message:'Formulario guardado.',type:'success'}); setTimeout(()=>setToast(null),3000);
  }
  function addNew(){
    const nf:Formulario={id:Date.now(),nombre:'Nuevo formulario',banco:'',concepto:'',tipoExportacion:'CC',formato:'CSV',porDefecto:false,cuenta:'',cuentas:[]};
    setForms(p=>[...p,nf]); selectForm(nf);
  }
  function duplicate(){
    const nf:Formulario={...editing,id:Date.now(),nombre:`${editing.nombre} (copia)`,porDefecto:false};
    setForms(p=>[...p,nf]); selectForm(nf); setConfirmDup(false);
    setToast({message:'Formulario duplicado.',type:'success'}); setTimeout(()=>setToast(null),3000);
  }
  function addCuenta(){ patch({ cuentas:[...editing.cuentas,{id:`c${Date.now()}`,cuentaContable:'',iban:'',consecutivo:1}] }); }
  function delCuenta(id:string){ patch({ cuentas:editing.cuentas.filter(c=>c.id!==id) }); }
  function updateCuenta(id:string,field:string,val:string|number){ patch({ cuentas:editing.cuentas.map(c=>c.id===id?{...c,[field]:val}:c) }); }

  // Issue #10: "Nueva" (formulario) ahora vive en el header de la página
  useEffect(() => {
    if (addSignal) { addNew(); onAddHandled?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSignal]);

  return (
    <div style={{ display:'flex',gap:16,height:'100%',overflow:'hidden' }}>
      {/* Left list - más ancho para que el título no se corte (#23) */}
      <div style={{ width:260,minWidth:260,background:'#FFFFFF',border:'1px solid #ECECEC',borderRadius:10,overflow:'hidden',flexShrink:0,display:'flex',flexDirection:'column' }}>
        <div style={{ padding:'12px 16px',borderBottom:'1px solid #ECECEC',flexShrink:0 }}>
          <span style={{ fontSize:12,fontWeight:500,fontFamily:F,whiteSpace:'nowrap' }}>Formularios bancarios</span>
        </div>
        <div style={{ flex:1,overflowY:'auto' }}>
          {forms.map(f=>(
            <button key={f.id} onClick={()=>selectForm(f)}
              style={{ display:'flex',alignItems:'flex-start',gap:8,width:'100%',padding:'10px 16px',background:selId===f.id?C.brandBg:'transparent',
                border:'none',borderBottom:'1px solid #ECECEC',cursor:'pointer',textAlign:'left',fontFamily:F }}>
              <div style={{ flex:1,minWidth:0 }}>
                <p style={{ fontSize:12,fontWeight:selId===f.id?600:400,color:selId===f.id?C.brand:C.n900,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',margin:0 }}>{f.nombre}</p>
                <div style={{ display:'flex',gap:6,marginTop:4 }}>
                  <span style={{ fontSize:9,background:f.formato==='CSV'?'#e8f4e8':'#e3f2fd',color:f.formato==='CSV'?'#2e7d32':'#1565c0',padding:'1px 5px',borderRadius:4 }}>{f.formato}</span>
                  {f.porDefecto&&<span style={{ fontSize:9,background:C.brandBg,color:C.brand,padding:'1px 5px',borderRadius:4 }}>Defecto</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right detail */}
      <div style={{ flex:1,background:'#FFFFFF',border:'1px solid #ECECEC',borderRadius:10,overflow:'auto',display:'flex',flexDirection:'column' }}>
        <div style={{ padding:'16px 20px',borderBottom:'1px solid #ECECEC',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0 }}>
          <div style={{ display:'flex',alignItems:'center',gap:12 }}>
            <h3 style={{ fontSize:14,fontWeight:500,margin:0,fontFamily:F }}>{editing.nombre}</h3>
            <div style={{ display:'flex',alignItems:'center',gap:6 }}>
              <input type="checkbox" id="defecto-cb" checked={editing.porDefecto} onChange={e=>patch({porDefecto:e.target.checked})}
                style={{ accentColor:C.brand,width:14,height:14 }} />
              <label htmlFor="defecto-cb" style={{ fontSize:12,cursor:'pointer',fontFamily:F,color:C.n900 }}>Formulario por defecto</label>
              {editing.porDefecto&&<span style={{ fontSize:9,background:C.brandBg,color:C.brand,padding:'1px 6px',borderRadius:radius.pill,border:`1px solid ${C.brandBd}` }}>Defecto</span>}
            </div>
          </div>
          <Button variant="secondary" icon={<IcCopy className="w-3 h-3" />} onClick={()=>setConfirmDup(true)}>Duplicar</Button>
        </div>

        <div style={{ padding:'20px',display:'flex',flexDirection:'column',gap:20,flex:1 }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <FormField label="Nombre del formulario"><Input value={editing.nombre} onChange={v=>patch({nombre:v})} /></FormField>
            <FormField label="Cuenta"><Input value={editing.cuenta} onChange={v=>patch({cuenta:v})} placeholder="Código o alias" /></FormField>
            <FormField label="Concepto"><Input value={editing.concepto} onChange={v=>patch({concepto:v})} placeholder="Ej. Pago Facturas" /></FormField>
            <FormField label="Tipo de exportación"><Select value={editing.tipoExportacion} onChange={v=>patch({tipoExportacion:v})} options={TIPOS_EXP} /></FormField>
            <FormField label="Formato de archivo"><Select value={editing.formato} onChange={v=>patch({formato:v})} options={FORMATOS} /></FormField>
          </div>

          {/* Cuentas bancarias */}
          <div>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
              <p style={{ fontSize:13,fontWeight:500,margin:0,fontFamily:F }}>Cuentas bancarias asociadas</p>
              <button onClick={addCuenta} style={{ fontSize:12,color:C.brand,background:'none',border:'none',cursor:'pointer',fontFamily:F,display:'flex',alignItems:'center',gap:4 }}>
                <IcPlus className="w-3.5 h-3.5" /> Nueva cuenta
              </button>
            </div>
            <div style={TABLA.wrap}><table className="tabla" style={TABLA.table}>
              <thead><tr style={TABLA.headRow}>
                {['Cuenta contable','IBAN / N.° cuenta bancaria','Consecutivo','Plan','Acciones'].map(h=>(
                  <th key={h} style={TABLA.th}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {editing.cuentas.length===0&&<tr><td colSpan={5} style={TABLA.empty}>Sin cuentas bancarias asociadas.</td></tr>}
                {editing.cuentas.map(c=>(
                  <tr key={c.id} style={{ borderTop:'1px solid #ECECEC' }}>
                    <td style={{ padding:'8px 12px' }}>
                      <select value={c.cuentaContable} onChange={e=>updateCuenta(c.id,'cuentaContable',e.target.value)}
                        style={{ width:'100%',height:28,padding:'0 8px',border:'1px solid #ECECEC',borderRadius:4,fontSize:11,fontFamily:F,outline:'none',background:'#FFFFFF',cursor:'pointer' }}>
                        <option value="">- Seleccionar cuenta -</option>
                        {CUENTAS_BANCARIAS.map(opt=><option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:'8px 12px' }}>
                      <input value={c.iban} onChange={e=>updateCuenta(c.id,'iban',e.target.value)}
                        style={{ width:'100%',height:28,padding:'0 8px',border:'1px solid #ECECEC',borderRadius:4,fontSize:11,fontFamily:F,outline:'none' }} />
                    </td>
                    <td style={{ padding:'8px 12px' }}>
                      <input type="number" value={c.consecutivo} onChange={e=>updateCuenta(c.id,'consecutivo',Number(e.target.value))}
                        style={{ width:60,height:28,padding:'0 8px',border:'1px solid #ECECEC',borderRadius:4,fontSize:11,fontFamily:F,outline:'none',textAlign:'right' }} />
                    </td>
                    <td style={{ padding:'8px 12px' }}>
                      <input style={{ width:60,height:28,padding:'0 8px',border:'1px solid #ECECEC',borderRadius:4,fontSize:11,fontFamily:F,outline:'none' }} placeholder="-" />
                    </td>
                    <td style={{ padding:'8px 12px', textAlign:'right' }}>
                      <RowAction title="Eliminar" danger onClick={()=>delCuenta(c.id)}><IcTrash className="w-3.5 h-3.5"/></RowAction>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>

          {dirty && (
            <div style={{ display:'flex',gap:8,justifyContent:'flex-end',borderTop:'1px solid #ECECEC',paddingTop:16 }}>
              <Button variant="secondary" onClick={()=>{ setEditing({...sel}); setDirty(false); }}>Cancelar</Button>
              <Button onClick={save}>Guardar cambios</Button>
            </div>
          )}
        </div>
      </div>

      {confirmDup && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.35)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <div style={{ background:'#FFFFFF',borderRadius:10,padding:24,maxWidth:380,width:'90%',fontFamily:F,boxShadow:'0 8px 40px rgba(0,0,0,.18)' }}>
            <h3 style={{ fontSize:14,fontWeight:500,margin:'0 0 12px' }}>Duplicar formulario</h3>
            <p style={{ fontSize:12,color:C.n700,marginBottom:20 }}>¿Desea crear una copia de <strong>{editing.nombre}</strong>? Se creará una copia idéntica que podrá editar independientemente.</p>
            <div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>
              <Button variant="secondary" onClick={()=>setConfirmDup(false)}>Cancelar</Button>
              <Button onClick={duplicate}>Duplicar</Button>
            </div>
          </div>
        </div>
      )}

      {toast&&<Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  );
}
