'use client';
// Planificador: línea de tiempo por habitación (estilo Gantt). Muestra las
// reservas por estado, bloqueos y preasignaciones. Es la pieza central del
// módulo, así que nada saca al usuario de aquí: clic en una reserva abre su
// detalle en un panel a la derecha (check-in, check-out, cambiar o asignar
// habitación) y clic en un día libre abre la reserva rápida en un modal.
import { useRouter } from 'next/navigation';
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Toast } from '@/components/suite/ui';
import { Alerta, FiltroChecks, exportarCSV, money, usePrint } from '@/components/hotel/ui';
import { Popover } from '@/components/configuracion/kit';
import { IcChevronDown } from '@/components/suite/icons';
import { useHotel, saldoReserva, totalReserva } from '@/components/hotel/store';
import { FormularioCheckIn } from '@/components/hotel/CheckInFormulario';
import { SeleccionHabitacion } from './comun';
import { HOY, REGIMENES, TIPOS, diaSemana, fmtF, noches, sumarDias, type Reserva } from '@/components/hotel/datos';
import { ESTADO_UI, bloqueaHabitacion, numeroDe } from '@/components/hotel/reservas';
import { Exportar, FiltroUno, HojaSistema, PaginaFact, TablaReporte, Tarjeta, tdR } from '@/components/facturacion/comun';
import { bloqueadasEn, fechasEntre, inventario } from './inventario';

const W = 46; // ancho de un día
const ALTO = 30;
const MOSTRAR: Reserva['estado'][] = ['Solicitada', 'Confirmada', 'In-House', 'Completada'];
/** Periodos rápidos: la fecha de inicio más N días. «Personalizado» permite elegir la fecha final. */
const PERIODOS = [7, 15, 20, 30];
const MAX_DIAS = 90;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export default function Planificador() {
  const h = useHotel();
  const router = useRouter();
  const [inicio, setInicio] = useState(HOY);
  const [dias, setDias] = useState('15');
  const [hastaManual, setHastaManual] = useState(sumarDias(HOY, 15));
  const [verSinHab, setVerSinHab] = useState(false);
  const [tipos, setTipos] = useState<string[]>([]);
  const [pisos, setPisos] = useState<string[]>([]);
  const [solicitadas, setSolicitadas] = useState(true);
  const [hover, setHover] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  // Nueva reserva: formulario completo de Reservas con habitación y fecha precargadas.
  const setNueva = (n: { hab: string; entrada: string }) => router.push(`/reservaciones/reservas?nueva=1${n.hab ? `&hab=${n.hab}` : ''}&entrada=${n.entrada}`);
  const [toast, setToast] = useState<string | null>(null);
  const { imprimir, portal } = usePrint();
  const personalizado = dias === 'personalizado';
  // En personalizado el final nunca queda antes del inicio ni más allá del máximo visible.
  const fin = personalizado
    ? (hastaManual < inicio ? inicio : hastaManual > sumarDias(inicio, MAX_DIAS) ? sumarDias(inicio, MAX_DIAS) : hastaManual)
    : sumarDias(inicio, Number(dias));
  const elegirPeriodo = (v: string) => {
    if (v === 'personalizado') setHastaManual(fin);
    setDias(v || '15');
  };
  const fechas = fechasEntre(inicio, fin);
  const habs = h.habitaciones.filter(x => (!tipos.length || tipos.includes(x.tipo)) && (!pisos.length || pisos.includes(String(x.piso))));
  const visibles = useMemo(() => h.reservas.filter(r => r.habitacion && (MOSTRAR.includes(r.estado)) && (solicitadas || r.estado !== 'Solicitada') && r.entrada <= fin && r.salida > inicio), [h.reservas, inicio, fin, solicitadas]);
  const sinHab = h.reservas.filter(r => !r.habitacion && bloqueaHabitacion(r) && r.entrada <= fin && r.salida > inicio);
  const inv = useMemo(() => inventario(h, inicio, fin, { tipos, incluirSolicitadas: solicitadas }), [h, inicio, fin, tipos, solicitadas]);
  const dd = (a: string, b: string) => Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000);
  const nombre = (r: Reserva) => h.perfiles.find(p => p.id === r.perfilId)?.nombre ?? r.nombre;
  /** Barra de medio día de llegada a medio día de salida, recortada al periodo visible. */
  const barra = (desde: string, hasta: string) => {
    const a = Math.max(0, dd(inicio, desde) + 0.5);
    const b = Math.min(fechas.length, dd(inicio, hasta) + 0.5);
    return { left: a * W, width: Math.max(8, (b - a) * W - 2) };
  };
  /** Mueve el inicio; en personalizado la fecha final se mueve igual para conservar el largo del periodo. */
  const moverInicio = (nuevo: string) => {
    if (personalizado) setHastaManual(sumarDias(fin, dd(inicio, nuevo)));
    setInicio(nuevo);
  };
  const ir = (n: number) => moverInicio(sumarDias(inicio, n));
  const csv = () => exportarCSV('planificador', ['Habitación', 'Tipo', ...fechas.map(fmtF)], habs.map(x => [x.numero, x.tipo, ...fechas.map(d => {
    const r = visibles.find(y => y.habitacion === x.numero && y.entrada <= d && y.salida > d);
    return r ? `${numeroDe(r)} ${r.estado}` : '';
  })]));
  const pdf = () => imprimir(
    <HojaSistema titulo="Planificador" subtitulo="Ocupación por habitación" criterio={`Del ${fmtF(inicio)} al ${fmtF(fin)} · ${habs.length} habitaciones`}>
      <TablaReporte headers={['Fecha', 'Ocupadas', 'Solicitadas', 'Bloqueadas', 'Libres', '% Ocupación', 'Llegadas', 'Salidas']} derecha={[1, 2, 3, 4, 5, 6, 7]}>
        {inv.map(d => <tr key={d.fecha}><td style={tdR()}>{diaSemana(d.fecha)} {fmtF(d.fecha)}</td><td style={tdR(true)}>{d.total.ocupadas}</td><td style={tdR(true)}>{d.total.solicitadas}</td><td style={tdR(true)}>{d.total.bloqueadas}</td><td style={tdR(true)}>{d.total.libres}</td><td style={tdR(true)}>{d.total.pct}%</td><td style={tdR(true)}>{d.total.llegadas}</td><td style={tdR(true)}>{d.total.salidas}</td></tr>)}
      </TablaReporte>
    </HojaSistema>);
  const celdaDia: CSSProperties = { width: W, flexShrink: 0, borderLeft: `1px solid ${C.n500}`, textAlign: 'center' };
  return (
    <PaginaFact titulo="Planificador" acciones={<>
      <Exportar onCSV={csv} onPDF={pdf} titulo="Planificador" criterio={`Del ${fmtF(inicio)} al ${fmtF(fin)} · ${habs.length} habitaciones`} />
      {sinHab.length > 0 && (
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <Button variant="secondary" onClick={() => setVerSinHab(v => !v)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Asignar habitaciones
              <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: radius.pill, background: '#EEB300', color: '#3D2E00', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{sinHab.length}</span>
              <IcChevronDown size={12} />
            </span>
          </Button>
          <Popover open={verSinHab} onClose={() => setVerSinHab(false)} width={320} align="right">
            <div style={{ padding: '10px 12px 6px', fontSize: 11.5, color: C.n700 }}>Reservas sin habitación del {fmtF(inicio)} al {fmtF(fin)}</div>
            <div role="menu" style={{ padding: '0 6px 6px', display: 'flex', flexDirection: 'column', maxHeight: 280, overflowY: 'auto' }}>
              {sinHab.map(r => (
                <button key={r.id} role="menuitem" type="button" className="suite-fila" onClick={() => { setSel(r.id); setVerSinHab(false); }}
                  style={{ display: 'flex', gap: 8, alignItems: 'center', textAlign: 'left', padding: '8px 10px', border: 'none', background: sel === r.id ? C.brandBg : 'none', fontSize: 12, fontFamily: FONT, borderRadius: radius.control, cursor: 'pointer', color: C.n900 }}>
                  <b style={{ fontWeight: 600 }}>{numeroDe(r)}</b>
                  <span style={{ color: C.n700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombre(r)}</span>
                  <span style={{ color: C.n700 }}>{r.tipo} · {fmtF(r.entrada)}</span>
                </button>
              ))}
            </div>
            <div style={{ borderTop: `1px solid ${C.n500}`, padding: 8, display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => router.push('/reservaciones/asignacion-de-habitaciones')}>Ir a asignación de habitaciones</Button>
            </div>
          </Popover>
        </span>
      )}
      <Button onClick={() => setNueva({ hab: '', entrada: HOY })}>Nueva reserva</Button></>}
      filtros={<>
          <span style={{ display: 'inline-flex', border: `1px solid ${C.n500}`, borderRadius: radius.control, overflow: 'hidden' }}>
            <button type="button" aria-label="Semana anterior" onClick={() => ir(-7)} style={nav}>‹</button>
            <button type="button" onClick={() => moverInicio(HOY)} style={{ ...nav, width: 'auto', padding: '0 12px', borderLeft: `1px solid ${C.n500}`, borderRight: `1px solid ${C.n500}` }}>Hoy</button>
            <button type="button" aria-label="Semana siguiente" onClick={() => ir(7)} style={nav}>›</button>
          </span>
          <input type="date" value={inicio} onChange={e => e.target.value && moverInicio(e.target.value)} aria-label="Fecha de inicio" className="suite-campo" style={{ height: 32, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 8px', fontSize: 12, fontFamily: FONT }} />
          <FiltroUno label="Periodo" value={dias} onChange={elegirPeriodo} todos={null} prefijo={false} ancho={180}
            opciones={[...PERIODOS.map(n => ({ value: String(n), label: `+ ${n} días` })), { value: 'personalizado', label: 'Personalizado' }]} />
          {personalizado && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.n700 }}>
              hasta
              <input type="date" value={fin} min={inicio} max={sumarDias(inicio, MAX_DIAS)} onChange={e => e.target.value && setHastaManual(e.target.value)} aria-label="Fecha final" className="suite-campo" style={{ height: 32, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 8px', fontSize: 12, fontFamily: FONT }} />
            </span>
          )}
          <FiltroChecks label="Tipo de habitación" value={tipos} onChange={setTipos} opciones={TIPOS.map(t => ({ value: t.id, label: `${t.codigo} - ${t.nombre}` }))} />
          <FiltroChecks label="Piso" value={pisos} onChange={setPisos} opciones={[1, 2, 3, 4].map(p => ({ value: String(p), label: `Piso ${p}` }))} ancho={160} />
          <Checkbox checked={solicitadas} onChange={setSolicitadas} label="Mostrar solicitadas" />
      </>}
      filtrosDerecha={<>
          <span style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: C.n700 }}>
            {(['Solicitada', 'Confirmada', 'In-House', 'Completada'] as const).map(e => <span key={e} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><i style={{ width: 12, height: 10, borderRadius: 2, background: ESTADO_UI[e].hex }} />{e}</span>)}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><i style={{ width: 12, height: 10, borderRadius: 2, background: 'repeating-linear-gradient(45deg,#9E9E9E 0 3px,#E0E0E0 3px 6px)' }} />Bloqueo</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><i style={{ width: 12, height: 10, borderRadius: 2, border: `1.5px dashed ${C.brand}` }} />Preasignación</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>★ VIP</span>
          </span>
      </>}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', minWidth: 0 }}>
      <Tarjeta style={{ padding: 16, flex: 1, minWidth: 0 }}>
        <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 250px)', border: `1px solid ${C.n500}`, borderRadius: radius.md }}>
          <div style={{ minWidth: 150 + fechas.length * W, position: 'relative' }}>
            {/* Cabecera de días */}
            <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 3, background: C.n200, borderBottom: `1px solid ${C.n500}` }}>
              <div style={{ width: 150, flexShrink: 0, position: 'sticky', left: 0, background: C.n200, zIndex: 4, padding: '6px 10px', fontSize: 11, color: C.n700, display: 'flex', alignItems: 'flex-end' }}>Habitación</div>
              {fechas.map(d => (
                <div key={d} style={{ ...celdaDia, padding: '4px 0', background: d === HOY ? C.brandBg : undefined, color: d === HOY ? C.brand : C.n900 }}>
                  <div style={{ fontSize: 11, color: d === HOY ? C.brand : C.n700, textTransform: 'capitalize' }}>{diaSemana(d)}</div>
                  <div style={{ fontSize: 12, fontWeight: d === HOY ? 700 : 500 }}>{Number(d.slice(8))}</div>
                  <div style={{ fontSize: 10.5, color: C.n700 }}>{MESES[Number(d.slice(5, 7)) - 1]}</div>
                </div>
              ))}
            </div>
            {/* Ocupación diaria */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${C.n500}`, background: C.n000 }}>
              <div style={{ width: 150, flexShrink: 0, position: 'sticky', left: 0, background: C.n000, zIndex: 2, padding: '5px 10px', fontSize: 11, color: C.n700 }}>% ocupación · libres</div>
              {inv.map(d => (
                <div key={d.fecha} title={`${d.total.ocupadas} ocupadas · ${d.total.solicitadas} solicitadas · ${d.total.bloqueadas} bloqueadas`} style={{ ...celdaDia, padding: '4px 0', fontSize: 10.5 }}>
                  <div style={{ fontWeight: 600, color: d.total.pct >= 90 ? C.error : d.total.pct >= 70 ? '#B58900' : '#2E7D32' }}>{Math.round(d.total.pct)}%</div><div style={{ color: C.n700 }}>{d.total.libres}</div>
                </div>
              ))}
            </div>
            {/* Filas por habitación */}
            {habs.map(x => {
              const bloq = fechas.filter(d => bloqueadasEn([x], h.tareas, d, h.bloqueos).has(x.numero));
              const pre = h.preasignaciones.filter(p => p.habitacion === x.numero && p.desde <= fin && p.hasta >= inicio);
              return (
                <div key={x.numero} style={{ display: 'flex', height: ALTO + 6, borderBottom: `1px solid ${C.n500}`, position: 'relative' }}>
                  <div style={{ width: 150, flexShrink: 0, position: 'sticky', left: 0, background: C.n000, zIndex: 2, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, borderRight: `1px solid ${C.n500}` }}>
                    <b style={{ fontWeight: 600, width: 30 }}>{x.numero}</b><span style={{ color: C.n700, fontSize: 11 }}>{x.tipo}</span>
                    {x.sucia && <span title="Sucia" style={{ width: 7, height: 7, borderRadius: '50%', background: '#D97706' }} />}
                  </div>
                  <div style={{ position: 'relative', display: 'flex' }}>
                    {fechas.map(d => (
                      <button key={d} type="button" aria-label={`Nueva reserva habitación ${x.numero} el ${fmtF(d)}`} onClick={() => setNueva({ hab: x.numero, entrada: d < HOY ? HOY : d })}
                        disabled={d < HOY} className="celda-plan" style={{ ...celdaDia, height: '100%', border: 'none', borderLeft: `1px solid ${C.n500}`, background: d === HOY ? 'rgba(33,60,137,.04)' : 'transparent', cursor: d < HOY ? 'default' : 'copy', padding: 0 }} />
                    ))}
                    {bloq.length > 0 && (() => { const b = barra(bloq[0], sumarDias(bloq[bloq.length - 1], 1)); return <div title={x.motivoBloqueo || 'Bloqueada'} style={{ position: 'absolute', top: 5, height: ALTO - 4, left: b.left, width: b.width, borderRadius: 4, background: 'repeating-linear-gradient(45deg,#9E9E9E 0 4px,#E0E0E0 4px 8px)', pointerEvents: 'none', opacity: 0.8 }} />; })()}
                    {pre.map(p => { const b = barra(p.desde, sumarDias(p.hasta, 1)); return <div key={p.id} title={`Preasignada: ${p.descripcion}`} style={{ position: 'absolute', top: 4, height: ALTO - 2, left: b.left, width: b.width, borderRadius: 4, border: `1.5px dashed ${C.brand}`, pointerEvents: 'none' }} />; })}
                    {visibles.filter(r => r.habitacion === x.numero).map(r => {
                      const b = barra(r.entrada, r.salida);
                      const col = ESTADO_UI[r.estado].hex;
                      return (
                        <button key={r.id} type="button" onClick={() => setSel(r.id)} aria-pressed={sel === r.id} onMouseEnter={() => setHover(r.id)} onMouseLeave={() => setHover(null)}
                          title={`${numeroDe(r)} · ${nombre(r)} · ${r.estado}\n${fmtF(r.entrada)} → ${fmtF(r.salida)} · ${r.adultos + r.ninos} pax · ${r.tarifa}`}
                          style={{ position: 'absolute', top: 5, height: ALTO - 4, left: b.left, width: b.width, borderRadius: 5, border: 'none', background: r.estado === 'Solicitada' ? `repeating-linear-gradient(135deg, ${col} 0 6px, #F57C00 6px 12px)` : col, color: '#fff',
                            fontSize: 11, fontFamily: FONT, textAlign: 'left', padding: '0 7px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer',
                            boxShadow: sel === r.id ? `0 0 0 2px ${C.n000}, 0 0 0 4px ${C.n900}` : hover === r.id ? '0 2px 8px rgba(0,0,0,.25)' : undefined, zIndex: sel === r.id ? 2 : 1, opacity: r.estado === 'Completada' ? 0.75 : 1 }}>
                          {r.vip && '★ '}{nombre(r)} · {numeroDe(r)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Tarjeta>
      {sel && h.reservas.some(r => r.id === sel) && <PanelReserva id={sel} onClose={() => setSel(null)} onToast={setToast} />}
      </div>
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      {portal}
    </PaginaFact>
  );
}
const nav: CSSProperties = { width: 32, height: 30, border: 'none', background: C.n000, cursor: 'pointer', fontSize: 14, fontFamily: FONT };

// ── Panel de la reserva (a la derecha del planificador, sin salir) ──────────
function PanelReserva({ id, onClose, onToast }: { id: string; onClose: () => void; onToast: (t: string) => void }) {
  const h = useHotel();
  const r = h.reservas.find(x => x.id === id)!;
  const [checkin, setCheckin] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [habitacion, setHabitacion] = useState(false);
  const nombre = h.perfiles.find(p => p.id === r.perfilId)?.nombre ?? r.nombre;
  const col = ESTADO_UI[r.estado].hex;
  const saldo = saldoReserva(r);
  const puedeIn = r.estado === 'Confirmada' && r.entrada === HOY && !!r.habitacion;
  const puedeOut = r.estado === 'In-House' && r.salida <= HOY;
  const fila = (l: string, v: ReactNode) => <div style={{ display: 'grid', gridTemplateColumns: '108px 1fr', gap: 8, fontSize: 12.5, padding: '5px 0' }}><span style={{ color: C.n700 }}>{l}</span><span>{v}</span></div>;
  return (
    <aside aria-label={`Reserva ${numeroDe(r)}`} style={{ width: 340, flexShrink: 0, position: 'sticky', top: 0, background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.card, fontFamily: FONT, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 210px)' }}>
      <header style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${C.n500}`, borderTop: `4px solid ${col}`, borderRadius: `${radius.card}px ${radius.card}px 0 0`, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11.5, fontWeight: 500, color: col, background: `color-mix(in srgb, ${col} 12%, transparent)`, padding: '2px 10px', borderRadius: radius.pill }}>{r.estado}</span>
          <span style={{ fontSize: 12, color: C.n700 }}>{numeroDe(r)}</span>
          <button type="button" aria-label="Cerrar panel de la reserva" onClick={onClose} style={{ marginLeft: 'auto', border: 'none', background: 'none', fontSize: 16, color: C.n700, cursor: 'pointer' }}>✕</button>
        </div>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{r.vip && <span title="VIP" style={{ color: '#E0A800' }}>★ </span>}{nombre.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase())}</h2>
        <span style={{ fontSize: 12, color: C.n700 }}>{fmtF(r.entrada)} → {fmtF(r.salida)} · {noches(r.entrada, r.salida)} noches · {r.adultos + r.ninos} pax</span>
      </header>
      <div style={{ padding: '8px 16px', overflowY: 'auto', flex: 1 }}>
        {fila('Habitación', r.habitacion ? `${r.habitacion} · ${TIPOS.find(t => t.id === r.tipo)?.nombre ?? r.tipo}` : <span style={{ color: '#B45309' }}>Sin asignar · {TIPOS.find(t => t.id === r.tipo)?.nombre}</span>)}
        {fila('Tarifa', `${r.tarifa} · ${money(r.precio)} / noche`)}
        {fila('Régimen', REGIMENES[r.regimen] ?? r.regimen)}
        {fila('Canal', r.empresa || 'Directo')}
        {fila('Total', money(totalReserva(r)))}
        {fila('Pagado', money(r.pagado))}
        {fila('Saldo', <b style={{ fontWeight: 600, color: saldo > 0 ? C.error : '#2E7D32' }}>{money(saldo)}</b>)}
        {r.telefono && fila('Teléfono', r.telefono)}
        {(r.observaciones || r.observacionesInternas) && <p style={{ fontSize: 12, color: C.n700, whiteSpace: 'pre-line', margin: '8px 0 0' }}>{r.observaciones || r.observacionesInternas}</p>}
      </div>
      <footer style={{ padding: '12px 16px', borderTop: `1px solid ${C.n500}`, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {puedeIn && <Button onClick={() => setCheckin(true)}>Check-in</Button>}
        {puedeOut && <Button onClick={() => setCheckout(true)}>Check-out</Button>}
        {['Solicitada', 'Confirmada', 'In-House'].includes(r.estado) && <Button variant={!r.habitacion ? 'primary' : 'secondary'} onClick={() => setHabitacion(true)}>{r.habitacion ? 'Cambiar habitación' : 'Asignar habitación'}</Button>}
        <Link href={`/reservaciones/reservas?id=${r.id}`} style={{ alignSelf: 'center', fontSize: 12.5, color: C.brand, textDecoration: 'none', marginLeft: 'auto' }}>Reserva completa ↗</Link>
      </footer>
      {/* los modales van al body: el panel es sticky y crearía su propio contexto de apilamiento */}
      {createPortal(<>
      {checkin && <FormularioCheckIn reservaId={r.id} onClose={() => setCheckin(false)} />}
      <Alerta open={checkout} titulo={`¿Hacer el check-out de ${numeroDe(r)}?`} confirmar="Sí, check-out" onClose={() => setCheckout(false)}
        onConfirm={() => { h.checkOut(r.id); setCheckout(false); onToast(`Check-out de la ${r.habitacion} realizado`); }}>
        {saldo > 0 ? <>La reserva tiene un saldo de <b>{money(saldo)}</b> pendiente en sus cuentas.</> : 'La habitación quedará libre y sucia.'}
      </Alerta>
      {habitacion && <SeleccionHabitacion tipo={r.tipo} entrada={r.estado === 'In-House' ? HOY : r.entrada} salida={r.salida} ignorar={[r.id]} actual={r.habitacion}
        titulo={r.habitacion ? `Cambiar habitación · ${numeroDe(r)}` : `Asignar habitación · ${numeroDe(r)}`} onClose={() => setHabitacion(false)}
        onElegir={num => {
          if (r.estado === 'In-House') h.mover(r.id, num, r.precio, 'Cambio desde el planificador');
          else h.asignarHabitacion(r.id, num);
          setHabitacion(false); onToast(`${numeroDe(r)} → habitación ${num}`);
        }} />}
      </>, document.body)}
    </aside>
  );
}
