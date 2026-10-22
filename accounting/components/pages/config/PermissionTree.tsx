'use client';
import { C, radius } from '@/components/ui/tokens';
import { PERMISSIONS_TREE, allLeafKeysGlobal, countCategory, countCheckedCategory, type Firmantes, type Usuario } from './permissionsData';
import { CategoryHeader, ModuleCard } from './permissionTree/GroupCard';
import { F } from './permissionTree/datos';
import { CountBadge, MarcarQuitar } from './permissionTree/piezas';

export default function PermissionTree({ perms, onToggleLeaf, onSetMany, search = '', usuarios, firmantes, onToggleFirmante }: {
  perms: Set<string>;
  onToggleLeaf: (key:string) => void;
  onSetMany: (keys:string[], value:boolean) => void;
  search?: string;
  usuarios: Usuario[];
  firmantes: Firmantes;
  onToggleFirmante: (leafKey:string, usuarioId:number) => void;
}) {
  const totalGlobal = PERMISSIONS_TREE.reduce((s,c)=>s+countCategory(c),0);
  const nGlobal = PERMISSIONS_TREE.reduce((s,c)=>s+countCheckedCategory(c, perms),0);
  return (
    <div>
      {/* Marcar o quitar todo el árbol, además de por categoría (Operativo, Parámetros) y por
          módulo. */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', border:`1px solid ${C.n500}`, borderRadius:radius.md, padding:'8px 12px', marginBottom:14, background:'#F9F9F9' }}>
        <span style={{ fontSize:11.5, fontFamily:F, color:C.n900 }}>
          Todos los permisos &nbsp;·&nbsp; <CountBadge n={nGlobal} total={totalGlobal}/>
        </span>
        <MarcarQuitar onMarcar={()=>onSetMany(allLeafKeysGlobal(), true)} onQuitar={()=>onSetMany(allLeafKeysGlobal(), false)}/>
      </div>
      {PERMISSIONS_TREE.map(cat => (
        <div key={cat.key} style={{ marginBottom:18 }}>
          <CategoryHeader cat={cat} perms={perms} onSetMany={onSetMany}/>
          {cat.modules.map(mod => (
            <ModuleCard key={mod.key} mod={mod} perms={perms} onToggleLeaf={onToggleLeaf} onSetMany={onSetMany} search={search}
              usuarios={usuarios} firmantes={firmantes} onToggleFirmante={onToggleFirmante}/>
          ))}
        </div>
      ))}
    </div>
  );
}
