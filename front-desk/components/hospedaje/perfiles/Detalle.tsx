'use client';
// Perfiles: cabecera del perfil (avatar, contacto, KPIs), resumen, historial de estancias, canjes y envío de mensajes.
import { useState, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Input, Modal, Radio, StatusBadge } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { CardTabs, Campo, TextArea } from '@/components/configuracion/kit';
import { useHotel, totalReserva } from '@/components/hotel/store';
import { HOY, TIPOS, fmtF, noches, type Perfil } from '@/components/hotel/datos';
import { FechaBoton, FiltroChecks, MenuBoton, exportarCSV, money } from '@/components/hotel/ui';
import { ESTADO_UI } from '@/components/hotel/reservas';
import { ESTADOS_RESERVA } from '@/components/hotel/datos';
import type { BadgeColor } from '@/components/suite/ui';

export type Vista = 'Resumen' | 'Información' | 'Historial de reservas';

const COLORES_AVATAR = ['#213C89', '#0E7A57', '#6D4ED8', '#C77700', '#B4235A', '#0F6E8C'];
/** Iniciales del nombre en un círculo (se reconoce al huésped por su nombre, no por la identificación). */
export function Avatar({ nombre, size = 40 }: { nombre: string; size?: number }) {
  const ini = nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  const color = COLORES_AVATAR[[...nombre].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORES_AVATAR.length];
  return <span aria-hidden style={{ width: size, height: size, borderRadius: '50%', background: `${color}18`, color, fontSize: size * 0.38, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ini}</span>;
}
const reservasDe = (rs: ReturnType<typeof useHotel>['reservas'], p: Perfil) => rs.filter(r => r.perfilId === p.id || (p.tipo === 'empresa' && r.empresa === p.nombre));

export function CabeceraPerfil({ p, vista, setVista, onReservar, onMensaje, onEditar }: { p: Perfil; vista: Vista; setVista: (v: Vista) => void; onReservar: () => void; onMensaje: () => void; onEditar: () => void }) {
  const h = useHotel();
  const rs = reservasDe(h.reservas, p);
  const validas = rs.filter(r => ['In-House', 'Completada'].includes(r.estado));
  const enCasa = rs.find(r => r.estado === 'In-House');
  const proxima = rs.filter(r => ['Confirmada', 'Solicitada'].includes(r.estado) && r.entrada >= HOY).sort((a, b) => a.entrada.localeCompare(b.entrada))[0];
  const ultima = validas.filter(r => r.estado === 'Completada').sort((a, b) => b.salida.localeCompare(a.salida))[0];
  const gasto = validas.reduce((s, r) => s + totalReserva(r), 0);
  const saldo = rs.filter(r => r.estado === 'In-House').reduce((s, r) => s + r.cuentas.reduce((a, c) => a + c.saldo, 0), 0);
  const dato = (icono: ReactNode, texto: string) => texto ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.n700, whiteSpace: 'nowrap' }}>{icono}{texto}</span> : null;
  const kpi = (l: string, v: ReactNode, sub?: string) => <div style={{ flex: 1, minWidth: 120, padding: '12px 16px', borderRight: `1px solid ${C.n500}` }}><div style={{ fontSize: 11.5, color: C.n700 }}>{l}</div><div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{v}</div>{sub && <div style={{ fontSize: 11, color: C.n700, marginTop: 2 }}>{sub}</div>}</div>;
  return (
    <section style={{ background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.card, overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '20px 20px 16px' }}>
        <Avatar nombre={p.nombre} size={56} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {p.nombre}
            {p.extra.vip && <StatusBadge label="VIP" color="yellow" />}
            {enCasa && <StatusBadge label={`En casa · Hab. ${enCasa.habitacion}`} color="green" />}
          </h2>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {dato(<IcoMail />, p.email)}{dato(<IcoTel />, p.telefono)}{dato(<IcoGlobo />, p.nacionalidad || p.dir.pais)}
            {dato(<IcoId />, p.numeroId ? `${p.tipoId} ${p.numeroId}` : '')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Button variant="secondary" onClick={onMensaje}>Enviar mensaje</Button>
          <Button variant="secondary" onClick={onEditar}>Editar</Button>
          <Button icon={<IcPlus size={12} />} onClick={onReservar}>Crear reserva</Button>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', borderTop: `1px solid ${C.n500}`, background: C.n200 }}>
        {kpi('Estancias', validas.length, `${validas.reduce((s, r) => s + noches(r.entrada, r.salida), 0)} noches`)}
        {kpi('Consumo total', money(gasto), validas.length ? `Prom. ${money(gasto / validas.length)} por estancia` : undefined)}
        {kpi('Última visita', ultima ? fmtF(ultima.salida) : '—', ultima ? TIPOS.find(t => t.id === ultima.tipo)?.nombre : undefined)}
        {kpi('Próxima llegada', proxima ? fmtF(proxima.entrada) : '—', proxima ? proxima.numero : undefined)}
        {kpi('Saldo pendiente', <span style={{ color: saldo > 0 ? C.error : C.n900 }}>{money(saldo)}</span>)}
      </div>
      <div style={{ padding: '0 20px' }}><CardTabs tabs={['Resumen', 'Información', 'Historial de reservas'] as const} active={vista} onChange={setVista} /></div>
    </section>
  );
}
const ico = (d: ReactNode) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>;
const IcoMail = () => ico(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>);
const IcoTel = () => ico(<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />);
const IcoGlobo = () => ico(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>);
const IcoId = () => ico(<><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M6 16c.6-1.5 1.7-2 3-2s2.4.5 3 2M14 10h4M14 14h3" /></>);

/** Resumen del perfil: estancia actual o próxima, preferencias y últimas estancias. */
export function ResumenPerfil({ p, onVer }: { p: Perfil; onVer: () => void }) {
  const h = useHotel();
  const rs = reservasDe(h.reservas, p).sort((a, b) => b.entrada.localeCompare(a.entrada));
  const actual = rs.find(r => r.estado === 'In-House') ?? rs.filter(r => ['Confirmada', 'Solicitada'].includes(r.estado) && r.entrada >= HOY).sort((a, b) => a.entrada.localeCompare(b.entrada))[0];
  const tarjeta = (t: string, children: ReactNode, accion?: ReactNode) => (
    <section style={{ background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.card, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{t}</h3>{accion}</div>{children}
    </section>
  );
  const fila = (k: string, v: ReactNode) => <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5, padding: '5px 0' }}><span style={{ color: C.n700 }}>{k}</span><span style={{ textAlign: 'right' }}>{v || '—'}</span></div>;
  const prefs = [p.extra.idioma && `Idioma: ${p.extra.idioma}`, p.extra.moneda && `Moneda: ${p.extra.moneda}`, p.extra.credito && `Crédito ${p.extra.dias} días`, p.extra.descuento && `Descuento ${p.extra.descuento}`, p.extra.red && `Red: ${p.extra.red}`].filter(Boolean) as string[];
  const condiciones = [...new Set(rs.flatMap(r => r.condiciones))];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
      {tarjeta(actual?.estado === 'In-House' ? 'Estancia actual' : 'Próxima reserva', actual ? <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 46, height: 40, borderRadius: radius.md, background: actual.estado === 'In-House' ? C.brand : C.n200, color: actual.estado === 'In-House' ? '#fff' : C.n900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>{actual.habitacion || '—'}</span>
          <span><span style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{fmtF(actual.entrada)} – {fmtF(actual.salida)} · {noches(actual.entrada, actual.salida)} noches</span><span style={{ fontSize: 12, color: C.n700 }}>{actual.numero} · {TIPOS.find(t => t.id === actual.tipo)?.nombre} · {actual.adultos + actual.ninos} personas</span></span>
        </div>
        {fila('Tarifa', `${actual.tarifa} · ${money(actual.precio)} / noche`)}
        {fila('Saldo', <b style={{ fontWeight: 600, color: actual.cuentas.reduce((s, c) => s + c.saldo, 0) > 0 ? C.error : C.n900 }}>{money(actual.cuentas.reduce((s, c) => s + c.saldo, 0))}</b>)}
      </> : <p style={{ margin: 0, fontSize: 12.5, color: C.n700 }}>Sin estancia activa ni reservas futuras.</p>,
        actual && <a href={`/reservaciones/reservas?id=${actual.id}`} style={{ fontSize: 12, color: C.brand }}>Abrir reserva →</a>)}
      {tarjeta('Preferencias y notas', <>
        {prefs.length ? <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{prefs.map(x => <span key={x} style={{ fontSize: 11.5, background: C.n200, borderRadius: 999, padding: '3px 10px' }}>{x}</span>)}</div> : null}
        {condiciones.length > 0 && fila('Condiciones especiales', condiciones.join(', '))}
        <p style={{ margin: 0, fontSize: 12.5, color: p.extra.observaciones ? C.n900 : C.n700, whiteSpace: 'pre-wrap' }}>{p.extra.observaciones || 'Sin observaciones. Agrégalas en Información › Información adicional.'}</p>
      </>)}
      {tarjeta('Últimas estancias', rs.length ? <div>
        {rs.slice(0, 5).map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: `1px solid ${C.n500}`, fontSize: 12.5 }}>
            <span style={{ width: 92, color: C.n700 }}>{fmtF(r.entrada)}</span><span style={{ flex: 1 }}>Hab. {r.habitacion || '—'} · {noches(r.entrada, r.salida)} n.</span>
            <StatusBadge label={r.estado} color={ESTADO_UI[r.estado].color as BadgeColor} /><span style={{ width: 90, textAlign: 'right' }}>{money(totalReserva(r))}</span>
          </div>
        ))}
      </div> : <p style={{ margin: 0, fontSize: 12.5, color: C.n700 }}>Todavía no tiene reservas.</p>, rs.length > 5 && <button type="button" onClick={onVer} style={{ border: 'none', background: 'none', color: C.brand, fontSize: 12, cursor: 'pointer', fontFamily: FONT, padding: 0 }}>Ver todas ({rs.length}) →</button>)}
      {tarjeta('Facturación', <>
        {fila('Factura electrónica', p.fiscal.emitir ? 'Sí' : 'No')}
        {p.fiscal.emitir && fila('Receptor', p.fiscal.misma ? p.nombre : p.fiscal.razon)}
        {p.fiscal.emitir && fila('Correo de facturación', p.fiscal.email || p.email)}
        {fila('Crédito', p.extra.credito ? `${p.extra.dias} días${p.extra.maximo ? ` · máx. ${money(Number(p.extra.maximo))}` : ''}` : 'No')}
      </>)}
    </div>
  );
}

// ── Formulario de perfil ────────────────────────────────────────────────────
export function Seccion({ titulo, acciones, children }: { titulo: ReactNode; acciones?: ReactNode; children: ReactNode }) {
  return (
    <section style={{ background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.card, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 16 }}>{titulo}</h3>{acciones}
      </div>
      {children}
    </section>
  );
}

// ── Historial de reservas ───────────────────────────────────────────────────
export function Historial({ p }: { p: Perfil }) {
  const h = useHotel();
  const [estado, setEstado] = useState<string[]>([]);
  const [entrada, setEntrada] = useState('');
  const [salida, setSalida] = useState('');
  const [hab, setHab] = useState<string[]>([]);
  const todas = h.reservas.filter(r => r.perfilId === p.id || (p.tipo === 'empresa' && r.empresa === p.nombre)).sort((a, b) => b.entrada.localeCompare(a.entrada));
  const lista = todas.filter(r => (!estado.length || estado.includes(r.estado)) && (!entrada || r.entrada >= entrada) && (!salida || r.salida <= salida) && (!hab.length || hab.includes(r.habitacion)));
  const color = Object.fromEntries(Object.entries(ESTADO_UI).map(([k, v]) => [k, v.color])) as Record<string, BadgeColor>;
  const exportar = () => exportarCSV(`historial-${p.numeroId}`, ['Número', 'Estado', 'Entrada', 'Salida', 'Noches', 'Pax', 'Tipo', 'Habitación', 'Importe'],
    lista.map(r => [r.numero, r.estado, fmtF(r.entrada), fmtF(r.salida), noches(r.entrada, r.salida), r.adultos + r.ninos, TIPOS.find(t => t.id === r.tipo)?.nombre ?? r.tipo, r.habitacion, totalReserva(r)]));
  const th = { padding: '8px', textAlign: 'left' as const, fontSize: 12, fontWeight: 400, color: C.n700 };
  const td = { padding: '8px', fontSize: 12, borderTop: `1px solid ${C.n500}` };
  return (
    <section style={{ background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.card, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Historial de reservas</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <FiltroChecks label="Estado" value={estado} onChange={setEstado} opciones={ESTADOS_RESERVA.map(e => ({ value: e, label: e }))} />
        <FechaBoton label="Fecha de entrada" value={entrada} onChange={setEntrada} />
        <FechaBoton label="Fecha de salida" value={salida} onChange={setSalida} />
        <FiltroChecks label="Habitación" value={hab} onChange={setHab} opciones={[...new Set(todas.map(r => r.habitacion))].sort().map(x => ({ value: x, label: x }))} />
        {(estado.length || entrada || salida || hab.length) ? <Button variant="ghost" onClick={() => { setEstado([]); setEntrada(''); setSalida(''); setHab([]); }} style={{ color: C.error }}>Limpiar filtros</Button> : null}
        <span style={{ marginLeft: 'auto' }}><MenuBoton label="Exportar" opciones={[{ label: 'Excel (.csv)', onClick: exportar, disabled: !lista.length }]} /></span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Número', 'Estado', 'Entrada', 'Salida', 'Noches', 'Pax', 'Tipo', 'Habit.', 'Importe'].map((c, i) => <th key={c} style={{ ...th, textAlign: i >= 4 && i !== 6 ? 'right' : 'left' }}>{c}</th>)}</tr></thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: C.n700, padding: 24 }}>{todas.length ? 'Ninguna reserva coincide con los filtros.' : 'Este perfil todavía no tiene reservas.'}</td></tr>}
            {lista.map(r => (
              <tr key={r.id}>
                <td style={td}>{r.numero}</td><td style={td}><StatusBadge label={r.estado} color={color[r.estado]} /></td><td style={td}>{fmtF(r.entrada)}</td><td style={td}>{fmtF(r.salida)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{noches(r.entrada, r.salida)}</td><td style={{ ...td, textAlign: 'right' }}>{r.adultos + r.ninos}</td>
                <td style={td}>{TIPOS.find(t => t.id === r.tipo)?.nombre}</td><td style={{ ...td, textAlign: 'right' }}>{r.habitacion}</td><td style={{ ...td, textAlign: 'right' }}>{money(totalReserva(r))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CanjesPerfil p={p} />
    </section>
  );
}

/** Canjes de divisas vinculados al perfil (Facturación → Canje de divisas). */
function CanjesPerfil({ p }: { p: Perfil }) {
  const h = useHotel();
  const canjes = h.canjes.filter(c => c.perfilId === p.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (!canjes.length) return null;
  const th = { padding: '8px', textAlign: 'left' as const, fontSize: 12, fontWeight: 400, color: C.n700 };
  const td = { padding: '8px', fontSize: 12, borderTop: `1px solid ${C.n500}` };
  return (
    <>
      <h3 style={{ margin: '10px 0 0', fontSize: 14, fontWeight: 600 }}>Canjes de divisas</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{['N°', 'Fecha', 'Origen', 'Destino', 'Entregado', 'Habitación'].map(c => <th key={c} style={th}>{c}</th>)}</tr></thead>
        <tbody>{canjes.map(c => (
          <tr key={c.id}><td style={td}>{c.numero}</td><td style={td}>{fmtF(c.fecha.slice(0, 10))} {c.fecha.slice(11, 16)}</td><td style={td}>{c.monedaOrigen} {c.importeOrigen.toFixed(2)}</td>
            <td style={td}>{c.monedaDestino}</td><td style={td}>{c.entregado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td style={td}>{c.habitacion || '—'}</td></tr>
        ))}</tbody>
      </table>
    </>
  );
}

export function EnviarMensaje({ p, onClose, onListo }: { p: Perfil; onClose: () => void; onListo: (t: string) => void }) {
  const [canal, setCanal] = useState<'Email' | 'WhatsApp'>('Email');
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState(`Estimado(a) ${p.nombre},\n\n`);
  const destino = canal === 'Email' ? p.email : p.telefono;
  return (
    <Modal open onClose={onClose} title={`Enviar mensaje a ${p.nombre}`} width={520}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!destino || !cuerpo.trim() || (canal === 'Email' && !asunto.trim())} onClick={() => onListo(`Mensaje enviado por ${canal} a ${destino}`)}>Enviar</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 20 }}>{(['Email', 'WhatsApp'] as const).map(c => <Radio key={c} name="canal" checked={canal === c} onChange={() => setCanal(c)} label={c} />)}</div>
        <Campo label="Para"><Input value={destino || `El perfil no tiene ${canal === 'Email' ? 'correo' : 'teléfono'}`} readOnly /></Campo>
        {canal === 'Email' && <Campo label="Asunto" required><Input value={asunto} onChange={setAsunto} placeholder="Ej: Confirmación de su estancia" /></Campo>}
        <Campo label="Mensaje" required><TextArea value={cuerpo} onChange={setCuerpo} rows={6} /></Campo>
      </div>
    </Modal>
  );
}
