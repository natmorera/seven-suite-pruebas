'use client';
import { ESTADO_DOC_COLOR } from '@/data/estadosHacienda';

import { useEffect, useState } from 'react';
import { tarifasIva, tarifaPorcentaje } from '@/data/catalogosHacienda';
import { esGuatemalaActual, simboloLocal } from '@/lib/paisActual';
import { calcularLinea } from '@/lib/calculoFactura';
import { tipoDteDe } from '@/lib/perfilPais';

export type Lado = 'venta' | 'compra';
export type CreditoFiscal = 'pleno' | 'parcial' | 'sin_derecho';
export type Moneda = 'CRC' | 'USD';

export const ESTADOS = ['Aceptado', 'Recibido', 'Procesando', 'Rechazado', 'Error', 'Emitido'] as const;
export const ESTADO_COLOR = ESTADO_DOC_COLOR;

// Tarifas de IVA > 0 del catálogo oficial (13, 4, 2, 1, 0.5 y la transitoria
// de 8% en notas), de mayor a menor. Las columnas de los reportes se arman
// con las tarifas que realmente aparecen en el período, no con una lista fija.
// Según el país de la empresa (Costa Rica o Guatemala).
export const tarifasOficiales = (): number[] => Array.from(new Set(tarifasIva().map(t => t.tarifa as number)))
  .filter(t => t > 0).sort((a, b) => b - a);

export interface MontosTarifa { base: number; iva: number }

export interface Comprobante {
  id: string;
  lado: Lado;
  tipo: string;
  consecutivo: string;
  clave: string;
  contraparte: string;          // cliente (venta) o proveedor (compra)
  fecha: string;                // ISO
  estado: string;
  origen: string;               // módulo origen (ventas) u origen de carga (compras)
  moneda: Moneda;
  tipoCambio: number;
  // Montos en la moneda del documento, YA con signo (notas de crédito en negativo)
  gravado: number;
  exento: number;
  descuentos: number;
  iva: number;
  otros: number;
  total: number;
  porTarifa: Record<string, MontosTarifa>;   // clave = tarifa como texto ("13", "0.5")
  // Ventas a tarifa 0% (D-150): con derecho a crédito (códigos 01 y 05, p. ej.
  // exportaciones) y sin derecho a crédito (código 11). También forman parte de «exento».
  ceroConCredito: number;
  ceroSinCredito: number;
  // IVA devuelto: servicios de salud privados (CABYS 93…) pagados con tarjeta
  ivaDevuelto: number;
  credito: CreditoFiscal | null;             // solo compras
  actividad: string;                         // "551001 - Servicios de alojamiento"
  motivoRechazo: string | null;
  incompleto: boolean;                       // borrador o sin consecutivo: nunca suma en reportes fiscales
  estimado: boolean;                         // montos derivados del encabezado (sin líneas / sin desglose)
  // Desglose por naturaleza (CABYS 0-4 bienes, 5-9 servicios) para el filtro
  // "Bienes / Servicios". Sin líneas: ventas se toman como servicios y
  // compras como bienes.
  partes: Record<Naturaleza, Partida>;
  // Guatemala: tipo de DTE (FACT, FCAM, NCRE…) y NIT de la contraparte
  tipoDte: string;
  nit: string;
}
export type Naturaleza = 'bienes' | 'servicios';
export interface Partida { gravado: number; exento: number; descuentos: number; iva: number; porTarifa: Record<string, MontosTarifa> }
const partidaVacia = (): Partida => ({ gravado: 0, exento: 0, descuentos: 0, iva: 0, porTarifa: {} });
// CABYS (Costa Rica): 1.er dígito 0-4 bienes, 5-9 servicios. Guatemala: B (bien) o S (servicio).
export const naturalezaCabys = (c: string | null | undefined, porDefecto: Naturaleza): Naturaleza => {
  const v = String(c ?? '');
  if (v === 'B') return 'bienes';
  if (v === 'S') return 'servicios';
  return /^\d/.test(v) ? (Number(v[0]) <= 4 ? 'bienes' : 'servicios') : porDefecto;
};

// ── Normalización ────────────────────────────────────────────────────────────

function r2(n: number) { return Math.round(n * 100) / 100; }

// Lleva un % calculado (p. ej. 12.99 por redondeos) a la tarifa oficial más cercana.
export function tarifaOficial(pct: number): number {
  if (!pct || pct <= 0.05) return 0;
  const oficiales = tarifasOficiales();
  const cercana = oficiales.reduce((a, t) => Math.abs(t - pct) < Math.abs(a - pct) ? t : a, oficiales[0]);
  return Math.abs(cercana - pct) <= 0.5 ? cercana : r2(pct);
}

function sumarTarifa(map: Record<string, MontosTarifa>, tarifa: number, base: number, iva: number) {
  const k = String(tarifa);
  if (!map[k]) map[k] = { base: 0, iva: 0 };
  map[k].base += base;
  map[k].iva += iva;
}

function esNotaCredito(tipo: string) { return /nota de cr[eé]dito/i.test(tipo ?? ''); }
function monedaDe(v: unknown): Moneda { return String(v ?? 'CRC').toUpperCase() === 'USD' ? 'USD' : 'CRC'; }

/* eslint-disable @typescript-eslint/no-explicit-any */

function esConRecibo(v: any) { return v.tipo === 'Factura electrónica' && ['08', '10'].includes(String(v.condicion_venta)); }
function ventasConRecibo(ventas: any[]): any[] {
  const hoy = new Date().toISOString().slice(0, 10);
  const facturas = new Map(ventas.filter(esConRecibo).map(f => [String(f.id), f]));
  const limite = (f: any) => { const d = new Date(String(f.fecha_emision).slice(0, 10) + 'T12:00:00'); d.setDate(d.getDate() + 90); return d.toISOString().slice(0, 10); };
  const validos = (r: any) => !['Rechazado', 'Borrador', 'Error'].includes(String(r.estado));
  const out: any[] = [];
  const cobradoAntes = new Map<string, number>();
  for (const r of ventas) {
    if (r.tipo !== 'Recibo Electrónico de Pago' || !validos(r)) continue;
    const f = r.recibo_de ? facturas.get(String(r.recibo_de)) : null;
    if (f && String(r.fecha_emision).slice(0, 10) > limite(f)) continue;   // ya declarado al día 90
    out.push(r);
    if (f) cobradoAntes.set(String(f.id), (cobradoAntes.get(String(f.id)) ?? 0) + Number(r.total ?? 0));
  }
  for (const f of facturas.values()) {
    const lim = limite(f);
    if (hoy <= lim || String(f.estado) !== 'Aceptado') continue;
    const pendiente = Number(f.total ?? 0) - (cobradoAntes.get(String(f.id)) ?? 0);
    if (pendiente <= 0.01) continue;
    // Parte de la factura sin cobrar al día 90: se declara en esa fecha
    const k = pendiente / Number(f.total);
    out.push({
      ...f, id: `${f.id}-dia90`, fecha_emision: lim + 'T12:00:00', tipo: 'Factura electrónica', observaciones: 'IVA pendiente declarado al día 90',
      subtotal: Number(f.subtotal ?? 0) * k, iva: Number(f.iva ?? 0) * k, total: pendiente, total_descuentos: Number(f.total_descuentos ?? 0) * k,
      total_otros_cargos: Number(f.total_otros_cargos ?? 0) * k,
      lineas: (f.lineas ?? []).map((l: any) => ({ ...l, precio_unitario: Number(l.precio_unitario) * k, descuento: Number(l.descuento ?? 0) * k })),
    });
  }
  return out;
}
function normalizarVenta(d: any, actividadDe: (emisorId: string | null) => string): Comprobante {
  const signo = esNotaCredito(d.tipo) ? -1 : 1;
  const porTarifa: Record<string, MontosTarifa> = {};
  let gravado = 0, exento = 0, iva = 0, descuentos = 0, ith = 0;
  const gt = esGuatemalaActual();
  let ceroCon = 0, ceroSin = 0, devuelto = 0;
  let medios: string[] = [];
  try { medios = typeof d.medios_pago === 'string' ? JSON.parse(d.medios_pago) : Array.isArray(d.medios_pago) ? d.medios_pago : []; } catch { medios = []; }
  const conTarjeta = medios.map(String).includes('02');
  const lineas: any[] = Array.isArray(d.lineas) ? d.lineas : [];
  const estimado = lineas.length === 0;
  const partes: Record<Naturaleza, Partida> = { bienes: partidaVacia(), servicios: partidaVacia() };

  if (!estimado) {
    for (const l of lineas) {
      // Desde sept 2026 la línea guarda descuento y exoneración (TRIBU-CR v4.4)
      // Guatemala: mismo cálculo que al emitir (precio con IVA incluido; el ITH va a otros impuestos)
      const leer = (t: unknown) => { try { return t ? JSON.parse(String(t)) : null; } catch { return null; } };
      const c = gt ? calcularLinea({ codigoCabys: String(l.codigo_cabys ?? ''), cantidad: Number(l.cantidad ?? 0), precioUnitario: Number(l.precio_unitario ?? 0),
        codigoTarifa: String(l.codigo_tarifa ?? '08'), descuento: leer(l.descuento_json) ?? (l.descuento ? { monto: Number(l.descuento), codigo: '' } : null),
        otroImpuesto: leer(l.otro_impuesto_json) }) : null;
      const bruto = Number(l.cantidad ?? 0) * Number(l.precio_unitario ?? 0);
      const desc = c ? c.descuento : Math.min(Number(l.descuento ?? 0), bruto);
      descuentos += desc;
      const base = c ? c.subtotal : bruto - desc;
      let exonerado = 0;
      if (c) ith += c.otroImpuesto;
      else try { exonerado = l.exoneracion_json ? Number(JSON.parse(l.exoneracion_json).montoExoneracion ?? 0) : 0; } catch { exonerado = 0; }
      // `impuesto` (el %) es el dato que siempre existe; codigo_tarifa tiene
      // default '08' en filas viejas, así que solo se usa si falta el %.
      const tarifa = c ? c.tarifa : l.impuesto != null ? tarifaOficial(Number(l.impuesto)) : tarifaPorcentaje(String(l.codigo_tarifa ?? '08'));
      const pt = partes[naturalezaCabys(l.codigo_cabys, 'servicios')];
      pt.descuentos += desc;
      if (tarifa > 0) {
        const imp = base * tarifa / 100 - exonerado;
        gravado += base; iva += imp;
        sumarTarifa(porTarifa, tarifa, base, imp);
        pt.gravado += base + desc; pt.iva += imp; sumarTarifa(pt.porTarifa, tarifa, base, imp);
        if (conTarjeta && String(l.codigo_cabys ?? '').startsWith('93')) devuelto += imp;
      } else {
        exento += base;
        pt.exento += base + desc;
        const codigo = String(l.codigo_tarifa ?? '');
        if (codigo === '01' || codigo === '05') ceroCon += base;
        else if (codigo === '11') ceroSin += base;
      }
    }
  } else {
    // Sin líneas (PMS/POS/demo): se usa el encabezado del documento.
    const total = Number(d.total ?? 0);
    const sub = d.subtotal != null ? Number(d.subtotal) : total / 1.13;
    const imp = d.iva != null ? Number(d.iva) : total - sub;
    const tarifa = sub > 0 ? tarifaOficial((imp / sub) * 100) : 0;
    if (tarifa > 0) { gravado = sub; iva = imp; sumarTarifa(porTarifa, tarifa, sub, imp); }
    else {
      exento = sub;
      // La exportación va a tarifa 0% con derecho a crédito (art. 32 RLIVA)
      if (/exportaci/i.test(String(d.tipo ?? ''))) ceroCon = sub;
    }
    partes.servicios = { gravado, exento, descuentos: 0, iva, porTarifa: { ...porTarifa } };
  }

  const firmar = (m: Record<string, MontosTarifa>) =>
    Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { base: signo * v.base, iva: signo * v.iva }]));
  const firmarParte = (p: Partida): Partida => ({ gravado: signo * p.gravado, exento: signo * p.exento, descuentos: signo * p.descuentos, iva: signo * p.iva, porTarifa: firmar(p.porTarifa) });

  return {
    id: String(d.id),
    lado: 'venta',
    tipo: d.tipo ?? 'Factura electrónica',
    consecutivo: d.numero_factura ?? '',
    clave: d.clave ?? '',
    contraparte: d.cliente_nombre ?? '(sin nombre)',
    fecha: d.fecha_emision,
    estado: d.estado ?? 'Procesando',
    origen: d.origen ?? 'Manual',
    moneda: monedaDe(d.moneda),
    tipoCambio: Number(d.tipo_cambio) || 1,
    // gravado/exento quedan netos de descuento; se suma el descuento para mostrarlo aparte
    gravado: signo * (gravado + (exento + gravado > 0 ? descuentos * gravado / (gravado + exento) : 0)),
    exento: signo * (exento + (exento + gravado > 0 ? descuentos * exento / (gravado + exento) : 0)),
    descuentos: signo * descuentos,
    iva: signo * iva,
    otros: signo * (Number(d.total_otros_cargos ?? 0) + ith),
    total: signo * (gravado + exento + iva + ith + Number(d.total_otros_cargos ?? 0)),
    porTarifa: firmar(porTarifa),
    ceroConCredito: signo * ceroCon,
    ceroSinCredito: signo * ceroSin,
    ivaDevuelto: signo * devuelto,
    credito: null,
    // La actividad con que se emitió; los documentos viejos, la del emisor
    actividad: d.actividad_emisor || actividadDe(d.emisor_id ?? null),
    motivoRechazo: d.ultimo_error ?? null,
    incompleto: !d.numero_factura || Number(d.es_borrador) === 1,
    estimado,
    partes: { bienes: firmarParte(partes.bienes), servicios: firmarParte(partes.servicios) },
    tipoDte: d.tipo_dte || tipoDteDe(d.tipo ?? '', d.condicion_venta),
    nit: String(d.receptor_identificacion || 'CF'),
  };
}

const ORIGEN_COMPRA: Record<string, string> = { xml: 'XML', correo: 'Correo', manual: 'Manual' };

function normalizarCompra(r: any, actividadDefault: string): Comprobante {
  const signo = esNotaCredito(r.tipo) ? -1 : 1;
  const total = Number(r.total_factura ?? 0);
  const tarifaReg = r.tarifa != null ? Number(r.tarifa) : 13;
  const estimado = r.subtotal == null;
  const sub = !estimado ? Number(r.subtotal) : (tarifaReg > 0 ? total / (1 + tarifaReg / 100) : total);
  const iva = r.iva != null ? Number(r.iva) : total - sub;
  const exento = Number(r.total_exento ?? 0);
  const descuentos = Number(r.total_descuentos ?? 0);
  const otros = Number(r.total_otros_cargos ?? 0);
  const porTarifa: Record<string, MontosTarifa> = {};

  let lineas: any[] = [];
  try { lineas = r.lineas_json ? JSON.parse(r.lineas_json) : []; } catch { lineas = []; }
  const partesC: Record<Naturaleza, Partida> = { bienes: partidaVacia(), servicios: partidaVacia() };
  if (lineas.length) {
    for (const l of lineas) {
      const t = tarifaOficial(Number(l.tarifa ?? 0));
      if (t > 0) sumarTarifa(porTarifa, t, Number(l.subtotal ?? 0), Number(l.impuesto ?? 0));
      const pt = partesC[naturalezaCabys(l.cabys, 'bienes')];
      pt.descuentos += Number(l.descuento ?? 0);
      if (t > 0) { pt.gravado += Number(l.subtotal ?? 0) + Number(l.descuento ?? 0); pt.iva += Number(l.impuesto ?? 0); sumarTarifa(pt.porTarifa, t, Number(l.subtotal ?? 0), Number(l.impuesto ?? 0)); }
      else pt.exento += Number(l.subtotal ?? 0) + Number(l.descuento ?? 0);
    }
  } else {
    const t = tarifaReg > 0 ? tarifaOficial(tarifaReg) : 0;
    if (t > 0 && iva !== 0) sumarTarifa(porTarifa, t, sub - exento, iva);
  }
  const hayIva = iva !== 0 || Object.keys(porTarifa).length > 0;
  const gravado = hayIva ? sub + descuentos - exento : 0;
  const firmar = (m: Record<string, MontosTarifa>) =>
    Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { base: signo * v.base, iva: signo * v.iva }]));
  if (!lineas.length) partesC.bienes = { gravado, exento: hayIva ? exento : sub + descuentos, descuentos, iva: hayIva ? iva : 0, porTarifa: { ...porTarifa } };
  const firmarParteC = (p: Partida): Partida => ({ gravado: signo * p.gravado, exento: signo * p.exento, descuentos: signo * p.descuentos, iva: signo * p.iva, porTarifa: firmar(p.porTarifa) });

  return {
    id: String(r.id),
    lado: 'compra',
    tipo: r.tipo ?? 'Factura electrónica',
    consecutivo: r.numero_factura ?? '',
    clave: r.clave ?? '',
    contraparte: r.proveedor ?? '(sin nombre)',
    fecha: r.fecha_emision,
    estado: r.estado ?? 'Recibido',
    origen: ORIGEN_COMPRA[String(r.origen ?? 'xml')] ?? String(r.origen),
    moneda: monedaDe(r.moneda),
    tipoCambio: Number(r.tipo_cambio) || 1,
    gravado: signo * gravado,
    exento: signo * (hayIva ? exento : sub + descuentos),
    descuentos: signo * descuentos,
    iva: signo * (hayIva ? iva : 0),
    otros: signo * otros,
    total: signo * total,
    porTarifa: firmar(porTarifa),
    ceroConCredito: 0, ceroSinCredito: 0, ivaDevuelto: 0,
    credito: (['pleno', 'parcial', 'sin_derecho'].includes(r.tipo_credito_fiscal) ? r.tipo_credito_fiscal : 'pleno') as CreditoFiscal,
    actividad: r.actividad_economica || actividadDefault,
    motivoRechazo: r.mensaje_acuse ?? r.ultimo_error ?? null,
    incompleto: !r.numero_factura,
    estimado,
    partes: { bienes: firmarParteC(partesC.bienes), servicios: firmarParteC(partesC.servicios) },
    // Guatemala, documentos físicos de compra: el código va al inicio del tipo («SCOM · …»)
    tipoDte: /^[A-Z]{4} · /.test(String(r.tipo ?? '')) ? String(r.tipo).slice(0, 4)
      : r.tipo === 'Nota de crédito' ? 'NCRE' : r.tipo === 'Nota de débito' ? 'NDEB' : r.tipo === 'Factura electrónica de compra' ? 'FESP' : 'FACT',
    nit: String(r.proveedor_identificacion ?? ''),
  };
}

// ── Hook de carga ────────────────────────────────────────────────────────────

export function useComprobantes() {
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vivo = true;
    const json = (u: string) => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
    Promise.all([
      json('/api/documentos/con-lineas'),
      json('/api/recepcion'),
      json('/api/emisores').catch(() => []),
    ]).then(([ventas, compras, emisores]: [any[], any[], any[]]) => {
      if (!vivo) return;
      const actividadPorEmisor = new Map<string, string>(emisores.map(e => [String(e.id), String(e.actividad_economica ?? '')]));
      const principal = emisores.find(e => Number(e.activo) === 1) ?? emisores[0];
      const actividadDefault = String(principal?.actividad_economica || 'Sin actividad asignada');
      const actividadDe = (emisorId: string | null) =>
        (emisorId && actividadPorEmisor.get(emisorId)) || actividadDefault;
      setComprobantes([
        // La factura electrónica de compra no es una venta: entra como compra al aceptarse.
        // Los importados de otro sistema ya los declaró ese sistema
        ...ventas.filter(v => !Number(v.importado) && v.tipo !== 'Factura electrónica de compra' && !esConRecibo(v) && v.tipo !== 'Recibo Electrónico de Pago')
          .map(v => normalizarVenta(v, actividadDe)),
        ...ventasConRecibo(ventas).map(v => normalizarVenta(v, actividadDe)),
        ...compras.map(c => normalizarCompra(c, actividadDefault)),
      ]);
      setCargando(false);
    }).catch(() => { if (vivo) { setError('No se pudieron cargar los comprobantes.'); setCargando(false); } });
    return () => { vivo = false; };
  }, [version]);

  // recargar(): vuelve a leer todo (p. ej. después de emitir un acuse desde el Dashboard)
  return { comprobantes, cargando, error, recargar: () => setVersion(v => v + 1) };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Filtros estándar ─────────────────────────────────────────────────────────

export type Periodo = 'todo' | 'mes' | 'mes-anterior' | 'anio' | 'personalizado';
export interface Filtros {
  periodo: Periodo;
  desde: string;        // YYYY-MM-DD (solo 'personalizado')
  hasta: string;
  estados: Set<string>; // vacío = todos
  moneda: 'todas' | Moneda;
  actividad: string;    // '' = todas
  busq: string;
  naturaleza: 'todos' | Naturaleza;   // bienes, servicios o ambos
}

export function filtrosIniciales(opts?: { soloAceptados?: boolean }): Filtros {
  return {
    periodo: 'todo', desde: '', hasta: '',
    estados: new Set(opts?.soloAceptados ? ['Aceptado'] : []),
    moneda: 'todas', actividad: '', busq: '', naturaleza: 'todos',
  };
}

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// El "mes actual" es el del día de hoy.
export function rangoPeriodo(f: Filtros): { desde: string; hasta: string } | null {
  const h = new Date();
  switch (f.periodo) {
    case 'mes': return { desde: iso(new Date(h.getFullYear(), h.getMonth(), 1)), hasta: iso(new Date(h.getFullYear(), h.getMonth() + 1, 0)) };
    case 'mes-anterior': return { desde: iso(new Date(h.getFullYear(), h.getMonth() - 1, 1)), hasta: iso(new Date(h.getFullYear(), h.getMonth(), 0)) };
    case 'anio': return { desde: `${h.getFullYear()}-01-01`, hasta: `${h.getFullYear()}-12-31` };
    case 'personalizado': return (f.desde || f.hasta) ? { desde: f.desde || '0000-01-01', hasta: f.hasta || '9999-12-31' } : null;
    default: return null;
  }
}

// Con "Solo bienes" / "Solo servicios" cada comprobante queda con los montos
// de esa parte (los otros cargos no se reparten) y se omiten los que no
// tienen nada de esa naturaleza.
function soloNaturaleza(c: Comprobante, n: Naturaleza): Comprobante | null {
  const p = c.partes?.[n];
  if (!p || (p.gravado === 0 && p.exento === 0 && p.iva === 0)) return null;
  return { ...c, gravado: p.gravado, exento: p.exento, descuentos: p.descuentos, iva: p.iva, otros: 0, porTarifa: p.porTarifa,
    total: p.gravado + p.exento - p.descuentos + p.iva };
}

export function aplicarFiltros(lista: Comprobante[], f: Filtros, opts?: { excluirIncompletos?: boolean }): Comprobante[] {
  const rango = rangoPeriodo(f);
  const q = f.busq.trim().toLowerCase();
  const base = f.naturaleza && f.naturaleza !== 'todos'
    ? lista.map(c => soloNaturaleza(c, f.naturaleza as Naturaleza)).filter((c): c is Comprobante => c !== null)
    : lista;
  return base.filter(c => {
    if (opts?.excluirIncompletos && c.incompleto) return false;
    if (rango) {
      const dia = iso(new Date(c.fecha));
      if (dia < rango.desde || dia > rango.hasta) return false;
    }
    if (f.estados.size > 0 && !f.estados.has(c.estado)) return false;
    if (f.moneda !== 'todas' && c.moneda !== f.moneda) return false;
    if (f.actividad && c.actividad !== f.actividad) return false;
    if (q && !c.contraparte.toLowerCase().includes(q) && !c.consecutivo.includes(q) && !c.clave.includes(q)) return false;
    return true;
  });
}

// ── Montos y moneda de visualización ─────────────────────────────────────────
// "Todas las monedas" se expresa en colones usando el tipo de cambio de cada
// documento; si se filtra una moneda, se muestra en esa moneda sin convertir.

export function simbolo(f: Filtros) { return f.moneda === 'USD' ? '$' : simboloLocal(); }
export function enVista(c: Comprobante, monto: number, f: Filtros) {
  return f.moneda === 'todas' && c.moneda === 'USD' ? monto * c.tipoCambio : monto;
}

export interface Totales { gravado: number; exento: number; descuentos: number; iva: number; otros: number; total: number; porTarifa: Record<string, MontosTarifa>; n: number }
export function totalesVacios(): Totales { return { gravado: 0, exento: 0, descuentos: 0, iva: 0, otros: 0, total: 0, porTarifa: {}, n: 0 }; }

export function sumar(lista: Comprobante[], f: Filtros): Totales {
  const t = totalesVacios();
  for (const c of lista) {
    const v = (m: number) => enVista(c, m, f);
    t.gravado += v(c.gravado); t.exento += v(c.exento); t.descuentos += v(c.descuentos);
    t.iva += v(c.iva); t.otros += v(c.otros); t.total += v(c.total); t.n += 1;
    for (const [k, m] of Object.entries(c.porTarifa)) sumarTarifa(t.porTarifa, Number(k), v(m.base), v(m.iva));
  }
  return t;
}

// Tarifas presentes en un conjunto de comprobantes (13% siempre se muestra).
export function tarifasPresentes(lista: Comprobante[]): number[] {
  const s = new Set<number>([13]);
  for (const c of lista) for (const [k, m] of Object.entries(c.porTarifa)) if (m.base !== 0 || m.iva !== 0) s.add(Number(k));
  return Array.from(s).sort((a, b) => b - a);
}

export function agruparPor<T>(lista: T[], clave: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of lista) { const k = clave(x); if (!m.has(k)) m.set(k, []); m.get(k)!.push(x); }
  return m;
}

// Fecha y hora estándar: DD/MM/AAAA HH:MM (misma base que fmtDate de primitives).
export function fmtFechaHora(isoStr: string) {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '-';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
