'use client';
// Ama de llaves → Estado de las habitaciones (escritorio).
// Tabla de todas las habitaciones con su disponibilidad (Libre / Ocupada / F/O), el movimiento del día
// (llega hoy, sale hoy, en casa), pax, estado de limpieza (Sucia / Limpia / No requiere, excluyentes) y
// discrepancias. Por defecto se ordena por prioridad: primero las llegadas de hoy que aún no están limpias,
// luego las salidas, las ocupadas y las libres sucias. Todo se guarda al instante: no hay botón Guardar.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Modal, Toast } from '@/components/suite/ui';
import { CheckFila, CheckTodos, Pantalla, useSeleccion } from '@/components/layout/Pantalla';
import { Buscador } from '@/components/configuracion/kit';
import { useHotel } from '@/components/hotel/store';
import { CAMARERAS, HOY, TIPOS, estadoLimpieza, type EstadoLimpieza, type Reserva } from '@/components/hotel/datos';
import { FiltroUno } from '@/components/facturacion/comun';
import { Alerta, BotonExportar, FiltroChecks, HojaReporte, MenuBoton, TablaImpresa, exportarCSV, usePrint } from '@/components/hotel/ui';
import {
  Adjuntos, BadgeDisp, BotonesLimpieza, EstadoCrono, COLOR_DISP, Contador, DISPONIBILIDADES, IcMovil, LIMPIEZA, Tarjeta, TextoEnLinea, disponibilidad, infoLimpieza, paxDe, td, th,
} from './comun';

export default function EstadoHabitaciones() {
  const h = useHotel();
  const sp = useSearchParams();
  const [q, setQ] = useState('');
  const [limp, setLimp] = useState<string[]>(() => (sp.get('limpieza') ? [sp.get('limpieza')!] : []));
  const [disp, setDisp] = useState<string[]>([]);
  const [cams, setCams] = useState<string[]>([]);
  const [movs, setMovs] = useState<string[]>([]);
  const [orden, setOrden] = useState('prioridad');
  const [confirmar, setConfirmar] = useState(false);
  const [adjuntos, setAdjuntos] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const s_ = useSeleccion();
  const { imprimir, portal } = usePrint();

  const todas = useMemo(() => h.habitaciones.map(x => {
    const d = disponibilidad(x), l = estadoLimpieza(x);
    const m = movimientoHoy(x.numero, h.reservas);
    return { x, disp: d, limp: l, pax: paxDe(x, h.reservas), mov: m, prio: prioridad(m.tipo, l, d) };
  }), [h.habitaciones, h.reservas]);
  const filas = useMemo(() => todas
    .filter(f => (!q.trim() || f.x.numero.includes(q.trim())) && (!limp.length || limp.includes(f.limp)) && (!disp.length || disp.includes(f.disp)) && (!cams.length || cams.includes(f.x.camarera ?? '')) && (!movs.length || movs.includes(f.mov.tipo)))
    .sort((a, b) => (orden === 'prioridad' ? a.prio - b.prio : 0) || a.x.numero.localeCompare(b.x.numero, 'es', { numeric: true })), [todas, q, limp, disp, cams, movs, orden]);
  const porPreparar = todas.filter(f => f.mov.tipo === 'llegada' && f.limp !== 'limpia');
  const salidasHoy = todas.filter(f => f.mov.tipo === 'salida');
  const limpias = todas.filter(f => f.limp !== 'sucia').length;
  const sinAsignar = todas.filter(f => f.limp === 'sucia' && !f.x.camarera).length;
  const carga = CAMARERAS.map(c => ({ c, total: todas.filter(f => f.x.camarera === c).length, pend: todas.filter(f => f.x.camarera === c && f.limp === 'sucia').length })).filter(x => x.total > 0);
  const porLimpiar = filas.filter(f => f.limp !== 'limpia');
  const cuenta = (e: EstadoLimpieza) => h.habitaciones.filter(x => estadoLimpieza(x) === e).length;
  const hayFiltros = q || limp.length || disp.length || cams.length || movs.length;
  const tipoDe = (t: string) => TIPOS.find(x => x.id === t)?.codigo ?? t;

  const HEAD = ['Hab', 'Tipo', 'Estado', 'Hoy', 'Pax', 'Estado de limpieza', 'Tiempo (min)', 'Discrepancias', 'Adjuntos', 'Camarera'];
  const datos = () => filas.map(f => [f.x.numero, tipoDe(f.x.tipo), f.disp, f.mov.texto, f.pax || '-', infoLimpieza(f.limp).label, f.x.limpieza ? Math.round(f.x.limpieza.segundos / 60) : '', f.x.discrepancia || '', f.x.adjuntos?.length || '', f.x.camarera || '']);
  const criterio = [q && `Habitación: ${q}`, limp.length && `Limpieza: ${limp.map(l => infoLimpieza(l as EstadoLimpieza).label).join(', ')}`, disp.length && `Disponibilidad: ${disp.join(', ')}`, cams.length && `Camarera: ${cams.join(', ')}`].filter(Boolean).join(' · ') || 'Todas las habitaciones';
  const cambiar = (nums: string[], e: EstadoLimpieza) => { h.setLimpieza(nums, e); };
  const alternarLimp = (e: EstadoLimpieza) => setLimp(l => (l.length === 1 && l[0] === e ? [] : [e]));

  return (
    <Pantalla titulo="Estado de las habitaciones"
      acciones={<>
        <Link href="/ama-de-llaves/estado-de-habitaciones/camarera" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.brand, textDecoration: 'none', fontFamily: FONT, marginRight: 4 }}><IcMovil /> Vista de camarera</Link>
        <BotonExportar titulo="Estado de las habitaciones" criterio={criterio} disabled={!filas.length} onCSV={() => exportarCSV('estado-habitaciones', HEAD, datos())}
          onPDF={() => imprimir(<HojaReporte titulo="Estado de las habitaciones" filtros={criterio}><TablaImpresa headers={HEAD} filas={datos()} /></HojaReporte>)} />
        <Button variant="secondary" disabled={!porLimpiar.length} onClick={() => setConfirmar(true)}>Marcar todas como limpias</Button>
      </>}
      filtros={<>
        <Buscador value={q} onChange={v => setQ(v.replace(/\D/g, ''))} placeholder="Buscar habitación" width={200} />
        <FiltroChecks label="Hoy" value={movs} onChange={setMovs} opciones={MOVS.map(m => ({ value: m.id, label: m.label }))} />
        <FiltroChecks label="Estado de limpieza" value={limp} onChange={setLimp} opciones={LIMPIEZA.map(o => ({ value: o.id, label: <span><span style={{ color: o.color }}>●</span> {o.label}</span> }))} />
        <FiltroChecks label="Estado de disponibilidad" value={disp} onChange={setDisp} opciones={DISPONIBILIDADES.map(d => ({ value: d, label: <span><span style={{ color: COLOR_DISP[d] }}>●</span> {d}</span> }))} />
        <FiltroChecks label="Camarera" value={cams} onChange={setCams} opciones={[...CAMARERAS.map(c => ({ value: c, label: c })), { value: '', label: 'Sin asignar' }]} ancho={240} />
        <FiltroUno label="Orden" value={orden} onChange={v => setOrden(v || 'prioridad')} todos={null} opciones={[{ value: 'prioridad', label: 'Prioridad' }, { value: 'numero', label: 'Habitación' }]} />
        {hayFiltros ? <Button variant="ghost" style={{ color: C.error }} onClick={() => { setQ(''); setLimp([]); setDisp([]); setCams([]); setMovs([]); }}>Limpiar filtros</Button> : null}
      </>}
      filtrosDerecha={<span style={{ fontSize: 12, color: C.n700 }}>{filas.length} habitaciones · se guarda automáticamente</span>}
      seleccion={{ n: s_.n, onLimpiar: s_.limpiar, etiqueta: s_.n === 1 ? 'habitación' : 'habitaciones', acciones: <>
        {LIMPIEZA.map(o => <Button key={o.id} variant="secondary" onClick={() => { cambiar(s_.sel, o.id); setToast(`${s_.n} habitaciones marcadas como ${o.label.toLowerCase()}`); s_.limpiar(); }}>Marcar {o.label.toLowerCase()}</Button>)}
        <MenuBoton label="Asignar camarera" ancho={240} opciones={CAMARERAS.map(c => ({ label: c, onClick: () => { h.asignarCamarera(s_.sel, c); setToast(`${s_.n} habitaciones asignadas a ${c}`); s_.limpiar(); } }))} />
      </> }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1.3fr) minmax(0, 2fr)', gap: 12 }}>
        <Tarjeta style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 12, color: C.n700 }}>Avance del día<b style={{ fontSize: 18, fontWeight: 600, color: C.n900 }}>{limpias} / {todas.length}</b></span>
          <span aria-label={`${Math.round((limpias / Math.max(1, todas.length)) * 100)}% listas`} style={{ display: 'block', height: 6, borderRadius: 3, background: C.n500 }}><span style={{ display: 'block', height: '100%', borderRadius: 3, width: `${(limpias / Math.max(1, todas.length)) * 100}%`, background: '#4CAF50' }} /></span>
          <span style={{ fontSize: 12, color: porPreparar.length ? '#B45309' : C.n700 }}>
            {porPreparar.length ? <>Prepara primero <b>{porPreparar.length}</b> {porPreparar.length === 1 ? 'habitación con llegada' : 'habitaciones con llegada'} hoy: {porPreparar.slice(0, 6).map(f => f.x.numero).join(', ')}{porPreparar.length > 6 ? '…' : ''}.</> : 'Todas las llegadas de hoy tienen la habitación lista.'}
            {sinAsignar > 0 && <span style={{ display: 'block', color: C.n700, marginTop: 2 }}>{sinAsignar} sucias sin camarera asignada.</span>}
          </span>
          {carga.length > 0 && <span style={{ fontSize: 11.5, color: C.n700 }}>{carga.map(x => `${x.c.split(' ')[0]} ${x.total - x.pend}/${x.total}`).join(' · ')}</span>}
        </Tarjeta>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignContent: 'flex-start' }}>
        <Contador valor={porPreparar.length} label="Llegadas por preparar" color="#E0A800" activo={movs.length === 1 && movs[0] === 'llegada' && limp.length === 1 && limp[0] === 'sucia'} onClick={() => { const on = movs.length === 1 && movs[0] === 'llegada'; setMovs(on ? [] : ['llegada']); setLimp(on ? [] : ['sucia']); }} />
        <Contador valor={salidasHoy.length} label="Salidas de hoy" color="#5B8DEF" activo={movs.length === 1 && movs[0] === 'salida' && !limp.length} onClick={() => { setLimp([]); setMovs(m => (m.length === 1 && m[0] === 'salida' ? [] : ['salida'])); }} />
        {LIMPIEZA.map(o => <Contador key={o.id} valor={cuenta(o.id)} label={o.corto} color={o.color} activo={limp.length === 1 && limp[0] === o.id} onClick={() => alternarLimp(o.id)} />)}
        <Contador valor={h.habitaciones.filter(x => x.estado === 'bloqueada').length} label="Fuera de orden (F/O)" color={COLOR_DISP['F/O']} activo={disp.length === 1 && disp[0] === 'F/O'} onClick={() => setDisp(d => (d.length === 1 && d[0] === 'F/O' ? [] : ['F/O']))} />
        <Contador valor={h.habitaciones.filter(x => x.discrepancia).length} label="Con discrepancia" color="#7C5CDB" />
        </div>
      </div>
      <Tarjeta style={{ padding: '6px 16px 12px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead><tr>
              <th style={{ ...th, width: 28 }}><CheckTodos s={s_} ids={filas.map(f => f.x.numero)} /></th>
              {['Hab', 'Estado', 'Hoy', 'Pax', 'Estado de limpieza', 'Tiempo de limpieza', 'Discrepancias', 'Camarera'].map(c => <th key={c} style={th}>{c}</th>)}
            </tr></thead>
            <tbody>
              {filas.length === 0 && <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: C.n700, padding: 30 }}>Ninguna habitación coincide con la búsqueda y los filtros.</td></tr>}
              {filas.map(({ x, disp: d, limp: l, pax, mov }) => (
                <tr key={x.numero} className="suite-fila" style={{ background: s_.tiene(x.numero) ? C.brandBg : undefined }}>
                  <td style={td}><CheckFila s={s_} id={x.numero} label={`Seleccionar habitación ${x.numero}`} /></td>
                  <td style={{ ...td, width: 90 }}><b style={{ fontWeight: 600 }}>{x.numero}</b> <span style={{ color: C.n700, fontSize: 11 }}>{tipoDe(x.tipo)}</span></td>
                  <td style={{ ...td, width: 100 }} title={d === 'F/O' ? x.motivoBloqueo : undefined}><BadgeDisp d={d} /></td>
                  <td style={{ ...td, width: 150 }}><ChipHoy mov={mov} lista={l !== 'sucia'} /></td>
                  <td style={{ ...td, width: 50, color: pax ? C.n900 : C.n700 }}>{pax || '-'}</td>
                  <td style={{ ...td, width: 300 }}><BotonesLimpieza hab={x.numero} valor={l} onChange={e => cambiar([x.numero], e)} /></td>
                  <td style={{ ...td, width: 190 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><EstadoCrono c={x.limpieza} /><CronoMini num={x.numero} /></span></td>
                  <td style={{ ...td, minWidth: 240 }}><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><TextoEnLinea valor={x.discrepancia ?? ''} label={`Discrepancia ${x.numero}`} placeholder="Agregar discrepancia" onGuardar={v => { h.setHab(x.numero, { discrepancia: v }); setToast(`Discrepancia de la ${x.numero} guardada`); }} />
                    <button type="button" onClick={() => setAdjuntos(x.numero)} aria-label={`Adjuntos de la ${x.numero}`} title="Fotos y archivos de la discrepancia"
                      style={{ border: 'none', background: x.adjuntos?.length ? C.brandBg : 'none', color: x.adjuntos?.length ? C.brand : C.n700, borderRadius: radius.pill, padding: '3px 8px', fontSize: 11.5, cursor: 'pointer', fontFamily: FONT, display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M21 11.5 12.5 20a5 5 0 0 1-7-7L14 4.5a3.5 3.5 0 0 1 5 5L10.5 18a2 2 0 0 1-3-3L15 7.5" /></svg>{x.adjuntos?.length || ''}
                    </button></span></td>
                  <td style={{ ...td, width: 170 }}>
                    <select value={x.camarera ?? ''} onChange={e => h.asignarCamarera([x.numero], e.target.value)} aria-label={`Camarera ${x.numero}`}
                      style={{ border: 'none', background: 'transparent', fontSize: 12, fontFamily: FONT, color: x.camarera ? C.n900 : C.n700, cursor: 'pointer', outline: 'none', width: 160 }}>
                      <option value="">Sin asignar</option>{CAMARERAS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>
      <Alerta open={confirmar} titulo="¿Estás seguro?" confirmar="Sí, limpiar todas" onClose={() => setConfirmar(false)}
        onConfirm={() => { cambiar(porLimpiar.map(f => f.x.numero), 'limpia'); setToast(`${porLimpiar.length} habitaciones marcadas como limpias`); setConfirmar(false); }}>
        Se marcarán {porLimpiar.length} habitaciones como limpias.
      </Alerta>
      {adjuntos && (() => { const x = h.habitaciones.find(y => y.numero === adjuntos)!; return (
        <Modal open title={`Discrepancia · Habitación ${x.numero}`} onClose={() => setAdjuntos(null)} width={520} footer={<Button onClick={() => setAdjuntos(null)}>Listo</Button>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12.5 }}>
            <span><span style={{ color: C.n700 }}>Discrepancia: </span>{x.discrepancia || 'Sin texto'}</span>
            {x.obsLimpieza && <span><span style={{ color: C.n700 }}>Observaciones de la camarera: </span>{x.obsLimpieza}</span>}
            <Adjuntos hab={x} />
          </div>
        </Modal>); })()}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      {portal}
    </Pantalla>
  );
}

// ── Movimiento del día y prioridad de limpieza ──────────────────────────────
type TipoMov = 'llegada' | 'salida' | 'casa' | 'libre';
const MOVS: { id: TipoMov; label: string }[] = [{ id: 'llegada', label: 'Llega hoy' }, { id: 'salida', label: 'Sale hoy' }, { id: 'casa', label: 'En casa' }, { id: 'libre', label: 'Sin huésped' }];
interface MovHoy { tipo: TipoMov; texto: string; vip: boolean; huesped: string }

/** Qué pasa hoy en la habitación según las reservas: llegada, salida o estancia. */
function movimientoHoy(num: string, reservas: Reserva[]): MovHoy {
  const deHab = reservas.filter(r => r.habitacion === num);
  const sale = deHab.find(r => r.estado === 'In-House' && r.salida === HOY);
  const llega = deHab.find(r => (r.estado === 'Confirmada' || r.estado === 'Solicitada') && r.entrada === HOY);
  const casa = deHab.find(r => r.estado === 'In-House');
  if (llega) return { tipo: 'llegada', texto: sale ? 'Sale y llega hoy' : 'Llega hoy', vip: llega.vip, huesped: llega.nombre };
  if (sale) return { tipo: 'salida', texto: 'Sale hoy', vip: sale.vip, huesped: sale.nombre };
  if (casa) return { tipo: 'casa', texto: `En casa hasta ${casa.salida.slice(8, 10)}/${casa.salida.slice(5, 7)}`, vip: casa.vip, huesped: casa.nombre };
  return { tipo: 'libre', texto: '—', vip: false, huesped: '' };
}
/** Orden de trabajo sugerido: 0 llegada sin limpiar (VIP primero dentro del grupo), 1 salidas, 2 ocupadas sucias, 3 libres sucias, 4 el resto. */
function prioridad(m: TipoMov, l: EstadoLimpieza, d: string) {
  if (d === 'F/O') return 5;
  if (m === 'llegada' && l === 'sucia') return 0;
  if (m === 'salida') return 1;
  if (m === 'casa' && l === 'sucia') return 2;
  if (l === 'sucia') return 3;
  return 4;
}
function ChipHoy({ mov, lista }: { mov: MovHoy; lista: boolean }) {
  if (mov.tipo === 'libre') return <span style={{ color: C.n700 }}>—</span>;
  const urgente = mov.tipo === 'llegada' && !lista;
  const col = urgente ? { c: '#B45309', bg: '#FFF4E0' } : mov.tipo === 'llegada' ? { c: '#0E7A57', bg: '#EEF8F3' } : mov.tipo === 'salida' ? { c: '#2F5DB8', bg: '#EEF3FD' } : { c: C.n700, bg: C.n200 };
  return (
    <span title={mov.huesped} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 8px', borderRadius: radius.pill, fontSize: 11.5, color: col.c, background: col.bg, whiteSpace: 'nowrap' }}>
      {mov.texto}{mov.vip && <b style={{ fontWeight: 700 }}>VIP</b>}
    </span>
  );
}

/** Iniciar / Pausar / Reanudar / Finalizar la limpieza desde el escritorio (lo mismo que la vista de camarera). */
function CronoMini({ num }: { num: string }) {
  const h = useHotel();
  const x = h.habitaciones.find(y => y.numero === num)!;
  const c = x.limpieza;
  const b = (label: string, txt: string, color: string, on: () => void) => (
    <button type="button" aria-label={`${label} limpieza de la ${num}`} title={label} onClick={on}
      style={{ width: 24, height: 24, border: `1px solid ${C.n500}`, borderRadius: radius.control, background: C.n000, color, cursor: 'pointer', fontSize: 10, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{txt}</button>
  );
  if (!c || (c.estado === 'finalizada' && x.sucia)) return x.sucia ? b('Iniciar', '▶', '#2E7D32', () => h.iniciarLimpieza(num, x.camarera ?? '')) : null;
  if (c.estado === 'finalizada') return null;
  return <span style={{ display: 'inline-flex', gap: 4 }}>
    {c.estado === 'enCurso' ? b('Pausar', '❚❚', '#B45309', () => h.pausarLimpieza(num)) : b('Reanudar', '▶', '#2E7D32', () => h.reanudarLimpieza(num))}
    {b('Finalizar', '■', '#2E7D32', () => h.finalizarLimpieza(num))}
  </span>;
}
