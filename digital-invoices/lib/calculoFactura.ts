// Cálculo de un comprobante (TRIBU-CR v4.4 en Costa Rica, FEL en Guatemala), línea por línea y resumen.
// Es la MISMA función para el formulario (lo que ve el usuario) y para el
// servidor (lo que va en el XML y en la base), para que nunca difieran.
//
// Por línea:  MontoTotal = cantidad × precio
//             SubTotal   = MontoTotal − descuento
//             Impuesto   = SubTotal × tarifa
//             Exoneración= SubTotal × tarifa exonerada (≤ tarifa)
//             ImpuestoNeto = Impuesto − Exoneración
//             TotalLínea = SubTotal + ImpuestoNeto
// Resumen:    TotalVenta = Σ MontoTotal (gravado + exento + exonerado)
//             TotalVentaNeta = TotalVenta − TotalDescuentos
//             TotalComprobante = VentaNeta + Impuesto + OtrosCargos
import { tarifaPorcentaje } from '@/data/catalogosHacienda';
import { esGuatemalaActual } from '@/lib/paisActual';

export interface DescuentoLinea {
  monto: number; codigo: string; naturaleza?: string; porcentaje?: number;
  codigoOtro?: string;   // descripción del tipo si el código es 99 (CodigoDescuentoOTRO)
  cuenta?: string;       // cuenta contable del descuento (si no, se rebaja del ingreso)
}
// Impuesto adicional al IVA en la línea (selectivo, específico o «otro»)
export interface OtroImpuestoLinea {
  codigo: string;        // catálogo CODIGOS_IMPUESTO (02…99)
  descripcion?: string;  // obligatorio si es 99 (CodigoImpuestoOTRO)
  tarifa: number;        // porcentaje sobre la base de la línea
  cuenta?: string;       // cuenta contable del impuesto
}
export interface ExoneracionLinea {
  tipoDocumento: string; numeroDocumento: string; institucion: string; fechaEmision: string;
  tarifaExonerada: number;   // puntos porcentuales exonerados (p. ej. 13 = exoneración total del 13%)
  nombre?: string;
  articulo?: string; inciso?: string;          // exoneraciones por ley
  tipoDocumentoOtro?: string;                  // si el tipo es 99
  nombreInstitucionOtros?: string;             // si la institución es 99
}
export interface LineaCalculo {
  codigoCabys: string; cantidad: number; precioUnitario: number; codigoTarifa: string;
  descuento?: DescuentoLinea | null; exoneracion?: ExoneracionLinea | null;
  otroImpuesto?: OtroImpuestoLinea | null;
}
export interface OtroCargo {
  tipoDocumento: string; detalle: string; porcentaje?: number | null; monto?: number | null;
  // Datos del tercero (obligatorios si el cargo es un cobro a favor de un tercero, código 04)
  terceroTipoIdentificacion?: string; terceroIdentificacion?: string; terceroNombre?: string;
}

// CABYS: primer dígito 0–4 = bienes (mercancías), 5–9 = servicios.
// Guatemala: el código de la línea es B (bien) o S (servicio).
export const esServicio = (codigo: string) => codigo === 'S' || /^[5-9]/.test(codigo ?? '');

const r5 = (n: number) => Math.round(n * 100000) / 100000;

// Guatemala: el precio de la línea lleva el IVA incluido (FEL). Para que el
// resto del sistema (totales, asientos, reportes) siga trabajando con montos
// sin IVA, el monto y el descuento se pasan a monto gravable: ÷ (1 + tarifa).
// El precio tal como se escribió queda en montoConIva. En Costa Rica el precio
// no lleva IVA y los dos montos son iguales.
export function calcularLinea(l: LineaCalculo) {
  const tarifa = tarifaPorcentaje(l.codigoTarifa);
  const factor = esGuatemalaActual() ? 1 + tarifa / 100 : 1;
  const montoConIva = r5(l.cantidad * l.precioUnitario);
  const descuentoConIva = r5(Math.min(Math.max(0, l.descuento?.monto ?? 0), montoConIva));
  const montoTotal = r5(montoConIva / factor);
  const descuento = r5(descuentoConIva / factor);
  const subtotal = r5(montoTotal - descuento);
  const impuesto = r5(subtotal * tarifa / 100);
  const tarifaExonerada = l.exoneracion ? Math.min(Math.max(0, l.exoneracion.tarifaExonerada), tarifa) : 0;
  const montoExoneracion = r5(subtotal * tarifaExonerada / 100);
  const otroImpuesto = l.otroImpuesto && l.otroImpuesto.tarifa > 0 ? r5(subtotal * l.otroImpuesto.tarifa / 100) : 0;
  const impuestoNeto = r5(impuesto - montoExoneracion + otroImpuesto);
  const proporcionExonerada = tarifa > 0 ? tarifaExonerada / tarifa : 0;
  return { montoConIva, descuentoConIva, montoTotal, descuento, subtotal, tarifa, impuesto, tarifaExonerada, montoExoneracion, otroImpuesto, impuestoNeto, proporcionExonerada, totalLinea: r5(subtotal + impuestoNeto) };
}

export function calcularDocumento(lineas: LineaCalculo[], otrosCargos: OtroCargo[] = []) {
  const t = {
    servGravados: 0, servExentos: 0, servExonerados: 0, mercGravadas: 0, mercExentas: 0, mercExoneradas: 0,
    descuentos: 0, impuesto: 0, exoneracion: 0,
  };
  const calc = lineas.map(l => {
    const c = calcularLinea(l);
    const serv = esServicio(l.codigoCabys);
    if (c.tarifa === 0) { if (serv) t.servExentos += c.montoTotal; else t.mercExentas += c.montoTotal; }
    else {
      const exon = c.montoTotal * c.proporcionExonerada;
      const grav = c.montoTotal - exon;
      if (serv) { t.servGravados += grav; t.servExonerados += exon; } else { t.mercGravadas += grav; t.mercExoneradas += exon; }
    }
    t.descuentos += c.descuento; t.impuesto += c.impuestoNeto; t.exoneracion += c.montoExoneracion;
    return c;
  });
  const totalGravado = t.servGravados + t.mercGravadas;
  const totalExento = t.servExentos + t.mercExentas;
  const totalExonerado = t.servExonerados + t.mercExoneradas;
  const totalVenta = totalGravado + totalExento + totalExonerado;
  const totalVentaNeta = totalVenta - t.descuentos;
  const cargos = otrosCargos.map(o => ({
    ...o, montoCalculado: r5(o.porcentaje != null && o.porcentaje > 0 ? totalVentaNeta * o.porcentaje / 100 : Number(o.monto ?? 0)),
  }));
  const totalOtrosCargos = cargos.reduce((a, o) => a + o.montoCalculado, 0);
  return {
    lineas: calc, cargos,
    ...t, totalGravado, totalExento, totalExonerado, totalVenta, totalDescuentos: t.descuentos, totalVentaNeta,
    totalImpuesto: t.impuesto, totalOtrosCargos, totalComprobante: r5(totalVentaNeta + t.impuesto + totalOtrosCargos),
  };
}

// Catálogos v4.4 que usa el formulario
// Códigos de impuesto distintos del IVA (v4.4)
// Guatemala: impuestos además del IVA (código FEL del impuesto)
export const CODIGOS_IMPUESTO_GT = [
  { value: '03', label: 'Turismo hospedaje (ITH)' },
  { value: '07', label: 'Tasa municipal' },
  { value: '99', label: 'Otros' },
] as const;
export const codigosImpuesto = () => (esGuatemalaActual() ? CODIGOS_IMPUESTO_GT : CODIGOS_IMPUESTO);
export const CODIGOS_IMPUESTO = [
  { value: '02', label: 'Impuesto selectivo de consumo' },
  { value: '03', label: 'Impuesto único a los combustibles' },
  { value: '04', label: 'Impuesto específico de bebidas alcohólicas' },
  { value: '05', label: 'Impuesto específico sobre bebidas envasadas sin contenido alcohólico y jabones de tocador' },
  { value: '06', label: 'Impuesto a los productos de tabaco' },
  { value: '12', label: 'Impuesto específico al cemento' },
  { value: '99', label: 'Otros' },
] as const;

export const CODIGOS_DESCUENTO = [
  { value: '01', label: 'Descuento por regalía' },
  { value: '02', label: 'Descuento por regalía con IVA cobrado al cliente' },
  { value: '03', label: 'Descuento por bonificación' },
  { value: '04', label: 'Descuento por volumen' },
  { value: '05', label: 'Descuento por temporada (estacional)' },
  { value: '06', label: 'Descuento promocional' },
  { value: '07', label: 'Descuento comercial' },
  { value: '08', label: 'Descuento por frecuencia' },
  { value: '09', label: 'Descuento sostenido' },
  { value: '99', label: 'Otros descuentos' },
] as const;

export const TIPOS_OTRO_CARGO = [
  { value: '06', label: 'Impuesto de servicio (10%)', porcentaje: 10 },
  { value: '01', label: 'Contribución parafiscal' },
  { value: '02', label: 'Timbre de la Cruz Roja' },
  { value: '03', label: 'Timbre de Benemérito Cuerpo de Bomberos' },
  { value: '04', label: 'Cobro de un tercero' },
  { value: '05', label: 'Costos de exportación' },
  { value: '07', label: 'Timbre de colegios profesionales' },
  { value: '08', label: 'Depósitos de garantía' },
  { value: '09', label: 'Multas o penalizaciones' },
  { value: '10', label: 'Intereses moratorios' },
  { value: '99', label: 'Otros cargos' },
] as const;

export const CODIGOS_REFERENCIA = [
  { value: '01', label: 'Anula documento de referencia' },
  { value: '02', label: 'Corrige texto del documento de referencia' },
  { value: '03', label: 'Corrige monto' },
  { value: '04', label: 'Referencia a otro documento' },
  { value: '05', label: 'Sustituye comprobante provisional por contingencia' },
  { value: '06', label: 'Devolución de mercancía' },
  { value: '07', label: 'Sustituye comprobante electrónico' },
  { value: '99', label: 'Otros' },
] as const;

// Guatemala: mismos códigos internos, con los documentos de Guatemala
export const TIPOS_IDENTIFICACION_GT = [
  { value: '02', label: 'NIT' },
  { value: '06', label: 'Consumidor final (CF)' },
  { value: '01', label: 'CUI (DPI)' },
  { value: '05', label: 'Extranjero (pasaporte)' },
  { value: '03', label: 'Residente extranjero' },
  { value: '04', label: 'Otro documento' },
] as const;
export const tiposIdentificacion = () => (esGuatemalaActual() ? TIPOS_IDENTIFICACION_GT : TIPOS_IDENTIFICACION);
export const TIPOS_IDENTIFICACION = [
  { value: '01', label: 'Cédula física' },
  { value: '02', label: 'Cédula jurídica' },
  { value: '03', label: 'DIMEX' },
  { value: '04', label: 'NITE' },
  { value: '05', label: 'Extranjero no domiciliado' },
  { value: '06', label: 'No contribuyente' },
] as const;
