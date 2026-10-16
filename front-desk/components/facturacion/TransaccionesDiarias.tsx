'use client';
// Transacciones diarias: 9 sub-reportes sobre el libro de transacciones del
// hotel (cargos de todos los folios + cobros + depósitos aplicados).
import { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { norm } from '@/components/configuracion/kit';
import { HOY, USUARIOS, fmtF } from '@/components/hotel/datos';
import { CONCEPTOS, conceptoDe, desglose, fmtN, formaPago, r2, type Mon } from '@/components/hotel/finanzas';
import { useFolios } from './folios/modelo';
import { PantallaReporte, type Contador } from '@/components/reportes/Reporte';
import { cols, type BloqueRep, type DatosReporte, type FilaRep } from '@/components/reportes/modelo';
import { useFiltros, type DefFiltro } from '@/components/reportes/filtros';

export const REPORTES = [
  { id: 'dia', label: 'Transacciones del Día' },
  { id: 'transcript', label: 'Transcript' },
  { id: 'resumen', label: 'Resumen de las Transacciones del Día' },
  { id: 'historicas', label: 'Transacciones Históricas' },
  { id: 'impuestos', label: 'Producción e Impuestos' },
  { id: 'operativo', label: 'Resumen Operativo' },
  { id: 'tarifa', label: 'Producción por Tarifa' },
  { id: 'empresa', label: 'Producción por Empresas' },
  { id: 'mercado', label: 'Producción por Mercado' },
] as const;
type Rep = (typeof REPORTES)[number]['id'];

export interface Tx {
  id: string; fecha: string; hora: string; ref: string; origen: string; codigo: string; concepto: string; grupo: string; folio: string; habitacion: string;
  moneda: Mon; importe: number; produccion: number; impuestos: number; motivo: string; usuario: string; tarifa: string; empresa: string; mercado: string; cerrado: boolean;
}
export interface Cobro { id: string; fecha: string; hora: string; folio: string; forma: string; formaNombre: string; usd: number; deposito: boolean; usuario: string }

export const mercadoDe = (cliente: string, nac: string) => (cliente === 'Agencia de Viajes' ? 'Agencias Internacionales' : cliente === 'Tarifa Corporativa' ? 'Corporativo' : nac === 'CRI' ? 'Directos Nacionales' : 'Directos Extranjeros');

/** Libro de transacciones: todas las líneas de folio y los cobros, con su producción e impuestos. */
export function useLibro() {
  const folios = useFolios();
  return useMemo(() => {
    const txs: Tx[] = [];
    const cobros: Cobro[] = [];
    folios.todos.forEach(f => {
      const r = f.reserva;
      const ref = f.clase === 'reserva' ? (r?.cliente === 'Agencia de Viajes' ? `A-${f.habitacion}` : `H-${f.habitacion}`) : f.clase === 'casa' ? `C-${f.numero}` : `E-${f.numero}`;
      f.lineas.forEach(l => {
        if (l.fecha > HOY) return;
        const k = conceptoDe(l.concepto);
        const d = desglose(l.importe, l.concepto);
        txs.push({ id: l.id, fecha: l.fecha, hora: l.hora, ref, origen: l.origen, codigo: k.codigo, concepto: k.descripcion, grupo: k.grupo, folio: f.numero, habitacion: f.habitacion ? `${f.habitacion}-${r?.tipo ?? ''}` : ref,
          moneda: f.moneda, importe: l.importe, produccion: d.produccion, impuestos: d.impuestos, motivo: l.motivo, usuario: l.usuario,
          tarifa: r?.tarifa ?? (f.clase === 'casa' ? 'CUENTA CASA' : 'FOLIOS EXTERNOS'), empresa: r ? r.empresa || 'Directo' : f.nombre, mercado: r ? mercadoDe(r.cliente, r.nacionalidad) : f.clase === 'casa' ? 'Cuenta casa' : 'Clientes externos', cerrado: f.estado === 'Cerrado' });
      });
      f.pagos.forEach(p => cobros.push({ id: p.id, fecha: p.fecha, hora: p.hora, folio: f.numero, forma: p.forma, formaNombre: p.forma === 'ANT' ? 'Anticipos de reserva' : p.forma === 'DEP' ? 'Depósito en garantía' : formaPago(p.forma).nombre,
        usd: p.montoFacturado, deposito: p.forma === 'DEP', usuario: p.usuario }));
    });
    const saldoAbierto = r2(folios.todos.filter(f => f.estado === 'Abierto' && f.clase !== 'casa').reduce((s, f) => s + f.saldo, 0));
    return { txs, cobros, saldoAbierto };
  }, [folios.todos]);
}

export default function TransaccionesDiarias() {
  return <Suspense fallback={null}><Pantalla /></Suspense>;
}

const GRUPOS = [...new Set(CONCEPTOS.map(c => c.grupo))].map(g => ({ value: g, label: g.charAt(0) + g.slice(1).toLowerCase() }));
const comunes: DefFiltro[] = [
  { k: 'q', tipo: 'busqueda', placeholder: 'Buscar folio, habitación, concepto o usuario' },
];
const fecha: DefFiltro = { k: 'fecha', tipo: 'fecha', label: 'Fecha', def: HOY };
const rango: DefFiltro = { k: 'rango', tipo: 'rango', label: 'Período', def: [HOY.slice(0, 8) + '01', HOY] };
const grupo: DefFiltro = { k: 'grupo', tipo: 'multi', label: 'Grupo de producción', opciones: GRUPOS };
const usuario: DefFiltro = { k: 'usuario', tipo: 'multi', label: 'Usuario', opciones: [...new Set([...USUARIOS, 'seven', 'xandat'])].map(u => ({ value: u, label: u })) };
const DEFS: Record<Rep, DefFiltro[]> = {
  dia: [...comunes, fecha, grupo, usuario],
  transcript: [...comunes, fecha, usuario, { k: 'tipo', tipo: 'radio', label: 'Mostrar', opciones: [{ value: 'todo', label: 'Todo' }, { value: 'cargos', label: 'Cargos' }, { value: 'cobros', label: 'Cobros' }], def: 'todo' }],
  resumen: [...comunes, fecha, grupo],
  historicas: [...comunes, rango, grupo, { k: 'agrupar', tipo: 'radio', label: 'Agrupar por', opciones: [{ value: 'concepto', label: 'Concepto' }, { value: 'habitacion', label: 'Habitación' }], def: 'concepto' }],
  impuestos: [...comunes, rango, grupo],
  operativo: [rango, { k: 'vista', tipo: 'radio', label: 'Vista', opciones: [{ value: 'res', label: 'Consolidada' }, { value: 'det', label: 'Detallada' }], def: 'res' }],
  tarifa: [...comunes, rango, grupo],
  empresa: [...comunes, rango, grupo],
  mercado: [...comunes, rango, grupo],
};

const n2 = (n: number) => fmtN(n);
const agruparPor = <T,>(xs: T[], k: (x: T) => string) => Object.entries(xs.reduce<Record<string, T[]>>((a, x) => { (a[k(x)] ??= []).push(x); return a; }, {})).sort((a, b) => a[0].localeCompare(b[0]));
const suma = <T,>(xs: T[], f: (x: T) => number) => r2(xs.reduce((s, x) => s + f(x), 0));
const cap = (g: string) => g.charAt(0) + g.slice(1).toLowerCase();

function Pantalla() {
  const sp = useSearchParams();
  const router = useRouter();
  const rep = (REPORTES.some(x => x.id === sp.get('r')) ? sp.get('r') : 'dia') as Rep;
  const f = useFiltros(DEFS[rep], rep);
  const libro = useLibro();
  const unDia = rep === 'dia' || rep === 'resumen' || rep === 'transcript';
  const [rd, rh] = f.r('rango');
  const d = unDia ? f.s('fecha') || HOY : rd || HOY.slice(0, 8) + '01', h = unDia ? d : rh || HOY;
  const q = norm(f.s('q')), grupos = f.m('grupo'), usuarios = f.m('usuario');
  const txs = libro.txs.filter(t => t.fecha >= d && t.fecha <= h && (!grupos.length || grupos.includes(t.grupo)) && (!usuarios.length || usuarios.includes(t.usuario))
    && (!q || norm(`${t.folio} ${t.habitacion} ${t.ref} ${t.codigo} ${t.concepto} ${t.usuario} ${t.empresa} ${t.tarifa}`).includes(q)));
  const cobros = libro.cobros.filter(c => c.fecha >= d && c.fecha <= h && (!usuarios.length || usuarios.includes(c.usuario)) && (!q || norm(`${c.folio} ${c.formaNombre} ${c.usuario}`).includes(q)));
  const titulo = REPORTES.find(x => x.id === rep)!.label;
  const periodo = d === h ? fmtF(d) : `${fmtF(d)} al ${fmtF(h)}`;
  const datos = datosTx(rep, txs, cobros, libro.saldoAbierto, f.s('agrupar') || 'concepto', f.s('vista') === 'det', f.s('tipo') || 'todo');
  const contadores: Contador[] = [
    { valor: txs.length, label: 'Transacciones' }, { valor: cobros.length, label: 'Cobros' },
    { valor: `$ ${n2(suma(txs, t => t.importe))}`, label: 'Cargos' }, { valor: `$ ${n2(suma(txs, t => t.produccion))}`, label: 'Producción' }, { valor: `$ ${n2(suma(cobros, c => c.usd))}`, label: 'Cobrado' },
  ];
  return (
    <PantallaReporte titulo={titulo} archivo={`transacciones-${rep}`} filtros={f} periodo={periodo} datos={datos} contadores={contadores}
      reportes={{ lista: REPORTES, actual: rep, onCambiar: id => router.replace(`/facturacion/transacciones-diarias?r=${id}`) }}
      vacio="No hay transacciones en el período." />
  );
}

/** Datos de cada sub-reporte (misma tabla en pantalla, en el PDF y en CSV / XLS). */
function datosTx(rep: Rep, txs: Tx[], cobros: Cobro[], saldoAbierto: number, agrupar: string, detallado: boolean, tipo: string): DatosReporte {
  const tot = (label: string, n: number, valores: (string | number)[]) => [label, ...Array(n).fill(''), ...valores];
  if (rep === 'dia') {
    const filas: FilaRep[] = agruparPor(txs, t => t.concepto.toUpperCase()).flatMap(([g, xs]) => [
      { tipo: 'grupo' as const, texto: `${xs[0].codigo} · ${g}` },
      ...xs.sort((a, b) => a.hora.localeCompare(b.hora)).map((t): FilaRep => ({ c: [t.ref, t.origen, `${fmtF(t.fecha)} ${t.hora}`, t.moneda, n2(t.importe), t.motivo || '—', t.usuario] })),
      { tipo: 'subtotal' as const, c: [`Total ${xs[0].codigo}`, '', '', 'USD', n2(suma(xs, x => x.importe)), '', ''] },
    ]);
    return { bloques: [{ columnas: cols(['Referencia', 'Origen', 'Fecha', 'Moneda', 'Importe', 'Motivo', 'Usuario'], [4]), filas, total: ['Total general', '', '', 'USD', n2(suma(txs, t => t.importe)), '', ''] }] };
  }
  if (rep === 'transcript') {
    const xs = [...(tipo === 'cobros' ? [] : txs.map(t => ({ hora: t.hora, folio: t.folio, ref: t.ref, txt: `${t.codigo} · ${t.concepto}`, tipo: t.importe < 0 ? 'Corrección' : 'Cargo', imp: t.importe, u: t.usuario }))),
      ...(tipo === 'cargos' ? [] : cobros.map(c => ({ hora: c.hora, folio: c.folio, ref: '', txt: c.formaNombre, tipo: c.deposito ? 'Depósito' : 'Cobro', imp: -c.usd, u: c.usuario })))].sort((a, b) => a.hora.localeCompare(b.hora));
    return { bloques: [{ columnas: cols(['Hora', 'Folio', 'Referencia', 'Transacción', 'Tipo', 'Importe', 'Usuario'], [5]), filas: xs.map(x => ({ c: [x.hora, x.folio, x.ref || '—', x.txt, x.tipo, n2(x.imp), x.u] })),
      total: ['Total', `${xs.length} mov.`, '', `Cargos ${n2(suma(txs, t => t.importe))} · Cobros ${n2(suma(cobros, c => c.usd))}`, '', n2(suma(xs, x => x.imp)), ''] }] };
  }
  if (rep === 'resumen') {
    return { bloques: [
      { titulo: 'Cargos por concepto', columnas: cols(['Código', 'Descripción', 'Grupo', 'Cantidad', 'Importe', 'Producción', 'Impuestos'], [3, 4, 5, 6]),
        filas: agruparPor(txs, t => t.codigo).map(([c, xs]): FilaRep => ({ c: [c, xs[0].concepto, cap(xs[0].grupo), xs.length, n2(suma(xs, x => x.importe)), n2(suma(xs, x => x.produccion)), n2(suma(xs, x => x.impuestos))] })),
        total: ['Total cargos', '', '', txs.length, n2(suma(txs, t => t.importe)), n2(suma(txs, t => t.produccion)), n2(suma(txs, t => t.impuestos))] },
      { titulo: 'Cobros del día', columnas: cols(['Forma de pago', 'Cantidad', 'Cobrado (USD)'], [1, 2]),
        filas: agruparPor(cobros, c => c.formaNombre).map(([fp, xs]): FilaRep => ({ c: [fp, xs.length, n2(suma(xs, x => x.usd))] })), total: ['Total cobros', cobros.length, n2(suma(cobros, c => c.usd))] },
    ] };
  }
  if (rep === 'historicas') {
    if (agrupar === 'concepto') {
      const filas: FilaRep[] = agruparPor(txs, t => t.grupo).flatMap(([g, xs]) => [
        { tipo: 'grupo' as const, texto: cap(g) },
        ...agruparPor(xs, t => t.codigo).flatMap(([c, ys]) => [
          { tipo: 'grupo' as const, texto: `${c} · ${ys[0].concepto}`, sub: true },
          ...ys.map((t): FilaRep => ({ c: [t.folio, t.habitacion, n2(t.importe), n2(t.produccion), n2(t.impuestos), fmtF(t.fecha), t.motivo || '—', t.usuario] })),
          { tipo: 'subtotal' as const, c: [`Total ${c}`, '', n2(suma(ys, y => y.importe)), n2(suma(ys, y => y.produccion)), n2(suma(ys, y => y.impuestos)), '', '', ''] },
        ]),
      ]);
      return { bloques: [{ columnas: cols(['Folio', 'Habitación', 'Importe', 'Producción', 'Impuestos', 'Fecha', 'Motivo', 'Usuario'], [2, 3, 4]), filas, total: ['Total general', '', n2(suma(txs, t => t.importe)), n2(suma(txs, t => t.produccion)), n2(suma(txs, t => t.impuestos)), '', '', ''] }] };
    }
    const filas: FilaRep[] = agruparPor(txs, t => t.habitacion).flatMap(([hab, xs]) => [
      { tipo: 'grupo' as const, texto: hab },
      ...xs.map((t): FilaRep => ({ c: [t.codigo, t.concepto, t.folio, n2(t.importe), `${fmtF(t.fecha)} ${t.hora}`] })),
      { tipo: 'subtotal' as const, c: [`Total ${hab}`, '', '', n2(suma(xs, y => y.importe)), ''] },
    ]);
    return { bloques: [{ columnas: cols(['Código', 'Concepto', 'Folio', 'Importe', 'Fecha'], [3]), filas, total: ['Total general', '', '', n2(suma(txs, t => t.importe)), ''] }] };
  }
  if (rep === 'impuestos' || rep === 'operativo') {
    const cobrado = (xs: Tx[]) => suma(xs.filter(x => x.cerrado), x => x.importe);
    const desc = (xs: Tx[]) => suma(xs.filter(x => x.codigo === 'DESC'), x => -x.importe);
    const ingresos: BloqueRep = rep === 'impuestos' ? {
      columnas: cols(['Código', 'Descripción', 'Importe', 'Producción', 'Impuestos', 'Cobrado'], [2, 3, 4, 5]),
      filas: agruparPor(txs, t => t.grupo).flatMap(([g, xs]) => [{ tipo: 'grupo' as const, texto: cap(g) },
        ...agruparPor(xs, t => t.codigo).map(([c, ys]): FilaRep => ({ c: [c, ys[0].concepto, n2(suma(ys, y => y.importe)), n2(suma(ys, y => y.produccion)), n2(suma(ys, y => y.impuestos)), n2(cobrado(ys))] })),
        { tipo: 'subtotal' as const, c: [`Total ${cap(g)}`, '', n2(suma(xs, y => y.importe)), n2(suma(xs, y => y.produccion)), n2(suma(xs, y => y.impuestos)), n2(cobrado(xs))] }]),
      total: ['Total general', '', n2(suma(txs, t => t.importe)), n2(suma(txs, t => t.produccion)), n2(suma(txs, t => t.impuestos)), n2(cobrado(txs))],
    } : {
      titulo: 'Ingresos', columnas: cols(['Descripción', 'Importe', 'Descuento', 'Producción', 'Impuestos', 'Cobrado'], [1, 2, 3, 4, 5]),
      filas: agruparPor(txs, t => t.grupo).flatMap(([g, xs]): FilaRep[] => detallado
        ? [{ tipo: 'grupo', texto: cap(g) }, ...agruparPor(xs, t => t.codigo).map(([c, ys]): FilaRep => ({ c: [`${c} · ${ys[0].concepto}`, n2(suma(ys, y => y.importe)), n2(desc(ys)), n2(suma(ys, y => y.produccion)), n2(suma(ys, y => y.impuestos)), n2(cobrado(ys))] }))]
        : [{ c: [cap(g), n2(suma(xs, x => x.importe)), n2(desc(xs)), n2(suma(xs, x => x.produccion)), n2(suma(xs, x => x.impuestos)), n2(cobrado(xs))] }]),
      total: ['Total ingresos', n2(suma(txs, t => t.importe)), n2(desc(txs)), n2(suma(txs, t => t.produccion)), n2(suma(txs, t => t.impuestos)), n2(cobrado(txs))],
    };
    if (rep === 'impuestos') return { bloques: [ingresos], nota: 'Cifras realizadas en Front Desk. Las diferencias con la realidad pueden deberse a ajustes hechos en otros módulos, como el Point of Sales.' };
    const cob = cobros.filter(c => !c.deposito), dep = cobros.filter(c => c.deposito);
    const ing = suma(txs, t => t.produccion), imp = suma(txs, t => t.impuestos), tc = suma(cob, c => c.usd), td2 = suma(dep, c => c.usd);
    const anterior = r2(saldoAbierto - ing - imp + tc + td2);
    return { bloques: [
      ingresos,
      { titulo: 'Cobros', columnas: cols(['Descripción', 'Cobrado'], [1]), filas: agruparPor(cob, c => c.formaNombre).map(([fp, xs]): FilaRep => ({ c: [fp, n2(suma(xs, x => x.usd))] })), total: ['Total cobros', n2(tc)] },
      { titulo: 'Depósitos en facturas cerradas', columnas: cols(['Descripción', 'Importe'], [1]), filas: dep.map((x): FilaRep => ({ c: [`Depósito aplicado · folio ${x.folio}`, n2(x.usd)] })), total: ['Total depósitos', n2(td2)] },
      { titulo: 'Saldo de clientes en casa', columnas: cols(['Concepto', 'Importe'], [1]), filas: [['Saldo anterior', anterior], ['Ingresos (+)', ing], ['Impuestos (+)', imp], ['Cobros (−)', tc], ['Depósitos en facturas cerradas (−)', td2]].map(([l, v]): FilaRep => ({ c: [l as string, n2(v as number)] })), total: ['Saldo final', n2(saldoAbierto)] },
    ] };
  }
  const clave = (t: Tx) => (rep === 'tarifa' ? t.tarifa : rep === 'empresa' ? t.empresa : t.mercado);
  const gs = CONCEPTOS.map(c => c.grupo).filter((g, i, a) => a.indexOf(g) === i && txs.some(t => t.grupo === g));
  return { nota: 'Importes sin impuestos.', bloques: [{
    columnas: cols([rep === 'tarifa' ? 'Tarifa' : rep === 'empresa' ? 'Empresa' : 'Mercado', ...gs.map(cap), 'Total'], gs.map((_, i) => i + 1).concat(gs.length + 1)),
    filas: agruparPor(txs, clave).map(([k, xs]): FilaRep => ({ c: [k, ...gs.map(g => { const v = suma(xs.filter(x => x.grupo === g), x => x.produccion); return v ? n2(v) : '—'; }), n2(suma(xs, x => x.produccion))] })),
    total: tot('Total', 0, [...gs.map(g => n2(suma(txs.filter(x => x.grupo === g), x => x.produccion))), n2(suma(txs, x => x.produccion))]),
  }] };
}
