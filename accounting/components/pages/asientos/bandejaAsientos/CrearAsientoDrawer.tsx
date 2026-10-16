'use client';
import React, { useState } from 'react';
import { C, radius, shadow, TABLA } from '../../../ui/tokens';
import { Pagination } from '../../../ui/tabla';
import { Switch } from '../../../ui/formulario';
import { MontoInput } from './PaginationFooter';
import { type Asiento, BRAND, type CrearAsientoInitial, F, type LineaAsiento, MONEDAS, MON_SYM, type Moneda, type Plantilla, type ToastType, fmt2, genConsecutivo } from './datos';
import { ModalAdjuntos } from './modales';
import { CuentaLineaSelect, IcCopy } from './piezas';

export function CrearAsientoDrawer({ asientos, onClose, onSave, plantillas, onSavePlantilla, onToast, initial }: {
  asientos: Asiento[]; onClose:()=>void; onSave:(a:Asiento)=>void;
  plantillas: Plantilla[]; onSavePlantilla:(p:Plantilla)=>void; onToast?:(msg:string, type?:ToastType)=>void;
  initial?: CrearAsientoInitial | null;
}) {
  const hoy = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState({
    tipo: 'General', titulo: initial?.titulo ?? '', fecha: hoy,
    moneda: (initial?.moneda ?? 'CRC') as Moneda, origen: initial?.origen ?? 'Accounting', documento: initial?.documento ?? '',
  });
  const [tasa, setTasa] = useState<number>(1);
  const [lineas, setLineas] = useState<LineaAsiento[]>(initial?.lineas ?? [
    { id:1, cuenta:'100-001-0001', descripcion:'Ingreso producción', cCostos:'ADM001', debe:1250, haber:0 },
    { id:2, cuenta:'', descripcion:'', cCostos:'ADM', debe:0, haber:1250 },
  ]);
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [showArchivos,  setShowArchivos]  = useState(false);
  const [showObs,       setShowObs]       = useState(false);
  const [showProg,      setShowProg]      = useState(false);
  const [programar,     setProgramar]     = useState(false);
  const [archivos,      setArchivos]      = useState<string[]>([]);
  const [observacion,   setObservacion]   = useState(initial?.observacion ?? '');
  const [showPlantillas,setShowPlantillas]= useState(false);
  const [paginaLineas, setPaginaLineas] = useState(1);
  const LINEAS_POR_PAG = 10;
  const [plantillaSelId, setPlantillaSelId] = useState('');
  const [consecRefreshing, setConsecRefreshing] = useState(false);

  const TIPOS_ASIENTO = ['General','Apertura','Cierre','Ajuste','Reclasificación'];

  const totalDebe  = lineas.reduce((s,l)=>s+l.debe,0);
  const totalHaber = lineas.reduce((s,l)=>s+l.haber,0);
  const balanceado = Math.abs(totalDebe-totalHaber)<0.01;
  const diffBalance = Math.abs(totalDebe-totalHaber);
  const totalPags  = Math.max(1, Math.ceil(lineas.length / LINEAS_POR_PAG));
  const lineasVisible = lineas.length > LINEAS_POR_PAG
    ? lineas.slice((paginaLineas-1)*LINEAS_POR_PAG, paginaLineas*LINEAS_POR_PAG)
    : lineas;
  const camposCompletos = !!form.titulo.trim() && !!form.fecha;

  function setF(k: keyof typeof form, v: string) { setForm(p=>({...p,[k]:v})); setErrors(p=>({...p,[k]:''})); }
  function setL(id: number, k: keyof LineaAsiento, v: string|number) { setLineas(p=>p.map(l=>l.id===id?{...l,[k]:v}:l)); }
  function addLinea() { setLineas(p=>[...p,{ id:Date.now(), cuenta:'', descripcion:'', cCostos:'ADM', debe:0, haber:0 }]); }
  function removeLinea(id: number) { setLineas(p=>p.filter(l=>l.id!==id)); }

  function refreshConsecutivo() {
    setConsecRefreshing(true);
    onToast?.('Número de asiento actualizado.', 'info');
    setTimeout(()=>setConsecRefreshing(false), 400);
  }

  function guardarComoPlantilla() {
    const lineasValidas = lineas.filter(l => l.cuenta.trim() || l.debe > 0 || l.haber > 0);
    if (lineasValidas.length === 0) {
      onToast?.('No hay nada que guardar: agregá al menos una línea con cuenta o monto antes de guardar como plantilla.', 'warning');
      return;
    }
    const nueva: Plantilla = {
      id: `pl-${Date.now()}`,
      nombre: form.titulo.trim() || `Plantilla ${new Date().toLocaleDateString('es-CR')}`,
      cuentas: lineasValidas.length,
      moneda: form.moneda,
      ultima: new Date().toLocaleDateString('es-CR'),
      lineas: lineasValidas,
    };
    onSavePlantilla(nueva);
    onToast?.('Plantilla guardada.', 'success');
  }

  function cargarPlantilla() {
    const p = plantillas.find(x=>x.id===plantillaSelId);
    if (p) {
      setLineas(p.lineas);
      setForm(prev=>({ ...prev, titulo: prev.titulo || p.nombre, moneda: p.moneda }));
      onToast?.(`Plantilla "${p.nombre}" cargada.`, 'success');
    }
    setShowPlantillas(false);
  }

  function handleSave(contabilizar=false) {
    if (!form.titulo.trim()) { setErrors({titulo:'Requerido'}); return; }
    if (!form.fecha) { setErrors(p=>({...p, fecha:'Requerido'})); return; }
    if (contabilizar && !balanceado) return;
    const consecutivo = genConsecutivo(form.fecha, asientos);
    const lineasValidas = lineas.filter(l => l.cuenta.trim() || l.debe > 0 || l.haber > 0);
    const nuevo: Asiento = {
      id: Date.now(),
      tipo: 'M',
      origen: form.origen,
      fecha: form.fecha,
      consecutivo,
      titulo: form.titulo.trim(),
      moneda: form.moneda,
      importe: totalDebe,
      usuario: 'jperez',
      documento: form.documento,
      observacion,
      contabilizado: contabilizar,
      archivos,
      historial: [{ color:C.success, texto: contabilizar ? 'Asiento creado y contabilizado' : 'Asiento creado manualmente', fecha: new Date().toLocaleString('es-CR'), usuario:'jperez' }],
      lineas: lineasValidas.length > 0 ? lineasValidas : lineas,
    };
    onSave(nuevo);
  }

  const NUM_COL: React.CSSProperties = { padding:'5px 3px', whiteSpace:'nowrap' };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:998 }}/>
      <div style={{ position:'fixed', inset:0, zIndex:999, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'32px 20px', overflow:'auto' }}>
        <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:'100%', maxWidth:1360, minHeight:'88vh', maxHeight:'95vh', boxShadow:shadow.modal, fontFamily:F, display:'flex', flexDirection:'column' }}>

          {/* Title bar + plantilla selector */}
          <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
            <span style={{ fontSize:15, fontWeight:600, flexShrink:0 }}>Nuevo asiento manual</span>
            {/* Plantilla dropdown */}
            <div style={{ position:'relative', flex:1 }}>
              <button onClick={()=>setShowPlantillas(v=>!v)} style={{ width:'100%', height:36, padding:'0 12px', border:`1px solid ${showPlantillas?BRAND:C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F, display:'flex', alignItems:'center', justifyContent:'space-between', color:plantillaSelId?'#0F0F0F':C.n700 }}>
                <span>{plantillas.find(p=>p.id===plantillaSelId)?.nombre || 'Seleccionar plantilla para cargar líneas…'}</span>
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
              </button>
              {showPlantillas && (
                <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:400, background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:10, boxShadow:'0 8px 32px rgba(0,0,0,.16)', fontFamily:F, overflow:'hidden' }}
                  onClick={e=>e.stopPropagation()}>
                  <table className="tabla" style={TABLA.table}>
                    <thead><tr style={TABLA.headRow}>
                      <th style={{ ...TABLA.th, width:32 }}/>
                      <th style={TABLA.th}>Nombre</th>
                      <th style={{ ...TABLA.th, textAlign:'right' }}>Líneas</th>
                      <th style={TABLA.th}>Moneda</th>
                    </tr></thead>
                    <tbody>
                      {plantillas.map(p=>(
                        <tr key={p.id} onClick={()=>setPlantillaSelId(p.id)}
                          style={{ borderTop:'1px solid #ECECEC', cursor:'pointer', background:plantillaSelId===p.id?C.brandBg:'#FFFFFF' }}
                          onMouseEnter={e=>{if(plantillaSelId!==p.id)e.currentTarget.style.background=C.n200;}}
                          onMouseLeave={e=>{if(plantillaSelId!==p.id)e.currentTarget.style.background='#FFFFFF';}}>
                          <td style={{ padding:'8px 12px' }}>
                            <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${plantillaSelId===p.id?BRAND:C.n500}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                              {plantillaSelId===p.id && <div style={{ width:8, height:8, borderRadius:'50%', background:BRAND }}/>}
                            </div>
                          </td>
                          <td style={{ padding:'8px 12px' }}>{p.nombre}</td>
                          <td style={{ padding:'8px 12px', textAlign:'right', color:BRAND }}>{p.lineas.length}</td>
                          <td style={{ padding:'8px 12px' }}>{p.moneda}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding:'8px 14px', background:C.brandBg, borderTop:`1px solid ${C.n500}`, fontSize:11, color:BRAND }}>
                    Cargar una plantilla reemplazará las líneas actuales del asiento.
                  </div>
                  <div style={{ padding:'10px 14px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
                    <button onClick={()=>setShowPlantillas(false)} style={{ height:32, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:7, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
                    <button onClick={cargarPlantilla} disabled={!plantillaSelId}
                      style={{ height:32, padding:'0 14px', border:'none', borderRadius:7, background:plantillaSelId?BRAND:'#ECECEC', color:'#FFFFFF', cursor:plantillaSelId?'pointer':'default', fontSize:12, fontWeight:500, fontFamily:F }}>Cargar plantilla</button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={()=>setShowPlantillas(true)} style={{ height:36, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F, flexShrink:0 }}>Cargar</button>
            <button onClick={()=>{ setForm({tipo:'General',titulo:'',fecha:hoy,moneda:'CRC' as Moneda,origen:'Accounting',documento:''}); setTasa(1); setLineas([{id:1,cuenta:'',descripcion:'',cCostos:'ADM',debe:0,haber:0},{id:2,cuenta:'',descripcion:'',cCostos:'ADM',debe:0,haber:0}]); setErrors({}); setPlantillaSelId(''); }}
      style={{ height:36, padding:'0 12px', border:'none', borderRadius:radius.md, background:'none', cursor:'pointer', fontSize:12, fontFamily:F, color:C.error, flexShrink:0 }}>Limpiar</button>
            <button onClick={onClose} aria-label="Cerrar" title="Cerrar" style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, fontSize:20, padding:'0 4px', flexShrink:0 }}>×</button>
          </div>

          {initial?.duplicadoDe && (
            <div style={{ padding:'8px 24px', background:C.brandBg, borderBottom:`1px solid ${C.n500}`, fontSize:12, color:BRAND, display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              <IcCopy/> Duplicando el asiento {initial.duplicadoDe}. Revisá los datos y confirmá - se asignará automáticamente el número <b>{genConsecutivo(form.fecha, asientos)}</b>.
            </div>
          )}

          {/* Cabecera del asiento */}
          <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}`, flexShrink:0 }}>
            <div style={{ display:'grid', gridTemplateColumns:'130px 1fr 140px 170px 155px 155px', gap:'0 10px', alignItems:'end' }}>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Tipo de asiento <span style={{ color:C.error }}>*</span></label>
                <div style={{ position:'relative' }}>
                  <select value={form.tipo} onChange={e=>setF('tipo',e.target.value)} style={{ width:'100%', height:36, padding:'0 10px 0 10px', paddingRight:30, border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', appearance:'none' }}>
                    {TIPOS_ASIENTO.map(t=><option key={t}>{t}</option>)}
                  </select>
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round" style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Título del asiento <span style={{ color:C.error }}>*</span></label>
                <input value={form.titulo} onChange={e=>setF('titulo',e.target.value)} placeholder="Ingresos de producción del día"
                  style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${errors.titulo?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Fecha <span style={{ color:C.error }}>*</span></label>
                <input type="date" value={form.fecha} onChange={e=>setF('fecha',e.target.value)} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Moneda</label>
                <div style={{ display:'flex', gap:4 }}>
                  {MONEDAS.map(m=>(
                    <button key={m} onClick={()=>setF('moneda',m)} style={{ flex:1, height:36, borderRadius:radius.md, border:'none', cursor:'pointer', fontSize:12, fontFamily:F, fontWeight:500, background:form.moneda===m?BRAND:C.n200, color:form.moneda===m?'#FFFFFF':'#0F0F0F', whiteSpace:'nowrap', padding:'0 8px' }}>
                      {MON_SYM[m]} {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Tasa (5 decimales)</label>
                <MontoInput value={tasa} onChange={setTasa} decimals={5}
                  style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>N.° Asiento</label>
                <div style={{ height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, display:'flex', alignItems:'center', justifyContent:'space-between', background:C.brandBg }}>
                  <span style={{ color:BRAND, fontWeight:600 }}>{genConsecutivo(form.fecha, asientos)}</span>
                  <button aria-label="Actualizar número de asiento" title="Actualizar número de asiento"
                    style={{ background:'none', border:'none', cursor:'pointer', padding:'2px 4px', color:BRAND, display:'flex', alignItems:'center' }}
                    onClick={refreshConsecutivo}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ animation: consecRefreshing ? 'bandeja-spin .4s linear' : undefined }}>
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                      <path d="M21 3v5h-5"/>
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                      <path d="M8 16H3v5"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            {/* Adjuntos y observaciones */}
            <div style={{ display:'flex', gap:10, marginTop:12 }}>
              <button onClick={()=>setShowArchivos(true)} style={{ height:32, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F, display:'flex', alignItems:'center', gap:7, color:'#0F0F0F' }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M11.5 6.5L6 12a3.5 3.5 0 01-5-5l5.5-5.5a2 2 0 012.8 2.8L4 9.5a.5.5 0 01-.7-.7L8.5 3.5"/></svg>
                Agregar archivos
                {archivos.length>0&&<span style={{ fontSize:11, color:BRAND, fontWeight:600 }}>{archivos.length} agregados</span>}
              </button>
              <button onClick={()=>setShowObs(true)} style={{ height:32, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F, display:'flex', alignItems:'center', gap:7, color:'#0F0F0F' }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M2 3h10M2 7h7M2 11h4"/></svg>
                Agregar observación
                {observacion&&<span style={{ fontSize:11, color:C.success, fontWeight:600 }}>Agregada</span>}
              </button>
            </div>
          </div>

          {/* Líneas del asiento */}
          <div style={{ flex:1, overflowY:'auto', padding:'14px 24px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <span style={{ fontSize:11, fontWeight:600, letterSpacing:'.06em', color:C.n700, textTransform:'uppercase' }}>LÍNEAS DEL ASIENTO</span>
              <button onClick={addLinea} style={{ height:30, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#FFFFFF', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', gap:5, fontFamily:F }}>
                + Agregar línea
              </button>
            </div>
            <table className="tabla" style={TABLA.table}>
              <thead>
                <tr style={TABLA.headRow}>
                  {['Cuenta','C.Costo','Operación','Documento','Descripción','','Debe','','Haber',''].map((h,i)=>{
                    // Debe/Haber (i=6,8) comparten el padding de la celda del input para que el rótulo
                    // quede alineado con el número de abajo; el ¢ (i=5,7,9) comparte el de su columna.
                    const pad = (i===6||i===8) ? '7px 2px' : (i===5||i===7||i===9) ? '7px 1px' : '7px 4px';
                    return (
                      <th key={i} style={{ ...TABLA.th, textAlign:i>=5?'right':'left' }}>
                        {(i===6||i===8) ? <div style={{ width:130, textAlign:'right', paddingRight:7, boxSizing:'border-box' }}>{h}</div> : h}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {lineasVisible.map(l=>(
                  <tr key={l.id} style={{ borderBottom:'1px solid #ECECEC' }}>
                    <td style={NUM_COL}>
                      <CuentaLineaSelect value={l.cuenta} onChange={v=>setL(l.id,'cuenta',v)}/>
                    </td>
                    <td style={NUM_COL}>
                      <input value={l.cCostos} onChange={e=>setL(l.id,'cCostos',e.target.value)} placeholder="ADM"
                        style={{ width:70, height:30, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                    </td>
                    <td style={NUM_COL}>
                      <select style={{ width:90, height:30, padding:'0 6px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', appearance:'none' }}>
                        <option>-</option><option>Impuestos</option><option>Ventas</option><option>Compras</option>
                      </select>
                    </td>
                    <td style={NUM_COL}>
                      <input placeholder="N.° doc" style={{ width:90, height:30, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                    </td>
                    <td style={{ ...NUM_COL, flex:1 }}>
                      <input value={l.descripcion} onChange={e=>setL(l.id,'descripcion',e.target.value)} placeholder="Descripción…"
                        style={{ width:'100%', minWidth:120, height:30, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
                    </td>
                    <td style={{ padding:'5px 1px', textAlign:'right', verticalAlign:'middle' }}>{MON_SYM[form.moneda]}</td>
                    <td style={{ padding:'5px 2px', verticalAlign:'middle' }}>
                      <MontoInput value={l.debe} onChange={v=>setL(l.id,'debe',v)}
                        style={{ width:130, height:30, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', textAlign:'right', boxSizing:'border-box' }}/>
                    </td>
                    <td style={{ padding:'5px 1px', textAlign:'right', verticalAlign:'middle' }}>{MON_SYM[form.moneda]}</td>
                    <td style={{ padding:'5px 2px', verticalAlign:'middle' }}>
                      <MontoInput value={l.haber} onChange={v=>setL(l.id,'haber',v)}
                        style={{ width:130, height:30, padding:'0 7px', border:`1px solid ${C.n500}`, borderRadius:5, fontSize:11, fontFamily:F, outline:'none', textAlign:'right', boxSizing:'border-box' }}/>
                    </td>
                    <td style={{ padding:'8px 12px' }}>
                      {lineas.length>2 && <button onClick={()=>removeLinea(l.id)} aria-label="Quitar línea" title="Quitar línea" style={{ background:'none',border:'none',cursor:'pointer',color:C.error, padding:'0 4px', display:'flex', alignItems:'center' }}>
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,4 12,4"/><path d="M5.33 4V2.67h3.34V4"/><path d="M11.33 4l-.67 8H3.34L2.67 4"/></svg>
                    </button>}
                    </td>
                  </tr>
                ))}
                <tr style={{ background:'#F9F9F9', borderTop:`2px solid ${C.n500}` }}>
                  <td colSpan={5} style={{ padding:'8px 12px', fontWeight:700, fontSize:12 }}>Totales</td>
                  {/* Mismo padding de celda (1px) y mismo ancho/padding interno (90 / 7px) que el símbolo
                      y el input de las líneas de arriba, para que quede alineado con esos valores. */}
                  <td style={{ padding:'8px 1px', textAlign:'right', color:C.n700, fontSize:11, verticalAlign:'middle' }}>{MON_SYM[form.moneda]}</td>
                  <td style={{ padding:'8px 2px', verticalAlign:'middle' }}>
                    <div style={{ width:130, paddingRight:7, boxSizing:'border-box', textAlign:'right', fontWeight:700, fontSize:13, color:'#0F0F0F', whiteSpace:'nowrap' }}>
                      {fmt2(totalDebe)}
                    </div>
                  </td>
                  <td style={{ padding:'8px 1px', textAlign:'right', color:C.n700, fontSize:11, verticalAlign:'middle' }}>{MON_SYM[form.moneda]}</td>
                  <td style={{ padding:'8px 2px', verticalAlign:'middle' }}>
                    <div style={{ width:130, paddingRight:7, boxSizing:'border-box', textAlign:'right', fontWeight:700, fontSize:13, color:'#0F0F0F', whiteSpace:'nowrap' }}>
                      {fmt2(totalHaber)}
                    </div>
                  </td>
                  <td/>
                </tr>
              </tbody>
            </table>
            {/* Paginación funcional si hay más de 10 líneas */}
            {lineas.length > LINEAS_POR_PAG && (
              <div style={{ marginTop:8 }}>
                <Pagination page={paginaLineas} pageSize={LINEAS_POR_PAG} total={lineas.length} onPageChange={setPaginaLineas}/>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ borderTop:`1px solid ${C.n500}`, padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, flexWrap:'wrap', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {/* Toggle programar asiento */}
              <Switch checked={programar} onChange={()=>setProgramar(v=>!v)} label="Programar asiento"/>
              {programar && (
                <button onClick={()=>setShowProg(true)} style={{ fontSize:12, color:BRAND, background:'none', border:'none', cursor:'pointer', fontFamily:F, textDecoration:'underline' }}>
                  Ver programación
                </button>
              )}
              {!camposCompletos && (
                <span style={{ fontSize:11, color:'#A07000' }}>⚠ Completá título y fecha para continuar</span>
              )}
              {camposCompletos && !balanceado && (
                <span style={{ fontSize:11, color:C.error }}>⚠ Desbalanceado: no se puede contabilizar (₡ {fmt2(diffBalance)} de diferencia)</span>
              )}
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              {/* Cancelar - ghost/texto, menor peso visual */}
              <button onClick={onClose} style={{ height:36, padding:'0 14px', border:'none', borderRadius:radius.md, background:'none', cursor:'pointer', fontSize:12, fontFamily:F, color:C.n700 }}>Cancelar</button>
              {/* Guardar como plantilla - secundario outline */}
              <button onClick={guardarComoPlantilla} style={{ height:36, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F, color:'#0F0F0F' }}>Guardar como plantilla</button>
              {/* Finalizar como pendiente - outline más marcado (color de marca) */}
              <button onClick={()=>handleSave(false)} disabled={!camposCompletos}
                style={{ height:36, padding:'0 16px', border:`1px solid ${BRAND}`, borderRadius:radius.md, background:'#FFFFFF', cursor:camposCompletos?'pointer':'default', fontSize:12, fontWeight:500, fontFamily:F, color:BRAND, opacity:camposCompletos?1:.5 }}>
                Finalizar como pendiente
              </button>
              {/* Contabilizar - primario, mayor peso visual, extremo derecho */}
              <button onClick={()=>handleSave(true)} disabled={!camposCompletos || !balanceado}
                title={!balanceado ? 'No se puede contabilizar: el asiento está desbalanceado' : undefined}
                style={{ height:36, padding:'0 20px', background:(camposCompletos&&balanceado)?BRAND:'#ECECEC', color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:(camposCompletos&&balanceado)?'pointer':'default', fontSize:12, fontWeight:500, fontFamily:F, display:'flex', alignItems:'center', gap:6 }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"><path d="M2 7l3.5 3.5L12 3"/></svg>
                Contabilizar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Archivos - mismo componente de 2 estados (vacío/con archivos) que usa el drawer de detalle */}
      {showArchivos && (
        <ModalAdjuntos archivos={archivos} title="Adjuntar archivos"
          onSave={(a)=>{ setArchivos(a); setShowArchivos(false); }}
          onClose={()=>setShowArchivos(false)}/>
      )}

      {/* Modal Observaciones */}
      {showObs && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setShowObs(false)}>
          <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:440, padding:'20px', boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
            <p style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Observaciones</p>
            <textarea value={observacion} onChange={e=>setObservacion(e.target.value)} placeholder="Información adicional opcional…" rows={5}
              style={{ width:'100%', padding:'10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, resize:'vertical', outline:'none', boxSizing:'border-box', marginBottom:14 }}/>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={()=>setShowObs(false)} style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
              <button onClick={()=>setShowObs(false)} style={{ height:34, padding:'0 14px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Programar asiento */}
      {showProg && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setShowProg(false)}>
          <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:380, padding:'20px', boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>
            <p style={{ fontSize:14, fontWeight:600, margin:'0 0 16px' }}>Programar asiento</p>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Frecuencia <span style={{ color:C.error }}>*</span></label>
                <div style={{ position:'relative' }}>
                  <select defaultValue="Mensual" style={{ width:'100%', height:36, padding:'0 10px', paddingRight:28, border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', appearance:'none' }}>
                    <option>Diaria</option><option>Semanal</option><option>Quincenal</option>
                    <option>Mensual</option><option>Bimestral</option><option>Trimestral</option>
                    <option>Semestral</option><option>Anual</option>
                  </select>
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round" style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><path d="M3.5 5.25L7 8.75L10.5 5.25"/></svg>
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Primera ejecución <span style={{ color:C.error }}>*</span></label>
                <input type="date" defaultValue={hoy} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:500, display:'block', marginBottom:4 }}>Finalización</label>
                <input type="date" defaultValue={hoy} style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
              <button onClick={()=>setShowProg(false)} style={{ height:34, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
              <button onClick={()=>setShowProg(false)} style={{ height:34, padding:'0 14px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
