// Datos comunes de la representación impresa de un comprobante (carta y
// tiquete). Los usan la vista previa del
// detalle y el PDF, para que los dos muestren lo mismo.
import { labelCondicionVenta, labelMedioPago } from '@/data/catalogosHacienda';
import { esGuatemalaActual, nombreMonedaLocal, simboloLocal } from '@/lib/paisActual';
import { calcularLinea, esServicio } from '@/lib/calculoFactura';
import { nombreDte, textoFraseDocumento, type FraseEmisor } from '@/lib/perfilPais';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type DocCompleto = Record<string, any>;
export type FormatoImpresion = 'carta' | 'tiquete';

// Leyenda fiscal del pie: Hacienda (v4.4) en Costa Rica, FEL de la SAT en Guatemala
export const leyendaFiscal = () => (esGuatemalaActual()
  ? 'Documento tributario electrónico certificado conforme al régimen de Factura Electrónica en Línea (FEL) de la SAT.'
  : 'Comprobante electrónico emitido conforme a la normativa vigente de la Dirección General de Tributación (versión 4.4).');

export function moduloDeOrigen(origen: string | null | undefined): 'front' | 'pos' | null {
  if (origen === 'Front Desk') return 'front';
  if (origen === 'Punto de Venta (POS)') return 'pos';
  return null;
}
export const NOMBRE_MODULO = { front: 'Front Desk', pos: 'Punto de Venta (POS)' } as const;

// Formatos de Facturación electrónica: carta y tiquete. Los formatos propios
// de los otros módulos (Front Desk, POS) se imprimen en esos módulos, no aquí.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function formatosDe(_doc: DocCompleto): { value: FormatoImpresion; label: string }[] {
  return [
    { value: 'carta', label: 'Carta' },
    { value: 'tiquete', label: esGuatemalaActual() ? 'Rollo (80 mm)' : 'Tiquete (80 mm)' },
  ];
}
export function esAngosto(_doc: DocCompleto, formato: FormatoImpresion) {
  return formato === 'tiquete';
}

export interface LineaImpresa { descripcion: string; codigo: string; cantidad: number; precio: number; descuento: number; tarifa: number; iva: number; total: number }

export function datosImpresion(doc: DocCompleto) {
  const gt = esGuatemalaActual();
  const sym = doc.moneda === 'USD' ? '$' : simboloLocal();
  const m = (n: number) => `${sym} ${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const lineas: LineaImpresa[] = (doc.lineas ?? []).map((l: any) => {
    if (gt) {
      // Mismo cálculo que al emitir: precio con IVA, ITH sobre el monto gravable
      const leer = (t: unknown) => { try { return t ? JSON.parse(String(t)) : null; } catch { return null; } };
      const c = calcularLinea({ codigoCabys: String(l.codigo_cabys ?? ''), cantidad: Number(l.cantidad), precioUnitario: Number(l.precio_unitario),
        codigoTarifa: String(l.codigo_tarifa ?? '08'), descuento: leer(l.descuento_json), otroImpuesto: leer(l.otro_impuesto_json) });
      return { descripcion: String(l.descripcion ?? ''), codigo: esServicio(String(l.codigo_cabys ?? '')) ? 'Servicio' : 'Bien', cantidad: Number(l.cantidad),
        precio: Number(l.precio_unitario), descuento: c.descuentoConIva, tarifa: c.tarifa, iva: c.impuestoNeto, total: c.totalLinea };
    }
    const bruto = Number(l.cantidad) * Number(l.precio_unitario);
    const descuento = Number(l.descuento ?? 0);
    const tarifa = Number(l.impuesto ?? 0);
    const iva = (bruto - descuento) * tarifa / 100;
    return { descripcion: String(l.descripcion ?? ''), codigo: String(l.codigo_cabys ?? ''), cantidad: Number(l.cantidad), precio: Number(l.precio_unitario), descuento, tarifa, iva, total: bruto - descuento + iva };
  });
  let medios: string[] = [];
  try { medios = JSON.parse(doc.medios_pago ?? '[]'); } catch { medios = []; }
  let cargos: any[] = [];
  try { cargos = doc.otros_cargos_json ? JSON.parse(doc.otros_cargos_json) : []; } catch { cargos = []; }
  const emisor = doc.emisor ?? {};
  const receptor = doc.receptor ?? {};
  const modulo = moduloDeOrigen(doc.origen);
  // Guatemala: frases del DTE; serie y número los asigna el certificador
  let frases: FraseEmisor[] = [];
  try { frases = gt && doc.frases_json ? JSON.parse(doc.frases_json) : []; } catch { frases = []; }
  const [serie, numero] = String(doc.numero_factura ?? '').split('-');
  return {
    m, lineas, cargos, modulo, gt,
    emisor: {
      nombre: String(emisor.nombre_comercial || emisor.razon_social || ''), razon: String(emisor.razon_social || ''),
      cedula: String(emisor.cedula_juridica ?? ''), direccion: String(emisor.direccion_fiscal ?? ''),
      telefono: String(emisor.telefono ?? ''), correo: String(emisor.correo_electronico ?? ''),
    },
    receptor: {
      nombre: String(doc.cliente_nombre || 'Consumidor final'), identificacion: String(doc.receptor_identificacion || receptor.numero_identificacion || ''),
      correo: String(doc.receptor_email || receptor.email || ''), direccion: String(receptor.direccion_fiscal ?? ''),
    },
    encabezado: {
      titulo: gt ? (doc.tipo_dte ? nombreDte(String(doc.tipo_dte)) : String(doc.tipo ?? 'Documento tributario electrónico')) : String(doc.tipo ?? 'Comprobante electrónico'),
      consecutivo: gt && serie && numero ? `Serie ${serie} · Número ${numero}` : String(doc.numero_factura ?? ''), clave: String(doc.clave ?? ''),
      fecha: doc.fecha_emision ? new Date(doc.fecha_emision).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' }) : '',
      condicion: labelCondicionVenta(doc.condicion_venta), medios: medios.map(labelMedioPago).join(', '),
      moneda: doc.moneda === 'USD' ? `Dólares (TC ${doc.tipo_cambio})` : nombreMonedaLocal(true),
      referenciaOrigen: String(doc.origen_referencia ?? ''),
    },
    totales: {
      descuentos: Number(doc.total_descuentos ?? 0), subtotal: Number(doc.subtotal ?? 0), iva: Number(doc.iva ?? 0),
      otros: Number(doc.total_otros_cargos ?? 0), total: Number(doc.total ?? 0),
    },
    referencia: doc.referencia_documento ? `${doc.referencia_documento}${doc.referencia_motivo ? ` · ${doc.referencia_motivo}` : ''}` : '',
    observaciones: String(doc.observaciones ?? ''),
    frases: frases.map(textoFraseDocumento),
    qr: gt ? null : doc.qr as string | null,   // FEL no lleva QR de consulta
  };
}
