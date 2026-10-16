'use client';
// Vouchers e Histórico de tarjetas: transacciones con tarjeta por terminal
// (pagos de folios, depósitos y cobros de caja) y sus lotes diarios.
// Reporte estándar: tabla en pantalla y documento al imprimir / exportar.
import { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { norm } from '@/components/configuracion/kit';
import { useHotel } from '@/components/hotel/store';
import { HOY, fmtF, sumarDias } from '@/components/hotel/datos';
import { TERMINALES, fmtFH, fmtMon, fmtN, r2 } from '@/components/hotel/finanzas';
import { PantallaReporte } from '@/components/reportes/Reporte';
import { cols, tabla, type FilaRep } from '@/components/reportes/modelo';
import { useFiltros, type DefFiltro } from '@/components/reportes/filtros';

const REPORTES = [{ id: 'vouchers', label: 'Vouchers' }, { id: 'lotes', label: 'Histórico de tarjetas' }] as const;
const DEFS: DefFiltro[] = [
  { k: 'q', tipo: 'busqueda', placeholder: 'Buscar tarjeta, autorización o referencia' },
  { k: 'periodo', tipo: 'rango', label: 'Período', def: [sumarDias(HOY, -7), HOY] },
  { k: 'terminal', tipo: 'multi', label: 'Terminal', opciones: TERMINALES.map(t => ({ value: t, label: t })) },
  { k: 'estado', tipo: 'multi', label: 'Estado', opciones: ['Aprobado', 'Liquidado', 'Anulado'].map(x => ({ value: x, label: x })) },
  { k: 'moneda', tipo: 'radio', label: 'Moneda', opciones: [{ value: 'todas', label: 'Todas' }, { value: 'USD', label: 'USD' }, { value: 'CRC', label: 'CRC' }], def: 'todas' },
];

export default function Vouchers() {
  return <Suspense fallback={null}><Pantalla /></Suspense>;
}

function Pantalla() {
  const h = useHotel();
  const sp = useSearchParams();
  const router = useRouter();
  const rep = sp.get('r') === 'lotes' ? 'lotes' : 'vouchers';
  const f = useFiltros(DEFS, 'vouchers');
  const [desde, hasta] = f.r('periodo');
  const q = norm(f.s('q')), terminales = f.m('terminal'), estados = f.m('estado'), moneda = f.s('moneda');
  const vouchers = useMemo(() => h.vouchers.filter(v => (!terminales.length || terminales.includes(v.terminal)) && (!desde || v.fecha.slice(0, 10) >= desde) && (!hasta || v.fecha.slice(0, 10) <= hasta)
    && (moneda === 'todas' || !moneda || v.moneda === moneda) && (!estados.length || estados.includes(v.estado)) && (!q || norm(`${v.tarjeta} ${v.autorizacion} ${v.referencia} ${v.marca} ${v.origen}`).includes(q)))
    .sort((a, b) => b.fecha.localeCompare(a.fecha)), [h.vouchers, terminales, desde, hasta, moneda, estados, q]);
  // Lote por terminal / día / moneda (lo que liquida el banco)
  const lotes = useMemo(() => Object.values(vouchers.reduce<Record<string, { terminal: string; fecha: string; moneda: 'USD' | 'CRC'; n: number; saldo: number }>>((a, v) => {
    const k = `${v.terminal}|${v.fecha.slice(0, 10)}|${v.moneda}`;
    a[k] ??= { terminal: v.terminal, fecha: v.fecha.slice(0, 10), moneda: v.moneda as 'USD' | 'CRC', n: 0, saldo: 0 };
    a[k].n++; a[k].saldo = r2(a[k].saldo + (v.estado === 'Anulado' ? 0 : v.monto));
    return a;
  }, {})).sort((a, b) => b.fecha.localeCompare(a.fecha) || a.terminal.localeCompare(b.terminal)), [vouchers]);
  const validos = vouchers.filter(v => v.estado !== 'Anulado');
  const usd = r2(validos.filter(v => v.moneda !== 'CRC').reduce((s, v) => s + v.monto, 0));
  const crc = r2(validos.filter(v => v.moneda === 'CRC').reduce((s, v) => s + v.monto, 0));
  const totalMon = `$ ${fmtN(usd)}${crc ? ` · ₡ ${fmtN(crc, 0)}` : ''}`;
  const datos = rep === 'vouchers'
    ? tabla(cols(['Fecha de transacción', 'Terminal', 'Tarjeta', 'Autorización', 'Referencia', 'Estado', 'Origen', 'Moneda', 'Importe'], [8]),
      vouchers.map((v): FilaRep => ({ c: [fmtFH(v.fecha), v.terminal, `${v.marca} •••• ${v.tarjeta}`, v.autorizacion, v.referencia, v.estado, v.origen, v.moneda, fmtMon(v.monto, v.moneda as 'USD')], tenue: v.estado === 'Anulado' })),
      ['Total', `${vouchers.length} vouchers`, '', '', '', '', '', '', totalMon])
    : tabla(cols(['Terminal', 'Fecha', 'Estado', 'Moneda', 'Transacciones', 'Importe'], [4, 5]),
      lotes.map((l): FilaRep => ({ c: [l.terminal, fmtF(l.fecha), l.fecha < HOY ? 'Liquidado' : 'Pendiente de cierre', l.moneda, l.n, fmtMon(l.saldo, l.moneda)] })),
      ['Total', `${lotes.length} lotes`, '', '', lotes.reduce((s, l) => s + l.n, 0), totalMon]);
  return (
    <PantallaReporte titulo={REPORTES.find(x => x.id === rep)!.label} archivo={rep === 'vouchers' ? 'vouchers' : 'historico-tarjetas'} filtros={f} datos={datos}
      periodo={desde || hasta ? `${fmtF(desde) || '…'} al ${fmtF(hasta) || '…'}` : undefined}
      reportes={{ lista: REPORTES, actual: rep, onCambiar: id => router.replace(`/facturacion/vouchers?r=${id}`) }}
      contadores={[{ valor: vouchers.length, label: 'Vouchers' }, { valor: lotes.length, label: 'Lotes' }, { valor: lotes.filter(l => l.fecha >= HOY).length, label: 'Lotes por cerrar' }, { valor: vouchers.filter(v => v.estado === 'Anulado').length, label: 'Anulados' }, { valor: totalMon, label: 'Total' }]}
      vacio="No hay vouchers para el período." />
  );
}
