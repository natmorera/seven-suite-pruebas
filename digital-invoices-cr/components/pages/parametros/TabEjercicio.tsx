'use client';
import { useState, useRef, useEffect, Fragment } from 'react';
import { Button, FormField, Input, Select, Modal, Toast, radius, shadow, ExportListModal } from '../../ui/primitives';
import { C, FONT } from '../../ui/primitives';

const F = FONT;

interface Periodo { orden:number; desde:string; hasta:string; titulo:string; dias:number; estado:'Apertura'|'Bloqueado'|'Activo'|'Pendiente'|'Cierre'; }

function makePeriodos(y:number): Periodo[] {
  const dias=[31,y%4===0?29:28,31,30,31,30,31,31,30,31,30,31];
  const meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return [
    { orden:0, desde:`1/1/${y}`, hasta:`1/1/${y}`, titulo:'Apertura', dias:0, estado:'Apertura' },
    ...meses.map((m,i):Periodo => ({ orden:i+1, desde:`1/${i+1}/${y}`, hasta:`${dias[i]}/${i+1}/${y}`, titulo:m, dias:dias[i], estado:i<4?'Bloqueado':i===4?'Activo':'Pendiente' as any })),
    { orden:13, desde:`31/12/${y}`, hasta:`31/12/${y}`, titulo:'Cierre', dias:0, estado:'Cierre' },
  ];
}

interface Ejercicio { id:number; anio:number; empresa:string; codigo:string; nPagCheque:number; inicio:string; cierre:string; estado:'activo'|'cerrado'; periodos:Periodo[]; }

const INIT: Ejercicio[] = [
  { id:1, anio:2026, empresa:'Hotel Fortuna', codigo:'001', nPagCheque:37, inicio:'Apertura 2025', cierre:'Cierre 2026', estado:'activo', periodos:makePeriodos(2026) },
  { id:2, anio:2025, empresa:'Hotel Fortuna', codigo:'001', nPagCheque:37, inicio:'Apertura 2024', cierre:'Cierre 2025', estado:'cerrado', periodos:makePeriodos(2025).map(p=>({...p,estado:(p.estado==='Activo'||p.estado==='Pendiente'?'Bloqueado':p.estado) as any})) },
];

const ESTADO_STYLE: Record<string,{color:string;bg:string;border:string}> = {
  Apertura:  { color:'#1565c0', bg:'#e3f2fd', border:'rgba(33,150,243,.3)' },
  Bloqueado:   { color:'#757575', bg:'#f5f5f5', border:'#ECECEC'              },
  Activo:    { color:'#2e7d32', bg:'rgba(76,175,80,.08)', border:'rgba(76,175,80,.3)' },
  Pendiente: { color:'#7a5c00', bg:'rgba(238,179,0,.08)', border:'rgba(238,179,0,.3)' },
  Cierre:    { color:'#1565c0', bg:'#e3f2fd', border:'rgba(33,150,243,.3)' },
};

function EstadoDropdown({ periodo, onCambiar }: { periodo:Periodo; onCambiar:(e:Periodo['estado'])=>void }) {
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e:MouseEvent) { if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown',h); return () => document.removeEventListener('mousedown',h);
  },[]);
  const s=ESTADO_STYLE[periodo.estado];
  const canChange=periodo.estado!=='Apertura'&&periodo.estado!=='Cierre';
  if(!canChange) return <span style={{ fontSize:11,padding:'3px 10px',borderRadius:radius.pill,color:s.color,background:s.bg,border:`1px solid ${s.border}`,fontFamily:F }}>{periodo.estado}</span>;
  const opciones: Periodo['estado'][] =
    periodo.estado==='Bloqueado'   ? ['Activo'] :
    periodo.estado==='Activo'    ? ['Bloqueado'] :
    periodo.estado==='Pendiente' ? ['Activo'] :
    [];
  const labelFor = (op: Periodo['estado']) => {
    if (op === 'Activo' && periodo.estado === 'Pendiente') return 'Abrir';
    if (op === 'Activo') return 'Reaperturar';
    if (op === 'Bloqueado') return 'Bloquear';
    return op;
  };
  return (
    <div ref={ref} style={{ position:'relative', display:'inline-block' }}>
      <button onClick={()=>setOpen(v=>!v)}
        style={{ display:'flex',alignItems:'center',gap:6,fontSize:11,padding:'3px 10px',border:`1px solid ${s.border}`,borderRadius:radius.pill,background:s.bg,color:s.color,cursor:'pointer',fontFamily:F }}>
        {periodo.estado}
        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor"><path d="M11.62 5.22L7.82 9.02C7.37 9.47 6.63 9.47 6.18 9.02L2.38 5.22" strokeLinecap="round"/></svg>
      </button>
      {open && (
        <div style={{ position:'absolute',top:'100%',left:0,background:'#fff',border:'1px solid #ECECEC',borderRadius:radius.md,zIndex:50,minWidth:130,boxShadow:'0 4px 12px rgba(0,0,0,.12)',marginTop:4,overflow:'hidden' }}>
          {opciones.map(op => (
            <button key={op} onClick={()=>{ onCambiar(op); setOpen(false); }}
              style={{ display:'block',width:'100%',textAlign:'left',padding:'9px 14px',fontSize:12,border:'none',background:'none',cursor:'pointer',fontFamily:F,color:'#0F0F0F' }}>
              {labelFor(op)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function parseDMY(s: string): Date | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(+m[3], +m[2]-1, +m[1]);
  return isNaN(d.getTime()) ? null : d;
}
function formatDMY(d: Date): string {
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}
function diffDiasInclusive(desde: Date, hasta: Date): number {
  return Math.max(0, Math.round((hasta.getTime()-desde.getTime())/86400000)+1);
}

function ModalNuevoEjercicio({ ejercicios, onClose, onCrear }: {
  ejercicios: Ejercicio[]; onClose:()=>void; onCrear:(e:Ejercicio)=>void;
}) {
  const sugerido = Math.max(...ejercicios.map(e=>e.anio)) + 1;
  const [anio, setAnio] = useState(sugerido);
  const [modo, setModo] = useState<'copiar'|'manual'>('copiar');
  const [deAnio, setDeAnio] = useState(ejercicios[0]?.anio ?? sugerido-1);
  const [fechaInicio, setFechaInicio] = useState(`01/01/${sugerido}`);
  const yaExiste = ejercicios.some(e=>e.anio===anio);
  const preview = makePeriodos(anio).map(p=>({ ...p, estado: p.orden===0?'Apertura' as const : p.orden===13?'Cierre' as const : 'Pendiente' as const }));

  // ── Constructor de períodos manual ──────────────────────────
  const [periodosManual, setPeriodosManual] = useState<Periodo[]>([]);
  const [pTitulo, setPTitulo] = useState('');
  const [pDesde, setPDesde] = useState(`1/1/${anio}`);
  const [pHasta, setPHasta] = useState('');
  const pDesdeD = parseDMY(pDesde);
  const pHastaD = parseDMY(pHasta);
  const pValido = !!pTitulo.trim() && !!pDesdeD && !!pHastaD && pHastaD.getTime() >= pDesdeD.getTime();

  function agregarPeriodo() {
    if (!pValido || !pDesdeD || !pHastaD) return;
    const nuevo: Periodo = { orden: periodosManual.length+1, desde:pDesde.trim(), hasta:pHasta.trim(), titulo:pTitulo.trim(), dias:diffDiasInclusive(pDesdeD,pHastaD), estado:'Pendiente' };
    setPeriodosManual(prev => [...prev, nuevo]);
    setPTitulo('');
    // Precarga la fecha de inicio del siguiente período justo después de donde terminó este.
    const siguiente = new Date(pHastaD); siguiente.setDate(siguiente.getDate()+1);
    setPDesde(formatDMY(siguiente));
    setPHasta('');
  }
  function quitarPeriodoManual(orden:number) {
    setPeriodosManual(prev => prev.filter(p=>p.orden!==orden).map((p,i)=>({ ...p, orden:i+1 })));
  }

  const ultimaHastaManual = periodosManual.length ? periodosManual[periodosManual.length-1].hasta : `1/1/${anio}`;
  const previewManual: Periodo[] = [
    { orden:0, desde:`1/1/${anio}`, hasta:`1/1/${anio}`, titulo:'Apertura', dias:0, estado:'Apertura' },
    ...periodosManual,
    { orden:periodosManual.length+1, desde:ultimaHastaManual, hasta:`31/12/${anio}`, titulo:'Cierre', dias:0, estado:'Cierre' },
  ];

  function aceptar() {
    if (yaExiste) return;
    if (modo==='manual' && periodosManual.length===0) return;
    const periodosFinal = modo==='manual' ? previewManual : preview;
    onCrear({ id:Date.now(), anio, empresa: ejercicios[0]?.empresa ?? 'Hotel Fortuna', codigo: ejercicios[0]?.codigo ?? '001',
      nPagCheque: ejercicios[0]?.nPagCheque ?? 1, inicio:`Apertura ${anio-1}`, cierre:`Cierre ${anio}`, estado:'activo', periodos: periodosFinal });
  }

  const bloqueado = yaExiste || (modo==='manual' && periodosManual.length===0);

  return (
    <Modal open title="Nuevo ejercicio fiscal" onClose={onClose} wide
      footer={
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:'1px solid #ECECEC', background:'#fff', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={aceptar} disabled={bloqueado} style={{ height:34, padding:'0 16px', background:bloqueado?'#ccc':C.brand, color:'#fff', border:'none', borderRadius:radius.md, cursor:bloqueado?'default':'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Aceptar</button>
        </div>
      }>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ display:'flex', gap:20, alignItems:'flex-end', flexWrap:'wrap' }}>
          <FormField label="Ejercicio" required error={yaExiste?'Ya existe un ejercicio para ese año.':undefined}>
            <Input value={String(anio)} onChange={v=>setAnio(parseInt(v,10)||sugerido)} />
          </FormField>
          <div style={{ display:'flex', gap:16, paddingBottom:6 }}>
            {(['copiar','manual'] as const).map(m=>(
              <label key={m} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12, fontFamily:F }}>
                <input type="radio" checked={modo===m} onChange={()=>setModo(m)} style={{ accentColor:C.brand }}/>
                {m==='copiar'?'Copiar de otro ejercicio':'Manual'}
              </label>
            ))}
          </div>
        </div>
        {modo==='copiar' && (
          <FormField label="De" hint="Ejercicio del que se toma la estructura de meses.">
            <Select value={String(deAnio)} onChange={v=>setDeAnio(parseInt(v,10))} options={ejercicios.map(e=>({ value:String(e.anio), label:String(e.anio) }))}/>
          </FormField>
        )}
        <FormField label="Fecha inicio">
          <Input value={fechaInicio} onChange={setFechaInicio} placeholder="DD/MM/AAAA" />
        </FormField>

        {modo==='manual' && (
          <div style={{ padding:'10px 12px', background:C.n200, borderRadius:radius.md, display:'flex', flexDirection:'column', gap:10 }}>
            <p style={{ fontSize:11, color:C.n700, margin:0, lineHeight:1.6 }}>
              Agregá los períodos uno por uno. Al agregar uno, la fecha "Desde" del siguiente ya viene precargada justo después de donde terminó el anterior.
            </p>
            <div style={{ display:'flex', gap:8, alignItems:'flex-end', flexWrap:'wrap' }}>
              <div style={{ flex:'1 1 140px' }}>
                <p style={{ fontSize:10, color:C.n700, margin:'0 0 4px' }}>Título</p>
                <input value={pTitulo} onChange={e=>setPTitulo(e.target.value)} placeholder="Ej. Enero"
                  style={{ width:'100%', height:32, padding:'0 9px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div style={{ flex:'0 0 130px' }}>
                <p style={{ fontSize:10, color:C.n700, margin:'0 0 4px' }}>Desde</p>
                <input value={pDesde} onChange={e=>setPDesde(e.target.value)} placeholder="D/M/AAAA"
                  style={{ width:'100%', height:32, padding:'0 9px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div style={{ flex:'0 0 130px' }}>
                <p style={{ fontSize:10, color:C.n700, margin:'0 0 4px' }}>Hasta</p>
                <input value={pHasta} onChange={e=>setPHasta(e.target.value)} placeholder="D/M/AAAA"
                  style={{ width:'100%', height:32, padding:'0 9px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <button onClick={agregarPeriodo} disabled={!pValido}
                style={{ height:32, padding:'0 14px', border:'none', borderRadius:radius.sm, background:pValido?C.brand:'#ccc', color:'#fff', cursor:pValido?'pointer':'default', fontSize:12, fontWeight:500, fontFamily:F }}>
                Agregar período
              </button>
            </div>
            {periodosManual.length===0 && (
              <p style={{ fontSize:11, color:C.error, margin:0 }}>Todavía no agregaste ningún período.</p>
            )}
          </div>
        )}

        <div>
          <p style={{ fontSize:11, fontWeight:600, color:C.n700, margin:'0 0 6px' }}>Períodos que se van a crear</p>
          <div style={{ maxHeight:260, overflowY:'auto', border:'1px solid #ECECEC', borderRadius:radius.md }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
              <thead style={{ position:'sticky', top:0, background:'#fff' }}>
                <tr style={{ borderBottom:'1px solid #ECECEC' }}>
                  {['Orden','Desde','Hasta','Título', ...(modo==='manual'?['']:[])].map(h=>(
                    <th key={h} style={{ padding:'6px 12px', textAlign:'left', fontSize:10, fontWeight:500, color:C.n700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(modo==='manual' ? previewManual : preview).map(p=>(
                  <tr key={p.orden} style={{ borderBottom:'1px solid #F5F5F5' }}>
                    <td style={{ padding:'6px 12px' }}>{p.orden}</td>
                    <td style={{ padding:'6px 12px' }}>{p.desde}</td>
                    <td style={{ padding:'6px 12px' }}>{p.hasta}</td>
                    <td style={{ padding:'6px 12px' }}>{p.titulo}</td>
                    {modo==='manual' && (
                      <td style={{ padding:'6px 12px', textAlign:'right' }}>
                        {p.estado==='Pendiente' && (
                          <button onClick={()=>quitarPeriodoManual(p.orden)} style={{ background:'none', border:'none', cursor:'pointer', color:C.error, fontSize:11, fontFamily:F }}>Quitar</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Editar datos generales del ejercicio ─────────────────────────────────────
function ModalEditarEjercicio({ ejercicio, onClose, onGuardar }: {
  ejercicio: Ejercicio; onClose:()=>void; onGuardar:(patch:Partial<Ejercicio>)=>void;
}) {
  const [empresa, setEmpresa] = useState(ejercicio.empresa);
  const [codigo, setCodigo] = useState(ejercicio.codigo);
  const [nPagCheque, setNPagCheque] = useState(String(ejercicio.nPagCheque));
  return (
    <Modal open title={`Editar ejercicio ${ejercicio.anio}`} onClose={onClose}
      footer={<div style={{ display:'flex',gap:8,justifyContent:'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={()=>onGuardar({ empresa, codigo, nPagCheque:parseInt(nPagCheque,10)||0 })}>Guardar</Button>
      </div>}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <FormField label="Empresa"><Input value={empresa} onChange={setEmpresa} /></FormField>
        <FormField label="Código"><Input value={codigo} onChange={setCodigo} /></FormField>
        <FormField label="N.° pág. cheque"><Input value={nPagCheque} onChange={setNPagCheque} /></FormField>
      </div>
    </Modal>
  );
}

// Ícono de "más acciones" (recalcular saldo / documentos pendientes) - acciones
// de mantenimiento poco frecuentes, agrupadas para no saturar la fila.
function MenuMas({ onActualizarSaldo, onRecalcularDocs }: { onActualizarSaldo:()=>void; onRecalcularDocs:()=>void }) {
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e:MouseEvent) { if(ref.current&&!ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown',h); return () => document.removeEventListener('mousedown',h);
  },[]);
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={()=>setOpen(v=>!v)} title="Más acciones"
        style={{ width:28, height:28, border:'1px solid #ECECEC', borderRadius:5, background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.n700 }}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><circle cx="3" cy="7" r="1.3"/><circle cx="7" cy="7" r="1.3"/><circle cx="11" cy="7" r="1.3"/></svg>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'100%', right:0, background:'#fff', border:'1px solid #ECECEC', borderRadius:radius.md, zIndex:50, minWidth:220, boxShadow:'0 4px 12px rgba(0,0,0,.12)', marginTop:4, overflow:'hidden' }}>
          <button onClick={()=>{ onActualizarSaldo(); setOpen(false); }}
            style={{ display:'block', width:'100%', textAlign:'left', padding:'10px 14px', fontSize:12, border:'none', background:'none', cursor:'pointer', fontFamily:F, color:'#0F0F0F' }}>
            Actualizar saldo de cuentas
          </button>
          <button onClick={()=>{ onRecalcularDocs(); setOpen(false); }}
            style={{ display:'block', width:'100%', textAlign:'left', padding:'10px 14px', fontSize:12, border:'none', background:'none', cursor:'pointer', fontFamily:F, color:'#0F0F0F' }}>
            Recálculo de documentos pendientes
          </button>
        </div>
      )}
    </div>
  );
}

export function TabEjercicioFiscal({ modalNuevo, onModalNuevoChange, showExportar, onShowExportarChange }: {
  modalNuevo: boolean; onModalNuevoChange: (v:boolean)=>void;
  showExportar: boolean; onShowExportarChange: (v:boolean)=>void;
}) {
  const [ejercicios,setEjercicios]=useState<Ejercicio[]>(INIT);
  const [expandedId,setExpandedId]=useState<number|null>(INIT[0].id);
  const [editId,setEditId]=useState<number|null>(null);
  const [modalCierreId,setModalCierreId]=useState<number|null>(null);
  const [modalRevertirId,setModalRevertirId]=useState<number|null>(null);
  const [cuentaRes,setCuentaRes]=useState('015-004943-0');
  const [motivo,setMotivo]=useState('');
  const [toast,setToast]=useState<{message:string;type:'success'|'error'}|null>(null);
  const [confirm,setConfirm]=useState<{ejercicioId:number; estado:Periodo['estado']; orden:number}|null>(null);
  const [cierrePeriodo,setCierrePeriodo]=useState<{ejercicioId:number; orden:number}|null>(null);
  const [cierreStep,setCierreStep]=useState<'validando'|'listo'>(null as any);

  function showT(m:string,t:'success'|'error'='success') { setToast({message:m,type:t}); setTimeout(()=>setToast(null),3500); }
  function ejercicioById(id:number) { return ejercicios.find(e=>e.id===id)!; }

  function cambiarEstadoPeriodo(ejercicioId:number, orden:number, estado:Periodo['estado']) {
    setConfirm({ ejercicioId, estado, orden });
  }
  function confirmCambio() {
    if(!confirm) return;
    setEjercicios(list=>list.map(e=>e.id!==confirm.ejercicioId?e:{ ...e, periodos:e.periodos.map(p=>p.orden===confirm.orden?{...p,estado:confirm.estado}:p) }));
    setConfirm(null);
    showT(`Período ${confirm.estado==='Bloqueado'?'cerrado':'reaperturado'} correctamente.`);
  }

  function ejecutarCierre(id:number) {
    setEjercicios(list=>list.map(e=>e.id!==id?e:{ ...e, estado:'cerrado', periodos:e.periodos.map(p=>({...p,estado:(p.estado==='Activo'||p.estado==='Pendiente'?'Bloqueado':p.estado) as any})) }));
    setModalCierreId(null);
    showT(`Cierre del ejercicio ${ejercicioById(id).anio} ejecutado correctamente.`);
  }
  function revertirCierre(id:number) {
    if(!motivo.trim()){ showT('El motivo de reversión es requerido.','error'); return; }
    const anio = ejercicioById(id).anio;
    setEjercicios(list=>list.map(e=>e.id!==id?e:{ ...e, estado:'activo' }));
    setModalRevertirId(null); setMotivo('');
    showT(`Cierre del ejercicio ${anio} revertido correctamente.`);
  }

  const exportEjercicio = expandedId ? ejercicioById(expandedId) : ejercicios[0];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Lista de ejercicios - una sola pantalla, sin pestañas. Cada fila trae
          sus propias acciones, mostradas u ocultas según el estado del
          ejercicio (ej. "Revertir cierre" no aparece si nunca se cerró). */}
      <div style={{ flex:1, overflowY:'auto', background:'#fff' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F }}>
          <thead style={{ position:'sticky', top:0, background:'#fff', zIndex:1 }}>
            <tr>
              {['','Ejercicio','Empresa','Código','Estado','Períodos cerrados','Acciones'].map((h,i)=>(
                <th key={h+i} style={{ padding:'10px 24px', textAlign:'left', fontSize:11, fontWeight:500, color:C.n700, borderBottom:'1px solid #ECECEC', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ejercicios.map(ej=>{
              const isOpen = expandedId===ej.id;
              const cerrados = ej.periodos.filter(p=>p.estado==='Bloqueado').length;
              return (
                <Fragment key={ej.id}>
                <tr style={{ borderBottom:'1px solid #ECECEC', cursor:'pointer', background: ej.estado==='activo' ? C.brandBg : '#fff' }}
                  onClick={()=>setExpandedId(isOpen?null:ej.id)}>
                  <td style={{ padding:'10px 12px 10px 24px', width:28 }}>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.6" strokeLinecap="round"
                      style={{ transform:isOpen?'rotate(90deg)':'none', transition:'transform .12s' }}>
                      <path d="M5 3l5 4-5 4"/>
                    </svg>
                  </td>
                  <td style={{ padding:'10px 24px', fontWeight:600, color:C.n900 }}>{ej.anio}</td>
                  <td style={{ padding:'10px 24px' }}>{ej.empresa}</td>
                  <td style={{ padding:'10px 24px' }}>{ej.codigo}</td>
                  <td style={{ padding:'10px 24px' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11, fontWeight:500, color: ej.estado==='activo'?C.success:C.n700 }}>
                      <span style={{ width:7, height:7, borderRadius:'50%', background: ej.estado==='activo'?C.success:C.n700 }}/>
                      {ej.estado==='activo'?'Activa':'Cerrada'}
                    </span>
                  </td>
                  <td style={{ padding:'10px 24px', color:C.n700 }}>{cerrados} de {ej.periodos.length}</td>
                  <td style={{ padding:'8px 24px 8px 8px' }} onClick={e=>e.stopPropagation()}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                      <button title="Editar" onClick={()=>setEditId(ej.id)}
                        style={{ width:28, height:28, border:'1px solid #ECECEC', borderRadius:5, background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.n700 }}>
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
                {isOpen && (
                  <tr>
                    <td colSpan={7} style={{ padding:0, background:'#FAFAFA' }}>
                      <div style={{ padding:'4px 24px 16px 52px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap', padding:'10px 0 12px' }}>
                          <div>
                            <p style={{ fontSize:10, color:C.n700, margin:0 }}>N.° pág. cheque</p>
                            <p style={{ fontSize:12, fontWeight:500, color:C.n900, margin:0, fontFamily:F }}>{ej.nPagCheque}</p>
                          </div>
                          <div>
                            <p style={{ fontSize:10, color:C.n700, margin:0 }}>Inicio</p>
                            <p style={{ fontSize:12, fontWeight:500, color:C.n900, margin:0, fontFamily:F }}>{ej.inicio}</p>
                          </div>
                          <div>
                            <p style={{ fontSize:10, color:C.n700, margin:0 }}>Cierre</p>
                            <p style={{ fontSize:12, fontWeight:500, color:C.n900, margin:0, fontFamily:F }}>{ej.cierre}</p>
                          </div>
                        </div>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F, background:'#fff', border:'1px solid #ECECEC', borderRadius:radius.md, overflow:'hidden' }}>
                          <thead>
                            <tr>
                              {(['Orden','Desde','Hasta','Título','Días','Estado'] as const).map(h=>(
                                <th key={h} style={{ padding:'8px 14px', textAlign:h==='Orden'||h==='Días'?'right':'left', fontSize:11, fontWeight:500, color:C.n700, borderBottom:'1px solid #ECECEC', whiteSpace:'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {ej.periodos.map(p=>{
                              const isAct=p.estado==='Activo';
                              return (
                                <tr key={p.orden} style={{ borderBottom:'1px solid #F0F0F0', background: isAct?C.brandBg:'transparent' }}>
                                  <td style={{ padding:'8px 14px', fontWeight: isAct?600:400, textAlign:'right' }}>{p.orden}</td>
                                  <td style={{ padding:'8px 14px', fontWeight: isAct?600:400 }}>{p.desde}</td>
                                  <td style={{ padding:'8px 14px', fontWeight: isAct?600:400 }}>{p.hasta}</td>
                                  <td style={{ padding:'8px 14px', fontWeight: isAct?600:400 }}>{p.titulo}</td>
                                  <td style={{ padding:'8px 14px', textAlign:'right' }}>
                                    {p.dias>0&&<span style={{ color:C.success, fontWeight:500 }}>{p.dias}</span>}
                                  </td>
                                  <td style={{ padding:'8px 14px' }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                      <EstadoDropdown periodo={p} onCambiar={estado=>cambiarEstadoPeriodo(ej.id,p.orden,estado)} />
                                      {isAct && (
                                        <button onClick={()=>setCierrePeriodo({ejercicioId:ej.id, orden:p.orden})}
                                          style={{ height:26, padding:'0 10px', fontSize:11, fontFamily:F, border:'none',
                                            borderRadius:5, background:'#A77600', color:'#fff', cursor:'pointer', fontWeight:500, whiteSpace:'nowrap' }}>
                                          Cierre
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
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
            <div style={{ background:'#fff',borderRadius:radius.lg,width:520,fontFamily:F,boxShadow:shadow.modal }}>
              <div style={{ padding:'16px 20px',borderBottom:'1px solid #EBEBEB',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <div>
                  <span style={{ fontSize:14,fontWeight:600,color:'#0F0F0F' }}>Cierre de periodo / {per.titulo} {ej.anio}</span>
                  <span style={{ fontSize:11,color:'#9E9E9E',marginLeft:8 }}>{isListo?'Todas las validaciones completadas. Listo para cerrar.':'Complete todas las validaciones antes de cerrar el período.'}</span>
                </div>
                <button onClick={()=>{setCierrePeriodo(null);setCierreStep(null as any);}} style={{ background:'none',border:'none',cursor:'pointer',color:'#9E9E9E',fontSize:20 }}>×</button>
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
                  <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:10,padding:'10px 14px',border:'1px solid #EBEBEB',borderRadius:radius.md }}>
                    <div style={{ width:18,height:18,borderRadius:'50%',flexShrink:0,marginTop:1,display:'flex',alignItems:'center',justifyContent:'center',
                      background:item.ok?'#4CAF50':item.warn?'#EEB300':'#ECECEC' }}>
                      {item.ok && <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                      {!item.ok && !item.warn && <span style={{ fontSize:10,color:'#999',fontWeight:600 }}>{i+1}</span>}
                      {item.warn && <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"><path d="M7 4v4M7 10h.01"/></svg>}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:12,fontWeight:500,color:'#0F0F0F',margin:'0 0 2px',fontFamily:F }}>{item.label}</p>
                      <p style={{ fontSize:11,color:item.warn&&!isListo?'#A77600':'#757575',margin:0,fontFamily:F }}>{item.sub}</p>
                      {item.action && (
                        <div style={{ display:'flex',alignItems:'center',gap:8,marginTop:6 }}>
                          <span style={{ fontSize:11,color:'#555' }}>Tipo de cambio:</span>
                          <input defaultValue="450.85" style={{ width:80,height:26,padding:'0 8px',border:'1px solid #E0E0E0',borderRadius:5,fontSize:12,fontFamily:F,outline:'none' }}/>
                          <button onClick={()=>setCierreStep('listo')}
                            style={{ height:26,padding:'0 10px',border:'none',borderRadius:5,background:'#A77600',color:'#fff',fontSize:11,cursor:'pointer',fontFamily:F,fontWeight:500 }}>
                            Calcular y aplicar
                          </button>
                        </div>
                      )}
                      {item.warn && !isListo && (
                        <label style={{ display:'flex',alignItems:'center',gap:6,marginTop:6,cursor:'pointer',fontSize:11,fontFamily:F,color:'#555' }}>
                          <input type="checkbox" onChange={e=>e.target.checked&&setCierreStep('listo')} style={{ accentColor:'#A77600' }}/>
                          Continuar sin conciliarlas
                        </label>
                      )}
                    </div>
                    <span style={{ fontSize:10,fontWeight:500,padding:'2px 8px',borderRadius:radius.pill,whiteSpace:'nowrap',flexShrink:0,
                      color:item.ok?'#2E7D32':item.warn?'#E07B00':'#757575',
                      background:item.ok?'#E8F5E9':item.warn?'#FFF3E0':'#F5F5F5',
                      border:`1px solid ${item.ok?'#A5D6A7':item.warn?'#FFCC80':'#E0E0E0'}` }}>
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
              <div style={{ padding:'12px 20px',borderTop:'1px solid #EBEBEB',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <button onClick={()=>{setCierrePeriodo(null);setCierreStep(null as any);}}
                  style={{ height:32,padding:'0 14px',border:'1px solid #E0E0E0',borderRadius:7,background:'#fff',cursor:'pointer',fontSize:12,fontFamily:F,color:'#555' }}>
                  {isListo?'Cancelar':'Cerrar sin guardar'}
                </button>
                {isListo && (
                  <button onClick={()=>{
                    cambiarEstadoPeriodo(cierrePeriodo.ejercicioId,cierrePeriodo.orden,'Bloqueado');
                    setCierrePeriodo(null);setCierreStep(null as any);
                    showT(`Período ${per.titulo} cerrado correctamente.`);
                  }} style={{ height:32,padding:'0 18px',border:'none',borderRadius:7,background:'#A77600',color:'#fff',cursor:'pointer',fontSize:12,fontFamily:F,fontWeight:500 }}>
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
          <div style={{ background:'#fff',borderRadius:10,padding:24,maxWidth:400,width:'90%',fontFamily:F,boxShadow:'0 8px 40px rgba(0,0,0,.18)' }}>
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

      {/* Modal Cierre */}
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

      {/* Modal Revertir */}
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

      {/* Modal Editar */}
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
    </div>
  );
}
