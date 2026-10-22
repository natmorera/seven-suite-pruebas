'use client';
import React, { useState } from 'react';
import { C, radius, PERMISOS_ACTUAL } from '@/components/ui/tokens';
import { BotonExportarUnico } from '@/components/ui/exportar';
import { IcPlus, IcExport } from '@/components/ui/icons';
import { USUARIOS_INIT, PLANTILLAS_INIT, type Usuario, type PlantillaPermiso, totalLeavesInTree, FIRMANTES_INIT, type Firmantes } from '../permissionsData';
import { BRAND, F, type Modo, exportarPermisosPorUsuario } from './datos';
import { setsIguales } from './piezas';

export function useUsuariosPermisos() {
  const [modo, setModo] = useState<Modo>({ kind:'usuarios' });
  const [usuarios, setUsuarios] = useState<Usuario[]>(USUARIOS_INIT);
  const [plantillas, setPlantillas] = useState<PlantillaPermiso[]>(PLANTILLAS_INIT);
  // Firmantes: quiénes están autorizados a firmar cada reporte. Es una lista
  // compartida (por reporte, no por usuario ni por rol) - independiente de a
  // quién le estés editando los permisos en un momento dado.
  const [firmantes, setFirmantes] = useState<Firmantes>(FIRMANTES_INIT);
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
    setDraft(prev=>{ const n=new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
    setDirty(true);
  }
  function setMany(keys:string[], value:boolean) {
    setDraft(prev=>{ const n=new Set(prev); keys.forEach(k=>value?n.add(k):n.delete(k)); return n; });
    setDirty(true);
  }

  // ── Guardado en modo usuario ── Si el usuario tiene un rol aplicado y se le agregan o quitan
  // permisos sueltos, deja de ser ese rol: se guarda como uno nuevo.
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
    // Los tres botones de exportar de esta pantalla (usuarios, detalle de permisos, roles)
    // requieren el permiso «Exportar permisos» (Usuarios y Permisos › Usuarios).
    const puedeExportar = PERMISOS_ACTUAL.puedeExportarPermisosUsuarios;
    headerActions = (
      <div style={{ display:'flex', gap:8 }}>
        {puedeExportar && <BotonExportarUnico onClick={()=>setShowExportarUsuarios(true)}/>}
        {puedeExportar && (
          <button onClick={()=>{ exportarPermisosPorUsuario(usuarios, plantillas); setToast('Permisos exportados'); }}
            title="Descarga un CSV con el detalle de permisos de cada usuario"
            style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F, color:C.n700, display:'flex', alignItems:'center', gap:6 }}>
            <IcExport className="w-3.5 h-3.5"/> Exportar permisos
          </button>
        )}
        <button onClick={()=>setShowCrearUsuario(true)} style={{ height:34, padding:'0 16px', background:BRAND, color:'#FFFFFF', border:'none', borderRadius:radius.md, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F, display:'flex', alignItems:'center', gap:6 }}>
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
        <button onClick={()=>setModo({kind:'usuarios'})} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F, color:'#757575' }}>Cancelar</button>
        <button onClick={()=>setShowSaveAsTemplate(true)} style={{ height:34, padding:'0 16px', border:`1px solid ${BRAND}`, borderRadius:radius.md, background:C.brandBg, color:BRAND, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Guardar como rol</button>
        <button onClick={()=>{ if (permisosDivergenDelRol) setShowSaveAsTemplate(true); else setShowConfirmSaveUser(true); }} disabled={!dirty} style={{ height:34, padding:'0 18px', border:'none', borderRadius:radius.md, background:dirty?BRAND:'#ECECEC', color:'#FFFFFF', cursor:dirty?'pointer':'default', fontSize:12, fontWeight:500, fontFamily:F }}>Guardar</button>
      </div>
    );
  } else if (modo.kind === 'permisos-plantilla') {
    headerActions = (
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={descartarYVolver} style={{ height:34, padding:'0 16px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F, color:'#757575' }}>Descartar cambios</button>
        <button onClick={()=>setShowSaveTemplateChanges(true)} disabled={!dirty} style={{ height:34, padding:'0 18px', border:'none', borderRadius:radius.md, background:dirty?BRAND:'#ECECEC', color:'#FFFFFF', cursor:dirty?'pointer':'default', fontSize:12, fontWeight:500, fontFamily:F }}>Guardar rol</button>
      </div>
    );
  }

  const activeTab: 'usuarios'|'permisos'|'plantillas' =
    (modo.kind==='permisos-usuario' || modo.kind==='permisos-empty') ? 'permisos'
      : modo.kind==='permisos-plantilla' ? 'plantillas' : modo.kind;
  return { modo, setModo, usuarios, setUsuarios, plantillas, setPlantillas, firmantes, setFirmantes, toggleFirmante, busqUsuarios, setBusqUsuarios, mostrarInactivos, setMostrarInactivos, showCrearUsuario, setShowCrearUsuario, draft, setDraft, dirty, setDirty, search, setSearch, selectedPlantillaFilter, setSelectedPlantillaFilter, pendingApplyTemplate, setPendingApplyTemplate, showConfirmSaveUser, setShowConfirmSaveUser, showSaveAsTemplate, setShowSaveAsTemplate, showSaveTemplateChanges, setShowSaveTemplateChanges, plantillaAEliminar, setPlantillaAEliminar, toast, setToast, showExportarUsuarios, setShowExportarUsuarios, showExportarRoles, setShowExportarRoles, total, rolDeUsuario, usuariosParaExportar, abrirGestionUsuario, abrirEditarPlantilla, descartarYVolver, toggleLeaf, setMany, rolBase, permisosDivergenDelRol, confirmarGuardadoUsuario, aplicarPlantillaAUsuario, guardarComoNuevaPlantilla, duplicarPlantilla, limpiarDraft, plantillaActual, guardarSoloPlantilla, guardarPlantillaYUsuarios, eliminarPlantilla, usuarioActual, headerTitle, headerActions, activeTab };
}

export type EstadoUsuariosPermisos = ReturnType<typeof useUsuariosPermisos>;
