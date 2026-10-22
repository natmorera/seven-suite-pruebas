'use client';
// Reportes de Hospedaje con el reporte estándar de la plataforma: tabla en
// pantalla (filtros inmediatos, chips, contadores, total y paginación) y
// documento al imprimir / exportar.
import Link from 'next/link';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { C, FONT, fmtNum } from '@/components/suite/tokens';
import { Button, Input, Modal, Select, Toast } from '@/components/suite/ui';
import { Campo, norm } from '@/components/configuracion/kit';
import { useHotel, saldoReserva } from '@/components/hotel/store';
import { HOY, NACIONALIDADES, REGIMENES, TIPOS, fmtF, type Reserva } from '@/components/hotel/datos';
import { cuentaOcupacion } from '@/components/hotel/reservas';
import { money, usePrint } from '@/components/hotel/ui';
import { PantallaReporte } from '@/components/reportes/Reporte';
import { IndiceReportes } from '@/components/reportes/Indice';
import { cols, tabla, type FilaRep } from '@/components/reportes/modelo';
import { useFiltros, type DefFiltro } from '@/components/reportes/filtros';

/** Estancias activas en una fecha (excluye canceladas). */
const enCasa = (rs: Reserva[], d: string) => rs.filter(r => cuentaOcupacion(r) && r.habitacion && r.entrada <= d && (r.salida > d || (r.salida === d && r.estado === 'In-House')));
const nombreTipo = (id: string) => TIPOS.find(t => t.id === id)?.nombre ?? id;
const titulo = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, x => x.toUpperCase());
const en = (v: string, [d, h]: [string, string]) => (!d || v >= d) && (!h || v <= h);
const periodoDe = ([d, h]: [string, string]) => (d || h ? `${d ? fmtF(d) : '…'} al ${h ? fmtF(h) : '…'}` : undefined);

// ── Pantalla única de reportes de Hospedaje ─────────────────────────────────
// Como en toda la plataforma: el menú «Reportes» abre el índice de reportes del módulo; cada reporte se abre
// con ?r= y desde ahí se cambia con el selector del título o se vuelve al índice.
const REPS = [
  { id: 'sin-perfiles', label: 'Registros sin perfiles', descripcion: 'Estancias registradas sin perfil de huésped asociado, para completarlas.' },
  { id: 'ocupacion', label: 'Listado de ocupación', descripcion: 'Habitaciones ocupadas en una fecha hotelera, por habitación, huésped o empresa.' },
  { id: 'nacionalidades', label: 'Ocupación por nacionalidades', descripcion: 'Habitaciones y huéspedes en casa agrupados por nacionalidad.' },
  { id: 'saldos', label: 'Saldos en el pick', descripcion: 'Cuentas con saldo pendiente de huéspedes en casa y folios externos.' },
  { id: 'etiquetas', label: 'Etiquetas de facturas de clientes', descripcion: 'Etiquetas de saldo para entregar a los huéspedes con factura pendiente.' },
] as const;
const RUTA = '/hospedaje/reportes';
type Rep = (typeof REPS)[number]['id'];
export function ReportesHospedaje() {
  return <Suspense fallback={null}><ReportesHospedajePantalla /></Suspense>;
}
function ReportesHospedajePantalla() {
  const sp = useSearchParams();
  const router = useRouter();
  const r = sp.get('r');
  if (!REPS.some(x => x.id === r)) return <IndiceReportes titulo="Reportes de hospedaje" grupos={[
    { titulo: 'Ocupación', items: REPS.filter(x => ['ocupacion', 'nacionalidades', 'sin-perfiles'].includes(x.id)).map(x => ({ label: x.label, descripcion: x.descripcion, href: `${RUTA}?r=${x.id}` })) },
    { titulo: 'Saldos y facturación', items: REPS.filter(x => ['saldos', 'etiquetas'].includes(x.id)).map(x => ({ label: x.label, descripcion: x.descripcion, href: `${RUTA}?r=${x.id}` })) },
  ]} />;
  const rep = r as Rep;
  const onCambiar = (id: string) => router.replace(`${RUTA}?r=${id}`);
  const sel = { lista: REPS, actual: rep, onCambiar, volver: RUTA };
  if (rep === 'ocupacion') return <ListadoOcupacion sel={sel} />;
  if (rep === 'saldos') return <Saldos sel={sel} />;
  if (rep === 'etiquetas') return <Etiquetas sel={sel} />;
  if (rep === 'nacionalidades') return <Nacionalidades sel={sel} />;
  return <RegistrosSinPerfiles sel={sel} />;
}
type Sel = { lista: typeof REPS; actual: Rep; onCambiar: (id: string) => void; volver: string };

// ── Registros sin perfiles ──────────────────────────────────────────────────
const DEFS_RSP: DefFiltro[] = [
  { k: 'q', tipo: 'busqueda', placeholder: 'Buscar por número, nombre o empresa' },
  { k: 'entrada', tipo: 'rango', label: 'Entrada' },
  { k: 'salida', tipo: 'rango', label: 'Salida' },
  { k: 'estado', tipo: 'multi', label: 'Estado', opciones: ['In-House', 'Completada', 'No-Show'].map(x => ({ value: x, label: x === 'In-House' ? 'En casa' : x })) },
  { k: 'cliente', tipo: 'multi', label: 'Cliente', opciones: ['Huésped Individual', 'Tarifa Corporativa', 'Agencia de Viajes'].map(x => ({ value: x, label: x })) },
];
function RegistrosSinPerfiles({ sel }: { sel: Sel }) {
  const h = useHotel();
  const f = useFiltros(DEFS_RSP);
  const [vincular, setVincular] = useState<Reserva | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const rs = useMemo(() => h.reservas.filter(r => !r.perfilId && r.checkinEn && r.estado !== 'Anulada'
    && en(r.entrada, f.r('entrada')) && en(r.salida, f.r('salida'))
    && (!f.m('estado').length || f.m('estado').includes(r.estado)) && (!f.m('cliente').length || f.m('cliente').includes(r.cliente))
    && (!f.s('q') || norm(`${r.numero} ${r.nombre} ${r.empresa}`).includes(norm(f.s('q'))))).sort((a, b) => a.numero.localeCompare(b.numero)), [h.reservas, f]);
  const filas: FilaRep[] = rs.map(r => ({ id: r.id, c: [r.numero, r.estado === 'In-House' ? 'En casa' : r.estado, titulo(r.nombre), fmtF(r.entrada), fmtF(r.salida), 'Sin perfil', r.cliente, r.empresa || '—'],
    accion: <Button variant="secondary" onClick={() => setVincular(r)} style={{ height: 28, color: C.brand, borderColor: C.brandBd }}>Vincular perfil</Button> }));
  return <>
    <PantallaReporte titulo="Registros sin perfiles" reportes={sel} archivo="registros-sin-perfiles" filtros={f} periodo={periodoDe(f.r('entrada'))}
      contadores={[{ valor: rs.length, label: 'Registros' }, { valor: rs.filter(r => r.estado === 'In-House').length, label: 'En casa' }, { valor: rs.filter(r => r.estado === 'Completada').length, label: 'Completadas' }, { valor: new Set(rs.map(r => r.empresa).filter(Boolean)).size, label: 'Empresas' }]}
      datos={tabla(['Número', 'Estado', 'Nombre', 'Entrada', 'Salida', 'Perfil', 'Cliente', 'Empresa'], filas, ['Total', `${rs.length} registros`, '', '', '', '', '', ''])}
      vacio="Todos los check-ins tienen perfil asociado." />
    {vincular && <VincularPerfil r={vincular} onClose={() => setVincular(null)} onListo={t => { setVincular(null); setToast(t); }} />}
    {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
  </>;
}
function VincularPerfil({ r, onClose, onListo }: { r: Reserva; onClose: () => void; onListo: (t: string) => void }) {
  const h = useHotel();
  const [id, setId] = useState('');
  const sugeridos = h.perfiles.filter(p => p.tipo === 'cliente').sort((a, b) => (b.nombre.toUpperCase() === r.nombre ? 1 : 0) - (a.nombre.toUpperCase() === r.nombre ? 1 : 0) || a.nombre.localeCompare(b.nombre));
  return (
    <Modal open onClose={onClose} title={`Vincular perfil · ${r.numero}`} width={460}
      footer={<><Link href="/hospedaje/perfiles" style={{ marginRight: 'auto', fontSize: 12, color: C.brand, alignSelf: 'center' }}>Crear perfil nuevo</Link><Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button disabled={!id} onClick={() => { h.vincularPerfil(r.id, id); onListo(`Perfil vinculado a ${r.numero}`); }}>Vincular</Button></>}>
      <Campo label={`Perfil para ${titulo(r.nombre)}`}><Select value={id} onChange={setId} options={[{ value: '', label: 'Selecciona un perfil' }, ...sugeridos.map(p => ({ value: p.id, label: p.nombre }))]} /></Campo>
    </Modal>
  );
}

// ── Listado de ocupación ────────────────────────────────────────────────────
const LISTADOS = [{ value: 'hab', label: 'Habitaciones' }, { value: 'cli', label: 'Clientes' }, { value: 'nac', label: 'Nacionalidad' }, { value: 'reg', label: 'Régimen' }];
const DEFS_OC: DefFiltro[] = [
  { k: 'q', tipo: 'busqueda', placeholder: 'Buscar habitación o cliente' },
  { k: 'fecha', tipo: 'fecha', label: 'Fecha hotelera', def: HOY },
  { k: 'listado', tipo: 'unico', label: 'Listado', opciones: LISTADOS, def: 'hab' },
  { k: 'orden', tipo: 'unico', label: 'Ordenar por', opciones: ['Habitación', 'Nombre', 'Fecha de entrada', 'Fecha de salida'].map(x => ({ value: x, label: x })), def: 'Habitación' },
  { k: 'tipo', tipo: 'multi', label: 'Tipo de habitación', opciones: TIPOS.map(t => ({ value: t.id, label: t.nombre })) },
  { k: 'vacias', tipo: 'check', label: 'Incluir habitaciones libres' },
  { k: 'precio', tipo: 'toggle', label: 'Mostrar precio' },
  { k: 'agrupar', tipo: 'toggle', label: 'Agrupar' },
];
function ListadoOcupacion({ sel }: { sel: Sel }) {
  const h = useHotel();
  const f = useFiltros(DEFS_OC);
  const fecha = f.s('fecha') || HOY;
  const listado = f.s('listado');
  const precio = f.b('precio');
  const agrupar = f.b('agrupar');
  const q = norm(f.s('q'));
  const tipos = f.m('tipo');
  const estancias = useMemo(() => enCasa(h.reservas, fecha).filter(r => !tipos.length || tipos.includes(h.habitaciones.find(x => x.numero === r.habitacion)?.tipo ?? r.tipo)), [h.reservas, h.habitaciones, fecha, tipos]);
  const clientes = useMemo(() => estancias.flatMap(r => [{ r, nombre: r.nombre, nac: r.nacionalidad, id: r.identificacion, principal: true },
    ...r.adicionales.map(a => ({ r, nombre: a.nombre.toUpperCase(), nac: a.nacionalidad || r.nacionalidad, id: a.identificacion, principal: false }))])
    .filter(c => !q || norm(`${c.nombre} ${c.r.habitacion}`).includes(q)), [estancias, q]);
  const orden = f.s('orden');
  const cmp = useCallback((a: { r?: Reserva; nombre: string; hab: string }, b: typeof a) => orden === 'Fecha de entrada' ? (a.r?.entrada ?? '9').localeCompare(b.r?.entrada ?? '9') : orden === 'Fecha de salida' ? (a.r?.salida ?? '9').localeCompare(b.r?.salida ?? '9')
    : orden === 'Nombre' ? a.nombre.localeCompare(b.nombre) : a.hab.localeCompare(b.hab, 'es', { numeric: true }), [orden]);
  const pr = useCallback((r?: Reserva, principal = true) => (precio ? [r && principal ? `${fmtNum(r.precio)} ${r.moneda}` : ''] : []), [precio]);

  const datos = useMemo(() => {
    const agrupado = <T,>(xs: T[], clave: (x: T) => string, etiqueta: (k: string, ys: T[]) => string, fila: (x: T) => FilaRep): FilaRep[] => {
      if (!agrupar) return xs.map(fila);
      return [...new Set(xs.map(clave))].sort().flatMap(k => { const ys = xs.filter(x => clave(x) === k); return [{ tipo: 'grupo' as const, texto: etiqueta(k, ys) }, ...ys.map(fila)]; });
    };
    if (listado === 'hab') {
      const hs = h.habitaciones.filter(x => !tipos.length || tipos.includes(x.tipo)).map(x => ({ x, r: estancias.find(e => e.habitacion === x.numero) }))
        .filter(o => (f.b('vacias') || o.r) && (!q || norm(`${o.x.numero} ${o.r?.nombre ?? ''}`).includes(q)))
        .map(o => ({ ...o, nombre: o.r?.nombre ?? '', hab: o.x.numero })).sort(cmp);
      const fila = (o: (typeof hs)[number]): FilaRep => ({ id: o.x.numero, tenue: !o.r, c: [o.x.numero, nombreTipo(o.x.tipo), o.r ? titulo(o.r.nombre) : o.x.estado === 'bloqueada' ? `Bloqueada: ${o.x.motivoBloqueo}` : 'Libre', o.r ? o.r.adultos + o.r.ninos : '', ...pr(o.r), o.r?.regimen ?? '', fmtF(o.r?.entrada), fmtF(o.r?.salida), o.r ? [o.r.observaciones, ...o.r.condiciones].filter(Boolean).join(' · ') : ''] });
      const c = cols(['Hab.', 'Tipo', 'Cliente', 'Pax', ...(precio ? ['Precio'] : []), 'Régimen', 'Entrada', 'Salida', 'Observaciones'], precio ? [3, 4] : [3]);
      const ocup = hs.filter(o => o.r);
      return tabla(c, agrupado(hs, o => nombreTipo(o.x.tipo), (k, ys) => `${k} · ${ys.filter(o => o.r).length} de ${ys.length} ocupadas`, fila),
        ['Total', '', `${ocup.length} ocupadas`, ocup.reduce((s, o) => s + o.r!.adultos + o.r!.ninos, 0), ...(precio ? [''] : []), '', '', '', '']);
    }
    if (listado === 'cli' || listado === 'nac') {
      const xs = clientes.map(cl => ({ ...cl, hab: cl.r.habitacion })).sort(cmp);
      const fila = (cl: (typeof xs)[number]): FilaRep => ({ c: [titulo(cl.nombre), NACIONALIDADES[cl.nac] ?? cl.nac, cl.id || '—', cl.r.habitacion, cl.principal ? cl.r.adultos + cl.r.ninos : '', cl.r.tarifa, fmtF(cl.r.entrada), fmtF(cl.r.salida), cl.r.regimen, cl.principal && cl.r.vip ? 'VIP' : '', ...pr(cl.r, cl.principal)] });
      const c = cols(['Nombre', 'Nacionalidad', 'Identificación', 'Hab.', 'Pax', 'Tarifa', 'Entrada', 'Salida', 'Régimen', 'VIP', ...(precio ? ['Precio'] : [])], precio ? [4, 10] : [4]);
      const porNac = listado === 'nac' || agrupar;
      const filas = porNac ? [...new Set(xs.map(x => x.nac))].sort((a, b) => (NACIONALIDADES[a] ?? a).localeCompare(NACIONALIDADES[b] ?? b)).flatMap(n => {
        const ys = xs.filter(x => x.nac === n);
        return [{ tipo: 'grupo' as const, texto: `${NACIONALIDADES[n] ?? n} · ${ys.length} cliente${ys.length === 1 ? '' : 's'} · ${new Set(ys.map(y => y.r.habitacion)).size} hab.` }, ...ys.map(fila)];
      }) : xs.map(fila);
      return tabla(c, filas, ['Total', `${new Set(xs.map(x => x.nac)).size} nac.`, '', `${new Set(xs.map(x => x.r.habitacion)).size} hab.`, xs.filter(x => x.principal).reduce((s, x) => s + x.r.adultos + x.r.ninos, 0), '', '', '', '', String(xs.filter(x => x.principal && x.r.vip).length), ...(precio ? [''] : [])]);
    }
    // Régimen
    const xs = estancias.filter(r => !q || norm(`${r.nombre} ${r.habitacion}`).includes(q)).map(r => ({ r, nombre: r.nombre, hab: r.habitacion })).sort(cmp);
    const c = cols(['Régimen', 'Titular', 'Nacionalidad', 'Hab.', 'Tarifa', 'Entrada', 'Salida', 'Adultos', 'Niños', 'Crédito', ...(precio ? ['Precio'] : [])], precio ? [7, 8, 10] : [7, 8]);
    const filas = [...new Set(xs.map(x => x.r.regimen))].sort().flatMap(g => {
      const ys = xs.filter(x => x.r.regimen === g);
      return [{ tipo: 'grupo' as const, texto: `${g} · ${REGIMENES[g] ?? ''} · ${ys.length} hab. · ${ys.reduce((s, y) => s + y.r.adultos, 0)} adultos · ${ys.reduce((s, y) => s + y.r.ninos, 0)} niños` },
        ...ys.map(({ r }): FilaRep => ({ c: [r.regimen, titulo(r.nombre), NACIONALIDADES[r.nacionalidad] ?? r.nacionalidad, r.habitacion, r.tarifa, fmtF(r.entrada), fmtF(r.salida), r.adultos, r.ninos, r.credito ? 'Sí' : '—', ...pr(r)] }))];
    });
    return tabla(c, filas, ['Total', `${xs.length} hab.`, '', '', '', '', '', xs.reduce((s, x) => s + x.r.adultos, 0), xs.reduce((s, x) => s + x.r.ninos, 0), '', ...(precio ? [money(xs.reduce((s, x) => s + x.r.precio, 0))] : [])]);
  }, [listado, h.habitaciones, estancias, clientes, f, q, tipos, precio, agrupar, cmp, pr]);

  const ocupadas = new Set(estancias.map(r => r.habitacion)).size;
  const total = h.habitaciones.length;
  const titulos: Record<string, string> = { hab: 'Listado de ocupación · Habitaciones', cli: 'Listado de ocupación · Clientes', nac: 'Listado de ocupación · Nacionalidad', reg: 'Listado de ocupación · Régimen' };
  return (
    <PantallaReporte titulo="Listado de ocupación" reportes={sel} archivo={titulos[listado]} filtros={f} periodo={fmtF(fecha)} datos={datos}
      contadores={[{ valor: ocupadas, label: 'Ocupadas' }, { valor: `${Math.round((ocupadas / Math.max(1, total)) * 100)}%`, label: 'Ocupación' },
        { valor: estancias.reduce((s, r) => s + r.adultos, 0), label: 'Adultos' }, { valor: estancias.reduce((s, r) => s + r.ninos, 0), label: 'Niños' }, { valor: estancias.reduce((s, r) => s + 1 + r.adicionales.length, 0), label: 'Clientes' }]}
      vacio="No hay habitaciones ocupadas en esa fecha." />
  );
}

// ── Saldos en el pick (dos reportes en la misma pantalla) ───────────────────
const FOLIOS_EXT = [{ id: 'FE-1', nombre: 'Clientes externos', saldo: 180.5 }, { id: 'FE-2', nombre: 'Clientes externos exonerados', saldo: 64 }, { id: 'FE-4', nombre: 'Cuenta casa $', saldo: 0 }];
const DEFS_SALDOS: DefFiltro[] = [
  { k: 'q', tipo: 'busqueda', placeholder: 'Buscar habitación, nombre o folio' },
  { k: 'periodo', tipo: 'rango', label: 'Período' },
  { k: 'concepto', tipo: 'radio', label: 'Concepto', opciones: [{ value: 'todos', label: 'Todos' }, { value: 'Alojamiento', label: 'Alojamiento' }, { value: 'Extras', label: 'Extras' }], def: 'todos' },
  { k: 'moneda', tipo: 'unico', label: 'Moneda', opciones: [{ value: 'USD', label: 'USD' }, { value: 'CRC', label: 'CRC' }], def: 'USD' },
  { k: 'externos', tipo: 'check', label: 'Solo folios externos' },
  { k: 'resumido', tipo: 'toggle', label: 'Resumido por habitación' },
];
const DEFS_ETQ: DefFiltro[] = [
  { k: 'q', tipo: 'busqueda', placeholder: 'Buscar habitación o huésped' },
  { k: 'directos', tipo: 'check', label: 'Solo tarifas de directos' },
  { k: 'tarjetas', tipo: 'check', label: 'Incluir tarjetas de crédito' },
];
function Saldos({ sel }: { sel: Sel }) {
  const h = useHotel();
  const f = useFiltros(DEFS_SALDOS, 'saldos');
  const datos = useMemo(() => {
    const q = norm(f.s('q'));
    const conc = f.s('concepto');
    const rows = f.b('externos') ? [] : h.reservas.filter(r => r.estado === 'In-House' && r.moneda === f.s('moneda') && en(r.salida, [f.r('periodo')[0], '']) && en(r.entrada, ['', f.r('periodo')[1]]))
      .flatMap(r => r.cuentas.filter(c => c.saldo > 0).map(c => ({ hab: r.habitacion, nombre: titulo(r.nombre), tarifa: r.tarifa, entrada: fmtF(r.entrada), salida: fmtF(r.salida), cuenta: c.nombre, saldo: c.saldo, concepto: c.consumos ? 'Extras' : 'Alojamiento' })));
    const ext = conc === 'Alojamiento' || f.s('moneda') !== 'USD' ? [] : FOLIOS_EXT.filter(x => x.saldo > 0).map(x => ({ hab: x.id, nombre: x.nombre, tarifa: 'Folio externo', entrada: '—', salida: '—', cuenta: x.id, saldo: x.saldo, concepto: 'Extras' }));
    let todas = [...rows, ...ext].filter(x => (conc === 'todos' || x.concepto === conc) && (!q || norm(`${x.hab} ${x.nombre} ${x.cuenta}`).includes(q)));
    if (f.b('resumido')) {
      const m = new Map<string, (typeof todas)[number]>();
      todas.forEach(x => { const p = m.get(x.hab); m.set(x.hab, p ? { ...p, saldo: p.saldo + x.saldo, cuenta: 'Todas' } : { ...x }); });
      todas = [...m.values()];
    }
    todas.sort((a, b) => a.hab.localeCompare(b.hab, 'es', { numeric: true }));
    const mon = f.s('moneda') as 'USD' | 'CRC';
    return { n: todas.length, total: todas.reduce((s, x) => s + x.saldo, 0), hab: new Set(todas.filter(x => !x.hab.startsWith('FE')).map(x => x.hab)).size,
      d: tabla(cols(['Habitación / F.E.', 'Nombre', 'Tarifa', 'Entrada', 'Salida', 'Concepto', 'Cuenta', 'Saldo'], [7]),
        todas.map(x => ({ c: [x.hab, x.nombre, x.tarifa, x.entrada, x.salida, x.concepto, x.cuenta, money(x.saldo, mon)] })), ['Total', `${todas.length} cuentas`, '', '', '', '', '', money(todas.reduce((s, x) => s + x.saldo, 0), mon)]) };
  }, [h.reservas, f]);
  return <PantallaReporte titulo="Saldos en el pick" reportes={sel} archivo="saldos-pick" filtros={f} periodo={periodoDe(f.r('periodo')) ?? fmtF(HOY)} datos={datos.d}
    contadores={[{ valor: datos.n, label: 'Cuentas' }, { valor: datos.hab, label: 'Habitaciones' }, { valor: money(datos.total, f.s('moneda') as 'USD'), label: 'Saldo pendiente' }]}
    vacio="No hay saldos pendientes." />;
}
function Etiquetas({ sel }: { sel: Sel }) {
  const h = useHotel();
  const f = useFiltros(DEFS_ETQ, 'etiquetas');
  const [minimo, setMinimo] = useState('0');
  const [mensaje, setMensaje] = useState('Adjuntamos saldo factura de la presente semana, rogamos pase por Caja para su liquidación.');
  const { imprimir, portal } = usePrint();
  const xs = useMemo(() => h.reservas.filter(r => r.estado === 'In-House').map(r => ({ r, saldo: saldoReserva(r) }))
    .filter(x => x.saldo > 0 && x.saldo >= (Number(minimo) || 0) && (!f.b('directos') || x.r.tarifa === 'DIR') && (f.b('tarjetas') || !x.r.credito) && (!f.s('q') || norm(`${x.r.habitacion} ${x.r.nombre}`).includes(norm(f.s('q')))))
    .sort((a, b) => a.r.habitacion.localeCompare(b.r.habitacion, 'es', { numeric: true })), [h.reservas, f, minimo]);
  const total = xs.reduce((s, x) => s + x.saldo, 0);
  const etiquetas = (
    <div style={{ fontFamily: FONT }}>
      {xs.map(({ r, saldo }) => (
        <div key={r.id} style={{ border: '1px dashed #BBB', borderRadius: 6, padding: '12px 14px', marginBottom: 10, breakInside: 'avoid', fontSize: 11 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>Habitación {r.habitacion} · Sr./Sra. {titulo(r.nombre)}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginTop: 6 }}>
            <span style={{ color: '#555' }}>{mensaje}<br />Gracias por su atención.</span><b style={{ whiteSpace: 'nowrap' }}>SALDO {fmtNum(saldo)} USD</b>
          </div>
        </div>
      ))}
    </div>
  );
  return <>
    <PantallaReporte titulo="Etiquetas de facturas de clientes" reportes={sel} archivo="etiquetas-facturas" filtros={f} periodo={fmtF(HOY)}
      controles={<>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.n700, whiteSpace: 'nowrap' }}>Importe mínimo
          <span style={{ width: 90 }}><Input value={minimo} onChange={v => setMinimo(v.replace(/[^\d.]/g, ''))} aria-label="Importe mínimo (USD)" style={{ textAlign: 'right' }} /></span>USD</span>
        <span style={{ flex: 1, minWidth: 220 }}><Input value={mensaje} onChange={setMensaje} aria-label="Mensaje de la etiqueta" /></span>
        <Button variant="secondary" disabled={!xs.length} onClick={() => imprimir(etiquetas)}>Imprimir etiquetas</Button>
      </>}
      contadores={[{ valor: xs.length, label: 'Etiquetas' }, { valor: money(total), label: 'Saldo total' }]}
      datos={tabla(cols(['Habitación', 'Huésped', 'Tarifa', 'Salida', 'Saldo factura', 'Moneda'], [4]), xs.map(({ r, saldo }) => ({ c: [r.habitacion, titulo(r.nombre), r.tarifa, fmtF(r.salida), fmtNum(saldo), 'USD'] })), ['Total', `${xs.length} etiquetas`, '', '', fmtNum(total), 'USD'])}
      vacio="Ningún folio supera el importe mínimo." />
    {portal}
  </>;
}

// ── Ocupación por nacionalidades ────────────────────────────────────────────
const DEFS_NAC: DefFiltro[] = [
  { k: 'q', tipo: 'busqueda', placeholder: 'Buscar nacionalidad' },
  { k: 'fecha', tipo: 'fecha', label: 'Fecha hotelera', def: HOY },
  { k: 'tipos', tipo: 'multi', label: 'Tipo de habitación', opciones: TIPOS.map(t => ({ value: t.id, label: t.nombre })) },
];
function Nacionalidades({ sel }: { sel: Sel }) {
  const h = useHotel();
  const f = useFiltros(DEFS_NAC, 'nacionalidades');
  const datos = useMemo(() => {
    const dia = f.s('fecha') || HOY;
    const tipos = f.m('tipos');
    const rs = enCasa(h.reservas, dia).filter(r => !tipos.length || tipos.includes(r.tipo));
    const tot = rs.reduce((s, r) => s + r.adultos + r.ninos, 0) || 1;
    const q = norm(f.s('q'));
    const filas = [...new Set(rs.map(r => r.nacionalidad))]
      .map(n => { const xs = rs.filter(r => r.nacionalidad === n); const p = xs.reduce((s, r) => s + r.adultos + r.ninos, 0); return { n, nombre: NACIONALIDADES[n] ?? n, hab: xs.length, ad: xs.reduce((s, r) => s + r.adultos, 0), ni: xs.reduce((s, r) => s + r.ninos, 0), p }; })
      .filter(x => !q || norm(`${x.n} ${x.nombre}`).includes(q))
      .sort((a, b) => b.p - a.p || a.nombre.localeCompare(b.nombre));
    const sum = (k: 'hab' | 'ad' | 'ni' | 'p') => filas.reduce((s, x) => s + x[k], 0);
    return { dia, n: filas.length, hab: sum('hab'), p: sum('p'),
      d: tabla(cols(['Nacionalidad', 'Código', 'Habitaciones', 'Adultos', 'Niños', 'Huéspedes', '%'], [2, 3, 4, 5, 6]),
        filas.map(x => ({ c: [x.nombre, x.n, x.hab, x.ad, x.ni, x.p, `${fmtNum((x.p / tot) * 100, 1)} %`] })),
        ['Total', `${filas.length} nacionalidades`, sum('hab'), sum('ad'), sum('ni'), sum('p'), filas.length ? '100 %' : '']) };
  }, [h.reservas, f]);
  return <PantallaReporte titulo="Ocupación por nacionalidades" reportes={sel} archivo="ocupacion-nacionalidades" filtros={f} periodo={fmtF(datos.dia)} datos={datos.d}
    contadores={[{ valor: datos.n, label: 'Nacionalidades' }, { valor: datos.hab, label: 'Habitaciones ocupadas' }, { valor: datos.p, label: 'Huéspedes' }]}
    vacio="No hay huéspedes en casa en esa fecha." />;
}
