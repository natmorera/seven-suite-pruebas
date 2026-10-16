'use client';
// Reportes de auditoría: Check-In en proceso, Reservas con habitaciones
// incorrectas y Sincronización de disponibilidad en Channel Managers.
import { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { norm } from '@/components/configuracion/kit';
import { useHotel } from '@/components/hotel/store';
import { HOY, TIPOS, fmtF } from '@/components/hotel/datos';
import { usoDe } from '@/components/hotel/reservas';
import { codigoTipo } from '@/components/pronostico/PronosticoTipo';
import { PantallaReporte } from '@/components/reportes/Reporte';
import { useFiltros, type DefFiltro } from '@/components/reportes/filtros';
import { datosDeAud, type DocAud } from './motor';

export const REPORTES_AUDITORIA = [
  { id: 'checkin', label: 'Check-In en proceso' },
  { id: 'incorrectas', label: 'Reservas con habitaciones incorrectas' },
  { id: 'cm', label: 'Sincronización de disponibilidad en CM' },
] as const;
type Rep = (typeof REPORTES_AUDITORIA)[number]['id'];
const ABREV: Record<string, string> = { Solicitada: 'So', Confirmada: 'Co', 'Lista de espera': 'LE', 'In-House': 'IH' };

export default function ReportesAuditoria() {
  return <Suspense fallback={null}><Pantalla /></Suspense>;
}

const DEFS: Record<Rep, DefFiltro[]> = {
  checkin: [{ k: 'q', tipo: 'busqueda', placeholder: 'Buscar número, nombre o habitación' }],
  incorrectas: [{ k: 'q', tipo: 'busqueda', placeholder: 'Buscar número o nombre' }, { k: 'ent', tipo: 'rango', label: 'Entrada' }, { k: 'sal', tipo: 'rango', label: 'Salida' }, { k: 'conHab', tipo: 'check', label: 'Solo con habitación asignada' }],
  cm: [{ k: 'q', tipo: 'busqueda', placeholder: 'Buscar referencia, ID online o nombre' }, { k: 'periodo', tipo: 'rango', label: 'Período' },
    { k: 'tipos', tipo: 'multi', label: 'Tipo de habitación', opciones: TIPOS.map(t => ({ value: t.id, label: t.nombre })) }, { k: 'ent', tipo: 'rango', label: 'Llegada' }, { k: 'sal', tipo: 'rango', label: 'Salida' },
    { k: 'pendientes', tipo: 'check', label: 'Solo pendientes de sincronizar' }],
};

function Pantalla() {
  const h = useHotel();
  const sp = useSearchParams();
  const router = useRouter();
  const rep = (REPORTES_AUDITORIA.some(x => x.id === sp.get('r')) ? sp.get('r') : 'checkin') as Rep;
  const titulo = REPORTES_AUDITORIA.find(x => x.id === rep)!.label;
  const f = useFiltros(DEFS[rep], rep);
  const [ed, eh] = f.r('ent'), [sd, shh] = f.r('sal'), [pd, ph] = f.r('periodo');
  const conHab = f.b('conHab'), q = f.s('q'), tipos = f.m('tipos'), pendientes = f.b('pendientes');
  const fhUS = (s: string) => `${fmtF(s.slice(0, 10))} ${s.slice(11, 16)}`;
  const en = (v: string, r: { d: string; h: string }) => (!r.d || v >= r.d) && (!r.h || v <= r.h);

  const d: DocAud = useMemo(() => {
    const ent = { d: ed, h: eh }, sal = { d: sd, h: shh }, periodo = { d: pd, h: ph };
    const busca = (t: string) => !q || norm(t).includes(norm(q));
    if (rep === 'checkin') {
      const rs = h.reservas.filter(r => r.estado === 'Confirmada' && r.entrada === HOY && busca(`${r.numero} ${r.nombre} ${r.habitacion}`)).sort((a, b) => a.numero.localeCompare(b.numero));
      return { titulo, subtitulo: 'Reservas en proceso de ingreso a la fecha hotelera', registros: rs.length, vacio: 'No hay check-ins pendientes para la fecha hotelera.',
        tablas: [{ titulo: `Reservas en check-in`, headers: ['Hab.', 'Uso', 'Número', 'Nombre', 'Tarifa', 'Entrada', 'Salida', 'Pax'], derecha: [7], filas: rs.map(r => [r.habitacion || '—', `${r.tipo}_${usoDe(r)}`, r.numero, r.nombre, r.tarifa, fmtF(r.entrada), fmtF(r.salida), r.adultos + r.ninos]) }] };
    }
    if (rep === 'incorrectas') {
      const rs = h.reservas.filter(r => ['Solicitada', 'Confirmada', 'Lista de espera'].includes(r.estado) && r.entrada >= HOY && en(r.entrada, ent) && en(r.salida, sal) && busca(`${r.numero} ${r.nombre}`)).filter(r => {
        const hab = h.habitaciones.find(x => x.numero === r.habitacion);
        return conHab ? !!hab && hab.tipo !== r.tipo : !hab || hab.tipo !== r.tipo;
      }).sort((a, b) => a.entrada.localeCompare(b.entrada));
      return { titulo, subtitulo: 'Reservas cuyo tipo de habitación no coincide con la asignada (o sin habitación)', registros: rs.length, vacio: 'No hay reservas con discrepancias.',
        tablas: [{ titulo: `Reservas con discrepancia`, headers: ['Número', 'Estado', 'Nombre', 'Entrada', 'Salida', 'Uso', 'Tipo reservado', 'Habitación', 'Tipo asignado'],
          filas: rs.map(r => { const hab = h.habitaciones.find(x => x.numero === r.habitacion); return [r.numero, ABREV[r.estado] ?? r.estado, r.nombre || '—', fmtF(r.entrada), fmtF(r.salida), `${r.tipo}_${usoDe(r)}`, codigoTipo(r.tipo), r.habitacion || '—', hab ? codigoTipo(hab.tipo) : '—']; }) }] };
    }
    const cm = h.syncCM.filter(x => (!q || norm(`${x.referencia} ${x.idOnline} ${x.nombreRef}`).includes(norm(q))) && en(x.hora.slice(0, 10), periodo) && (!tipos.length || tipos.includes(x.tipo)) && en(x.llegada, ent) && en(x.salida, sal) && (!pendientes || !x.sinc))
      .sort((a, b) => b.hora.localeCompare(a.hora));
    return { titulo: 'Sincronización de disponibilidad en Channel Managers', subtitulo: 'Registro de sincronizaciones enviadas a canales externos', registros: cm.length, vacio: 'No hay sincronizaciones para los filtros aplicados.',
      tablas: [{ titulo: `Registros de sincronización`, headers: ['Hora', 'Tipo de habitación', 'Origen', 'ID Online', 'Referencia', 'Nombre ref.', 'Llegada', 'Salida', 'Cantidad', 'Nombre', 'Sinc.'], derecha: [8],
        filas: cm.map(x => [fhUS(x.hora), codigoTipo(x.tipo), x.origen, x.idOnline || '—', x.referencia, x.nombreRef, fmtF(x.llegada), fmtF(x.salida), x.cantidad, x.nombre, x.sinc ? '✓' : 'Pendiente']) }] };
  }, [h, rep, titulo, conHab, q, tipos, pendientes, ed, eh, sd, shh, pd, ph]);

  return (
    <PantallaReporte titulo={titulo} archivo={`auditoria-${rep}`} filtros={f} periodo={fmtF(HOY)} datos={datosDeAud(d)} vacio={d.vacio}
      reportes={{ lista: REPORTES_AUDITORIA, actual: rep, onCambiar: id => router.replace(`/auditoria/reportes?r=${id}`) }}
      contadores={[{ valor: d.registros, label: 'Registros' }, ...(rep === 'cm' ? [{ valor: h.syncCM.filter(x => !x.sinc).length, label: 'Pendientes' }] : rep === 'checkin' ? [{ valor: h.reservas.filter(r => r.estado === 'Confirmada' && r.entrada === HOY && !r.habitacion).length, label: 'Sin habitación' }] : [])]} />
  );
}
