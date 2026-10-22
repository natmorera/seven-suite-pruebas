'use client';
// Detalle de la reserva: encabezado (estado, PDF, acciones), resumen y tabs
// Alojamiento · Huésped · Detalles · Observaciones · Mensajes · Depósitos ·
// F. Empresa (agencia) · Facturación · Bitácora.
import { useState, type CSSProperties, type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Input, StatusBadge } from '@/components/suite/ui';
import { CardTabs, Popover } from '@/components/configuracion/kit';
import { Alerta, usePrint } from '@/components/hotel/ui';
import { useHotel, saldoReserva } from '@/components/hotel/store';
import { HOY, REGIMENES, contratoDeTarifa, fmtF, fmtRango, noches, type EstadoReserva, type Reserva } from '@/components/hotel/datos';
import { ESTADO_UI, TRANSICIONES, claveDe, esAgencia, estadoGrupo, facturaAgrupada, modalidadDe, numeroDe, reservaCerrada, type GrupoReserva } from '@/components/hotel/reservas';
import { fmtMon, r2 } from '@/components/hotel/finanzas';
import { FormularioCheckIn } from '@/components/hotel/CheckInFormulario';
import { TarjetaRegistro } from '@/components/hotel/TarjetaRegistro';
import { IcChevronDown } from '@/components/suite/icons';
import { ChipEstado, ConfirmacionReserva, Desglose, SeleccionHabitacion, nombreTipo, totales } from '../comun';
import { AgregarHabitacion, AnularReserva, CambioHabitacion, DuplicarReserva, ElegirLinea, EnviarCorreo, Prorroga } from './Acciones';
import { TabBitacora, TabDepositos, TabDetalles, TabEmpresa, TabHuesped, TabMensajes, TabObservaciones } from './Pestanas';
import { TabFacturacion } from './Facturacion';

type Dlg = null | 'anular' | 'noshow' | 'duplicar' | 'correo' | 'tarjeta' | 'agregar' | 'confirmar' | 'confirmarSinDep' | 'espera'
  | { cambio: Reserva } | { prorroga: Reserva } | { elegir: 'cambio' | 'prorroga' | 'checkin' | 'checkout' } | { checkin: string } | { checkout: Reserva } | { pendiente: Reserva } | { revertir: Reserva } | { noshowLinea: Reserva };

export function DetalleReserva({ g, onAbrir, onToast }: { g: GrupoReserva; onAbrir: (clave: string) => void; onToast: (t: string) => void }) {
  const h = useHotel();
  const p = g.principal;
  const perfil = h.perfiles.find(x => x.id === p.perfilId);
  const agencia = esAgencia(p);
  const estado = estadoGrupo(g.lineas);
  const modalidad = modalidadDe(g);
  const agrupada = facturaAgrupada(g);
  const tabs = ['Alojamiento', 'Huésped', 'Detalles', 'Observaciones', 'Mensajes', 'Depósitos', ...(agencia && modalidad !== 'grupo' ? ['F. Empresa'] : []), `Facturación (${g.lineas.filter(l => l.estado !== 'Anulada').length + h.foliosCta.filter(c => c.reservaId && g.lineas.some(l => l.id === c.reservaId)).length + (agrupada ? 1 : 0)})`, 'Bitácora'];
  const [tab, setTab] = useState('Alojamiento');
  const [folioSel, setFolioSel] = useState<string | null>(null);
  const [dlg, setDlg] = useState<Dlg>(null);
  const [verEstados, setVerEstados] = useState(false);
  const [verAcciones, setVerAcciones] = useState(false);
  const [verTotal, setVerTotal] = useState(false);
  const { imprimir, portal } = usePrint();
  const t = totales(g.lineas);
  const listo = (msg: string) => { setDlg(null); onToast(msg); };
  const tabActual = tab.startsWith('Facturación') ? tabs.find(x => x.startsWith('Facturación'))! : tab;
  const ids = (es: EstadoReserva[]) => g.lineas.filter(l => es.includes(l.estado)).map(l => l.id);
  const depositado = h.depositos.some(d => d.estado === 'Activo' && g.lineas.some(l => l.id === d.reservaId)) || t.deposito > 0;
  const llegadasHoy = g.lineas.filter(l => l.estado === 'Confirmada' && l.entrada <= HOY);
  const enCasa = g.lineas.filter(l => l.estado === 'In-House');

  const transicion = (a: EstadoReserva) => {
    setVerEstados(false);
    if (a === 'Confirmada') return setDlg(depositado ? 'confirmar' : 'confirmarSinDep');
    if (a === 'Lista de espera') return setDlg('espera');
    if (a === 'Anulada') return setDlg('anular');
    if (a === 'No-Show') return g.lineas.some(l => l.estado === 'Confirmada' && l.entrada <= HOY) ? setDlg('noshow') : onToast(`El No-Show solo aplica desde el día de llegada (${fmtF(p.entrada)}).`);
    if (a === 'In-House') {
      if (!llegadasHoy.length) return onToast(`El check-in solo puede hacerse el día de llegada (${fmtF(p.entrada)}).`);
      return setDlg(llegadasHoy.length > 1 ? { elegir: 'checkin' } : { checkin: llegadasHoy[0].id });
    }
    if (a === 'Completada') {
      const r = enCasa[0];
      if (!r) return;
      return enCasa.length > 1 ? setDlg({ elegir: 'checkout' }) : pedirCheckout(r);
    }
  };
  // En las reservas que se cobran en una sola factura, el saldo se liquida al final (folio de agencia / factura única)
  const pedirCheckout = (r: Reserva) => setDlg(!agrupada && saldoReserva(r) > 0.005 ? { pendiente: r } : { checkout: r });
  const irAFacturacion = (r: Reserva) => { setFolioSel(r.id); setTab(tabs.find(x => x.startsWith('Facturación'))!); setDlg(null); };

  const opcionesAcciones: { grupo: string; items: { l: string; on: () => void; dis?: boolean; peligro?: boolean }[] }[] = [
    { grupo: 'Información de la reserva', items: [{ l: p.tarjetaLista ? 'Tarjeta de registro' : 'Registro pendiente (Web Check-In)', on: () => setDlg('tarjeta') }] },
    { grupo: 'Editar reserva', items: [{ l: 'Duplicar reserva', on: () => setDlg('duplicar') }, { l: 'Cambio de habitación', on: () => cambio(), dis: !g.lineas.some(l => ['Solicitada', 'Confirmada', 'Lista de espera', 'In-House'].includes(l.estado)) }] },
    { grupo: 'Operaciones de Reserva', items: [{ l: 'Enviar por correo', on: () => setDlg('correo') }, { l: 'Marcar reserva como No-Show', on: () => transicion('No-Show'), dis: !TRANSICIONES[estado].some(x => x.a === 'No-Show') },
      { l: 'Anular reserva', on: () => setDlg('anular'), dis: !TRANSICIONES[estado].some(x => x.a === 'Anulada'), peligro: true }] },
  ];
  const editables = g.lineas.filter(l => ['Solicitada', 'Confirmada', 'Lista de espera', 'In-House'].includes(l.estado));
  function cambio() { if (editables.length > 1) setDlg({ elegir: 'cambio' }); else if (editables[0]) setDlg({ cambio: editables[0] }); }
  function prorroga() { if (enCasa.length > 1) setDlg({ elegir: 'prorroga' }); else if (enCasa[0]) setDlg({ prorroga: enCasa[0] }); }

  const entradaG = g.lineas.reduce((m, l) => (l.entrada < m ? l.entrada : m), p.entrada);
  const salidaG = g.lineas.reduce((m, l) => (l.salida > m ? l.salida : m), p.salida);
  const vigentes = g.lineas.filter(l => l.estado !== 'Anulada');
  const pagado = r2(vigentes.reduce((s, l) => s + l.pagado, 0));
  const saldo = r2(vigentes.reduce((s, l) => s + saldoReserva(l), 0));
  const adultos = g.lineas.reduce((s, l) => s + l.adultos, 0), ninos = g.lineas.reduce((s, l) => s + l.ninos, 0);
  const titular = agencia ? p.empresa : (perfil?.nombre ?? p.nombre);
  const resumen: [string, ReactNode][] = [
    ['Perfil', <span key="p" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titular}</span><StatusBadge label={agencia || perfil?.tipo === 'empresa' ? 'Empresa' : 'Cliente'} color="brand" /></span>],
    ['Tarifa', contratoDeTarifa(p.tarifa)],
    [`Estancia · ${noches(entradaG, salidaG)} noches`, fmtRango(entradaG, salidaG)],
    ['Habitaciones', `${g.lineas.length} · ${adultos} adultos${ninos ? ` · ${ninos} niños` : ''}`],
  ];
  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: C.n900 }}>{p.numero.replace(/_\d+$/, '')}</h2>
            <span style={{ fontSize: 15, color: C.n900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360 }}>{titular}</span>
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <button type="button" onClick={() => setVerEstados(v => !v)} aria-label={`Estado: ${estado}. Cambiar estado`} aria-expanded={verEstados} disabled={!TRANSICIONES[estado].length}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 26, padding: '0 12px', border: 'none', borderRadius: radius.pill, background: ESTADO_UI[estado].hex, color: '#fff', fontSize: 12, fontFamily: FONT, cursor: TRANSICIONES[estado].length ? 'pointer' : 'default' }}>
            {estado}{TRANSICIONES[estado].length > 0 && <IcChevronDown size={11} />}
          </button>
          <Popover open={verEstados} onClose={() => setVerEstados(false)} width={230}>
            <div role="menu" style={{ padding: 8, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 11.5, color: C.n700, padding: '4px 8px 6px' }}>Cambiar estado de la reserva</span>
              {TRANSICIONES[estado].map(x => <button key={x.a} role="menuitem" type="button" onClick={() => transicion(x.a)} className="suite-fila"
                style={{ textAlign: 'left', padding: '9px 8px', border: 'none', background: 'none', fontSize: 12, fontFamily: FONT, color: x.peligro ? C.error : C.n900, cursor: 'pointer', borderRadius: radius.control }}>{x.label}</button>)}
            </div>
          </Popover>
        </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, color: C.n700 }}>
            <span>Reserva {agencia ? 'de agencia' : p.cliente === 'Tarifa Corporativa' ? 'corporativa' : 'directa'}</span>
            {p.creada && <span>· Creada el {fmtF(p.creada.slice(0, 10))}</span>}
            {p.idExterno && <span>· ID externo <b style={{ color: C.n900, fontWeight: 500 }}>{p.idExterno}</b></span>}
            {modalidad && <span title={modalidad === 'grupo' ? 'Una sola factura: folio de agencia + cuenta de consumo por habitación' : p.facturaUnica === undefined ? 'La facturación se define en el check-in' : p.facturaUnica ? 'Una sola factura' : 'Factura separada por habitación'}><StatusBadge label={modalidad === 'grupo' ? 'Grupal' : 'Individual (múltiple)'} color="brand" /></span>}
          </div>
        </div>
        <span style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={() => imprimir(<ConfirmacionReserva ls={g.lineas} perfil={perfil} />)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" /><path d="M14 3v5h5" /></svg>PDF</span>
          </Button>
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <Button variant="secondary" onClick={() => setVerAcciones(v => !v)}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>Acciones<IcChevronDown size={12} /></span></Button>
            <Popover open={verAcciones} onClose={() => setVerAcciones(false)} width={250} align="right">
              <div role="menu" style={{ padding: 8 }}>
                {opcionesAcciones.map((s, i) => (
                  <div key={s.grupo} style={{ borderTop: i ? `1px solid ${C.n500}` : 'none', padding: '6px 0' }}>
                    <span style={{ display: 'block', fontSize: 11.5, color: C.n700, padding: '4px 8px' }}>{s.grupo}</span>
                    {s.items.map(o => <button key={o.l} role="menuitem" type="button" disabled={o.dis} onClick={() => { setVerAcciones(false); o.on(); }} className="suite-fila"
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: 'none', fontSize: 12, fontFamily: FONT, color: o.dis ? C.n500 : o.peligro ? C.error : C.n900, cursor: o.dis ? 'not-allowed' : 'pointer', borderRadius: radius.control }}>{o.l}</button>)}
                  </div>
                ))}
              </div>
            </Popover>
          </span>
        </span>
      </div>

      {/* Resumen */}
      <div style={{ background: C.n000, borderRadius: radius.card, border: `1px solid ${C.n500}`, padding: '14px 18px', display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,.9fr) minmax(0,1.3fr) minmax(0,1.1fr) repeat(3, minmax(0,1fr))', gap: 18, alignItems: 'start' }}>
        {resumen.map(([l, v]) => <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}><span style={{ fontSize: 11.5, color: C.n700 }}>{l}</span><span style={{ fontSize: 13, color: C.n900, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span></div>)}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', borderLeft: `1px solid ${C.n500}`, paddingLeft: 18 }}>
          <span style={{ fontSize: 11.5, color: C.n700 }}>Total</span>
          <button type="button" onClick={() => setVerTotal(v => !v)} aria-label="Ver desglose del total" style={{ border: 'none', background: 'none', padding: 0, fontSize: 14, fontWeight: 600, color: C.brand, textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer', fontFamily: FONT, textAlign: 'left', whiteSpace: 'nowrap' }}>
            {fmtMon(t.subtotalII, p.moneda)}
          </button>
          <Popover open={verTotal} onClose={() => setVerTotal(false)} width={300} align="right"><Desglose ls={g.lineas} moneda={p.moneda} /></Popover>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={{ fontSize: 11.5, color: C.n700 }}>Pagado</span><span style={{ fontSize: 14, fontWeight: 600, color: C.n900, whiteSpace: 'nowrap' }}>{fmtMon(pagado, p.moneda)}</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={{ fontSize: 11.5, color: C.n700 }}>Saldo</span><span style={{ fontSize: 14, fontWeight: 600, color: saldo > 0.005 ? '#B45309' : '#0E7A57', whiteSpace: 'nowrap' }}>{fmtMon(Math.max(0, saldo), p.moneda)}</span></div>
      </div>

      {/* Tabs */}
      <div style={{ background: C.n000, borderRadius: radius.card, border: `1px solid ${C.n500}`, padding: '6px 18px 18px', display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        <CardTabs tabs={tabs} active={tabActual} onChange={setTab} />
        {tabActual === 'Alojamiento' && <TabAlojamiento g={g} estado={estado} onAgregar={() => setDlg('agregar')} onCambio={cambio} onProrroga={prorroga}
          onCheckin={r => setDlg({ checkin: r.id })} onCheckout={pedirCheckout} onRevertir={r => setDlg({ revertir: r })} onNoShow={r => setDlg({ noshowLinea: r })} onCuenta={irAFacturacion} onToast={onToast} />}
        {tabActual === 'Huésped' && <TabHuesped g={g} onToast={onToast} />}
        {tabActual === 'Detalles' && <TabDetalles g={g} onToast={onToast} />}
        {tabActual === 'Observaciones' && <TabObservaciones g={g} onToast={onToast} />}
        {tabActual === 'Mensajes' && <TabMensajes g={g} onToast={onToast} />}
        {tabActual === 'Depósitos' && <TabDepositos g={g} onToast={onToast} />}
        {tabActual === 'F. Empresa' && <TabEmpresa g={g} />}
        {tabActual.startsWith('Facturación') && <TabFacturacion g={g} sel={folioSel} onSel={setFolioSel} onCheckout={pedirCheckout} />}
        {tabActual === 'Bitácora' && <TabBitacora g={g} />}
      </div>

      {/* Diálogos */}
      {dlg === 'confirmar' && <Alerta open titulo={`¿Confirmar la reserva N° ${numeroDe(p)}?`} onClose={() => setDlg(null)}
        onConfirm={() => { h.cambiarEstado(ids(['Solicitada', 'Lista de espera']), 'Confirmada'); listo(`Reserva ${numeroDe(p)} confirmada`); }}>La reserva pasará a Confirmada y se bloqueará el inventario.</Alerta>}
      {dlg === 'confirmarSinDep' && <Alerta open titulo="La reserva no tiene depósito registrado" onClose={() => setDlg(null)} confirmar="Confirmar de todas formas"
        onConfirm={() => setDlg('confirmar')}>¿Confirmar de todas formas? Puedes registrar el depósito en garantía en la pestaña Depósitos.</Alerta>}
      {dlg === 'espera' && <Alerta open titulo="¿Pasar la reserva a lista de espera?" onClose={() => setDlg(null)}
        onConfirm={() => { h.cambiarEstado(ids(['Solicitada', 'Confirmada']), 'Lista de espera'); listo(`Reserva ${numeroDe(p)} en lista de espera`); }}>La reserva liberará el inventario hasta que haya disponibilidad.</Alerta>}
      {dlg === 'noshow' && <Alerta open titulo="¿Marcar reserva como No-Show?" tono="danger" onClose={() => setDlg(null)}
        onConfirm={() => { h.cambiarEstado(g.lineas.filter(l => l.estado === 'Confirmada' && l.entrada <= HOY).map(l => l.id), 'No-Show'); listo(`Reserva ${numeroDe(p)} marcada como No-Show`); }}>Esta acción es irreversible. Normalmente la auditoría nocturna la aplica de forma automática.</Alerta>}
      {dlg && typeof dlg === 'object' && 'noshowLinea' in dlg && <Alerta open titulo={`¿Marcar la habitación ${dlg.noshowLinea.habitacion || dlg.noshowLinea.numero} como No-Show?`} tono="danger" onClose={() => setDlg(null)}
        onConfirm={() => { h.cambiarEstado([dlg.noshowLinea.id], 'No-Show'); listo(`Línea ${dlg.noshowLinea.numero} marcada como No-Show`); }}>Esta acción es irreversible.</Alerta>}
      {dlg === 'anular' && <AnularReserva g={g} onClose={() => setDlg(null)} onListo={listo} />}
      {dlg === 'duplicar' && <DuplicarReserva g={g} onClose={() => setDlg(null)} onListo={(c, m) => { setDlg(null); onToast(m); onAbrir(c); }} />}
      {dlg === 'correo' && <EnviarCorreo g={g} onClose={() => setDlg(null)} onListo={listo} />}
      {dlg === 'tarjeta' && <TarjetaRegistro reservaId={p.id} onClose={() => setDlg(null)} />}
      {dlg === 'agregar' && <AgregarHabitacion g={g} onClose={() => setDlg(null)} onListo={listo} />}
      {dlg && typeof dlg === 'object' && 'elegir' in dlg && (
        <ElegirLinea titulo={{ checkin: 'Check-in · elige la habitación', cambio: 'Cambio de habitación', prorroga: 'Prórroga de habitación', checkout: 'Check-out · elige la habitación' }[dlg.elegir]}
          lineas={dlg.elegir === 'checkin' ? llegadasHoy : dlg.elegir === 'cambio' ? editables : enCasa} accion={dlg.elegir === 'checkin' ? 'Check-in' : dlg.elegir === 'checkout' ? 'Check-out' : 'Seleccionar'}
          onClose={() => setDlg(null)} onElegir={r => (dlg.elegir === 'checkout' ? pedirCheckout(r) : setDlg(dlg.elegir === 'checkin' ? { checkin: r.id } : dlg.elegir === 'cambio' ? { cambio: r } : { prorroga: r }))} />
      )}
      {dlg && typeof dlg === 'object' && 'cambio' in dlg && <CambioHabitacion r={dlg.cambio} onClose={() => setDlg(null)} onListo={listo} />}
      {dlg && typeof dlg === 'object' && 'prorroga' in dlg && <Prorroga r={dlg.prorroga} onClose={() => setDlg(null)} onListo={listo} />}
      {dlg && typeof dlg === 'object' && 'checkin' in dlg && <FormularioCheckIn reservaId={dlg.checkin} onClose={() => setDlg(null)} />}
      {dlg && typeof dlg === 'object' && 'checkout' in dlg && <Alerta open titulo={`¿Confirmar el Check-Out de la habitación ${dlg.checkout.habitacion}?`} onClose={() => setDlg(null)}
        onConfirm={() => { h.checkOut(dlg.checkout.id); listo(`Check-out de la habitación ${dlg.checkout.habitacion} realizado`); }}>La habitación quedará libre y marcada como sucia.</Alerta>}
      {dlg && typeof dlg === 'object' && 'pendiente' in dlg && <Alerta open titulo="La cuenta tiene una factura pendiente" onClose={() => setDlg(null)} confirmar="Ir a facturación"
        onConfirm={() => irAFacturacion(dlg.pendiente)}>La habitación {dlg.pendiente.habitacion} tiene un saldo de <b>{fmtMon(r2(saldoReserva(dlg.pendiente)), dlg.pendiente.moneda)}</b>. Registra el cobro y cierra la cuenta antes del check-out.</Alerta>}
      {dlg && typeof dlg === 'object' && 'revertir' in dlg && <Alerta open titulo="¿Revertir el Check-In?" onClose={() => setDlg(null)}
        onConfirm={() => { h.revertirCheckIn(dlg.revertir.id); h.registrarBitacora(claveDe(p), 'Check-in revertido', 'Estado: In-House', `Estado: Confirmada · Hab ${dlg.revertir.habitacion}`); listo('Check-in revertido'); }}>
        La reserva volverá a Confirmada. Solo está disponible el mismo día, antes de la auditoría nocturna.</Alerta>}
      {portal}
    </div>
  );
}

// ── Tab Alojamiento ─────────────────────────────────────────────────────────
const IcExt = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>;
const verde: CSSProperties = { background: '#4CAF50', color: '#fff', border: 'none' };

function TabAlojamiento({ g, estado, onAgregar, onCambio, onProrroga, onCheckin, onCheckout, onRevertir, onNoShow, onCuenta, onToast }: {
  g: GrupoReserva; estado: EstadoReserva; onAgregar: () => void; onCambio: () => void; onProrroga: () => void; onCheckin: (r: Reserva) => void; onCheckout: (r: Reserva) => void;
  onRevertir: (r: Reserva) => void; onNoShow: (r: Reserva) => void; onCuenta: (r: Reserva) => void; onToast: (t: string) => void;
}) {
  const h = useHotel();
  const p = g.principal;
  const [abierta, setAbierta] = useState<string | null>(null);
  const t = totales(g.lineas);
  const [desc, setDesc] = useState(String(p.descuento || 0));
  const agencia = esAgencia(p);
  const modalidad = modalidadDe(g);
  const enCasa = g.lineas.some(l => l.estado === 'In-House');
  const terminal = reservaCerrada({ estado });
  const kpi = (l: string, v: ReactNode, apagado?: boolean) => <div style={{ flex: 1, minWidth: 110, padding: '10px 14px', borderRight: `1px solid ${C.n500}`, display: 'flex', flexDirection: 'column', gap: 6, opacity: apagado ? 0.45 : 1 }}><span style={{ fontSize: 11.5, color: C.n700 }}>{l}</span><span style={{ fontSize: 13, color: C.n900 }}>{v}</span></div>;
  const guardarDescuento = () => {
    const v = Math.max(0, Number(desc) || 0);
    if (v === p.descuento) return;
    h.editarReserva([{ id: p.id, p: { descuento: v, cuentas: p.cuentas.map((c, i) => (i === 0 ? { ...c, saldo: r2(Math.max(0, c.saldo - (v - p.descuento))) } : c)) } }], 'Descuento aplicado', fmtMon(p.descuento, p.moneda), fmtMon(v, p.moneda));
    onToast('Descuento actualizado');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, marginRight: 'auto' }}>Detalle de la Reserva</span>
        {enCasa ? <>
          <Button variant="secondary" onClick={onCambio}>Cambio de habitación</Button>
          <Button variant="secondary" onClick={onProrroga}>Prórroga de habitación</Button>
        </> : !terminal && (
          <span title={estado === 'Solicitada' ? undefined : 'Solo se puede agregar habitación cuando la reserva es «Solicitada». Si pasa a In-House debe crearse una nueva.'}>
            <Button variant="secondary" disabled={estado !== 'Solicitada'} onClick={onAgregar}>+ Agregar habitación</Button>
          </span>
        )}
      </div>
      {(agencia || modalidad === 'grupo') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${C.n500}`, borderLeft: `3px solid ${C.brand}`, borderRadius: radius.md, padding: '10px 14px', fontSize: 12 }}>
          <b style={{ fontWeight: 600 }}>{p.empresa || p.nombre}</b><span style={{ color: C.n700 }}>| {modalidad === 'grupo' ? 'Folio de agencia · hospedaje de todas las habitaciones en una sola factura' : 'Hospedaje general'}</span>
          <span style={{ marginLeft: 'auto', color: C.n700 }}>{modalidad === 'grupo' ? 'Factura única' : 'Factura empresa'}: <StatusBadge label={t.pendiente > 0.005 ? 'Abierta' : 'Pagada'} color={t.pendiente > 0.005 ? 'yellow' : 'green'} /></span>
        </div>
      )}
      {g.lineas.map(l => {
        const saldo = saldoReserva(l);
        const cuenta = `${modalidad === 'grupo' ? `Consumos hab ${l.habitacion}` : l.cuentas[0]?.nombre ?? 'Cuenta 1'}: ${saldo > 0.005 ? 'Abierta' : l.pagado > 0 ? 'Pagada' : 'Sin consumos'}`;
        return (
          <div key={l.id} style={{ border: `1px solid ${C.n500}`, borderLeft: `3px solid ${ESTADO_UI[l.estado].hex}`, borderRadius: radius.md, background: abierta === l.id ? C.n200 : C.n000 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', flexWrap: 'wrap' }}>
              <span style={{ width: 38, height: 34, borderRadius: radius.sm, background: l.estado === 'In-House' ? C.brand : '#616161', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{l.habitacion || '—'}</span>
              <span style={{ flex: 1, minWidth: 220 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: C.n900 }}>{l.nombre}</span>{g.lineas.length > 1 && <span style={{ fontSize: 11, color: C.n700 }}> · {l.numero}</span>}
                <span style={{ display: 'block', fontSize: 11.5, color: C.n700, marginTop: 2 }}>{nombreTipo(l.tipo)} &nbsp;|&nbsp; {fmtRango(l.entrada, l.salida)} &nbsp;|&nbsp; Pendiente: {fmtMon(r2(Math.max(0, saldo)), l.moneda)}</span>
              </span>
              {l.estado !== 'Confirmada' && l.estado !== 'In-House' && <ChipEstado estado={l.estado} />}
              {l.estado === 'Confirmada' && <>
                <span title={l.entrada > HOY ? `Llega el ${fmtF(l.entrada)}` : undefined}><Button disabled={l.entrada > HOY} style={verde} onClick={() => onCheckin(l)}>Check-in</Button></span>
                {l.entrada <= HOY && <Button variant="secondary" onClick={() => onNoShow(l)}>No-Show</Button>}
              </>}
              {l.estado === 'In-House' && <>
                <button type="button" onClick={() => onCuenta(l)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px', border: `1px solid ${C.n500}`, background: C.n200, borderRadius: radius.control, fontSize: 12, color: C.n700, cursor: 'pointer', fontFamily: FONT }}>{cuenta}<IcExt /></button>
                {l.checkinEn === HOY && <Button variant="secondary" onClick={() => onRevertir(l)}>Revertir Check-In ⊗</Button>}
                <Button style={verde} onClick={() => onCheckout(l)}>Check-out ↦</Button>
              </>}
              <Button variant="secondary" onClick={() => setAbierta(abierta === l.id ? null : l.id)}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{abierta === l.id ? 'Cerrar' : 'Detalle'}<IcChevronDown size={11} style={{ transform: abierta === l.id ? 'rotate(180deg)' : undefined }} /></span></Button>
            </div>
            {abierta === l.id && <EditorLinea key={l.id + l.entrada + l.salida + l.habitacion} r={l} onToast={onToast} />}
          </div>
        );
      })}
      <div style={{ display: 'flex', flexWrap: 'wrap', borderTop: `1px solid ${C.n500}`, margin: '6px -18px -18px', background: C.n000, borderRadius: `0 0 ${radius.card}px ${radius.card}px` }}>
        {kpi('N° Habitaciones', g.lineas.length)}{kpi('Hab. In-House', g.lineas.filter(l => l.estado === 'In-House').length)}
        {kpi('Check-Out Listo', g.lineas.filter(l => l.estado === 'Completada').length, !g.lineas.some(l => l.estado === 'Completada'))}
        {kpi('Descuento i.i.', <span style={{ display: 'flex', width: 100 }}><Input value={desc} disabled={terminal} onChange={v => setDesc(v.replace(/[^\d.]/g, ''))} onBlur={guardarDescuento} onKeyDown={e => { if (e.key === 'Enter') guardarDescuento(); }} style={{ textAlign: 'right' }} aria-label="Descuento" /></span>)}
        {kpi('Dep. Garantía', fmtMon(t.deposito, p.moneda))}{kpi('Importe a Cobrar', fmtMon(t.aCobrar, p.moneda))}{kpi('Pagado', fmtMon(t.pagado, p.moneda))}
      </div>
    </div>
  );
}

/** Edición de la línea (fechas, tipo, habitación, pax, régimen y precio). */
function EditorLinea({ r, onToast }: { r: Reserva; onToast: (t: string) => void }) {
  const h = useHotel();
  const editable = ['Solicitada', 'Confirmada', 'Lista de espera'].includes(r.estado);
  const [f, setF] = useState({ entrada: r.entrada, salida: r.salida, tipo: r.tipo, habitacion: r.habitacion, adultos: r.adultos, ninos: r.ninos, regimen: r.regimen, precio: r.precio });
  const [elegir, setElegir] = useState(false);
  const [error, setError] = useState('');
  const set = (x: Partial<typeof f>) => setF(v => ({ ...v, ...x }));
  const cambiado = JSON.stringify(f) !== JSON.stringify({ entrada: r.entrada, salida: r.salida, tipo: r.tipo, habitacion: r.habitacion, adultos: r.adultos, ninos: r.ninos, regimen: r.regimen, precio: r.precio });
  const guardar = () => {
    if (f.salida <= f.entrada) return setError('La salida debe ser posterior a la entrada.');
    if (f.habitacion && !(f.habitacion === r.habitacion && f.entrada === r.entrada && f.salida === r.salida) && !h.reservas.every(x => x.id === r.id || x.habitacion !== f.habitacion || !['Solicitada', 'Confirmada', 'In-House'].includes(x.estado) || x.entrada >= f.salida || x.salida <= f.entrada))
      return setError(`La habitación ${f.habitacion} no está disponible en esas fechas.`);
    const cambios: string[] = [];
    if (f.entrada !== r.entrada) cambios.push(`Entrada ${fmtF(r.entrada)} → ${fmtF(f.entrada)}`);
    if (f.salida !== r.salida) cambios.push(`Salida ${fmtF(r.salida)} → ${fmtF(f.salida)}`);
    if (f.adultos !== r.adultos || f.ninos !== r.ninos) cambios.push(`Huéspedes ${r.adultos}+${r.ninos} → ${f.adultos}+${f.ninos}`);
    if (f.precio !== r.precio) cambios.push(`Precio ${fmtMon(r.precio)} → ${fmtMon(f.precio)}`);
    if (f.regimen !== r.regimen) cambios.push(`Régimen ${r.regimen} → ${f.regimen}`);
    if (f.tipo !== r.tipo) cambios.push(`Tipo ${r.tipo} → ${f.tipo}`);
    const dif = f.precio * Math.max(1, (new Date(f.salida).getTime() - new Date(f.entrada).getTime()) / 864e5) - r.precio * Math.max(1, (new Date(r.salida).getTime() - new Date(r.entrada).getTime()) / 864e5);
    h.editarReserva([{ id: r.id, p: { ...f, habitacion: r.habitacion, cuentas: r.cuentas.map((c, i) => (i === 0 ? { ...c, saldo: r2(Math.max(0, c.saldo + dif)) } : c)) } }], 'Se realizaron cambios en la línea', r.numero, cambios.join(' · ') || 'Sin cambios');
    if (f.habitacion !== r.habitacion) h.asignarHabitacion(r.id, f.habitacion);
    onToast('Línea actualizada');
  };
  const celda = (l: string, c: ReactNode, w?: number) => <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5, color: C.n700, width: w, flex: w ? undefined : 1, minWidth: 0 }}>{l}{c}</label>;
  return (
    <div style={{ padding: '0 14px 14px 64px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {celda('Entrada', <Input type="date" value={f.entrada} disabled={!editable} onChange={v => v && set({ entrada: v, salida: v >= f.salida ? v : f.salida })} />, 130)}
        {celda('Salida', <Input type="date" value={f.salida} disabled={!editable} onChange={v => v && set({ salida: v })} />, 130)}
        {celda('T. de habitación', <select value={f.tipo} disabled={!editable} onChange={e => set({ tipo: e.target.value, habitacion: '' })} className="suite-campo" style={{ height: 32, border: `1px solid ${C.n500}`, borderRadius: radius.control, fontSize: 12, fontFamily: FONT, padding: '0 6px', background: editable ? C.n000 : C.n200 }}>
          {['STD', 'SUP', 'DLX', 'FAM', 'JRS'].map(x => <option key={x} value={x}>{nombreTipo(x).toUpperCase()}</option>)}</select>)}
        {celda('Hab', <button type="button" disabled={!editable} onClick={() => setElegir(true)} title="Cambiar habitación" style={{ height: 32, border: `1px solid ${C.n500}`, borderRadius: radius.control, background: C.n200, fontSize: 12, fontFamily: FONT, cursor: editable ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>{f.habitacion || '—'}{editable && <span style={{ color: C.brand }}>⟳</span>}</button>, 70)}
        {celda('Adult.', <Input type="number" value={f.adultos} disabled={!editable} onChange={v => set({ adultos: Math.max(1, Number(v) || 1) })} />, 60)}
        {celda('Niños', <Input type="number" value={f.ninos} disabled={!editable} onChange={v => set({ ninos: Math.max(0, Number(v) || 0) })} />, 60)}
        {celda('Régimen', <select value={f.regimen} disabled={!editable} onChange={e => set({ regimen: e.target.value })} className="suite-campo" style={{ height: 32, border: `1px solid ${C.n500}`, borderRadius: radius.control, fontSize: 12, fontFamily: FONT, padding: '0 6px', background: editable ? C.n000 : C.n200 }}>
          {Object.entries(REGIMENES).map(([k, v]) => <option key={k} value={k}>{k} - {v}</option>)}</select>, 150)}
        {celda('Precio i.i', <Input value={f.precio} disabled={!editable} onChange={v => set({ precio: Math.max(0, Number(v.replace(/[^\d.]/g, '')) || 0) })} style={{ textAlign: 'right' }} />, 90)}
      </div>
      {editable ? <span style={{ fontSize: 11.5, color: C.brand, fontStyle: 'italic' }}>Puedes modificar la habitación asignada</span>
        : <span style={{ fontSize: 11.5, color: C.n700 }}>{r.estado === 'In-House' ? 'Huésped en casa: usa «Cambio de habitación» o «Prórroga de habitación».' : `Línea ${r.estado.toLowerCase()}: solo lectura.`}</span>}
      {error && <span role="alert" style={{ fontSize: 12, color: C.error }}>{error}</span>}
      {editable && cambiado && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><Button variant="secondary" onClick={() => { setF({ entrada: r.entrada, salida: r.salida, tipo: r.tipo, habitacion: r.habitacion, adultos: r.adultos, ninos: r.ninos, regimen: r.regimen, precio: r.precio }); setError(''); }}>Descartar</Button><Button onClick={guardar}>Guardar línea</Button></div>}
      {elegir && <SeleccionHabitacion tipo={f.tipo} entrada={f.entrada} salida={f.salida} ignorar={[r.id]} actual={f.habitacion} onClose={() => setElegir(false)} onElegir={(num, tipo) => { set({ habitacion: num, tipo }); setElegir(false); }} />}
    </div>
  );
}
