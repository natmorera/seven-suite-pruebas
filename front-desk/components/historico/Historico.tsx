'use client';
// Histórico: Estancias y huéspedes, Bitácora de cambios, No-shows y Mensajes. Las cuatro usan el reporte estándar
// (filtros en vivo con chips, contadores, tabla de 50 filas, Exportar e Imprimir). Clic en una fila abre la reserva.
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { norm } from '@/components/configuracion/kit';
import { useHotel, totalReserva } from '@/components/hotel/store';
import { HOY, NACIONALIDADES, TIPOS, USUARIOS, fmtF, noches, sumarDias } from '@/components/hotel/datos';
import { money } from '@/components/hotel/ui';
import { PantallaReporte } from '@/components/reportes/Reporte';
import { cols, tabla, type FilaRep } from '@/components/reportes/modelo';
import { useFiltros, type DefFiltro } from '@/components/reportes/filtros';
import { TIPOS_CAMBIO, bitacora, mensajes, noShows } from './datos';

const en = (v: string, [d, h]: [string, string]) => (!d || v >= d) && (!h || v <= h);
/** La estancia se cruza con el rango (llega antes del fin y sale después del inicio). */
const cruza = (entrada: string, salida: string, [d, h]: [string, string]) => (!d || salida >= d) && (!h || entrada <= h);
const periodo = ([d, h]: [string, string]) => (d || h ? `${d ? fmtF(d) : '…'} al ${h ? fmtF(h) : '…'}` : 'Todo el histórico');
const opc = (xs: readonly string[]) => xs.map(x => ({ value: x, label: x }));
const nombreTipo = (id: string) => TIPOS.find(t => t.id === id)?.nombre ?? id;

// ── Estancias y huéspedes ───────────────────────────────────────────────────
export function Estancias() {
  const h = useHotel();
  const router = useRouter();
  const empresas = useMemo(() => [...new Set(h.reservas.map(r => r.empresa).filter(Boolean))].sort(), [h.reservas]);
  const tarifas = useMemo(() => [...new Set(h.reservas.map(r => r.tarifa))].sort(), [h.reservas]);
  const defs = useMemo<DefFiltro[]>(() => [
    { k: 'vista', tipo: 'radio', opciones: [{ value: 'estancia', label: 'Por estancia' }, { value: 'huesped', label: 'Por huésped' }], def: 'estancia' },
    { k: 'q', tipo: 'busqueda', placeholder: 'Nombre, reserva o habitación' },
    { k: 'estancia', tipo: 'rango', label: 'Estancia' },
    { k: 'tipos', tipo: 'multi', label: 'Tipo de habitación', opciones: TIPOS.map(t => ({ value: t.id, label: t.nombre })) },
    { k: 'tarifas', tipo: 'multi', label: 'Tarifa', opciones: opc(tarifas) },
    { k: 'empresas', tipo: 'multi', label: 'Empresa', opciones: opc(empresas) },
    { k: 'nac', tipo: 'multi', label: 'Nacionalidad', opciones: Object.entries(NACIONALIDADES).map(([value, label]) => ({ value, label })) },
    { k: 'repitentes', tipo: 'check', label: 'Solo repitentes' },
  ], [empresas, tarifas]);
  const f = useFiltros(defs, 'estancias');
  const datos = useMemo(() => {
    const q = norm(f.s('q'));
    const clave = (r: (typeof h.reservas)[number]) => r.perfilId ?? norm(r.nombre);
    const estancias = h.reservas.filter(r => r.habitacion && (r.estado === 'In-House' || r.estado === 'Completada'));
    const visitas = new Map<string, number>();
    estancias.forEach(r => visitas.set(clave(r), (visitas.get(clave(r)) ?? 0) + 1));
    const xs = estancias.filter(r => (!q || norm(`${r.nombre} ${r.numero} ${r.habitacion}`).includes(q))
      && cruza(r.entrada, r.salida, f.r('estancia'))
      && (!f.m('tipos').length || f.m('tipos').includes(r.tipo)) && (!f.m('tarifas').length || f.m('tarifas').includes(r.tarifa))
      && (!f.m('empresas').length || f.m('empresas').includes(r.empresa))
      && (!f.m('nac').length || f.m('nac').includes(r.nacionalidad)) && (!f.b('repitentes') || (visitas.get(clave(r)) ?? 0) > 1));
    const abrir = (id: string) => () => router.push(`/reservaciones/reservas?id=${id}`);
    if (f.s('vista') === 'huesped') {
      const grupos = new Map<string, typeof xs>();
      xs.forEach(r => grupos.set(clave(r), [...(grupos.get(clave(r)) ?? []), r]));
      const filas: FilaRep[] = [...grupos.values()].map(rs => {
        const ult = [...rs].sort((a, b) => b.entrada.localeCompare(a.entrada))[0];
        const n = rs.reduce((s, r) => s + noches(r.entrada, r.salida), 0);
        const tot = rs.reduce((s, r) => s + totalReserva(r), 0);
        return { c: [ult.nombre, NACIONALIDADES[ult.nacionalidad] ?? ult.nacionalidad, visitas.get(clave(ult)) ?? rs.length, n, fmtF(ult.entrada), fmtF(ult.salida), money(tot), ult.vip ? 'Sí' : ''], onClick: ult.perfilId ? () => router.push(`/hospedaje/perfiles?id=${ult.perfilId}`) : abrir(ult.id) };
      }).sort((a, b) => String((a as { c: string[] }).c[0]).localeCompare(String((b as { c: string[] }).c[0])));
      return { n: grupos.size, est: xs.length, d: tabla(cols(['Huésped', 'Nacionalidad', 'Visitas', 'Noches', 'Última entrada', 'Última salida', 'Total', 'VIP'], [2, 3, 6]), filas) };
    }
    const filas: FilaRep[] = [...xs].sort((a, b) => b.entrada.localeCompare(a.entrada)).map(r => ({
      c: [r.numero, r.nombre, r.habitacion, nombreTipo(r.tipo), fmtF(r.entrada), fmtF(r.salida), noches(r.entrada, r.salida), r.tarifa, r.empresa || 'Directo', r.nacionalidad, r.adultos + r.ninos, money(totalReserva(r), r.moneda), r.estado === 'In-House' ? 'En casa' : 'Completada'],
      onClick: abrir(r.id),
    }));
    return { n: new Set(xs.map(clave)).size, est: xs.length, d: tabla(cols(['Reserva', 'Huésped', 'Hab.', 'Tipo', 'Entrada', 'Salida', 'Noches', 'Tarifa', 'Empresa', 'Nac.', 'Pax', 'Total', 'Estado'], [6, 10, 11]), filas) };
  }, [h, f, router]);
  return <PantallaReporte titulo="Estancias y huéspedes" archivo="historico-estancias" filtros={f} periodo={periodo(f.r('estancia'))} datos={datos.d}
    contadores={[{ valor: datos.est, label: 'Estancias' }, { valor: datos.n, label: 'Huéspedes' }]} vacio="No hay estancias en el histórico." />;
}

// ── Bitácora de cambios ─────────────────────────────────────────────────────
const DEFS_BIT: DefFiltro[] = [
  { k: 'q', tipo: 'busqueda', placeholder: 'Huésped, reserva o habitación' },
  { k: 'fecha', tipo: 'rango', label: 'Fecha del cambio', def: [sumarDias(HOY, -30), HOY] },
  { k: 'tipos', tipo: 'multi', label: 'Tipo de cambio', opciones: opc(TIPOS_CAMBIO) },
  { k: 'usuarios', tipo: 'multi', label: 'Usuario', opciones: opc(USUARIOS) },
];
export function Bitacora() {
  const h = useHotel();
  const router = useRouter();
  const f = useFiltros(DEFS_BIT, 'bitacora');
  const datos = useMemo(() => {
    const q = norm(f.s('q'));
    const xs = bitacora(h.reservas, h.bitacoraRes).filter(c => (!q || norm(`${c.huesped} ${c.numero} ${c.habitacion}`).includes(q)) && en(c.fecha, f.r('fecha'))
      && (!f.m('tipos').length || f.m('tipos').includes(c.tipo)) && (!f.m('usuarios').length || f.m('usuarios').includes(c.usuario)));
    const filas: FilaRep[] = xs.map(c => ({ c: [`${fmtF(c.fecha)} ${c.hora}`, c.tipo, c.habitacion, `${c.huesped} · ${c.numero}`, c.antes, c.despues, c.motivo || '—', c.usuario], onClick: () => router.push(`/reservaciones/reservas?id=${c.reservaId}`) }));
    return { n: xs.length, tipos: new Set(xs.map(c => c.tipo)).size, usuarios: new Set(xs.map(c => c.usuario)).size, d: tabla(cols(['Fecha y hora', 'Tipo', 'Hab.', 'Huésped · reserva', 'Antes', 'Después', 'Motivo', 'Usuario']), filas) };
  }, [h.reservas, h.bitacoraRes, f, router]);
  return <PantallaReporte titulo="Bitácora de cambios" archivo="bitacora-cambios" filtros={f} periodo={periodo(f.r('fecha'))} datos={datos.d}
    contadores={[{ valor: datos.n, label: 'Cambios' }, { valor: datos.tipos, label: 'Tipos de cambio' }, { valor: datos.usuarios, label: 'Usuarios' }]} vacio="No hay cambios en ese período." />;
}

// ── No-shows ────────────────────────────────────────────────────────────────
export function NoShows() {
  const h = useHotel();
  const lista = useMemo(() => noShows(h.reservas), [h.reservas]);
  const defs = useMemo<DefFiltro[]>(() => [
    { k: 'q', tipo: 'busqueda', placeholder: 'Número o nombre' },
    { k: 'entrada', tipo: 'rango', label: 'Entrada', def: [sumarDias(HOY, -30), HOY] },
    { k: 'tarifas', tipo: 'multi', label: 'Tarifa', opciones: opc([...new Set(lista.map(x => x.tarifa))].sort()) },
    { k: 'nac', tipo: 'multi', label: 'Nacionalidad', opciones: [...new Set(lista.map(x => x.nacionalidad))].sort().map(n => ({ value: n, label: NACIONALIDADES[n] ?? n })) },
  ], [lista]);
  const f = useFiltros(defs, 'noshows');
  const datos = useMemo(() => {
    const q = norm(f.s('q'));
    const xs = lista.filter(x => (!q || norm(`${x.numero} ${x.nombre}`).includes(q)) && en(x.entrada, f.r('entrada'))
      && (!f.m('tarifas').length || f.m('tarifas').includes(x.tarifa)) && (!f.m('nac').length || f.m('nac').includes(x.nacionalidad)));
    const filas: FilaRep[] = [];
    [...new Set(xs.map(x => x.tarifa))].sort().forEach(t => {
      const g = xs.filter(x => x.tarifa === t).sort((a, b) => a.entrada.localeCompare(b.entrada));
      filas.push({ tipo: 'grupo', texto: `Tarifa ${t}` });
      g.forEach(x => filas.push({ c: [x.numero, x.nombre, NACIONALIDADES[x.nacionalidad] ?? x.nacionalidad, fmtF(x.entrada), fmtF(x.salida), noches(x.entrada, x.salida), x.habitaciones, x.deposito ? money(x.deposito) : '—'] }));
      filas.push({ tipo: 'subtotal', c: [`Subtotal ${t}`, `${g.length} ${g.length === 1 ? 'reserva' : 'reservas'}`, '', '', '', '', g.reduce((s, x) => s + x.habitaciones, 0), money(g.reduce((s, x) => s + x.deposito, 0))] });
    });
    const hab = xs.reduce((s, x) => s + x.habitaciones, 0);
    return { n: xs.length, hab, d: tabla(cols(['Número', 'A nombre de', 'Nacionalidad', 'Entrada', 'Salida', 'Noches', 'Habitaciones', 'Dep. garantía'], [5, 6, 7]), filas,
      xs.length ? ['Total', `${xs.length} reservas`, '', '', '', '', hab, money(xs.reduce((s, x) => s + x.deposito, 0))] : undefined) };
  }, [lista, f]);
  return <PantallaReporte titulo="No-shows" archivo="no-shows" filtros={f} periodo={periodo(f.r('entrada'))} datos={datos.d}
    contadores={[{ valor: datos.n, label: 'Reservas' }, { valor: datos.hab, label: 'Habitaciones' }]} vacio="No hay no-shows en ese período." />;
}

// ── Mensajes ────────────────────────────────────────────────────────────────
const DEFS_MSG: DefFiltro[] = [
  { k: 'q', tipo: 'busqueda', placeholder: 'Huésped, habitación, remitente o texto' },
  { k: 'fecha', tipo: 'rango', label: 'Fecha' },
  { k: 'estado', tipo: 'unico', label: 'Estado', opciones: [{ value: 'activos', label: 'Activos' }, { value: 'eliminados', label: 'Eliminados' }, { value: 'todos', label: 'Todos' }], def: 'activos' },
  { k: 'usuarios', tipo: 'multi', label: 'Registrado por', opciones: opc(USUARIOS) },
];
export function Mensajes() {
  const h = useHotel();
  const router = useRouter();
  const f = useFiltros(DEFS_MSG, 'mensajes');
  const datos = useMemo(() => {
    const q = norm(f.s('q'));
    const est = f.s('estado');
    const xs = mensajes(h.reservas).filter(m => (!q || norm(`${m.huesped} ${m.habitacion} ${m.de} ${m.texto}`).includes(q)) && en(m.fecha, f.r('fecha'))
      && (est === 'todos' || (est === 'eliminados' ? m.estado === 'Eliminado' : m.estado !== 'Eliminado'))
      && (!f.m('usuarios').length || f.m('usuarios').includes(m.registradoPor)))
      .sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`));
    const filas: FilaRep[] = xs.map(m => ({
      c: [`${fmtF(m.fecha)} ${m.hora}`, m.habitacion, m.huesped, `${fmtF(m.entrada)} – ${fmtF(m.salida)}`, m.de, m.responderA, m.texto, m.registradoPor, m.modificadoPor !== m.registradoPor ? m.modificadoPor : '—', m.estado],
      tenue: m.estado === 'Eliminado', onClick: () => router.push(`/reservaciones/reservas?id=${m.reservaId}`),
    }));
    return { n: xs.length, d: tabla(cols(['Fecha y hora', 'Hab.', 'Huésped', 'Estancia', 'De', 'Responder a', 'Mensaje', 'Registrado por', 'Modificado por', 'Estado']), filas) };
  }, [h.reservas, f, router]);
  return <PantallaReporte titulo="Mensajes" archivo="mensajes" filtros={f} periodo={periodo(f.r('fecha'))} datos={datos.d}
    contadores={[{ valor: datos.n, label: 'Mensajes' }]} vacio="No hay mensajes con esos filtros." />;
}
