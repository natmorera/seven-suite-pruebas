'use client';
import { useState } from 'react';
import { C, radius } from '../../../ui/tokens';
import { IcChevronDown, IcChevronRight } from '../../../ui/icons';
import { type PermModule, type PermGroup, type PermLeaf, type PermCategory } from '../permisos/tipos';
import { countLeaves, countChecked, allLeafKeysOfModule, leafIsChecked, allLeafKeysOfCategory, countCategory, countCheckedCategory, Firmantes, Usuario } from '../permissionsData';
import { F, matchesSearch } from './datos';
import { CategorizedLeaves, CountBadge, InfoNote, MarcarQuitar } from './piezas';

export function GroupCard({ group, perms, onToggleLeaf, onSetMany, search, usuarios, firmantes, onToggleFirmante }: {
  group: PermGroup; perms: Set<string>; onToggleLeaf:(k:string)=>void; onSetMany:(keys:string[], value:boolean)=>void; search:string;
  usuarios: Usuario[]; firmantes: Firmantes; onToggleFirmante:(leafKey:string, usuarioId:number)=>void;
}) {
  const total = group.leaves.length;
  const n = group.leaves.filter(l=>leafIsChecked(l, perms)).length;
  const leaves = search ? group.leaves.filter(l=>matchesSearch(l.label, search)) : group.leaves;
  if (search && leaves.length===0) return null;

  // Secciones "flat": solo un título que separa, sin acordeón - para no
  // forzar un clic extra por sección cuando la lista completa ya es corta
  // y no hace falta ocultarla (p.ej. Bandeja de asientos).
  if (group.flat) {
    return (
      <div style={{ marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:13, fontWeight:600, color:C.n900, fontFamily:F }}>{group.label}</span>
          {/* Se quitó el "Marcar todo / Quitar todo" de este nivel (sub-sección
              dentro de un módulo) - con 4 niveles seguidos (global, categoría,
              módulo, sub-sección) era demasiado ruido visual repetido para
              secciones que casi siempre tienen pocos permisos. El de Módulo,
              que ya cubre estos leaves, sigue disponible arriba. */}
          <CountBadge n={n} total={total}/>
        </div>
        {group.info && <InfoNote>{group.info}</InfoNote>}
        <CategorizedLeaves leaves={leaves} perms={perms} onToggleLeaf={onToggleLeaf} onSetMany={onSetMany}
          usuarios={usuarios} firmantes={firmantes} onToggleFirmante={onToggleFirmante}/>
      </div>
    );
  }

  return <GroupCardAccordion group={group} perms={perms} onToggleLeaf={onToggleLeaf} onSetMany={onSetMany}
    leaves={leaves} n={n} total={total} search={search} usuarios={usuarios} firmantes={firmantes} onToggleFirmante={onToggleFirmante}/>;
}
export function GroupCardAccordion({ group, perms, onToggleLeaf, onSetMany, leaves, n, total, search, usuarios, firmantes, onToggleFirmante }: {
  group: PermGroup; perms: Set<string>; onToggleLeaf:(k:string)=>void; onSetMany:(keys:string[], value:boolean)=>void;
  leaves: PermLeaf[]; n:number; total:number; search:string;
  usuarios: Usuario[]; firmantes: Firmantes; onToggleFirmante:(leafKey:string, usuarioId:number)=>void;
}) {
  const [open, setOpen] = useState(false);
  const isOpen = open || !!search;
  return (
    <div style={{ border:`1px solid ${C.n500}`, borderRadius:radius.md, marginBottom:8, overflow:'hidden' }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'10px 12px', background: isOpen ? '#FAF7F0' : '#FFFFFF', border:'none', cursor:'pointer', textAlign:'left' }}>

        <span style={{ display:'flex', alignItems:'center', gap:8 }}>
          {isOpen ? <IcChevronDown className="w-3.5 h-3.5" style={{color:C.n700}}/> : <IcChevronRight className="w-3.5 h-3.5" style={{color:C.n700}}/>}
          <span style={{ fontSize:13, fontWeight:500, color:C.n900, fontFamily:F }}>{group.label}</span>
        </span>
        <CountBadge n={n} total={total}/>
      </button>
      {isOpen && (
        <div style={{ padding:'10px 14px' }}>
          {group.info && <InfoNote>{group.info}</InfoNote>}
          {/* Mismo criterio que en la variante "flat" de GroupCard: sin
              Marcar/Quitar todo a nivel de sub-sección - queda solo en
              Módulo, Categoría y Global. */}
          <CategorizedLeaves leaves={leaves} perms={perms} onToggleLeaf={onToggleLeaf} onSetMany={onSetMany}
            usuarios={usuarios} firmantes={firmantes} onToggleFirmante={onToggleFirmante}/>
        </div>
      )}
    </div>
  );
}
export function ModuleCard({ mod, perms, onToggleLeaf, onSetMany, search, usuarios, firmantes, onToggleFirmante }: {
  mod: PermModule; perms: Set<string>; onToggleLeaf:(k:string)=>void; onSetMany:(keys:string[], value:boolean)=>void; search:string;
  usuarios: Usuario[]; firmantes: Firmantes; onToggleFirmante:(leafKey:string, usuarioId:number)=>void;
}) {
  const [open, setOpen] = useState(false);
  const total = countLeaves(mod);
  const n = countChecked(mod, perms);

  // Si hay búsqueda activa, filtrar y auto-expandir si hay coincidencias
  const modMatches = matchesSearch(mod.label, search);
  let visibleLeaves = mod.leaves;
  let visibleGroups = mod.groups;
  if (search && !modMatches) {
    visibleLeaves = mod.leaves?.filter(l=>matchesSearch(l.label, search));
    visibleGroups = mod.groups; // los subgrupos filtran internamente
    const groupsHaveMatch = mod.groups?.some(g=>g.leaves.some(l=>matchesSearch(l.label, search)) || matchesSearch(g.label, search));
    if ((!visibleLeaves || visibleLeaves.length===0) && !groupsHaveMatch) return null;
  }
  const isOpen = open || !!search;

  return (
    <div style={{ border:`1px solid ${C.n500}`, borderRadius:10, marginBottom:10, overflow:'hidden', background:'#FFFFFF' }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'12px 14px', background:'#FFFFFF', border:'none', cursor:'pointer', textAlign:'left' }}>
        <span style={{ display:'flex', alignItems:'center', gap:8 }}>
          {isOpen ? <IcChevronDown className="w-3.5 h-3.5" style={{color:C.n700}}/> : <IcChevronRight className="w-3.5 h-3.5" style={{color:C.n700}}/>}
          <span style={{ fontSize:14, fontWeight:600, color:C.n900, fontFamily:F }}>{mod.label}</span>
        </span>
        <CountBadge n={n} total={total}/>
      </button>
      {isOpen && (
        <div style={{ padding:'0 14px 12px' }}>
          {/* Marcar/Quitar todo el módulo: aplica a los leaves directos Y a los de todos
              los grupos/subsecciones, para no tener que abrir cada subsección una por una. */}
          <MarcarQuitar onMarcar={()=>onSetMany(allLeafKeysOfModule(mod), true)} onQuitar={()=>onSetMany(allLeafKeysOfModule(mod), false)}/>
          {mod.leaves && (
            <CategorizedLeaves leaves={visibleLeaves ?? mod.leaves} perms={perms} onToggleLeaf={onToggleLeaf} onSetMany={onSetMany}
              usuarios={usuarios} firmantes={firmantes} onToggleFirmante={onToggleFirmante}/>
          )}
          {mod.groups && (visibleGroups ?? mod.groups).map(g=>(
            <GroupCard key={g.key} group={g} perms={perms} onToggleLeaf={onToggleLeaf} onSetMany={onSetMany} search={search}
              usuarios={usuarios} firmantes={firmantes} onToggleFirmante={onToggleFirmante}/>
          ))}
        </div>
      )}
    </div>
  );
}
export function CategoryHeader({ cat, perms, onSetMany }: { cat: PermCategory; perms:Set<string>; onSetMany:(keys:string[], value:boolean)=>void }) {
  const total = countCategory(cat);
  const n = countCheckedCategory(cat, perms);
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
      <span style={{ display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:11, fontWeight:600, color:C.n700, letterSpacing:'.06em', fontFamily:F }}>{cat.label}</span>
        <CountBadge n={n} total={total}/>
      </span>
      <MarcarQuitar onMarcar={()=>onSetMany(allLeafKeysOfCategory(cat), true)} onQuitar={()=>onSetMany(allLeafKeysOfCategory(cat), false)}/>
    </div>
  );
}
