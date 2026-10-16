'use client';
// Mapa de habitaciones: tarjeta (vista Tarjetas) y ficha (vista Compacta) de cada habitación.
import { C, FONT, radius } from '@/components/suite/tokens';
import { CheckFila, useSeleccion } from '@/components/layout/Pantalla';
import { noches, type Habitacion, type Reserva } from '@/components/hotel/datos';
import { money } from '@/components/hotel/ui';
import { EST, LABEL, SUCIA, corta, titulo } from './comun';

// ── Tarjeta de habitación ───────────────────────────────────────────────────
interface PropsTarjeta {
  x: Habitacion; on: boolean; elegida: boolean; s: ReturnType<typeof useSeleccion>; reserva?: Reserva; llegada?: Reserva; accion: { label: string; fn: () => void } | null;
  destino: boolean; sobre: boolean; onAbrir: () => void; onMenu: (x: number, y: number) => void; dnd: Record<string, unknown>;
}
export function TarjetaHab({ x, on, elegida, s, reserva, llegada, accion, destino, sobre, onAbrir, onMenu, dnd }: PropsTarjeta) {
  const e = EST[x.estado];
  const nombre = x.estado === 'bloqueada' ? x.motivoBloqueo || 'Sin motivo' : reserva ? titulo(reserva.nombre) : llegada ? titulo(llegada.nombre) : '';
  const detalle = x.estado === 'ocupada' && reserva ? `Sale ${corta(reserva.salida)}` : x.estado === 'checkout' && reserva ? `Saldo ${money(reserva.cuentas.reduce((t, c) => t + c.saldo, 0))}` : llegada ? `${llegada.adultos + llegada.ninos} pers. · ${noches(llegada.entrada, llegada.salida)} n.` : '';
  return (
    <div className={`hab-card${destino ? ' destino' : ''}${sobre ? ' sobre' : ''}`} role="button" tabIndex={0} aria-pressed={on} aria-label={`Habitación ${x.numero}, ${LABEL[x.estado]}${x.sucia ? ', sucia' : ''}`}
      onClick={onAbrir} onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onAbrir(); } }}
      onContextMenu={ev => { ev.preventDefault(); onMenu(ev.clientX, ev.clientY); }} {...dnd}
      style={{ position: 'relative', background: elegida ? C.brandBg : C.n000, border: `1px solid ${on || elegida ? C.brand : C.n500}`, borderRadius: radius.md, padding: '12px 14px 12px 17px',
        cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120, overflow: 'hidden', fontFamily: FONT }}>
      <span aria-hidden style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: e.color }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 600, color: C.n900, letterSpacing: '-.01em' }}>{x.numero}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, color: e.color, background: e.bg, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>{e.label}</span>
        <span className="hab-check" style={{ marginLeft: 'auto', opacity: elegida ? 1 : undefined }}><CheckFila s={s} id={x.numero} label={`Seleccionar habitación ${x.numero}`} /></span>
      </div>
      <span title={nombre} style={{ fontSize: 12.5, color: nombre ? C.n900 : C.n700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombre || (x.estado === 'libre' ? 'Disponible' : '—')}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.n700, marginTop: 'auto', minHeight: 26 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {x.sucia ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: SUCIA, fontWeight: 500 }}><IcEscoba />Sucia</span> : detalle}
        </span>
        {accion && <button type="button" className="hab-accion" onClick={ev => { ev.stopPropagation(); accion.fn(); }}>{accion.label}</button>}
      </div>
    </div>
  );
}
/** Vista compacta: número, color de estado y marca de sucia. */
export function Ficha({ x, on, elegida, reserva, llegada, destino, sobre, onAbrir, onMenu, dnd }: PropsTarjeta) {
  const e = EST[x.estado];
  const nombre = reserva ? titulo(reserva.nombre) : llegada ? titulo(llegada.nombre) : x.motivoBloqueo;
  return (
    <div className={`hab-card${destino ? ' destino' : ''}${sobre ? ' sobre' : ''}`} role="button" tabIndex={0} aria-pressed={on} aria-label={`Habitación ${x.numero}, ${LABEL[x.estado]}${x.sucia ? ', sucia' : ''}`} title={`${x.numero} · ${LABEL[x.estado]}${nombre ? ` · ${nombre}` : ''}${x.sucia ? ' · sucia' : ''}`}
      onClick={onAbrir} onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onAbrir(); } }} onContextMenu={ev => { ev.preventDefault(); onMenu(ev.clientX, ev.clientY); }} {...dnd}
      style={{ position: 'relative', height: 56, borderRadius: radius.md, border: `1px solid ${on || elegida ? C.brand : 'transparent'}`, background: e.bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 2, cursor: 'pointer', fontFamily: FONT }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: e.color }}>{x.numero}</span>
      <span style={{ fontSize: 11, color: e.color, opacity: .85 }}>{e.label.split(' ·')[0]}</span>
      {x.sucia && <span aria-hidden style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: SUCIA }} />}
    </div>
  );
}
export const IcEscoba = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M19 3 12 10M8.5 12.5l3 3M5 14l5 5-1.5 2.5L3 16z" /></svg>;
