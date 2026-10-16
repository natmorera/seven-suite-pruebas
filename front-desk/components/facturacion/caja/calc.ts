// Cálculos de caja: totales de un turno, saldo esperado, comprobantes del
// sistema y consolidado del día. Todo en USD (equivalente al TC del día).
import { INICIAL } from '@/components/configuracion/inicial';
import { HOY } from '@/components/hotel/datos';
import {
  TC, cajeroDe, minutosEntre, r2, totalComprobantesUSD, totalConteo,
  type Comprobantes, type Conteo, type Finanzas, type MovCaja, type Turno,
} from '@/components/hotel/finanzas';

type F = Pick<Finanzas, 'turnos' | 'movsCaja'>;

export const CONFIG_CAJA = INICIAL.caja;
/** Fondo fijo configurado (USD + CRC al TC del día). */
export const FONDO_FIJO = r2(CONFIG_CAJA.montoUSD + CONFIG_CAJA.montoCRC / TC);

export function resumenTurno(f: F, t: Turno) {
  const movs = f.movsCaja.filter(m => m.turnoId === t.id).sort((a, b) => a.hora.localeCompare(b.hora));
  const ing = movs.filter(m => m.tipo === 'Ingreso'), egr = movs.filter(m => m.tipo === 'Egreso');
  const ingresos = movs.length ? r2(ing.reduce((s, m) => s + m.usd, 0)) : t.ingresos ?? 0;
  const egresos = movs.length ? r2(egr.reduce((s, m) => s + m.usd, 0)) : t.egresos ?? 0;
  const cash = (mon: 'USD' | 'CRC') => movs.filter(m => m.metodo === 'Efectivo' && m.moneda === mon).reduce((s, m) => s + (m.tipo === 'Ingreso' ? m.importe : -m.importe), 0);
  const apUSD = t.conteoApertura ? totalConteo(t.conteoApertura, 'USD') : t.saldoInicial;
  const apCRC = t.conteoApertura ? totalConteo(t.conteoApertura, 'CRC') : 0;
  const efectivoUSD = r2(apUSD + cash('USD'));
  const efectivoCRC = r2(apCRC + cash('CRC'));
  const suma = (pred: (m: MovCaja) => boolean) => r2(movs.filter(m => m.tipo === 'Ingreso' && pred(m)).reduce((s, m) => s + m.usd, 0));
  const tarjetas = suma(m => m.metodo === 'Tarjeta');
  const transf = suma(m => m.metodo === 'Transferencia' || m.metodo === 'Link de pago');
  const sistema: Comprobantes = {
    pos1: r2(movs.filter(m => m.tipo === 'Ingreso' && m.metodo === 'Tarjeta' && m.moneda !== 'CRC').reduce((s, m) => s + m.usd, 0)),
    pos2: r2(movs.filter(m => m.tipo === 'Ingreso' && m.metodo === 'Tarjeta' && m.moneda === 'CRC').reduce((s, m) => s + m.importe, 0)),
    link: suma(m => m.metodo === 'Link de pago'),
    transf: suma(m => m.metodo === 'Transferencia'),
  };
  const esperado = r2(t.saldoInicial + ingresos - egresos);
  const ultima = movs.at(-1)?.hora ?? null;
  return { movs, ingresos, egresos, nIng: movs.length ? ing.length : t.nMovs ?? 0, nEgr: egr.length, esperado, efectivoUSD, efectivoCRC, tarjetas, transf, sistema, ultima };
}

/** Turno anterior (el último cerrado) y el saldo que hereda el siguiente según la modalidad de fondo. */
export function heredado(f: F) {
  const anterior = [...f.turnos].filter(t => t.fin).sort((a, b) => (a.fin! < b.fin! ? -1 : 1)).at(-1) ?? null;
  const saldo = CONFIG_CAJA.modalidad === 'fijo' ? FONDO_FIJO : anterior?.efectivoFinal ?? 0;
  return { anterior, saldo, conteo: CONFIG_CAJA.modalidad === 'fijo' ? undefined : anterior?.conteoCierre };
}

export interface Declaracion { conteo: Conteo; comprobantes: Comprobantes }
export function totalesDeclarados(d: Declaracion) {
  const d1 = totalComprobantesUSD(d.comprobantes);
  const d2 = r2(totalConteo(d.conteo, 'USD'));
  const d3 = r2(totalConteo(d.conteo, 'CRC') / TC);
  return { d1, d2, d3, total: r2(d1 + d2 + d3) };
}

export const turnosDelDia = (f: F, fecha = HOY) => f.turnos.filter(t => t.fecha === fecha).sort((a, b) => a.inicio.localeCompare(b.inicio));
/** Faltantes de un cajero en los últimos 30 días. */
export function diferencias30(f: F, cajero: string) {
  const desde = new Date(HOY + 'T12:00:00'); desde.setDate(desde.getDate() - 30);
  const ts = f.turnos.filter(t => t.cajero === cajero && t.fin && t.fecha >= desde.toISOString().slice(0, 10));
  const faltantes = ts.filter(t => t.diferencia < -0.005);
  return { turnos: ts, faltantes, total: r2(faltantes.reduce((s, t) => s + t.diferencia, 0)), promedio: ts.length ? r2(ts.reduce((s, t) => s + t.diferencia, 0) / ts.length) : 0 };
}

/** Consolidado del día: cada cajero aporta su operado; el saldo inicial solo cuenta en el primer turno (una sola caja por hotel). */
export function consolidadoDia(f: F) {
  const ts = turnosDelDia(f);
  const filas = ts.map((t, i) => {
    const r = resumenTurno(f, t);
    const base = i === 0 ? t.saldoInicial : 0;
    const esperado = r2(base + r.ingresos - r.egresos);
    const declarado = t.fin ? r2((t.declarado ?? r.esperado) - (i === 0 ? 0 : t.saldoInicial)) : null;
    return { t, r, saldoInicial: i === 0 ? t.saldoInicial : null, esperado, declarado, diferencia: t.fin ? t.diferencia : null };
  });
  const cerrados = ts.filter(t => t.fin);
  const metodo = (k: keyof Comprobantes) => r2(cerrados.reduce((s, t) => s + (t.comprobantes?.[k] ?? 0), 0));
  const efUSD = r2(cerrados.reduce((s, t) => s + totalConteo(t.conteoCierre, 'USD'), 0));
  const efCRC = r2(cerrados.reduce((s, t) => s + totalConteo(t.conteoCierre, 'CRC'), 0));
  const saldoInicial = ts[0]?.saldoInicial ?? 0;
  const ingresos = r2(filas.reduce((s, x) => s + x.r.ingresos, 0));
  const egresos = r2(filas.reduce((s, x) => s + x.r.egresos, 0));
  const esperado = r2(saldoInicial + ingresos - egresos);
  const declarado = r2(filas.reduce((s, x) => s + (x.declarado ?? x.esperado), 0));
  const diferencia = r2(cerrados.reduce((s, t) => s + t.diferencia, 0));
  return {
    turnos: ts, filas, activos: ts.filter(t => !t.fin), saldoInicial, ingresos, egresos, esperado, declarado, diferencia,
    nMovs: filas.reduce((s, x) => s + (x.r.movs.length || x.t.nMovs || 0), 0),
    metodos: { efUSD, efCRC, pos1: metodo('pos1'), pos2: metodo('pos2'), link: metodo('link'), transf: metodo('transf') },
  };
}

export const duracion = (t: Turno, ahora: string | null) => (t.fin ? minutosEntre(t.inicio, t.fin) : ahora ? minutosEntre(t.inicio, ahora) : 0);
export const esResponsable = (u: string) => ['Responsable', 'Administrador'].includes(cajeroDe(u)?.rol ?? '');
