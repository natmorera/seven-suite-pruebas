'use client';
// Kit de pantallas: tabla, paginación, color e importación / exportación de archivos.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, radius, SIZE } from '@/components/suite/tokens';
import { usePie } from '@/components/layout/Pantalla';

// ── Tabla (como Accounting: contenedor con borde y encabezado gris) ────────
export function Tabla({ headers, children, alinearDerecha = [], anchos = {}, minWidth }: {
  headers: ReactNode[]; children: ReactNode; alinearDerecha?: number[]; anchos?: Record<number, number | string>; minWidth?: number;
}) {
  const ref = useRef<HTMLTableElement>(null);
  // En el celular cada fila se muestra como tarjeta: cada celda lleva el título de su columna.
  useEffect(() => {
    const tabla = ref.current;
    if (!tabla) return;
    const etiquetar = () => {
      const titulos = [...tabla.querySelectorAll(':scope > thead th')].map(th => th.textContent?.trim() ?? '');
      tabla.querySelectorAll(':scope > tbody > tr').forEach(tr => {
        let col = 0;
        [...tr.children].forEach(td => {
          const n = (td as HTMLTableCellElement).colSpan || 1;
          const etiqueta = n > 1 ? '' : titulos[col] ?? '';
          if (td.getAttribute('data-label') !== etiqueta) td.setAttribute('data-label', etiqueta);
          col += n;
        });
        // En el celular la tarjeta se pliega: se ve el título (la celda marcada o la primera con nombre de columna)
        // y una flecha para ver el detalle, si hay más de dos datos.
        const celdas = [...tr.children].filter(td => !td.classList.contains('fila-detalle') && td.getAttribute('data-movil') !== 'ocultar') as HTMLElement[];
        if (!celdas.some(td => td.getAttribute('data-movil') === 'titulo')) {
          const titulo = celdas.find(td => td.getAttribute('data-label'));
          celdas.forEach(td => td.toggleAttribute('data-titulo', td === titulo));
        }
        const datos = celdas.filter(td => !['titulo', 'bloque'].includes(td.getAttribute('data-movil') ?? '') && !td.hasAttribute('data-titulo')).length;
        tr.toggleAttribute('data-colapsable', datos > 2);
      });
    };
    etiquetar();
    const obs = new MutationObserver(etiquetar);
    obs.observe(tabla, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);
  return (
    <div className="tabla-marco" style={{ overflowX: 'auto', position: 'relative', border: `1px solid ${C.n500}`, borderRadius: radius.md, background: C.n000 }}>
      <table ref={ref} className="tabla-config" style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT, fontSize: 12, minWidth }}>
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
  // Solo en el celular: la fila plegada muestra el título y esta flecha abre el resto de los datos.
  const [abierta, setAbierta] = useState(false);
  return (
    <tr onClick={onClick} className={[activa ? '' : 'suite-fila', abierta ? 'abierta' : ''].join(' ').trim() || undefined}
      style={{ borderBottom: `1px solid ${C.n500}`, cursor: onClick ? 'pointer' : 'default', background: activa ? C.brandBg : undefined, ...style }}>
      {children}
      <td className="fila-detalle">
        <button type="button" aria-expanded={abierta} aria-label={abierta ? 'Ocultar detalle' : 'Ver detalle'} onClick={e => { e.stopPropagation(); setAbierta(v => !v); }}
          style={{ width: 30, height: 30, border: `1px solid ${C.n500}`, borderRadius: radius.md, background: C.n000, color: C.n700, cursor: 'pointer', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', padding: 0, transform: abierta ? 'rotate(180deg)' : undefined }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </td>
    </tr>
  );
}
/** En el celular cada fila es una tarjeta; `movil` cambia cómo se ve la celda ahí: «titulo» encabeza la tarjeta,
 *  «bloque» va a todo el ancho sin el título de la columna y «ocultar» no se muestra. */
export function Celda({ children, derecha, muted, style, colSpan, onClick, movil }: {
  children?: ReactNode; derecha?: boolean; muted?: boolean; style?: CSSProperties; colSpan?: number; onClick?: (e: React.MouseEvent) => void;
  movil?: 'titulo' | 'bloque' | 'ocultar';
}) {
  return (
    <td colSpan={colSpan} onClick={onClick} data-movil={movil} style={{ padding: '8px 12px', color: muted ? C.n700 : C.n900, textAlign: derecha ? 'right' : 'left',
      fontVariantNumeric: derecha ? 'tabular-nums' : undefined, verticalAlign: 'middle', ...style }}>{children}</td>
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

/** Paginación de las tablas: filas por página, rango visible y páginas («‹ Anterior 1 2 3 Siguiente ›»).
 *  Siempre va fija al pie de la pantalla, con fondo blanco, aunque la tabla esté vacía. */
export function Paginacion({ pag }: { pag: Paginado }) {
  const pie = usePie();
  const { pagina, total, setPagina, tam, setTam, cantidad } = pag;
  const desde = cantidad ? (pagina - 1) * tam + 1 : 0, hasta = Math.min(pagina * tam, cantidad);
  // Se muestran hasta 5 páginas alrededor de la actual.
  const inicio = Math.max(1, Math.min(pagina - 2, total - 4));
  const paginas = Array.from({ length: Math.min(5, total) }, (_, i) => inicio + i);
  const boton = (on: boolean, disabled = false): CSSProperties => ({
    minWidth: 32, height: 32, padding: '0 10px', borderRadius: radius.md, fontSize: 12.5, fontFamily: FONT, cursor: disabled ? 'default' : 'pointer',
    border: `1px solid ${on ? C.brand : C.n500}`, background: on ? C.brand : C.n000, color: on ? '#fff' : disabled ? C.n700 : C.n900, fontWeight: on ? 600 : 400,
    opacity: disabled ? 0.55 : 1,
  });
  const barra = (
    <div className="paginacion-pie" style={{ flexShrink: 0, padding: '10px 24px', background: C.n000, borderTop: `1px solid ${C.n500}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 12.5, color: C.n700, fontFamily: FONT }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="pag-texto">Filas por página</span>
        <select value={tam} onChange={e => { setTam(Number(e.target.value)); setPagina(1); }} className="suite-campo"
          style={{ height: 32, border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: '0 10px', fontSize: 12.5, fontFamily: FONT, color: C.n900, background: C.n000 }}>
          {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span>{desde}–{hasta} de {cantidad}</span>
      </label>
      <nav aria-label="Páginas" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button type="button" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)} style={boton(false, pagina <= 1)} aria-label="Página anterior">‹<span className="pag-texto"> Anterior</span></button>
        {paginas.map(n => <button key={n} type="button" className={n === pagina ? undefined : 'pag-otra'} aria-current={n === pagina ? 'page' : undefined} onClick={() => setPagina(n)} style={boton(n === pagina)}>{n}</button>)}
        <button type="button" disabled={pagina >= total} onClick={() => setPagina(pagina + 1)} style={boton(false, pagina >= total)} aria-label="Página siguiente"><span className="pag-texto">Siguiente </span>›</button>
      </nav>
    </div>
  );
  return pie ? createPortal(barra, pie) : barra;
}

export function usePaginado<T>(filas: T[], inicial = 10) {
  const [pagina, setPagina] = useState(1);
  const [tam, setTam] = useState(inicial);
  const total = Math.max(1, Math.ceil(filas.length / tam));
  const actual = Math.min(pagina, total);
  return { pagina: actual, total, setPagina, tam, setTam, cantidad: filas.length, visibles: filas.slice((actual - 1) * tam, actual * tam) };
}
type Paginado = ReturnType<typeof usePaginado>;

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
