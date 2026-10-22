'use client';
import { useState } from 'react';
import { Modal, Section, RowAction } from '@/components/ui/primitives';
import { Button, FormField, Input, Select, Checkbox } from '@/components/ui/formulario';
import { StatusBadge } from '@/components/ui/tabla';
import { radius, TABLA , C } from '@/components/ui/tokens';
import { SearchInput } from '@/components/ui/filtros';
import { IcEdit, IcTrash } from '@/components/ui/icons';
import { useVisualizacionAsientosDefault, type VisualizacionAsiento } from '@/components/pages/config/visualizacionAsientos';
import { BLANK_C, BLANK_L, BLANK_TA, CATS, C_INIT, type Concepto, F, L_INIT, type Libro, TA_INIT, type TipoAsiento } from './datos';
import { useSenalAgregar } from '@/components/ui/useSenalAgregar';

export function ConfirmDelete({ onConfirm, onCancel, label }: { onConfirm:()=>void; onCancel:()=>void; label:string }) {
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.35)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ background:'#FFFFFF',borderRadius:10,padding:24,maxWidth:380,width:'90%',fontFamily:F,boxShadow:'0 8px 40px rgba(0,0,0,.18)' }}>
        <h3 style={{ fontSize:14,fontWeight:500,margin:'0 0 12px' }}>Confirmar eliminación</h3>
        <p style={{ fontSize:12,color:C.n700,marginBottom:20 }}>¿Está seguro que desea eliminar <strong>{label}</strong>? Esta acción no se puede deshacer.</p>
        <div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm}>Eliminar</Button>
        </div>
      </div>
    </div>
  );
}
// ── Pestaña Conceptos ─────────────────────────────────────────────────────────────
export function TabConceptos({ addSignal, onAddHandled }: { addSignal?: number; onAddHandled?: () => void }) {
  const [rows,setRows]=useState<Concepto[]>(C_INIT);
  const [search,setSearch]=useState('');
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState<number|null>(null);
  const [form,setForm]=useState(BLANK_C);
  const [confirmDel,setConfirmDel]=useState<Concepto|null>(null);

  const filtered=rows.filter(r=>!search||r.codigo.toLowerCase().includes(search.toLowerCase())||r.descripcion.toLowerCase().includes(search.toLowerCase()));
  function openNew(){ setForm(BLANK_C); setEditId(null); setModal(true); }
  function openEdit(r:Concepto){ setForm({codigo:r.codigo,descripcion:r.descripcion,categoria:r.categoria,activo:r.activo}); setEditId(r.id); setModal(true); }
  function save(){ if(!form.codigo||!form.descripcion)return; if(editId===null) setRows(p=>[...p,{id:Date.now(),...form}]); else setRows(p=>p.map(x=>x.id===editId?{...x,...form}:x)); setModal(false); }

  // El botón «Nuevo concepto» está en el encabezado de la página
  useSenalAgregar(addSignal, onAddHandled, () => { openNew(); });

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
      <Section title="Catálogo de conceptos" hint="Descripciones predefinidas para las líneas de asiento.">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar concepto…" width="100%" />
          <div style={TABLA.wrap}><table className="tabla" style={TABLA.table}>
            <thead><tr style={TABLA.headRow}>
              {['Código','Descripción','Categoría','Estado','Acciones'].map(h=><th key={h} style={TABLA.th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(r=>(
                <tr key={r.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                  <td style={{ padding:'8px 12px', fontFamily:F, fontWeight:600, color:C.n900 }}>{r.codigo}</td>
                  <td style={{ padding:'8px 12px', fontFamily:F }}>{r.descripcion}</td>
                  <td style={{ padding:'8px 12px' }}><span style={{ fontSize:10.5,padding:'2px 8px',borderRadius:4,background:'#F9F9F9',color:C.n700,fontFamily:F }}>{r.categoria}</span></td>
                  <td style={{ padding:'8px 12px' }}>
                    <button onClick={()=>setRows(p=>p.map(x=>x.id===r.id?{...x,activo:!x.activo}:x))}
                      title="Clic para cambiar el estado"
                      style={{ background:'none',border:'none',cursor:'pointer',padding:0 }}>
                      <StatusBadge label={r.activo?'Activo':'Inactivo'} color={r.activo?'green':'gray'} />
                    </button>
                  </td>
                  <td style={{ padding:'8px 12px' }}>
                    <div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
                      <RowAction title="Editar" onClick={()=>openEdit(r)}><IcEdit className="w-3.5 h-3.5"/></RowAction>
                      <RowAction title="Eliminar" danger onClick={()=>setConfirmDel(r)}><IcTrash className="w-3.5 h-3.5"/></RowAction>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </Section>
      {modal && (
        <Modal open title={editId===null?'Nuevo concepto':'Editar concepto'} onClose={()=>setModal(false)}
          footer={<div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}><Button variant="secondary" onClick={()=>setModal(false)}>Cancelar</Button><Button onClick={save}>Guardar</Button></div>}>
          <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
              <FormField label="Código" required><Input value={form.codigo} onChange={v=>setForm(f=>({...f,codigo:v.toUpperCase()}))} placeholder="Ej. DEP" /></FormField>
              <FormField label="Categoría"><Select value={form.categoria} onChange={v=>setForm(f=>({...f,categoria:v}))} options={CATS.map(c=>({value:c,label:c}))} /></FormField>
            </div>
            <FormField label="Descripción" required><Input value={form.descripcion} onChange={v=>setForm(f=>({...f,descripcion:v}))} placeholder="Descripción del concepto" /></FormField>
            <Checkbox label="Activo" checked={form.activo} onChange={v=>setForm(f=>({...f,activo:v}))} />
          </div>
        </Modal>
      )}
      {confirmDel && <ConfirmDelete label={confirmDel.codigo} onConfirm={()=>{ setRows(p=>p.filter(x=>x.id!==confirmDel.id)); setConfirmDel(null); }} onCancel={()=>setConfirmDel(null)} />}
    </div>
  );
}
// ── Pestaña Libros ────────────────────────────────────────────────────────────────
// ── Visualización de asientos (Detallado / Consolidado) ─────────────────────
function VisualizacionAsientosConfig() {
  const { default_, setDefault } = useVisualizacionAsientosDefault();
  const opciones: { value: VisualizacionAsiento; label:string; desc:string }[] = [
    { value:'detallado',   label:'Detallado',   desc:'Cada línea del asiento tal cual la mandó el módulo de origen (Front Desk, Tour Operator, POS, etc.).' },
    { value:'consolidado', label:'Consolidado', desc:'Las líneas se agrupan sumando por cuenta y centro de costos.' },
  ];
  return (
    <Section title="Visualización de asientos" hint="Define cómo se ven las líneas de los asientos en Bandeja de asientos y en los reportes, para toda la empresa.
          Esto no cambia el asiento en sí - los módulos siguen mandando el detalle completo - solo cómo se muestra.
          Cada pantalla de reporte tiene su propio botón para cambiar la vista al momento, pero arranca con este valor.">
        {opciones.map(o=>(
          <button key={o.value} onClick={()=>setDefault(o.value)}
            style={{ flex:1, textAlign:'left', padding:'12px 14px', borderRadius:radius.md, cursor:'pointer', fontFamily:F,
              border:`1.5px solid ${default_===o.value?C.brand:'#ECECEC'}`, background:default_===o.value?C.brandBg:'#FFFFFF' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <div style={{ width:15, height:15, borderRadius:'50%', border:`1.5px solid ${default_===o.value?C.brand:'#ECECEC'}`,
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {default_===o.value && <div style={{ width:7, height:7, borderRadius:'50%', background:C.brand }}/>}
              </div>
              <span style={{ fontSize:13, fontWeight:600, color:default_===o.value?C.brand:'#0F0F0F' }}>{o.label}</span>
            </div>
            <p style={{ fontSize:11, color:C.n700, margin:0, lineHeight:1.5 }}>{o.desc}</p>
          </button>
        ))}
      </Section>
  );
}
// ── Tipos de asiento ──────────────────────────────────────────────────────────
function TabTiposAsiento({ addSignal, onAddHandled }: { addSignal?: number; onAddHandled?: () => void }) {
  const [rows,setRows]=useState<TipoAsiento[]>(TA_INIT);
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState<number|null>(null);
  const [form,setForm]=useState(BLANK_TA);
  const [confirmDel,setConfirmDel]=useState<TipoAsiento|null>(null);

  function openNew(){ setForm(BLANK_TA); setEditId(null); setModal(true); }
  function openEdit(r:TipoAsiento){ setForm({codigo:r.codigo,nombre:r.nombre,descripcion:r.descripcion,activo:r.activo}); setEditId(r.id); setModal(true); }
  function save(){ if(!form.codigo||!form.nombre)return; if(editId===null) setRows(p=>[...p,{id:Date.now(),...form}]); else setRows(p=>p.map(x=>x.id===editId?{...x,...form}:x)); setModal(false); }

  // El botón «Nuevo tipo» está en el encabezado de la página
  useSenalAgregar(addSignal, onAddHandled, () => { openNew(); });

  return (
    <Section title="Tipos de asiento" hint="Clasifican el origen de cada asiento en Bandeja de asientos.">
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <div style={TABLA.wrap}><table className="tabla" style={TABLA.table}>
          <thead><tr style={TABLA.headRow}>
            {['Código','Nombre','Descripción','Estado','Acciones'].map(h=><th key={h} style={TABLA.th}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                <td style={{ padding:'8px 12px', fontFamily:F, color:C.n900 }}>{r.codigo}</td>
                <td style={{ padding:'8px 12px', fontFamily:F }}>{r.nombre}</td>
                <td style={{ padding:'8px 12px', fontFamily:F }}>{r.descripcion}</td>
                <td style={{ padding:'8px 12px' }}>
                  <button onClick={()=>setRows(p=>p.map(x=>x.id===r.id?{...x,activo:!x.activo}:x))}
                    title="Clic para cambiar el estado"
                    style={{ background:'none',border:'none',cursor:'pointer',padding:0 }}>
                    <StatusBadge label={r.activo?'Activo':'Inactivo'} color={r.activo?'green':'gray'} />
                  </button>
                </td>
                <td style={{ padding:'8px 12px' }}>
                  <div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
                    <RowAction title="Editar" onClick={()=>openEdit(r)}><IcEdit className="w-3.5 h-3.5"/></RowAction>
                    <RowAction title="Eliminar" danger onClick={()=>setConfirmDel(r)}><IcTrash className="w-3.5 h-3.5"/></RowAction>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
      {modal && (
        <Modal open title={editId===null?'Nuevo tipo de asiento':'Editar tipo de asiento'} onClose={()=>setModal(false)}
          footer={<div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}><Button variant="secondary" onClick={()=>setModal(false)}>Cancelar</Button><Button onClick={save}>Guardar</Button></div>}>
          <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 2fr',gap:12 }}>
              <FormField label="Código" required><Input value={form.codigo} onChange={v=>setForm(f=>({...f,codigo:v.toUpperCase()}))} placeholder="Ej. A" /></FormField>
              <FormField label="Nombre" required><Input value={form.nombre} onChange={v=>setForm(f=>({...f,nombre:v}))} placeholder="Nombre del tipo" /></FormField>
            </div>
            <FormField label="Descripción"><Input value={form.descripcion} onChange={v=>setForm(f=>({...f,descripcion:v}))} placeholder="Descripción breve" /></FormField>
            <Checkbox label="Activo" checked={form.activo} onChange={v=>setForm(f=>({...f,activo:v}))} />
          </div>
        </Modal>
      )}
      {confirmDel && <ConfirmDelete label={confirmDel.nombre} onConfirm={()=>{ setRows(p=>p.filter(x=>x.id!==confirmDel.id)); setConfirmDel(null); }} onCancel={()=>setConfirmDel(null)} />}
    </Section>
  );
}
export function TabAsientosContables({ addSignal, onAddHandled }: { addSignal?: number; onAddHandled?: () => void }) {
  return (
    <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
      <VisualizacionAsientosConfig/>
      <TabTiposAsiento addSignal={addSignal} onAddHandled={onAddHandled}/>
    </div>
  );
}
export function TabLibrosContables({ addSignal, onAddHandled }: { addSignal?: number; onAddHandled?: () => void }) {
  const [rows,setRows]=useState<Libro[]>(L_INIT);
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState<number|null>(null);
  const [form,setForm]=useState(BLANK_L);
  const [confirmDel,setConfirmDel]=useState<Libro|null>(null);

  function openNew(){ setForm(BLANK_L); setEditId(null); setModal(true); }
  function openEdit(r:Libro){ setForm({codigo:r.codigo,nombre:r.nombre,descripcion:r.descripcion,activo:r.activo}); setEditId(r.id); setModal(true); }
  function save(){ if(!form.codigo||!form.nombre)return; if(editId===null) setRows(p=>[...p,{id:Date.now(),...form}]); else setRows(p=>p.map(x=>x.id===editId?{...x,...form}:x)); setModal(false); }

  // El botón «Nuevo libro» está en el encabezado de la página
  useSenalAgregar(addSignal, onAddHandled, () => { openNew(); });

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
      <Section title="Libros contables" hint="Los libros donde se registran los asientos.">
          <div style={TABLA.wrap}><table className="tabla" style={TABLA.table}>
            <thead><tr style={TABLA.headRow}>
              {['Código','Nombre','Descripción','Estado','Acciones'].map(h=><th key={h} style={TABLA.th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map(r=>(
                <tr key={r.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                  <td style={{ padding:'8px 12px', fontFamily:F, color:C.n900 }}>{r.codigo}</td>
                  <td style={{ padding:'8px 12px', fontFamily:F }}>{r.nombre}</td>
                  <td style={{ padding:'8px 12px', fontFamily:F }}>{r.descripcion}</td>
                  <td style={{ padding:'8px 12px' }}>
                    <button onClick={()=>setRows(p=>p.map(x=>x.id===r.id?{...x,activo:!x.activo}:x))}
                      title="Clic para cambiar el estado"
                      style={{ background:'none',border:'none',cursor:'pointer',padding:0 }}>
                      <StatusBadge label={r.activo?'Activo':'Inactivo'} color={r.activo?'green':'gray'} />
                    </button>
                  </td>
                  <td style={{ padding:'8px 12px' }}>
                    <div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
                      <RowAction title="Editar" onClick={()=>openEdit(r)}><IcEdit className="w-3.5 h-3.5"/></RowAction>
                      <RowAction title="Eliminar" danger onClick={()=>setConfirmDel(r)}><IcTrash className="w-3.5 h-3.5"/></RowAction>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </Section>
      {modal && (
        <Modal open title={editId===null?'Nuevo libro contable':'Editar libro contable'} onClose={()=>setModal(false)}
          footer={<div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}><Button variant="secondary" onClick={()=>setModal(false)}>Cancelar</Button><Button onClick={save}>Guardar</Button></div>}>
          <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 2fr',gap:12 }}>
              <FormField label="Código" required><Input value={form.codigo} onChange={v=>setForm(f=>({...f,codigo:v.toUpperCase()}))} placeholder="Ej. GEN" /></FormField>
              <FormField label="Nombre" required><Input value={form.nombre} onChange={v=>setForm(f=>({...f,nombre:v}))} placeholder="Nombre del libro" /></FormField>
            </div>
            <FormField label="Descripción"><Input value={form.descripcion} onChange={v=>setForm(f=>({...f,descripcion:v}))} placeholder="Descripción breve" /></FormField>
            <Checkbox label="Activo" checked={form.activo} onChange={v=>setForm(f=>({...f,activo:v}))} />
          </div>
        </Modal>
      )}
      {confirmDel && <ConfirmDelete label={confirmDel.nombre} onConfirm={()=>{ setRows(p=>p.filter(x=>x.id!==confirmDel.id)); setConfirmDel(null); }} onCancel={()=>setConfirmDel(null)} />}
    </div>
  );
}
