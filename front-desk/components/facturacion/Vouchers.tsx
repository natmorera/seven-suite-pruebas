'use client';
// Vouchers y depósitos: un solo listado con los vouchers de tarjeta (pagos de folios y cobros de caja) y los
// depósitos en garantía de cualquier forma de pago; además, el detalle de vouchers y el histórico de lotes por terminal.
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

const REPORTES = [{ id: 'todo', label: 'Vouchers y depósitos' }, { id: 'vouchers', label: 'Vouchers' }, { id: 'lotes', label: 'Histórico de tarjetas' }] as const;
const DEP = 'Depósito en garantía';
const DEFS: DefFiltro[] = [
  { k: 'q', tipo: 'busqueda', placeholder: 'Tarjeta, autorización, cliente o reserva', ancho: 220 },
  { k: 'tipo', tipo: 'multi', label: 'Tipo', opciones: [{ value: 'voucher', label: 'Voucher de tarjeta' }, { value: 'deposito', label: DEP }] },
  { k: 'periodo', tipo: 'rango', label: 'Período', def: [sumarDias(HOY, -7), HOY] },
  { k: 'terminal', tipo: 'multi', label: 'Terminal', opciones: TERMINALES.map(t => ({ value: t, label: t })) },
  { k: 'estado', tipo: 'multi', label: 'Estado', opciones: ['Aprobado', 'Liquidado', 'Activo', 'Anulado'].map(x => ({ value: x, label: x })) },
  { k: 'moneda', tipo: 'radio', label: 'Moneda', opciones: [{ value: 'todas', label: 'Todas' }, { value: 'USD', label: 'USD' }, { value: 'CRC', label: 'CRC' }], def: 'todas' },
];

export default function Vouchers() {
  return <Suspense fallback={null}><Pantalla /></Suspense>;
}

function Pantalla() {
  const h = useHotel();
  const sp = useSearchParams();
  const router = useRouter();
  const rep = sp.get('r') === 'lotes' ? 'lotes' : sp.get('r') === 'vouchers' ? 'vouchers' : 'todo';
  const f = useFiltros(DEFS, 'vouchers');
  const [desde, hasta] = f.r('periodo');
  const q = norm(f.s('q')), tipos = f.m('tipo'), terminales = f.m('terminal'), estados = f.m('estado'), moneda = f.s('moneda');
  const vouchers = useMemo(() => h.vouchers.filter(v => (!tipos.length || tipos.includes('voucher')) && (!terminales.length || terminales.includes(v.terminal)) && (!desde || v.fecha.slice(0, 10) >= desde) && (!hasta || v.fecha.slice(0, 10) <= hasta)
    && (moneda === 'todas' || !moneda || v.moneda === moneda) && (!estados.length || estados.includes(v.estado)) && (!q || norm(`${v.tarjeta} ${v.autorizacion} ${v.referencia} ${v.marca} ${v.origen}`).includes(q)))
    .sort((a, b) => b.fecha.localeCompare(a.fecha)), [h.vouchers, tipos, terminales, desde, hasta, moneda, estados, q]);
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
  // Listado único: depósitos (con el voucher de tarjeta que los respalda, si lo hay) + vouchers que no son de depósitos
  const unificado = useMemo(() => {
    const enRango = (d: string) => (!desde || d >= desde) && (!hasta || d <= hasta);
    const deVoucher = h.vouchers.filter(v => v.origen === DEP);
    const deps = h.depositos.filter(d => enRango(d.recibido.slice(0, 10))).map(d => {
      const v = d.tipo === 'Tarjeta de crédito' ? deVoucher.find(x => x.fecha.slice(0, 16) === d.recibido.slice(0, 16) && Math.abs(x.monto - d.importe) < 0.01) : undefined;
      const res = d.reservaId ? h.reservas.find(r => r.id === d.reservaId) : undefined;
      return { id: d.id, tipo: 'deposito', fecha: d.recibido, doc: `DG-${d.numero}`, cliente: d.nombre, reserva: res?.numero ?? '', forma: d.tipo === 'Tarjeta de crédito' ? `Tarjeta •••• ${d.tarjeta.numero.slice(-4)}` : d.tipo,
        autorizacion: v?.autorizacion ?? (d.referencia || ''), terminal: v?.terminal ?? '', estado: d.estado as string, moneda: d.moneda as string, monto: d.importe };
    });
    const vs = h.vouchers.filter(v => v.origen !== DEP && enRango(v.fecha.slice(0, 10))).map(v => ({ id: v.id, tipo: 'voucher', fecha: v.fecha, doc: v.referencia, cliente: v.origen, reserva: '', forma: `${v.marca} •••• ${v.tarjeta}`,
      autorizacion: v.autorizacion, terminal: v.terminal, estado: v.estado as string, moneda: v.moneda as string, monto: v.monto }));
    return [...deps, ...vs].filter(x => (!tipos.length || tipos.includes(x.tipo)) && (!estados.length || estados.includes(x.estado)) && (moneda === 'todas' || !moneda || x.moneda === moneda)
      && (!terminales.length || terminales.includes(x.terminal)) && (!q || norm(`${x.doc} ${x.cliente} ${x.reserva} ${x.forma} ${x.autorizacion}`).includes(q)))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [h.vouchers, h.depositos, h.reservas, desde, hasta, tipos, estados, moneda, terminales, q]);
  const uValidos = unificado.filter(x => x.estado !== 'Anulado');
  const uUSD = r2(uValidos.filter(x => x.moneda !== 'CRC').reduce((s, x) => s + x.monto, 0));
  const uCRC = r2(uValidos.filter(x => x.moneda === 'CRC').reduce((s, x) => s + x.monto, 0));
  const uTotal = `$ ${fmtN(uUSD)}${uCRC ? ` · ₡ ${fmtN(uCRC)}` : ''}`;
  const datos = rep === 'todo'
    ? tabla(cols(['Fecha', 'Tipo', 'Documento', 'Cliente / origen', 'Reserva', 'Forma de pago', 'Autorización', 'Terminal', 'Estado', 'Moneda', 'Importe'], [10]),
      unificado.map((x): FilaRep => ({ c: [fmtFH(x.fecha), x.tipo === 'deposito' ? 'Depósito' : 'Voucher', x.doc, x.cliente || '—', x.reserva || '—', x.forma, x.autorizacion || '—', x.terminal || '—', x.estado, x.moneda, fmtMon(x.monto, x.moneda)], tenue: x.estado === 'Anulado' })),
      ['Total', `${unificado.length} registros`, '', '', '', '', '', '', '', '', uTotal])
    : rep === 'vouchers'
    ? tabla(cols(['Fecha de transacción', 'Terminal', 'Tarjeta', 'Autorización', 'Referencia', 'Estado', 'Origen', 'Moneda', 'Importe'], [8]),
      vouchers.map((v): FilaRep => ({ c: [fmtFH(v.fecha), v.terminal, `${v.marca} •••• ${v.tarjeta}`, v.autorizacion, v.referencia, v.estado, v.origen, v.moneda, fmtMon(v.monto, v.moneda as 'USD')], tenue: v.estado === 'Anulado' })),
      ['Total', `${vouchers.length} vouchers`, '', '', '', '', '', '', totalMon])
    : tabla(cols(['Terminal', 'Fecha', 'Estado', 'Moneda', 'Transacciones', 'Importe'], [4, 5]),
      lotes.map((l): FilaRep => ({ c: [l.terminal, fmtF(l.fecha), l.fecha < HOY ? 'Liquidado' : 'Pendiente de cierre', l.moneda, l.n, fmtMon(l.saldo, l.moneda)] })),
      ['Total', `${lotes.length} lotes`, '', '', lotes.reduce((s, l) => s + l.n, 0), totalMon]);
  return (
    <PantallaReporte titulo={REPORTES.find(x => x.id === rep)!.label} archivo={rep === 'todo' ? 'vouchers-y-depositos' : rep === 'vouchers' ? 'vouchers' : 'historico-tarjetas'} filtros={f} datos={datos}
      periodo={desde || hasta ? `${fmtF(desde) || '…'} al ${fmtF(hasta) || '…'}` : undefined}
      reportes={{ lista: REPORTES, actual: rep, onCambiar: id => router.replace(`/facturacion/vouchers?r=${id}`) }}
      contadores={rep === 'todo' ? [
        { valor: unificado.filter(x => x.tipo === 'voucher').length, label: 'Vouchers' },
        { valor: unificado.filter(x => x.tipo === 'deposito' && x.estado === 'Activo').length, label: 'Depósitos activos' },
        { valor: unificado.filter(x => x.estado === 'Anulado').length, label: 'Anulados' },
        { valor: uTotal, label: 'Total' },
      ] : [{ valor: vouchers.length, label: 'Vouchers' }, { valor: lotes.length, label: 'Lotes' }, { valor: lotes.filter(l => l.fecha >= HOY).length, label: 'Lotes por cerrar' }, { valor: vouchers.filter(v => v.estado === 'Anulado').length, label: 'Anulados' }, { valor: totalMon, label: 'Total' }]}
      vacio={rep === 'todo' ? 'No hay vouchers ni depósitos para el período.' : 'No hay vouchers para el período.'} />
  );
}
