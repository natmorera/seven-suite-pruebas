'use client';
// Piezas compartidas de Pronóstico / Estadísticas y Auditoría: botón Exportar
// con formato (CSV · XLS · PDF) y opciones, selector de reporte (reemplaza el
// submenú lateral «Reportes ›») y tabla de reporte en pantalla.
import { type CSSProperties, type ReactNode } from 'react';
import { C, FONT } from '@/components/suite/tokens';
import { BotonExportar, exportarCSV, usePrint } from '@/components/hotel/ui';

export type Celda = string | number;
export interface DatosExport { nombre: string; titulo: string; criterio?: string; headers: string[]; filas: Celda[][] }

/** Exportar (CSV · XLS · PDF) de un reporte con datos estructurados. */
export function ExportarReporte({ datos, pdf, disabled }: { datos: () => DatosExport; pdf: ReactNode; disabled?: boolean }) {
  const { imprimir, portal } = usePrint();
  const d0 = datos();
  return <>
    <BotonExportar disabled={disabled} titulo={d0.titulo} criterio={d0.criterio} onCSV={() => { const d = datos(); exportarCSV(d.nombre, d.headers, d.filas.map(f => f.map(c => c))); }} onPDF={() => imprimir(pdf)} />
    {portal}
  </>;
}

// ── Tabla de reporte en pantalla ─────────────────────────────────────────────
export const thR: CSSProperties = { padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 400, color: C.n700, background: C.n200, whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1, borderBottom: `1px solid ${C.n500}` };
export const tdP = (der?: boolean, extra?: CSSProperties): CSSProperties => ({ padding: '10px 12px', fontSize: 12.5, color: C.n900, borderBottom: '1px solid #EDEDF0', whiteSpace: 'nowrap', textAlign: der ? 'right' : 'left', fontVariantNumeric: der ? 'tabular-nums' : undefined, ...extra });
export function TablaP({ headers, derecha = [], children, grupos, alto }: { headers: ReactNode[]; derecha?: number[]; children: ReactNode; grupos?: { label: string; span: number }[]; alto?: string }) {
  return (
    <div style={{ overflow: 'auto', border: `1px solid ${C.n500}`, borderRadius: 10, background: C.n000, maxHeight: alto ?? 'calc(100vh - 300px)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
        <thead>
          {grupos && <tr>{grupos.map((g, i) => <th key={i} colSpan={g.span} style={{ ...thR, textAlign: 'center', color: C.n900, fontWeight: 600, borderBottom: `1px solid ${C.n500}` }}>{g.label}</th>)}</tr>}
          <tr>{headers.map((h, i) => <th key={i} style={{ ...thR, top: grupos ? 37 : 0, textAlign: derecha.includes(i) ? 'right' : 'left' }}>{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export const Vacio = ({ cols, texto = 'Sin datos para mostrar' }: { cols: number; texto?: string }) => <tr><td colSpan={cols} style={{ ...tdP(), textAlign: 'center', color: C.n700, padding: 30 }}>{texto}</td></tr>;
export const fmt2 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const Limpiar = ({ onClick }: { onClick: () => void }) => <button type="button" onClick={onClick} style={{ border: 'none', background: 'none', color: C.error, fontSize: 12, cursor: 'pointer', fontFamily: FONT, whiteSpace: 'nowrap' }}>Limpiar filtros</button>;
