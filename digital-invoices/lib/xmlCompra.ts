import { autoridad } from '@/lib/paisActual';

export type TipoComprobante =
  | 'Factura electrónica' | 'Tiquete electrónico' | 'Nota de crédito' | 'Nota de débito'
  | 'Factura electrónica de compra' | 'Factura de exportación';

const RAIZ_A_TIPO: Record<string, TipoComprobante> = {
  FacturaElectronica: 'Factura electrónica',
  TiqueteElectronico: 'Tiquete electrónico',
  NotaCreditoElectronica: 'Nota de crédito',
  NotaDebitoElectronica: 'Nota de débito',
  FacturaElectronicaCompra: 'Factura electrónica de compra',
  FacturaElectronicaExportacion: 'Factura de exportación',
};

export interface LineaCompra {
  numero: number;
  cabys: string;
  codigo?: string;         // CodigoComercial del proveedor (su SKU), si viene
  detalle: string;
  cuenta?: string;         // cuenta contable asignada al importar
  articuloId?: string;     // artículo del inventario asociado (opcional)
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  tarifa: number;          // % de IVA de la línea (0 si exenta/no sujeta)
  impuesto: number;        // monto de IVA de la línea
  total: number;
}

export interface CompraXml {
  tipo: TipoComprobante;
  version: string;                       // '4.3' | '4.4' | desconocida
  clave: string;
  consecutivo: string;
  fechaEmision: string;                  // ISO
  proveedor: string;
  proveedorIdentificacion: string;
  proveedorTipoIdentificacion: string;
  proveedorCorreo: string;
  receptorNombre: string;
  receptorIdentificacion: string;
  actividadEmisor: string;
  actividadReceptor: string;             // solo v4.4
  condicionVenta: string;
  moneda: string;
  tipoCambio: number;
  totalGravado: number;
  totalExento: number;
  totalExonerado: number;
  totalDescuentos: number;
  totalVentaNeta: number;
  totalImpuesto: number;
  totalOtrosCargos: number;
  totalComprobante: number;
  tarifaPrincipal: number;               // la tarifa con más base (para reportes por tarifa)
  lineas: LineaCompra[];
}

export type ResultadoXml = { ok: true; doc: CompraXml; xml: string } | { ok: false; error: string };

// ── helpers namespace-agnósticos (el XML de Hacienda siempre trae xmlns) ────
function hijos(el: Element | Document, nombre: string): Element[] {
  return Array.from(el.getElementsByTagNameNS('*', nombre));
}
function primero(el: Element | Document | null | undefined, nombre: string): Element | null {
  if (!el) return null;
  return hijos(el, nombre)[0] ?? null;
}
function directo(el: Element | null | undefined, nombre: string): Element | null {
  if (!el) return null;
  // childNodes (y no children) para que funcione también con @xmldom en el servidor
  return (Array.from(el.childNodes).find(c => c.nodeType === 1 && (c as Element).localName === nombre) as Element | undefined) ?? null;
}
function txt(el: Element | null | undefined): string { return (el?.textContent ?? '').trim(); }
function num(el: Element | null | undefined): number { const n = Number(txt(el)); return isFinite(n) ? n : 0; }

export function soloDigitos(s: string) { return (s ?? '').replace(/\D/g, ''); }

// En el navegador usa DOMParser; en el servidor se le pasa el de @xmldom.
export function parsearCompraXml(texto: string, parser?: { parseFromString(t: string, tipo: string): unknown }): ResultadoXml {
  let dom: Document;
  try {
    dom = (parser ?? new DOMParser()).parseFromString(texto, 'application/xml') as Document;
    if (!dom?.documentElement) throw new Error('vacío');
  } catch {
    return { ok: false, error: 'El archivo no es un XML válido.' };
  }
  if (dom.getElementsByTagName('parsererror').length > 0) return { ok: false, error: 'El archivo no es un XML válido.' };

  const raiz = dom.documentElement;
  const nombreRaiz = raiz.localName;
  if (nombreRaiz === 'GTDocumento') return parsearFel(raiz, texto);
  if (nombreRaiz === 'MensajeHacienda') {
    return { ok: false, error: `Es la respuesta de ${autoridad()} (MensajeHacienda), no la factura. Sube el XML del comprobante.` };
  }
  if (nombreRaiz === 'MensajeReceptor') {
    return { ok: false, error: 'Es un mensaje receptor (acuse), no una factura.' };
  }
  const tipo = RAIZ_A_TIPO[nombreRaiz];
  if (!tipo) return { ok: false, error: `No es un comprobante electrónico de ${autoridad()} (raíz "${nombreRaiz}").` };

  const ns = raiz.namespaceURI ?? '';
  const version = /v4\.4/.test(ns) ? '4.4' : /v4\.3/.test(ns) ? '4.3' : 'desconocida';

  const clave = txt(directo(raiz, 'Clave'));
  if (!/^\d{50}$/.test(clave)) return { ok: false, error: 'El comprobante no trae una clave numérica válida de 50 dígitos.' };

  const emisor = directo(raiz, 'Emisor');
  const receptor = directo(raiz, 'Receptor');
  const idEmisor = directo(emisor, 'Identificacion');
  const idReceptor = directo(receptor, 'Identificacion');
  const resumen = directo(raiz, 'ResumenFactura');
  const moneda = primero(resumen, 'CodigoTipoMoneda');

  const lineas: LineaCompra[] = hijos(raiz, 'LineaDetalle').map((l, i) => {
    const imp = directo(l, 'Impuesto');
    const tarifa = num(directo(imp, 'Tarifa'));
    const cantidad = num(directo(l, 'Cantidad'));
    const precio = num(directo(l, 'PrecioUnitario'));
    const subtotal = directo(l, 'SubTotal') ? num(directo(l, 'SubTotal')) : cantidad * precio;
    const impuesto = num(directo(imp, 'Monto'));
    const desc = directo(l, 'Descuento');
    return {
      numero: num(directo(l, 'NumeroLinea')) || i + 1,
      cabys: txt(directo(l, 'CodigoCABYS')) || txt(directo(l, 'Codigo')),
      codigo: txt(directo(directo(l, 'CodigoComercial'), 'Codigo')),
      detalle: txt(directo(l, 'Detalle')),
      cantidad,
      unidad: txt(directo(l, 'UnidadMedida')),
      precioUnitario: precio,
      descuento: num(directo(desc, 'MontoDescuento')),
      subtotal,
      tarifa,
      impuesto,
      total: directo(l, 'MontoTotalLinea') ? num(directo(l, 'MontoTotalLinea')) : subtotal + impuesto,
    };
  });

  const totalImpuesto = num(directo(resumen, 'TotalImpuesto'));
  const totalComprobante = num(directo(resumen, 'TotalComprobante'));
  if (!resumen || totalComprobante === 0 && lineas.length === 0) {
    return { ok: false, error: 'El comprobante no trae el resumen de montos (ResumenFactura).' };
  }

  // Tarifa principal: la de mayor base gravada (una compra puede mezclar tarifas)
  const basePorTarifa = new Map<number, number>();
  for (const l of lineas) if (l.tarifa > 0) basePorTarifa.set(l.tarifa, (basePorTarifa.get(l.tarifa) ?? 0) + l.subtotal);
  const tarifaPrincipal = basePorTarifa.size
    ? Array.from(basePorTarifa.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : (totalImpuesto > 0 ? 13 : 0);

  const fecha = txt(directo(raiz, 'FechaEmision'));

  return {
    ok: true,
    xml: texto,
    doc: {
      tipo, version, clave,
      consecutivo: txt(directo(raiz, 'NumeroConsecutivo')),
      fechaEmision: fecha && !isNaN(new Date(fecha).getTime()) ? new Date(fecha).toISOString() : new Date().toISOString(),
      proveedor: txt(directo(emisor, 'Nombre')) || txt(directo(emisor, 'NombreComercial')) || '(sin nombre)',
      proveedorIdentificacion: txt(directo(idEmisor, 'Numero')),
      proveedorTipoIdentificacion: txt(directo(idEmisor, 'Tipo')),
      proveedorCorreo: txt(directo(emisor, 'CorreoElectronico')),
      receptorNombre: txt(directo(receptor, 'Nombre')),
      receptorIdentificacion: txt(directo(idReceptor, 'Numero')),
      actividadEmisor: txt(directo(raiz, 'CodigoActividadEmisor')) || txt(directo(raiz, 'CodigoActividad')),
      actividadReceptor: txt(directo(raiz, 'CodigoActividadReceptor')),
      condicionVenta: txt(directo(raiz, 'CondicionVenta')),
      moneda: txt(directo(moneda, 'CodigoMoneda')) || 'CRC',
      tipoCambio: num(directo(moneda, 'TipoCambio')) || 1,
      totalGravado: num(directo(resumen, 'TotalGravado')),
      totalExento: num(directo(resumen, 'TotalExento')) + num(directo(resumen, 'TotalNoSujeto')),
      totalExonerado: num(directo(resumen, 'TotalExonerado')),
      totalDescuentos: num(directo(resumen, 'TotalDescuentos')),
      totalVentaNeta: num(directo(resumen, 'TotalVentaNeta')),
      totalImpuesto,
      totalOtrosCargos: num(directo(resumen, 'TotalOtrosCargos')),
      totalComprobante,
      tarifaPrincipal,
      lineas,
    },
  };
}

// ── DTE de Guatemala (FEL) ───────────────────────────────────────────────
// El XML certificado trae el número de autorización (UUID) con su serie y
// número en <Certificacion>. El IVA viene incluido en el precio: el monto
// gravable es la base y el impuesto de turismo u otros van como otros cargos.
const TIPO_FEL: Record<string, TipoComprobante> = {
  NCRE: 'Nota de crédito', NDEB: 'Nota de débito', FESP: 'Factura electrónica de compra',
};
function atr(el: Element | null | undefined, nombre: string): string { return (el?.getAttribute(nombre) ?? '').trim(); }

function parsearFel(raiz: Element, texto: string): ResultadoXml {
  const generales = primero(raiz, 'DatosGenerales');
  const emisor = primero(raiz, 'Emisor');
  const receptor = primero(raiz, 'Receptor');
  const aut = primero(raiz, 'NumeroAutorizacion');
  const uuid = txt(aut);
  if (!generales || !emisor) return { ok: false, error: 'El XML no trae los datos de emisión del DTE.' };
  if (!/^[0-9A-Fa-f-]{36}$/.test(uuid)) return { ok: false, error: 'El DTE no está certificado: no trae el número de autorización. Sube el XML que devuelve el certificador.' };
  const tipoDte = atr(generales, 'Tipo');

  const lineas: LineaCompra[] = hijos(raiz, 'Item').map((it, i) => {
    const impuestos = hijos(it, 'Impuesto');
    const iva = impuestos.find(x => txt(directo(x, 'NombreCorto')).toUpperCase() === 'IVA');
    const gravable = iva ? num(directo(iva, 'MontoGravable')) : num(directo(it, 'Precio')) - num(directo(it, 'Descuento'));
    const montoIva = iva ? num(directo(iva, 'MontoImpuesto')) : 0;
    return {
      numero: Number(atr(it, 'NumeroLinea')) || i + 1,
      cabys: atr(it, 'BienOServicio') === 'B' ? 'B' : 'S',
      detalle: txt(directo(it, 'Descripcion')),
      cantidad: num(directo(it, 'Cantidad')),
      unidad: txt(directo(it, 'UnidadMedida')),
      precioUnitario: num(directo(it, 'PrecioUnitario')),
      descuento: num(directo(it, 'Descuento')),
      subtotal: gravable,
      tarifa: iva && txt(directo(iva, 'CodigoUnidadGravable')) === '1' ? 12 : 0,
      impuesto: montoIva,
      total: num(directo(it, 'Total')),
    };
  });
  const totales = primero(raiz, 'Totales');
  const totalComprobante = num(primero(totales, 'GranTotal'));
  const totalImpuesto = lineas.reduce((a, l) => a + l.impuesto, 0);
  const totalVentaNeta = lineas.reduce((a, l) => a + l.subtotal, 0);
  const totalGravado = lineas.filter(l => l.tarifa > 0).reduce((a, l) => a + l.subtotal, 0);
  const fecha = atr(generales, 'FechaHoraEmision');
  const moneda = atr(generales, 'CodigoMoneda');
  return {
    ok: true,
    xml: texto,
    doc: {
      tipo: TIPO_FEL[tipoDte] ?? 'Factura electrónica', version: `FEL ${tipoDte}`, clave: uuid.toUpperCase(),
      consecutivo: `${atr(aut, 'Serie')}-${atr(aut, 'Numero')}`,
      fechaEmision: fecha && !isNaN(new Date(fecha).getTime()) ? new Date(fecha).toISOString() : new Date().toISOString(),
      proveedor: atr(emisor, 'NombreEmisor') || atr(emisor, 'NombreComercial') || '(sin nombre)',
      proveedorIdentificacion: atr(emisor, 'NITEmisor'),
      proveedorTipoIdentificacion: '02',
      proveedorCorreo: atr(emisor, 'CorreoEmisor'),
      receptorNombre: atr(receptor, 'NombreReceptor'),
      receptorIdentificacion: atr(receptor, 'IDReceptor'),
      actividadEmisor: '', actividadReceptor: '',
      condicionVenta: tipoDte === 'FCAM' ? '02' : '01',
      // El quetzal es la moneda local del sistema (código interno CRC)
      moneda: moneda === 'USD' ? 'USD' : 'CRC',
      tipoCambio: 1,
      totalGravado, totalExento: totalVentaNeta - totalGravado, totalExonerado: 0,
      totalDescuentos: lineas.reduce((a, l) => a + l.descuento / (l.tarifa > 0 ? 1.12 : 1), 0),
      totalVentaNeta, totalImpuesto,
      totalOtrosCargos: Math.max(0, Math.round((totalComprobante - totalVentaNeta - totalImpuesto) * 100) / 100),
      totalComprobante,
      tarifaPrincipal: totalGravado > 0 ? 12 : 0,
      lineas,
    },
  };
}
