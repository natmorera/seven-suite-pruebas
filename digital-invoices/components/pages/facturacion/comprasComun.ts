// Tipos y utilidades compartidas por Compras (Recepción), el modal de
// importación, el de acuse y el detalle.
import { C, fmtMoney, fmtDate } from '@/components/ui/primitives';
import { ACTIVIDADES_ECONOMICAS } from '@/data/actividadesEconomicas';
import type { LineaCompra } from '@/lib/xmlCompra';
import { simboloLocal } from '@/lib/paisActual';

export type CreditoFiscal = 'pleno' | 'parcial' | 'sin_derecho';
export const CREDITO_OPCIONES: { value: CreditoFiscal; label: string; ayuda: string }[] = [
  { value: 'pleno', label: 'Crédito pleno', ayuda: 'El IVA se acredita completo' },
  { value: 'parcial', label: 'Crédito parcial (prorrata)', ayuda: 'Se acredita según la proporción de ventas gravadas' },
  { value: 'sin_derecho', label: 'Sin derecho a crédito (gasto)', ayuda: 'El IVA se registra como gasto' },
];
export const CREDITO_CORTO: Record<CreditoFiscal, string> = { pleno: 'Pleno', parcial: 'Parcial', sin_derecho: 'Sin derecho' };

export interface CompraRow {
  id: string;
  proveedor: string;
  numero_factura: string;
  fecha_emision: string;
  fecha_aceptacion: string | null;
  estado: string;
  total_factura: number;
  subtotal: number | null;
  iva: number | null;
  tarifa: number;
  tipo_credito_fiscal: CreditoFiscal;
  tipo_dte?: string | null;   // Guatemala: FACT, FCAM, FPEQ, SCOM…
  origen: 'xml' | 'correo' | 'manual' | 'auto' | 'fisica';
  clave: string | null;
  tipo: string | null;
  proveedor_identificacion: string | null;
  proveedor_correo: string | null;
  receptor_identificacion: string | null;
  moneda: string | null;
  tipo_cambio: number | null;
  total_exento: number | null;
  total_descuentos: number | null;
  total_otros_cargos: number | null;
  actividad_economica: string | null;
  actividad_proveedor?: string | null;   // con la que el proveedor emitió la factura
  lineas_json: string | null;
  tipo_acuse: string | null;
  mensaje_acuse: string | null;
  asiento_consecutivo?: string | null;
  cuenta_proveedor?: string | null;
  cuenta_proveedor_nombre?: string | null;
}

export interface CorreoRow {
  id: string; remitente: string; asunto: string; snippet: string; fecha: string;
  tiene_adjunto_xml: number; importado: number;
  xml?: string | null; xml_respuesta?: string | null; xml_nombre?: string | null; pdf_nombre?: string | null; origen?: string | null;
}

export interface EmisorInfo { id: string; razon_social: string; cedula_juridica: string; actividad_economica: string; correo_electronico: string | null; activo: number; actividades_json?: string | null }

// Una compra "necesita acuse" mientras no tenga respuesta (aceptación o rechazo).
// El botón de emitir acuse (aceptar la compra) es verde en todas las pantallas
export const ESTILO_ACUSE = { background: C.success, borderColor: C.success, color: '#fff' } as const;

export const sinAcuse = (r: Pick<CompraRow, 'estado'>) => r.estado !== 'Aceptado' && r.estado !== 'Rechazado';

export function simbolo(moneda: string | null | undefined) { return String(moneda ?? 'CRC').toUpperCase() === 'USD' ? '$' : simboloLocal(); }
export function monto(n: number | null | undefined, moneda?: string | null) { return fmtMoney(Number(n ?? 0), simbolo(moneda)); }
export function fecha(iso: string | null | undefined) { return iso ? fmtDate(iso) : '-'; }

export function lineasDe(r: CompraRow): LineaCompra[] {
  try { return r.lineas_json ? JSON.parse(r.lineas_json) : []; } catch { return []; }
}

// Actividades para clasificar compras: primero las de los emisores propios
// (las que realmente usa el hotel), después el resto del catálogo.
export function opcionesActividad(emisores: EmisorInfo[]): string[] {
  // Solo el emisor activo (uno por cuenta), con todas sus actividades inscritas; la principal primero.
  const activos = emisores.filter(e => Number(e.activo) === 1);
  const lista: string[] = [];
  for (const e of (activos.length ? activos : emisores)) {
    let acts: { codigo: string; nombre: string; principal?: boolean }[] = [];
    try { acts = e.actividades_json ? JSON.parse(e.actividades_json) : []; } catch { acts = []; }
    if (acts.length) acts.sort((a, b) => Number(Boolean(b.principal)) - Number(Boolean(a.principal))).forEach(a => lista.push(`${a.codigo} - ${a.nombre}`));
    else if (e.actividad_economica) lista.push(e.actividad_economica);
  }
  const propias = Array.from(new Set(lista));
  const catalogo = ACTIVIDADES_ECONOMICAS.map(a => `${a.codigo} - ${a.nombre}`)
    .filter(a => !propias.some(p => p.startsWith(a.slice(0, 6))));
  return [...propias, ...catalogo];
}

export const r2 = (n: number) => Math.round(n * 100) / 100;
