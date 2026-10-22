'use client';
import React, { useState } from 'react';
import { Toast, Section, RowAction } from '@/components/ui/primitives';
import { C, radius, shadow, TABLA } from '@/components/ui/tokens';
import { DataTable, DataRow, Td } from '@/components/ui/tabla';
import { IcEdit, IcTrash, IcClose, IcCopy, IcMail, IcPrinter } from '@/components/ui/icons';
import { type Usuario, type PlantillaPermiso, totalLeavesInTree, permisosAgrupadosPorUsuario } from '../permissionsData';
import { BRAND, F, exportarDetalleUsuarioPDF, filterInputStyle } from './datos';
import { EnviarCorreoPermisosModal } from './modales';

export function setsIguales(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}
export function SelectFiltro({ value, onChange, children, minWidth, disabled, ariaLabel }: {
  value: string|number; onChange:(e:React.ChangeEvent<HTMLSelectElement>)=>void; children:React.ReactNode; minWidth?:number; disabled?:boolean; ariaLabel?:string;
}) {
  return (
    <div style={{ position:'relative', minWidth }}>
      <select aria-label={ariaLabel} value={value} onChange={onChange} disabled={disabled} style={{ ...filterInputStyle(disabled), width:'100%', paddingRight:28 }}>
        {children}
      </select>
      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke={C.n700} strokeWidth="1.5" strokeLinecap="round"
        style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
        <path d="M3.5 5.25L7 8.75L10.5 5.25"/>
      </svg>
    </div>
  );
}
export function DetalleUsuarioPermisos({ u, plantillas, onClose }: { u:Usuario; plantillas:PlantillaPermiso[]; onClose:()=>void }) {
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
      <div className="detalle-usuario-dialog" style={{ background:'#FFFFFF', borderRadius:radius.lg, width:'100%', maxWidth:640, maxHeight:'88vh', overflowY:'auto', boxShadow:shadow.modal, fontFamily:F }} onClick={e=>e.stopPropagation()}>

        {/* Barra superior */}
        <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.n500}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:14, fontWeight:600, color:C.n900 }}>Permisos del usuario</span>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button onClick={()=>setShowCorreo(true)} title="Enviar por correo"
              style={{ display:'flex', alignItems:'center', gap:6, height:32, padding:'0 12px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F, color:C.n700 }}>
              <IcMail className="w-3.5 h-3.5"/> Enviar por correo
            </button>
            <button onClick={exportarPDF} disabled={exportando} title="Exportar"
              style={{ display:'flex', alignItems:'center', gap:6, height:32, padding:'0 12px', border:'none', borderRadius:radius.md, background:BRAND, color:'#FFFFFF', cursor:exportando?'default':'pointer', opacity:exportando?.7:1, fontSize:12, fontWeight:500, fontFamily:F }}>
              <IcPrinter className="w-3.5 h-3.5"/> {exportando ? 'Exportando...' : 'Exportar'}
            </button>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.n700 }}><IcClose className="w-4 h-4"/></button>
          </div>
        </div>

        <div style={{ padding:'22px 24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', borderBottom:`1px solid #ECECEC`, paddingBottom:12, marginBottom:16 }}>
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
            Permisos activos <span style={{ fontWeight:400, color:C.n700 }}>({u.permisos.size})</span>
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
// ── Tab: Usuarios ── Switch verde de estado (Activo): se lee como un estado encendido/apagado,
// no como una casilla de selección.
export function SwitchActivo({ activo, onToggle }: { activo:boolean; onToggle:()=>void }) {
  return (
    <button onClick={e=>{ e.stopPropagation(); onToggle(); }} title={activo?'Activo':'Inactivo'}
      style={{ width:36, height:20, borderRadius:radius.pill, border:'none', padding:2, boxSizing:'border-box',
        background:activo?C.success:'#ECECEC', cursor:'pointer', display:'flex', alignItems:'center',
        justifyContent:activo?'flex-end':'flex-start', transition:'background .15s' }}>
      <span style={{ width:16, height:16, borderRadius:'50%', background:'#FFFFFF', boxShadow:'0 1px 2px rgba(0,0,0,.25)', transition:'transform .15s' }}/>
    </button>
  );
}
// Celda de fecha: solo se ve la fecha (sin hora) para no saturar la tabla;
// al pasar el mouse, el title nativo del navegador muestra fecha y hora
// completas - no hace falta un tooltip propio para eso.
export function DateCell({ value }: { value:string }) {
  const soloFecha = value === '-' ? value : value.split(' ')[0];
  return (
    <td title={value === '-' ? undefined : value}
      style={{ padding:'10px 12px', color:C.n700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:value==='-'?'default':'help' }}>
      {soloFecha}
    </td>
  );
}
// ── Tab: Roles (solo la lista) ──────────────────────────────
export function PlantillasTab({ plantillas, onEditar, onDuplicar, onEliminarRequest }: {
  plantillas: PlantillaPermiso[]; onEditar:(p:PlantillaPermiso)=>void; onDuplicar:(p:PlantillaPermiso)=>void; onEliminarRequest:(p:PlantillaPermiso)=>void;
}) {
  const total = totalLeavesInTree();
  return (
    <Section title="Roles" hint="Plantillas de permisos que se asignan a los usuarios.">
      <DataTable headers={['Rol','Permisos','Usuarios','Acciones']}>
        {plantillas.length===0 && (
          <tr><td colSpan={4} style={TABLA.empty}>No hay roles creados.</td></tr>
        )}
        {plantillas.map(p=>(
          <DataRow key={p.id} onClick={()=>onEditar(p)}>
            <Td>{p.nombre}</Td>
            <Td>{p.permisos.size} de {total}</Td>
            <Td>{p.usuarios}</Td>
            <Td width="120px">
              <div style={{ display:'flex', gap:4 }}>
                <RowAction title="Editar rol" onClick={()=>onEditar(p)}><IcEdit className="w-3.5 h-3.5"/></RowAction>
                <RowAction title="Duplicar rol" onClick={()=>onDuplicar(p)}><IcCopy className="w-3.5 h-3.5"/></RowAction>
                <RowAction title="Eliminar rol" danger onClick={()=>onEliminarRequest(p)}><IcTrash className="w-3.5 h-3.5"/></RowAction>
              </div>
            </Td>
          </DataRow>
        ))}
      </DataTable>
    </Section>
  );
}
