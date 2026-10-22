'use client';
// Asignación de habitaciones: reservas por rango de fechas (con o sin
// habitación) y preasignaciones de habitaciones a futuro.
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button, Checkbox, Input, Toast } from '@/components/suite/ui';
import { IcPlus } from '@/components/suite/icons';
import { Celda, Fila, FilaVacia, IcTrash, Tabla } from '@/components/configuracion/kit';
import { Alerta, FechaBoton, exportarCSV, usePrint } from '@/components/hotel/ui';
import { CheckFila, CheckTodos, useSeleccion } from '@/components/layout/Pantalla';
import { useHotel, nuevoId } from '@/components/hotel/store';
import { HOY, fmtF, sumarDias, type Reserva } from '@/components/hotel/datos';
import { bloqueaHabitacion, habitacionLibre, numeroDe, usoDe, type Preasignacion } from '@/components/hotel/reservas';
import { fmtMon } from '@/components/hotel/finanzas';
import { Exportar, HojaSistema, PaginaFact, TablaReporte, Tarjeta, tdR } from '@/components/facturacion/comun';
import { DisponibilidadCupos, SeleccionHabitacion } from './comun';
import { MontoCelda } from '@/components/suite/Monto';

const TABS = ['Asignación de habitación', 'Preasignación de habitación'] as const;

export default function Asignacion() {
  const h = useHotel();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Asignación de habitación');
  const [desde, setDesde] = useState(HOY);
  const [hasta, setHasta] = useState(sumarDias(HOY, 30));
  const [sinHab, setSinHab] = useState(true);
  const [asignar, setAsignar] = useState<Reserva | null>(null);
  const [disp, setDisp] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const filas = useMemo(() => h.reservas.filter(r => (bloqueaHabitacion(r) || r.estado === 'Lista de espera') && r.estado !== 'In-House' && r.entrada >= desde && (!hasta || r.entrada <= hasta) && (!sinHab || !r.habitacion))
    .sort((a, b) => a.entrada.localeCompare(b.entrada) || a.numero.localeCompare(b.numero)), [h.reservas, desde, hasta, sinHab]);
  const nombre = (r: Reserva) => h.perfiles.find(p => p.id === r.perfilId)?.nombre ?? r.nombre;
  const pendientes = h.reservas.filter(r => bloqueaHabitacion(r) && r.estado !== 'In-House' && !r.habitacion && r.entrada >= HOY).length;
  const s = useSeleccion();
  const [autoConfirmar, setAutoConfirmar] = useState(false);
  const { imprimir, portal } = usePrint();
  const elegidas = filas.filter(r => s.tiene(r.id) && !r.habitacion && r.estado !== 'Lista de espera');
  const esAsig = tab === 'Asignación de habitación';
  const preas = [...h.preasignaciones].filter(p => p.hasta >= desde && (!hasta || p.desde <= hasta)).sort((a, b) => a.desde.localeCompare(b.desde));
  /** Asigna la primera habitación libre del mismo tipo a cada reserva elegida (sin repetir dentro del lote). */
  const autoAsignar = () => {
    const tomadas: { num: string; entrada: string; salida: string }[] = [];
    let ok = 0;
    elegidas.forEach(r => {
      const hab = h.habitaciones.find(x => x.tipo === r.tipo && x.estado !== 'bloqueada' && habitacionLibre(h.reservas, x.numero, r.entrada, r.salida, [r.id])
        && !tomadas.some(t => t.num === x.numero && t.entrada < r.salida && t.salida > r.entrada));
      if (hab) { h.asignarHabitacion(r.id, hab.numero); tomadas.push({ num: hab.numero, entrada: r.entrada, salida: r.salida }); ok++; }
    });
    setAutoConfirmar(false); s.limpiar();
    setToast(ok === elegidas.length ? `${ok} habitaciones asignadas automáticamente` : `${ok} de ${elegidas.length} reservas asignadas · el resto no tiene habitación libre de su tipo`);
  };
  const cab = ['Número', 'Entrada', 'Salida', 'Nombre', 'Estado', 'Tipo', 'Pax', 'Precio', 'Moneda', 'Habitación'];
  const csv = () => esAsig
    ? exportarCSV('asignacion-habitaciones', cab, filas.map(r => [r.numero, fmtF(r.entrada), fmtF(r.salida), nombre(r), r.estado, `${r.tipo}_${usoDe(r)}`, r.adultos + r.ninos, r.precio, r.moneda, r.habitacion || 'Sin asignar']))
    : exportarCSV('preasignaciones', ['Habitación', 'Desde', 'Hasta', 'Descripción'], preas.map(p => [p.habitacion, fmtF(p.desde), fmtF(p.hasta), p.descripcion]));
  const pdf = () => imprimir(esAsig
    ? <HojaSistema titulo="Asignación de habitaciones" criterio={`Entrada del ${fmtF(desde)} al ${fmtF(hasta)}${sinHab ? ' · Solo sin habitación' : ''}`}><TablaReporte headers={cab} derecha={[6, 7]}>{filas.map(r => <tr key={r.id}><td style={tdR()}>{r.numero}</td><td style={tdR()}>{fmtF(r.entrada)}</td><td style={tdR()}>{fmtF(r.salida)}</td><td style={tdR()}>{nombre(r)}</td><td style={tdR()}>{r.estado}</td><td style={tdR()}>{r.tipo}_{usoDe(r)}</td><td style={tdR(true)}>{r.adultos + r.ninos}</td><td style={tdR(true)}><MontoCelda texto={fmtMon(r.precio, r.moneda)} /></td><td style={tdR()}>{r.moneda}</td><td style={tdR()}>{r.habitacion || 'Sin asignar'}</td></tr>)}</TablaReporte></HojaSistema>
    : <HojaSistema titulo="Preasignaciones de habitación"><TablaReporte headers={['Habitación', 'Desde', 'Hasta', 'Descripción']}>{preas.map(p => <tr key={p.id}><td style={tdR()}>{p.habitacion}</td><td style={tdR()}>{fmtF(p.desde)}</td><td style={tdR()}>{fmtF(p.hasta)}</td><td style={tdR()}>{p.descripcion || '—'}</td></tr>)}</TablaReporte></HojaSistema>);
  return (
    <PaginaFact titulo="Asignación de habitaciones" acciones={<>
      <Button variant="secondary" onClick={() => setDisp(true)}>Ver disponibilidad</Button>
      <Exportar onCSV={csv} onPDF={pdf} disabled={esAsig ? !filas.length : !preas.length} />
    </>}
      tabs={{ items: TABS, activo: tab, onChange: t => { setTab(t); s.limpiar(); } }}
      filtros={<>
        <FechaBoton label="Fecha de entrada" value={desde} onChange={v => setDesde(v || HOY)} />
        <FechaBoton label="Fecha de salida" value={hasta} min={desde} onChange={setHasta} />
        {esAsig && <Checkbox checked={sinHab} onChange={setSinHab} label="Sin habitación asignada" />}
      </>}
      filtrosDerecha={<span style={{ fontSize: 12, color: pendientes ? '#B58900' : '#2E7D32' }}>{pendientes ? `${pendientes} reservas futuras sin habitación` : 'Todas las reservas futuras tienen habitación'}</span>}
      seleccion={esAsig ? { n: s.n, onLimpiar: s.limpiar, etiqueta: s.n === 1 ? 'seleccionada' : 'seleccionadas', acciones: <Button variant="secondary" disabled={!elegidas.length} onClick={() => setAutoConfirmar(true)}>Asignar automáticamente ({elegidas.length})</Button> } : undefined}>
      <Tarjeta>
        {esAsig ? (
          <Tabla headers={[<CheckTodos key="t" s={s} ids={filas.map(r => r.id)} />, 'Número', 'Entrada', 'Salida', 'Nombre', 'Uso', 'Cantidad', 'Pax', 'Precio', 'Hab.']} alinearDerecha={[6, 7, 8]} minWidth={900}>
            {!filas.length && <FilaVacia cols={10} texto={sinHab ? 'No hay reservas sin habitación asignada en el rango de fechas.' : 'No hay reservas en el rango de fechas.'} />}
            {filas.map(r => (
              <Fila key={r.id}>
                <Celda style={{ width: 28 }}><CheckFila s={s} id={r.id} label={`Seleccionar ${r.numero}`} /></Celda>
                <Celda><Link href={`/reservaciones/reservas?id=${r.id}`} style={{ color: C.brand }}>{r.numero}</Link></Celda><Celda>{fmtF(r.entrada)}</Celda><Celda>{fmtF(r.salida)}</Celda>
                <Celda>{nombre(r)}{r.estado !== 'Confirmada' && <span style={{ fontSize: 11, color: C.n700 }}> · {r.estado}</span>}</Celda><Celda>{r.tipo}_{usoDe(r)}</Celda><Celda derecha>1</Celda><Celda derecha>{r.adultos + r.ninos}</Celda>
                <Celda derecha><MontoCelda texto={fmtMon(r.precio, r.moneda)} /></Celda>
                <Celda>{r.habitacion
                  ? <button type="button" onClick={() => setAsignar(r)} title="Cambiar habitación" style={{ border: 'none', background: 'none', padding: 0, color: C.n900, textDecoration: 'underline', cursor: 'pointer', fontFamily: FONT, fontSize: 12 }}>{r.habitacion}</button>
                  : <button type="button" onClick={() => setAsignar(r)} disabled={r.estado === 'Lista de espera'} style={{ border: 'none', background: 'none', padding: 0, color: r.estado === 'Lista de espera' ? C.n700 : C.brand, textDecoration: 'underline', cursor: 'pointer', fontFamily: FONT, fontSize: 12, fontWeight: 500 }}>Asignar</button>}</Celda>
              </Fila>
            ))}
          </Tabla>
        ) : <Preasignaciones lista={preas} onToast={setToast} />}
      </Tarjeta>
      {asignar && <SeleccionHabitacion tipo={asignar.tipo} entrada={asignar.entrada} salida={asignar.salida} ignorar={[asignar.id]} actual={asignar.habitacion} onClose={() => setAsignar(null)}
        onElegir={num => { h.asignarHabitacion(asignar.id, num); setToast(`Habitación ${num} asignada a la reserva ${numeroDe(asignar)}`); setAsignar(null); }} />}
      {disp && <DisponibilidadCupos onClose={() => setDisp(false)} desde={desde} />}
      <Alerta open={autoConfirmar} titulo={`¿Asignar habitación a ${elegidas.length} reservas?`} confirmar="Asignar" onClose={() => setAutoConfirmar(false)} onConfirm={autoAsignar}>
        Se asignará a cada reserva la primera habitación libre de su tipo para todas sus noches. Podrás cambiarla después desde la tabla.
      </Alerta>
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      {portal}
    </PaginaFact>
  );
}

function Preasignaciones({ lista, onToast }: { lista: Preasignacion[]; onToast: (t: string) => void }) {
  const h = useHotel();
  const [nueva, setNueva] = useState<Preasignacion | null>(null);
  const [elegir, setElegir] = useState(false);
  const [quitar, setQuitar] = useState<Preasignacion | null>(null);
  const [error, setError] = useState('');
  const guardar = () => {
    if (!nueva) return;
    if (!nueva.habitacion) return setError('Asigna la habitación.');
    if (!nueva.desde || !nueva.hasta || nueva.hasta < nueva.desde) return setError('Indica un rango de fechas válido.');
    if (h.preasignaciones.some(p => p.habitacion === nueva.habitacion && p.desde <= nueva.hasta && p.hasta >= nueva.desde)) return setError(`La ${nueva.habitacion} ya tiene una preasignación en esas fechas.`);
    h.guardarPreasignacion({ ...nueva, descripcion: nueva.descripcion.trim() });
    onToast(`Habitación ${nueva.habitacion} preasignada`); setNueva(null); setError('');
  };
  const inp = { height: 30, border: `1px solid ${C.n500}`, borderRadius: radius.control, fontSize: 12, fontFamily: FONT, padding: '0 6px' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Tabla headers={['Hab.', 'Desde', 'Hasta', 'Descripción', '']}>
        {!lista.length && !nueva && <FilaVacia cols={5} texto="No hay habitaciones preasignadas en el rango de fechas." />}
        {lista.map(p => (
          <Fila key={p.id}><Celda style={{ fontWeight: 500 }}>{p.habitacion}</Celda><Celda>{fmtF(p.desde)}</Celda><Celda>{fmtF(p.hasta)}</Celda><Celda>{p.descripcion || '—'}</Celda>
            <Celda derecha><button type="button" aria-label={`Quitar preasignación ${p.habitacion}`} onClick={() => setQuitar(p)} style={{ border: 'none', background: 'none', color: C.error, cursor: 'pointer' }}><IcTrash /></button></Celda></Fila>
        ))}
        {nueva && (
          <Fila>
            <Celda><button type="button" onClick={() => setElegir(true)} style={{ border: 'none', background: 'none', padding: 0, color: C.brand, textDecoration: 'underline', cursor: 'pointer', fontFamily: FONT, fontSize: 12 }}>{nueva.habitacion || 'Asignar'}</button></Celda>
            <Celda><input type="date" value={nueva.desde} min={HOY} aria-label="Desde" onChange={e => setNueva({ ...nueva, desde: e.target.value, habitacion: '' })} className="suite-campo" style={inp} /></Celda>
            <Celda><input type="date" value={nueva.hasta} min={nueva.desde} aria-label="Hasta" onChange={e => setNueva({ ...nueva, hasta: e.target.value, habitacion: '' })} className="suite-campo" style={inp} /></Celda>
            <Celda><Input value={nueva.descripcion} onChange={v => setNueva({ ...nueva, descripcion: v })} placeholder="Ingresa una descripción" /></Celda>
            <Celda derecha><span style={{ display: 'inline-flex', gap: 6 }}><Button variant="secondary" onClick={() => { setNueva(null); setError(''); }}>Cancelar</Button><Button onClick={guardar}>Guardar</Button></span></Celda>
          </Fila>
        )}
      </Tabla>
      {error && <span role="alert" style={{ fontSize: 12, color: C.error }}>{error}</span>}
      {!nueva && <span><Button variant="secondary" icon={<IcPlus size={12} />} style={{ color: C.brand, borderColor: C.brandBd }} onClick={() => setNueva({ id: nuevoId('pa'), habitacion: '', desde: sumarDias(HOY, 1), hasta: sumarDias(HOY, 3), descripcion: '' })}>Preasignar habitación</Button></span>}
      <p style={{ margin: 0, fontSize: 11.5, color: C.n700 }}>La preasignación reserva la habitación para un huésped o grupo sin crear la reserva; el Planificador la muestra con borde punteado.</p>
      {elegir && nueva && <SeleccionHabitacion entrada={nueva.desde} salida={sumarDias(nueva.hasta, 1)} actual={nueva.habitacion} onClose={() => setElegir(false)} onElegir={num => { setNueva({ ...nueva, habitacion: num }); setElegir(false); }} />}
      {quitar && <Alerta open titulo={`¿Quitar la preasignación de la ${quitar.habitacion}?`} tono="danger" onClose={() => setQuitar(null)} confirmar="Quitar" onConfirm={() => { h.quitarPreasignacion(quitar.id); onToast('Preasignación eliminada'); setQuitar(null); }} />}
    </div>
  );
}
