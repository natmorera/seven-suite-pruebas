'use client';
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { C, FONT } from '@/components/suite/tokens';
import { Button, Checkbox, Modal, StatusBadge } from '@/components/suite/ui';
import { IconButton, Popover, LinkButton } from '@/components/configuracion/kit';
import { useHotel, totalReserva } from './store';
import { HOY, REGIMENES, TIPOS, fmtRango, noches, type Reserva } from './datos';
import { Alerta, money } from './ui';
import { IcQR, QRCheckIn, TarjetaRegistro } from './TarjetaRegistro';
import { td, th } from './checkinPiezas';
import { FormularioCheckIn } from './CheckInFormulario';


function Titulo({ icono, color, children }: { icono: string; color: string; children: ReactNode }) {
  return <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color, fontWeight: 500 }}><span aria-hidden>{icono}</span>{children}</p>;
}

function VerMas({ r }: { r: Reserva }) {
  const [open, setOpen] = useState(false);
  if (!r.condiciones.length && !r.observaciones) return <span>-</span>;
  return (
    <span style={{ position: 'relative' }}>Sí <LinkButton onClick={() => setOpen(true)}>Ver más</LinkButton>
      <Popover open={open} onClose={() => setOpen(false)} width={240}>
        <div style={{ padding: 12, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <b style={{ fontWeight: 600 }}>Condiciones especiales</b>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{r.condiciones.map(c => <StatusBadge key={c} label={c} color="brand" />)}</div>
          {r.observaciones && <p style={{ margin: 0, color: C.n700 }}>{r.observaciones}</p>}
        </div>
      </Popover>
    </span>
  );
}

// ── Listado de llegadas ─────────────────────────────────────────────────────
export function ListadoLlegadas({ onClose }: { onClose: () => void }) {
  const h = useHotel();
  const [form, setForm] = useState<string | null>(null);
  const [tarjeta, setTarjeta] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [revertir, setRevertir] = useState<Reserva | null>(null);
  const listas = h.reservas.filter(r => r.entrada === HOY && r.estado === 'In-House');
  const pendientes = h.reservas.filter(r => r.entrada === HOY && r.estado === 'Confirmada');
  const cols = (r: Reserva) => {
    const total = totalReserva(r);
    return <>
      <td style={td}><b style={{ color: C.brand, fontWeight: 500 }}>{r.numero}</b></td>
      <td style={{ ...td, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.nombre}>{r.nombre}</td>
      <td style={td}>{r.tipo}</td><td style={td}>{r.habitacion || <i style={{ color: C.n700 }}>Sin asignar</i>}</td><td style={td}>{r.adultos + r.ninos}</td>
      <td style={{ ...td, textAlign: 'right' }}>{money(total)}</td><td style={{ ...td, textAlign: 'right' }}>{money(r.pagado)}</td>
      <td style={{ ...td, textAlign: 'right' }}>{money(Math.max(0, total - r.pagado))}</td><td style={{ ...td, textAlign: 'right' }}>{money(r.depGarantia)}</td>
    </>;
  };
  const cabecera = ['Reserva', 'Nombre', 'Uso', 'Hab.', 'Qty', 'Total', 'Pagado', 'Pendiente', 'Dep. Garantía', 'Crédito', 'C. Especiales', 'T. de registro', ''];
  return (
    <>
      <Modal open onClose={onClose} title="Listado de llegadas (Check-In)" width={1080} footer={<Button variant="secondary" onClick={onClose}>Cancelar</Button>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: FONT }}>
          <Titulo icono="✓" color="#2E7D32">Llegadas listas ({listas.length})</Titulo>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{cabecera.map((c, i) => <th key={i} style={{ ...th, textAlign: i >= 5 && i <= 8 ? 'right' : 'left' }}>{c}</th>)}</tr></thead>
              <tbody>
                {listas.length === 0 && <tr><td colSpan={13} style={{ ...td, color: C.n700, textAlign: 'center', padding: 16 }}>Todavía no hay check-ins hoy.</td></tr>}
                {listas.map(r => <tr key={r.id}>{cols(r)}<td style={td}>{r.credito ? 'Sí' : 'No'}</td><td style={td}><VerMas r={r} /></td>
                  <td style={td}><IconButton label="Ver tarjeta de registro" onClick={() => setTarjeta(r.id)}><IcQR /></IconButton></td>
                  <td style={td}><Button variant="secondary" onClick={() => setRevertir(r)} style={{ height: 28, color: C.brand }}>Revertir Check-In</Button></td></tr>)}
              </tbody>
            </table>
          </div>
          <Titulo icono="◷" color={C.n900}>Llegadas pendientes ({pendientes.length})</Titulo>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{cabecera.map((c, i) => <th key={i} style={{ ...th, textAlign: i >= 5 && i <= 8 ? 'right' : 'left' }}>{i === 11 ? 'Tarjeta de registro' : c}</th>)}</tr></thead>
              <tbody>
                {pendientes.length === 0 && <tr><td colSpan={13} style={{ ...td, color: C.n700, textAlign: 'center', padding: 16 }}>No hay llegadas pendientes.</td></tr>}
                {pendientes.map(r => (
                  <tr key={r.id}>{cols(r)}
                    <td style={td}><Checkbox checked={r.credito} onChange={b => h.setReserva(r.id, { credito: b })} label={r.credito ? 'Sí' : 'No'} /></td>
                    <td style={td}><VerMas r={r} /></td>
                    <td style={td}><span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      <IconButton label="Formulario QR para Check-In" onClick={() => setQr(r.id)}><IcQR /></IconButton>
                      {!r.tarjetaLista && <Button variant="secondary" onClick={() => setTarjeta(r.id)} style={{ height: 28 }}>Llenar</Button>}
                    </span></td>
                    <td style={td}>{r.tarjetaLista
                      ? <Button onClick={() => setForm(r.id)} style={{ height: 28, background: C.success, borderColor: C.success }}>Check-In</Button>
                      : <span style={{ fontSize: 11, color: C.n700 }}>Falta tarjeta</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
      {form && <FormularioCheckIn reservaId={form} onClose={() => setForm(null)} />}
      {tarjeta && <TarjetaRegistro reservaId={tarjeta} onClose={() => setTarjeta(null)} />}
      {qr && <QRCheckIn reservaId={qr} onClose={() => setQr(null)} />}
      <Alerta open={!!revertir} titulo="¿Revertir el check-in?" onClose={() => setRevertir(null)} onConfirm={() => { h.revertirCheckIn(revertir!.id); setRevertir(null); }}>
        La reserva {revertir?.numero} vuelve a «Confirmada» y la habitación {revertir?.habitacion} queda pendiente de check-in. Solo es posible antes de la auditoría nocturna.
      </Alerta>
    </>
  );
}

// ── Listado de salidas ──────────────────────────────────────────────────────
export function ListadoSalidas({ onClose }: { onClose: () => void }) {
  const h = useHotel();
  const [confirmar, setConfirmar] = useState<Reserva | null>(null);
  const listas = h.reservas.filter(r => r.checkoutEn === HOY);
  const pendientes = h.reservas.filter(r => r.salida === HOY && r.estado === 'In-House');
  return (
    <>
      <Modal open onClose={onClose} title="Listado de salidas (Check-Out)" width={1000} footer={<Button variant="secondary" onClick={onClose}>Cancelar</Button>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: FONT }}>
          <Titulo icono="✓" color="#2E7D32">Salidas listas ({listas.length})</Titulo>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Reserva', 'Nombre', 'Uso', 'Hab.', 'Qty', 'Total', 'Pagado', 'Pendiente', 'Crédito'].map((c, i) => <th key={c} style={{ ...th, textAlign: i >= 5 && i <= 7 ? 'right' : 'left' }}>{c}</th>)}</tr></thead>
            <tbody>
              {listas.length === 0 && <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: C.n700, padding: 16 }}>Todavía no hay check-outs hoy.</td></tr>}
              {listas.map(r => { const t = totalReserva(r); return (
                <tr key={r.id}><td style={td}><b style={{ color: C.brand, fontWeight: 500 }}>{r.numero}</b></td><td style={td}>{r.nombre}</td><td style={td}>{r.tipo}</td><td style={td}>{r.habitacion}</td>
                  <td style={td}>{r.adultos + r.ninos}</td><td style={{ ...td, textAlign: 'right' }}>{money(t)}</td><td style={{ ...td, textAlign: 'right' }}>{money(r.pagado)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{money(Math.max(0, t - r.pagado))}</td><td style={td}>{r.credito ? 'Sí' : 'No'}</td></tr>); })}
            </tbody>
          </table>
          <Titulo icono="◷" color={C.n900}>Salidas pendientes ({pendientes.length})</Titulo>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Reserva', 'Nombre', 'Uso', 'Hab.', 'Qty', 'Saldo', 'Crédito', 'Cuenta', 'Acciones'].map((c, i) => <th key={c} style={{ ...th, textAlign: i === 5 ? 'right' : 'left' }}>{c}</th>)}</tr></thead>
            <tbody>
              {pendientes.length === 0 && <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: C.n700, padding: 16 }}>No hay salidas pendientes.</td></tr>}
              {pendientes.flatMap(r => {
                const abiertas = r.cuentas.filter(c => c.saldo > 0);
                return r.cuentas.map((c, i) => (
                  <tr key={c.id}>
                    <td style={td}><b style={{ color: C.brand, fontWeight: 500 }}>{r.numero}{r.cuentas.length > 1 ? `_${i + 1}` : ''}</b></td><td style={td}>{r.nombre}</td><td style={td}>{r.tipo}</td>
                    <td style={td}>{r.habitacion}</td><td style={td}>{r.adultos + r.ninos}</td><td style={{ ...td, textAlign: 'right' }}>{money(c.saldo)}</td><td style={td}>{r.credito ? 'Sí' : 'No'}</td>
                    <td style={td}>{c.nombre}: {c.saldo > 0 ? <b style={{ color: '#B45309', fontWeight: 500 }}>Abierta</b> : 'Sin consumos'}</td>
                    <td style={td}>{c.saldo > 0
                      ? <Button variant="secondary" onClick={() => h.pagarCuenta(r.id, c.id)} style={{ height: 28, color: C.brand }}>Pagar cuenta</Button>
                      : <Button variant="secondary" disabled={abiertas.length > 0} title={abiertas.length ? 'Hay cuentas abiertas en este folio' : undefined} onClick={() => setConfirmar(r)} style={{ height: 28 }}>Check-out</Button>}</td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </Modal>
      <Alerta open={!!confirmar} titulo="¿Confirmar el check-out?" onClose={() => setConfirmar(null)} onConfirm={() => { h.checkOut(confirmar!.id); setConfirmar(null); }}>
        {confirmar?.nombre} deja la habitación {confirmar?.habitacion}. La habitación quedará libre y marcada como sucia.
      </Alerta>
    </>
  );
}

/** Detalle de una reserva (Ver reserva). */
export function DetalleReserva({ reservaId, onClose }: { reservaId: string; onClose: () => void }) {
  const h = useHotel();
  const r = h.reservas.find(x => x.id === reservaId);
  const items = useMemo(() => r ? [
    ['Reserva', r.numero], ['Estado', r.estado], ['Huésped', r.nombre], ['Habitación', `${r.habitacion} · ${TIPOS.find(t => t.id === r.tipo)?.nombre}`],
    ['Fechas', `${fmtRango(r.entrada, r.salida)} (${noches(r.entrada, r.salida)} noches)`], ['Pax', `${r.adultos} adultos · ${r.ninos} niños`],
    ['Tarifa', `${r.tarifa} · ${money(r.precio)} / noche`], ['Régimen', `${r.regimen} · ${REGIMENES[r.regimen] ?? ''}`], ['Empresa / canal', r.empresa || 'Directo'],
    ['Total', money(totalReserva(r))], ['Pagado', money(r.pagado)], ['Saldo de cuentas', money(r.cuentas.reduce((s, c) => s + c.saldo, 0))],
  ] : [], [r]);
  if (!r) return null;
  return (
    <Modal open onClose={onClose} title={`Reserva ${r.numero}`} width={520} footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}>
      <dl style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px 12px', margin: 0, fontSize: 12 }}>
        {items.map(([k, v]) => <Fragment key={k}><dt style={{ color: C.n700 }}>{k}</dt><dd style={{ margin: 0 }}>{v}</dd></Fragment>)}
      </dl>
      {r.observacionesInternas && <p style={{ fontSize: 12, color: C.n700, whiteSpace: 'pre-line' }}>{r.observacionesInternas}</p>}
    </Modal>
  );
}
