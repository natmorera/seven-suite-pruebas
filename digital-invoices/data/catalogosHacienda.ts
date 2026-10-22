import { esGuatemalaActual } from '@/lib/paisActual';


export const TIPOS_DOCUMENTO = [
  'Factura electrónica',
  'Nota de crédito',
  'Nota de débito',
  'Tiquete electrónico',
  'Factura electrónica de compra',
  'Factura de exportación',
  'Recibo Electrónico de Pago',
] as const;
// Guatemala agrega el recibo de anticipos (RANT), para depósitos de reservas,
// y no emite facturas de exportación
export type TipoDocumento = typeof TIPOS_DOCUMENTO[number] | 'Recibo de anticipos';
export const TIPOS_DOCUMENTO_GT: readonly TipoDocumento[] = [...TIPOS_DOCUMENTO.filter(t => t !== 'Factura de exportación'), 'Recibo de anticipos'];
export const tiposDocumento = (): readonly TipoDocumento[] => (esGuatemalaActual() ? TIPOS_DOCUMENTO_GT : TIPOS_DOCUMENTO);

// Todo lo que lleva consecutivo propio por caja/terminal (Hacienda v4.4):
// los 7 comprobantes más los tres mensajes de receptor (acuses de compras).
export const TIPOS_NUMERACION: { tipo: string; codigo: string; grupo: 'Comprobantes' | 'Acuses de compras' }[] = [
  { tipo: 'Factura electrónica', codigo: '01', grupo: 'Comprobantes' },
  { tipo: 'Nota de débito', codigo: '02', grupo: 'Comprobantes' },
  { tipo: 'Nota de crédito', codigo: '03', grupo: 'Comprobantes' },
  { tipo: 'Tiquete electrónico', codigo: '04', grupo: 'Comprobantes' },
  { tipo: 'Factura electrónica de compra', codigo: '08', grupo: 'Comprobantes' },
  { tipo: 'Factura de exportación', codigo: '09', grupo: 'Comprobantes' },
  { tipo: 'Recibo Electrónico de Pago', codigo: '10', grupo: 'Comprobantes' },
  { tipo: 'Aceptación de comprobante', codigo: '05', grupo: 'Acuses de compras' },
  { tipo: 'Aceptación parcial', codigo: '06', grupo: 'Acuses de compras' },
  { tipo: 'Rechazo de comprobante', codigo: '07', grupo: 'Acuses de compras' },
];
const NUMERACION_GT = [...TIPOS_NUMERACION.slice(0, 7).filter(t => t.tipo !== 'Factura de exportación'), { tipo: 'Recibo de anticipos', codigo: 'RA', grupo: 'Comprobantes' as const }, ...TIPOS_NUMERACION.slice(7)];
export const tiposNumeracion = () => (esGuatemalaActual() ? NUMERACION_GT : TIPOS_NUMERACION);

// Códigos reales de Hacienda para "Condición de venta" (campo obligatorio).
// La lista anterior tenía solo 9 entradas y con los códigos 13/14/15 mal
// etiquetados (venían corridos: "13" decía lo que en realidad es "07", etc.)
// — esta es la lista completa y verificada contra la documentación real de
// la API v4.4 (14 códigos).
export const CONDICIONES_VENTA = [
  { value: '01', label: 'Contado' },
  { value: '02', label: 'Crédito' },
  { value: '03', label: 'Consignación' },
  { value: '04', label: 'Apartado' },
  { value: '05', label: 'Arrendamiento con opción de compra' },
  { value: '06', label: 'Arrendamiento en función financiera' },
  { value: '07', label: 'Cobro a favor de un tercero' },
  { value: '08', label: 'Servicios prestados al Estado a crédito' },
  { value: '09', label: 'Pago de servicios prestados al Estado' },
  { value: '10', label: 'Venta a crédito en IVA hasta 90 días (art. 27 LIVA)' },
  { value: '11', label: 'Pago de venta a crédito en IVA hasta 90 días' },
  { value: '12', label: 'Venta de mercancía no nacionalizada' },
  { value: '13', label: 'Venta de bienes usados no contribuyente' },
  { value: '14', label: 'Arrendamiento operativo' },
  { value: '15', label: 'Arrendamiento financiero' },
  { value: '99', label: 'Otros' },
] as const;
export type CondicionVentaCodigo = typeof CONDICIONES_VENTA[number]['value'];
// Guatemala: contado o crédito. A crédito, la factura es cambiaria (FCAM) y
// lleva sus abonos programados.
export const CONDICIONES_VENTA_GT = [
  { value: '01', label: 'Contado' },
  { value: '02', label: 'Crédito · Factura cambiaria con abonos' },
] as const;
export const condicionesVenta = (): readonly { value: string; label: string }[] => (esGuatemalaActual() ? CONDICIONES_VENTA_GT : CONDICIONES_VENTA);

// No todos los comprobantes admiten todos los códigos — mandar uno fuera de
// la lista de su propio tipo lo rechaza Hacienda con -1 y consume el
// consecutivo. El Recibo Electrónico de Pago es el más restringido (solo
// paga facturas emitidas con condición 08 o 10).
export function condicionesVentaPermitidas(tipoDocumento: string): readonly string[] {
  if (tipoDocumento === 'Recibo Electrónico de Pago') return ['09', '11'];
  // 09 y 11 son los pagos: solo van en el recibo electrónico de pago
  const sinPagos = condicionesVenta().map(c => c.value as string).filter(v => v !== '09' && v !== '11');
  if (tipoDocumento === 'Nota de crédito' || tipoDocumento === 'Nota de débito') {
    return sinPagos;
  }
  if (tipoDocumento === 'Tiquete electrónico' || tipoDocumento === 'Factura electrónica de compra' || tipoDocumento === 'Factura de exportación') {
    return sinPagos.filter(v => v !== '12');
  }
  return sinPagos; // Factura electrónica: el catálogo completo, menos los pagos
}

export const TARIFAS_IVA = [
  { value: '08', tarifa: 13, label: '13% · Tarifa general' },
  { value: '04', tarifa: 4, label: '4% · Reducida' },
  { value: '03', tarifa: 2, label: '2% · Reducida' },
  { value: '02', tarifa: 1, label: '1% · Reducida' },
  { value: '09', tarifa: 0.5, label: '0.5% · Reducida' },
  { value: '10', tarifa: 0, label: 'Exenta' },
  { value: '11', tarifa: 0, label: 'No sujeta (sin derecho a crédito)' },
  { value: '01', tarifa: 0, label: '0% · Artículo 32, núm. 1 RLIVA' },
  { value: '06', tarifa: 4, label: '4% · Transitorio (solo Nota de crédito/débito)', soloNotas: true },
  { value: '07', tarifa: 8, label: '8% · Transitorio (solo Nota de crédito/débito)', soloNotas: true },
  { value: '05', tarifa: 0, label: '0% · Transitorio (solo Nota de crédito/débito)', soloNotas: true },
] as const;
export type CodigoTarifaIva = typeof TARIFAS_IVA[number]['value'];
// Guatemala: unidades gravables del IVA. Se conservan los códigos internos de
// línea: 08 = unidad gravable 1 (12 %), 10 = unidad gravable 2 (exento o no
// afecto).
export const TARIFAS_IVA_GT = [
  { value: '08', tarifa: 12, label: '12% · Unidad gravable 1' },
  { value: '10', tarifa: 0, label: 'Exento o no afecto · Unidad gravable 2' },
] as const;
type TarifaIva = { value: string; tarifa: number; label: string; soloNotas?: boolean };
export const tarifasIva = (): readonly TarifaIva[] => (esGuatemalaActual() ? TARIFAS_IVA_GT : TARIFAS_IVA);

// Tipo de transacción de la línea (v4.4, opcional). Sin indicar se entiende
// venta normal.
export const TIPOS_TRANSACCION = [
  { value: '01', label: '01 · Venta normal de bienes y servicios' },
  { value: '02', label: '02 · Mercancía de autoconsumo exenta' },
  { value: '03', label: '03 · Mercancía de autoconsumo gravada' },
  { value: '04', label: '04 · Servicio de autoconsumo exento' },
  { value: '05', label: '05 · Servicio de autoconsumo gravado' },
  { value: '06', label: '06 · Cuota de afiliación' },
  { value: '07', label: '07 · Cuota de afiliación exenta' },
  { value: '08', label: '08 · Bienes de capital para el emisor' },
  { value: '09', label: '09 · Bienes de capital para el receptor' },
  { value: '10', label: '10 · Bienes de capital para el emisor y el receptor' },
  { value: '11', label: '11 · Bienes de capital de autoconsumo exento para el emisor' },
  { value: '12', label: '12 · Bienes de capital sin contraprestación a terceros exento para el emisor' },
  { value: '13', label: '13 · Sin contraprestación a terceros' },
] as const;

export function tarifaPorcentaje(codigoTarifa: string): number {
  return tarifasIva().find(t => t.value === codigoTarifa)?.tarifa ?? 0;
}
// El catálogo "Mis CABYS" solo guarda un % (lo que trae el buscador de
// CABYS), no un código de Hacienda — esto traduce ese % al código más
// razonable cuando se arma una línea nueva a partir de un favorito. Para
// 0% se asume "Exenta" (10), el caso más común; si en realidad era "No
// sujeta" (11) se puede cambiar en el selector de la línea.
export function codigoTarifaDesdePorcentaje(pct: number): string {
  const match = tarifasIva().find(t => t.tarifa === pct && !t.soloNotas);
  return match?.value ?? '08';
}
// Filtra las tarifas que de verdad se pueden usar en un documento dado —
// las transitorias (05/06/07) solo aparecen como opción en NC/ND.
// Catálogos reales de exoneración — la pantalla de configuración solo
// tenía "código" y "descripción" libres, pero Hacienda pide un tipo de
// documento y una institución de un catálogo cerrado, no texto libre.
export const TIPOS_DOCUMENTO_EXONERACION = [
  { value: '01', label: 'Compras autorizadas por la Dirección General de Tributación' },
  { value: '02', label: 'Ventas exentas a diplomáticos' },
  { value: '03', label: 'Autorizado por Ley Especial' },
  { value: '04', label: 'Exenciones DGH · Autorización Local Genérica' },
  { value: '05', label: 'Exenciones DGH · Transitorio V' },
  { value: '06', label: 'Servicios turísticos inscritos ante el ICT' },
  { value: '07', label: 'Transitorio XVII (reciclaje)' },
  { value: '08', label: 'Exoneración a Zona Franca' },
  { value: '09', label: 'Servicios complementarios para la exportación' },
  { value: '10', label: 'Órgano de las corporaciones municipales' },
  { value: '11', label: 'Exenciones DGH · Autorización de Impuesto Local Concreta' },
  { value: '99', label: 'Otros' },
] as const;

export const INSTITUCIONES_EXONERACION = [
  { value: '01', label: 'Ministerio de Hacienda' },
  { value: '02', label: 'Ministerio de Relaciones Exteriores y Culto' },
  { value: '03', label: 'Ministerio de Agricultura y Ganadería' },
  { value: '04', label: 'Ministerio de Economía, Industria y Comercio' },
  { value: '05', label: 'Cruz Roja Costarricense' },
  { value: '06', label: 'Benemérito Cuerpo de Bomberos' },
  { value: '07', label: 'Asociación Obras del Espíritu Santo' },
  { value: '08', label: 'Fecrunapa' },
  { value: '09', label: 'EARTH' },
  { value: '10', label: 'INCAE' },
  { value: '11', label: 'Junta de Protección Social' },
  { value: '12', label: 'Aresep' },
  { value: '99', label: 'Otros' },
] as const;

// Qué pide el formulario de exoneración según el tipo de documento: los
// permisos de la DGH (04, 05, 11) se identifican por su número de
// autorización; las exoneraciones por ley (03, 08, 09, 10) necesitan el
// artículo e inciso; "99 Otros" necesita describir el tipo.
export interface ReglaExoneracion {
  institucion: string;            // institución que normalmente la emite
  nombreInstitucionOtros?: string; // si la institución es 99
  pideArticulo: boolean;
  pideDescripcionTipo: boolean;
  etiquetaNumero: string;
  placeholderNumero: string;
  ayuda: string;
}
export const REGLAS_EXONERACION: Record<string, ReglaExoneracion> = {
  '01': { institucion: '01', pideArticulo: false, pideDescripcionTipo: false, etiquetaNumero: 'Número de autorización', placeholderNumero: 'Número de la autorización de la DGT', ayuda: 'Compra autorizada por la Dirección General de Tributación.' },
  '02': { institucion: '02', pideArticulo: false, pideDescripcionTipo: false, etiquetaNumero: 'Número de carné o nota diplomática', placeholderNumero: 'Ej. RE-2026-000145', ayuda: 'Venta a una misión o funcionario diplomático acreditado por Relaciones Exteriores.' },
  '03': { institucion: '99', pideArticulo: true, pideDescripcionTipo: false, etiquetaNumero: 'Número de documento', placeholderNumero: 'Número del oficio o resolución', ayuda: 'Exoneración otorgada directamente por una ley especial: indicá el artículo e inciso.' },
  '04': { institucion: '01', pideArticulo: false, pideDescripcionTipo: false, etiquetaNumero: 'Número de autorización (AL)', placeholderNumero: 'AL-00000000-26', ayuda: 'Autorización genérica emitida en el sistema EXONET de la DGH.' },
  '05': { institucion: '01', pideArticulo: false, pideDescripcionTipo: false, etiquetaNumero: 'Número de autorización', placeholderNumero: 'AL-00000000-26', ayuda: 'Exención del Transitorio V de la Ley 9635.' },
  '06': { institucion: '99', nombreInstitucionOtros: 'Instituto Costarricense de Turismo', pideArticulo: false, pideDescripcionTipo: false, etiquetaNumero: 'Número de declaratoria turística', placeholderNumero: 'Número de la declaratoria del ICT', ayuda: 'Servicios turísticos de empresas inscritas ante el ICT.' },
  '07': { institucion: '01', pideArticulo: false, pideDescripcionTipo: false, etiquetaNumero: 'Número de autorización', placeholderNumero: 'Número de la autorización', ayuda: 'Transitorio XVII (materiales de reciclaje).' },
  '08': { institucion: '99', nombreInstitucionOtros: 'PROCOMER', pideArticulo: true, pideDescripcionTipo: false, etiquetaNumero: 'Número de autorización de Zona Franca', placeholderNumero: 'Ej. ZF-00012345-2026', ayuda: 'Empresa beneficiaria del régimen de Zona Franca (Ley 7210).' },
  '09': { institucion: '99', nombreInstitucionOtros: 'PROCOMER', pideArticulo: true, pideDescripcionTipo: false, etiquetaNumero: 'Número de autorización', placeholderNumero: 'Número de la autorización', ayuda: 'Servicios complementarios a la exportación.' },
  '10': { institucion: '99', nombreInstitucionOtros: 'Municipalidad', pideArticulo: true, pideDescripcionTipo: false, etiquetaNumero: 'Número de documento', placeholderNumero: 'Número del oficio municipal', ayuda: 'Órganos de las corporaciones municipales.' },
  '11': { institucion: '01', pideArticulo: false, pideDescripcionTipo: false, etiquetaNumero: 'Número de autorización (AL)', placeholderNumero: 'AL-00000000-26', ayuda: 'Autorización de impuesto local concreta emitida por la DGH.' },
  '99': { institucion: '99', pideArticulo: true, pideDescripcionTipo: true, etiquetaNumero: 'Número de documento', placeholderNumero: 'Número del documento', ayuda: 'Otro tipo de exoneración: describí el tipo de documento.' },
};
export const reglaExoneracion = (tipo: string): ReglaExoneracion => REGLAS_EXONERACION[tipo] ?? REGLAS_EXONERACION['99'];

export function tarifasPermitidas(tipoDocumento: string) {
  const esNota = tipoDocumento === 'Nota de crédito' || tipoDocumento === 'Nota de débito';
  return tarifasIva().filter(t => esNota || !t.soloNotas);
}

// Medio de pago: Hacienda lo pide como selección MÚLTIPLE (un documento puede
// llevar más de un medio, ej. parte en efectivo y parte con tarjeta), no un
// valor único como teníamos.
export const MEDIOS_PAGO = [
  { value: '01', label: 'Efectivo' },
  { value: '02', label: 'Tarjeta' },
  { value: '03', label: 'Cheque' },
  { value: '04', label: 'Transferencia - depósito bancario' },
  { value: '05', label: 'Recaudado por terceros' },
  { value: '06', label: 'SINPE Móvil' },
  { value: '07', label: 'Plataforma digital' },
  { value: '99', label: 'Otros' },
] as const;
export type MedioPagoCodigo = typeof MEDIOS_PAGO[number]['value'];

// Guatemala: medios de pago del complemento de FEL (siglas de la SAT)
export const MEDIOS_PAGO_GT = [
  { value: 'EF', label: 'Efectivo' },
  { value: 'TC', label: 'Tarjeta de crédito' },
  { value: 'TD', label: 'Tarjeta de débito' },
  { value: 'CH', label: 'Cheque' },
] as const;
export const mediosPago = (): readonly { value: string; label: string }[] => (esGuatemalaActual() ? MEDIOS_PAGO_GT : MEDIOS_PAGO);
// Medio de pago con el que empieza un documento nuevo
export const medioInicial = () => (esGuatemalaActual() ? 'EF' : '01');

export function labelCondicionVenta(codigo: string): string {
  return condicionesVenta().find(c => c.value === codigo)?.label ?? codigo;
}
export function labelMedioPago(codigo: string): string {
  return [...MEDIOS_PAGO_GT, ...MEDIOS_PAGO].find(m => m.value === codigo)?.label ?? codigo;
}
