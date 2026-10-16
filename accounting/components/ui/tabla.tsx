'use client';
import { ReactNode, CSSProperties } from 'react';
import { C, FONT, TABLA, radius } from './tokens';

// ── DataTable ─────────────────────────────────────────────────────────────────
export function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div style={TABLA.wrap}>
      <table className="tabla" style={TABLA.table}>
        <thead>
          <tr style={TABLA.headRow}>
            {headers.map(h => (
              <th key={h} style={TABLA.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function DataRow({ children, onClick, selected }: {
  children: ReactNode; onClick?: () => void; selected?: boolean;
}) {
  return (
    <tr onClick={onClick} style={{ ...TABLA.row,
      cursor: onClick ? 'pointer' : 'default',
      background: selected ? TABLA.rowSelectedBg : C.n000 }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = TABLA.rowHoverBg; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = C.n000; }}>
      {children}
    </tr>
  );
}
export function Td({ children, muted, right, width }: {
  children: ReactNode; muted?: boolean; right?: boolean; mono?: boolean; width?: string;
}) {
  return (
    <td style={{ ...(muted ? TABLA.tdMuted : TABLA.td),
      textAlign: right ? 'right' : 'left',
      ...(width ? { width } : {}) }}>
      {children}
    </td>
  );
}
// ── Status badge ──────────────────────────────────────────────────────────────
export type BadgeColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'brand';
export const BADGE_COLORS: Record<BadgeColor, { bg: string; color: string; border: string }> = {
  green:  { bg: 'rgba(76,175,80,.08)',   color: '#2e7d32', border: 'rgba(76,175,80,.25)'  },
  yellow: { bg: 'rgba(238,179,0,.08)',   color: '#7a5c00', border: 'rgba(238,179,0,.25)'  },
  red:    { bg: 'rgba(244,67,54,.08)',   color: '#c62828', border: 'rgba(244,67,54,.25)'  },
  blue:   { bg: 'rgba(33,150,243,.08)',  color: '#1565c0', border: 'rgba(33,150,243,.25)' },
  gray:   { bg: C.n200,                  color: C.n700,    border: C.n500                  },
  brand:  { bg: C.brandBg,               color: C.brand,   border: C.brandBd               },
};
export function StatusBadge({ label, color }: { label: string; color: BadgeColor }) {
  const s = BADGE_COLORS[color];
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      padding: '2px 8px', borderRadius: radius.pill, fontSize: 10, fontWeight: 500, fontFamily: FONT }}>
      {label}
    </span>
  );
}
// ── Pagination ────────────────────────────────────────────────────────────────
// Componente único de paginación para toda la app. Reemplaza los ~13 footers
// distintos que existían por pantalla (algunos con un <input> para digitar el
// número de página exacto, otros con texto "Pág. 1/1" fijo sin funcionar).
// En vez de escribir el número de página, el usuario ve y toca directamente
// los números de página disponibles (con elipsis cuando hay muchas), además
// de Anterior/Siguiente - sin necesidad de digitar ni adivinar cuántas hay.
export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizeOptions = [10, 25, 50] }: {
  page: number; pageSize: number; total: number;
  onPageChange: (p: number) => void; onPageSizeChange?: (n: number) => void; pageSizeOptions?: number[];
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  // Páginas visibles: siempre primera y última, vecinas de la actual, resto colapsado con "…"
  function paginasVisibles(): (number | '…')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '…')[] = [1];
    if (current > 3) pages.push('…');
    for (let p = Math.max(2, current - 1); p <= Math.min(totalPages - 1, current + 1); p++) pages.push(p);
    if (current < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  }

  const navBtn = (disabled: boolean): CSSProperties => ({
    height: 28, padding: '0 10px', border: `1px solid ${C.n500}`, borderRadius: radius.sm,
    background: '#FFFFFF', fontSize: 12, fontFamily: FONT, color: C.n900,
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? .4 : 1, whiteSpace: 'nowrap',
  });
  const pageBtn = (activo: boolean): CSSProperties => ({
    height: 28, minWidth: 28, padding: '0 6px', borderRadius: radius.sm, fontSize: 12, fontFamily: FONT,
    cursor: 'pointer', border: `1px solid ${activo ? C.brand : C.n500}`,
    background: activo ? C.brand : '#FFFFFF', color: activo ? '#FFFFFF' : C.n900, fontWeight: 500,
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 12, fontFamily: FONT, color: C.n700 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {onPageSizeChange && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            Filas por página
            <select value={pageSize} onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
              style={{ height: 28, border: `1px solid ${C.n500}`, borderRadius: radius.sm, fontSize: 12, fontFamily: FONT, padding: '0 6px', outline: 'none', cursor: 'pointer' }}>
              {pageSizeOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </span>
        )}
        <span style={{ whiteSpace: 'nowrap' }}>{total === 0 ? 'Sin resultados' : `${from}–${to} de ${total}`}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <button onClick={() => onPageChange(current - 1)} disabled={current === 1} style={navBtn(current === 1)}>‹ Anterior</button>
        {paginasVisibles().map((p, i) => p === '…'
          ? <span key={`e${i}`} style={{ padding: '0 4px', color: C.n700 }}>…</span>
          : <button key={p} onClick={() => onPageChange(p)} aria-current={p === current ? 'page' : undefined} style={pageBtn(p === current)}>{p}</button>)}
        <button onClick={() => onPageChange(current + 1)} disabled={current === totalPages} style={navBtn(current === totalPages)}>Siguiente ›</button>
      </div>
    </div>
  );
}
