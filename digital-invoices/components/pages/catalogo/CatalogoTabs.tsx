'use client';
import { useState, Fragment } from 'react';
import { Button, FormField, Input, Select, Modal, radius } from '../../ui/primitives';
import { IcPlus, IcEdit, IcTrash, IcClose, IcChevronDown, IcChevronRight } from '../../ui/icons';
import { C, FONT } from '../../ui/primitives';
import { Cuenta, flattenTree } from './catalogoData';
import { TBL } from './catalogoTableStyles';
import { useEffect } from 'react';

const F = FONT;
const BRAND = '#A77600';


interface Grupo  { id:string; codigo:string; descripcion:string; descripcionAlt:string; }
interface Centro { id:string; grupoId:string; codigo:string; descripcion:string; descripcionAlt:string; }


const initialGruposCentrosCosto: Grupo[] = [
  { id:'g1', codigo:'ADM', descripcion:'Administración', descripcionAlt:'Administration' },
  { id:'g2', codigo:'RST', descripcion:'Restaurante',    descripcionAlt:'Restaurant' },
  { id:'g3', codigo:'SPA', descripcion:'Spa & Wellness', descripcionAlt:'Spa' },
  { id:'g4', codigo:'MNT', descripcion:'Mantenimiento',  descripcionAlt:'Maintenance' },
  { id:'g5', codigo:'MRN', descripcion:'Marina',         descripcionAlt:'Marina' },
];

const initialCentrosCosto: Centro[] = [
  { id:'cc1', grupoId:'g1', codigo:'ADM-001', descripcion:'Gerencia General',    descripcionAlt:'General Management' },
  { id:'cc2', grupoId:'g1', codigo:'ADM-002', descripcion:'Contabilidad',        descripcionAlt:'Accounting' },
  { id:'cc3', grupoId:'g2', codigo:'RST-001', descripcion:'Restaurante principal',descripcionAlt:'Main Restaurant' },
  { id:'cc4', grupoId:'g3', codigo:'SPA-001', descripcion:'Spa tratamientos',    descripcionAlt:'Spa Treatments' },
  { id:'cc5', grupoId:'g4', codigo:'MNT-001', descripcion:'Mantenimiento edif.', descripcionAlt:'Building Maintenance' },
  { id:'cc6', grupoId:'g5', codigo:'MRN-001', descripcion:'Marina operaciones',  descripcionAlt:'Marina Operations' },
];

// ── Centros de costo ──────────────────────────────────────────────────────────
// CC solo visible en cuentas con tipoEspecial
// hover no mueve la fila - actions tienen width reservado fija
// no hay botón exportar duplicado en la tabla

export function TabCentrosCosto({ cuentas, triggerNuevo, onNuevoDone }: { 
  cuentas: Cuenta[]; triggerNuevo?: boolean; onNuevoDone?: ()=>void;
}) {
  const [grupos, setGrupos]   = useState<Grupo[]>(initialGruposCentrosCosto);
  const [centros, setCentros] = useState<Centro[]>(initialCentrosCosto);
  const [collapsed, setCollapsed] = useState<Record<string,boolean>>({});
  const [modal, setModal]   = useState<{tipo:'grupo'|'centro'; grupoId?:string; editId?:string}|null>(null);
  const [form, setForm]     = useState({codigo:'',descripcion:'',descripcionAlt:''});
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [selected, setSelected] = useState<Centro|null>(null);

  // Cuentas especiales (tienen tipoEspecial) para panel lateral
  const flat = flattenTree(cuentas);
  const cuentasEspeciales = flat.filter(n=>n.tipoEspecial&&n.nivel==='detalle');

  // Trigger from parent header button
  useEffect(() => {
    if (triggerNuevo) { openNuevoGrupo(); onNuevoDone?.(); }
  }, [triggerNuevo]);

  function centrosPorGrupo(gid:string) { return centros.filter(c=>c.grupoId===gid); }
  function toggleGrupo(id:string) { setCollapsed(p=>({...p,[id]:!p[id]})); }
  function openNuevoGrupo() { setForm({codigo:'',descripcion:'',descripcionAlt:''}); setErrors({}); setModal({tipo:'grupo'}); }
  function openEditGrupo(g:Grupo) { setForm({codigo:g.codigo,descripcion:g.descripcion,descripcionAlt:g.descripcionAlt}); setErrors({}); setModal({tipo:'grupo',editId:g.id}); }
  function openNuevoCentro(gid:string) { setForm({codigo:'',descripcion:'',descripcionAlt:''}); setErrors({}); setModal({tipo:'centro',grupoId:gid}); }
  function openEditCentro(cc:Centro) { setForm({codigo:cc.codigo,descripcion:cc.descripcion,descripcionAlt:cc.descripcionAlt}); setErrors({}); setModal({tipo:'centro',grupoId:cc.grupoId,editId:cc.id}); }
  function closeModal() { setModal(null); setErrors({}); }

  function saveGrupo() {
    const e:Record<string,string>={};
    if (!form.codigo.trim()) e.codigo='Requerido';
    if (!form.descripcion.trim()) e.descripcion='Requerido';
    if (Object.keys(e).length) { setErrors(e); return; }
    if (modal?.editId) setGrupos(p=>p.map(g=>g.id===modal.editId?{...g,...form}:g));
    else setGrupos(p=>[...p,{id:`grp-${Date.now()}`,...form}]);
    closeModal();
  }
  function saveCentro() {
    const e:Record<string,string>={};
    if (!form.codigo.trim()) e.codigo='Requerido';
    if (!form.descripcion.trim()) e.descripcion='Requerido';
    if (Object.keys(e).length) { setErrors(e); return; }
    if (modal?.editId) { setCentros(p=>p.map(c=>c.id===modal.editId?{...c,...form}:c)); if(selected?.id===modal.editId) setSelected(prev=>prev?{...prev,...form}:null); }
    else setCentros(p=>[...p,{id:`cc-${Date.now()}`,grupoId:modal?.grupoId??grupos[0]?.id??'',...form}]);
    closeModal();
  }
  function deleteGrupo(id:string) { setGrupos(p=>p.filter(g=>g.id!==id)); setCentros(p=>p.filter(c=>c.grupoId!==id)); closeModal(); }
  function deleteCentro(id:string) { setCentros(p=>p.filter(c=>c.id!==id)); if(selected?.id===id) setSelected(null); closeModal(); }

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', fontFamily:F }}>
      {/* Main table */}
      <div style={{ flex:1, overflowY:'auto', padding:17, display:'flex', flexDirection:'column', gap:14, background:'#F5F5F5' }}>
        <div style={{ ...TBL.wrap }}>
          <table style={{ ...TBL.table }}>
            <thead>
              <tr style={{ background:'#fff', borderBottom:'1px solid #E8E8E8' }}>
                <th style={{ ...TBL.th, width:200 }}>Código</th>
                <th style={{ ...TBL.th }}>Descripción</th>
                <th style={{ ...TBL.th }}>Descripción alternativa</th>
                {/* fixed-width actions column so row never shifts */}
                <th style={{ width:120 }}/>
              </tr>
            </thead>
            <tbody>
              {grupos.length===0 && <tr><td colSpan={4} style={{ padding:'21px', textAlign:'center', color:C.n700, fontSize:11, fontFamily:F }}>Sin grupos. Creá el primero.</td></tr>}
              {grupos.map(grp=>{
                const hijos = centrosPorGrupo(grp.id);
                const isOpen = !collapsed[grp.id];
                return (
                  <Fragment key={grp.id}>
                    <tr style={{ background:'#F7F7F7', borderTop:'1px solid #EBEBEB' }}>
                      <td style={{ padding:'9px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <button onClick={()=>toggleGrupo(grp.id)} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                            {isOpen?<IcChevronDown className="w-3.5 h-3.5" style={{color:C.n700}}/>:<IcChevronRight className="w-3.5 h-3.5" style={{color:C.n700}}/>}
                            <strong style={{ fontSize:11, color:C.n900, fontFamily:F }}>{grp.codigo}</strong>
                          </button>
                          <span style={{ fontSize:10, color:C.n700, fontFamily:F }}>({hijos.length})</span>
                        </div>
                      </td>
                      <td style={{ padding:'9px 14px', fontSize:11, fontWeight:500, color:C.n900, fontFamily:F }}>{grp.descripcion}</td>
                      <td style={{ padding:'9px 14px', fontSize:11, color:C.n700, fontFamily:F }}>{grp.descripcionAlt}</td>
                      {/* actions always occupy same space - no layout shift */}
                      <td style={{ padding:'5px 10px', width:120 }}>
                        <div style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>
                          <button onClick={()=>openNuevoCentro(grp.id)}
                            style={{ height:23, padding:'0 7px', fontSize:10, color:BRAND, background:C.brandBg, border:`1px solid ${C.brandBd}`, borderRadius:4, cursor:'pointer', fontFamily:F, display:'flex', alignItems:'center', gap:3 }}>
                            <IcPlus className="w-2.5 h-2.5"/> Centro
                          </button>
                          <button onClick={()=>openEditGrupo(grp)}
                            style={{ height:23, padding:'0 7px', fontSize:10, color:C.n700, background:'#fff', border:`1px solid ${C.n500}`, borderRadius:4, cursor:'pointer', fontFamily:F }}>
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && hijos.map(cc=>(
                      <tr key={cc.id} style={{ borderTop:'1px solid #F0F0F0', cursor:'pointer' }}
                        onClick={()=>setSelected(cc)}
                        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#FAFAFA'}
                        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='#fff'}>
                        <td style={{ padding:'9px 14px', paddingLeft:35, fontFamily:F, color:C.n900, fontSize:11 }}>{cc.codigo}</td>
                        <td style={{ padding:'9px 14px', fontFamily:F, fontSize:11 }}>{cc.descripcion}</td>
                        <td style={{ padding:'9px 14px', fontFamily:F, fontSize:11, color:C.n700 }}>{cc.descripcionAlt}</td>
                        {/* same fixed-width column, always visible */}
                        <td style={{ padding:'5px 10px', width:120 }}>
                          <div style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>
                            <button onClick={e=>{e.stopPropagation();openEditCentro(cc);}}
                              style={{ height:23, padding:'0 7px', fontSize:10, color:C.n700, background:'#fff', border:`1px solid ${C.n500}`, borderRadius:4, cursor:'pointer', fontFamily:F, display:'flex', alignItems:'center' }}>
                              <IcEdit className="w-3 h-3"/>
                            </button>
                            <button onClick={e=>{e.stopPropagation();deleteCentro(cc.id);}}
                              style={{ height:23, padding:'0 7px', fontSize:10, color:C.error, background:'#fff', border:`1px solid rgba(244,67,54,.3)`, borderRadius:4, cursor:'pointer', fontFamily:F, display:'flex', alignItems:'center' }}>
                              <IcTrash className="w-3 h-3"/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {isOpen && hijos.length===0 && (
                      <tr style={{ borderTop:`1px solid #F5F5F5` }}>
                        <td colSpan={4} style={{ paddingLeft:35, padding:'7px 35px', fontSize:10, color:'#C8C8C8', fontStyle:'italic', fontFamily:F }}>
                          Sin centros - usá el botón “Centro” para agregar.
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              <tr>
                <td colSpan={4} style={{ padding:'9px 14px' }}>
                  <button onClick={openNuevoGrupo} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:C.n700, background:'none', border:'none', cursor:'pointer', fontFamily:F }}>
                    <IcPlus className="w-3 h-3"/> Nuevo grupo
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel for selected centro */}
      {selected && (
        <aside style={{ width:380, minWidth:380, borderLeft:`1px solid ${C.n500}`, background:'#fff', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ height:52, padding:'0 14px', borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <div>
              <p style={{ fontSize:13, fontWeight:600, color:C.n900, margin:0, fontFamily:F }}>{selected.descripcion}</p>
              <p style={{ fontSize:10, color:C.n700, margin:'2px 0 0', fontFamily:F }}>{selected.codigo}</p>
            </div>
            <div style={{ display:'flex', gap:5 }}>
              <Button variant="primary" icon={<IcEdit className="w-3 h-3"/>} style={{ height:24 }} onClick={()=>openEditCentro(selected)}>Editar</Button>
              <button onClick={()=>setSelected(null)} style={{ width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:radius.sm, border:'none', background:'none', cursor:'pointer', color:C.n700 }}>
                <IcClose className="w-4 h-4"/>
              </button>
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:14 }}>
            <div style={{ background:C.n200, borderRadius:radius.md, padding:12, marginBottom:12 }}>
              <p style={{ fontSize:9, color:C.n700, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:9, fontFamily:F }}>Datos del centro de costo</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 }}>
                <div><p style={{ fontSize:9, color:C.n700, margin:'0 0 2px', fontFamily:F }}>Código</p><p style={{ fontSize:12, fontWeight:500, color:C.n900, margin:0, fontFamily:F }}>{selected.codigo}</p></div>
                <div><p style={{ fontSize:9, color:C.n700, margin:'0 0 2px', fontFamily:F }}>Grupo</p><p style={{ fontSize:12, fontWeight:500, color:C.n900, margin:0, fontFamily:F }}>{grupos.find(g=>g.id===selected.grupoId)?.descripcion??'-'}</p></div>
                {selected.descripcionAlt && <div style={{ gridColumn:'1/-1' }}><p style={{ fontSize:9, color:C.n700, margin:'0 0 2px', fontFamily:F }}>Descripción alternativa</p><p style={{ fontSize:11, color:C.n900, margin:0, fontFamily:F }}>{selected.descripcionAlt}</p></div>}
              </div>
            </div>

            {/* only show accounts WITH tipoEspecial */}
            <p style={{ fontSize:9, color:BRAND, fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 4px', fontFamily:F }}>
              Cuentas especiales asociadas ({cuentasEspeciales.length})
            </p>
            <p style={{ fontSize:10, color:C.n700, margin:'0 0 9px', fontFamily:F }}>Solo las cuentas con rol especial pueden tener centros de costo asignados.</p>
            {cuentasEspeciales.length===0
              ? <p style={{ fontSize:11, color:C.n700, fontFamily:F }}>Sin cuentas especiales con centros asignados.</p>
              : cuentasEspeciales.map(c=>(
                <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:`1px solid ${C.n500}` }}>
                  <div>
                    <p style={{ fontSize:11, fontWeight:500, color:BRAND, margin:0, fontFamily:F }}>{c.code}</p>
                    <p style={{ fontSize:10, color:C.n700, margin:0, fontFamily:F }}>{c.nombre}</p>
                  </div>
                  <button style={{ fontSize:10, color:BRAND, background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Ver →</button>
                </div>
              ))
            }
          </div>
        </aside>
      )}

      {/* Modal grupo */}
      {modal?.tipo==='grupo' && (
        <Modal open title={modal.editId?'Editar grupo':'Nuevo grupo de centros de costo'} onClose={closeModal}
          footer={<div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            {modal.editId?<button onClick={()=>deleteGrupo(modal.editId!)} style={{ fontSize:10, color:C.error, background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Eliminar grupo</button>:<div/>}
            <div style={{ display:'flex', gap:7 }}>
              <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
              <Button onClick={saveGrupo}>Guardar</Button>
            </div>
          </div>}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <FormField label="Código" required error={errors.codigo}><Input value={form.codigo} onChange={v=>setForm(f=>({...f,codigo:v}))} placeholder="Ej. Adm001" error={errors.codigo}/></FormField>
            <FormField label="Descripción" required error={errors.descripcion}><Input value={form.descripcion} onChange={v=>setForm(f=>({...f,descripcion:v.slice(0,50)}))} placeholder="Nombre del grupo" error={errors.descripcion}/></FormField>
            <FormField label="Descripción alternativa"><Input value={form.descripcionAlt} onChange={v=>setForm(f=>({...f,descripcionAlt:v}))} placeholder="En inglés"/></FormField>
          </div>
        </Modal>
      )}

      {/* Modal centro */}
      {modal?.tipo==='centro' && (
        <Modal open title={modal.editId?'Editar centro de costo':'Nuevo centro de costo'} onClose={closeModal}
          footer={<div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            {modal.editId?<button onClick={()=>deleteCentro(modal.editId!)} style={{ fontSize:10, color:C.error, background:'none', border:'none', cursor:'pointer', fontFamily:F }}>Eliminar</button>:<div/>}
            <div style={{ display:'flex', gap:7 }}>
              <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
              <Button onClick={saveCentro}>Guardar</Button>
            </div>
          </div>}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <p style={{ fontSize:11, color:C.n700, margin:0, fontFamily:F }}>Grupo: <strong>{grupos.find(g=>g.id===modal.grupoId)?.descripcion}</strong></p>
            <FormField label="Código" required error={errors.codigo}><Input value={form.codigo} onChange={v=>setForm(f=>({...f,codigo:v}))} placeholder="Ej. Adm001001" error={errors.codigo}/></FormField>
            <FormField label="Descripción" required error={errors.descripcion}><Input value={form.descripcion} onChange={v=>setForm(f=>({...f,descripcion:v.slice(0,50)}))} placeholder="Nombre del centro" error={errors.descripcion}/></FormField>
            <FormField label="Descripción alternativa"><Input value={form.descripcionAlt} onChange={v=>setForm(f=>({...f,descripcionAlt:v}))} placeholder="En inglés"/></FormField>
          </div>
        </Modal>
      )}
    </div>
  );
}
