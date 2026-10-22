'use client';
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Modal, SearchInput, StatusBadge } from '@/components/suite/ui';
import { IconButton, Popover, LinkButton } from '@/components/configuracion/kit';
import { useHotel, totalReserva } from './store';
import { HOY, REGIMENES, TIPOS, fmtRango, noches, type Reserva } from './datos';
import { Alerta, money } from './ui';
import { EstadoRegistro, TarjetaRegistro } from './TarjetaRegistro';
import { td, th } from './checkinPiezas';
import { FormularioCheckIn } from './CheckInFormulario';
import { MontoCelda } from '@/components/suite/Monto';


// ── Piezas comunes de los listados de llegadas y salidas ────────────────────
/** Pestañas «Pendientes / Listas» con contador. */
function Pestanas({ valor, onChange, pendientes, listas }: { valor: 'p' | 'l'; onChange: (v: 'p' | 'l') => void; pendientes: number; listas: number }) {
  const b = (v: 'p' | 'l', label: string, n: number) => {
    const on = valor === v;
    return <button type="button" role="tab" aria-selected={on} onClick={() => onChange(v)}
      style={{ padding: '8px 2px', marginRight: 22, border: 'none', borderBottom: `2px solid ${on ? C.brand : 'transparent'}`, background: 'none', color: on ? C.brand : C.n700, fontWeight: on ? 600 : 400, fontSize: 13, fontFamily: FONT, cursor: 'pointer' }}>
      {label} <span style={{ fontSize: 11.5, padding: '1px 7px', borderRadius: 10, background: on ? C.brandBg : C.n200, marginLeft: 4 }}>{n}</span>
    </button>;
  };
  return <div role="tablist" style={{ display: 'flex', borderBottom: `1px solid ${C.n500}` }}>{b('p', 'Pendientes', pendientes)}{b('l', 'Listas', listas)}</div>;
}
/** Nota de la reserva (condiciones especiales y observaciones) como ícono con popover. */
function Nota({ r }: { r: Reserva }) {
  const [open, setOpen] = useState(false);
  if (!r.condiciones.length && !r.observaciones) return <span style={{ color: C.n500 }}>—</span>;
  return (
    <span style={{ position: 'relative' }}>
      <IconButton label="Ver condiciones y observaciones" tono="marca" onClick={() => setOpen(true)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 4h14v12l-4 4H5z M15 20v-4h4 M8 9h8 M8 13h5" /></svg>
      </IconButton>
      <Popover open={open} onClose={() => setOpen(false)} width={260} align="right">
        <div style={{ padding: 12, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {r.condiciones.length > 0 && <><b style={{ fontWeight: 600 }}>Condiciones especiales</b>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{r.condiciones.map(c => <StatusBadge key={c} label={c} color="brand" />)}</div></>}
          {r.observaciones && <><b style={{ fontWeight: 600 }}>Observaciones</b><p style={{ margin: 0, color: C.n700, whiteSpace: 'normal' }}>{r.observaciones}</p></>}
        </div>
      </Popover>
    </span>
  );
}
const tipoNombre = (id: string) => TIPOS.find(t => t.id === id)?.nombre ?? id;
/** Huésped en dos líneas: nombre y tipo de habitación. */
const Huesped = ({ r }: { r: Reserva }) => (
  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
    <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.nombre}>{r.nombre}</span>
    <span style={{ fontSize: 11.5, color: C.n700 }}>{tipoNombre(r.tipo)} · {r.adultos} ad.{r.ninos ? ` · ${r.ninos} niñ.` : ''}</span>
  </span>
);
const Vacio = ({ cols, texto }: { cols: number; texto: string }) => <tr><td colSpan={cols} style={{ ...td, color: C.n700, textAlign: 'center', padding: 20 }}>{texto}</td></tr>;
const Busqueda = ({ q, setQ }: { q: string; setQ: (v: string) => void }) => (
  <div style={{ width: 280 }}><SearchInput value={q} onChange={setQ} placeholder="Buscar reserva, nombre o habitación" width="100%" /></div>
);
const coincide = (r: Reserva, q: string) => !q.trim() || `${r.numero} ${r.nombre} ${r.habitacion}`.toLowerCase().includes(q.trim().toLowerCase());
const tabla = (headers: string[], derecha: number[], filas: ReactNode) => (
  <div style={{ border: `1px solid ${C.n500}`, borderRadius: radius.md, overflow: 'auto', maxHeight: '56vh' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{headers.map((c, i) => <th key={i} style={{ ...th, padding: '9px 10px', background: C.n200, position: 'sticky', top: 0, zIndex: 1, textAlign: derecha.includes(i) ? 'right' : 'left' }}>{c}</th>)}</tr></thead>
      <tbody>{filas}</tbody>
    </table>
  </div>
);
const celda = { ...td, padding: '9px 10px', verticalAlign: 'middle' as const };

// ── Listado de llegadas ─────────────────────────────────────────────────────
export function ListadoLlegadas({ onClose }: { onClose: () => void }) {
  const h = useHotel();
  const [pest, setPest] = useState<'p' | 'l'>('p');
  const [q, setQ] = useState('');
  const [form, setForm] = useState<string | null>(null);
  const [tarjeta, setTarjeta] = useState<string | null>(null);
  const [paraCheckin, setParaCheckin] = useState(false);
  const [revertir, setRevertir] = useState<Reserva | null>(null);
  const listas = h.reservas.filter(r => r.entrada === HOY && r.estado === 'In-House');
  const pendientes = h.reservas.filter(r => r.entrada === HOY && r.estado === 'Confirmada');
  const lista = (pest === 'p' ? pendientes : listas).filter(r => coincide(r, q));
  const saldo = (r: Reserva) => Math.max(0, totalReserva(r) - r.pagado);
  const headers = ['Reserva', 'Huésped', 'Hab.', 'Pendiente', 'Garantía', 'Crédito', 'Notas', 'Registro del huésped', ''];
  return (
    <>
      <Modal open onClose={onClose} title="Llegadas de hoy (Check-In)" width={1040} footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <Pestanas valor={pest} onChange={setPest} pendientes={pendientes.length} listas={listas.length} />
            <Busqueda q={q} setQ={setQ} />
          </div>
          {tabla(headers, [3, 4], <>
            {lista.length === 0 && <Vacio cols={headers.length} texto={q ? 'Ninguna llegada coincide con la búsqueda.' : pest === 'p' ? 'No hay llegadas pendientes.' : 'Todavía no hay check-ins hoy.'} />}
            {lista.map(r => (
              <tr key={r.id}>
                <td style={celda}><b style={{ color: C.brand, fontWeight: 500 }}>{r.numero}</b></td>
                <td style={{ ...celda, maxWidth: 240, whiteSpace: 'normal' }}><Huesped r={r} /></td>
                <td style={celda}>{r.habitacion || <i style={{ color: C.n700 }}>Sin asignar</i>}</td>
                <td style={{ ...celda, textAlign: 'right' }} title={`Total ${money(totalReserva(r))} · Pagado ${money(r.pagado)}`}><MontoCelda texto={money(saldo(r))} /></td>
                <td style={{ ...celda, textAlign: 'right' }}><MontoCelda texto={money(r.depGarantia)} /></td>
                <td style={celda}>{pest === 'p' ? <Checkbox checked={r.credito} onChange={b => h.setReserva(r.id, { credito: b })} label={r.credito ? 'Sí' : 'No'} /> : r.credito ? 'Sí' : 'No'}</td>
                <td style={celda}><Nota r={r} /></td>
                {/* Registro: o los enlaces del Web Check-In (pendiente) o la tarjeta (completada), nunca los dos */}
                <td style={celda}>
                  <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                    <EstadoRegistro r={r} />
                    <LinkButton onClick={() => { setParaCheckin(false); setTarjeta(r.id); }}>{r.tarjetaLista ? 'Ver tarjeta' : 'Web Check-In'}</LinkButton>
                  </span>
                </td>
                <td style={{ ...celda, textAlign: 'right' }}>
                  {pest === 'p'
                    ? <Button onClick={() => (r.tarjetaLista ? setForm(r.id) : (setParaCheckin(true), setTarjeta(r.id)))} title={r.tarjetaLista ? undefined : 'Primero completa el registro del huésped'} style={{ height: 28 }}>Check-In</Button>
                    : <Button variant="secondary" onClick={() => setRevertir(r)} style={{ height: 28 }}>Revertir</Button>}
                </td>
              </tr>
            ))}
          </>)}
        </div>
      </Modal>
      {form && <FormularioCheckIn reservaId={form} onClose={() => setForm(null)} />}
      {tarjeta && <TarjetaRegistro reservaId={tarjeta} onClose={() => setTarjeta(null)} alCompletar={paraCheckin ? () => { setForm(tarjeta); setTarjeta(null); } : undefined} />}
      <Alerta open={!!revertir} titulo="¿Revertir el check-in?" onClose={() => setRevertir(null)} onConfirm={() => { h.revertirCheckIn(revertir!.id); setRevertir(null); }}>
        La reserva {revertir?.numero} vuelve a «Confirmada» y la habitación {revertir?.habitacion} queda pendiente de check-in. Solo es posible antes de la auditoría nocturna.
      </Alerta>
    </>
  );
}

// ── Listado de salidas ──────────────────────────────────────────────────────
export function ListadoSalidas({ onClose }: { onClose: () => void }) {
  const h = useHotel();
  const [pest, setPest] = useState<'p' | 'l'>('p');
  const [q, setQ] = useState('');
  const [confirmar, setConfirmar] = useState<Reserva | null>(null);
  const listas = h.reservas.filter(r => r.checkoutEn === HOY);
  const pendientes = h.reservas.filter(r => r.salida === HOY && r.estado === 'In-House');
  const lista = (pest === 'p' ? pendientes : listas).filter(r => coincide(r, q));
  const headers = pest === 'p' ? ['Reserva', 'Huésped', 'Hab.', 'Cuentas', 'Saldo', 'Crédito', 'Notas', ''] : ['Reserva', 'Huésped', 'Hab.', 'Total', 'Pagado', 'Crédito', 'Notas'];
  return (
    <>
      <Modal open onClose={onClose} title="Salidas de hoy (Check-Out)" width={980} footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <Pestanas valor={pest} onChange={setPest} pendientes={pendientes.length} listas={listas.length} />
            <Busqueda q={q} setQ={setQ} />
          </div>
          {tabla(headers, pest === 'p' ? [4] : [3, 4], <>
            {lista.length === 0 && <Vacio cols={headers.length} texto={q ? 'Ninguna salida coincide con la búsqueda.' : pest === 'p' ? 'No hay salidas pendientes.' : 'Todavía no hay check-outs hoy.'} />}
            {lista.map(r => {
              const abiertas = r.cuentas.filter(c => c.saldo > 0);
              const saldo = abiertas.reduce((s, c) => s + c.saldo, 0);
              return (
                <tr key={r.id}>
                  <td style={celda}><b style={{ color: C.brand, fontWeight: 500 }}>{r.numero}</b></td>
                  <td style={{ ...celda, maxWidth: 240, whiteSpace: 'normal' }}><Huesped r={r} /></td>
                  <td style={celda}>{r.habitacion}</td>
                  {pest === 'p' ? <>
                    <td style={{ ...celda, whiteSpace: 'normal' }}>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {r.cuentas.map(c => (
                          <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span>{c.nombre}</span>
                            {c.saldo > 0
                              ? <><StatusBadge label={`Abierta · ${money(c.saldo)}`} color="yellow" /><LinkButton onClick={() => h.pagarCuenta(r.id, c.id)}>Pagar</LinkButton></>
                              : <StatusBadge label="Sin saldo" color="green" />}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td style={{ ...celda, textAlign: 'right', fontWeight: saldo ? 600 : 400 }}><MontoCelda texto={money(saldo)} /></td>
                  </> : <>
                    <td style={{ ...celda, textAlign: 'right' }}><MontoCelda texto={money(totalReserva(r))} /></td>
                    <td style={{ ...celda, textAlign: 'right' }}><MontoCelda texto={money(r.pagado)} /></td>
                  </>}
                  <td style={celda}>{r.credito ? 'Sí' : 'No'}</td>
                  <td style={celda}><Nota r={r} /></td>
                  {pest === 'p' && <td style={{ ...celda, textAlign: 'right' }}>
                    <Button onClick={() => setConfirmar(r)} disabled={abiertas.length > 0} title={abiertas.length ? 'Primero paga las cuentas abiertas' : undefined} style={{ height: 28 }}>Check-Out</Button>
                  </td>}
                </tr>
              );
            })}
          </>)}
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
  const router = useRouter();
  const r = h.reservas.find(x => x.id === reservaId);
  const items = useMemo(() => r ? [
    ['Reserva', r.numero], ['Estado', r.estado], ['Huésped', r.nombre], ['Habitación', `${r.habitacion} · ${TIPOS.find(t => t.id === r.tipo)?.nombre}`],
    ['Fechas', `${fmtRango(r.entrada, r.salida)} (${noches(r.entrada, r.salida)} noches)`], ['Pax', `${r.adultos} adultos · ${r.ninos} niños`],
    ['Tarifa', `${r.tarifa} · ${money(r.precio)} / noche`], ['Régimen', `${r.regimen} · ${REGIMENES[r.regimen] ?? ''}`], ['Empresa / canal', r.empresa || 'Directo'],
    ['Total', money(totalReserva(r))], ['Pagado', money(r.pagado)], ['Saldo de cuentas', money(r.cuentas.reduce((s, c) => s + c.saldo, 0))],
  ] : [], [r]);
  if (!r) return null;
  return (
    <Modal open onClose={onClose} title={`Reserva ${r.numero}`} width={520}
      footer={<><Button variant="secondary" onClick={onClose}>Cerrar</Button><Button onClick={() => router.push(`/reservaciones/reservas?id=${r.id}`)}>Abrir reserva completa</Button></>}>
      <dl style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px 12px', margin: 0, fontSize: 12 }}>
        {items.map(([k, v]) => <Fragment key={k}><dt style={{ color: C.n700 }}>{k}</dt><dd style={{ margin: 0 }}>{v}</dd></Fragment>)}
      </dl>
      {(r.condiciones.length > 0 || r.observaciones || r.observacionesInternas) && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.n500}`, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
          {r.condiciones.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}><span style={{ color: C.n700, width: 140 }}>Condiciones</span>{r.condiciones.map(c => <StatusBadge key={c} label={c} color="brand" />)}</div>}
          {r.observaciones && <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12 }}><span style={{ color: C.n700 }}>Observaciones</span><span>{r.observaciones}</span></div>}
          {r.observacionesInternas && <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12 }}><span style={{ color: C.n700 }}>Notas internas</span><span style={{ whiteSpace: 'pre-line' }}>{r.observacionesInternas}</span></div>}
        </div>
      )}
    </Modal>
  );
}
