'use client';
import React, { useState } from 'react';
import { Toast, Section, RowAction } from '../../../ui/primitives';
import { C, radius, TABLA } from '../../../ui/tokens';
import { SearchInput } from '../../../ui/filtros';
import { IcTrash, IcLock, IcNoCircle } from '../../../ui/icons';
import { Usuario, PlantillaPermiso } from '../permissionsData';
import { BRAND, F } from './datos';
import { ModalConfirm, ResetPasswordModal } from './modales';
import { DateCell, DetalleUsuarioPermisos, SwitchActivo } from './piezas';

export function UsuariosTab({ usuarios, setUsuarios, onGestionarPermisos, plantillas, busq, setBusq, mostrarInactivos, setMostrarInactivos }: {
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

  // Acciones cuadradas de 32x32 con el icono centrado (antes eran 26x26).
  const actionBtnStyle = (opts?: { danger?: boolean }): React.CSSProperties => ({
    // Mismo botón de acción que el resto de tablas: 28px, solo ícono, sin borde.
    width:28, height:28, borderRadius:radius.sm,
    border:'none', background:'transparent',
    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
    color:opts?.danger?C.error:C.n700, padding:0, flexShrink:0,
  });

  return (
    <Section title="Usuarios" hint="Tocá una fila para ver el detalle de permisos del usuario.">
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ flex:1, maxWidth:280 }}>
          <SearchInput value={busq} onChange={setBusq} placeholder="Buscar usuario…" width="100%" />
        </div>
        <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
          <input type="checkbox" checked={mostrarInactivos} onChange={e=>setMostrarInactivos(e.target.checked)} style={{ width:15, height:15, accentColor:BRAND, cursor:'pointer' }}/>
          <span style={{ fontSize:12.5, color:C.n900 }}>Mostrar inactivos</span>
        </label>
      </div>

      <div style={{ ...TABLA.wrap, overflow:'auto' }}>
        <table className="tabla" style={{ ...TABLA.table, minWidth:980, tableLayout:'fixed' }}>
          <colgroup>
            <col style={{ width:60 }}/><col style={{ width:110 }}/><col/><col style={{ width:110 }}/>
            <col style={{ width:120 }}/><col style={{ width:110 }}/>
            <col style={{ width:64 }}/><col style={{ width:110 }}/><col style={{ width:64 }}/><col style={{ width:116 }}/>
          </colgroup>
          <thead>
            <tr style={TABLA.headRow}>
              {['Nro.','Usuario','Descripción','Creación','Contraseña','Último cambio','Activo','Último acceso','Admin','Acciones'].map(h=>(
                <th key={h} style={TABLA.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(u=>(
              <tr key={u.id} onClick={()=>setDetalleUser(u)} style={{ borderBottom:'1px solid #ECECEC', cursor:'pointer' }}>
                <td style={{ padding:'8px 12px' }}>{u.id}</td>
                <td style={{ padding:'8px 12px', color:C.n900, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.usuario}</td>
                <td style={{ padding:'8px 12px', color:C.n900, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {u.descripcion}
                  {!u.activo && <span style={{ marginLeft:8, fontSize:10, padding:'2px 7px', borderRadius:10, background:'#F9F9F9', color:C.n700, fontWeight:600 }}>Inactivo</span>}
                </td>
                <DateCell value={u.fechaCreacion}/>
                <td style={{ padding:'8px 12px' }} onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>setResetPassUser(u)} style={{ display:'flex', alignItems:'center', gap:5, height:28, padding:'0 10px', border:`1px solid ${C.n500}`, borderRadius:radius.sm, background:'#FFFFFF', cursor:'pointer', fontSize:11, fontFamily:F, color:C.n700, whiteSpace:'nowrap' }}>
                    <IcLock className="w-3 h-3"/> Restablecer
                  </button>
                </td>
                <DateCell value={u.ultimoCambioClave}/>
                <td style={{ padding:'8px 12px' }} onClick={e=>e.stopPropagation()}>
                  <SwitchActivo activo={u.activo} onToggle={()=>patch(u.id,{activo:!u.activo})}/>
                </td>
                <DateCell value={u.ultimoAcceso}/>
                <td style={{ padding:'8px 12px' }} onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>patch(u.id,{admin: !u.admin})} style={{
                    width:20, height:20, borderRadius:5, border:`1px solid ${u.admin?BRAND:C.n500}`, background:u.admin?BRAND:'#FFFFFF',
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {u.admin && <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"><path d="M2.5 7l3.5 3.5L11.5 4"/></svg>}
                  </button>
                </td>
                <td style={{ padding:'8px 12px' }} onClick={e=>e.stopPropagation()}>
                  <div style={{ display:'flex', gap:6 }}>
                    <RowAction title="Ver permisos" onClick={()=>setDetalleUser(u)}><IcLock className="w-3.5 h-3.5"/></RowAction>
                    <RowAction title="Limpiar permisos" onClick={()=>setLimpiarUser(u)}><IcNoCircle className="w-3.5 h-3.5"/></RowAction>
                    <RowAction title="Eliminar" danger onClick={()=>eliminar(u.id)}><IcTrash className="w-3.5 h-3.5"/></RowAction>
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length===0 && (
              <tr><td colSpan={10} style={TABLA.empty}>Sin usuarios para mostrar.</td></tr>
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
    </Section>
  );
}
