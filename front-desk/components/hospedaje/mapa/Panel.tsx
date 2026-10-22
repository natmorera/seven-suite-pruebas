'use client';
// Mapa de habitaciones: panel lateral con el detalle de la habitación, la acción principal y las demás.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { C, FONT, radius, shadow, Z } from '@/components/suite/tokens';
import { Button } from '@/components/suite/ui';
import { TextArea } from '@/components/configuracion/kit';
import { useHotel } from '@/components/hotel/store';
import { HOY, TIPOS, fmtRango, noches, type Habitacion, type Reserva } from '@/components/hotel/datos';
import { MenuBoton, money } from '@/components/hotel/ui';
import { EST, SUCIA, titulo, type ModalMapa } from './comun';
import { IcEscoba } from './Tarjetas';

// ── Panel lateral de la habitación (clic) ───────────────────────────────────
function Dato({ k, v }: { k: string; v: React.ReactNode }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5, padding: '6px 0' }}><span style={{ color: C.n700 }}>{k}</span><span style={{ color: C.n900, textAlign: 'right' }}>{v}</span></div>;
}
function Bloque({ titulo: t, children }: { titulo: string; children: React.ReactNode }) {
  return <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><h3 style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: '.06em', color: C.n700 }}>{t.toUpperCase()}</h3>{children}</section>;
}

export function PanelHabitacion({ hab, onClose, abrir, desbloquear, pedirCheckout, anular }: {
  hab: Habitacion; onClose: () => void; abrir: (m: ModalMapa) => void; desbloquear: () => void; pedirCheckout: (r: Reserva) => void; anular: (r: Reserva) => void;
}) {
  const h = useHotel();
  const [obs, setObs] = useState(hab.observaciones);
  const r = hab.reservaId ? h.reservas.find(x => x.id === hab.reservaId) : undefined;
  const llegadas = h.reservas.filter(x => x.habitacion === hab.numero && x.estado === 'Confirmada' && x.entrada === HOY);
  const e = EST[hab.estado];
  const cerrar = () => { if (obs !== hab.observaciones) h.setHab(hab.numero, { observaciones: obs }); onClose(); };
  useEffect(() => {
    const esc = (ev: KeyboardEvent) => { if (ev.key === 'Escape') cerrar(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  });
  const saldo = r ? r.cuentas.reduce((s, c) => s + c.saldo, 0) : 0;

  // Acción principal según el estado y acciones secundarias
  let principal: React.ReactNode = null;
  const secundarias: { label: string; fn: () => void; peligro?: boolean }[] = [];
  if (hab.estado === 'libre') { principal = <Button onClick={() => abrir({ tipo: 'reserva', hab: hab.numero })}>Nueva reserva</Button>; secundarias.push({ label: 'Bloquear habitación', fn: () => abrir({ tipo: 'bloquear', hab: hab.numero }) }); }
  if (hab.estado === 'bloqueada') { principal = <Button onClick={desbloquear}>Desbloquear habitación</Button>; secundarias.push({ label: 'Editar bloqueo', fn: () => abrir({ tipo: 'bloquear', hab: hab.numero, editar: true }) }); }
  if ((hab.estado === 'checkin' || hab.estado === 'checkinRL') && llegadas[0]) { principal = <Button onClick={() => abrir({ tipo: 'checkin', reserva: llegadas[0].id })}>Hacer check-in</Button>; secundarias.push({ label: 'Ver reserva', fn: () => abrir({ tipo: 'ver', reserva: llegadas[0].id }) }, { label: 'Mover a otra habitación', fn: () => abrir({ tipo: 'mover', reserva: llegadas[0].id }) }); }
  if ((hab.estado === 'ocupada' || hab.estado === 'checkout') && r) {
    principal = <Button onClick={() => pedirCheckout(r)}>{hab.estado === 'checkout' ? 'Confirmar check-out' : 'Hacer check-out'}</Button>;
    secundarias.push({ label: 'Ver reserva', fn: () => abrir({ tipo: 'ver', reserva: r.id }) }, { label: 'Mover de habitación', fn: () => abrir({ tipo: 'mover', reserva: r.id }) }, { label: 'Registrar prepago', fn: () => abrir({ tipo: 'prepago', reserva: r.id }) }, { label: 'Anular reserva', fn: () => anular(r), peligro: true });
  }

  // La primera secundaria (Ver reserva, Bloquear…) queda a la vista; el resto va en «Más acciones», las de riesgo al final
  const [visible, ...resto] = secundarias.filter(a => !a.peligro);
  const menu = [...resto, ...secundarias.filter(a => a.peligro)];

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: Z.modal, fontFamily: FONT }}>
      <div onClick={cerrar} style={{ position: 'absolute', inset: 0, background: 'rgba(15,15,15,.25)' }} />
      <aside role="dialog" aria-label={`Habitación ${hab.numero}`} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(460px, 100vw)', background: C.n000, boxShadow: shadow.modal, display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '18px 20px', borderBottom: `1px solid ${C.n500}`, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20, fontWeight: 600 }}>Habitación {hab.numero}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 500, color: e.color, background: e.bg, borderRadius: 999, padding: '3px 9px' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: e.color }} />{e.label}</span>
            </span>
            <span style={{ fontSize: 12, color: C.n700 }}>{TIPOS.find(t => t.id === hab.tipo)?.nombre} · Piso {hab.piso}</span>
          </div>
          <button type="button" aria-label="Cerrar panel" onClick={cerrar} style={{ border: 'none', background: 'none', fontSize: 18, color: C.n700, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </header>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: radius.md, background: hab.sucia ? '#FFF4ED' : '#EEF8F3' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: hab.sucia ? SUCIA : '#0E7A57', fontWeight: 500 }}>{hab.sucia ? <><IcEscoba />Habitación sucia</> : '✓ Habitación limpia'}</span>
            <Button variant="secondary" style={{ height: 28 }} onClick={() => h.toggleSucia(hab.numero)}>{hab.sucia ? 'Marcar limpia' : 'Marcar sucia'}</Button>
          </div>
          {r && (hab.estado === 'ocupada' || hab.estado === 'checkout') && (
            <Bloque titulo="Huésped">
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 500 }}>{titulo(r.nombre)}</span>
                <button type="button" onClick={() => abrir({ tipo: 'ver', reserva: r.id })} style={{ border: 'none', background: 'none', padding: 0, color: C.brand, textDecoration: 'underline', fontSize: 12.5, fontFamily: FONT, cursor: 'pointer' }}>{r.numero}</button>
              </div>
              <div>
                <Dato k="Estancia" v={`${fmtRango(r.entrada, r.salida)} · ${noches(r.entrada, r.salida)} noches`} />
                <Dato k="Personas" v={`${r.adultos} adultos${r.ninos ? ` · ${r.ninos} niños` : ''}`} />
                <Dato k="Tarifa" v={`${r.tarifa} · ${money(r.precio)}`} />
                <Dato k="Régimen" v={r.regimen} />
                <Dato k="Saldo pendiente" v={<b style={{ fontWeight: 600, color: saldo > 0 ? C.error : C.n900 }}>{money(saldo)}</b>} />
              </div>
            </Bloque>
          )}
          {llegadas.length > 0 && (
            <Bloque titulo={llegadas.length === 1 ? 'Llegada de hoy' : 'Llegadas de hoy'}>
              {llegadas.map(l => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1px solid ${C.n500}`, borderRadius: radius.md }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo(l.nombre)}</div>
                    <div style={{ fontSize: 11.5, color: C.n700 }}>{l.numero} · {l.adultos + l.ninos} personas · {noches(l.entrada, l.salida)} noches</div>
                  </div>
                  {hab.estado === 'libre' && <Button variant="secondary" style={{ height: 28 }} onClick={() => abrir({ tipo: 'checkin', reserva: l.id })}>Check-in</Button>}
                </div>
              ))}
            </Bloque>
          )}
          {hab.estado === 'bloqueada' && <Bloque titulo="Motivo del bloqueo"><p style={{ margin: 0, fontSize: 13 }}>{hab.motivoBloqueo || 'Sin motivo registrado'}</p></Bloque>}
          {hab.estado === 'libre' && llegadas.length === 0 && <p style={{ margin: 0, fontSize: 12.5, color: C.n700 }}>Disponible. No hay llegadas asignadas para hoy.</p>}
          <Bloque titulo="Observaciones"><TextArea value={obs} onChange={setObs} rows={3} placeholder="Notas para recepción o ama de llaves" /></Bloque>
        </div>
        {/* Barra de acciones fija al pie, en una sola fila (mismo patrón que el panel del folio):
            a la izquierda «Más acciones» (incluye las de riesgo, en rojo, al final);
            a la derecha la acción de consulta más usada y la principal según el estado. */}
        <footer style={{ padding: '12px 20px', borderTop: `1px solid ${C.n500}`, display: 'flex', alignItems: 'center', gap: 8, background: C.n000, flexShrink: 0 }}>
          {menu.length > 0 && <MenuBoton label="Más acciones" align="left" ancho={230} opciones={menu.map(a => ({ label: a.label, onClick: a.fn, peligro: a.peligro }))} />}
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {visible && <Button variant="secondary" onClick={visible.fn}>{visible.label}</Button>}
            {principal ?? <Button variant="secondary" onClick={cerrar}>Cerrar</Button>}
          </span>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}

export function Resumen({ r }: { r: Reserva }) {
  return (
    <div style={{ background: C.n200, border: `1px solid ${C.n500}`, borderRadius: radius.md, padding: '12px 14px', display: 'grid', gridTemplateColumns: '1.3fr 1fr auto', gap: '6px 16px', fontSize: 12, color: C.n700 }}>
      <span>Huésped: <b style={{ color: C.n900, fontWeight: 400 }}>{titulo(r.nombre)}</b></span><span>Tarifa: {r.tarifa} · {money(r.precio)}</span><span style={{ textAlign: 'right' }}>Noches: {noches(r.entrada, r.salida)}</span>
      <span>Fechas: {fmtRango(r.entrada, r.salida)}</span><span>Régimen: {r.regimen}</span><span style={{ textAlign: 'right' }}>Tipo de hab: {TIPOS.find(t => t.id === r.tipo)?.nombre}</span>
    </div>
  );
}
