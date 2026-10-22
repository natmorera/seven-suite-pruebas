import { type Cuenta, GRUPOS_NIIF, LONGITUD, type Naturaleza, type Nivel, SEP } from '../catalogoData';

export function genId() { return `c-${Date.now()}-${Math.random().toString(36).slice(2,6)}`; }
export function getNaturaleza(grupo: string): Naturaleza {
  return GRUPOS_NIIF.find(g=>g.value===grupo)?.naturaleza ?? 'Deudora';
}
// Solo se registran movimientos en los niveles detalle y auxiliar
export function isPosteable(nivel: string) {
  return nivel === 'detalle' || nivel === 'auxiliar';
}
// Child level sequence (fijos NIIF no configurables, configurables desde mayor hacia abajo)
// grupo → subgrupo → subsubgrupo → mayor → submajor → detalle → (auxiliar si posteable)
function getChildNivel(parentNivel: Nivel | null): Nivel {
  const order: Nivel[] = ['grupo','subgrupo','subsubgrupo','mayor','submajor','detalle'];
  const idx = order.indexOf(parentNivel as Nivel);
  if (idx === -1 || idx >= order.length - 1) return 'auxiliar';
  return order[idx + 1];
}
// El usuario crea: desde Mayor (si padre es SSG), Submajor (si padre es Mayor),
// Detalle (si padre es Submajor), Auxiliar (si padre es Detalle posteable)
export function getChildNivelConfigurable(parentNivel: Nivel | null): Nivel | null {
  if (!parentNivel) return 'mayor'; // raíz libre → Mayor
  const map: Partial<Record<Nivel, Nivel>> = {
    subsubgrupo: 'mayor',
    mayor:       'submajor',
    submajor:    'detalle',
    detalle:     'auxiliar',
  };
  return map[parentNivel] ?? null;
}
// ¿Se le pueden agregar hijos desde la pantalla?
export function canAddChild(nivel: Nivel, tipoEspecial?: string | null): boolean {
  if (nivel === 'auxiliar') return false;
  // grupo y subgrupo son puramente de clasificación NIIF - no se les agrega nada desde UI
  if (nivel === 'grupo' || nivel === 'subgrupo') return false;
  // subsubgrupo SÍ permite agregar Mayor (es el punto de entrada del usuario)
  if (nivel === 'subsubgrupo') return true;
  // Detalle solo puede tener auxiliares si es cuenta de clientes o proveedores
  if (nivel === 'detalle') {
    return tipoEspecial === '02' || tipoEspecial === '03' || tipoEspecial === '04';
  }
  return true;
}
export function fmt(n: number, decimals = 2) {
  const parts = Math.abs(n).toFixed(decimals).split('.');
  const int   = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '-' : '') + int + (decimals > 0 ? '.' + parts[1] : '');
}
// Siguiente segmento sugerido para un hijo nuevo
function suggestSegment(parent: Cuenta): string {
  const childNivel = getChildNivel(parent.nivel);
  const len = LONGITUD[childNivel] ?? 4;
  const siblings = (parent.children || []).filter(s => s.nivel === childNivel);
  if (!siblings.length) {
    if (childNivel === 'mayor') return '100';
    return '1'.padStart(len, '0');
  }
  const nums = siblings.map(s => {
    const parts = (s.code || '').split(SEP);
    return parseInt(parts[parts.length - 1], 10) || 0;
  });
  const next = Math.max(...nums) + 1;
  if (childNivel === 'mayor') {
    // Mayores saltan de 100 en 100 por convención
    const rounded = Math.ceil(next / 100) * 100;
    return String(rounded).padStart(3, '0');
  }
  return String(next).padStart(len, '0');
}
// Funciones del árbol
export function flattenTree(nodes: Cuenta[], depth=0): (Cuenta & {depth:number})[] {
  return nodes.flatMap(n => [
    { ...n, depth },
    ...(n.children?.length && n.expanded ? flattenTree(n.children, depth+1) : []),
  ]);
}
// Aplana TODO el árbol sin importar el estado "expanded" de la UI - para usar en
// selectores (cuenta padre, validación de código duplicado, etc.) que necesitan
// ver todas las cuentas existentes, no solo las que están visualmente desplegadas.
export function flattenAll(nodes: Cuenta[], depth=0): (Cuenta & {depth:number})[] {
  return nodes.flatMap(n => [
    { ...n, depth },
    ...(n.children?.length ? flattenAll(n.children, depth+1) : []),
  ]);
}
export function toggleNodeExpanded(nodes: Cuenta[], id: string): Cuenta[] {
  return nodes.map(n => n.id === id
    ? { ...n, expanded: !n.expanded }
    : { ...n, children: n.children ? toggleNodeExpanded(n.children, id) : [] }
  );
}
export function addNodeToTree(nodes: Cuenta[], parentId: string|null, newNode: Cuenta): Cuenta[] {
  if (!parentId) return [...nodes, newNode];
  return nodes.map(n => {
    if (n.id === parentId) return { ...n, expanded: true, children: [...(n.children||[]), newNode] };
    if (n.children?.length) return { ...n, children: addNodeToTree(n.children, parentId, newNode) };
    return n;
  });
}
export function updateNodeInTree(nodes: Cuenta[], data: Partial<Cuenta> & { id: string }): Cuenta[] {
  return nodes.map(n => {
    if (n.id === data.id) return { ...n, ...data, children: n.children };
    if (n.children?.length) return { ...n, children: updateNodeInTree(n.children, data) };
    return n;
  });
}
export function removeNodeFromTree(nodes: Cuenta[], id: string): Cuenta[] {
  return nodes
    .filter(n => n.id !== id)
    .map(n => ({ ...n, children: n.children ? removeNodeFromTree(n.children, id) : [] }));
}
// ─── Funciones usadas por AccountDetail ──────────────────────────────────────

export function suggestNextSegment(parent: Cuenta | null): string {
  if (!parent) return '';
  return suggestSegment(parent);
}
// Sugerencia de próximo código Mayor cuando todavía no hay cuenta padre que
// consultar (Mayor es el primer nivel configurable): siempre debe
// ofrecerse una sugerencia. Se basa en el código Mayor más alto existente en
// todo el catálogo y salta al siguiente múltiplo de 100 (ej. último 600 → 700).
export function suggestNextMayorSegment(allNodes: (Cuenta & { depth?: number })[]): string {
  const mayores = allNodes.filter(n => n.nivel === 'mayor');
  if (!mayores.length) return '100';
  const max = Math.max(...mayores.map(n => parseInt(n.code, 10) || 0));
  const next = Math.ceil((max + 1) / 100) * 100;
  return String(next).padStart(3, '0');
}
export function buildCodePrefix(parent: Cuenta | null): string {
  if (!parent) return '';
  return parent.code + SEP;
}
export function codeExists(allNodes: (Cuenta & {depth?:number})[], fullCode: string, excludeId: string | null): boolean {
  return allNodes.some(n => n.code === fullCode && n.id !== excludeId);
}
