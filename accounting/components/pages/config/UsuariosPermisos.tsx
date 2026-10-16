'use client';
import React, { useState } from 'react';
import { Toast, PageHeader } from '../../ui/primitives';
import { C, radius, PAGE_PAD, PERMISOS_ACTUAL } from '../../ui/tokens';
import { BotonExportarUnico, ExportListModal } from '../../ui/exportar';
import { SearchInput } from '../../ui/filtros';
import { IcPlus, IcClose, IcLock, IcNoCircle, IcExport } from '../../ui/icons';
import PermissionTree from './PermissionTree';
import { USUARIOS_INIT, PLANTILLAS_INIT, Usuario, PlantillaPermiso, totalLeavesInTree, FIRMANTES_INIT, Firmantes } from './permissionsData';
import { UsuariosTab } from './usuariosPermisos/UsuariosTab';
import { BRAND, F, type Modo, exportarPermisosPorUsuario } from './usuariosPermisos/datos';
import { CrearUsuarioModal, ModalConfirm, ModalGuardarPlantilla, SaveAsTemplateModal } from './usuariosPermisos/modales';
import { PlantillasTab, SelectFiltro, setsIguales } from './usuariosPermisos/piezas';

export default function UsuariosPermisos() {
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
    setDraft(prev=>{ const n=new Set(prev); n.has(key)?n.delete(key):n.add(key); return n; });
    setDirty(true);
  }
  function setMany(keys:string[], value:boolean) {
    setDraft(prev=>{ const n=new Set(prev); keys.forEach(k=>value?n.add(k):n.delete(k)); return n; });
    setDirty(true);
  }

  // ── Guardado en modo usuario ──
  // Si el usuario tiene un rol aplicado pero le agregaron/quitaron permisos
  // sueltos, ya no es realmente ese rol - hay que guardarlo como uno nuevo en
  // vez de dejar al usuario asociado a un rol cuyos permisos ya no coinciden.
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
    // Los 3 botones de exportar de esta pantalla (usuarios, detalle de
    // permisos, roles) requieren el permiso "Exportar permisos" (Usuarios y
    // Permisos → Usuarios → Exportar permisos) - antes cualquiera con acceso
    // a esta pantalla podía descargarlos sin restricción.
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
        <div style={{ background:'#FFFFFF', borderBottom:`1px solid ${C.n500}`, padding:'0 24px', display:'flex', gap:4, flexShrink:0 }}>
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
            <div style={{ display:'flex', gap:16, alignItems:'flex-end', flexWrap:'wrap', marginBottom:16, background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:10, padding:'14px 16px' }}>
              <div style={{ minWidth:200 }}>
                <p style={{ fontSize:10, fontWeight:600, color:'#757575', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 6px' }}>Usuario</p>
                <SelectFiltro value={modo.userId} minWidth={200} onChange={e=>{ const u = usuarios.find(x=>x.id===Number(e.target.value)); if (u) abrirGestionUsuario(u); }}>
                  {usuarios.map(u=><option key={u.id} value={u.id}>{u.descripcion} - {u.usuario}</option>)}
                </SelectFiltro>
              </div>
              <div style={{ minWidth:190 }}>
                <p style={{ fontSize:10, fontWeight:600, color:'#757575', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 6px' }}>Rol</p>
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
                <p style={{ fontSize:10, fontWeight:600, color:'#757575', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 6px' }}>Buscar en permisos</p>
                <SearchInput value={search} onChange={setSearch} placeholder="Buscar sección u opción…" width="100%" />
              </div>
              <button onClick={limpiarDraft} title="Quita todos los permisos del usuario (queda pendiente hasta que le des Guardar)"
                style={{ display:'flex', alignItems:'center', gap:6, height:36, padding:'0 14px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F, color:C.n700, whiteSpace:'nowrap' }}>
                <IcNoCircle className="w-3.5 h-3.5"/> Limpiar permisos
              </button>
            </div>
            <p style={{ fontSize:12, color:C.n700, margin:'0 0 8px' }}>
              {usuarioActual?.descripcion} &nbsp;·&nbsp; <strong style={{color:C.n900}}>{draft.size}/{total}</strong> permisos activos
              {rolBase && <>&nbsp;·&nbsp; Rol: <strong style={{color:C.n900}}>{rolBase.nombre}</strong></>}
            </p>
            {permisosDivergenDelRol && (
              <div style={{ display:'flex', alignItems:'center', gap:8, background:C.brandBg, border:`1px solid ${C.brandBd}`, borderRadius:radius.md, padding:'8px 12px', marginBottom:12, fontSize:11.5, color:'#633806' }}>
                Cambiaste permisos fuera de lo que trae el rol "{rolBase?.nombre}". Al guardar, se va a crear un rol nuevo con estos permisos en vez de sobrescribir el original.
              </div>
            )}
            <PermissionTree perms={draft} onToggleLeaf={toggleLeaf} onSetMany={setMany} search={search}
              usuarios={usuarios} firmantes={firmantes} onToggleFirmante={toggleFirmante}/>
          </div>
        )}

        {modo.kind==='permisos-plantilla' && plantillaActual && (
          <div>
            <p style={{ fontSize:12, color:C.n700, margin:'0 0 12px' }}>
              Editando el rol <strong style={{color:C.n900}}>{plantillaActual.nombre}</strong> &nbsp;·&nbsp; <strong style={{color:C.n900}}>{draft.size}/{total}</strong> permisos activos &nbsp;·&nbsp; {plantillaActual.usuarios} usuario{plantillaActual.usuarios===1?'':'s'} lo tiene{plantillaActual.usuarios===1?'':'n'} asociado
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
          <div style={{ background:'#FFFFFF', borderRadius:radius.lg, width:400, padding:'28px 24px', textAlign:'center', fontFamily:F, boxShadow:'0 8px 40px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()}>
            <div style={{ width:44, height:44, borderRadius:'50%', border:'2px solid #E24B4A', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', color:C.error }}><IcClose className="w-5 h-5"/></div>
            <p style={{ fontSize:14, fontWeight:600, color:C.n900, margin:'0 0 8px' }}>Eliminar "{plantillaAEliminar.nombre}"</p>
            <p style={{ fontSize:12, color:C.n700, margin:'0 0 20px', lineHeight:1.5 }}>
              Este rol está aplicado a {plantillaAEliminar.usuarios} usuarios. Eliminarlo no les quita los permisos que ya tienen, pero no vas a poder volver a aplicarlo ni ver que lo usan.
            </p>
            <div style={{ display:'flex', justifyContent:'center', gap:10 }}>
              <button onClick={()=>setPlantillaAEliminar(null)} style={{ height:36, padding:'0 18px', border:`1px solid ${C.n500}`, borderRadius:radius.md, background:'#FFFFFF', cursor:'pointer', fontSize:12, fontFamily:F }}>Cancelar</button>
              <button onClick={eliminarPlantilla} style={{ height:36, padding:'0 18px', border:'none', borderRadius:radius.md, background:C.error, color:'#FFFFFF', cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:F }}>Eliminar de todos modos</button>
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
          rows={plantillas.map(p=>({ rol:p.nombre, usuarios:p.usuarios, permisos:`${p.permisos.size}/${total}` }))}
          onClose={()=>setShowExportarRoles(false)}
        />
      )}
    </div>
  );
}
