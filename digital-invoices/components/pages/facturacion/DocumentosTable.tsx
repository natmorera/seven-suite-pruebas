'use client';
import { ReactNode, useState } from 'react';
import { Flotante } from './NuevaFacturaPartes';
import { C, FONT, Checkbox } from '@/components/ui/primitives';

const IcMore = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
    <circle cx="3" cy="7" r="1.3" /><circle cx="7" cy="7" r="1.3" /><circle cx="11" cy="7" r="1.3" />
  </svg>
);
const IcSort = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
    <path d="M2 4l3-3 3 3M2 6l3 3 3-3" />
  </svg>
);

export interface DocColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right';
  wrap?: boolean;             // permite varias líneas (nombres largos)
  render: (row: T) => ReactNode;
}

export interface RowAction<T> {
  label: string;
  onClick: (row: T) => void;
  danger?: boolean;
  grupo?: number;    // acciones del mismo grupo van juntas; entre grupos hay una línea
}

export default function DocumentosTable<T>({
  columns, rows, rowKey, selected, onToggleAll, onToggleRow, rowActions,
  openMenuId, onOpenMenuChange, emptyMessage = 'No hay documentos que coincidan con los filtros aplicados.', empty, accionFija, onRowClick,
}: {
  // Tocar cualquier espacio de la fila (fuera de botones, enlaces y casillas) abre el documento
  onRowClick?: (row: T) => void;
  // Acción principal de la fila, fija a la derecha junto al menú ⋯ (siempre visible)
  accionFija?: (row: T) => ReactNode;
  columns: DocColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  selected: Set<string>;
  onToggleAll: (checked: boolean) => void;
  onToggleRow: (id: string, checked: boolean) => void;
  rowActions?: RowAction<T>[] | ((row: T) => RowAction<T>[]);
  openMenuId?: string | null;
  onOpenMenuChange?: (id: string | null) => void;
  emptyMessage?: string;
  empty?: ReactNode;
}) {
  return (
    <div style={{ background: C.n000, border: `1px solid ${C.n500}`, borderRadius: 10, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT, fontSize: 12 }}>
        <thead>
          <tr style={{ background: C.n200, borderBottom: `1px solid ${C.n500}` }}>
            <th style={{ padding: '8px 14px', width: 36 }}>
              <Checkbox checked={rows.length > 0 && selected.size === rows.length} onChange={onToggleAll} />
            </th>
            {columns.map(col => (
              <th key={col.key} style={{ padding: '8px 10px', textAlign: col.align === 'right' ? 'right' : 'left',
                fontSize: 11, fontWeight: 500, color: C.n700, whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {col.label}
                  {col.sortable && <IcSort />}
                </span>
              </th>
            ))}
            {rowActions && <th style={{ width: 1, position: 'sticky', right: 0, background: C.n200, boxShadow: '-1px 0 0 ' + C.n500, fontSize: 11, fontWeight: 500, color: C.n700, padding: '8px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>{accionFija ? 'Acciones' : ''}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const id = rowKey(row);
            return (
              <tr key={id} style={{ borderBottom: `1px solid ${C.n500}`, cursor: onRowClick ? 'pointer' : undefined }}
                onClick={onRowClick ? e => {
                  if ((e.target as HTMLElement).closest('button, a, input, label, select, [data-flotante], [role="menu"]')) return;
                  if (window.getSelection()?.toString()) return;
                  onRowClick(row);
                } : undefined}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.n200}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                <td style={{ padding: '8px 14px' }}>
                  <Checkbox checked={selected.has(id)} onChange={c => onToggleRow(id, c)} />
                </td>
                {columns.map(col => (
                  <td key={col.key} style={{ padding: '8px 10px', textAlign: col.align === 'right' ? 'right' : 'left', color: C.n900, whiteSpace: col.wrap ? 'normal' : 'nowrap' }}>
                    {col.render(row)}
                  </td>
                ))}
                {rowActions && (() => {
                  const acciones = typeof rowActions === 'function' ? rowActions(row) : rowActions;
                  return (
                    <td style={{ padding: '8px 14px', position: 'sticky', right: 0, background: '#fff', boxShadow: '-1px 0 0 ' + C.n500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, whiteSpace: 'nowrap' }}>
                      {accionFija?.(row)}
                      <MenuFila abierto={openMenuId === id} onCambiar={v => onOpenMenuChange?.(v ? id : null)}
                        acciones={acciones.map(a => ({ label: a.label, danger: a.danger, grupo: a.grupo, onClick: () => { onOpenMenuChange?.(null); a.onClick(row); } }))} />
                      </div>
                    </td>
                  );
                })()}
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={columns.length + 2} style={empty ? { padding: 0 } : { padding: '32px 14px', textAlign: 'center', color: C.n700 }}>{empty ?? emptyMessage}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Menú "⋯" de la fila: se dibuja en una capa flotante (portal) para que el
// scroll horizontal de la tabla no lo recorte.
function MenuFila({ abierto, onCambiar, acciones }: { abierto: boolean; onCambiar: (v: boolean) => void; acciones: { label: string; danger?: boolean; grupo?: number; onClick: () => void }[] }) {
  const [ancla, setAncla] = useState<HTMLButtonElement | null>(null);
  return (
    <>
      <button ref={setAncla} onClick={() => onCambiar(!abierto)} onBlur={() => setTimeout(() => onCambiar(false), 150)} aria-label="Más opciones"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, display: 'flex', padding: 4 }}>
        <IcMore />
      </button>
      <Flotante anchor={ancla} open={abierto} width={240}>
        {acciones.map((a, i) => (
          <div key={a.label} onClick={a.onClick}
            style={{ padding: '9px 14px', fontSize: 12, cursor: 'pointer', color: a.danger ? C.error : C.n900, fontFamily: FONT,
              borderTop: i > 0 && a.grupo !== undefined && a.grupo !== acciones[i - 1].grupo ? `1px solid ${C.n500}` : 'none' }}
            onMouseEnter={e => (e.currentTarget.style.background = C.n200)} onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
            {a.label}
          </div>
        ))}
      </Flotante>
    </>
  );
}
