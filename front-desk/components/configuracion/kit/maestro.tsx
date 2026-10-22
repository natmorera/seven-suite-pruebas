'use client';
// Patrón maestro-detalle estándar de Configuración (información dentro de información), igual en
// Producción, Servicios, Contratos, Correo, Cupos y demás:
//   nivel 1 · pestañas de la pantalla (TabBar del header)
//   nivel 2 · tipo dentro de la pestaña (SubTabs: control segmentado)
//   nivel 3 · lista maestra a la izquierda (MaestroDetalle + ItemMaestro)
//   nivel 4 · detalle a la derecha: CabeceraDetalle + pestañas subrayadas (CardTabs), como el detalle de la reserva.
import { type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button } from '@/components/suite/ui';

/** Lista a la izquierda (con encabezado, búsqueda y acción) y detalle a la derecha, ambos en recuadros iguales. */
export function MaestroDetalle({ titulo, contador, buscador, accion, lista, children, vacio, anchoLista = 260, pegajoso }: {
  titulo?: string; contador?: number; buscador?: ReactNode; accion?: ReactNode; lista: ReactNode; children: ReactNode;
  /** Texto cuando no hay nada seleccionado (sustituye al detalle). */
  vacio?: string;
  anchoLista?: number;
  /** La lista queda fija al hacer scroll (listas largas con detalle largo). */
  pegajoso?: boolean;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `${anchoLista}px minmax(0, 1fr)`, gap: 16, alignItems: 'start', fontFamily: FONT }}>
      <aside style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, background: C.n000, display: 'flex', flexDirection: 'column', minHeight: 320, overflow: 'hidden', ...(pegajoso ? { position: 'sticky', top: 0 } : {}) }}>
        {(titulo || accion) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 12px', borderBottom: `1px solid ${C.n500}`, background: C.n200 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.n900 }}>{titulo}{contador !== undefined && <span style={{ fontWeight: 400, color: C.n700, marginLeft: 6 }}>{contador}</span>}</span>
            {accion}
          </div>
        )}
        {buscador && <div style={{ padding: '10px 10px 4px' }}>{buscador}</div>}
        <div role="list" style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' }}>{lista}</div>
      </aside>
      <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, background: C.n000, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0, minHeight: 320 }}>
        {vacio ? <p style={{ margin: 'auto', fontSize: 12.5, color: C.n700, textAlign: 'center' }}>{vacio}</p> : children}
      </div>
    </div>
  );
}

/** Cabecera del detalle: título, subtítulo y estado a la izquierda; acciones y Eliminar a la derecha. */
export function CabeceraDetalle({ titulo, sub, estado, acciones, onEliminar }: { titulo: ReactNode; sub?: ReactNode; estado?: ReactNode; acciones?: ReactNode; onEliminar?: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: C.n900, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>{titulo}{estado}</p>
        {sub && <p style={{ fontSize: 12, color: C.n700, margin: '3px 0 0' }}>{sub}</p>}
      </div>
      {(acciones || onEliminar) && (
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
          {acciones}
          {onEliminar && <Button variant="secondary" onClick={onEliminar} style={{ color: C.error }}>Eliminar</Button>}
        </div>
      )}
    </div>
  );
}

/** Nivel 2: tipo dentro de una pestaña (Servicios de facturación · de agencia · simples). Control segmentado. */
export function SubTabs<T extends string>({ tabs, active, onChange, style }: { tabs: readonly T[]; active: T; onChange: (t: T) => void; style?: React.CSSProperties }) {
  return (
    <div role="tablist" style={{ display: 'inline-flex', alignSelf: 'flex-start', gap: 2, padding: 3, background: C.n200, border: `1px solid ${C.n500}`, borderRadius: radius.control + 2, maxWidth: '100%', overflowX: 'auto', ...style }}>
      {tabs.map(t => {
        const on = t === active;
        return (
          <button key={t} type="button" role="tab" aria-selected={on} onClick={() => onChange(t)}
            style={{ height: 26, padding: '0 12px', fontSize: 12, borderRadius: radius.control, border: 'none', cursor: 'pointer', fontFamily: FONT, whiteSpace: 'nowrap',
              background: on ? C.n000 : 'transparent', color: on ? C.brand : C.n700, fontWeight: on ? 600 : 400, boxShadow: on ? '0 1px 2px rgba(0,0,0,.08)' : 'none' }}>
            {t}
          </button>
        );
      })}
    </div>
  );
}
