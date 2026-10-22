'use client';
import { Toast, PageHeader } from '@/components/ui/primitives';
import { C, radius, PAGE_PAD } from '@/components/ui/tokens';
import { ExportListModal } from '@/components/ui/exportar';
import { SearchInput } from '@/components/ui/filtros';
import { IcClose, IcLock } from '@/components/ui/icons';
import PermissionTree from './PermissionTree';
import { UsuariosTab } from './usuariosPermisos/UsuariosTab';
import { BRAND, F } from './usuariosPermisos/datos';
import { CrearUsuarioModal, ModalConfirm, ModalGuardarPlantilla, SaveAsTemplateModal } from './usuariosPermisos/modales';
import { PlantillasTab, SelectFiltro } from './usuariosPermisos/piezas';
import { useUsuariosPermisos } from './usuariosPermisos/useUsuariosPermisos';
import { PermisosUsuario } from './usuariosPermisos/PermisosUsuario';

export default function UsuariosPermisos() {
  const e = useUsuariosPermisos();
  const { headerTitle, modo, plantillaActual, headerActions, usuarioActual, setModo, activeTab, usuarios, setUsuarios, abrirGestionUsuario, plantillas, busqUsuarios, setBusqUsuarios, mostrarInactivos, setMostrarInactivos, abrirEditarPlantilla, duplicarPlantilla, setPlantillaAEliminar, draft, total, search, setSearch, toggleLeaf, setMany, firmantes, toggleFirmante, showCrearUsuario, setShowCrearUsuario, setToast, pendingApplyTemplate, setPendingApplyTemplate, aplicarPlantillaAUsuario, showConfirmSaveUser, setShowConfirmSaveUser, confirmarGuardadoUsuario, showSaveAsTemplate, setShowSaveAsTemplate, guardarComoNuevaPlantilla, permisosDivergenDelRol, rolBase, showSaveTemplateChanges, setShowSaveTemplateChanges, guardarSoloPlantilla, guardarPlantillaYUsuarios, plantillaAEliminar, eliminarPlantilla, toast, showExportarUsuarios, usuariosParaExportar, rolDeUsuario, setShowExportarUsuarios, showExportarRoles, setShowExportarRoles } = e;
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
            <SelectFiltro ariaLabel="Usuario" value={''} minWidth={240} onChange={e=>{ const u=usuarios.find(x=>x.id===Number(e.target.value)); if (u) abrirGestionUsuario(u); }}>
              <option value="">Elegí un usuario...</option>
              {usuarios.map(u=><option key={u.id} value={u.id}>{u.descripcion} - {u.usuario}</option>)}
            </SelectFiltro>
          </div>
        )}

        {modo.kind==='permisos-usuario' && <PermisosUsuario e={e} />}

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
            <p style={{ fontSize:14, fontWeight:600, color:C.n900, margin:'0 0 8px' }}>Eliminar &quot;{plantillaAEliminar.nombre}&quot;</p>
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
