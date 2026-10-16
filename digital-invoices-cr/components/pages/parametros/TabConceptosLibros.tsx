'use client';
import { useState, useEffect } from 'react';
import { Button, FormField, Input, Select, DataTable, DataRow, Td, StatusBadge, Modal, Checkbox, Toast, radius, SearchInput } from '../../ui/primitives';
import { IcPlus, IcEdit, IcTrash, IcSearch, IcCopy } from '../../ui/icons';
import { C, FONT } from '../../ui/primitives';
import { useVisualizacionAsientosDefault, VisualizacionAsiento } from '../config/visualizacionAsientos';

const F = FONT;
const CATS = ['Ajuste','Ingreso','Gasto','Otro'];
const BLANK_C = { codigo:'', descripcion:'', categoria:'Ajuste', activo:true };
const BLANK_L = { codigo:'', nombre:'', descripcion:'', activo:true };
const BLANK_TA = { codigo:'', nombre:'', descripcion:'', activo:true };

interface Concepto { id:number; codigo:string; descripcion:string; categoria:string; activo:boolean; }
interface Libro    { id:number; codigo:string; nombre:string; descripcion:string; activo:boolean; }
interface TipoAsiento { id:number; codigo:string; nombre:string; descripcion:string; activo:boolean; }

const C_INIT: Concepto[] = [
  { id:1,codigo:'DEP',descripcion:'Depreciación de activos fijos',   categoria:'Ajuste',   activo:true },
  { id:2,codigo:'AMO',descripcion:'Amortización de intangibles',     categoria:'Ajuste',   activo:true },
  { id:3,codigo:'ING',descripcion:'Ingresos por servicios hoteleros',categoria:'Ingreso',  activo:true },
  { id:4,codigo:'GAS',descripcion:'Gastos operativos generales',     categoria:'Gasto',    activo:true },
];
const L_INIT: Libro[] = [
  { id:1,codigo:'GEN',nombre:'Libro General',   descripcion:'Libro contable principal',    activo:true  },
  { id:2,codigo:'AJU',nombre:'Libro de Ajustes',descripcion:'Asientos de ajuste periódico',activo:true  },
  { id:3,codigo:'CIE',nombre:'Libro de Cierre', descripcion:'Asientos de cierre anual',    activo:false },
];
// Tipos de asiento reales del sistema (A/M/I/D/P ya se usan en Bandeja de
// asientos para clasificar el origen de cada asiento) - acá quedan visibles
// y administrables desde un solo lugar, junto a Libros contables.
const TA_INIT: TipoAsiento[] = [
  { id:1, codigo:'A', nombre:'Automático', descripcion:'Generado por integración con otro módulo (Front Desk, Tour Operator, POS, etc.)', activo:true },
  { id:2, codigo:'M', nombre:'Manual',     descripcion:'Registrado a mano desde Bandeja de asientos.', activo:true },
  { id:3, codigo:'I', nombre:'Importado',  descripcion:'Cargado por importación masiva.', activo:true },
  { id:4, codigo:'D', nombre:'Duplicado',  descripcion:'Generado al duplicar otro asiento existente.', activo:true },
  { id:5, codigo:'P', nombre:'Plantilla',  descripcion:'Generado a partir de una plantilla de asiento.', activo:true },
];

function ConfirmDelete({ onConfirm, onCancel, label }: { onConfirm:()=>void; onCancel:()=>void; label:string }) {
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.35)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ background:'#fff',borderRadius:10,padding:24,maxWidth:380,width:'90%',fontFamily:F,boxShadow:'0 8px 40px rgba(0,0,0,.18)' }}>
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

// ── Tab Conceptos ─────────────────────────────────────────────────────────────
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

  useEffect(() => {
    if (addSignal) { openNew(); onAddHandled?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSignal]);

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
      <div style={{ background:'#fff',border:'1px solid #ECECEC',borderRadius:radius.md,overflow:'hidden' }}>
        <div style={{ padding:'14px 20px',borderBottom:'1px solid #ECECEC' }}>
          <p style={{ fontSize:13,fontWeight:500,margin:0,fontFamily:F }}>Catálogo de conceptos</p>
          <p style={{ fontSize:11,color:C.n700,margin:'2px 0 0',fontFamily:F }}>Descripciones predefinidas para las líneas de asiento.</p>
        </div>
        <div style={{ padding:'14px 20px',display:'flex',flexDirection:'column',gap:14 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar concepto…" width="100%" />
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12,fontFamily:F,border:'1px solid #ECECEC',borderRadius:radius.md,overflow:'hidden' }}>
            <thead><tr style={{ background:'#fff', borderBottom:'1px solid #E8E8E8' }}>
              {['Código','Descripción','Categoría','Estado',''].map(h=><th key={h} style={{ padding:'8px 14px',textAlign:'left',fontSize:11,fontWeight:500,color:C.n700,borderBottom:'1px solid #ECECEC' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(r=>(
                <tr key={r.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                  <td style={{ padding:'8px 14px',fontFamily:F,fontWeight:600,color:C.n900 }}>{r.codigo}</td>
                  <td style={{ padding:'8px 14px',fontFamily:F }}>{r.descripcion}</td>
                  <td style={{ padding:'8px 14px' }}><span style={{ fontSize:10,padding:'2px 8px',borderRadius:4,background:'#F9F9F9',color:C.n700,fontFamily:F }}>{r.categoria}</span></td>
                  <td style={{ padding:'8px 14px' }}>
                    <button onClick={()=>setRows(p=>p.map(x=>x.id===r.id?{...x,activo:!x.activo}:x))}
                      title="Clic para cambiar el estado"
                      style={{ background:'none',border:'none',cursor:'pointer',padding:0 }}>
                      <StatusBadge label={r.activo?'Activo':'Inactivo'} color={r.activo?'green':'gray'} />
                    </button>
                  </td>
                  <td style={{ padding:'8px 14px' }}>
                    <div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
                      <button onClick={()=>openEdit(r)} style={{ background:'none',border:'none',cursor:'pointer',color:C.n700 }}><IcEdit className="w-3.5 h-3.5" /></button>
                      <button onClick={()=>setConfirmDel(r)} style={{ background:'none',border:'none',cursor:'pointer',color:C.error }}><IcTrash className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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

// ── Tab Libros ────────────────────────────────────────────────────────────────
// ── Visualización de asientos (Detallado / Consolidado) ─────────────────────
function VisualizacionAsientosConfig() {
  const { default_, setDefault } = useVisualizacionAsientosDefault();
  const opciones: { value: VisualizacionAsiento; label:string; desc:string }[] = [
    { value:'detallado',   label:'Detallado',   desc:'Cada línea del asiento tal cual la mandó el módulo de origen (Front Desk, Tour Operator, POS, etc.).' },
    { value:'consolidado', label:'Consolidado', desc:'Las líneas se agrupan sumando por cuenta y centro de costos.' },
  ];
  return (
    <div style={{ background:'#fff',border:'1px solid #ECECEC',borderRadius:radius.md,overflow:'hidden' }}>
      <div style={{ padding:'14px 20px',borderBottom:'1px solid #ECECEC' }}>
        <p style={{ fontSize:13,fontWeight:500,margin:0,fontFamily:F }}>Visualización de asientos</p>
        <p style={{ fontSize:11,color:C.n700,margin:'2px 0 0',fontFamily:F }}>
          Define cómo se ven las líneas de los asientos en Bandeja de asientos y en los reportes, para toda la empresa.
          Esto no cambia el asiento en sí - los módulos siguen mandando el detalle completo - solo cómo se muestra.
          Cada pantalla de reporte tiene su propio botón para cambiar la vista al momento, pero arranca con este valor.
        </p>
      </div>
      <div style={{ padding:'14px 20px', display:'flex', gap:12 }}>
        {opciones.map(o=>(
          <button key={o.value} onClick={()=>setDefault(o.value)}
            style={{ flex:1, textAlign:'left', padding:'12px 14px', borderRadius:radius.md, cursor:'pointer', fontFamily:F,
              border:`1.5px solid ${default_===o.value?C.brand:'#ECECEC'}`, background:default_===o.value?C.brandBg:'#fff' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <div style={{ width:15, height:15, borderRadius:'50%', border:`1.5px solid ${default_===o.value?C.brand:'#CCC'}`,
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {default_===o.value && <div style={{ width:7, height:7, borderRadius:'50%', background:C.brand }}/>}
              </div>
              <span style={{ fontSize:13, fontWeight:600, color:default_===o.value?C.brand:'#0F0F0F' }}>{o.label}</span>
            </div>
            <p style={{ fontSize:11, color:C.n700, margin:0, lineHeight:1.5 }}>{o.desc}</p>
          </button>
        ))}
      </div>
    </div>
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

  useEffect(() => {
    if (addSignal) { openNew(); onAddHandled?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSignal]);

  return (
    <div style={{ background:'#fff',border:'1px solid #ECECEC',borderRadius:radius.md,overflow:'hidden' }}>
      <div style={{ padding:'14px 20px',borderBottom:'1px solid #ECECEC' }}>
        <p style={{ fontSize:13,fontWeight:500,margin:0,fontFamily:F }}>Tipos de asiento</p>
        <p style={{ fontSize:11,color:C.n700,margin:'2px 0 0',fontFamily:F }}>Clasifican el origen de cada asiento en Bandeja de asientos.</p>
      </div>
      <div style={{ padding:'14px 20px',display:'flex',flexDirection:'column',gap:14 }}>
        <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12,fontFamily:F,border:'1px solid #ECECEC',borderRadius:radius.md,overflow:'hidden' }}>
          <thead><tr style={{ background:'#fff', borderBottom:'1px solid #E8E8E8' }}>
            {['Código','Nombre','Descripción','Estado',''].map(h=><th key={h} style={{ padding:'8px 14px',textAlign:'left',fontSize:11,fontWeight:500,color:C.n700,borderBottom:'1px solid #ECECEC' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                <td style={{ padding:'8px 14px',fontFamily:F,fontWeight:600,color:C.n900 }}>{r.codigo}</td>
                <td style={{ padding:'8px 14px',fontFamily:F,fontWeight:500 }}>{r.nombre}</td>
                <td style={{ padding:'8px 14px',fontFamily:F,color:C.n700 }}>{r.descripcion}</td>
                <td style={{ padding:'8px 14px' }}>
                  <button onClick={()=>setRows(p=>p.map(x=>x.id===r.id?{...x,activo:!x.activo}:x))}
                    title="Clic para cambiar el estado"
                    style={{ background:'none',border:'none',cursor:'pointer',padding:0 }}>
                    <StatusBadge label={r.activo?'Activo':'Inactivo'} color={r.activo?'green':'gray'} />
                  </button>
                </td>
                <td style={{ padding:'8px 14px' }}>
                  <div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
                    <button onClick={()=>openEdit(r)} style={{ background:'none',border:'none',cursor:'pointer',color:C.n700 }}><IcEdit className="w-3.5 h-3.5" /></button>
                    <button onClick={()=>setConfirmDel(r)} style={{ background:'none',border:'none',cursor:'pointer',color:C.error }}><IcTrash className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </div>
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

  useEffect(() => {
    if (addSignal) { openNew(); onAddHandled?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSignal]);

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
      <div style={{ background:'#fff',border:'1px solid #ECECEC',borderRadius:radius.md,overflow:'hidden' }}>
        <div style={{ padding:'14px 20px',borderBottom:'1px solid #ECECEC' }}>
          <p style={{ fontSize:13,fontWeight:500,margin:0,fontFamily:F }}>Libros contables</p>
          <p style={{ fontSize:11,color:C.n700,margin:'2px 0 0',fontFamily:F }}>Los libros donde se registran los asientos.</p>
        </div>
        <div style={{ padding:'14px 20px',display:'flex',flexDirection:'column',gap:14 }}>
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12,fontFamily:F,border:'1px solid #ECECEC',borderRadius:radius.md,overflow:'hidden' }}>
            <thead><tr style={{ background:'#fff', borderBottom:'1px solid #E8E8E8' }}>
              {['Código','Nombre','Descripción','Estado',''].map(h=><th key={h} style={{ padding:'8px 14px',textAlign:'left',fontSize:11,fontWeight:500,color:C.n700,borderBottom:'1px solid #ECECEC' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map(r=>(
                <tr key={r.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                  <td style={{ padding:'8px 14px',fontFamily:F,fontWeight:600,color:C.n900 }}>{r.codigo}</td>
                  <td style={{ padding:'8px 14px',fontFamily:F,fontWeight:500 }}>{r.nombre}</td>
                  <td style={{ padding:'8px 14px',fontFamily:F,color:C.n700 }}>{r.descripcion}</td>
                  <td style={{ padding:'8px 14px' }}>
                    <button onClick={()=>setRows(p=>p.map(x=>x.id===r.id?{...x,activo:!x.activo}:x))}
                      title="Clic para cambiar el estado"
                      style={{ background:'none',border:'none',cursor:'pointer',padding:0 }}>
                      <StatusBadge label={r.activo?'Activo':'Inactivo'} color={r.activo?'green':'gray'} />
                    </button>
                  </td>
                  <td style={{ padding:'8px 14px' }}>
                    <div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
                      <button onClick={()=>openEdit(r)} style={{ background:'none',border:'none',cursor:'pointer',color:C.n700 }}><IcEdit className="w-3.5 h-3.5" /></button>
                      <button onClick={()=>setConfirmDel(r)} style={{ background:'none',border:'none',cursor:'pointer',color:C.error }}><IcTrash className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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

// ── Tab Formularios (previously Transferencias) ──────────────────────────────
const FORMATOS=[{value:'CSV',label:'CSV'},{value:'TXT',label:'TXT'},{value:'XML',label:'XML'}];
const TIPOS_EXP=[{value:'CC',label:'CC - Cuenta Cliente'},{value:'CTA',label:'CTA - Cuenta'}];

interface CuentaForm { id:string; cuentaContable:string; iban:string; consecutivo:number; }

// Cuentas contables de tipo banco disponibles (dropdown #22)
const CUENTAS_BANCARIAS = [
  '110-001-0001 - BAC ₡ 4546-545-466888',
  '110-002-0001 - BAC $ 4563-212-454587',
  '110-003-0001 - BNCR ₡ 5565-554-554',
  '110-003-0002 - BNCR $ 5565-554-7777',
];
interface Formulario { id:number; nombre:string; banco:string; concepto:string; tipoExportacion:string; formato:string; porDefecto:boolean; cuenta:string; cuentas:CuentaForm[]; }

const F_INIT: Formulario[] = [
  { id:1,nombre:'Banco BAC San José',banco:'BAC San José',concepto:'Pago Facturas',tipoExportacion:'CC',formato:'CSV',porDefecto:true,cuenta:'',cuentas:[{id:'f1',cuentaContable:'1102003 - BAC Colones',iban:'CR21015100935911667001',consecutivo:1}] },
  { id:2,nombre:'Banco BAC Sinpe',   banco:'BAC Sinpe',   concepto:'Transferencia', tipoExportacion:'CTA',formato:'CSV',porDefecto:false,cuenta:'',cuentas:[] },
  { id:3,nombre:'Banco BCT',         banco:'BCT',         concepto:'Pago',          tipoExportacion:'CC', formato:'TXT',porDefecto:false,cuenta:'',cuentas:[] },
  { id:4,nombre:'Banco Costa Rica',  banco:'BCR',         concepto:'Pago',          tipoExportacion:'CC', formato:'TXT',porDefecto:false,cuenta:'',cuentas:[] },
];

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

  useEffect(() => {
    if (addSignal) { addNew(); onAddHandled?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSignal]);

  return (
    <div style={{ display:'flex',gap:16,height:'100%',overflow:'hidden' }}>
      {/* Left list - más ancho para que el título no se corte (#23) */}
      <div style={{ width:260,minWidth:260,background:'#fff',border:'1px solid #ECECEC',borderRadius:10,overflow:'hidden',flexShrink:0,display:'flex',flexDirection:'column' }}>
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
      <div style={{ flex:1,background:'#fff',border:'1px solid #ECECEC',borderRadius:10,overflow:'auto',display:'flex',flexDirection:'column' }}>
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
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12,fontFamily:F,border:'1px solid #ECECEC',borderRadius:radius.md,overflow:'hidden' }}>
              <thead><tr style={{ background:'#fff', borderBottom:'1px solid #E8E8E8' }}>
                {['Cuenta contable','IBAN / N.° cuenta bancaria','Consecutivo','Plan',''].map(h=>(
                  <th key={h} style={{ padding:'8px 12px',textAlign:'left',fontSize:11,fontWeight:500,color:C.n700,borderBottom:'1px solid #ECECEC' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {editing.cuentas.length===0&&<tr><td colSpan={5} style={{ padding:'16px',textAlign:'center',color:C.n700,fontSize:12,fontFamily:F }}>Sin cuentas bancarias asociadas.</td></tr>}
                {editing.cuentas.map(c=>(
                  <tr key={c.id} style={{ borderTop:'1px solid #ECECEC' }}>
                    <td style={{ padding:'8px 12px' }}>
                      <select value={c.cuentaContable} onChange={e=>updateCuenta(c.id,'cuentaContable',e.target.value)}
                        style={{ width:'100%',height:28,padding:'0 8px',border:'1px solid #ECECEC',borderRadius:4,fontSize:11,fontFamily:F,outline:'none',background:'#fff',cursor:'pointer' }}>
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
                    <td style={{ padding:'8px 12px',textAlign:'right' }}>
                      <button onClick={()=>delCuenta(c.id)} style={{ background:'none',border:'none',cursor:'pointer',color:C.error }}><IcTrash className="w-3 h-3" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <div style={{ background:'#fff',borderRadius:10,padding:24,maxWidth:380,width:'90%',fontFamily:F,boxShadow:'0 8px 40px rgba(0,0,0,.18)' }}>
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
