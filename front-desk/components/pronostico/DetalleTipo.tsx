'use client';
// Detalle del tipo de habitación: Estancias · Fuera de orden · Disponibles ·
// Tarifas. Desde el Pronóstico llega pre-filtrado por fecha y tipo (?tipo=&fecha=).
import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { C, FONT, radius } from '@/components/suite/tokens';
import { StatusBadge } from '@/components/suite/ui';
import { Buscador } from '@/components/configuracion/kit';
import { AccionesEnHeader, FiltrosEnBarra, Pantalla } from '@/components/layout/Pantalla';
import { FechaBoton, FiltroChecks } from '@/components/hotel/ui';
import { useHotel } from '@/components/hotel/store';
import { HOY, TIPOS, contratoDeTarifa, fmtF, tareaAbierta } from '@/components/hotel/datos';
import { CUPOS } from '@/components/hotel/reservas';
import { FiltroUno, HojaSistema, TablaReporte, tdR } from '@/components/facturacion/comun';
import { ExportarReporte, TablaP, Vacio, tdP } from './comun';
import { codigoTipo } from './PronosticoTipo';

const TABS = ['Estancias', 'Fuera de orden', 'Disponibles', 'Tarifas'] as const;
type Tab = (typeof TABS)[number];
const nombreT = (id: string) => TIPOS.find(t => t.id === id)?.nombre ?? id;
const IcOk = ({ on }: { on: boolean }) => <span aria-label={on ? 'Sí' : 'No'} style={{ display: 'inline-flex', width: 16, height: 16, borderRadius: '50%', background: on ? C.brand : C.n500, color: '#fff', fontSize: 10, alignItems: 'center', justifyContent: 'center' }}>✓</span>;

const tipoVisible = (tipos: string[], t: string) => !tipos.length || tipos.includes(t);

export default function DetalleTipo() {
  return <Suspense fallback={null}><Vista /></Suspense>;
}

function Vista() {
  const sp = useSearchParams();
  const router = useRouter();
  const tipo0 = sp.get('tipo');
  const fecha0 = sp.get('fecha') ?? '';
  const [tab, setTab] = useState<Tab>('Estancias');
  // Cada tab arranca con sus filtros (al venir del pronóstico, con tipo y fecha)
  const [k, setK] = useState(0);
  return (
    <Pantalla titulo="Detalle del tipo de habitación" conRanuras
      izquierda={sp.get('desde') === 'pronostico' ? <button type="button" onClick={() => router.push('/pronostico-estadisticas/pronostico-por-tipo-de-hab')} aria-label="Volver al pronóstico"
        style={{ order: -1, border: `1px solid ${C.n500}`, background: C.n000, borderRadius: radius.control, width: 30, height: 30, cursor: 'pointer', fontSize: 16 }}>‹</button> : undefined}
      tabs={{ items: TABS, activo: tab, onChange: t => { setTab(t); setK(x => x + 1); } }}>
      <section style={{ background: C.n000, border: `1px solid ${C.n500}`, borderRadius: radius.card, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT, flex: 1 }}>
        <Contenido key={tab + k} tab={tab} tipoInicial={tipo0 && k === 0 ? [tipo0] : []} fechaInicial={k === 0 ? fecha0 : ''} />
      </section>
    </Pantalla>
  );
}

function Contenido({ tab, tipoInicial, fechaInicial }: { tab: Tab; tipoInicial: string[]; fechaInicial: string }) {
  const h = useHotel();
  const [q, setQ] = useState('');
  const [tipos, setTipos] = useState<string[]>(tipoInicial);
  const [estado, setEstado] = useState('');
  const [entrada, setEntrada] = useState('');
  const [salida, setSalida] = useState('');
  const [desde, setDesde] = useState(fechaInicial);
  const [hasta, setHasta] = useState(fechaInicial);
  const [fecha, setFecha] = useState(fechaInicial);
  const ref = fecha || HOY;

  const estancias = useMemo(() => h.reservas.filter(r => ['In-House', 'Solicitada', 'Confirmada'].includes(r.estado) && tipoVisible(tipos, r.tipo)
    && (!q || r.habitacion.includes(q) || r.numero.toLowerCase().includes(q.toLowerCase()))
    && (!estado || (estado === 'Ocupada' ? r.estado === 'In-House' : r.estado === estado)) && (!entrada || r.entrada === entrada) && (!salida || r.salida === salida)
    && (!fecha || (r.entrada <= fecha && r.salida > fecha))).sort((a, b) => a.entrada.localeCompare(b.entrada)), [h.reservas, tipos, q, estado, entrada, salida, fecha]);
  const bloqueos = useMemo(() => {
    const out: { num: string; tipo: string; desde: string; hasta: string; motivo: string }[] = [];
    h.tareas.forEach(t => { if (t.bloqueo && tareaAbierta(t)) t.bloqueo.habitaciones.forEach(n => out.push({ num: n, tipo: h.habitaciones.find(x => x.numero === n)?.tipo ?? '', desde: t.bloqueo!.inicio, hasta: t.bloqueo!.fin, motivo: t.bloqueo!.motivo || t.tarea })); });
    h.habitaciones.filter(x => x.estado === 'bloqueada' && !out.some(o => o.num === x.numero)).forEach(x => out.push({ num: x.numero, tipo: x.tipo, desde: HOY, hasta: HOY, motivo: x.motivoBloqueo || 'Bloqueada' }));
    return out.filter(b => tipoVisible(tipos, b.tipo) && (!q || b.num.includes(q)) && (!desde || b.hasta >= desde) && (!hasta || b.desde <= hasta)).sort((a, b) => a.num.localeCompare(b.num));
  }, [h.tareas, h.habitaciones, tipos, q, desde, hasta]);
  const disponibles = useMemo(() => h.habitaciones.filter(x => tipoVisible(tipos, x.tipo) && (!q || x.numero.includes(q))
    && !(ref === HOY && (x.estado === 'bloqueada' || x.estado === 'ocupada' || x.estado === 'checkout'))
    && !h.reservas.some(r => r.habitacion === x.numero && (r.estado === 'In-House' || r.estado === 'Confirmada' || r.estado === 'Solicitada') && r.entrada <= ref && r.salida > ref)
    && !h.tareas.some(t => t.bloqueo && tareaAbierta(t) && t.bloqueo.habitaciones.includes(x.numero) && t.bloqueo.inicio <= ref && t.bloqueo.fin >= ref)), [h, tipos, q, ref]);
  const tarifas = useMemo(() => Object.keys(CUPOS).filter(t => !q || t.toLowerCase().includes(q.toLowerCase()) || CUPOS[t].grupo.toLowerCase().includes(q.toLowerCase())).map(t => {
    const c = CUPOS[t];
    const nt = tipos.length || TIPOS.length;
    const rs = h.reservas.filter(r => r.tarifa === t && tipoVisible(tipos, r.tipo) && r.entrada <= ref && r.salida > ref);
    const reservadas = rs.filter(r => r.estado === 'Solicitada' || r.estado === 'Confirmada').length;
    const ocupadas = rs.filter(r => r.estado === 'In-House').length;
    const cupos = c.cupos * nt;
    const cupon = rs.filter(r => r.idExterno).length;
    return { t, grupo: c.grupo, cupos, release: c.release, reservadas, ocupadas, total: reservadas + ocupadas, cupon, libres: cupos - reservadas - ocupadas };
  }), [h.reservas, tipos, q, ref]);

  const filtroTipo = <FiltroChecks label="Tipo de habitación" value={tipos} onChange={setTipos} opciones={TIPOS.map(t => ({ value: t.id, label: `${codigoTipo(t.id)} · ${t.nombre}` }))} />;
  const chipFecha = fecha && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.brand, background: C.brandBg, border: `1px solid ${C.brandBd}`, borderRadius: radius.pill, padding: '4px 10px' }}>Fecha: {fmtF(fecha)}<button type="button" aria-label="Quitar fecha" onClick={() => setFecha('')} style={{ border: 'none', background: 'none', color: C.brand, cursor: 'pointer', padding: 0 }}>✕</button></span>;

  let headers: string[] = [], filas: (string | number)[][] = [], tabla: React.ReactNode = null, filtros: React.ReactNode = null;
  if (tab === 'Estancias') {
    headers = ['Número', 'Estado', 'Tipo de hab.', 'Tarifa', 'Nombre', 'Hab', 'Entrada', 'Salida', 'VIP', 'Dep. Gar.'];
    filas = estancias.map(r => [r.numero, r.estado === 'In-House' ? 'Ocupada' : r.estado, nombreT(r.tipo), r.tarifa, r.nombre, r.habitacion || '—', fmtF(r.entrada), fmtF(r.salida), r.vip ? 'Sí' : 'No', r.depGarantia > 0 ? 'Sí' : 'No']);
    filtros = <><div style={{ width: 200 }}><Buscador value={q} onChange={setQ} placeholder="Buscar por número" /></div>
      <FiltroUno label="Estado" value={estado} onChange={setEstado} opciones={['Ocupada', 'Solicitada', 'Confirmada'].map(e => ({ value: e, label: e }))} />{filtroTipo}
      <FechaBoton label="Fecha de entrada" value={entrada} onChange={setEntrada} /><FechaBoton label="Fecha de salida" value={salida} onChange={setSalida} />{chipFecha}</>;
    tabla = <TablaP headers={headers} alto="calc(100vh - 330px)">
      {!estancias.length && <Vacio cols={10} />}
      {estancias.map(r => (
        <tr key={r.id} className="suite-fila">
          <td style={tdP()}><Link href={`/reservaciones/reservas?id=${r.id}`} style={{ color: C.brand }}>{r.numero}</Link></td>
          <td style={tdP()}><StatusBadge label={r.estado === 'In-House' ? 'Ocupada' : r.estado} color={r.estado === 'In-House' ? 'red' : r.estado === 'Solicitada' ? 'yellow' : 'green'} /></td>
          <td style={tdP()}>{nombreT(r.tipo)}</td><td style={tdP()}>{r.tarifa}</td><td style={tdP()}>{r.nombre}</td><td style={tdP()}>{r.habitacion || '—'}</td><td style={tdP()}>{fmtF(r.entrada)}</td><td style={tdP()}>{fmtF(r.salida)}</td>
          <td style={tdP()}><IcOk on={r.vip} /></td><td style={tdP()}><IcOk on={r.depGarantia > 0} /></td>
        </tr>
      ))}
    </TablaP>;
  } else if (tab === 'Fuera de orden') {
    headers = ['Número', 'Desde', 'Hasta', 'Motivo'];
    filas = bloqueos.map(b => [b.num, fmtF(b.desde), fmtF(b.hasta), b.motivo]);
    filtros = <><div style={{ width: 200 }}><Buscador value={q} onChange={setQ} placeholder="Buscar por número" /></div>{filtroTipo}<FechaBoton label="Fecha desde" value={desde} onChange={setDesde} /><FechaBoton label="Fecha hasta" value={hasta} onChange={setHasta} /></>;
    tabla = <TablaP headers={headers} alto="calc(100vh - 330px)">{!bloqueos.length && <Vacio cols={4} />}{bloqueos.map((b, i) => <tr key={i} className="suite-fila"><td style={tdP()}>{b.num}</td><td style={tdP()}>{fmtF(b.desde)}</td><td style={tdP()}>{fmtF(b.hasta)}</td><td style={tdP()}>{b.motivo}</td></tr>)}</TablaP>;
  } else if (tab === 'Disponibles') {
    headers = ['Número', 'Estado', 'Tipo de habitación', 'Descripción'];
    filas = disponibles.map(x => [x.numero, x.sucia ? 'Sucia' : 'Limpia', codigoTipo(x.tipo), nombreT(x.tipo).toUpperCase()]);
    filtros = <><div style={{ width: 200 }}><Buscador value={q} onChange={setQ} placeholder="Buscar por número" /></div>{filtroTipo}{chipFecha || <span style={{ fontSize: 12, color: C.n700 }}>Disponibles hoy ({fmtF(HOY)})</span>}</>;
    tabla = <TablaP headers={headers} alto="calc(100vh - 330px)">{!disponibles.length && <Vacio cols={4} />}{disponibles.map(x => <tr key={x.numero} className="suite-fila"><td style={tdP()}>{x.numero}</td><td style={tdP()}>{x.sucia ? <StatusBadge label="Sucia" color="red" /> : ''}</td><td style={tdP()}>{codigoTipo(x.tipo)}</td><td style={tdP()}>{nombreT(x.tipo).toUpperCase()}</td></tr>)}</TablaP>;
  } else {
    headers = ['Empresa', 'Tarifa', 'Cupos', 'Release', 'Reservadas', 'Ocupadas', 'Total (Res+Ocup)', 'Total Cupón', 'Libres'];
    filas = tarifas.map(x => [x.grupo, `${x.t} · ${contratoDeTarifa(x.t)}`, x.cupos, x.release, x.reservadas, x.ocupadas, x.total, x.cupon, x.libres]);
    filtros = <><div style={{ width: 220 }}><Buscador value={q} onChange={setQ} placeholder="Buscar por empresa o tarifa" /></div>{filtroTipo}{chipFecha || <span style={{ fontSize: 12, color: C.n700 }}>Para el {fmtF(HOY)}</span>}</>;
    tabla = <TablaP headers={headers} derecha={[2, 3, 4, 5, 6, 7, 8]} alto="calc(100vh - 330px)">{!tarifas.length && <Vacio cols={9} />}{tarifas.map(x => (
      <tr key={x.t} className="suite-fila"><td style={tdP()}>{x.grupo}</td><td style={tdP()}>{x.t} <span style={{ color: C.n700 }}>· {contratoDeTarifa(x.t)}</span></td><td style={tdP(true)}>{x.cupos}</td><td style={tdP(true)}>{x.release}</td><td style={tdP(true)}>{x.reservadas}</td><td style={tdP(true)}>{x.ocupadas}</td>
        <td style={tdP(true, { fontWeight: 600, color: x.cupos > 0 && x.total > x.cupos ? C.error : C.n900 })}>{x.total}</td><td style={tdP(true)}>{x.cupon}</td><td style={tdP(true, { color: x.libres < 0 ? C.error : C.n900 })}>{x.cupos ? x.libres : '—'}</td></tr>))}</TablaP>;
  }
  const criterio = `${tipos.length ? `Tipo: ${tipos.join(', ')}` : 'Todos los tipos'}${fecha ? ` · Fecha: ${fmtF(fecha)}` : ''}`;
  return (
    <>
      <FiltrosEnBarra>{filtros}</FiltrosEnBarra>
      <AccionesEnHeader><ExportarReporte disabled={!filas.length} datos={() => ({ nombre: `detalle-tipo-${tab.toLowerCase().replace(/\s/g, '-')}`, titulo: `Detalle del tipo de habitación · ${tab}`, criterio, headers, filas })}
          pdf={<HojaSistema titulo="Detalle del tipo de habitación" subtitulo={tab} criterio={criterio}><TablaReporte headers={headers}>{filas.map((f, i) => <tr key={i}>{f.map((c, j) => <td key={j} style={tdR(typeof c === 'number')}>{c}</td>)}</tr>)}</TablaReporte></HojaSistema>} /></AccionesEnHeader>
      {tabla}
      {tab === 'Tarifas' && <span style={{ fontSize: 11.5, color: C.n700 }}>Cupos y release por contrato (Configuración › Tarifas / Contratos). «Total (Res+Ocup)» en rojo indica overbooking contractual. Fecha de referencia: {fmtF(ref)}.</span>}
    </>
  );
}
