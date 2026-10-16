'use client';
import React, { useState } from 'react';
import { C, radius } from '../../../ui/tokens';
import { IcClose, IcEye, IcEyeOff } from '../../../ui/icons';
import { Usuario, PlantillaPermiso } from '../permissionsData';
import { BRAND, EMAIL_RE, F, filterInputStyle } from './datos';

export function EnviarCorreoPermisosModal({ u, onClose, onEnviar }: { u:Usuario; onClose:()=>void; onEnviar:(correos:string[], mensaje:string)=>void }) {
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
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:440, boxShadow:'0 16px 48px rgba(0,0,0,.2)', fontFamily:F }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:14, fontWeight:600, color:C.n900 }}>Enviar por correo</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700 }}><IcClose className="w-4 h-4"/></button>
        </div>
        <div style={{ padding:'18px 24px' }}>
          <div style={{ background:'#F9F9F9', border:`1px solid ${C.n500}`, borderRadius:radius.md, padding:'10px 12px', marginBottom:14 }}>
            <p style={{ fontSize:10, fontWeight:600, color:'#757575', textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 6px' }}>Se va a enviar</p>
            <p style={{ fontSize:12, fontWeight:600, color:C.n900, margin:0 }}>Detalle de permisos · {u.descripcion} ({u.usuario})</p>
          </div>

          <p style={{ fontSize:11, color:'#0F0F0F', margin:'0 0 5px' }}>Destinatarios</p>
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

          <p style={{ fontSize:11, color:'#0F0F0F', margin:'14px 0 5px' }}>Mensaje (opcional)</p>
          <textarea value={mensaje} onChange={e=>setMensaje(e.target.value)} rows={3} placeholder="Agregá una nota para quien lo reciba..."
            style={{ width:'100%', padding:'8px 10px', border:`1px solid ${C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box', resize:'vertical' }}/>
        </div>
        <div style={{ padding:'12px 24px', borderTop:`1px solid ${C.n500}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={enviar} style={{ height:34, padding:'0 16px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Enviar</button>
        </div>
      </div>
    </div>
  );
}
// ── Modal: crear usuario ──────────────────────────────────────────────────────
export function CrearUsuarioModal({ plantillas, onClose, onSave }: { plantillas:PlantillaPermiso[]; onClose:()=>void; onSave:(u:Usuario)=>void }) {
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
  const Field = ({ label, children }: { label:string; children:React.ReactNode }) => (
    <div><label style={{ fontSize:11, fontWeight:500, color:C.n700, display:'block', marginBottom:5 }}>{label}</label>{children}</div>
  );
  const inputStyle = (err?:string): React.CSSProperties => ({ width:'100%', height:36, padding:'0 10px', border:`1px solid ${err?C.error:C.n500}`, borderRadius:radius.md, fontSize:12, fontFamily:F, outline:'none', boxSizing:'border-box', background:'#FFFFFF' });

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:520, padding:24, fontFamily:F, boxShadow:'0 8px 40px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()}>
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
          <button onClick={onClose} style={{ height:36, padding:'0 18px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:13, fontFamily:F, color:'#757575' }}>Cancelar</button>
          <button onClick={guardar} style={{ height:36, padding:'0 20px', border:'none', borderRadius:radius.md, background:BRAND, color:'#FFFFFF', cursor:'pointer', fontSize:13, fontFamily:F, fontWeight:500 }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
// ── Modales de confirmación genéricos ────────────────────────────────────────
export function ModalConfirm({ title, message, confirmLabel, danger, onCancel, onConfirm }: {
  title:string; message:string; confirmLabel:string; danger?:boolean; onCancel:()=>void; onConfirm:()=>void;
}) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onCancel}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:400, padding:'28px 24px', textAlign:'center', fontFamily:F, boxShadow:'0 8px 40px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ width:44, height:44, borderRadius:'50%', border:`2px solid ${danger?C.error:BRAND}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', color: danger?C.error:BRAND, fontSize:20, fontWeight:700 }}>!</div>
        <p style={{ fontSize:14, fontWeight:600, color:C.n900, margin:'0 0 8px' }}>{title}</p>
        <p style={{ fontSize:12, color:C.n700, margin:'0 0 20px', lineHeight:1.5 }}>{message}</p>
        <div style={{ display:'flex', justifyContent:'center', gap:10 }}>
          <button onClick={onCancel} style={{ height:36, padding:'0 18px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={onConfirm} style={{ height:36, padding:'0 18px', border:'none', borderRadius:radius.md, background:danger?C.error:BRAND, color:'#FFFFFF', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
// Restablecer contraseña: reemplaza el campo de contraseña falso (siempre en
// puntos, sin ninguna función real) por una acción real con su propio
// mostrar/ocultar, en vez de fingir que se puede ver la contraseña actual -
// eso no debería ser posible nunca, solo restablecerla.
export function ResetPasswordModal({ usuario, onClose, onSave }: { usuario:Usuario; onClose:()=>void; onSave:()=>void }) {
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
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:380, padding:'24px', fontFamily:F, boxShadow:'0 8px 40px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()}>
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
          <button onClick={onClose} style={{ height:36, padding:'0 18px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:13, fontFamily:F, color:'#757575' }}>Cancelar</button>
          <button onClick={guardar} style={{ height:36, padding:'0 20px', border:'none', borderRadius:radius.md, background:BRAND, color:'#FFFFFF', cursor:'pointer', fontSize:13, fontFamily:F, fontWeight:500 }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
// también a los usuarios que la tienen asociada, o solo actualizar la plantilla.
export function ModalGuardarPlantilla({ nombre, cantUsuarios, onCancel, onSoloPlantilla, onPlantillaYUsuarios }: {
  nombre:string; cantUsuarios:number; onCancel:()=>void; onSoloPlantilla:()=>void; onPlantillaYUsuarios:()=>void;
}) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onCancel}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:440, padding:'28px 24px', textAlign:'center', fontFamily:F, boxShadow:'0 8px 40px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ width:44, height:44, borderRadius:'50%', border:`2px solid ${BRAND}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', color:BRAND, fontSize:20, fontWeight:700 }}>!</div>
        <p style={{ fontSize:14, fontWeight:600, color:C.n900, margin:'0 0 8px' }}>¿Cómo querés guardar "{nombre}"?</p>
        <p style={{ fontSize:12, color:C.n700, margin:'0 0 20px', lineHeight:1.5 }}>
          {cantUsuarios} usuario{cantUsuarios===1?'':'s'} tiene{cantUsuarios===1?'':'n'} este rol asociado. Podés actualizar solo el rol (no les cambia nada hasta que lo vuelvan a aplicar), o actualizar también sus permisos ahora mismo.
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <button onClick={onPlantillaYUsuarios} style={{ height:38, border:'none', borderRadius:radius.md, background:BRAND, color:'#FFFFFF', cursor:'pointer', fontSize:12.5, fontWeight:500, fontFamily:F }}>
            Actualizar rol y usuarios asociados
          </button>
          <button onClick={onSoloPlantilla} style={{ height:38, border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', color:C.n900, cursor:'pointer', fontSize:12.5, fontFamily:F }}>
            Actualizar solo el rol
          </button>
          <button onClick={onCancel} style={{ height:32, border:'none', background:'none', color:C.n700, cursor:'pointer', fontSize:12, fontFamily:F, marginTop:2 }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
export function SaveAsTemplateModal({ onClose, onSave, plantillas, defaultNombre, motivo }: {
  onClose:()=>void; onSave:(nombre:string)=>void; plantillas:PlantillaPermiso[]; defaultNombre?:string; motivo?:string;
}) {
  const [nombre, setNombre] = useState(defaultNombre ?? '');
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:400, padding:'28px 24px', textAlign:'center', fontFamily:F, boxShadow:'0 8px 40px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()}>
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
          <button onClick={onClose} style={{ height:36, padding:'0 18px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
          <button onClick={()=>nombre.trim() && onSave(nombre.trim())} style={{ height:36, padding:'0 18px', border:'none', borderRadius:radius.md, background:BRAND, color:'#FFFFFF', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Sí, confirmar</button>
        </div>
      </div>
    </div>
  );
}
