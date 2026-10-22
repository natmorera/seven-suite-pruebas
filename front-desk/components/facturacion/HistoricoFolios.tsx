'use client';
// Histórico de folios: folios cerrados (facturas) por rango de entrada / salida,
// con 8 criterios de orden y opciones de detalle. Reporte estándar: tabla en
// pantalla y documento al imprimir / exportar.
import { useMemo } from 'react';
import { norm } from '@/components/configuracion/kit';
import { useHotel } from '@/components/hotel/store';
import { HOY, fmtF } from '@/components/hotel/datos';
import { TC, fmtN, r2, type Factura } from '@/components/hotel/finanzas';
import { PantallaReporte } from '@/components/reportes/Reporte';
import { cols, type DatosReporte, type FilaRep } from '@/components/reportes/modelo';
import { useFiltros, type DefFiltro } from '@/components/reportes/filtros';

const ORDENES = [
  { id: 'origen', label: 'Origen / Nro. Folio', titulo: 'Folios Cerrados Ordenados por Origen' },
  { id: 'folio', label: 'Nro. Folio', titulo: 'Folios Cerrados Ordenados por Número de Folio' },
  { id: 'moneda', label: 'Moneda de la Facturación', titulo: 'Histórico de Folios Ordenado por Moneda de Facturación' },
  { id: 'forma', label: 'Forma de Pago', titulo: 'Histórico de Folios Ordenado por Forma de Pago' },
  { id: 'dia', label: 'Día Actual por Forma de Pago', titulo: 'Histórico de Folios del Día Actual Ordenado por Forma de Pago' },
  { id: 'factura', label: 'Nro. Factura', titulo: 'Folios Cerrados Ordenados por Número de Factura' },
  { id: 'tipo', label: 'Habitación, Folio Externo o Tarifa', titulo: 'Histórico de Folios por Habitación, Folio Externo o Tarifa' },
  { id: 'concepto', label: 'Detallado por Concepto / Grupo de Producción', titulo: 'Histórico de Folios - Histórico de Facturas' },
] as const;
type Orden = (typeof ORDENES)[number]['id'];
const GRUPOS_PROD = ['HOSPEDAJE', 'DESAYUNO INCLUIDO', 'REST. LA HACIENDA ALIMENTOS', 'BAR Y BEBIDAS', 'OTROS SERVICIOS', 'TOURS'];
const primeroDeMes = HOY.slice(0, 8) + '01';

export default function HistoricoFolios() {
  const h = useHotel();
  const formas = useMemo(() => [...new Set(h.facturas.map(f => f.formaPago))].sort(), [h.facturas]);
  const defs = useMemo<DefFiltro[]>(() => [
    { k: 'q', tipo: 'busqueda', placeholder: 'Documento, folio o cliente', ancho: 190 },
    { k: 'por', tipo: 'unico', label: 'Fecha', opciones: [{ value: 'sal', label: 'Salida' }, { value: 'ent', label: 'Entrada' }, { value: 'emi', label: 'Emisión' }], def: 'sal' },
    { k: 'per', tipo: 'rango', label: 'Período', def: [primeroDeMes, HOY] },
    { k: 'orden', tipo: 'unico', label: 'Orden', opciones: ORDENES.map(o => ({ value: o.id, label: o.label })), def: 'concepto' },
    { k: 'forma', tipo: 'multi', label: 'Forma de pago', opciones: formas.map(x => ({ value: x, label: x })) },
    { k: 'agrupar', tipo: 'radio', label: 'Agrupar', opciones: [{ value: 'cuenta', label: 'Por cuenta' }, { value: 'moneda', label: 'Por moneda' }, { value: 'no', label: 'Sin agrupar' }], def: 'cuenta' },
    { k: 'resumido', tipo: 'toggle', label: 'Resumido por día' },
    { k: 'local', tipo: 'toggle', label: 'Importes en moneda local' },
  ], [formas]);
  const f = useFiltros(defs, 'historico');
  const orden = (f.s('orden') || 'concepto') as Orden;
  const def = ORDENES.find(o => o.id === orden)!;
  const [pd, ph] = f.r('per');
  const por = f.s('por') || 'sal';
  const q = norm(f.s('q')), formasSel = f.m('forma');
  const filas = useMemo(() => (orden === 'dia' ? h.facturas.filter(x => x.fecha.startsWith(HOY)) : h.facturas.filter(x => { const d = por === 'ent' ? x.entrada : por === 'emi' ? x.fecha.slice(0, 10) : x.salida; return (!pd || d >= pd) && (!ph || d <= ph); }))
    .filter(x => (!formasSel.length || formasSel.includes(x.formaPago)) && (!q || norm(`${x.documento} ${x.folio} ${x.origen} ${x.cliente}`).includes(q))), [h.facturas, orden, pd, ph, por, formasSel, q]);
  const k = f.b('local') ? TC : 1;
  const datos = datosHistorico(orden, filas, { resumido: f.b('resumido'), agrupar: f.s('agrupar') || 'cuenta', local: f.b('local') }, (n: number) => fmtN(n * k));
  const total = r2(filas.reduce((s, x) => s + x.impFactura, 0) * k);
  return (
    <PantallaReporte titulo="Histórico de folios" archivo={`historico-folios-${orden}`} filtros={f} datos={datos}
      periodo={orden === 'dia' ? fmtF(HOY) : pd || ph ? `${por === 'ent' ? 'Entrada' : por === 'emi' ? 'Emisión' : 'Salida'} del ${fmtF(pd) || '…'} al ${fmtF(ph) || '…'}` : undefined}
      antesDeTabla={<span style={{ fontSize: 12, color: '#757575' }}>{def.titulo}</span>}
      contadores={[{ valor: filas.length, label: 'Documentos' }, { valor: new Set(filas.map(x => x.folio)).size, label: 'Folios' }, { valor: `${f.b('local') ? '₡' : '$'} ${fmtN(total)}`, label: 'Facturado' }, { valor: filas.filter(x => x.tipo !== 'Factura').length, label: 'Notas' }]}
      vacio="No hay folios cerrados en el rango seleccionado." />
  );
}

function datosHistorico(orden: Orden, filas: Factura[], opc: { resumido: boolean; agrupar: string; local: boolean }, m: (n: number) => string): DatosReporte {
  const mon = (x: Factura) => (opc.local ? 'CRC' : x.moneda);
  const fh = (x: Factura) => `${fmtF(x.fecha.slice(0, 10))} ${x.fecha.slice(11, 16)}`;
  const grupos = (clave: (x: Factura) => string) => Object.entries(filas.reduce<Record<string, Factura[]>>((a, x) => { (a[clave(x)] ??= []).push(x); return a; }, {})).sort((a, b) => a[0].localeCompare(b[0]));
  const t = (xs: Factura[], fn: (x: Factura) => number) => r2(xs.reduce((s, x) => s + fn(x), 0));
  if (orden === 'origen' || orden === 'folio' || orden === 'moneda') {
    const ord = [...filas].sort((a, b) => (orden === 'origen' ? a.origen.localeCompare(b.origen) || a.folio.localeCompare(b.folio) : Number(a.folio) - Number(b.folio)));
    const fila = (x: Factura): FilaRep => ({ c: orden === 'origen' ? [x.origen, x.documento, x.folio, x.cliente || '—', `${m(x.impCobro)} ${mon(x)}`, `${m(x.impFactura)} ${mon(x)}`, fh(x), x.formaPago, x.usuario] : [x.folio, x.documento, x.origen, x.cliente || '—', `${m(x.impCobro)} ${mon(x)}`, `${m(x.impFactura)} ${mon(x)}`, fh(x), x.formaPago, x.usuario] });
    const c = cols(orden === 'origen' ? ['Origen', 'Documento', 'Nro. Folio', 'Cliente', 'Imp. Mon. Cobro', 'Imp. Mon. Factura', 'Fecha de emisión', 'Forma de pago', 'Usuario'] : ['Nro. Folio', 'Documento', 'Origen', 'Cliente', 'Imp. Mon. Cobro', 'Imp. Mon. Factura', 'Fecha de emisión', 'Forma de pago', 'Usuario'], [4, 5]);
    const fs: FilaRep[] = orden === 'moneda' ? Object.entries(ord.reduce<Record<string, Factura[]>>((a, x) => { (a[x.moneda] ??= []).push(x); return a; }, {})).flatMap(([k, xs]) => [{ tipo: 'grupo' as const, texto: `Moneda de facturación: ${opc.local ? 'CRC' : k}` }, ...xs.map(fila), { tipo: 'subtotal' as const, c: ['Total', '', '', '', m(t(xs, x => x.impCobro)), m(t(xs, x => x.impFactura)), '', '', ''] }]) : ord.map(fila);
    return { bloques: [{ columnas: c, filas: fs, total: ['Total', `${filas.length} doc.`, '', '', m(t(filas, x => x.impCobro)), m(t(filas, x => x.impFactura)), '', '', ''] }] };
  }
  if (orden === 'forma' || orden === 'dia') {
    const dia = orden === 'dia';
    const c = cols(['Nro. Folio', 'Documento', 'Origen', 'Cliente', 'Imp. Mon. Cobro', 'Imp. Mon. Factura', ...(dia ? ['Hospedaje', 'Régimen', 'Otros', 'Impuestos'] : []), 'Fecha de emisión', 'Usuario'], dia ? [4, 5, 6, 7, 8, 9] : [4, 5]);
    const extra = (xs: Factura[]) => (dia ? [m(t(xs, x => x.hospedaje)), m(t(xs, x => x.regimen)), m(t(xs, x => x.otros)), m(t(xs, x => x.impuestos))] : []);
    const fs: FilaRep[] = grupos(x => x.formaPago).flatMap(([cuenta, xs]) => [
      { tipo: 'grupo' as const, texto: `Cuenta: ${cuenta.split(' - ').reverse().join(' - ')} · Moneda ${opc.local ? 'CRC' : xs[0].moneda}` },
      ...[...xs].sort((a, b) => a.fecha.localeCompare(b.fecha)).map((x): FilaRep => ({ c: [x.folio, x.documento, x.origen, x.cliente || '—', `${m(x.impCobro)} ${mon(x)}`, m(x.impFactura), ...(dia ? [x.hospedaje ? m(x.hospedaje) : '—', x.regimen ? m(x.regimen) : '—', x.otros ? m(x.otros) : '—', x.impuestos ? m(x.impuestos) : '—'] : []), fh(x), x.usuario] })),
      { tipo: 'subtotal' as const, c: ['Total cuenta', '', '', '', m(t(xs, x => x.impCobro)), m(t(xs, x => x.impFactura)), ...extra(xs), '', ''] },
    ]);
    return { bloques: [{ columnas: c, filas: fs, total: ['Total general', '', '', '', m(t(filas, x => x.impCobro)), m(t(filas, x => x.impFactura)), ...extra(filas), '', ''] }] };
  }
  if (orden === 'factura') {
    return { bloques: [{ columnas: cols(['Documento', 'Nro. Folio', 'Origen', 'Cliente', 'Imp. Mon. Cobro', 'Imp. Depositado', 'Imp. Neto Fact.', 'Fecha de emisión', 'Forma de pago', 'Usuario'], [4, 5, 6]),
      filas: [...filas].sort((a, b) => a.documento.localeCompare(b.documento, 'es', { numeric: true })).map((x): FilaRep => ({ c: [x.documento, x.folio, x.origen, x.cliente || '—', `${m(x.impCobro)} ${mon(x)}`, m(x.impDepositado), m(r2(x.impFactura - x.impDepositado)), fh(x), x.formaPago, x.usuario] })),
      total: ['Total', '', '', '', m(t(filas, x => x.impCobro)), m(t(filas, x => x.impDepositado)), m(t(filas, x => x.impFactura - x.impDepositado)), '', '', ''] }] };
  }
  if (orden === 'tipo') {
    const cat = (x: Factura) => (x.origen.startsWith('H-') ? '1 · Habitaciones' : x.origen.startsWith('E-') ? '2 · Folios externos' : x.origen.startsWith('A-') ? '3 · Tarifas de agencia' : '4 · Notas de crédito / débito');
    return { bloques: [{ columnas: cols(['Origen', 'Tarifa', 'Documento', 'Nro. Folio', 'Cliente', 'Imp. Mon. Factura', 'Fecha de emisión', 'Usuario'], [5]),
      filas: grupos(cat).flatMap(([g, xs]) => [{ tipo: 'grupo' as const, texto: g.slice(4) },
        ...[...xs].sort((a, b) => a.origen.localeCompare(b.origen, 'es', { numeric: true })).map((x): FilaRep => ({ c: [x.origen, x.tarifa || '—', x.documento, x.folio, x.cliente || '—', `${m(x.impFactura)} ${mon(x)}`, fh(x), x.usuario] })),
        { tipo: 'subtotal' as const, c: [`Total ${g.slice(4).toLowerCase()}`, '', '', '', '', m(t(xs, x => x.impFactura)), '', ''] }]),
      total: ['Total', '', '', '', '', m(t(filas, x => x.impFactura)), '', ''] }] };
  }
  // Detallado por concepto / grupo de producción
  const extras = GRUPOS_PROD.slice(1);
  const c = cols(['Fecha de emisión', 'Documento', 'Hospedaje', 'Régimen aloj.', 'Otros', 'IVA 13%', 'Servicios', 'Total', ...extras.map(g => g.charAt(0) + g.slice(1).toLowerCase())], Array.from({ length: 6 + extras.length }, (_, i) => i + 2));
  const valores = (xs: Factura[]) => [m(t(xs, x => x.hospedaje)), m(t(xs, x => x.regimen)), m(t(xs, x => x.otros)), m(t(xs, x => x.impuestos)), m(t(xs, x => x.servicios)), m(t(xs, x => x.impFactura)), ...extras.map(g => { const v = t(xs, x => x.porGrupo[g] ?? 0); return v ? m(v) : '—'; })];
  const bloque = (xs: Factura[]): FilaRep[] => {
    const ord = [...xs].sort((a, b) => a.fecha.localeCompare(b.fecha));
    return opc.resumido
      ? Object.entries(ord.reduce<Record<string, Factura[]>>((a, x) => { (a[x.fecha.slice(0, 10)] ??= []).push(x); return a; }, {})).map(([d, ys]): FilaRep => ({ c: [fmtF(d), `${ys.length} doc.`, ...valores(ys)] }))
      : ord.map((x): FilaRep => ({ c: [fmtF(x.fecha.slice(0, 10)), x.documento, ...valores([x])] }));
  };
  const fs: FilaRep[] = opc.agrupar === 'no' ? bloque(filas)
    : grupos(x => (opc.agrupar === 'moneda' ? x.moneda : x.formaPago)).flatMap(([g, xs]) => [
      { tipo: 'grupo' as const, texto: opc.agrupar === 'moneda' ? `Moneda: ${g === 'USD' ? 'USD - Dólar americano' : 'CRC - Colón costarricense'}` : `Cuenta: ${g} · Moneda ${opc.local ? 'CRC' : xs[0].moneda}` },
      ...bloque(xs), { tipo: 'subtotal' as const, c: ['Total', '', ...valores(xs)] }]);
  return { bloques: [{ columnas: c, filas: fs, total: ['Total general', '', ...valores(filas)] }] };
}
