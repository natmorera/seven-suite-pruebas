'use client';
import { FONT } from '@/components/ui/tokens';
import { type Firma, type FirmaReporte, type FormatoFirmaLinea } from '@/components/pages/config/firmasConfig';

export const F = FONT;
// Líneas de información que puede mostrar una firma
export const FORMATO_OPCIONES: { value: FormatoFirmaLinea; label: string }[] = [
  { value:'nombre',    label:'Nombre del firmante' },
  { value:'documento', label:'Número de identificación' },
  { value:'puesto',    label:'Puesto / Puesto alternativo' },
];
export function BLANK_FIRMA(): Firma {
  return { id:`f${Date.now()}`, nombre:'', documento:'', puesto:'', puestoAlt:'', formato:['nombre','documento','puesto'], reportes:[], usuarioId:undefined };
}
// al eliminar una firma (o al destildarle un reporte) las firmas que
// quedaban en ese reporte no se recorrían - si borrabas a quien tenía el
// orden 1, las demás seguían en 2, 3… en vez de pasar a 1, 2… Esto renumera
// de forma compacta (sin huecos) todas las firmas de un reporte específico,
// respetando su orden relativo actual.
export function compactarOrdenes(lista: Firma[], reporteKey: string): Firma[] {
  const relacionadas = lista
    .map(x => ({ firma: x, rel: x.reportes.find(r => r.reporteKey === reporteKey) }))
    .filter((x): x is { firma: Firma; rel: FirmaReporte } => !!x.rel)
    .sort((a, b) => a.rel.orden - b.rel.orden);
  const nuevoOrden = new Map<string, number>();
  relacionadas.forEach((x, i) => nuevoOrden.set(x.firma.id, i + 1));
  return lista.map(x => {
    const o = nuevoOrden.get(x.id);
    if (o === undefined || o === x.reportes.find(r=>r.reporteKey===reporteKey)?.orden) return x;
    return { ...x, reportes: x.reportes.map(r => r.reporteKey === reporteKey ? { ...r, orden: o } : r) };
  });
}
