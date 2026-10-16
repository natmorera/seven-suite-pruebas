'use client';
// Motor de reportes de auditoría: cada reporte se calcula del store para la
// fecha hotelera del cierre y se presenta con la plantilla «Front Desk ·
// Auditoría». También calcula la preauditoría (verificaciones y errores).
import { type ReactNode } from 'react';
import { C, FONT, radius } from '@/components/suite/tokens';
import { DocumentoReporte } from '@/components/reportes/Documento';
import { cols, type DatosReporte, type FilaRep } from '@/components/reportes/modelo';
import { HOY, NACIONALIDADES, REGIMENES, TIPOS, fmtF, noches, sumarDias, type Reserva } from '@/components/hotel/datos';
import { cuentaOcupacion, numeroDe, precioTarifa, usoDe } from '@/components/hotel/reservas';
import { fmtMon, lineasReserva, r2 } from '@/components/hotel/finanzas';
import { saldoReserva, useHotel } from '@/components/hotel/store';
import { reporteAud } from '@/components/hotel/auditoria';
import { bloqueadasEn } from '@/components/reservaciones/inventario';
import { ingresoNoche } from '@/components/pronostico/estadisticas';

type H = ReturnType<typeof useHotel>;
type Celda = string | number;
export interface Tabla { titulo?: string; headers: string[]; filas: Celda[][]; derecha?: number[]; total?: Celda[] }
export interface DocAud { titulo: string; subtitulo: string; resumen?: [string, Celda][]; tablas: Tabla[]; registros: number; vacio?: string }

const nombreT = (id: string) => TIPOS.find(t => t.id === id)?.nombre ?? id;
const habTxt = (r: Reserva) => `${nombreT(r.tipo)} ${r.habitacion || '—'}`;
const nac = (c: string) => NACIONALIDADES[c] ?? c;
const enNoche = (r: Reserva, d: string) => r.habitacion && cuentaOcupacion(r) && r.entrada <= d && r.salida > d && (d < HOY || r.estado !== 'Confirmada' || r.entrada > HOY);
const enCasa = (h: H, d: string) => h.reservas.filter(r => (d === HOY ? r.estado === 'In-House' : enNoche(r, d))).sort((a, b) => a.habitacion.localeCompare(b.habitacion));
const m = (n: number) => fmtMon(n);

// ── Preauditoría ────────────────────────────────────────────────────────────
export interface Preaud { categorias: { nombre: string; errores: number }[]; secciones: Tabla[]; marcados: string[] }
export const CHECKS_PRE = ['Facturas de empresas', 'Alojamientos de Directos', 'Prórrogas', 'Fuera de orden', 'Cierres de Puntos de Ventas', 'Clientes Casa'];
export function preauditoria(h: H, marcados: string[] = CHECKS_PRE.slice(0, 4)): Preaud {
  const casa = h.reservas.filter(r => r.estado === 'In-House');
  const conEmpresa = casa.filter(r => r.cliente !== 'Huésped Individual');
  const sinFactura = conEmpresa.filter(r => !h.facturas.some(f => f.reservaId === r.id) && saldoReserva(r) > 0.005);
  const directos = casa.filter(r => r.tarifa === 'DIR' && r.precio !== precioTarifa(r.tipo, 'DIR'));
  const sinCargo = casa.filter(r => !r.precio);
  const sinProrroga = casa.filter(r => r.salida <= HOY);
  const bloq = bloqueadasEn(h.habitaciones, h.tareas, HOY, h.bloqueos);
  const fueraOrden = h.reservas.filter(r => (r.estado === 'Confirmada' || r.estado === 'In-House') && bloq.has(r.habitacion) && r.entrada <= HOY && r.salida > HOY);
  const turnos = h.turnos.filter(t => !t.fin);
  const sinPerfil = casa.filter(r => !r.perfilId && !r.identificacion);
  const sec: Tabla[] = [];
  const cat: { nombre: string; errores: number }[] = [];
  if (marcados.includes('Facturas de empresas')) {
    cat.push({ nombre: 'Factura de Empresas', errores: sinFactura.length });
    sec.push({ titulo: 'Habitaciones sin facturas de empresa', headers: ['Habitación', 'Empresa', 'Tarifa', 'Saldo'], filas: sinFactura.map(r => [habTxt(r), r.empresa, r.tarifa, m(saldoReserva(r))]) });
  }
  if (marcados.includes('Alojamientos de Directos')) {
    cat.push({ nombre: 'Alojamiento de Directos', errores: directos.length + sinCargo.length });
    sec.push({ titulo: 'Habitaciones de directos con precios diferentes a la tarifa', headers: ['Habitación', 'Tarifa', 'Alojamiento', 'Tarifa'], filas: directos.map(r => [habTxt(r), r.tarifa, m(r.precio), m(precioTarifa(r.tipo, 'DIR'))]) });
    sec.push({ titulo: 'Habitaciones sin cargos de alojamiento', headers: ['Habitación', 'Tarifa'], filas: sinCargo.map(r => [habTxt(r), r.tarifa]) });
  }
  if (marcados.includes('Prórrogas')) {
    cat.push({ nombre: 'Prórrogas', errores: sinProrroga.length });
    sec.push({ titulo: 'Habitaciones sin prórroga', headers: ['Habitación', 'Huésped', 'Salida prevista'], filas: sinProrroga.map(r => [habTxt(r), r.nombre, fmtF(r.salida)]) });
  }
  if (marcados.includes('Fuera de orden')) {
    cat.push({ nombre: 'Fuera de Orden', errores: fueraOrden.length });
    sec.push({ titulo: 'Reservas asignadas a habitaciones fuera de orden', headers: ['Habitación', 'Reserva', 'Estado'], filas: fueraOrden.map(r => [habTxt(r), numeroDe(r), r.estado]) });
  }
  if (marcados.includes('Cierres de Puntos de Ventas')) {
    cat.push({ nombre: 'Cierre de POS', errores: turnos.length });
    sec.push({ titulo: 'Turnos de caja / puntos de venta abiertos', headers: ['Turno', 'Cajero', 'Inicio'], filas: turnos.map(t => [t.id, t.cajero, t.inicio.replace('T', ' ')]) });
  }
  if (marcados.includes('Clientes Casa')) {
    cat.push({ nombre: 'Clientes Casa', errores: sinPerfil.length });
    sec.push({ titulo: 'Huéspedes en casa sin identificación', headers: ['Habitación', 'Huésped', 'Reserva'], filas: sinPerfil.map(r => [habTxt(r), r.nombre, numeroDe(r)]) });
  }
  return { categorias: cat, secciones: sec, marcados };
}

// ── Reportes ────────────────────────────────────────────────────────────────
export function generarReporte(h: H, codigo: string, fecha = HOY): DocAud {
  const rep = reporteAud(codigo);
  const titulo = rep?.descripcion ?? codigo;
  const doc = (subtitulo: string, tablas: Tabla[], resumen?: [string, Celda][], vacio?: string): DocAud => ({ titulo, subtitulo, tablas, resumen, registros: tablas.reduce((s, t) => s + t.filas.length, 0), vacio });
  const casa = enCasa(h, fecha);
  const total = h.habitaciones.length;
  const pax = (rs: Reserva[]) => rs.reduce((s, r) => s + r.adultos + r.ninos, 0);
  const agrupa = (rs: Reserva[], k: (r: Reserva) => string) => { const mm = new Map<string, Reserva[]>(); rs.forEach(r => mm.set(k(r), [...(mm.get(k(r)) ?? []), r])); return [...mm.entries()].sort((a, b) => a[0].localeCompare(b[0])); };
  const eventos = (txt: RegExp) => Object.values(h.bitacoraRes).flat().filter(e => e.fecha.startsWith(fecha) && txt.test(e.accion));
  switch (codigo) {
    case 'PRE': { const p = preauditoria(h, CHECKS_PRE); return { ...doc('Verificaciones previas al cierre', p.secciones.filter(s => s.filas.length), p.categorias.map(c => [c.nombre, c.errores ? `${c.errores} errores` : 'Sin errores'])) }; }
    case 'LOHAB': {
      const fo = bloqueadasEn(h.habitaciones, h.tareas, fecha, h.bloqueos).size;
      return doc('Habitaciones ocupadas en la fecha hotelera', [{ headers: ['Habitación', 'Cliente', 'Pax', 'Tarifa', 'Reg.', 'Entrada', 'Salida', 'Observaciones', 'Precio Dir', 'Precio Emp.'], derecha: [2, 8, 9],
        filas: casa.map(r => [habTxt(r), r.nombre, r.adultos + r.ninos, r.tarifa, r.regimen, fmtF(r.entrada), fmtF(r.salida), r.observaciones || '—', r.cliente === 'Huésped Individual' ? m(r.precio) : '—', r.cliente !== 'Huésped Individual' ? m(r.precio) : '—']) }],
      [['Total Ocupación', casa.length], ['Total F/O', fo], ['Total Libres', total - casa.length - fo], ['Total Habitaciones', total], ['Total Clientes', pax(casa)]]);
    }
    case 'LOCL': return doc('Clientes alojados', [{ headers: ['Cliente', 'Habitación', 'Nacionalidad', 'Pax', 'Tarifa', 'Entrada', 'Salida'], derecha: [3], filas: [...casa].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(r => [r.nombre, habTxt(r), nac(r.nacionalidad), r.adultos + r.ninos, r.tarifa, fmtF(r.entrada), fmtF(r.salida)]) }]);
    case 'LOCLN': return doc('Clientes alojados por nacionalidad', [{ headers: ['Nacionalidad', 'Cliente', 'Habitación', 'Tarifa', 'Entrada', 'Salida', 'Adultos'], derecha: [6], filas: [...casa].sort((a, b) => nac(a.nacionalidad).localeCompare(nac(b.nacionalidad))).map(r => [nac(r.nacionalidad), r.nombre, habTxt(r), r.tarifa, fmtF(r.entrada), fmtF(r.salida), r.adultos]) }]);
    case 'LOCLNT': { const g = agrupa(casa, r => nac(r.nacionalidad)); return doc('Totales por nacionalidad', [{ headers: ['Nacionalidad', 'Adultos', 'Niños', 'Habitaciones'], derecha: [1, 2, 3], filas: g.map(([k, rs]) => [k, rs.reduce((s, r) => s + r.adultos, 0), rs.reduce((s, r) => s + r.ninos, 0), rs.length]), total: ['Total:', casa.reduce((s, r) => s + r.adultos, 0), casa.reduce((s, r) => s + r.ninos, 0), casa.length] }]); }
    case 'LOCLR': return doc('Clientes alojados por régimen', [{ headers: ['Régimen', 'Cliente', 'Nacionalidad', 'Habitación', 'Tarifa', 'Entrada', 'Salida', 'Ad.', 'Crédito', 'Precio'], derecha: [7, 9], filas: [...casa].sort((a, b) => a.regimen.localeCompare(b.regimen)).map(r => [r.regimen, r.nombre, nac(r.nacionalidad), habTxt(r), r.tarifa, fmtF(r.entrada), fmtF(r.salida), r.adultos, r.credito ? 'Sí' : 'No', m(r.precio)]) }]);
    case 'LOCLRT': case 'LOHABR': { const g = agrupa(casa, r => r.regimen); return doc('Totales por régimen de alojamiento', [codigo === 'LOCLRT'
      ? { headers: ['Régimen', 'Adultos', 'Niños', 'Habitaciones'], derecha: [1, 2, 3], filas: g.map(([k, rs]) => [`${k} · ${REGIMENES[k] ?? ''}`, rs.reduce((s, r) => s + r.adultos, 0), rs.reduce((s, r) => s + r.ninos, 0), rs.length]), total: ['Total:', casa.reduce((s, r) => s + r.adultos, 0), casa.reduce((s, r) => s + r.ninos, 0), casa.length] }
      : { headers: ['Régimen', 'Clientes', 'Habitaciones'], derecha: [1, 2], filas: g.map(([k, rs]) => [`${k} · ${REGIMENES[k] ?? ''}`, pax(rs), rs.length]), total: ['Total:', pax(casa), casa.length] }]); }
    case 'CARAUT': {
      const tablas = casa.map(r => { const ls = lineasReserva(r).filter(l => l.fecha === fecha); return { titulo: `Habitación ${habTxt(r)} · ${r.nombre}`, headers: ['Servicio', 'Periodo', 'Precio', 'Cantidad', 'Orden Fact.', '# de Cheque'], derecha: [2, 3], filas: ls.map(l => [l.descripcion, `${fmtF(r.entrada)} - ${fmtF(r.salida)}`, m(l.importe), 1, 1, `7${r.numero.replace(/\D/g, '')}`]), total: ['Total:', '', m(ls.reduce((s, l) => s + l.importe, 0)), '', '', ''] }; }).filter(t => t.filas.length);
      const cargado = casa.reduce((s, r) => s + lineasReserva(r).filter(l => l.fecha === fecha).reduce((a, l) => a + l.importe, 0), 0);
      return doc('Relación de cargos automáticos del día', tablas, [['Habitaciones', tablas.length], ['Total cargado', m(cargado)]]);
    }
    case 'PICK': {
      const tablas = casa.map(r => { const ms = (h.foliosRes[r.id]?.movs ?? []).filter(x => !x.historico); return { titulo: `Habitación ${habTxt(r)} · ${r.nombre} · ${r.tarifa} · ${fmtF(r.entrada)} - ${fmtF(r.salida)}`, headers: ['Fecha', 'Concepto', 'Descripción', 'Motivo', 'Importe'], derecha: [4], filas: ms.map(x => [fmtF(x.fecha), x.concepto, x.descripcion, x.motivo || x.ref || '—', m(x.importe)]), total: ['Total:', '', '', '', m(ms.reduce((s, x) => s + x.importe, 0))] }; }).filter(t => t.filas.length);
      return doc('Cargos manuales y de puntos de venta pendientes en folios de habitación', tablas, undefined, 'No hay saldos en el pick.');
    }
    case 'CkOuts/Pro': { const rs = casa.filter(r => r.salida <= fecha); return doc('Habitaciones con salida vencida sin check-out ni prórroga', [{ headers: ['Habitación', 'Cliente', 'Tarifa', 'Entrada', 'Salida', 'Saldo'], derecha: [5], filas: rs.map(r => [habTxt(r), r.nombre, r.tarifa, fmtF(r.entrada), fmtF(r.salida), m(saldoReserva(r))]) }]); }
    case 'CKINTER': { const rs = h.reservas.filter(r => r.estado === 'Confirmada' && r.entrada === fecha); return doc('Reservas en proceso de ingreso a la fecha hotelera', [{ titulo: `Reservas en check-in`, headers: ['Hab.', 'Uso', 'Número', 'Nombre', 'Tarifa', 'Entrada', 'Salida'], filas: rs.map(r => [r.habitacion || '—', `${r.tipo}_${usoDe(r)}`, r.numero, r.nombre, r.tarifa, fmtF(r.entrada), fmtF(r.salida)]) }]); }
    case 'SALCC': case 'FAH': { const rs = casa.filter(r => codigo === 'SALCC' || saldoReserva(r) > 0.005); return doc(codigo === 'SALCC' ? 'Saldo de las cuentas de huéspedes en casa' : 'Folios de habitación con saldo abierto', [{ headers: ['Habitación', 'Cliente', 'Folio', 'Cargado', 'Pagado', 'Dep. Garantía', 'Saldo'], derecha: [3, 4, 5, 6],
      filas: rs.map(r => [habTxt(r), r.nombre, `7${r.numero.replace(/\D/g, '')}`, m(r2(saldoReserva(r) + r.pagado)), m(r.pagado), m(r.depGarantia), m(saldoReserva(r))]), total: ['Total', '', '', '', m(rs.reduce((s, r) => s + r.pagado, 0)), m(rs.reduce((s, r) => s + r.depGarantia, 0)), m(rs.reduce((s, r) => s + saldoReserva(r), 0))] }]); }
    case 'EDCC': { const b = (r: Reserva) => { const d = noches(r.entrada, fecha); return d <= 1 ? '0-1 días' : d <= 3 ? '2-3 días' : d <= 7 ? '4-7 días' : 'Más de 7 días'; }; const g = agrupa(casa, b);
      return doc('Antigüedad de las cuentas de huéspedes en casa', [{ headers: ['Antigüedad', 'Cuentas', 'Saldo'], derecha: [1, 2], filas: g.map(([k, rs]) => [k, rs.length, m(rs.reduce((s, r) => s + saldoReserva(r), 0))]) }]); }
    case 'FAAG': { const g = agrupa(casa.filter(r => r.cliente === 'Agencia de Viajes'), r => r.empresa); return doc('Saldos abiertos por agencia', [{ headers: ['Agencia', 'Habitaciones', 'Saldo'], derecha: [1, 2], filas: g.map(([k, rs]) => [k, rs.length, m(rs.reduce((s, r) => s + saldoReserva(r), 0))]) }]); }
    case 'FAFE': { const fs = h.foliosCta.filter(f => f.clase === 'externo' && f.estado === 'Abierto'); return doc('Folios externos abiertos', [{ headers: ['Folio', 'Nombre', 'Emisión', 'Vencimiento', 'Moneda'], filas: fs.map(f => [f.numero, f.nombre, fmtF(f.emision), fmtF(f.vencimiento), f.moneda]) }]); }
    case 'FACC': case 'FEI': { const fs = h.facturas.filter(f => f.fecha === fecha && (codigo === 'FACC' || f.empresa)); return doc(codigo === 'FACC' ? 'Facturas cerradas en el día' : 'Facturas a empresas emitidas en el día', [{ headers: ['Documento', 'Tipo', 'Cliente', 'Empresa', 'Forma de pago', 'Importe'], derecha: [5], filas: fs.map(f => [f.documento, f.tipo, f.cliente, f.empresa || '—', f.formaPago, fmtMon(f.impFactura, f.moneda)]) }]); }
    case 'HSCA': return doc('Habitaciones en casa sin cargo de hospedaje', [{ headers: ['Habitación', 'Cliente', 'Tarifa'], filas: casa.filter(r => !r.precio).map(r => [habTxt(r), r.nombre, r.tarifa]) }]);
    case 'HDPT': return doc('Directos con precio distinto al de la tarifa', [{ headers: ['Habitación', 'Cliente', 'Alojamiento', 'Tarifa'], derecha: [2, 3], filas: casa.filter(r => r.tarifa === 'DIR' && r.precio !== precioTarifa(r.tipo, 'DIR')).map(r => [habTxt(r), r.nombre, m(r.precio), m(precioTarifa(r.tipo, 'DIR'))]) }]);
    case 'PRODD': case 'LEST': {
      const ing = casa.map(ingresoNoche); const aloj = ing.reduce((s, x) => s + x.aloj, 0), reg = ing.reduce((s, x) => s + x.reg, 0), otros = ing.reduce((s, x) => s + x.otros, 0);
      return doc(codigo === 'PRODD' ? 'Producción del día por concepto' : 'Indicadores del día', [{ headers: ['Concepto', 'Importe'], derecha: [1], filas: [['Hospedaje', m(aloj)], ['Régimen de alojamiento', m(reg)], ['Otros servicios', m(otros)]], total: ['Total producción', m(aloj + reg + otros)] }],
        [['Ocupación', `${casa.length} / ${total} (${r2((casa.length / total) * 100)} %)`], ['ADR', m(casa.length ? (aloj + reg) / casa.length : 0)], ['RevPAR', m((aloj + reg) / total)], ['Clientes', pax(casa)]]);
    }
    case 'MANO': { const ms = h.movsCaja.filter(x => x.fecha === fecha); return doc('Movimientos de caja del día', [{ headers: ['Hora', 'Tipo', 'Concepto', 'Referencia', 'Método', 'Importe'], derecha: [5], filas: ms.map(x => [x.hora, x.tipo, x.concepto, x.referencia, x.metodo, fmtMon(x.tipo === 'Egreso' ? -x.importe : x.importe, x.moneda)]), total: ['Neto USD', '', '', '', '', m(ms.reduce((s, x) => s + (x.tipo === 'Egreso' ? -x.usd : x.usd), 0))] }]); }
    case 'NOSH': { const rs = h.reservas.filter(r => r.estado === 'No-Show' && r.entrada <= fecha && r.entrada >= sumarDias(fecha, -7)); return doc('Reservas no presentadas (últimos 7 días)', [{ headers: ['Reserva', 'Cliente', 'Tarifa', 'Entrada', 'Salida', 'Dep. Garantía'], derecha: [5], filas: rs.map(r => [r.numero, r.nombre, r.tarifa, fmtF(r.entrada), fmtF(r.salida), m(r.depGarantia)]) }]); }
    case 'CAMH': case 'CAMAH': { const ev = eventos(/Habitación cambiada|Habitación asignada/); return doc('Cambios de habitación del día', [{ headers: ['Hora', 'Usuario', 'Acción', 'Antes', 'Después'], filas: ev.map(e => [e.fecha.slice(11, 16), e.usuario, e.accion, e.antes, e.despues]) }]); }
    case 'PROR': { const ev = eventos(/Prórroga/); return doc('Prórrogas realizadas en el día', [{ headers: ['Hora', 'Usuario', 'Acción', 'Antes', 'Después'], filas: ev.map(e => [e.fecha.slice(11, 16), e.usuario, e.accion, e.antes, e.despues]) }]); }
    case 'CKANU': { const ev = eventos(/revertido/); return doc('Check-ins revertidos en el día', [{ headers: ['Hora', 'Usuario', 'Acción', 'Antes', 'Después'], filas: ev.map(e => [e.fecha.slice(11, 16), e.usuario, e.accion, e.antes, e.despues]) }]); }
    case 'DEPG': { const ds = h.depositos.filter(d => d.recibido.startsWith(fecha) || d.anulado?.fecha.startsWith(fecha)); return doc('Depósitos en garantía recibidos o anulados', [{ headers: ['Número', 'Nombre', 'Tipo', 'Estado', 'Importe'], derecha: [4], filas: ds.map(d => [d.numero, d.nombre, d.tipo, d.estado, fmtMon(d.importe, d.moneda)]) }]); }
    case 'CORF': case 'CORFC': case 'TRASC': {
      const tipo = codigo === 'TRASC' ? 'Traslado' : 'Corrección';
      const ms = Object.entries(h.foliosRes).flatMap(([rid, e]) => e.movs.filter(x => x.tipo === tipo && x.fecha === fecha).map(x => ({ x, f: `7${(h.reservas.find(r => r.id === rid)?.numero ?? '').replace(/\D/g, '')}` })))
        .concat(h.foliosCta.flatMap(c => c.movs.filter(x => x.tipo === tipo && x.fecha === fecha).map(x => ({ x, f: c.numero }))));
      return doc(`${tipo === 'Traslado' ? 'Traslados de cargos' : 'Correcciones a folios'} del día`, [{ headers: ['Folio', 'Hora', 'Concepto', 'Descripción', 'Motivo', 'Importe'], derecha: [5], filas: ms.map(({ x, f }) => [f, x.hora, x.concepto, x.descripcion, x.motivo, m(x.importe)]) }]);
    }
    case 'DESAUT': return doc('Descuentos aplicados a habitaciones en casa', [{ headers: ['Habitación', 'Cliente', 'Tarifa', 'Descuento'], derecha: [3], filas: casa.filter(r => r.descuento).map(r => [habTxt(r), r.nombre, r.tarifa, m(r.descuento)]) }]);
    case 'ASIC': {
      const ing = h.movsCaja.filter(x => x.fecha === fecha && x.tipo === 'Ingreso').reduce((s, x) => s + x.usd, 0), egr = h.movsCaja.filter(x => x.fecha === fecha && x.tipo === 'Egreso').reduce((s, x) => s + x.usd, 0);
      const prod = casa.reduce((s, r) => s + ingresoNoche(r).total, 0);
      return doc('Asientos contables generados por el cierre', [{ headers: ['Cuenta', 'Descripción', 'Debe', 'Haber'], derecha: [2, 3], filas: [['1101001', 'Caja recepción', m(ing), m(egr)], ['1202999', 'CxC huéspedes en casa', m(prod), m(ing)], ['4101001', 'Ingresos por hospedaje', '—', m(prod / 1.13)], ['2104001', 'IVA por pagar', '—', m(prod - prod / 1.13)]] }]);
    }
    default: return doc('Sin movimientos registrados para la fecha del cierre', [{ headers: ['Detalle'], filas: [] }], undefined, codigo === 'LLAM' ? 'La central telefónica no está integrada: no hay llamadas para procesar.' : 'Sin registros para la fecha hotelera.');
  }
}

/** Filas planas para exportar un documento de auditoría a CSV / XLS. */
export function filasExport(d: DocAud): { headers: string[]; filas: Celda[][] } {
  const filas: Celda[][] = [...(d.resumen ?? []).map(([l, v]) => [l, v])];
  d.tablas.forEach(t => { if (t.titulo) filas.push([t.titulo]); filas.push(t.headers, ...t.filas); if (t.total) filas.push(t.total); filas.push([]); });
  return { headers: [d.titulo], filas };
}

/** Datos estándar de reporte a partir del documento de auditoría. */
export const datosDeAud = (d: DocAud): DatosReporte => ({ bloques: [
  ...(d.resumen ? [{ titulo: 'Resumen', columnas: cols(['Concepto', 'Valor'], [1]), filas: d.resumen.map(([l, v]): FilaRep => ({ c: [l, v] })) }] : []),
  ...d.tablas.filter(t => t.filas.length).map(t => ({ titulo: t.titulo, columnas: cols(t.headers, t.derecha), filas: t.filas.map((c): FilaRep => ({ c })), total: t.total })),
] });

/** Documento de auditoría: el mismo documento estándar de todos los reportes. */
export function HojaAuditoria({ d, fecha, extra }: { d: DocAud; fecha: string; extra?: ReactNode }) {
  return (
    <div style={{ fontFamily: FONT, color: C.n900, padding: '22px 26px' }}>
      {extra}
      <DocumentoReporte titulo={d.titulo} periodo={fmtF(fecha)} linea={null} datos={datosDeAud(d)} />
      {d.registros === 0 && <p style={{ textAlign: 'center', color: C.n700, padding: 20, border: `1px dashed ${C.n500}`, borderRadius: radius.md, fontSize: 12 }}>{d.vacio ?? 'Sin registros para la fecha hotelera.'}</p>}
    </div>
  );
}
