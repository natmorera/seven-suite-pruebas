'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Mapa de habitaciones (pantalla de trabajo de recepción).
//
// · Agrupado por TIPO de habitación (Estándar, Superior, Villas…), plegable.
// · Cada estado trae su acción principal en la tarjeta: Llega hoy → Check-in,
//   Sale hoy → Check-out, Libre → Asignar llegada, Bloqueada → Desbloquear,
//   Sucia → Marcar limpia. El resto en el panel lateral y en clic derecho.
// · Arrastrar y soltar: una llegada (de la bandeja o de su tarjeta) sobre una
//   habitación libre la asigna; un huésped en casa sobre una libre abre el
//   cambio de habitación con el destino ya elegido.
// · Bandeja «Hoy»: llegadas sin habitación, llegadas por registrar y salidas.
// · Vista Tarjetas o Compacta (para hoteles grandes).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { C, FONT, radius, shadow, Z } from '@/components/suite/tokens';
import { Button, Toast } from '@/components/suite/ui';
import { CheckTodos, Pantalla, useSeleccion } from '@/components/layout/Pantalla';
import { Buscador } from '@/components/configuracion/kit';
import { useHotel } from '@/components/hotel/store';
import { HOY, TIPOS, noches, type Habitacion, type Reserva } from '@/components/hotel/datos';
import { Alerta, BotonExportar, FiltroChecks, HojaReporte, TablaImpresa, exportarCSV, money, usePrint } from '@/components/hotel/ui';
import { DetalleReserva } from '@/components/hotel/checkin';
import { FormularioCheckIn } from '@/components/hotel/CheckInFormulario';
import { NuevaReservaModal } from './NuevaReserva';
import { EST, LABEL, SUCIA, nombreTipo, titulo, type ModalMapa } from './mapa/comun';
import { AsignarLlegada, BloquearHab, BloquearVarias, MoverHuesped, Prepago } from './mapa/Modales';
import { Ficha, TarjetaHab } from './mapa/Tarjetas';
import { PanelHabitacion } from './mapa/Panel';

type Filtro = 'todas' | 'libre' | 'lista' | 'ocupada' | 'llegadas' | 'salidas' | 'sucia' | 'bloqueada';
const FILTROS: { id: Filtro; label: string; color?: string; de: (x: Habitacion) => boolean }[] = [
  { id: 'todas', label: 'Todas', de: () => true },
  { id: 'lista', label: 'Listas para vender', color: '#12A877', de: x => x.estado === 'libre' && !x.sucia },
  { id: 'llegadas', label: 'Llegan hoy', color: EST.checkin.color, de: x => x.estado === 'checkin' || x.estado === 'checkinRL' },
  { id: 'salidas', label: 'Salen hoy', color: EST.checkout.color, de: x => x.estado === 'checkout' },
  { id: 'ocupada', label: 'Ocupadas', color: EST.ocupada.color, de: x => x.estado === 'ocupada' },
  { id: 'sucia', label: 'Sucias', color: SUCIA, de: x => x.sucia },
  { id: 'bloqueada', label: 'Bloqueadas', color: EST.bloqueada.color, de: x => x.estado === 'bloqueada' },
];
interface Arrastre { reservaId: string; desde: string; enCasa: boolean; tipo: string }

export default function Mapa() {
  const h = useHotel();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [tipos, setTipos] = useState<string[]>([]);
  const [vista, setVista] = useState<'tarjetas' | 'compacta'>('tarjetas');
  const [plegados, setPlegados] = useState<string[]>([]);
  const [bandeja, setBandeja] = useState(true);
  const s_ = useSeleccion();
  const [bloqMasivo, setBloqMasivo] = useState(false);
  const { imprimir, portal } = usePrint();
  const [sel, setSel] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ hab: string; x: number; y: number } | null>(null);
  const [modal, setModal] = useState<ModalMapa>(null);
  const [alerta, setAlerta] = useState<{ titulo: string; texto: string; ok: () => void; peligro?: boolean } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [arr, setArr] = useState<Arrastre | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);

  const reservaDe = (x: Habitacion) => (x.reservaId ? h.reservas.find(r => r.id === x.reservaId) : undefined);
  const llegadasHoy = useMemo(() => h.reservas.filter(r => r.estado === 'Confirmada' && r.entrada === HOY), [h.reservas]);
  const llegadasDe = (num: string) => llegadasHoy.filter(r => r.habitacion === num);
  const sinHab = llegadasHoy.filter(r => !r.habitacion);
  const salidasHoy = h.reservas.filter(r => r.estado === 'In-House' && r.salida <= HOY);
  const huesped = (x: Habitacion) => x.estado === 'bloqueada' ? x.motivoBloqueo : reservaDe(x)?.nombre ?? llegadasDe(x.numero)[0]?.nombre ?? '';
  const base = h.habitaciones.filter(x => {
    const t = q.trim().toLowerCase();
    return (!t || x.numero.includes(t) || huesped(x).toLowerCase().includes(t)) && (!tipos.length || tipos.includes(x.tipo));
  });
  const visibles = base.filter(FILTROS.find(f => f.id === filtro)!.de);
  const tiposVisibles = TIPOS.filter(t => visibles.some(x => x.tipo === t.id));

  useEffect(() => {
    if (!menu) return;
    const cerrar = () => setMenu(null);
    window.addEventListener('click', cerrar); window.addEventListener('scroll', cerrar, true);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && cerrar();
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('click', cerrar); window.removeEventListener('scroll', cerrar, true); window.removeEventListener('keydown', esc); };
  }, [menu]);

  const limpia = (x: Habitacion) => { h.toggleSucia(x.numero); setToast(`Habitación ${x.numero} marcada como ${x.sucia ? 'limpia' : 'sucia'}`); };
  const opcionesMenu = (x: Habitacion) => {
    const r = reservaDe(x);
    const ll = llegadasDe(x.numero)[0];
    const sucia = { label: x.sucia ? 'Marcar como limpia' : 'Marcar como sucia', fn: () => limpia(x) };
    const info = { label: 'Ver información', fn: () => { setSel(x.numero); setModal({ tipo: 'panel', hab: x.numero }); } };
    switch (x.estado) {
      case 'libre': return [info, ...(sinHab.length ? [{ label: 'Asignar llegada de hoy', fn: () => setModal({ tipo: 'asignar', hab: x.numero }) }] : []), { label: 'Nueva reserva (walk-in)', fn: () => setModal({ tipo: 'reserva', hab: x.numero }) }, sucia, { label: 'Bloquear habitación', fn: () => setModal({ tipo: 'bloquear', hab: x.numero }) }];
      case 'ocupada': return [info, { label: 'Ver reserva', fn: () => r && setModal({ tipo: 'ver', reserva: r.id }) }, { label: 'Cambio de habitación', fn: () => r && setModal({ tipo: 'mover', reserva: r.id }) },
        { label: 'Registrar prepago', fn: () => r && setModal({ tipo: 'prepago', reserva: r.id }) }, { label: 'Check-out', fn: () => r && pedirCheckout(r) }, sucia];
      case 'bloqueada': return [info, { label: 'Desbloquear habitación', fn: () => desbloquear(x) }, sucia];
      case 'checkin': case 'checkinRL': return [info, { label: 'Hacer check-in', fn: () => ll && setModal({ tipo: 'checkin', reserva: ll.id }) }, { label: 'Ver reserva', fn: () => ll && setModal({ tipo: 'ver', reserva: ll.id }) },
        { label: 'Cambiar de habitación', fn: () => ll && setModal({ tipo: 'mover', reserva: ll.id }) },
        { label: 'Quitar asignación', fn: () => setAlerta({ titulo: '¿Quitar la asignación?', texto: `Las llegadas de hoy quedan sin habitación y la ${x.numero} queda libre.`, ok: () => h.cancelarCheckIn(x.numero), peligro: true }) }, sucia];
      case 'checkout': return [info, { label: 'Hacer check-out', fn: () => r && pedirCheckout(r) }, { label: 'Ver reserva', fn: () => r && setModal({ tipo: 'ver', reserva: r.id }) }, sucia];
    }
  };
  const pedirCheckout = (r: Reserva) => {
    const saldo = r.cuentas.reduce((s, c) => s + c.saldo, 0);
    if (saldo > 0) { setAlerta({ titulo: 'Hay cuentas abiertas', texto: `El folio de ${titulo(r.nombre)} tiene un saldo de ${money(saldo)}. Debe pagarse antes del check-out.`, ok: () => { r.cuentas.forEach(c => c.saldo > 0 && h.pagarCuenta(r.id, c.id)); setToast('Cuentas pagadas. Ya puedes confirmar el check-out.'); } }); return; }
    setAlerta({ titulo: '¿Confirmar el check-out?', texto: `${titulo(r.nombre)} deja la habitación ${r.habitacion}. Quedará libre y marcada como sucia.`, ok: () => { h.checkOut(r.id); setToast(`Check-out de la ${r.habitacion} realizado`); } });
  };
  const desbloquear = (x: Habitacion) => setAlerta({ titulo: '¿Desbloquear la habitación?', texto: `La ${x.numero} quedará disponible. Motivo actual: ${x.motivoBloqueo}.`, ok: () => { h.desbloquear(x.numero); setToast(`Habitación ${x.numero} desbloqueada`); setModal(null); } });
  /** Acción principal de la tarjeta según el estado. */
  const principal = (x: Habitacion): { label: string; fn: () => void } | null => {
    const r = reservaDe(x), ll = llegadasDe(x.numero)[0];
    if ((x.estado === 'checkin' || x.estado === 'checkinRL') && ll) return { label: 'Check-in', fn: () => setModal({ tipo: 'checkin', reserva: ll.id }) };
    if (x.estado === 'checkout' && r) return { label: 'Check-out', fn: () => pedirCheckout(r) };
    if (x.estado === 'bloqueada') return { label: 'Desbloquear', fn: () => desbloquear(x) };
    if (x.sucia && (x.estado === 'libre' || x.estado === 'checkout')) return { label: 'Marcar limpia', fn: () => limpia(x) };
    if (x.estado === 'libre' && sinHab.length) return { label: 'Asignar', fn: () => setModal({ tipo: 'asignar', hab: x.numero }) };
    return null;
  };

  // ── Arrastrar y soltar ──
  const puedeSoltar = (x: Habitacion) => !!arr && x.estado === 'libre' && x.numero !== arr.desde;
  const soltar = (x: Habitacion) => {
    const a = arr;
    setArr(null); setSobre(null);
    if (!a || !puedeSoltar(x)) return;
    const r = h.reservas.find(y => y.id === a.reservaId);
    if (!r) return;
    if (a.enCasa) { setModal({ tipo: 'mover', reserva: r.id, destino: x.numero }); return; }
    h.asignarHabitacion(r.id, x.numero);
    setToast(`${titulo(r.nombre)} asignado a la ${x.numero}${x.tipo !== r.tipo ? ` (${nombreTipo(x.tipo)}, reservó ${nombreTipo(r.tipo)})` : ''}${x.sucia ? ' · la habitación está sucia' : ''}`);
  };
  const arrastrable = (r: Reserva, desde: string, enCasa: boolean) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', r.id); setArr({ reservaId: r.id, desde, enCasa, tipo: r.tipo }); },
    onDragEnd: () => { setArr(null); setSobre(null); },
  });
  const destino = (x: Habitacion) => ({
    onDragOver: (e: DragEvent) => { if (puedeSoltar(x)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (sobre !== x.numero) setSobre(x.numero); } },
    onDragLeave: () => { if (sobre === x.numero) setSobre(null); },
    onDrop: (e: DragEvent) => { e.preventDefault(); soltar(x); },
  });

  const habModal = modal && 'hab' in modal ? h.habitaciones.find(x => x.numero === modal.hab)! : null;
  const filasExport = () => visibles.map(x => [x.numero, nombreTipo(x.tipo), LABEL[x.estado], x.sucia ? 'Sucia' : 'Limpia', titulo(huesped(x))]);
  const HEAD = ['Habitación', 'Tipo', 'Estado', 'Limpieza', 'Huésped / motivo'];
  const criterio = `${q ? `Búsqueda: ${q} · ` : ''}Estado: ${FILTROS.find(f => f.id === filtro)!.label} · Tipo: ${tipos.length ? tipos.map(nombreTipo).join(', ') : 'Todos'}`;
  const hayFiltros = !!(q || filtro !== 'todas' || tipos.length);
  const selHabs = h.habitaciones.filter(x => s_.tiene(x.numero));
  const masivo = (f: (x: Habitacion) => void, msg: string) => { selHabs.forEach(f); setToast(msg); s_.limpiar(); };
  const limpiarFiltros = () => { setQ(''); setFiltro('todas'); setTipos([]); };
  return (
    <Pantalla titulo="Mapa de habitaciones" sinPadding
      acciones={<><BotonExportar titulo="Mapa de habitaciones" criterio={criterio} onCSV={() => exportarCSV('mapa-habitaciones', HEAD, filasExport())}
        onPDF={() => imprimir(<HojaReporte titulo="Mapa de habitaciones" filtros={criterio}><TablaImpresa headers={HEAD} filas={filasExport()} /></HojaReporte>)} disabled={!visibles.length} />
        <Button onClick={() => router.push('/reservaciones/reservas?nueva=1')}>Nueva reserva</Button></>}
      filtros={<>
        <Buscador value={q} onChange={setQ} placeholder="Número o huésped" width={180} />
        <span role="radiogroup" aria-label="Estado" style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTROS.map(f => {
            const on = filtro === f.id;
            const n = base.filter(f.de).length;
            return (
              <button key={f.id} type="button" role="radio" aria-checked={on} onClick={() => setFiltro(f.id)}
                style={{ height: 32, padding: '0 11px', borderRadius: 999, border: `1px solid ${on ? C.brand : C.n500}`, background: on ? C.brand : C.n000, color: on ? '#fff' : C.n900,
                  display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontFamily: FONT, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {f.color && <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: on ? '#fff' : f.color }} />}
                {f.label}<span style={{ color: on ? 'rgba(255,255,255,.8)' : C.n700 }}>{n}</span>
              </button>
            );
          })}
        </span>
        <FiltroChecks label="Tipo de habitación" value={tipos} onChange={setTipos} opciones={TIPOS.map(t => ({ value: t.id, label: t.nombre }))} />
        {hayFiltros && <Button variant="ghost" onClick={limpiarFiltros}>Limpiar</Button>}
      </>}
      filtrosDerecha={<span role="radiogroup" aria-label="Vista" style={{ display: 'inline-flex', border: `1px solid ${C.n500}`, borderRadius: radius.control, overflow: 'hidden' }}>
        {(['tarjetas', 'compacta'] as const).map(v => <button key={v} type="button" role="radio" aria-checked={vista === v} onClick={() => setVista(v)}
          style={{ height: 30, padding: '0 12px', border: 'none', background: vista === v ? C.brandBg : C.n000, color: vista === v ? C.brand : C.n700, fontSize: 12, fontFamily: FONT, cursor: 'pointer' }}>{v === 'tarjetas' ? 'Tarjetas' : 'Compacta'}</button>)}
      </span>}
      seleccion={{ n: s_.n, onLimpiar: s_.limpiar, etiqueta: s_.n === 1 ? 'habitación seleccionada' : 'habitaciones seleccionadas', acciones: <>
        <Button variant="secondary" onClick={() => masivo(x => x.sucia && h.toggleSucia(x.numero), `${selHabs.length} habitaciones marcadas como limpias`)}>Marcar limpias</Button>
        <Button variant="secondary" onClick={() => masivo(x => !x.sucia && h.toggleSucia(x.numero), `${selHabs.length} habitaciones marcadas como sucias`)}>Marcar sucias</Button>
        {selHabs.some(x => x.estado === 'libre') && <Button variant="secondary" onClick={() => setBloqMasivo(true)}>Bloquear libres</Button>}
        {selHabs.some(x => x.estado === 'bloqueada') && <Button variant="secondary" onClick={() => masivo(x => x.estado === 'bloqueada' && h.desbloquear(x.numero), 'Habitaciones desbloqueadas')}>Desbloquear</Button>}</> }}>
      <style>{`
        .hab-card { transition: box-shadow .12s, border-color .12s, transform .12s, opacity .12s; }
        .hab-card:hover { box-shadow: 0 4px 14px rgba(15,15,15,.08); border-color: #DADADF; }
        .hab-card:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
        .hab-check { opacity: 0; transition: opacity .12s; }
        .hab-card:hover .hab-check, .hab-card:focus-within .hab-check, .hab-grid.con-sel .hab-check { opacity: 1; }
        .hab-card[draggable=true] { cursor: grab; }
        .hab-grid.arrastrando .hab-card:not(.destino) { opacity: .45; }
        .hab-card.destino { border-style: dashed !important; border-color: #12A877 !important; }
        .hab-card.sobre { background: #E8F7F1 !important; box-shadow: 0 0 0 2px #12A877; }
        .hab-accion { border: 1px solid var(--brand-bd, #C8D0EA); background: #fff; color: var(--brand); border-radius: 6px; height: 26px; padding: 0 10px; font-size: 11.5px; font-weight: 500; cursor: pointer; white-space: nowrap; }
        .hab-accion:hover { background: var(--brand-bg, #EEF1FA); }
      `}</style>
      <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {arr && <div role="status" style={{ position: 'sticky', top: 0, zIndex: 3, alignSelf: 'center', background: '#0D0D0D', color: '#fff', borderRadius: 999, padding: '8px 16px', fontSize: 12.5, fontFamily: FONT, boxShadow: shadow.panel }}>
            Suelta sobre una habitación libre para {arr.enCasa ? 'mover al huésped' : 'asignarla'} · Esc para cancelar</div>}
          {visibles.length === 0 ? (
            <div style={{ background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.card, padding: 48, textAlign: 'center', fontFamily: FONT }}>
              <p style={{ margin: 0, fontSize: 13, color: C.n900 }}>No hay habitaciones con estos filtros.</p>
              <button type="button" onClick={limpiarFiltros} style={{ marginTop: 10, border: 'none', background: 'none', color: C.brand, fontSize: 12.5, cursor: 'pointer', fontFamily: FONT, textDecoration: 'underline' }}>Ver todas</button>
            </div>
          ) : tiposVisibles.map(t => {
            const habs = visibles.filter(x => x.tipo === t.id);
            const todas = h.habitaciones.filter(x => x.tipo === t.id);
            const plegado = plegados.includes(t.id);
            const n = (f: (x: Habitacion) => boolean) => todas.filter(f).length;
            return (
              <section key={t.id} aria-label={t.nombre} style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: FONT }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckTodos s={s_} ids={habs.map(x => x.numero)} label={`Seleccionar ${t.nombre}`} />
                  <button type="button" aria-expanded={!plegado} onClick={() => setPlegados(p => (plegado ? p.filter(x => x !== t.id) : [...p, t.id]))}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: FONT }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden style={{ color: C.n700, transform: plegado ? 'rotate(-90deg)' : undefined, transition: 'transform .12s' }}><path d="m6 9 6 6 6-6" /></svg>
                    <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.n900 }}>{t.nombre}</h2>
                  </button>
                  <span style={{ fontSize: 12, color: C.n700 }}>{todas.length} hab. · <b style={{ fontWeight: 500, color: '#0E7A57' }}>{n(x => x.estado === 'libre' && !x.sucia)} listas</b> · {n(x => x.estado === 'ocupada' || x.estado === 'checkout')} ocupadas · {n(x => x.estado === 'checkin' || x.estado === 'checkinRL')} llegan</span>
                </div>
                {!plegado && (
                  <div className={`hab-grid${s_.n ? ' con-sel' : ''}${arr ? ' arrastrando' : ''}`} style={{ display: 'grid', gridTemplateColumns: vista === 'compacta' ? 'repeat(auto-fill, minmax(92px, 1fr))' : 'repeat(auto-fill, minmax(176px, 1fr))', gap: vista === 'compacta' ? 8 : 12 }}>
                    {habs.map(x => {
                      const r = reservaDe(x), ll = llegadasDe(x.numero)[0];
                      const mov = ll ? arrastrable(ll, x.numero, false) : r && (x.estado === 'ocupada' || x.estado === 'checkout') ? arrastrable(r, x.numero, true) : {};
                      const props = { x, on: sel === x.numero, elegida: s_.tiene(x.numero), s: s_, reserva: r, llegada: ll, accion: principal(x), destino: puedeSoltar(x), sobre: sobre === x.numero,
                        onAbrir: () => { setSel(x.numero); setModal({ tipo: 'panel', hab: x.numero }); }, onMenu: (cx: number, cy: number) => { setSel(x.numero); setMenu({ hab: x.numero, x: cx, y: cy }); }, dnd: { ...mov, ...destino(x) } };
                      return vista === 'compacta' ? <Ficha key={x.numero} {...props} /> : <TarjetaHab key={x.numero} {...props} />;
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
        {/* Bandeja «Hoy» */}
        <aside aria-label="Hoy en recepción" className="no-print" style={{ width: bandeja ? 290 : 44, flexShrink: 0, borderLeft: `1px solid ${C.n500}`, background: C.n000, display: 'flex', flexDirection: 'column', minHeight: 0, fontFamily: FONT, transition: 'width .15s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: `1px solid ${C.n500}` }}>
            <button type="button" aria-label={bandeja ? 'Ocultar bandeja' : 'Mostrar bandeja'} onClick={() => setBandeja(b => !b)} style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer', color: C.n700, fontSize: 14 }}>{bandeja ? '›' : '‹'}</button>
            {bandeja && <span style={{ fontSize: 13, fontWeight: 600 }}>Hoy</span>}
          </div>
          {bandeja && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Bandeja titulo="Llegadas sin habitación" n={sinHab.length} ayuda="Arrástralas a una habitación libre.">
                {sinHab.map(r => (
                  <div key={r.id} {...arrastrable(r, '', false)} className="hab-card" title="Arrastra a una habitación libre"
                    style={{ border: `1px dashed ${EST.checkin.color}`, background: EST.checkin.bg, borderRadius: radius.md, padding: '8px 10px', cursor: 'grab' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo(r.nombre)}</div>
                    <div style={{ fontSize: 11, color: C.n700 }}>{nombreTipo(r.tipo)} · {r.adultos + r.ninos} pers. · {noches(r.entrada, r.salida)} n.</div>
                  </div>
                ))}
              </Bandeja>
              <Bandeja titulo="Por registrar (check-in)" n={llegadasHoy.filter(r => r.habitacion).length}>
                {llegadasHoy.filter(r => r.habitacion).map(r => (
                  <FilaHoy key={r.id} hab={r.habitacion} nombre={titulo(r.nombre)} det={`${nombreTipo(r.tipo)} · ${noches(r.entrada, r.salida)} n.`} accion="Check-in" onAccion={() => setModal({ tipo: 'checkin', reserva: r.id })} onIr={() => { setSel(r.habitacion); setModal({ tipo: 'panel', hab: r.habitacion }); }} />
                ))}
              </Bandeja>
              <Bandeja titulo="Salidas pendientes" n={salidasHoy.length}>
                {salidasHoy.map(r => (
                  <FilaHoy key={r.id} hab={r.habitacion} nombre={titulo(r.nombre)} det={`Saldo ${money(r.cuentas.reduce((s, c) => s + c.saldo, 0))}`} accion="Check-out" onAccion={() => pedirCheckout(r)} onIr={() => { setSel(r.habitacion); setModal({ tipo: 'panel', hab: r.habitacion }); }} />
                ))}
              </Bandeja>
            </div>
          )}
        </aside>
      </div>

      {menu && (() => {
        const x = h.habitaciones.find(y => y.numero === menu.hab)!;
        return (
          <div role="menu" onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: Math.min(menu.y, window.innerHeight - 260), left: Math.min(menu.x, window.innerWidth - 230), zIndex: Z.dropdown, width: 220,
            background: C.n000, borderRadius: radius.lg, boxShadow: shadow.panel, border: `1px solid ${C.n500}`, padding: 6, fontFamily: FONT }}>
            {opcionesMenu(x).map(o => (
              <button key={o.label} role="menuitem" type="button" className="suite-fila" onClick={() => { setMenu(null); o.fn(); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', background: 'none', fontSize: 12.5, fontFamily: FONT, cursor: 'pointer', borderRadius: radius.control }}>{o.label}</button>
            ))}
          </div>
        );
      })()}

      {modal?.tipo === 'panel' && habModal && (
        <PanelHabitacion hab={habModal} onClose={() => { setModal(null); setSel(null); }}
          abrir={setModal} desbloquear={() => desbloquear(habModal)} pedirCheckout={pedirCheckout}
          anular={r => setAlerta({ titulo: '¿Anular la reserva?', texto: `La reserva ${r.numero} de ${titulo(r.nombre)} se cancelará y la habitación ${r.habitacion} quedará libre.`, ok: () => { h.anular(r.id); setModal(null); setToast(`Reserva ${r.numero} anulada`); }, peligro: true })} />
      )}
      {modal?.tipo === 'mover' && <MoverHuesped reservaId={modal.reserva} destino={modal.destino} onClose={() => setModal(null)} onListo={t => { setModal(null); setToast(t); }} />}
      {modal?.tipo === 'asignar' && habModal && <AsignarLlegada hab={habModal} llegadas={sinHab} onClose={() => setModal(null)} onListo={t => { setModal(null); setToast(t); }} />}
      {modal?.tipo === 'bloquear' && habModal && <BloquearHab hab={habModal} onClose={() => setModal(null)} onListo={() => { setModal(null); setToast(`Habitación ${habModal.numero} bloqueada`); }} />}
      {modal?.tipo === 'reserva' && habModal && <NuevaReservaModal hab={habModal.numero} onClose={() => setModal(null)} onListo={t => { setModal(null); setToast(t); }} />}
      {modal?.tipo === 'ver' && <DetalleReserva reservaId={modal.reserva} onClose={() => setModal(null)} />}
      {modal?.tipo === 'prepago' && <Prepago reservaId={modal.reserva} onClose={() => setModal(null)} onListo={t => { setModal(null); setToast(t); }} />}
      {modal?.tipo === 'checkin' && <FormularioCheckIn reservaId={modal.reserva} onClose={() => setModal(null)} />}

      <Alerta open={!!alerta} titulo={alerta?.titulo ?? ''} tono={alerta?.peligro ? 'danger' : 'brand'} onClose={() => setAlerta(null)} onConfirm={() => { alerta?.ok(); setAlerta(null); }}>{alerta?.texto}</Alerta>
      {bloqMasivo && <BloquearVarias habs={selHabs.filter(x => x.estado === 'libre')} onClose={() => setBloqMasivo(false)} onListo={n => { setBloqMasivo(false); s_.limpiar(); setToast(`${n} habitaciones bloqueadas`); }} />}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      {portal}
    </Pantalla>
  );
}

function Bandeja({ titulo: t, n, ayuda, children }: { titulo: string; n: number; ayuda?: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h3 style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: '.06em', color: C.n700, display: 'flex', justifyContent: 'space-between' }}>{t.toUpperCase()}<span style={{ color: n ? C.n900 : C.n700 }}>{n}</span></h3>
      {n === 0 ? <span style={{ fontSize: 12, color: C.n700 }}>Nada pendiente.</span> : <>{ayuda && <span style={{ fontSize: 11, color: C.n700 }}>{ayuda}</span>}{children}</>}
    </section>
  );
}
function FilaHoy({ hab, nombre, det, accion, onAccion, onIr }: { hab: string; nombre: string; det: string; accion: string; onAccion: () => void; onIr: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.n500}` }}>
      <button type="button" onClick={onIr} aria-label={`Ver habitación ${hab}`} style={{ width: 40, height: 30, borderRadius: radius.sm, border: `1px solid ${C.n500}`, background: C.n200, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, flexShrink: 0 }}>{hab}</button>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombre}</span>
        <span style={{ display: 'block', fontSize: 11, color: C.n700 }}>{det}</span>
      </span>
      <button type="button" className="hab-accion" onClick={onAccion}>{accion}</button>
    </div>
  );
}
