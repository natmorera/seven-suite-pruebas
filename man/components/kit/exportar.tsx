'use client';
// Exportación e impresión compartidas por todas las pantallas: un botón Exportar (CSV, XLS o PDF) y la hoja impresa.
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox } from '@/components/suite/ui';
import { IcChevronDown } from '@/components/suite/icons';
import { useEmpresa } from '@/components/layout/Shell';
import { Popover, descargarCSV, descargarXLS } from './index';
import type { OpcionesDocumento } from './reporte';
import { fmtF, hoy } from './fechas';

// ── Impresión: renderiza el reporte en un portal y abre el diálogo del navegador
export function usePrint() {
  const [contenido, setContenido] = useState<ReactNode>(null);
  useEffect(() => {
    if (!contenido) return;
    document.body.classList.add('imprimiendo');
    const fin = () => { document.body.classList.remove('imprimiendo'); setContenido(null); };
    window.addEventListener('afterprint', fin, { once: true });
    const t = setTimeout(() => window.print(), 60);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', fin); document.body.classList.remove('imprimiendo'); };
  }, [contenido]);
  const portal = contenido && typeof document !== 'undefined' ? createPortal(<div id="area-impresion">{contenido}</div>, document.body) : null;
  return { imprimir: (c: ReactNode) => setContenido(c), portal };
}

/** Plantilla del reporte impreso (encabezado con filtros + pie con empresa y fecha). */
export function HojaReporte({ titulo, filtros, children, resumen, encabezado = true, carta }: {
  titulo: string; filtros?: string; children: ReactNode; resumen?: ReactNode; encabezado?: boolean; carta?: boolean;
}) {
  const ahora = new Date();
  const empresa = useEmpresa().toUpperCase();
  return (
    <div style={{ fontFamily: FONT, color: C.n900, padding: 8 }}>
      {carta && <style>{'@page { size: letter; margin: 12mm; }'}</style>}
      {encabezado && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{titulo}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: C.n700 }}>Fecha: {fmtF(hoy())}</p>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, background: C.n500, padding: '4px 8px', borderRadius: 4 }}>{empresa}</span>
      </div>}
      {filtros && <div style={{ margin: '12px 0', padding: '8px 12px', background: C.n200, borderRadius: 6, fontSize: 10.5 }}><b>Filtros:</b> {filtros}</div>}
      <div style={{ marginTop: 12 }}>{children}</div>
      {resumen && <div style={{ marginTop: 14, padding: '10px 14px', background: C.n200, borderRadius: 6, fontSize: 11 }}>{resumen}</div>}
      <div style={{ marginTop: 18, paddingTop: 8, borderTop: `1px solid ${C.n500}`, display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: C.n700 }}>
        <span>{empresa} — Generado: {fmtF(hoy())} {ahora.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}</span>
        <span>Seven Management</span>
      </div>
    </div>
  );
}
export function TablaImpresa({ headers, filas, derecha = [] }: { headers: string[]; filas: ReactNode[][]; derecha?: number[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
      <thead><tr style={{ background: '#EFEFEF' }}>{headers.map((h, i) => <th key={i} style={{ padding: '6px 6px', textAlign: derecha.includes(i) ? 'right' : 'left', fontWeight: 500, color: C.n700 }}>{h}</th>)}</tr></thead>
      <tbody>{filas.map((f, i) => <tr key={i} style={{ borderBottom: `1px solid ${C.n500}` }}>{f.map((c, j) => <td key={j} style={{ padding: '5px 6px', textAlign: derecha.includes(j) ? 'right' : 'left' }}>{c}</td>)}</tr>)}</tbody>
    </table>
  );
}

// ── Exportación ─────────────────────────────────────────────────────────────
// Todas las pantallas exportan lo que se está viendo (filtros aplicados) con el
// mismo botón: CSV, XLS (hoja de cálculo) o PDF (impresión del navegador).
let formatoHoja: 'CSV' | 'XLS' = 'CSV';
let encabezadoHoja: (string | number)[][] = [];
export const exportarCSV = (nombre: string, headers: string[], filas: (string | number)[][]) => {
  const todo = [...encabezadoHoja, headers, ...filas];
  // Nombre de archivo seguro (sin tildes ni espacios) para todos los navegadores.
  nombre = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '-').toLowerCase();
  if (formatoHoja === 'XLS') descargarXLS(`${nombre}-${hoy()}.xls`, todo); else descargarCSV(`${nombre}-${hoy()}.csv`, todo);
};
export function BotonExportar({ onCSV, onPDF, disabled, label = 'Exportar', titulo, criterio, variant = 'secondary', masOpciones }: {
  onCSV?: () => void; onPDF?: (o: OpcionesDocumento & { carta: boolean }) => void; disabled?: boolean; label?: string; titulo?: string; criterio?: string; variant?: 'primary' | 'secondary';
  /** Exportación avanzada (abre un modal con más opciones). */
  masOpciones?: { label: string; onClick: () => void };
}) {
  const [open, setOpen] = useState(false);
  const formatos = [...(onCSV ? ['CSV', 'XLS'] : []), ...(onPDF ? ['PDF'] : [])] as ('CSV' | 'XLS' | 'PDF')[];
  const [fmt, setFmt] = useState<'CSV' | 'XLS' | 'PDF'>(formatos[0] ?? 'PDF');
  const [enc, setEnc] = useState(true);
  const [fil, setFil] = useState(true);
  const [carta, setCarta] = useState(false);
  const exportar = () => {
    setOpen(false);
    if (fmt === 'PDF') return onPDF?.({ encabezado: enc, filtros: fil, carta });
    formatoHoja = fmt;
    encabezadoHoja = [...(enc && titulo ? [[titulo], [`Fecha de emisión: ${fmtF(hoy())}`]] : []), ...(fil && criterio ? [[criterio]] : []), ...((enc && titulo) || (fil && criterio) ? [[]] : [])];
    try { onCSV?.(); } finally { formatoHoja = 'CSV'; encabezadoHoja = []; }
  };
  const det: Record<string, string> = { CSV: 'Archivo separado por comas', XLS: 'Hoja de cálculo Excel', PDF: 'Documento PDF (imprimir / guardar)' };
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <Button variant={variant} disabled={disabled || !formatos.length} onClick={() => setOpen(o => !o)}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" /><path d="M12 11v6M9.5 14.5 12 17l2.5-2.5" /></svg>
          {label}<IcChevronDown size={12} /></span>
      </Button>
      <Popover open={open} onClose={() => setOpen(false)} width={260} align="right">
        <div role="menu" aria-label="Formato de exportación" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, fontFamily: FONT }}>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>Formato de exportación</span>
          {formatos.map(v => (
            <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: radius.md, background: fmt === v ? C.brandBg : 'transparent', cursor: 'pointer' }}>
              <input type="radio" name="fmt-export" checked={fmt === v} onChange={() => setFmt(v)} />
              <span><span style={{ display: 'block', fontSize: 12.5, color: fmt === v ? C.brand : C.n900 }}>{v}</span><span style={{ display: 'block', fontSize: 11, color: C.n700 }}>{det[v]}</span></span>
            </label>
          ))}
          {fmt === 'PDF' && <div style={{ borderTop: `1px solid ${C.n500}`, margin: '4px 0 0', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Tamaño de página</span>
            {([[false, 'Tamaño libre', 'Se ajusta automáticamente al contenido'], [true, 'Tamaño carta', 'Formato carta (8.5 × 11 in), texto reducido']] as const).map(([v, t, d]) => (
              <label key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 10px', borderRadius: radius.md, cursor: 'pointer' }}>
                <input type="radio" name="tam-pdf" checked={carta === v} onChange={() => setCarta(v)} style={{ marginTop: 2 }} />
                <span><span style={{ display: 'block', fontSize: 12.5 }}>{t}</span><span style={{ display: 'block', fontSize: 11, color: C.n700 }}>{d}</span></span>
              </label>
            ))}
          </div>}
          {(titulo || criterio) && <div style={{ borderTop: `1px solid ${C.n500}`, margin: '4px 0', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Opciones del documento</span>
            {titulo && <Checkbox checked={enc} onChange={setEnc} label="Mostrar encabezado" />}
            {criterio && <Checkbox checked={fil} onChange={setFil} label="Mostrar filtros aplicados" />}
          </div>}
          <Button onClick={exportar}>Exportar</Button>
          {masOpciones && <button type="button" onClick={() => { setOpen(false); masOpciones.onClick(); }} style={{ border: 'none', background: 'none', color: C.brand, fontSize: 12, cursor: 'pointer', fontFamily: FONT, padding: '4px 0 0', textDecoration: 'underline' }}>{masOpciones.label}</button>}
        </div>
      </Popover>
    </span>
  );
}

// ── Gráficos simples (SVG propio, sin dependencias) ─────────────────────────
