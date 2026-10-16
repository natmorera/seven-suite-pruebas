// ── Modelo de datos de Usuarios y Permisos ──────────────────────────────────
import { CATEGORIA_OPERATIVO } from './permisos/arbolOperativo';
import { CATEGORIA_PARAMETROS } from './permisos/arbolParametros';
import { type PermCategory, type PermGroup, type PermLeaf, type PermModule } from './permisos/tipos';


// Estructura calcada de los módulos reales de la app (sidebar de navegación).
// Convención de nombres, para que no se sienta desordenado al leerlo:
//   - Todo permiso de solo consulta se llama "Ver <cosa>" (nunca "Visualización
//     de...", "Acceso a pantalla de...", etc. - eran 4 formas distintas de
//     decir lo mismo repartidas por el árbol).
//   - Las acciones siempre en modo imperativo: Crear, Editar, Eliminar,
//     Duplicar, Anular, Contabilizar, Exportar, Enviar por correo.
//   - Un solo "Ver" por pantalla - antes algunas pantallas tenían "acceso" Y
//     "visualización" como dos permisos separados para lo mismo.
export const PERMISSIONS_TREE: PermCategory[] = [
  CATEGORIA_OPERATIVO,
  CATEGORIA_PARAMETROS,
];

// ── Firma: ya no se pregunta por reporte/estado financiero acá - quién puede
// incluir su firma al exportar depende únicamente de si esa persona tiene su
// propia firma configurada (Mi cuenta > Mi firma), no de un permiso más que
// un administrador tenga que activar por cada reporte. isFirmaLeafKey queda
// solo para no romper el árbol de permisos por si algún leaf antiguo quedó
// con el sufijo ".firmar" en datos ya guardados - ningún leaf actual lo usa.
export function isFirmaLeafKey(key: string): boolean {
  return key.endsWith('.firmar');
}
export type Firmantes = Record<string, number[]>;
export const FIRMANTES_INIT: Firmantes = {};
export interface Usuario {
  id: number; usuario: string; descripcion: string; dias: number;
  activo: boolean; cambiarClave: boolean; admin: boolean;
  fechaCreacion: string; ultimoAcceso: string; ultimoCambioClave: string;
  permisos: Set<string>;
  plantillaId?: number | null;
}

// Todas las claves de permisos de todo el árbol (incluyendo una entrada por
// cada sub-opción de los leaves con subOptions) - se usa para el
// administrador por defecto (primer usuario), que siempre tiene acceso total.
function allLeafKeys(): string[] {
  const base = PERMISSIONS_TREE.flatMap(cat => cat.modules.flatMap(mod =>
    mod.leaves ? mod.leaves : (mod.groups ?? []).flatMap(g=>g.leaves)
  ));
  return base.flatMap(l => l.subOptions ? l.subOptions.map(o=>`${l.key}:${o}`) : [l.key]);
}
const PERM_TODOS = new Set(allLeafKeys());
const PERM_BASICO = new Set(['dashboard.card_asientos','dashboard.card_situacion','bandeja.view']);

const PERM_CONTADOR = new Set([
  'dashboard.card_asientos','dashboard.card_situacion','dashboard.card_estadobancos','dashboard.card_cxc',
  'dashboard.card_cxp','dashboard.card_icg','dashboard.card_conciliaciones','dashboard.card_iva',
  'bandeja.registrar:Manual','bandeja.registrar:Importado','bandeja.registrar:Duplicado',
  'bandeja.editar:Manual','bandeja.contabilizar:Manual','bandeja.contabilizar:Importado','bandeja.view',
  'analitico.view:Detalle','analitico.view_asientos','analitico.export:Individual','analitico.exportformato:PDF',
]);

export const USUARIOS_INIT: Usuario[] = [
  { id:1001, usuario:'jperez',    descripcion:'José Pérez',               dias:0, activo:true, cambiarClave:false, admin:false, fechaCreacion:'10/01/2026 08:30:00', ultimoAcceso:'13/08/2026 14:22:10', ultimoCambioClave:'10/01/2026 08:30:00', permisos:new Set(PERM_CONTADOR), plantillaId:1 },
  { id:1079, usuario:'dbonilla',  descripcion:'Daniel Bonilla',           dias:0, activo:true, cambiarClave:true,  admin:true, fechaCreacion:'22/12/2025 15:19:15', ultimoAcceso:'-', ultimoCambioClave:'07/08/2026 12:01:08', permisos:new Set(PERM_TODOS) },
  { id:1042, usuario:'kzamora',   descripcion:'Karen Zamora',             dias:0, activo:true, cambiarClave:false, admin:false, fechaCreacion:'03/02/2026 09:40:02', ultimoAcceso:'12/08/2026 08:12:44', ultimoCambioClave:'03/02/2026 09:40:02', permisos:new Set(PERM_BASICO) },
  { id:1032, usuario:'ldiaz',     descripcion:'Leslie Diaz',              dias:0, activo:true, cambiarClave:false, admin:false, fechaCreacion:'14/01/2026 11:05:30', ultimoAcceso:'11/08/2026 17:03:12', ultimoCambioClave:'14/01/2026 11:05:30', permisos:new Set(PERM_BASICO) },
  { id:1060, usuario:'lobando',   descripcion:'Leonor Obando Rodriguez',  dias:0, activo:true, cambiarClave:false, admin:false, fechaCreacion:'20/03/2026 14:22:10', ultimoAcceso:'10/08/2026 09:47:00', ultimoCambioClave:'20/03/2026 14:22:10', permisos:new Set(PERM_BASICO) },
  { id:1039, usuario:'lsandoval', descripcion:'Lorenzo Sandoval',         dias:0, activo:false, cambiarClave:false, admin:false, fechaCreacion:'02/02/2026 08:00:00', ultimoAcceso:'-', ultimoCambioClave:'02/02/2026 08:00:00', permisos:new Set(PERM_BASICO) },
  { id:1050, usuario:'lvalverde', descripcion:'Luis Valverde Murillo',    dias:0, activo:true, cambiarClave:false, admin:true,  fechaCreacion:'18/02/2026 10:15:45', ultimoAcceso:'13/08/2026 07:55:21', ultimoCambioClave:'18/02/2026 10:15:45', permisos:new Set(PERM_TODOS) },
];

// ── Roles (mock) ─────────────────────────────────────────────────────────────
export interface PlantillaPermiso { id:number; nombre:string; usuarios:number; permisos:Set<string> }

export const PLANTILLAS_INIT: PlantillaPermiso[] = [
  { id:4, nombre:'Administrador', usuarios:2, permisos:new Set(PERM_TODOS) },
  { id:1, nombre:'Contador',   usuarios:8, permisos:new Set(PERM_CONTADOR) },
  { id:2, nombre:'Recepción',  usuarios:5, permisos:new Set(['dashboard.card_asientos','dashboard.card_situacion']) },
  { id:3, nombre:'Supervisor', usuarios:2, permisos:new Set(['dashboard.card_asientos','dashboard.card_situacion','dashboard.card_usuarios','dashboard.card_estadobancos','bandeja.view','analitico.view:Detalle']) },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function allLeavesFlat(mod: PermModule): PermLeaf[] {
  return mod.leaves ?? (mod.groups ?? []).flatMap(g=>g.leaves);
}
// "Cuenta" de un leaf: si tiene subOptions, cuenta como 1 solo permiso
// otorgado apenas tenga AL MENOS una sub-opción marcada (no una por cada
// sub-opción) - así el contador "3/8 permisos" sigue siendo legible.
function leafIsChecked(l: PermLeaf, perms: Set<string>): boolean {
  if (l.subOptions) return l.subOptions.some(o => perms.has(`${l.key}:${o}`));
  return perms.has(l.key);
}
export function countLeaves(mod: PermModule): number {
  return allLeavesFlat(mod).length;
}
export function countChecked(mod: PermModule, perms: Set<string>): number {
  return allLeavesFlat(mod).filter(l => leafIsChecked(l, perms)).length;
}
export function allLeafKeysOfModule(mod: PermModule): string[] {
  return allLeavesFlat(mod).flatMap(l => l.subOptions ? l.subOptions.map(o=>`${l.key}:${o}`) : [l.key]);
}
export function allLeafKeysOfGroup(g: PermGroup): string[] {
  return g.leaves.flatMap(l => l.subOptions ? l.subOptions.map(o=>`${l.key}:${o}`) : [l.key]);
}
export function totalLeavesInTree(): number {
  return PERMISSIONS_TREE.reduce((s,cat)=>s+cat.modules.reduce((s2,m)=>s2+countLeaves(m),0),0);
}
// Todas las claves de una categoría entera (p.ej. todo "OPERATIVO") o de todo
// el árbol - para los "Marcar todo / Quitar todo" globales, además de los que
// ya existen por módulo/sección.
export function allLeafKeysOfCategory(cat: PermCategory): string[] {
  return cat.modules.flatMap(allLeafKeysOfModule);
}
export function allLeafKeysGlobal(): string[] {
  return PERMISSIONS_TREE.flatMap(allLeafKeysOfCategory);
}
export function countCategory(cat: PermCategory): number {
  return cat.modules.reduce((s,m)=>s+countLeaves(m),0);
}
export function countCheckedCategory(cat: PermCategory, perms: Set<string>): number {
  return cat.modules.reduce((s,m)=>s+countChecked(m, perms),0);
}
export { leafIsChecked };

// ── Árbol aplanado, para reportes/exportación (una fila por permiso, o por
// cada sub-opción de los leaves que tienen "por tipo"/"por estado") ──────────
export interface PermFlatRow { key: string; categoria: string; modulo: string; grupo?: string; permiso: string; subopcion?: string }
export function flatPermissionRows(): PermFlatRow[] {
  const rows: PermFlatRow[] = [];
  function pushLeaf(l: PermLeaf, categoria: string, modulo: string, grupo?: string) {
    if (l.subOptions) {
      for (const o of l.subOptions) rows.push({ key: `${l.key}:${o}`, categoria, modulo, grupo, permiso: l.label, subopcion: o });
    } else {
      rows.push({ key: l.key, categoria, modulo, grupo, permiso: l.label });
    }
  }
  for (const cat of PERMISSIONS_TREE) {
    for (const mod of cat.modules) {
      (mod.leaves ?? []).forEach(l => pushLeaf(l, cat.label, mod.label));
      (mod.groups ?? []).forEach(g => g.leaves.forEach(l => pushLeaf(l, cat.label, mod.label, g.label)));
    }
  }
  return rows;
}

// ── Permisos de un usuario agrupados para lectura (detalle imprimible / envío
// por correo) - categoría > módulo (+ grupo si aplica) > permiso, uniendo las
// sub-opciones de un mismo permiso en una sola línea ────────────────────────
export interface PermisoDetalleItem { permiso: string; subopciones: string[] }
export interface PermisoDetalleGrupo { modulo: string; grupo?: string; items: PermisoDetalleItem[] }
export interface PermisoDetalleCategoria { categoria: string; grupos: PermisoDetalleGrupo[] }

export function permisosAgrupadosPorUsuario(permisos: Set<string>): PermisoDetalleCategoria[] {
  const filas = flatPermissionRows().filter(f => permisos.has(f.key));
  const cats = new Map<string, Map<string, PermisoDetalleGrupo>>();
  filas.forEach(f => {
    if (!cats.has(f.categoria)) cats.set(f.categoria, new Map());
    const mods = cats.get(f.categoria)!;
    const gKey = `${f.modulo}|${f.grupo ?? ''}`;
    if (!mods.has(gKey)) mods.set(gKey, { modulo: f.modulo, grupo: f.grupo, items: [] });
    const grupo = mods.get(gKey)!;
    let item = grupo.items.find(i => i.permiso === f.permiso);
    if (!item) { item = { permiso: f.permiso, subopciones: [] }; grupo.items.push(item); }
    if (f.subopcion) item.subopciones.push(f.subopcion);
  });
  return Array.from(cats.entries()).map(([categoria, mods]) => ({ categoria, grupos: Array.from(mods.values()) }));
}
