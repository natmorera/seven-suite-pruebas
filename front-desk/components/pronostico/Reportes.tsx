'use client';
// Reportes de Pronóstico / Estadísticas. Como en el resto de la plataforma, el
// reporte se elige con el selector del título (?r=…).
import { Suspense, useMemo, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useHotel } from '@/components/hotel/store';
import { DIAS_CORTOS, HOY, REGIMENES, TARIFAS_NOMBRES, USUARIOS, contratoDeTarifa, fmtF, noches, sumarDias } from '@/components/hotel/datos';
import { MERCADOS, cuentaOcupacion, mercadoDe } from '@/components/hotel/reservas';
import { TC } from '@/components/hotel/finanzas';
import { bloqueadasEn } from '@/components/reservaciones/inventario';
import { PantallaReporte, type Contador } from '@/components/reportes/Reporte';
import { cols, type DatosReporte, type FilaRep } from '@/components/reportes/modelo';
import { useFiltros, type DefFiltro } from '@/components/reportes/filtros';
import { fmt2, type Celda } from './comun';
import { ingresoNoche, ingresosMensuales, ocupaNoche, pct, porDia, r2, segmentoDe } from './estadisticas';

export const REPORTES_PRONOSTICO = [
  { id: 'resumen', label: 'Resumen de ocupación' },
  { id: 'acumulada', label: 'Ocupación acumulada' },
  { id: 'regimen', label: 'Pronóstico por rég. de Alojamiento' },
  { id: 'segmentos', label: 'Explotación de segmentos' },
  { id: 'realizadas', label: 'Reservas realizadas' },
  { id: 'plazos', label: 'Plazos de depósitos en garantía' },
  { id: 'diario', label: 'Informe diario' },
  { id: 'ingresos', label: 'Pronóstico de ingresos' },
] as const;
type Rep = (typeof REPORTES_PRONOSTICO)[number]['id'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const diaF = (d: string) => `${DIAS_CORTOS[new Date(d + 'T12:00:00').getDay()]}. ${fmtF(d)}`;
const usd = (n: number, m = 'USD') => `${m} ${fmt2(n)}`;
const inicioMes = HOY.slice(0, 8) + '01';
const finMes = sumarDias(`${HOY.slice(0, 5)}${String(Number(HOY.slice(5, 7)) % 12 + 1).padStart(2, '0')}-01`, -1);

export default function ReportesPronostico() {
  return <Suspense fallback={null}><Pantalla /></Suspense>;
}

interface Def { headers: string[]; filas: Celda[][]; derecha?: number[]; grupos?: { label: string; span: number }[]; total?: Celda[]; nota?: ReactNode; cabecera?: ReactNode }

// Filtros de cada reporte (guía de reportes: rangos, radios ≤ 3 opciones, desplegables de selección única)
const rango = (desde: string, hasta: string): DefFiltro => ({ k: 'rango', tipo: 'rango', label: 'Período', def: [desde, hasta] });
const ANIOS = [0, 1, 2].map(i => String(Number(HOY.slice(0, 4)) - i)).map(a => ({ value: a, label: a }));
const DEFS: Record<Rep, DefFiltro[]> = {
  resumen: [{ k: 'fecha', tipo: 'fecha', label: 'Fecha', def: HOY }],
  acumulada: [rango(inicioMes, finMes), { k: 'modo', tipo: 'radio', label: 'Datos', opciones: [{ value: 'Real', label: 'Real' }, { value: 'Proyectado', label: 'Proyectado' }], def: 'Real' }],
  regimen: [rango(HOY, sumarDias(HOY, 20)), { k: 'ver', tipo: 'radio', label: 'Contar', opciones: [{ value: 'Habitaciones', label: 'Habitaciones' }, { value: 'Clientes', label: 'Clientes' }], def: 'Habitaciones' }, { k: 'inactivos', tipo: 'toggle', label: 'Mostrar regímenes sin uso', def: true }],
  segmentos: [rango(inicioMes, finMes), { k: 'tarifa', tipo: 'unico', label: 'Tarifa', opciones: [{ value: '', label: 'Todas' }, ...TARIFAS_NOMBRES.map(t => ({ value: t, label: `${t} · ${contratoDeTarifa(t)}` }))], def: '' }, { k: 'meses', tipo: 'toggle', label: 'Agrupar por meses' }],
  realizadas: [{ k: 'anio', tipo: 'unico', label: 'Año', opciones: ANIOS, def: HOY.slice(0, 4) }],
  plazos: [rango(HOY, sumarDias(HOY, 30)), { k: 'verPor', tipo: 'radio', label: 'Fecha', opciones: [{ value: 'plazo', label: 'Del plazo' }, { value: 'entrada', label: 'De entrada' }], def: 'plazo' }, { k: 'empresa', tipo: 'unico', label: 'Empresa', opciones: [], def: '' }, { k: 'mercado', tipo: 'multi', label: 'Mercado', opciones: MERCADOS.map(m => ({ value: m, label: m })) }],
  diario: [{ k: 'anio', tipo: 'unico', label: 'Año', opciones: ANIOS, def: HOY.slice(0, 4) }],
  ingresos: [rango(HOY, sumarDias(HOY, 20)), { k: 'moneda', tipo: 'unico', label: 'Moneda', opciones: [{ value: 'USD', label: 'USD' }, { value: 'CRC', label: 'CRC' }], def: 'USD' }],
};

function Pantalla() {
  const h = useHotel();
  const sp = useSearchParams();
  const router = useRouter();
  const rep = (REPORTES_PRONOSTICO.some(x => x.id === sp.get('r')) ? sp.get('r') : 'resumen') as Rep;
  const titulo = REPORTES_PRONOSTICO.find(x => x.id === rep)!.label;
  const empresas = useMemo(() => [...new Set(h.reservas.map(r => r.empresa || 'Directo'))].sort(), [h.reservas]);
  const defs = useMemo(() => DEFS[rep].map(d => (d.k === 'empresa' && d.tipo === 'unico' ? { ...d, opciones: [{ value: '', label: 'Todas' }, ...empresas.map(e => ({ value: e, label: e }))] } : d)), [rep, empresas]);
  const fl = useFiltros(defs, rep);
  const [d0, h0] = fl.r('rango');
  const defRango = (DEFS[rep].find(d => d.tipo === 'rango') as Extract<DefFiltro, { tipo: 'rango' }> | undefined)?.def ?? ['', ''];
  const f = { fecha: fl.s('fecha') || HOY, desde: d0 || defRango[0], hasta: h0 || defRango[1], modo: (fl.s('modo') || 'Real') as 'Real' | 'Proyectado', ver: fl.s('ver') || 'Habitaciones', inactivos: fl.b('inactivos'),
    tarifa: fl.s('tarifa'), meses: fl.b('meses'), anio: fl.s('anio') || HOY.slice(0, 4), verPor: fl.s('verPor') || 'plazo', empresa: fl.s('empresa'), mercados: fl.m('mercado'), moneda: fl.s('moneda') || 'USD' };
  const total = h.habitaciones.length;
  const clave = JSON.stringify(f);

  // ── Resumen de ocupación ──
  const resumen = useMemo(() => calcResumen(h, f.fecha, total), [h, f.fecha, total]);

  const def: Def = useMemo(() => {
    if (rep === 'acumulada') {
      const ds = porDia(h, f.desde, f.hasta, f.modo);
      let ac = { cant: 0, ing: 0, sinReg: 0, dias: 0 };
      const filas = ds.map(d => {
        ac = { cant: ac.cant + d.cant, ing: ac.ing + d.aloj + d.reg, sinReg: ac.sinReg + d.aloj, dias: ac.dias + 1 };
        const adr = d.cant ? (d.aloj + d.reg) / d.cant : 0;
        return [fmtF(d.fecha), d.cant, fmt2(d.pct), usd(adr), usd(d.cant ? d.aloj / d.cant : 0), usd((d.aloj + d.reg) / total), usd(d.cant ? (d.aloj + d.reg + d.otros) / d.cant : 0),
          ac.cant, fmt2(pct(ac.cant, total * ac.dias)), usd(ac.cant ? ac.ing / ac.cant : 0), usd(ac.cant ? ac.sinReg / ac.cant : 0)];
      });
      const tc = ds.reduce((s, d) => s + d.cant, 0), ti = ds.reduce((s, d) => s + d.aloj + d.reg, 0), ts = ds.reduce((s, d) => s + d.aloj, 0), to = ds.reduce((s, d) => s + d.otros, 0);
      return { headers: ['Fecha', 'Cant.', '%', 'ADR', 'ADR (sin rég.)', 'RevPAR', 'RevPOR', 'Cant.', '%', 'ADR', 'ADR (sin rég.)'], derecha: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], filas,
        grupos: [{ label: '', span: 1 }, { label: 'Ocupación diaria', span: 6 }, { label: 'Ocupación acumulada', span: 4 }],
        total: ['Totales', tc, fmt2(pct(tc, total * ds.length)), usd(tc ? ti / tc : 0), usd(tc ? ts / tc : 0), usd(ds.length ? ti / (total * ds.length) : 0), usd(tc ? (ti + to) / tc : 0), tc, fmt2(pct(tc, total * ds.length)), usd(tc ? ti / tc : 0), usd(tc ? ts / tc : 0)] };
    }
    if (rep === 'regimen') {
      const ds = porDia(h, f.desde, f.hasta, 'Proyectado');
      const regs = Object.keys(REGIMENES).filter(k => f.inactivos || ds.some(d => d.rs.some(r => r.regimen === k)));
      const val = (rs: typeof ds[number]['rs']) => (f.ver === 'Habitaciones' ? rs.length : rs.reduce((s, r) => s + r.adultos + r.ninos, 0));
      const filas = ds.map(d => [diaF(d.fecha), val(d.rs), fmt2(d.pct), ...regs.map(k => val(d.rs.filter(r => r.regimen === k)))]);
      const sum = (i: number) => filas.reduce((s, x) => s + Number(x[i]), 0);
      return { headers: ['Fecha', 'Ocupación', 'Porcentaje', ...regs], derecha: regs.map((_, i) => i + 3).concat([1, 2]), filas,
        total: ['Totales', sum(1), fmt2(pct(sum(1), (f.ver === 'Habitaciones' ? total : total * 2) * Math.max(1, ds.length))), ...regs.map((_, i) => sum(i + 3))],
        cabecera: <span>Tipo: <b>{f.ver}</b> · Capacidad del hotel: <b>{total}</b></span> };
    }
    if (rep === 'segmentos') {
      const ds = porDia(h, f.desde, f.hasta, 'Real');
      const filtro = (r: { tarifa: string }) => !f.tarifa || r.tarifa === f.tarifa;
      const clave = (seg: string, d: string) => (f.meses ? `${MESES[Number(d.slice(5, 7)) - 1]} · ${seg}` : seg);
      const m = new Map<string, { hosp: number; reg: number; otros: number; hEnt: number; hEst: number; cEnt: number; cEst: number }>();
      const z = () => ({ hosp: 0, reg: 0, otros: 0, hEnt: 0, hEst: 0, cEnt: 0, cEst: 0 });
      ds.forEach(d => d.rs.filter(filtro).forEach(r => {
        const k = clave(segmentoDe(r), d.fecha); const x = m.get(k) ?? z(); const i = ingresoNoche(r);
        x.hosp += i.aloj; x.reg += i.reg; x.otros += i.otros; x.hEst++; x.cEst += r.adultos + r.ninos;
        if (r.entrada === d.fecha) { x.hEnt++; x.cEnt += r.adultos + r.ninos; }
        m.set(k, x);
      }));
      const t = [...m.values()].reduce((a, x) => ({ hosp: a.hosp + x.hosp, reg: a.reg + x.reg, otros: a.otros + x.otros, hEnt: a.hEnt + x.hEnt, hEst: a.hEst + x.hEst, cEnt: a.cEnt + x.cEnt, cEst: a.cEst + x.cEst }), z());
      const fila = (n: string, x: ReturnType<typeof z>): Celda[] => [n, usd(x.hosp), fmt2(pct(x.hosp, t.hosp)), usd(x.reg), fmt2(pct(x.reg, t.reg)), usd(x.otros), fmt2(pct(x.otros, t.otros)), x.hEnt, x.hEst, fmt2(pct(x.hEst, t.hEst)), x.cEnt, x.cEst, fmt2(pct(x.cEst, t.cEst)), usd(x.hEst ? (x.hosp + x.reg) / x.hEst : 0)];
      return { headers: ['Agencia', 'Monto', '%', 'Monto', '%', 'Monto', '%', 'Ent.', 'Est.', '%', 'Ent.', 'Est.', '%', 'Tarifa prom. total'], derecha: Array.from({ length: 13 }, (_, i) => i + 1),
        grupos: [{ label: '', span: 1 }, { label: 'Ing. Hosp.', span: 2 }, { label: 'Ing. Rég. Aloj.', span: 2 }, { label: 'Ing. Otros', span: 2 }, { label: 'Habitaciones', span: 3 }, { label: 'Clientes', span: 3 }, { label: '', span: 1 }],
        filas: [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([n, x]) => fila(n, x)), total: fila('Totales generales', t),
        cabecera: <span>Empresa: <b>{'Hotel'}</b> · Tipo de informe: <b>Totalizado por {f.meses ? 'mes y agencia' : 'agencia'}</b></span> };
    }
    if (rep === 'realizadas') {
      const anio = f.anio;
      const filas: Celda[][] = [];
      const usuarios = [...new Set([...USUARIOS, ...h.reservas.map(r => r.detalles?.usuario ?? '').filter(Boolean)])];
      const totMes = Array(12).fill(0);
      usuarios.forEach(u => {
        const rs = h.reservas.filter(r => (r.detalles?.usuario ?? '') === u && r.creada?.startsWith(anio));
        if (!rs.length) return;
        const cnt = (xs: typeof rs) => Array.from({ length: 12 }, (_, m) => xs.filter(r => Number(r.creada!.slice(5, 7)) === m + 1).length);
        const todo = cnt(rs); todo.forEach((n, i) => { totMes[i] += n; });
        filas.push([u, 'Todo', ...todo], [u, 'Reservas', ...cnt(rs.filter(r => !r.rooming))], [u, 'Rooming', ...cnt(rs.filter(r => r.rooming))]);
      });
      return { headers: ['Usuario', 'Desc.', ...MESES.map(m => m.slice(0, 3))], derecha: Array.from({ length: 12 }, (_, i) => i + 2), filas, total: ['Total general', '', ...totMes] };
    }
    if (rep === 'plazos') {
      const rs = h.reservas.filter(r => ['Solicitada', 'Confirmada', 'In-House'].includes(r.estado) && (!f.empresa || (r.empresa || 'Directo') === f.empresa) && (!f.mercados.length || f.mercados.includes(mercadoDe(r)))).map(r => {
        const importe = r2(r.precio * Math.max(1, noches(r.entrada, r.salida)));
        const plazo = sumarDias(r.entrada, -3);
        const imp = r.depRequerido ?? r2(importe * 0.5);
        const pagado = r2(r.depGarantia + r.pagado);
        return { r, plazo, importe, imp, pagado, rest: r2(Math.max(0, imp - pagado)) };
      }).filter(x => { const d = f.verPor === 'plazo' ? x.plazo : x.r.entrada; return d >= f.desde && d <= f.hasta; }).sort((a, b) => a.plazo.localeCompare(b.plazo));
      const s = (k: 'importe' | 'imp' | 'pagado' | 'rest') => fmt2(rs.reduce((a, x) => a + x[k], 0));
      return { headers: ['Número', 'Tarifa', 'Nombre', 'Plazo', 'Entrada', 'Salida', 'Importe', 'Imp. plazos', 'Pagado', 'Restante'], derecha: [6, 7, 8, 9],
        filas: rs.map(x => [x.r.numero, x.r.tarifa, x.r.nombre, fmtF(x.plazo), fmtF(x.r.entrada), fmtF(x.r.salida), fmt2(x.importe), fmt2(x.imp), fmt2(x.pagado), fmt2(x.rest)]),
        total: ['Totales', '', '', '', '', '', s('importe'), s('imp'), s('pagado'), s('rest')], cabecera: <span>Plazo de depósito: 3 días antes de la entrada · Importe del plazo: depósito requerido de la reserva (o 50 % del alojamiento)</span> };
    }
    if (rep === 'diario') {
      const a = Number(f.anio);
      const act = ingresosMensuales(h, a), prev = ingresosMensuales(h, a - 1);
      const filas = act.map((x, i) => [MESES[i], fmt2(x.real), fmt2(x.pron), fmt2(x.real + x.pron), fmt2(prev[i].anterior), `${fmt2(pct(x.real + x.pron - prev[i].anterior, prev[i].anterior))} %`]);
      const S = (xs: number[]) => fmt2(xs.reduce((s, n) => s + n, 0));
      return { headers: ['Periodo', 'Ingreso real', 'Ingreso pronosticado', 'Total', 'Ingreso real', 'Variación'], derecha: [1, 2, 3, 4, 5], filas,
        grupos: [{ label: String(a), span: 4 }, { label: String(a - 1), span: 2 }],
        total: ['Totales', S(act.map(x => x.real)), S(act.map(x => x.pron)), S(act.map(x => x.real + x.pron)), S(prev.map(x => x.anterior)), ''],
        nota: 'Los ingresos en el día de la fecha hotelera reflejan las reservas y rooming pendientes de check-in; si existen no-show los datos pueden variar, igual que los ingresos de walk-in. Los montos se presentan sin impuestos. Los meses anteriores a la ventana de datos de ejemplo usan un histórico simulado.' };
    }
    // Pronóstico de ingresos
    const ds = porDia(h, f.desde, f.hasta, 'Proyectado');
    const tasa = f.moneda === 'CRC' ? TC : 1;
    const parte = (rs: typeof ds[number]['rs']) => { const i = rs.map(ingresoNoche); const a = i.reduce((s, x) => s + x.aloj, 0) * tasa, g = i.reduce((s, x) => s + x.reg, 0) * tasa, o = i.reduce((s, x) => s + x.otros, 0) * tasa; return [a, g, o, a + g + o]; };
    const nums = ds.map(d => [...parte(d.rs.filter(r => !r.rooming)), ...parte(d.rs.filter(r => r.rooming))]);
    const filas = ds.map((d, i) => [diaF(d.fecha), ...nums[i].map(n => usd(n, f.moneda)), usd(nums[i][3] + nums[i][7], f.moneda)]);
    const col = (j: number) => nums.reduce((s, x) => s + x[j], 0);
    return { headers: ['Día', 'Alojamiento', 'Rég. Aloj.', 'Otros', 'Total', 'Alojamiento', 'Rég. Aloj.', 'Otros', 'Total', 'Total'], derecha: [1, 2, 3, 4, 5, 6, 7, 8, 9], filas,
      grupos: [{ label: '', span: 1 }, { label: 'Reservas', span: 4 }, { label: 'Rooming', span: 4 }, { label: '', span: 1 }],
      total: ['Total', ...Array.from({ length: 8 }, (_, j) => usd(col(j), f.moneda)), usd(col(3) + col(7), f.moneda)], cabecera: <span>Moneda: <b>{f.moneda}</b> · Tasa: <b>{f.moneda === 'CRC' ? TC : 1}</b></span> };
  }, [h, rep, clave, total]); // eslint-disable-line react-hooks/exhaustive-deps -- `clave` resume todos los valores de f

  // ── Datos estándar (tabla en pantalla, documento al exportar) ──
  const R = resumen;
  const kv = (titulo: string, filas: [string, Celda][], total?: [string, Celda]) => ({ titulo, columnas: cols(['Concepto', 'Valor'], [1]), filas: filas.map(([a, b]): FilaRep => ({ c: [a, b] })), total: total ? [total[0], total[1]] : undefined });
  const datos: DatosReporte = rep === 'resumen' ? { bloques: [
    kv('Habitaciones', [['Día anterior', R.ant.length], ['Entradas', `${R.ent.length} (realizadas: ${R.ent.filter(r => r.checkinEn).length})`], ['Salidas', `${R.sal.length} (realizadas: ${R.sal.filter(r => r.checkoutEn).length})`], ['Previsión', R.prev.length], ['Fuera de orden', R.fo]], ['Disponibles', R.disp]),
    kv('Clientes', [['Día anterior', R.pax(R.ant)], ['Entradas', R.pax(R.ent)], ['Salidas', R.pax(R.sal)]], ['Previsión', R.pax(R.prev)]),
    kv('Ocupación', [['% Ocupación / Total', `${fmt2(pct(R.real.length, total))} %`], ['% Ocupación / Disponibilidad', `${fmt2(pct(R.real.length, total - R.fo))} %`], ['% Pronóstico / Total', `${fmt2(pct(R.prev.length, total))} %`], ['% Pronóstico / Disponibilidad', `${fmt2(pct(R.prev.length, total - R.fo))} %`]]),
    kv('Regímenes de alojamiento', R.reg.map(x => [REGIMENES[x.k], x.n]), ['Total', R.reg.reduce((s, x) => s + x.n, 0)]),
    { titulo: 'Clientes VIP en el día', columnas: cols(['Nombre', 'Habitación', 'Salida']), filas: R.vip.map((r): FilaRep => ({ c: [r.nombre, r.habitacion, fmtF(r.salida)] })), total: [`${R.vip.length} VIP`, '', ''] },
  ] } : { nota: typeof def.nota === 'string' ? def.nota : undefined, bloques: [{ columnas: cols(def.headers, def.derecha), grupos: def.grupos, filas: def.filas.map((c): FilaRep => ({ c })), total: def.filas.length ? def.total : undefined }] };
  const contadores: Contador[] = rep === 'resumen'
    ? [{ valor: R.prev.length, label: 'Ocupadas' }, { valor: `${fmt2(pct(R.prev.length, total))} %`, label: 'Ocupación' }, { valor: R.disp, label: 'Disponibles' }, { valor: R.ent.length, label: 'Entradas' }, { valor: R.sal.length, label: 'Salidas' }, { valor: R.fo, label: 'Fuera de orden' }]
    : [{ valor: def.filas.length, label: 'Filas' }, ...(def.cabecera ? [] : []), { valor: total, label: 'Habitaciones del hotel' }];
  const periodo = rep === 'resumen' ? fmtF(f.fecha) : rep === 'realizadas' || rep === 'diario' ? f.anio : `${fmtF(f.desde)} al ${fmtF(f.hasta)}`;
  return (
    <PantallaReporte titulo={titulo} archivo={`pronostico-${rep}`} filtros={fl} periodo={periodo} datos={datos} contadores={contadores}
      reportes={{ lista: REPORTES_PRONOSTICO, actual: rep, onCambiar: id => router.replace(`/pronostico-estadisticas/reportes?r=${id}`) }}
      antesDeTabla={def.cabecera && rep !== 'resumen' ? <span style={{ fontSize: 12, color: '#757575' }}>{def.cabecera}</span> : undefined}
      vacio="No hay datos para el período seleccionado." />
  );
}

function calcResumen(h: ReturnType<typeof useHotel>, fecha: string, total: number) {
    const d = fecha, ant = sumarDias(d, -1);
    const vivas = h.reservas.filter(r => cuentaOcupacion(r) && r.habitacion);
    const noche = (x: string) => vivas.filter(r => ocupaNoche(r, x));
    const pax = (rs: typeof vivas) => rs.reduce((s, r) => s + r.adultos + r.ninos, 0);
    const ent = vivas.filter(r => r.entrada === d), sal = vivas.filter(r => r.salida === d);
    const prev = noche(d), real = prev.filter(r => r.estado !== 'Confirmada');
    const fo = bloqueadasEn(h.habitaciones, h.tareas, d, h.bloqueos).size;
    const disp = total - prev.length - fo;
    const reg = Object.keys(REGIMENES).map(k => ({ k, n: prev.filter(r => r.regimen === k).length })).filter(x => x.n);
    const vip = vivas.filter(r => r.vip && (ocupaNoche(r, d) || r.entrada === d));
    return { ant: noche(ant), ent, sal, prev, real, fo, disp, reg, vip, pax };
}
