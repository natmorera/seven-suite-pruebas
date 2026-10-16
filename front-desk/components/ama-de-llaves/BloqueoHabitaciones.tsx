'use client';
// Ama de llaves → Bloqueo de habitaciones.
// Tabla editable en línea: Habitación, Desde, Hasta (vacío = indefinido) y
// Motivo. Se guarda sola al completar los campos y salir de la fila. Un
// bloqueo vigente pone la habitación «Bloqueada» en el Mapa, «Fuera de orden»
// en el Planificador, «F/O» en Estado de las habitaciones y la saca del
// inventario y de la asignación de reservas en ese período. Los bloqueos que
// vienen de una tarea se muestran aquí también (se editan en la tarea).
import { useMemo, useRef, useState, type FocusEvent } from 'react';
import Link from 'next/link';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Toast } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { Pantalla } from '@/components/layout/Pantalla';
import { Buscador, IcTrash, IconButton, Popover } from '@/components/configuracion/kit';
import { useHotel, nuevoId } from '@/components/hotel/store';
import { HOY, TIPOS, fmtF, sumarDias, tareaAbierta, type BloqueoHab } from '@/components/hotel/datos';
import { bloqueaHabitacion } from '@/components/hotel/reservas';
import { bloqueoCruza } from '@/components/reservaciones/inventario';
import { Alerta, BotonExportar, FechaBoton, HojaReporte, TablaImpresa, exportarCSV, usePrint } from '@/components/hotel/ui';
import { Tarjeta, TextoEnLinea, td, th } from './comun';

interface Fila extends BloqueoHab { tarea?: string }
type Estado = 'Activo' | 'Programado' | 'Finalizado';
const estadoDe = (b: { desde: string; hasta: string }): Estado => (b.hasta && b.hasta < HOY ? 'Finalizado' : b.desde > HOY ? 'Programado' : 'Activo');
const COLOR_EST: Record<Estado, { c: string; bg: string }> = { Activo: { c: '#C62828', bg: '#FDECEA' }, Programado: { c: '#213C89', bg: '#E8EDF8' }, Finalizado: { c: '#616161', bg: '#F0F0F0' } };
const vacio = (): BloqueoHab => ({ id: '', habitacion: '', desde: HOY, hasta: '', motivo: '', usuario: '', creado: '' });

export default function BloqueoHabitaciones() {
  const h = useHotel();
  const [q, setQ] = useState('');
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');
  const [historial, setHistorial] = useState(false);
  const [borrador, setBorrador] = useState<BloqueoHab | null>(null);
  const [errorB, setErrorB] = useState('');
  const [indefinido, setIndefinido] = useState<BloqueoHab | null>(null);
  const [borrar, setBorrar] = useState<Fila | null>(null);
  const [toast, setToast] = useState<{ t: string; tipo: 'success' | 'error' } | null>(null);
  const { imprimir, portal } = usePrint();

  // Bloqueos manuales + bloqueos de tareas (una fila por habitación)
  const todas = useMemo<Fila[]>(() => [
    ...h.bloqueos,
    ...h.tareas.filter(t => t.bloqueo && tareaAbierta(t)).flatMap(t => t.bloqueo!.habitaciones.map(n => ({
      id: `t:${t.id}:${n}`, habitacion: n, desde: t.bloqueo!.inicio, hasta: t.bloqueo!.fin, motivo: t.bloqueo!.motivo || t.tarea, usuario: t.creador, creado: '', tareaId: t.id, tarea: t.tarea,
    }))),
  ], [h.bloqueos, h.tareas]);
  const filas = useMemo(() => todas.filter(b => (historial || estadoDe(b) !== 'Finalizado') && (!q.trim() || b.habitacion.includes(q.trim()))
    && (!fDesde || !b.hasta || b.hasta >= fDesde) && (!fHasta || b.desde <= fHasta))
    .sort((a, b) => (estadoDe(a) === 'Finalizado' ? 1 : 0) - (estadoDe(b) === 'Finalizado' ? 1 : 0) || a.desde.localeCompare(b.desde) || a.habitacion.localeCompare(b.habitacion)), [todas, historial, q, fDesde, fHasta]);

  /** Reglas: habitación y motivo obligatorios, Desde ≥ fecha hotelera, Hasta > Desde y sin solaparse con otro bloqueo de la misma habitación. */
  const validar = (b: BloqueoHab, original?: BloqueoHab): string => {
    if (!b.habitacion) return 'Selecciona la habitación.';
    if (!b.desde) return 'Indica la fecha Desde.';
    if (b.desde < HOY && (!original || original.desde !== b.desde)) return `La fecha Desde no puede ser anterior a la fecha hotelera (${fmtF(HOY)}).`;
    if (b.hasta && b.hasta <= b.desde) return 'La fecha Hasta debe ser posterior a la fecha Desde.';
    if (!b.motivo.trim()) return 'Escribe el motivo del bloqueo.';
    const hab = h.habitaciones.find(x => x.numero === b.habitacion);
    if (hab && hab.estado !== 'libre' && hab.estado !== 'bloqueada' && bloqueoCruza(b, HOY, HOY)) {
      const libreDesde = desdeSugerido(b.habitacion);
      return `La ${b.habitacion} ${hab.estado === 'checkin' || hab.estado === 'checkinRL' ? 'tiene una llegada hoy' : 'está ocupada'}: el bloqueo puede empezar el ${fmtF(libreDesde)} o reasigna la reserva antes.`;
    }
    const choque = todas.find(o => o.id !== b.id && o.habitacion === b.habitacion && estadoDe(o) !== 'Finalizado' && bloqueoCruza(o, b.desde, b.hasta || '9999-12-31'));
    if (choque) return `La ${b.habitacion} ya está bloqueada del ${fmtF(choque.desde)} ${choque.hasta ? `al ${fmtF(choque.hasta)}` : 'en adelante'}.`;
    return '';
  };
  /** Primera fecha libre para bloquear: hoy, o la salida del huésped / de la llegada de hoy. */
  const desdeSugerido = (num: string) => {
    const x = h.habitaciones.find(y => y.numero === num);
    if (!x || x.estado === 'libre' || x.estado === 'bloqueada') return HOY;
    const r = h.reservas.filter(y => y.habitacion === num && bloqueaHabitacion(y) && y.entrada <= HOY && y.salida >= HOY).sort((a, c) => c.salida.localeCompare(a.salida))[0];
    return r && r.salida > HOY ? r.salida : sumarDias(HOY, 1);
  };
  const conflictos = (b: { habitacion: string; desde: string; hasta: string }) => h.reservas.filter(r => r.habitacion === b.habitacion && bloqueaHabitacion(r) && r.salida > b.desde && (!b.hasta || r.entrada <= b.hasta));

  const guardarBorrador = (b: BloqueoHab, confirmado = false) => {
    const e = validar(b);
    if (e) { setErrorB(e); return; }
    if (!b.hasta && !confirmado) { setIndefinido(b); return; }
    h.guardarBloqueo({ ...b, id: nuevoId('bq'), motivo: b.motivo.trim(), usuario: h.sesion, creado: `${HOY}T${new Date().toTimeString().slice(0, 5)}` });
    setBorrador(null); setErrorB(''); setIndefinido(null);
    setToast({ t: `Habitación ${b.habitacion} bloqueada ${b.hasta ? `hasta el ${fmtF(b.hasta)}` : 'sin fecha final'}`, tipo: 'success' });
  };
  const editar = (orig: BloqueoHab, p: Partial<BloqueoHab>) => {
    const b = { ...orig, ...p };
    const e = validar(b, orig);
    if (e) { setToast({ t: e, tipo: 'error' }); return; }
    h.guardarBloqueo(b);
    setToast({ t: 'Bloqueo actualizado', tipo: 'success' });
  };
  const eliminar = (f: Fila) => {
    if (f.tareaId) h.setTareas(ts => ts.map(t => (t.id !== f.tareaId || !t.bloqueo ? t : { ...t, bloqueo: t.bloqueo.habitaciones.length > 1 ? { ...t.bloqueo, habitaciones: t.bloqueo.habitaciones.filter(n => n !== f.habitacion) } : null })));
    else h.eliminarBloqueo(f.id);
    setToast({ t: `Bloqueo de la ${f.habitacion} eliminado`, tipo: 'success' });
    setBorrar(null);
  };

  const HEAD = ['Habitación', 'Desde', 'Hasta', 'Motivo', 'Estado', 'Origen', 'Usuario'];
  const datos = () => filas.map(b => [b.habitacion, fmtF(b.desde), b.hasta ? fmtF(b.hasta) : 'Indefinido', b.motivo, estadoDe(b), b.tarea ? `Tarea: ${b.tarea}` : 'Ama de llaves', b.usuario]);
  const criterio = [q && `Habitación: ${q}`, fDesde && `Desde: ${fmtF(fDesde)}`, fHasta && `Hasta: ${fmtF(fHasta)}`, historial ? 'Incluye finalizados' : 'Vigentes y programados'].filter(Boolean).join(' · ');
  const activos = todas.filter(b => estadoDe(b) === 'Activo').length, programados = todas.filter(b => estadoDe(b) === 'Programado').length;

  return (
    <Pantalla titulo="Bloqueo de habitaciones"
      acciones={<>
        <BotonExportar titulo="Bloqueo de habitaciones" criterio={criterio} disabled={!filas.length} onCSV={() => exportarCSV('bloqueo-habitaciones', HEAD, datos())}
          onPDF={() => imprimir(<HojaReporte titulo="Bloqueo de habitaciones" filtros={criterio}><TablaImpresa headers={HEAD} filas={datos()} /></HojaReporte>)} />
        <Button icon={<IcPlus size={12} />} disabled={!!borrador} onClick={() => { setBorrador(vacio()); setErrorB(''); }}>Crear nuevo bloqueo</Button>
      </>}
      filtros={<>
        <Buscador value={q} onChange={v => setQ(v.replace(/\D/g, ''))} placeholder="Buscar habitación" width={200} />
        <FechaBoton label="Fecha desde" value={fDesde} onChange={setFDesde} />
        <FechaBoton label="Fecha hasta" value={fHasta} onChange={setFHasta} min={fDesde || undefined} />
        <Checkbox checked={historial} onChange={setHistorial} label="Mostrar finalizados" />
        {(q || fDesde || fHasta) ? <Button variant="ghost" onClick={() => { setQ(''); setFDesde(''); setFHasta(''); }}>Limpiar filtros</Button> : null}
      </>}
      filtrosDerecha={<span style={{ fontSize: 12, color: C.n700 }}>{activos} activos · {programados} programados</span>}>
      <Tarjeta style={{ padding: '6px 16px 12px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 940 }}>
            <thead><tr>{['Habitación', 'Desde', 'Hasta', 'Motivo', 'Estado', ''].map((c, i) => <th key={i} style={th}>{c}</th>)}</tr></thead>
            <tbody>
              {borrador && <FilaNueva b={borrador} error={errorB} todas={todas} conflictos={conflictos(borrador).length}
                onChange={p => { setBorrador(b => { const n = { ...b!, ...p }; if (p.habitacion) { const d = desdeSugerido(p.habitacion); if (n.desde < d) n.desde = d; if (n.hasta && n.hasta <= n.desde) n.hasta = ''; } return n; }); setErrorB(''); }} onGuardar={b => guardarBorrador(b)} onCancelar={() => { setBorrador(null); setErrorB(''); }} />}
              {filas.length === 0 && !borrador && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.n700, padding: 30 }}>{todas.length ? 'Ningún bloqueo coincide con la búsqueda y los filtros.' : 'No hay habitaciones bloqueadas. Crea uno con «Crear nuevo bloqueo».'}</td></tr>}
              {filas.map(b => {
                const est = estadoDe(b);
                const fin = est === 'Finalizado';
                const editable = !b.tareaId && !fin;
                const conf = fin ? [] : conflictos(b);
                return (
                  <tr key={b.id} className="suite-fila" style={{ color: fin ? C.n700 : undefined }}>
                    <td style={{ ...td, width: 120 }}><b style={{ fontWeight: 600 }}>{b.habitacion}</b> <span style={{ color: C.n700, fontSize: 11 }}>{h.habitaciones.find(x => x.numero === b.habitacion)?.tipo}</span></td>
                    <td style={{ ...td, width: 150 }}>{editable && b.desde > HOY ? <CampoFecha valor={b.desde} min={HOY} label={`Desde ${b.habitacion}`} onChange={v => editar(b, { desde: v })} /> : fmtF(b.desde)}</td>
                    <td style={{ ...td, width: 170 }}>{editable
                      ? <CampoFecha valor={b.hasta} min={sumarDias(b.desde < HOY ? HOY : b.desde, b.desde < HOY ? 0 : 1)} label={`Hasta ${b.habitacion}`} vacio="Indefinido" onChange={v => editar(b, { hasta: v })} />
                      : b.hasta ? fmtF(b.hasta) : 'Indefinido'}</td>
                    <td style={{ ...td, minWidth: 260 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {editable ? <TextoEnLinea valor={b.motivo} label={`Motivo ${b.habitacion}`} placeholder="Motivo" onGuardar={v => (v ? editar(b, { motivo: v }) : setToast({ t: 'El motivo es obligatorio.', tipo: 'error' }))} />
                          : <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }} title={b.motivo}>{b.motivo}</span>}
                        {b.tareaId && <Link href="/hospedaje/tareas" title={`Bloqueo creado desde la tarea «${b.tarea}». Se edita en Tareas.`} style={{ fontSize: 11, color: C.brand, background: C.brandBg, borderRadius: radius.pill, padding: '2px 8px', textDecoration: 'none', whiteSpace: 'nowrap' }}>Tarea</Link>}
                        {conf.length > 0 && <span title={`Reservas asignadas en el período: ${conf.map(r => r.numero).join(', ')}. Reasígnalas a otra habitación.`} style={{ fontSize: 11, color: '#B45309', background: '#FFF4E5', borderRadius: radius.pill, padding: '2px 8px', whiteSpace: 'nowrap' }}>⚠ {conf.length} {conf.length === 1 ? 'reserva' : 'reservas'}</span>}
                      </span>
                    </td>
                    <td style={{ ...td, width: 110 }}><span style={{ fontSize: 11.5, color: COLOR_EST[est].c, background: COLOR_EST[est].bg, padding: '3px 10px', borderRadius: radius.pill }}>{est}</span></td>
                    <td style={{ ...td, width: 50, textAlign: 'right' }}>{!fin && <IconButton label={`Eliminar bloqueo ${b.habitacion}`} tono="peligro" onClick={() => setBorrar(b)}><IcTrash /></IconButton>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Tarjeta>
      <Alerta open={!!borrar} titulo="¿Deseas eliminar este bloqueo?" tono="danger" confirmar="Sí, eliminar" onClose={() => setBorrar(null)} onConfirm={() => eliminar(borrar!)}>
        La habitación {borrar?.habitacion} volverá a estar disponible.{borrar?.tareaId ? ` El bloqueo se quitará también de la tarea «${borrar.tarea}».` : ''}
      </Alerta>
      <Alerta open={!!indefinido} titulo="¿Bloquear sin fecha final?" confirmar="Sí, bloquear" onClose={() => setIndefinido(null)} onConfirm={() => guardarBorrador(indefinido!, true)}>
        La habitación {indefinido?.habitacion} quedará bloqueada de forma indefinida desde el {fmtF(indefinido?.desde)} hasta que elimines el bloqueo.
      </Alerta>
      {toast && <Toast message={toast.t} type={toast.tipo} onClose={() => setToast(null)} />}
      {portal}
    </Pantalla>
  );
}

/** Fila nueva: se guarda sola al completar los campos obligatorios y salir de la fila (o con Enter). */
function FilaNueva({ b, error, todas, conflictos, onChange, onGuardar, onCancelar }: {
  b: BloqueoHab; error: string; todas: BloqueoHab[]; conflictos: number; onChange: (p: Partial<BloqueoHab>) => void; onGuardar: (b: BloqueoHab) => void; onCancelar: () => void;
}) {
  const ref = useRef<HTMLTableRowElement>(null);
  const completa = !!(b.habitacion && b.desde && b.motivo.trim());
  const salir = (e: FocusEvent<HTMLTableRowElement>) => {
    const destino = e.relatedTarget as Node | null;
    // los popovers se montan fuera de la fila: no cuentan como «salir»
    if (destino && (ref.current?.contains(destino) || (destino as HTMLElement).closest?.('[data-combo-hab]'))) return;
    if (completa) onGuardar(b);
  };
  return (
    <>
      <tr ref={ref} onBlur={salir} onKeyDown={e => { if (e.key === 'Enter' && completa) onGuardar(b); if (e.key === 'Escape') onCancelar(); }} style={{ background: C.brandBg }}>
        <td style={{ ...td, width: 120 }}><ComboHab valor={b.habitacion} desde={b.desde} hasta={b.hasta} todas={todas} onChange={v => onChange({ habitacion: v })} /></td>
        <td style={{ ...td, width: 150 }}><CampoFecha valor={b.desde} min={HOY} label="Desde" onChange={v => onChange({ desde: v, hasta: b.hasta && b.hasta <= v ? '' : b.hasta })} /></td>
        <td style={{ ...td, width: 170 }}><CampoFecha valor={b.hasta} min={sumarDias(b.desde || HOY, 1)} label="Hasta" vacio="Indefinido" onChange={v => onChange({ hasta: v })} /></td>
        <td style={{ ...td, minWidth: 260 }}>
          <input value={b.motivo} onChange={e => onChange({ motivo: e.target.value })} placeholder="Motivo del bloqueo" aria-label="Motivo" className="suite-campo"
            style={{ width: '100%', height: 30, boxSizing: 'border-box', border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 8px', fontSize: 12, fontFamily: FONT, outline: 'none', background: C.n000 }} />
        </td>
        <td style={{ ...td, width: 110, color: C.n700, fontSize: 11 }}>{completa ? 'Se guarda al salir' : 'Nuevo'}</td>
        <td style={{ ...td, width: 50, textAlign: 'right' }}><IconButton label="Descartar bloqueo nuevo" onClick={onCancelar}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg></IconButton></td>
      </tr>
      {(error || conflictos > 0) && (
        <tr><td colSpan={6} style={{ padding: '4px 10px 8px', fontSize: 11.5, background: C.brandBg }}>
          {error && <span role="alert" style={{ color: C.error }}>{error} </span>}
          {conflictos > 0 && <span style={{ color: '#B45309' }}>⚠ La {b.habitacion} tiene {conflictos} {conflictos === 1 ? 'reserva asignada' : 'reservas asignadas'} en el período: tendrás que reasignarlas.</span>}
        </td></tr>
      )}
    </>
  );
}

/** Desplegable con búsqueda: solo habitaciones que no están bloqueadas en el período elegido. */
function ComboHab({ valor, desde, hasta, todas, onChange }: { valor: string; desde: string; hasta: string; todas: BloqueoHab[]; onChange: (v: string) => void }) {
  const h = useHotel();
  const [open, setOpen] = useState(!valor);
  const [q, setQ] = useState('');
  const libres = h.habitaciones.filter(x => !todas.some(o => o.habitacion === x.numero && estadoDe(o) !== 'Finalizado' && bloqueoCruza(o, desde || HOY, hasta || '9999-12-31')));
  const visibles = libres.filter(x => !q || x.numero.includes(q.trim()) || (TIPOS.find(t => t.id === x.tipo)?.nombre ?? '').toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }} data-combo-hab>
      <button type="button" onClick={() => setOpen(o => !o)} aria-label="Habitación" aria-expanded={open} className="suite-campo"
        style={{ width: 100, height: 30, border: `1px solid ${open ? C.brand : C.n500}`, borderRadius: radius.control, background: C.n000, padding: '0 8px', fontSize: 12, fontFamily: FONT, color: valor ? C.n900 : C.n700, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {valor || 'Habitación'}<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <Popover open={open} onClose={() => setOpen(false)} width={240}>
        <div data-combo-hab style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 8, borderBottom: `1px solid ${C.n500}` }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar habitación" aria-label="Buscar habitación para bloquear" autoFocus className="suite-campo"
              style={{ width: '100%', height: 30, border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 8px', fontSize: 12, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div role="listbox" aria-label="Habitaciones disponibles para bloquear" style={{ maxHeight: 240, overflowY: 'auto', padding: 4 }}>
            {visibles.map(x => (
              <button key={x.numero} type="button" role="option" aria-selected={valor === x.numero} onClick={() => { onChange(x.numero); setOpen(false); setQ(''); }}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '7px 8px', border: 'none', borderRadius: radius.control, background: valor === x.numero ? C.brandBg : 'none', fontSize: 12, fontFamily: FONT, cursor: 'pointer', textAlign: 'left' }}>
                <span><b style={{ fontWeight: 600 }}>{x.numero}</b> <span style={{ color: C.n700 }}>{TIPOS.find(t => t.id === x.tipo)?.nombre}</span></span>
                <span style={{ color: x.estado === 'ocupada' || x.estado === 'checkout' ? '#E61A1A' : x.estado === 'libre' ? '#33993A' : '#B45309', fontSize: 11 }}>{x.estado === 'ocupada' ? 'Ocupada' : x.estado === 'checkout' ? 'Sale hoy' : x.estado === 'libre' ? 'Libre' : 'Llega hoy'}</span>
              </button>
            ))}
            {visibles.length === 0 && <p style={{ margin: 0, padding: 10, fontSize: 12, color: C.n700 }}>No hay habitaciones disponibles para ese período.</p>}
          </div>
        </div>
      </Popover>
    </span>
  );
}

/** Fecha en línea con el formato del sistema (dd/mm/aaaa); el selector nativo queda encima, invisible. `vacio` = texto sin fecha (Indefinido). */
function CampoFecha({ valor, min, label, vacio, onChange }: { valor: string; min?: string; label: string; vacio?: string; onChange: (v: string) => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <label className="suite-campo" style={{ position: 'relative', height: 30, width: 128, boxSizing: 'border-box', border: `1px solid ${C.n500}`, borderRadius: radius.control, padding: '0 8px', fontSize: 12, fontFamily: FONT,
        color: valor ? C.n900 : C.n700, background: C.n000, display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        {valor ? fmtF(valor) : vacio ?? 'dd/mm/aaaa'}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
        <input type="date" value={valor} min={min} onChange={e => onChange(e.target.value)} aria-label={label}
          onClick={e => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }} />
      </label>
      {vacio && valor && <button type="button" onClick={() => onChange('')} title="Quitar fecha (indefinido)" aria-label={`Quitar ${label}`} style={{ border: 'none', background: 'none', color: C.n700, cursor: 'pointer', fontSize: 15, padding: '0 2px' }}>×</button>}
    </span>
  );
}
