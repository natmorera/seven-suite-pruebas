'use client';
import { C, FONT } from '@/components/ui/tokens';

export const F = FONT;
export const BRAND = C.brand;
export function matchesSearch(text: string, q: string) {
  return text.toLowerCase().includes(q.toLowerCase());
}
// Clasifica cada permiso por tipo de acción (a partir del sufijo de su
// clave), para agruparlos bajo subtítulos en vez de una lista plana sin
// ningún orden. Mismo criterio en todo el árbol, así toda sección se lee
// igual: primero qué se puede crear/registrar, después editar, después
// anular, etc. - no una mezcla de todo junto.
export const CATEGORY_ORDER = ['Visualización', 'Registro', 'Edición', 'Anulación', 'Contabilización', 'Comunicación y seguimiento', 'Exportación', 'Firma', 'Otros'];
const SUFFIX_CATEGORY: Record<string, string> = {
  crear:'Registro', registrar:'Registro', anticipo:'Registro', agregar:'Registro', abrir:'Registro',
  archivobancario:'Registro', importar:'Registro', crearajuste:'Registro', crearmovimiento:'Registro', generarcheque:'Registro',
  editar:'Edición', duplicar:'Edición', asignar:'Edición', marcar:'Edición', estado:'Edición', usar:'Edición',
  cargar:'Edición', emitir:'Edición',
  anticipoeditar:'Edición', anticipoanular:'Anulación',
  anular:'Anulación', eliminar:'Anulación', desactivar:'Anulación', cerrar:'Anulación', restaurar:'Anulación',
  contabilizar:'Contabilización', conciliar:'Contabilización', descontabilizar:'Contabilización',
  correo:'Comunicación y seguimiento', adjuntos:'Comunicación y seguimiento', historial:'Comunicación y seguimiento',
  export:'Exportación', exportmasivo:'Exportación', exportimport:'Exportación',
  exportformato:'Exportación', imprimir:'Exportación',
  firmar:'Firma',
  view:'Visualización',
};
// Prefijos de sufijo (para variantes como "pendientes_view", "exportformato_clientes",
// "correo_proveedores") - se revisan en orden antes de caer en el mapa exacto.
const SUFFIX_PREFIX_CATEGORY: [string, string][] = [
  ['card_', 'Visualización'], ['view', 'Visualización'],
  ['firmar', 'Firma'],
  ['export', 'Exportación'], ['imprimir', 'Exportación'],
  ['correo', 'Comunicación y seguimiento'], ['adjuntos', 'Comunicación y seguimiento'], ['historial', 'Comunicación y seguimiento'],
  ['contabilizar', 'Contabilización'], ['conciliar', 'Contabilización'], ['descontabilizar', 'Contabilización'],
  ['anticipoanular', 'Anulación'], ['anular', 'Anulación'], ['eliminar', 'Anulación'], ['desactivar', 'Anulación'], ['cerrar', 'Anulación'], ['restaurar', 'Anulación'],
  ['anticipoeditar', 'Edición'], ['editar', 'Edición'], ['duplicar', 'Edición'], ['asignar', 'Edición'], ['marcar', 'Edición'], ['estado', 'Edición'], ['usar', 'Edición'], ['cargar', 'Edición'], ['emitir', 'Edición'], ['generarcheque', 'Registro'],
];
export function leafCategory(key: string): string {
  const suffix = key.split('.').pop() ?? '';
  if (suffix.endsWith('_view')) return 'Visualización';
  for (const [prefix, cat] of SUFFIX_PREFIX_CATEGORY) if (suffix.startsWith(prefix)) return cat;
  return SUFFIX_CATEGORY[suffix] ?? 'Otros';
}
