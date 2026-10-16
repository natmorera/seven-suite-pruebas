// La factura que se estaba llenando cuando se abrió el formulario avanzado
// de producto. Se guarda en la sesión del navegador y, al guardar o cancelar
// el producto, se vuelve a la factura tal como estaba.
export const CLAVE_FACTURA_EN_CURSO = 'factura-en-curso';

export interface FacturaEnCurso<E = unknown> {
  query: string;            // parámetros originales de la página de la factura
  lineaId: string | null;   // línea donde va el producto (null: línea nueva)
  estado: E;
}

export function guardarFacturaEnCurso<E>(f: FacturaEnCurso<E>) {
  try { sessionStorage.setItem(CLAVE_FACTURA_EN_CURSO, JSON.stringify(f)); } catch { /* sin almacenamiento */ }
}
export function leerFacturaEnCurso<E>(): FacturaEnCurso<E> | null {
  try { const t = sessionStorage.getItem(CLAVE_FACTURA_EN_CURSO); return t ? JSON.parse(t) : null; } catch { return null; }
}
export function borrarFacturaEnCurso() {
  try { sessionStorage.removeItem(CLAVE_FACTURA_EN_CURSO); } catch { /* nada */ }
}
// Dirección para volver a la factura (con el producto creado, si hay)
export function urlVolverAFactura(articuloId?: string): string | null {
  const f = leerFacturaEnCurso();
  if (!f) return null;
  const q = new URLSearchParams(f.query);
  q.set('restaurar', '1');
  if (articuloId) q.set('articulo', articuloId);
  return `/facturacion/emitidos/nuevo?${q.toString()}`;
}
