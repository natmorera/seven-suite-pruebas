'use client';
// Kit de Configuración: tabla, paginación, color e importación / exportación de archivos.
import { celdaMonto } from '@/components/suite/Monto';
import { Paginacion as PaginacionSuite, PieFijo } from '@/components/suite/Paginacion';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { C, FONT, radius, SIZE } from '@/components/suite/tokens';

// ── Tabla (como Accounting: contenedor con borde y encabezado gris) ────────
export function Tabla({ headers, children, alinearDerecha = [], anchos = {}, minWidth }: {
  headers: ReactNode[]; children: ReactNode; alinearDerecha?: number[]; anchos?: Record<number, number | string>; minWidth?: number;
}) {
  return (
    <div style={{ overflowX: 'auto', position: 'relative', border: `1px solid ${C.n500}`, borderRadius: radius.md }}>
      <table className="tabla-config" style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT, fontSize: 12, minWidth }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.n500}`, background: C.n200 }}>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: '10px 12px', textAlign: alinearDerecha.includes(i) ? 'right' : 'left', fontSize: 12, fontWeight: 400, color: C.n700,
                whiteSpace: 'nowrap', width: anchos[i] }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function Fila({ children, onClick, activa, style }: { children: ReactNode; onClick?: () => void; activa?: boolean; style?: CSSProperties }) {
  return (
    <tr onClick={onClick} className={activa ? undefined : 'suite-fila'}
      style={{ borderBottom: `1px solid ${C.n500}`, cursor: onClick ? 'pointer' : 'default', background: activa ? C.brandBg : undefined, ...style }}>
      {children}
    </tr>
  );
}
export function Celda({ children, derecha, muted, style, colSpan, onClick }: {
  children?: ReactNode; derecha?: boolean; muted?: boolean; style?: CSSProperties; colSpan?: number; onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <td colSpan={colSpan} onClick={onClick} style={{ padding: '8px 12px', color: muted ? C.n700 : C.n900, textAlign: derecha ? 'right' : 'left',
      fontVariantNumeric: derecha ? 'tabular-nums' : undefined, verticalAlign: 'middle', ...style }}>{celdaMonto(children)}</td>
  );
}
export function FilaVacia({ cols, texto = 'No hay registros que coincidan.' }: { cols: number; texto?: string }) {
  return <tr><td colSpan={cols} style={{ padding: '28px 8px', textAlign: 'center', color: C.n700, fontSize: 12 }}>{texto}</td></tr>;
}

/** Celda de color: muestra de color + código (los colores claros llevan borde para verse sobre blanco). */
export function MuestraColor({ color }: { color: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontFamily: FONT, color: C.n700 }}>
      <span aria-hidden style={{ width: 14, height: 14, borderRadius: 4, background: color, border: `1px solid ${contraste(color) === '#fff' ? 'transparent' : C.n500}` }} />
      {color.toUpperCase()}
    </span>
  );
}
function contraste(hex: string) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return C.n900;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? C.n900 : '#fff';
}

export function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: SIZE.control, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 10px', background: C.n000 }}>
      <label style={{ position: 'relative', width: 18, height: 18, borderRadius: 4, border: `1px solid ${C.n500}`, background: value, cursor: 'pointer', flexShrink: 0 }}>
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'} onChange={e => onChange(e.target.value.toUpperCase())} aria-label="Elegir color"
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
      </label>
      <input value={value} onChange={e => onChange(e.target.value)} aria-label="Color hexadecimal"
        style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, fontFamily: FONT, color: C.n900, background: 'transparent' }} />
    </div>
  );
}

/** Paginación del pie (« ‹ [1] de N › »). */
/** Paginación estándar en la barra fija al pie (ver suite/Paginacion). `filas` y `porPagina` muestran «1–10 de 57». */
export function Paginacion({ pagina, total, onChange, filas, porPagina }: { pagina: number; total: number; onChange: (p: number) => void; filas?: number; porPagina?: number }) {
  return <PieFijo><PaginacionSuite pagina={pagina} paginas={total} onChange={onChange} filas={filas} porPagina={porPagina} /></PieFijo>;
}

export function usePaginado<T>(filas: T[], tam = 10) {
  const [pagina, setPagina] = useState(1);
  const total = Math.max(1, Math.ceil(filas.length / tam));
  const actual = Math.min(pagina, total);
  return { pagina: actual, total, setPagina, visibles: filas.slice((actual - 1) * tam, actual * tam), filas: filas.length, tam };
}

/** Descarga un CSV generado en el navegador (plantillas, exportaciones). */
export function descargarCSV(nombre: string, filas: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '\ufeff' + filas.map(f => f.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Hoja de cálculo (tabla HTML que Excel abre como .xls). */
export function descargarXLS(nombre: string, filas: (string | number)[][]) {
  const esc = (v: string | number) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const html = `<html><head><meta charset="utf-8"></head><body><table border="1">${filas.map(f => `<tr>${f.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
  const url = URL.createObjectURL(new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' }));
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Lee un CSV sencillo (separador , o ;) y devuelve filas de texto. */
export async function leerCSV(file: File): Promise<string[][]> {
  const texto = (await file.text()).replace(/^\ufeff/, '');
  const sep = (texto.split('\n')[0].match(/;/g)?.length ?? 0) > (texto.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const filas: string[][] = [];
  let fila: string[] = [], campo = '', comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (comillas) {
      if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') comillas = false;
      else campo += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) { fila.push(campo); campo = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo); campo = '';
      if (fila.some(c => c.trim() !== '')) filas.push(fila);
      fila = [];
    } else campo += ch;
  }
  fila.push(campo);
  if (fila.some(c => c.trim() !== '')) filas.push(fila);
  return filas;
}
