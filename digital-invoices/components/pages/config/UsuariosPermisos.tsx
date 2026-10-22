'use client';
import React, { useState, useEffect } from 'react';
import { C, Toast, FONT, radius, shadow, PageHeader, PAGE_PAD, BotonExportarUnico, ExportListModal, PERMISOS_ACTUAL, SearchInput } from '../../ui/primitives';
import { IcPlus, IcEdit, IcTrash, IcSearch, IcClose, IcLock, IcCopy, IcNoCircle, IcEye, IcEyeOff, IcExport, IcMail, IcPrinter } from '../../ui/icons';
import PermissionTree from './PermissionTree';
import { useModulos } from '@/lib/modulosCliente';
import { ajustarArbolPermisos, normalizarPermisos, contarPermisosVisibles } from './permissionsData';
import {
  USUARIOS_INIT, PLANTILLAS_INIT, Usuario, PlantillaPermiso, totalLeavesInTree, flatPermissionRows,
  permisosAgrupadosPorUsuario, FIRMANTES_INIT, Firmantes,
} from './permissionsData';

const F = FONT;
const BRAND = C.brand;

function setsIguales(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

// ── Exportar permisos por usuario (CSV: una fila por permiso concedido) ─────
function csvEscapePermisos(v: string) { return `"${String(v).replace(/"/g,'""')}"`; }

function exportarPermisosPorUsuario(usuarios: Usuario[], plantillas: PlantillaPermiso[]) {
  const filas = flatPermissionRows();
  const headers = ['Usuario','Descripción','Activo','Rol','Categoría','Módulo','Sección','Permiso','Tipo/Estado'];
  const lines = [headers.map(csvEscapePermisos).join(',')];
  usuarios.forEach(u => {
    const rol = u.admin ? 'Administrador' : (plantillas.find(p=>p.id===u.plantillaId)?.nombre ?? 'Sin rol');
    filas.forEach(f => {
      if (u.permisos.has(f.key)) {
        lines.push([u.usuario, u.descripcion, u.activo?'Sí':'No', rol, f.categoria, f.modulo, f.grupo ?? '', f.permiso, f.subopcion ?? '']
          .map(v=>csvEscapePermisos(String(v))).join(','));
      }
    });
  });
  const blob = new Blob(['\ufeff'+lines.join('\n')], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `permisos-por-usuario-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Estilo compartido para inputs/selects de filtro: SIEMPRE fondo blanco y
// aspecto "activo" (nunca gris como si estuviera deshabilitado), salvo que
// explícitamente esté disabled.
function filterInputStyle(disabled?: boolean): React.CSSProperties {
  return {
    height: 36, padding: '0 10px', border: `1px solid ${C.n500}`, borderRadius: radius.md,
    fontSize: 12, fontFamily: F, outline: 'none',
    background: disabled ? C.n200 : '#fff', backgroundColor: disabled ? C.n200 : '#fff',
    WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none',
    color: C.n900, boxSizing: 'border-box', cursor: disabled ? 'default' : 'pointer',
  };
}

function SelectFiltro({ value, onChange, children, minWidth, disabled }: {
  value: string|number; onChange:(e:React.ChangeEvent<HTMLSelectElement>)=>void; children:React.ReactNode; minWidth?:number; disabled?:boolean;
}) {
  return (
    <div style={{ position:'relative', minWidth }}>
      <select value={value} onChange={onChange} disabled={disabled} style={{ ...filterInputStyle(disabled), width:'100%', paddingRight:28 }}>
        {children}
      </select>
      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round"
        style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
        <path d="M3.5 5.25L7 8.75L10.5 5.25"/>
      </svg>
    </div>
  );
}

// ── Enviar por correo el detalle de permisos de un usuario ──────────────────
// Permite varios destinatarios (chips, uno por correo) y un mensaje opcional.
// Se abre encima del detalle de permisos (modal sobre modal) a propósito: el
// detalle sigue visible/disponible detrás mientras se completa el envío.
const EMAIL_RE = /^\S+@\S+\.\S+$/;

function EnviarCorreoPermisosModal({ u, onClose, onEnviar }: { u:Usuario; onClose:()=>void; onEnviar:(correos:string[], mensaje:string)=>void }) {
  const [correos, setCorreos] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  function agregarDraft() {
    const v = draft.trim().replace(/,$/,'');
    if (!v) return;
    if (!EMAIL_RE.test(v)) { setError(`"${v}" no es un correo válido`); return; }
    if (correos.includes(v)) { setDraft(''); return; }
    setCorreos(prev=>[...prev, v]);
    setDraft(''); setError('');
  }
  function quitar(v: string) { setCorreos(prev=>prev.filter(c=>c!==v)); }
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key==='Enter' || e.key===',' || e.key===' ') { e.preventDefault(); agregarDraft(); }
    else if (e.key==='Backspace' && !draft && correos.length>0) { setCorreos(prev=>prev.slice(0,-1)); }
  }
  function enviar() {
    agregarDraft();
    const finales = draft.trim() && EMAIL_RE.test(draft.trim()) ? [...correos, draft.trim()] : correos;
    if (finales.length===0) { setError('Agregá al menos un correo'); return; }
    onEnviar(finales, mensaje.trim());
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:1002, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:440, boxShadow:'0 16px 48px rgba(0,0,0,.2)', fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:14, fontWeight:600, color:C.n900 }}>Enviar por correo</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700 }}><IcClose className="w-4 h-4"/></button>
        </div>
        <div style={{ padding:'18px 24px' }}>
          <div style={{ background:'#FAFAFA', border:`1px solid ${C.n500}`, borderRadius:radius.md, padding:'10px 12px', marginBottom:14 }}>
            <p style={{ fontSize:10, fontWeight:600, color:'#9E9E9E', textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 6px' }}>Se va a enviar</p>
            <p style={{ fontSize:12, fontWeight:600, color:C.n900, margin:0 }}>Detalle de permisos · {u.descripcion} ({u.usuario})</p>
          </div>

          <p style={{ fontSize:11, color:'#333', margin:'0 0 5px' }}>Destinatarios</p>
          <div onClick={()=>document.getElementById('correo-permisos-input')?.focus()}
            style={{ display:'flex', flexWrap:'wrap', gap:6, minHeight:38, padding:'6px 8px', border:`1px solid ${error?C.error:C.n500}`, borderRadius:radius.md, cursor:'text' }}>
            {correos.map(c=>(
              <span key={c} style={{ display:'flex', alignItems:'center', gap:5, background:C.brandBg, border:`1px solid ${C.brandBd}`, color:BRAND, borderRadius:radius.pill, padding:'3px 6px 3px 10px', fontSize:11.5 }}>
                {c}
                <button onClick={()=>quitar(c)} style={{ background:'none', border:'none', cursor:'pointer', color:BRAND, display:'flex', padding:2 }}><IcClose className="w-2.5 h-2.5"/></button>
              </span>
            ))}
            <input id="correo-permisos-input" value={draft}
              onChange={e=>{ setDraft(e.target.value); setError(''); }}
              onKeyDown={onKeyDown} onBlur={agregarDraft}
              placeholder={correos.length===0 ? 'nombre@empresa.com' : 'agregar otro...'}
              style={{ flex:1, minWidth:120, border:'none', outline:'none', fontSize:12, fontFamily:F, padding:'4px 2px' }}/>
          </div>
          <p style={{ fontSize:10, color:C.n700, margin:'4px 0 0' }}>Enter, coma o espacio agrega el correo.</p>
          {error && <p style={{ fontSize:10, color:C.error, margin:'5px 0 0' }}>{error}</p>}

          <p style={{ fontSize:11, color:'#333', margin:'14px 0 5px' }}>Mensaje (opcional)</p>
          <textarea value={mensaje} onChange={e=>setMensaje(e.target.value)} rows={3} placeholder="Agregá una nota para quien lo reciba..."
            style={{ width:'100%', padding:'8px 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box', resize:'vertical' }}/>
        </div>
        <div style={{ padding:'12px 24px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={enviar} style={{ height:34, padding:'0 16px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Enviar</button>
        </div>
      </div>
    </div>
  );
}

async function exportarDetalleUsuarioPDF(u: Usuario, plantillas: PlantillaPermiso[]) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 16;
  let y = 18;

  function ensureSpace(need: number) {
    if (y + need > pageH - 14) { doc.addPage(); y = 18; }
  }

  const brandRGB: [number, number, number] = [167, 118, 0]; // C.brand
  const grayRGB: [number, number, number] = [117, 117, 117]; // C.n700
  const darkRGB: [number, number, number] = [15, 15, 15]; // C.n900

  // Encabezado
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...darkRGB);
  doc.text(u.descripcion, marginX, y); y += 6;
  const rol = u.admin ? 'Administrador' : (plantillas.find(p=>p.id===u.plantillaId)?.nombre ?? 'Sin rol');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...grayRGB);
  doc.text(`Usuario: ${u.usuario}   ·   Rol: ${rol}   ·   ${u.activo ? 'Activo' : 'Inactivo'}`, marginX, y);
  doc.setFontSize(8.5);
  doc.text(`Generado ${new Date().toLocaleString('es-CR')}`, pageW - marginX, 18, { align: 'right' });
  y += 6;
  doc.setDrawColor(200); doc.line(marginX, y, pageW - marginX, y); y += 8;

  // Ficha de fechas
  const datos: [string, string][] = [['Fecha Creación', u.fechaCreacion], ['Último Acceso', u.ultimoAcceso], ['Último Cambio de Clave', u.ultimoCambioClave]];
  const colW = (pageW - marginX * 2) / 3;
  datos.forEach(([l, v], i) => {
    const x = marginX + colW * i;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...grayRGB);
    doc.text(l, x, y);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...darkRGB);
    doc.text(v, x, y + 5);
  });
  y += 14;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...darkRGB);
  doc.text(`Permisos activos (${contarPermisosVisibles(u.permisos)})`, marginX, y); y += 8;

  const grupos = permisosAgrupadosPorUsuario(u.permisos);
  if (grupos.length === 0) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...grayRGB);
    doc.text('Este usuario no tiene permisos asignados.', marginX, y);
  }

  grupos.forEach(cat => {
    ensureSpace(10);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...brandRGB);
    doc.text(cat.categoria.toUpperCase(), marginX, y); y += 6;

    cat.grupos.forEach(g => {
      ensureSpace(7);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...darkRGB);
      doc.text(g.modulo + (g.grupo ? ` · ${g.grupo}` : ''), marginX + 3, y); y += 5.5;

      g.items.forEach(it => {
        const linea = it.permiso + (it.subopciones.length > 0 ? `: ${it.subopciones.join(', ')}` : '');
        const wrapped = doc.splitTextToSize(linea, pageW - marginX * 2 - 9);
        ensureSpace(wrapped.length * 4.6 + 1);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...grayRGB);
        doc.text(wrapped, marginX + 7, y);
        y += wrapped.length * 4.6;
      });
      y += 2;
    });
    y += 2;
  });

  doc.save(`permisos-${u.usuario}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function DetalleUsuarioPermisos({ u, plantillas, onClose }: { u:Usuario; plantillas:PlantillaPermiso[]; onClose:()=>void }) {
  const [showCorreo, setShowCorreo] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [toast, setToast] = useState<string|null>(null);
  const grupos = permisosAgrupadosPorUsuario(u.permisos);
  const rol = u.admin ? 'Administrador' : (plantillas.find(p=>p.id===u.plantillaId)?.nombre ?? 'Sin rol');

  async function exportarPDF() {
    setExportando(true);
    try {
      await exportarDetalleUsuarioPDF(u, plantillas);
      setToast('Permisos exportados');
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="detalle-usuario-root" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:700, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }} onClick={onClose}>
      <div className="detalle-usuario-dialog" style={{ background:'#fff', borderRadius:radius.lg, width:'100%', maxWidth:640, maxHeight:'88vh', overflowY:'auto', boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>

        {/* Barra superior */}
        <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:14, fontWeight:600, color:C.n900 }}>Permisos del usuario</span>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button onClick={()=>setShowCorreo(true)} title="Enviar por correo"
              style={{ display:'flex', alignItems:'center', gap:6, height:32, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F, color:C.n700 }}>
              <IcMail className="w-3.5 h-3.5"/> Enviar por correo
            </button>
            <button onClick={exportarPDF} disabled={exportando} title="Exportar"
              style={{ display:'flex', alignItems:'center', gap:6, height:32, padding:'0 12px', border:'none', borderRadius:radius.md, background:BRAND, color:'#fff', cursor:exportando?'default':'pointer', opacity:exportando?.7:1, fontSize:12, fontWeight:500, fontFamily:F }}>
              <IcPrinter className="w-3.5 h-3.5"/> {exportando ? 'Exportando...' : 'Exportar'}
            </button>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700, marginLeft:2 }}><IcClose className="w-4 h-4"/></button>
          </div>
        </div>

        <div style={{ padding:'22px 24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', borderBottom:`1px solid #999`, paddingBottom:12, marginBottom:16 }}>
            <div>
              <p style={{ fontSize:15, fontWeight:700, color:C.n900, margin:'0 0 4px' }}>{u.descripcion}</p>
              <p style={{ fontSize:11.5, color:C.n700, margin:0 }}>Usuario: {u.usuario} &nbsp;·&nbsp; Rol: {rol} &nbsp;·&nbsp; {u.activo?'Activo':'Inactivo'}</p>
            </div>
            <p style={{ fontSize:10.5, color:C.n700, margin:0, textAlign:'right' }}>Generado {new Date().toLocaleString('es-CR')}</p>
          </div>

          <div style={{ display:'flex', gap:20, flexWrap:'wrap', marginBottom:18, fontSize:11.5 }}>
            {[['Fecha Creación', u.fechaCreacion],['Último Acceso', u.ultimoAcceso],['Último Cambio de Clave', u.ultimoCambioClave]].map(([l,v])=>(
              <div key={l}>
                <span style={{ display:'block', color:C.n700 }}>{l}</span>
                <span style={{ display:'block', fontWeight:600, color:C.n900 }}>{v}</span>
              </div>
            ))}
          </div>

          <p style={{ fontSize:12.5, fontWeight:600, color:C.n900, margin:'0 0 10px' }}>
            Permisos activos <span style={{ fontWeight:400, color:C.n700 }}>({contarPermisosVisibles(u.permisos)})</span>
          </p>

          {grupos.length===0 && <p style={{ fontSize:12, color:C.n700 }}>Este usuario no tiene permisos asignados.</p>}

          {grupos.map(cat=>(
            <div key={cat.categoria} style={{ marginBottom:14, breakInside:'avoid' }}>
              <p style={{ fontSize:11, fontWeight:700, color:BRAND, textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 6px' }}>{cat.categoria}</p>
              {cat.grupos.map((g,i)=>(
                <div key={i} style={{ marginBottom:8, paddingLeft:8 }}>
                  <p style={{ fontSize:12, fontWeight:600, color:C.n900, margin:'0 0 4px' }}>{g.modulo}{g.grupo?` · ${g.grupo}`:''}</p>
                  <ul style={{ margin:0, paddingLeft:18 }}>
                    {g.items.map((it,j)=>(
                      <li key={j} style={{ fontSize:11.5, color:C.n700, marginBottom:2 }}>
                        {it.permiso}{it.subopciones.length>0 && <span style={{ color:C.n700 }}>: {it.subopciones.join(', ')}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {showCorreo && (
        <EnviarCorreoPermisosModal u={u} onClose={()=>setShowCorreo(false)}
          onEnviar={(correos)=>{ setShowCorreo(false);
            setToast(`Permisos de ${u.descripcion} enviados a ${correos.length===1?correos[0]:`${correos.length} destinatarios`}`); }}/>
      )}
      {toast && <Toast message={toast} type="success" onClose={()=>setToast(null)}/>}
    </div>
  );
}

// ── Modal: crear usuario ──────────────────────────────────────────────────────
// Campo con etiqueta del formulario de usuario
function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return <div><label style={{ fontSize:11, fontWeight:500, color:C.n700, display:'block', marginBottom:5 }}>{label}</label>{children}</div>;
}

function CrearUsuarioModal({ plantillas, onClose, onSave }: { plantillas:PlantillaPermiso[]; onClose:()=>void; onSave:(u:Usuario)=>void }) {
  const [usuario, setUsuario] = useState('');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [rolId, setRolId] = useState<number|''>('');
  const [errors, setErrors] = useState<Record<string,string>>({});

  function validar() {
    const e: Record<string,string> = {};
    if (!usuario.trim()) e.usuario = 'Requerido';
    if (!nombre.trim()) e.nombre = 'Requerido';
    if (!correo.trim()) e.correo = 'Requerido';
    if (!clave.trim()) e.clave = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  }
  function guardar() {
    if (!validar()) return;
    const rol = rolId ? plantillas.find(p=>p.id===rolId) : undefined;
    onSave({
      id: Date.now(), usuario: usuario.trim(), descripcion: nombre.trim(), dias:0,
      activo: true, cambiarClave: false, admin: rol?.nombre === 'Administrador',
      fechaCreacion: new Date().toLocaleString('es-CR'), ultimoAcceso:'-', ultimoCambioClave: new Date().toLocaleString('es-CR'),
      permisos: new Set(rol ? rol.permisos : ['dashboard.card_asientos']), plantillaId: rol?.id ?? null,
    });
  }
  const inputStyle = (err?:string): React.CSSProperties => ({ width:'100%', height:36, padding:'0 10px', border:`1px solid ${err?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box', background:'#fff' });

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:520, padding:24, fontFamily:F, boxShadow:'0 8px 40px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <span style={{ fontSize:16, fontWeight:600, color:C.n900 }}>Crear Usuario</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700 }}><IcClose className="w-4 h-4"/></button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
          <Field label="Usuario">
            <input value={usuario} onChange={e=>setUsuario(e.target.value)} placeholder="Ej: jsmith" style={inputStyle(errors.usuario)}/>
          </Field>
          <Field label="Nombre Completo">
            <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: John Smith" style={inputStyle(errors.nombre)}/>
          </Field>
        </div>
        <div style={{ marginBottom:14 }}>
          <Field label="Correo Electrónico">
            <input value={correo} onChange={e=>setCorreo(e.target.value)} placeholder="jsmith@empresa.com" style={inputStyle(errors.correo)}/>
          </Field>
        </div>
        <div style={{ marginBottom:18 }}>
          <Field label="Contraseña">
            <div style={{ position:'relative' }}>
              <input type={verClave?'text':'password'} value={clave} onChange={e=>setClave(e.target.value)}
                placeholder="Contraseña" style={{ ...inputStyle(errors.clave), paddingRight:36 }}/>
              <button type="button" onClick={()=>setVerClave(v=>!v)} title={verClave?'Ocultar contraseña':'Mostrar contraseña'}
                style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.n700, padding:4, display:'flex' }}>
                {verClave ? <IcEyeOff className="w-3.5 h-3.5"/> : <IcEye className="w-3.5 h-3.5"/>}
              </button>
            </div>
            {errors.clave && <p style={{ fontSize:10.5, color:C.error, margin:'4px 0 0' }}>{errors.clave}</p>}
          </Field>
        </div>

        <p style={{ fontSize:14, fontWeight:600, color:C.n900, margin:'0 0 10px' }}>Permisos del Usuario</p>
        <div style={{ marginBottom:6 }}>
          <Field label="Rol">
            <select value={rolId} onChange={e=>setRolId(e.target.value?Number(e.target.value):'')} style={{ ...inputStyle(), color: rolId?C.n900:C.n700 }}>
              <option value="">Sin rol (permisos mínimos)</option>
              {plantillas.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:20 }}>
          <button onClick={onClose} style={{ height:36, padding:'0 18px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:13, fontFamily:F, color:'#555' }}>Cancelar</button>
          <button onClick={guardar} style={{ height:36, padding:'0 20px', border:'none', borderRadius:radius.md, background:BRAND, color:'#fff', cursor:'pointer', fontSize:13, fontFamily:F, fontWeight:500 }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

function SwitchActivo({ activo, onToggle }: { activo:boolean; onToggle:()=>void }) {
  return (
    <button onClick={e=>{ e.stopPropagation(); onToggle(); }} title={activo?'Activo':'Inactivo'}
      style={{ width:36, height:20, borderRadius:radius.pill, border:'none', padding:2, boxSizing:'border-box',
        background:activo?C.success:'#D8D8D8', cursor:'pointer', display:'flex', alignItems:'center',
        justifyContent:activo?'flex-end':'flex-start', transition:'background .15s' }}>
      <span style={{ width:16, height:16, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 2px rgba(0,0,0,.25)', transition:'transform .15s' }}/>
    </button>
  );
}

// Celda de fecha: solo se ve la fecha (sin hora) para no saturar la tabla;
// al pasar el mouse, el title nativo del navegador muestra fecha y hora
// completas - no hace falta un tooltip propio para eso.
function DateCell({ value }: { value:string }) {
  const soloFecha = value === '-' ? value : value.split(' ')[0];
  return (
    <td title={value === '-' ? undefined : value}
      style={{ padding:'10px 12px', color:C.n700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:value==='-'?'default':'help' }}>
      {soloFecha}
    </td>
  );
}

function UsuariosTab({ usuarios, setUsuarios, onGestionarPermisos, plantillas, busq, setBusq, mostrarInactivos, setMostrarInactivos }: {
  usuarios: Usuario[]; setUsuarios: React.Dispatch<React.SetStateAction<Usuario[]>>; onGestionarPermisos:(u:Usuario)=>void;
  plantillas: PlantillaPermiso[];
  busq:string; setBusq:(v:string)=>void; mostrarInactivos:boolean; setMostrarInactivos:(v:boolean)=>void;
}) {
  const [detalleUser, setDetalleUser] = useState<Usuario|null>(null);
  const [limpiarUser, setLimpiarUser] = useState<Usuario|null>(null);
  const [resetPassUser, setResetPassUser] = useState<Usuario|null>(null);
  const [toast, setToast] = useState<string|null>(null);

  const filtrados = usuarios.filter(u =>
    (mostrarInactivos || u.activo) &&
    (!busq || u.usuario.toLowerCase().includes(busq.toLowerCase()) || u.descripcion.toLowerCase().includes(busq.toLowerCase())));

  function patch(id:number, p:Partial<Usuario>) { setUsuarios(prev=>prev.map(u=>u.id===id?{...u,...p}:u)); }
  function eliminar(id:number) { setUsuarios(prev=>prev.filter(u=>u.id!==id)); setToast('Usuario eliminado'); }
  function limpiarPermisos() {
    if (!limpiarUser) return;
    patch(limpiarUser.id, { permisos: new Set(), plantillaId: null });
    setToast(`Permisos de ${limpiarUser.descripcion} limpiados`);
    setLimpiarUser(null);
  }

  const actionBtnStyle = (opts?: { danger?: boolean }): React.CSSProperties => ({
    width:32, height:32, borderRadius:radius.sm,
    border:`1px solid ${opts?.danger?C.errorBorder:C.n500}`, background:opts?.danger?C.errorBg:'#fff',
    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
    color:opts?.danger?C.error:C.n700, padding:0, flexShrink:0,
  });

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
        <div style={{ flex:1, maxWidth:280 }}>
          <SearchInput value={busq} onChange={setBusq} placeholder="Buscar usuario…" width="100%" />
        </div>
        <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
          <input type="checkbox" checked={mostrarInactivos} onChange={e=>setMostrarInactivos(e.target.checked)} style={{ width:15, height:15, accentColor:BRAND, cursor:'pointer' }}/>
          <span style={{ fontSize:12.5, color:C.n900 }}>Mostrar inactivos</span>
        </label>
      </div>

      <p style={{ fontSize:11, color:C.n700, margin:'0 0 8px' }}>Tocá una fila para ver el detalle de permisos del usuario.</p>

      <div style={{ background:'#fff', borderRadius:10, border:`1px solid ${C.n500}`, overflow:'auto' }}>
        <table style={{ width:'100%', minWidth:980, borderCollapse:'collapse', fontSize:12, fontFamily:F, tableLayout:'fixed' }}>
          <colgroup>
            <col style={{ width:60 }}/><col style={{ width:110 }}/><col/><col style={{ width:110 }}/>
            <col style={{ width:120 }}/><col style={{ width:110 }}/>
            <col style={{ width:64 }}/><col style={{ width:110 }}/><col style={{ width:64 }}/><col style={{ width:116 }}/>
          </colgroup>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.n500}` }}>
              {['Nro.','Usuario','Descripción','Creación','Contraseña','Último Cambio','Activo','Último Acceso','Admin',''].map(h=>(
                <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:500, color:C.n700, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(u=>(
              <tr key={u.id} onClick={()=>setDetalleUser(u)} style={{ borderBottom:'1px solid #F5F5F5', cursor:'pointer' }}>
                <td style={{ padding:'10px 12px', color:C.n700 }}>{u.id}</td>
                <td style={{ padding:'10px 12px', color:C.n900, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.usuario}</td>
                <td style={{ padding:'10px 12px', color:C.n900, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {u.descripcion}
                  {!u.activo && <span style={{ marginLeft:8, fontSize:10, padding:'2px 7px', borderRadius:10, background:'#F5F5F5', color:C.n700, fontWeight:600 }}>Inactivo</span>}
                </td>
                <DateCell value={u.fechaCreacion}/>
                <td style={{ padding:'10px 12px' }} onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>setResetPassUser(u)} style={{ display:'flex', alignItems:'center', gap:5, height:28, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#fff', cursor:'pointer', fontSize:11, fontFamily:F, color:C.n700, whiteSpace:'nowrap' }}>
                    <IcLock className="w-3 h-3"/> Restablecer
                  </button>
                </td>
                <DateCell value={u.ultimoCambioClave}/>
                <td style={{ padding:'10px 12px' }} onClick={e=>e.stopPropagation()}>
                  <SwitchActivo activo={u.activo} onToggle={()=>patch(u.id,{activo:!u.activo})}/>
                </td>
                <DateCell value={u.ultimoAcceso}/>
                <td style={{ padding:'10px 12px' }} onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>patch(u.id,{admin: !u.admin})} style={{
                    width:20, height:20, borderRadius:5, border:`1px solid ${u.admin?BRAND:C.n500}`, background:u.admin?BRAND:'#fff',
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {u.admin && <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M2.5 7l3.5 3.5L11.5 4"/></svg>}
                  </button>
                </td>
                <td style={{ padding:'10px 16px 10px 12px' }} onClick={e=>e.stopPropagation()}>
                  <div style={{ display:'flex', gap:6 }}>
                    <button title="Ver permisos" onClick={()=>setDetalleUser(u)} style={actionBtnStyle()}><IcLock className="w-4 h-4"/></button>
                    <button title="Limpiar permisos" onClick={()=>setLimpiarUser(u)} style={actionBtnStyle()}><IcNoCircle className="w-4 h-4"/></button>
                    <button title="Eliminar" onClick={()=>eliminar(u.id)} style={actionBtnStyle({danger:true})}><IcTrash className="w-4 h-4"/></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length===0 && (
              <tr><td colSpan={10} style={{ padding:30, textAlign:'center', color:C.n700 }}>Sin usuarios para mostrar.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {detalleUser && <DetalleUsuarioPermisos u={detalleUser} plantillas={plantillas} onClose={()=>setDetalleUser(null)}/>}
      {limpiarUser && (
        <ModalConfirm title={`¿Limpiar los permisos de ${limpiarUser.descripcion}?`}
          message="Le quita todos los permisos y el rol asociado. El usuario queda sin acceso a ningún módulo hasta que le asignes un rol o permisos de nuevo."
          confirmLabel="Sí, limpiar" danger onCancel={()=>setLimpiarUser(null)} onConfirm={limpiarPermisos}/>
      )}
      {resetPassUser && (
        <ResetPasswordModal usuario={resetPassUser} onClose={()=>setResetPassUser(null)}
          onSave={()=>{ setToast(`Contraseña de ${resetPassUser.descripcion} actualizada`); setResetPassUser(null); }}/>
      )}
      {toast && <Toast message={toast} type="success" onClose={()=>setToast(null)}/>}
    </div>
  );
}

// ── Modales de confirmación genéricos ────────────────────────────────────────
function ModalConfirm({ title, message, confirmLabel, danger, onCancel, onConfirm }: {
  title:string; message:string; confirmLabel:string; danger?:boolean; onCancel:()=>void; onConfirm:()=>void;
}) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onCancel}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:400, padding:'28px 24px', textAlign:'center', fontFamily:F, boxShadow:'0 8px 40px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ width:44, height:44, borderRadius:'50%', border:`2px solid ${danger?C.error:BRAND}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', color: danger?C.error:BRAND, fontSize:20, fontWeight:700 }}>!</div>
        <p style={{ fontSize:14, fontWeight:600, color:C.n900, margin:'0 0 8px' }}>{title}</p>
        <p style={{ fontSize:12, color:C.n700, margin:'0 0 20px', lineHeight:1.5 }}>{message}</p>
        <div style={{ display:'flex', justifyContent:'center', gap:10 }}>
          <button onClick={onCancel} style={{ height:36, padding:'0 18px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={onConfirm} style={{ height:36, padding:'0 18px', border:'none', borderRadius:radius.md, background:danger?C.error:BRAND, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({ usuario, onClose, onSave }: { usuario:Usuario; onClose:()=>void; onSave:()=>void }) {
  const [clave, setClave] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState('');

  function guardar() {
    if (!clave.trim()) { setError('Ingresá una contraseña'); return; }
    if (clave !== confirmar) { setError('Las contraseñas no coinciden'); return; }
    onSave();
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:380, padding:'24px', fontFamily:F, boxShadow:'0 8px 40px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <span style={{ fontSize:15, fontWeight:600, color:C.n900 }}>Restablecer contraseña</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700 }}><IcClose className="w-4 h-4"/></button>
        </div>
        <p style={{ fontSize:12, color:C.n700, margin:'0 0 16px' }}>Usuario: <strong style={{color:C.n900}}>{usuario.descripcion}</strong> ({usuario.usuario})</p>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:500, color:C.n700, display:'block', marginBottom:5 }}>Nueva contraseña</label>
            <div style={{ position:'relative' }}>
              <input type={verClave?'text':'password'} value={clave} onChange={e=>{setClave(e.target.value); setError('');}}
                placeholder="Nueva contraseña"
                style={{ width:'100%', height:36, padding:'0 36px 0 10px', border:`1px solid ${error?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
              <button type="button" onClick={()=>setVerClave(v=>!v)} title={verClave?'Ocultar contraseña':'Mostrar contraseña'}
                style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.n700, padding:4, display:'flex' }}>
                {verClave ? <IcEyeOff className="w-3.5 h-3.5"/> : <IcEye className="w-3.5 h-3.5"/>}
              </button>
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:500, color:C.n700, display:'block', marginBottom:5 }}>Confirmar contraseña</label>
            <input type={verClave?'text':'password'} value={confirmar} onChange={e=>{setConfirmar(e.target.value); setError('');}}
              style={{ width:'100%', height:36, padding:'0 10px', border:`1px solid ${error?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box' }}/>
          </div>
          {error && <p style={{ fontSize:11, color:C.error, margin:0 }}>{error}</p>}
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:20 }}>
          <button onClick={onClose} style={{ height:36, padding:'0 18px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:13, fontFamily:F, color:'#555' }}>Cancelar</button>
          <button onClick={guardar} style={{ height:36, padding:'0 20px', border:'none', borderRadius:radius.md, background:BRAND, color:'#fff', cursor:'pointer', fontSize:13, fontFamily:F, fontWeight:500 }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}


// también a los usuarios que la tienen asociada, o solo actualizar la plantilla.
function ModalGuardarPlantilla({ nombre, cantUsuarios, onCancel, onSoloPlantilla, onPlantillaYUsuarios }: {
  nombre:string; cantUsuarios:number; onCancel:()=>void; onSoloPlantilla:()=>void; onPlantillaYUsuarios:()=>void;
}) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onCancel}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:440, padding:'28px 24px', textAlign:'center', fontFamily:F, boxShadow:'0 8px 40px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ width:44, height:44, borderRadius:'50%', border:`2px solid ${BRAND}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', color:BRAND, fontSize:20, fontWeight:700 }}>!</div>
        <p style={{ fontSize:14, fontWeight:600, color:C.n900, margin:'0 0 8px' }}>¿Cómo querés guardar “{nombre}”?</p>
        <p style={{ fontSize:12, color:C.n700, margin:'0 0 20px', lineHeight:1.5 }}>
          {cantUsuarios} usuario{cantUsuarios===1?'':'s'} tiene{cantUsuarios===1?'':'n'} este rol asociado. Podés actualizar solo el rol (no les cambia nada hasta que lo vuelvan a aplicar), o actualizar también sus permisos ahora mismo.
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <button onClick={onPlantillaYUsuarios} style={{ height:38, border:'none', borderRadius:radius.md, background:BRAND, color:'#fff', cursor:'pointer', fontSize:12.5, fontWeight:500, fontFamily:F }}>
            Actualizar rol y usuarios asociados
          </button>
          <button onClick={onSoloPlantilla} style={{ height:38, border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', color:C.n900, cursor:'pointer', fontSize:12.5, fontFamily:F }}>
            Actualizar solo el rol
          </button>
          <button onClick={onCancel} style={{ height:32, border:'none', background:'none', color:C.n700, cursor:'pointer', fontSize:12, fontFamily:F, marginTop:2 }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function SaveAsTemplateModal({ onClose, onSave, plantillas, defaultNombre, motivo }: {
  onClose:()=>void; onSave:(nombre:string)=>void; plantillas:PlantillaPermiso[]; defaultNombre?:string; motivo?:string;
}) {
  const [nombre, setNombre] = useState(defaultNombre ?? '');
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:radius.lg, width:400, padding:'28px 24px', textAlign:'center', fontFamily:F, boxShadow:'0 8px 40px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ width:44, height:44, borderRadius:'50%', border:`2px solid ${BRAND}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', color:BRAND, fontSize:20, fontWeight:700 }}>!</div>
        <p style={{ fontSize:14, fontWeight:600, color:C.n900, margin:'0 0 8px' }}>Guardar como rol</p>
        <p style={{ fontSize:12, color:C.n700, margin:'0 0 16px', lineHeight:1.5 }}>
          {motivo ?? 'Se guardan todos los permisos configurados como un nuevo rol.'}
        </p>
        <div style={{ textAlign:'left', marginBottom:20 }}>
          <label style={{ fontSize:11, fontWeight:500, color:C.n700, display:'block', marginBottom:5 }}>Seleccionar o crear rol</label>
          <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej. Recepcionista, Contador senior"
            list="plantillas-existentes" style={{ ...filterInputStyle(), width:'100%' }} autoFocus/>
          <datalist id="plantillas-existentes">{plantillas.map(p=><option key={p.id} value={p.nombre}/>)}</datalist>
        </div>
        <div style={{ display:'flex', justifyContent:'center', gap:10 }}>
          <button onClick={onClose} style={{ height:36, padding:'0 18px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={()=>nombre.trim() && onSave(nombre.trim())} style={{ height:36, padding:'0 18px', border:'none', borderRadius:radius.md, background:BRAND, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Sí, confirmar</button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Roles (solo la lista) ──────────────────────────────
function PlantillasTab({ plantillas, onEditar, onDuplicar, onEliminarRequest }: {
  plantillas: PlantillaPermiso[]; onEditar:(p:PlantillaPermiso)=>void; onDuplicar:(p:PlantillaPermiso)=>void; onEliminarRequest:(p:PlantillaPermiso)=>void;
}) {
  const total = totalLeavesInTree();
  return (
    <div style={{ background:'#fff', borderRadius:10, border:`1px solid ${C.n500}`, overflow:'hidden' }}>
      {plantillas.map((p,i)=>(
        <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:i<plantillas.length-1?`1px solid ${C.n500}`:'none' }}>
          <span style={{ fontSize:13, fontWeight:500, color:C.n900 }}>{p.nombre}</span>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <span style={{ fontSize:11.5, color:C.n700 }}>{contarPermisosVisibles(p.permisos)}/{total} permisos</span>
            <span style={{ fontSize:11.5, color:C.n700 }}>{p.usuarios} usuario{p.usuarios===1?'':'s'}</span>
            <button onClick={()=>onEditar(p)} style={{ display:'flex', alignItems:'center', gap:5, height:30, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:7, background:'#fff', cursor:'pointer', fontSize:11.5, fontFamily:F, color:C.n900 }}>
              <IcEdit className="w-3 h-3"/> Editar
            </button>
            <button title="Duplicar rol" onClick={()=>onDuplicar(p)} style={{ width:30, height:30, borderRadius:7, border:`1px solid ${C.n500}`, background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.n700 }}>
              <IcCopy className="w-3.5 h-3.5"/>
            </button>
            <button title="Eliminar rol" onClick={()=>onEliminarRequest(p)} style={{ width:30, height:30, borderRadius:7, border:'none', background:'none', cursor:'pointer', color:C.error, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <IcTrash className="w-3.5 h-3.5"/>
            </button>
          </div>
        </div>
      ))}
      {plantillas.length===0 && <div style={{ padding:30, textAlign:'center', color:C.n700 }}>No hay roles creados todavía.</div>}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
type Modo =
  | { kind:'usuarios' }
  | { kind:'plantillas' }
  | { kind:'permisos-empty' }
  | { kind:'permisos-usuario'; userId:number }
  | { kind:'permisos-plantilla'; plantillaId:number };

export default function UsuariosPermisos() {
  // Solo facturación: sin permisos contables (y al revés)
  ajustarArbolPermisos(useModulos());
  const [modo, setModo] = useState<Modo>({ kind:'usuarios' });
  const [usuarios, setUsuarios] = useState<Usuario[]>(USUARIOS_INIT);
  const [plantillas, setPlantillas] = useState<PlantillaPermiso[]>(PLANTILLAS_INIT);
  // Firmantes: quiénes están autorizados a firmar cada reporte. Es una lista
  // compartida (por reporte, no por usuario ni por rol) - independiente de a
  // quién le estés editando los permisos en un momento dado.
  const [firmantes, setFirmantes] = useState<Firmantes>(FIRMANTES_INIT);
  // Usuarios, roles y firmantes se guardan en la base (/api/usuarios)
  const [cargadoBase, setCargadoBase] = useState(false);
  useEffect(() => {
    let vivo = true;
    fetch('/api/usuarios').then(r => r.json()).then((d: { usuarios?: Usuario[]; plantillas?: PlantillaPermiso[]; firmantes?: Firmantes } | null) => {
      if (!vivo) return;
      // Los permisos se guardan como listas y aquí se trabajan como Set
      if (d?.usuarios) setUsuarios(d.usuarios.map(u => ({ ...u, permisos: normalizarPermisos(Array.isArray(u.permisos) ? u.permisos as unknown as string[] : []) })));
      if (d?.plantillas) setPlantillas(d.plantillas.map(t => ({ ...t, permisos: normalizarPermisos(Array.isArray(t.permisos) ? t.permisos as unknown as string[] : []) })));
      if (d?.firmantes) setFirmantes(d.firmantes);
      setCargadoBase(true);
    }).catch(() => { if (vivo) setCargadoBase(true); });
    return () => { vivo = false; };
  }, []);
  useEffect(() => {
    if (!cargadoBase) return;
    const t = setTimeout(() => {
      fetch('/api/usuarios', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuarios: usuarios.map(u => ({ ...u, permisos: [...u.permisos] })), plantillas: plantillas.map(t => ({ ...t, permisos: [...t.permisos] })), firmantes }) }).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [cargadoBase, usuarios, plantillas, firmantes]);
  function toggleFirmante(leafKey: string, usuarioId: number) {
    setFirmantes(prev => {
      const actuales = prev[leafKey] ?? [];
      const nuevos = actuales.includes(usuarioId) ? actuales.filter(id=>id!==usuarioId) : [...actuales, usuarioId];
      return { ...prev, [leafKey]: nuevos };
    });
  }

  const [busqUsuarios, setBusqUsuarios] = useState('');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [showCrearUsuario, setShowCrearUsuario] = useState(false);

  // Estado del árbol de permisos (compartido entre modo usuario y modo plantilla)
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedPlantillaFilter, setSelectedPlantillaFilter] = useState<number|''>('');
  const [pendingApplyTemplate, setPendingApplyTemplate] = useState<PlantillaPermiso|null>(null);
  const [showConfirmSaveUser, setShowConfirmSaveUser] = useState(false);
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);
  const [showSaveTemplateChanges, setShowSaveTemplateChanges] = useState(false);
  const [plantillaAEliminar, setPlantillaAEliminar] = useState<PlantillaPermiso|null>(null);
  const [toast, setToast] = useState<string|null>(null);
  const [showExportarUsuarios, setShowExportarUsuarios] = useState(false);
  const [showExportarRoles, setShowExportarRoles] = useState(false);

  const total = totalLeavesInTree();

  // ── Exportar (estándar de la app: PDF/Excel con vista previa) ──
  // Usuarios: exporta la misma lista que se ve en pantalla, respetando el
  // buscador y el filtro de "Mostrar inactivos" ya aplicados en la tabla.
  function rolDeUsuario(u: Usuario) {
    return u.admin ? 'Administrador' : (plantillas.find(p=>p.id===u.plantillaId)?.nombre ?? 'Sin rol');
  }
  const usuariosParaExportar = usuarios.filter(u =>
    (mostrarInactivos || u.activo) &&
    (!busqUsuarios || u.usuario.toLowerCase().includes(busqUsuarios.toLowerCase()) || u.descripcion.toLowerCase().includes(busqUsuarios.toLowerCase())));

  function abrirGestionUsuario(u: Usuario) {
    setDraft(new Set(u.permisos));
    setDirty(false);
    setSearch('');
    setSelectedPlantillaFilter(u.plantillaId ?? '');
    setModo({ kind:'permisos-usuario', userId: u.id });
  }
  function abrirEditarPlantilla(p: PlantillaPermiso) {
    setDraft(new Set(p.permisos));
    setDirty(false);
    setSearch('');
    setModo({ kind:'permisos-plantilla', plantillaId: p.id });
  }
  function descartarYVolver() {
    setModo({ kind: modo.kind==='permisos-plantilla' ? 'plantillas' : 'usuarios' });
  }

  function toggleLeaf(key:string) {
    setDraft(prev=>{ const n=new Set(prev); n.has(key)?n.delete(key):n.add(key); return n; });
    setDirty(true);
  }
  function setMany(keys:string[], value:boolean) {
    setDraft(prev=>{ const n=new Set(prev); keys.forEach(k=>value?n.add(k):n.delete(k)); return n; });
    setDirty(true);
  }

  const rolBase = selectedPlantillaFilter ? plantillas.find(p=>p.id===selectedPlantillaFilter) : undefined;
  const permisosDivergenDelRol = !!rolBase && !setsIguales(draft, rolBase.permisos);

  function confirmarGuardadoUsuario() {
    if (modo.kind !== 'permisos-usuario') return;
    setUsuarios(prev=>prev.map(u=>u.id===modo.userId?{...u, permisos:new Set(draft), plantillaId:selectedPlantillaFilter||u.plantillaId||null}:u));
    setShowConfirmSaveUser(false); setDirty(false);
    setToast('Permisos actualizados');
  }
  function aplicarPlantillaAUsuario() {
    if (!pendingApplyTemplate) return;
    setDraft(new Set(pendingApplyTemplate.permisos));
    setSelectedPlantillaFilter(pendingApplyTemplate.id);
    setDirty(true);
    setPendingApplyTemplate(null);
  }
  function guardarComoNuevaPlantilla(nombre:string) {
    const existe = plantillas.find(p=>p.nombre.toLowerCase()===nombre.toLowerCase());
    const nuevoId = existe ? existe.id : Date.now();
    setPlantillas(prev => existe
      ? prev.map(p=>p.id===existe.id?{...p,permisos:new Set(draft)}:p)
      : [...prev, { id:nuevoId, nombre, usuarios:0, permisos:new Set(draft) }]);
    setShowSaveAsTemplate(false);
    if (modo.kind==='permisos-usuario') {
      // Viene del flujo de un usuario: el nuevo rol se guarda Y se le aplica de una vez,
      // en vez de dejarlo con permisos sueltos sin ningún rol asociado.
      const u = usuarios.find(x=>x.id===modo.userId);
      setUsuarios(prev=>prev.map(x=>x.id===modo.userId?{...x, permisos:new Set(draft), plantillaId:nuevoId}:x));
      setSelectedPlantillaFilter(nuevoId);
      setDirty(false);
      setToast(`Rol "${nombre}" guardado y aplicado a ${u?.descripcion ?? 'el usuario'}`);
    } else {
      setToast(`Rol "${nombre}" guardado`);
    }
  }
  function duplicarPlantilla(p: PlantillaPermiso) {
    const base = `${p.nombre} (copia)`;
    let nombre = base, n = 2;
    while (plantillas.some(x=>x.nombre.toLowerCase()===nombre.toLowerCase())) { nombre = `${base} ${n}`; n++; }
    setPlantillas(prev=>[...prev, { id:Date.now(), nombre, usuarios:0, permisos:new Set(p.permisos) }]);
    setToast(`Rol "${nombre}" creado a partir de "${p.nombre}"`);
  }
  // Botón general "Limpiar permisos" en la propia pantalla de edición - deja el
  // borrado pendiente en el draft (hay que darle Guardar), en vez de aplicarlo
  // directo, para que sea consistente con el resto de cambios de esta pantalla.
  function limpiarDraft() {
    setDraft(new Set());
    setSelectedPlantillaFilter('');
    setDirty(true);
  }

  // ── Guardado en modo plantilla ──
  const plantillaActual = modo.kind==='permisos-plantilla' ? plantillas.find(p=>p.id===modo.plantillaId) : undefined;
  function guardarSoloPlantilla() {
    if (!plantillaActual) return;
    setPlantillas(prev=>prev.map(p=>p.id===plantillaActual.id?{...p,permisos:new Set(draft)}:p));
    setShowSaveTemplateChanges(false); setDirty(false);
    setToast(`Rol "${plantillaActual.nombre}" actualizado`);
    setModo({ kind:'plantillas' });
  }
  function guardarPlantillaYUsuarios() {
    if (!plantillaActual) return;
    setPlantillas(prev=>prev.map(p=>p.id===plantillaActual.id?{...p,permisos:new Set(draft)}:p));
    setUsuarios(prev=>prev.map(u=>u.plantillaId===plantillaActual.id?{...u,permisos:new Set(draft)}:u));
    setShowSaveTemplateChanges(false); setDirty(false);
    setToast(`Rol "${plantillaActual.nombre}" y usuarios asociados actualizados`);
    setModo({ kind:'plantillas' });
  }
  function eliminarPlantilla() {
    if (!plantillaAEliminar) return;
    setPlantillas(prev=>prev.filter(p=>p.id!==plantillaAEliminar.id));
    setToast(`Rol "${plantillaAEliminar.nombre}" eliminado`);
    setPlantillaAEliminar(null);
  }

  const usuarioActual = modo.kind==='permisos-usuario' ? usuarios.find(u=>u.id===modo.userId) : undefined;

  // ── Título del header: siempre "Usuarios y permisos", fijo sin importar la pestaña ──
  const headerTitle = 'Usuarios y permisos';
  let headerActions: React.ReactNode = null;
  if (modo.kind === 'usuarios') {
    const puedeExportar = PERMISOS_ACTUAL.puedeExportarPermisosUsuarios;
    headerActions = (
      <div style={{ display:'flex', gap:8 }}>
        {puedeExportar && <BotonExportarUnico onClick={()=>setShowExportarUsuarios(true)}/>}
        {puedeExportar && (
          <button onClick={()=>{ exportarPermisosPorUsuario(usuarios, plantillas); setToast('Permisos exportados'); }}
            title="Descarga un CSV con el detalle de permisos de cada usuario"
            style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F, color:C.n700, display:'flex', alignItems:'center', gap:6 }}>
            <IcExport className="w-3.5 h-3.5"/> Exportar permisos
          </button>
        )}
        <button onClick={()=>setShowCrearUsuario(true)} style={{ height:34, padding:'0 16px', background:BRAND, color:'#fff', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F, display:'flex', alignItems:'center', gap:6 }}>
          <IcPlus className="w-3.5 h-3.5"/> Nuevo usuario
        </button>
      </div>
    );
  } else if (modo.kind === 'plantillas') {
    headerActions = (
      <div style={{ display:'flex', gap:8 }}>
        {PERMISOS_ACTUAL.puedeExportarPermisosUsuarios && <BotonExportarUnico onClick={()=>setShowExportarRoles(true)}/>}
      </div>
    );
  } else if (modo.kind === 'permisos-usuario') {
    headerActions = (
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={()=>setModo({kind:'usuarios'})} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F, color:'#555' }}>Cancelar</button>
        <button onClick={()=>setShowSaveAsTemplate(true)} style={{ height:34, padding:'0 16px', border:`1px solid ${BRAND}`, borderRadius:radius.md, background:C.brandBg, color:BRAND, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Guardar como rol</button>
        <button onClick={()=>{ if (permisosDivergenDelRol) setShowSaveAsTemplate(true); else setShowConfirmSaveUser(true); }} disabled={!dirty} style={{ height:34, padding:'0 18px', border:'none', borderRadius:radius.md, background:dirty?BRAND:'#D8D8D8', color:'#fff', cursor:dirty?'pointer':'default', fontSize:12, fontWeight:500, fontFamily:F }}>Guardar</button>
      </div>
    );
  } else if (modo.kind === 'permisos-plantilla') {
    headerActions = (
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={descartarYVolver} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F, color:'#555' }}>Descartar cambios</button>
        <button onClick={()=>setShowSaveTemplateChanges(true)} disabled={!dirty} style={{ height:34, padding:'0 18px', border:'none', borderRadius:radius.md, background:dirty?BRAND:'#D8D8D8', color:'#fff', cursor:dirty?'pointer':'default', fontSize:12, fontWeight:500, fontFamily:F }}>Guardar rol</button>
      </div>
    );
  }

  const activeTab: 'usuarios'|'permisos'|'plantillas' =
    (modo.kind==='permisos-usuario' || modo.kind==='permisos-empty') ? 'permisos'
      : modo.kind==='permisos-plantilla' ? 'plantillas' : modo.kind;

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:F, background:'#F9F9F9' }}>
      <PageHeader title={headerTitle} left={
        modo.kind==='permisos-plantilla' && plantillaActual ? (
          <span style={{ fontSize:12, color:C.n700 }}>Rol · {plantillaActual.nombre}</span>
        ) : undefined
      }>
        {headerActions}
      </PageHeader>

      {modo.kind!=='permisos-plantilla' && (
        <div style={{ background:'#fff', borderBottom:`1px solid ${C.n500}`, padding:'0 24px', display:'flex', gap:4, flexShrink:0 }}>
          {[['usuarios','Usuarios'],['permisos','Permisos'],['plantillas','Roles']].map(([key,label])=>(
            <button key={key} onClick={()=>{
                if (key==='permisos') { if (!usuarioActual) setModo({kind:'permisos-empty'}); else setModo({kind:'permisos-usuario', userId:usuarioActual.id}); }
                else setModo({ kind: key as 'usuarios'|'plantillas' });
              }}
              style={{ height:44, padding:'0 4px', marginRight:22, border:'none', background:'none', cursor:'pointer',
                borderBottom:`2px solid ${activeTab===key?BRAND:'transparent'}`, color:activeTab===key?BRAND:C.n700,
                fontWeight:activeTab===key?600:400, fontSize:13, fontFamily:F }}>{label}</button>
          ))}
        </div>
      )}

      <div style={{ flex:1, overflowY:'auto', padding:PAGE_PAD }}>
        {modo.kind==='usuarios' && (
          <UsuariosTab usuarios={usuarios} setUsuarios={setUsuarios} onGestionarPermisos={abrirGestionUsuario} plantillas={plantillas}
            busq={busqUsuarios} setBusq={setBusqUsuarios} mostrarInactivos={mostrarInactivos} setMostrarInactivos={setMostrarInactivos}/>
        )}

        {modo.kind==='plantillas' && (
          <PlantillasTab plantillas={plantillas} onEditar={abrirEditarPlantilla} onDuplicar={duplicarPlantilla} onEliminarRequest={setPlantillaAEliminar}/>
        )}

        {modo.kind==='permisos-empty' && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:280, textAlign:'center', color:C.n700 }}>
            <IcLock className="w-6 h-6" style={{ marginBottom:10, opacity:.5 }}/>
            <p style={{ fontSize:13, fontWeight:600, color:C.n900, margin:'0 0 4px' }}>Seleccioná un usuario</p>
            <p style={{ fontSize:12, margin:'0 0 16px', maxWidth:320 }}>Elegí un usuario para ver y editar los permisos que tiene asignados.</p>
            <SelectFiltro value={''} minWidth={240} onChange={e=>{ const u=usuarios.find(x=>x.id===Number(e.target.value)); if (u) abrirGestionUsuario(u); }}>
              <option value="">Elegí un usuario...</option>
              {usuarios.map(u=><option key={u.id} value={u.id}>{u.descripcion} - {u.usuario}</option>)}
            </SelectFiltro>
          </div>
        )}

        {modo.kind==='permisos-usuario' && (
          <div>
            <div style={{ display:'flex', gap:16, alignItems:'flex-end', flexWrap:'wrap', marginBottom:16, background:'#fff', border:`1px solid ${C.n500}`, borderRadius:10, padding:'14px 16px' }}>
              <div style={{ minWidth:200 }}>
                <p style={{ fontSize:10, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 6px' }}>Usuario</p>
                <SelectFiltro value={modo.userId} minWidth={200} onChange={e=>{ const u = usuarios.find(x=>x.id===Number(e.target.value)); if (u) abrirGestionUsuario(u); }}>
                  {usuarios.map(u=><option key={u.id} value={u.id}>{u.descripcion} - {u.usuario}</option>)}
                </SelectFiltro>
              </div>
              <div style={{ minWidth:190 }}>
                <p style={{ fontSize:10, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 6px' }}>Rol</p>
                <SelectFiltro value={selectedPlantillaFilter} minWidth={190} onChange={e=>{
                    const id = e.target.value?Number(e.target.value):'';
                    if (!id) { setSelectedPlantillaFilter(''); return; }
                    const p = plantillas.find(x=>x.id===id);
                    if (p) setPendingApplyTemplate(p);
                  }}>
                  <option value="">Aplicar rol</option>
                  {plantillas.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                </SelectFiltro>
              </div>
              <div style={{ flex:1, minWidth:200 }}>
                <p style={{ fontSize:10, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 6px' }}>Buscar en permisos</p>
                <SearchInput value={search} onChange={setSearch} placeholder="Buscar sección u opción…" width="100%" />
              </div>
              <button onClick={limpiarDraft} title="Quita todos los permisos del usuario (queda pendiente hasta que le des Guardar)"
                style={{ display:'flex', alignItems:'center', gap:6, height:36, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F, color:C.n700, whiteSpace:'nowrap' }}>
                <IcNoCircle className="w-3.5 h-3.5"/> Limpiar permisos
              </button>
            </div>
            <p style={{ fontSize:12, color:C.n700, margin:'0 0 8px' }}>
              {usuarioActual?.descripcion} &nbsp;·&nbsp; <strong style={{color:C.n900}}>{contarPermisosVisibles(draft)}/{total}</strong> permisos activos
              {rolBase && <>&nbsp;·&nbsp; Rol: <strong style={{color:C.n900}}>{rolBase.nombre}</strong></>}
            </p>
            {permisosDivergenDelRol && (
              <div style={{ display:'flex', alignItems:'center', gap:8, background:C.brandBg, border:`1px solid ${C.brandBd}`, borderRadius:radius.md, padding:'8px 12px', marginBottom:12, fontSize:11.5, color:'#633806' }}>
                Cambiaste permisos fuera de lo que trae el rol “{rolBase?.nombre}”. Al guardar, se va a crear un rol nuevo con estos permisos en vez de sobrescribir el original.
              </div>
            )}
            <PermissionTree perms={draft} onToggleLeaf={toggleLeaf} onSetMany={setMany} search={search}
              usuarios={usuarios} firmantes={firmantes} onToggleFirmante={toggleFirmante}/>
          </div>
        )}

        {modo.kind==='permisos-plantilla' && plantillaActual && (
          <div>
            <p style={{ fontSize:12, color:C.n700, margin:'0 0 12px' }}>
              Editando el rol <strong style={{color:C.n900}}>{plantillaActual.nombre}</strong> &nbsp;·&nbsp; <strong style={{color:C.n900}}>{contarPermisosVisibles(draft)}/{total}</strong> permisos activos &nbsp;·&nbsp; {plantillaActual.usuarios} usuario{plantillaActual.usuarios===1?'':'s'} lo tiene{plantillaActual.usuarios===1?'':'n'} asociado
            </p>
            <div style={{ maxWidth:320, marginBottom:16 }}>
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar sección u opción…" width="100%" />
            </div>
            <PermissionTree perms={draft} onToggleLeaf={toggleLeaf} onSetMany={setMany} search={search}
              usuarios={usuarios} firmantes={firmantes} onToggleFirmante={toggleFirmante}/>
          </div>
        )}
      </div>

      {showCrearUsuario && (
        <CrearUsuarioModal plantillas={plantillas} onClose={()=>setShowCrearUsuario(false)} onSave={u=>{ setUsuarios(p=>[...p,u]); setShowCrearUsuario(false); setToast(`Usuario ${u.usuario} creado`); }}/>
      )}
      {pendingApplyTemplate && (
        <ModalConfirm title={`¿Aplicar el rol "${pendingApplyTemplate.nombre}"?`}
          message="Esto va a sobrescribir los permisos actuales con los del rol. Cualquier ajuste manual que tenga se pierde."
          confirmLabel="Sí, aplicar" onCancel={()=>setPendingApplyTemplate(null)} onConfirm={aplicarPlantillaAUsuario}/>
      )}
      {showConfirmSaveUser && (
        <ModalConfirm title="¿Deseas confirmar los permisos?" message={`Usuario: ${usuarioActual?.descripcion ?? ''}`}
          confirmLabel="Sí, confirmar" onCancel={()=>setShowConfirmSaveUser(false)} onConfirm={confirmarGuardadoUsuario}/>
      )}
      {showSaveAsTemplate && (
        <SaveAsTemplateModal plantillas={plantillas} onClose={()=>setShowSaveAsTemplate(false)} onSave={guardarComoNuevaPlantilla}
          defaultNombre={permisosDivergenDelRol && rolBase ? `${rolBase.nombre} (personalizado)` : undefined}
          motivo={permisosDivergenDelRol && rolBase ? `Los permisos de ${usuarioActual?.descripcion ?? 'este usuario'} ya no coinciden con el rol "${rolBase.nombre}". Guardalos como un rol nuevo.` : undefined}/>
      )}
      {showSaveTemplateChanges && plantillaActual && (
        <ModalGuardarPlantilla nombre={plantillaActual.nombre} cantUsuarios={plantillaActual.usuarios}
          onCancel={()=>setShowSaveTemplateChanges(false)} onSoloPlantilla={guardarSoloPlantilla} onPlantillaYUsuarios={guardarPlantillaYUsuarios}/>
      )}
      {plantillaAEliminar && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setPlantillaAEliminar(null)}>
          <div style={{ background:'#fff', borderRadius:radius.lg, width:400, padding:'28px 24px', textAlign:'center', fontFamily:F, boxShadow:'0 8px 40px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()}>
            <div style={{ width:44, height:44, borderRadius:'50%', border:'2px solid #E24B4A', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', color:C.error }}><IcClose className="w-5 h-5"/></div>
            <p style={{ fontSize:14, fontWeight:600, color:C.n900, margin:'0 0 8px' }}>Eliminar “{plantillaAEliminar.nombre}”</p>
            <p style={{ fontSize:12, color:C.n700, margin:'0 0 20px', lineHeight:1.5 }}>
              Este rol está aplicado a {plantillaAEliminar.usuarios} usuarios. Eliminarlo no les quita los permisos que ya tienen, pero no vas a poder volver a aplicarlo ni ver que lo usan.
            </p>
            <div style={{ display:'flex', justifyContent:'center', gap:10 }}>
              <button onClick={()=>setPlantillaAEliminar(null)} style={{ height:36, padding:'0 18px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#fff', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
              <button onClick={eliminarPlantilla} style={{ height:36, padding:'0 18px', border:'none', borderRadius:radius.md, background:C.error, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Eliminar de todos modos</button>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast} type="success" onClose={()=>setToast(null)}/>}

      {showExportarUsuarios && (
        <ExportListModal
          title="Usuarios"
          subtitulo={`${usuariosParaExportar.length} usuario${usuariosParaExportar.length===1?'':'s'}`}
          filename={`usuarios-${new Date().toISOString().slice(0,10)}`}
          columns={[
            { key:'nro', label:'Nro.' }, { key:'usuario', label:'Usuario' }, { key:'descripcion', label:'Descripción' },
            { key:'rol', label:'Rol' }, { key:'activo', label:'Activo' }, { key:'admin', label:'Admin' },
            { key:'creacion', label:'Fecha Creación' }, { key:'ultimoAcceso', label:'Último Acceso' },
          ]}
          rows={usuariosParaExportar.map(u=>({
            nro:u.id, usuario:u.usuario, descripcion:u.descripcion, rol:rolDeUsuario(u),
            activo:u.activo?'Sí':'No', admin:u.admin?'Sí':'No', creacion:u.fechaCreacion, ultimoAcceso:u.ultimoAcceso,
          }))}
          onClose={()=>setShowExportarUsuarios(false)}
        />
      )}
      {showExportarRoles && (
        <ExportListModal
          title="Roles"
          subtitulo={`${plantillas.length} rol${plantillas.length===1?'':'es'}`}
          filename={`roles-${new Date().toISOString().slice(0,10)}`}
          columns={[
            { key:'rol', label:'Rol' }, { key:'usuarios', label:'Usuarios asociados', align:'right' },
            { key:'permisos', label:'Permisos activos', align:'right' },
          ]}
          rows={plantillas.map(p=>({ rol:p.nombre, usuarios:p.usuarios, permisos:`${contarPermisosVisibles(p.permisos)}/${total}` }))}
          onClose={()=>setShowExportarRoles(false)}
        />
      )}
    </div>
  );
}
