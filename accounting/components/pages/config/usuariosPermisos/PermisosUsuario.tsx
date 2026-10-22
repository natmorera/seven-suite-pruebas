'use client';
import { C, radius } from '@/components/ui/tokens';
import { SearchInput } from '@/components/ui/filtros';
import { IcNoCircle } from '@/components/ui/icons';
import PermissionTree from '../PermissionTree';
import { F } from './datos';
import { SelectFiltro } from './piezas';
import { type EstadoUsuariosPermisos } from './useUsuariosPermisos';

// Permisos del usuario seleccionado
export function PermisosUsuario({ e }: { e: EstadoUsuariosPermisos }) {
  const { modo, usuarios, abrirGestionUsuario, selectedPlantillaFilter, setSelectedPlantillaFilter, plantillas, setPendingApplyTemplate, search, setSearch, limpiarDraft, usuarioActual, draft, total, rolBase, permisosDivergenDelRol, toggleLeaf, setMany, firmantes, toggleFirmante } = e;
  if (modo.kind !== 'permisos-usuario') return null;
  return (
          <div>
            <div style={{ display:'flex', gap:16, alignItems:'flex-end', flexWrap:'wrap', marginBottom:16, background:'#FFFFFF', border:`1px solid ${C.n500}`, borderRadius:10, padding:'14px 16px' }}>
              <div style={{ minWidth:200 }}>
                <p style={{ fontSize:10.5, fontWeight:600, color:'#757575', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 6px' }}>Usuario</p>
                <SelectFiltro ariaLabel="Usuario" value={modo.userId} minWidth={200} onChange={e=>{ const u = usuarios.find(x=>x.id===Number(e.target.value)); if (u) abrirGestionUsuario(u); }}>
                  {usuarios.map(u=><option key={u.id} value={u.id}>{u.descripcion} - {u.usuario}</option>)}
                </SelectFiltro>
              </div>
              <div style={{ minWidth:190 }}>
                <p style={{ fontSize:10.5, fontWeight:600, color:'#757575', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 6px' }}>Rol</p>
                <SelectFiltro ariaLabel="Plantilla de permisos" value={selectedPlantillaFilter} minWidth={190} onChange={e=>{
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
                <p style={{ fontSize:10.5, fontWeight:600, color:'#757575', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 6px' }}>Buscar en permisos</p>
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
                Cambiaste permisos fuera de lo que trae el rol &quot;{rolBase?.nombre}&quot;. Al guardar, se va a crear un rol nuevo con estos permisos en vez de sobrescribir el original.
              </div>
            )}
            <PermissionTree perms={draft} onToggleLeaf={toggleLeaf} onSetMany={setMany} search={search}
              usuarios={usuarios} firmantes={firmantes} onToggleFirmante={toggleFirmante}/>
          </div>
  );
}
