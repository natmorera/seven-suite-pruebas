// Comprobante estándar de una operación de cobro o pago y una constancia por
// cada tipo de retención de sus líneas de ajuste.
import { type ComprobanteDoc } from '@/components/ui/documento/ComprobanteOperacion';
import { armarComprobantes } from '@/components/ui/documento/comprobantes';
import { type EmpresaDoc } from '@/components/ui/documento/useEmpresaDoc';
import { type Operacion } from './datos';

export function comprobantesDeOp(op: Operacion, empresa: EmpresaDoc): ComprobanteDoc[] {
  const simbolo = op.moneda === 'USD' ? '$' : '₡';
  const retenciones = op.lineasAjuste.filter(l => String(l.tipoMovimiento).startsWith('retencion')).map(l => {
    const f = op.facturas.find(x => x.documento === l.documento);
    const pct = Number((l.justificacion.match(/(\d+(?:[.,]\d+)?)\s*%/) ?? [])[1]?.replace(',', '.')) || undefined;
    return { tipo: l.tipoMovimiento === 'retencion_fuente' ? 'en la fuente' : 'de impuestos', documento: l.documento, base: f?.importeOriginal ?? op.importe, monto: l.monto, porcentaje: pct };
  });
  return armarComprobantes({
    clase: op.tipo, numero: String(op.consecutivo), empresa, tercero: { nombre: op.nombreAux, identificacion: op.auxId },
    fecha: op.fecha, medioPago: `Transferencia bancaria · ${op.banco}${op.referencia ? ` · Ref. ${op.referencia}` : ''}`,
    concepto: op.titulo, simbolo, importe: op.importe,
    documentos: op.facturas.map(f => ({ numero: f.documento, fecha: f.fecha, importe: f.importeOriginal, aplicado: f.abono ?? 0 })),
    retenciones,
  });
}
