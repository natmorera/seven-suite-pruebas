// Retenciones de la factura especial (FESP). Lo usan el formulario y el XML.
// Se retiene todo el IVA y el ISR del 5 %
// sobre los primeros Q30,000 del monto gravable y 7 % sobre el excedente.
export function retencionesFacturaEspecial(montoGravable: number, iva: number, total: number) {
  const isr = Math.round((Math.min(montoGravable, 30000) * 0.05 + Math.max(0, montoGravable - 30000) * 0.07) * 100) / 100;
  return { isr, iva: Math.round(iva * 100) / 100, totalMenosRetenciones: Math.round((total - isr - iva) * 100) / 100 };
}
