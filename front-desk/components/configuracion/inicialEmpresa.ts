// Valores iniciales de Empresa (documentos, consecutivos e impresión) y de Parámetros generales
// (tipo de cambio). Misma estructura que la Configuración de Accounting.
import type { AsignacionImpresora, Consecutivo, TipoCambio, TipoDocumento } from './datos';

const consecutivos: Consecutivo[] = [
  { id: 'cs1', tipo: 'Reservas', formato: '{N:4}', reinicio: 'Nunca', emitidos: 4200 },
  { id: 'cs2', tipo: 'Registros (check-in)', formato: '{N:4}', reinicio: 'Nunca', emitidos: 1197 },
  { id: 'cs3', tipo: 'Cargos', formato: '{N:1}', reinicio: 'Nunca', emitidos: 6 },
  { id: 'cs4', tipo: 'Facturas electrónicas', formato: '0010000101{N:10}', reinicio: 'Nunca', emitidos: 4511 },
  { id: 'cs5', tipo: 'Notas de crédito', formato: '0010000103{N:10}', reinicio: 'Nunca', emitidos: 12 },
  { id: 'cs6', tipo: 'Facturas de folios externos', formato: 'FE-{N:6}', reinicio: 'Nunca', emitidos: 0 },
  { id: 'cs7', tipo: 'Recibos de pago', formato: 'RC-{N:6}', reinicio: 'Nunca', emitidos: 2310 },
  { id: 'cs8', tipo: 'Depósitos en garantía', formato: 'DG-{N:5}', reinicio: 'Nunca', emitidos: 381 },
  { id: 'cs9', tipo: 'Canje de divisas', formato: 'CD-{AAAA}-{N:4}', reinicio: 'Anual', emitidos: 148 },
  { id: 'cs10', tipo: 'Cierres de caja', formato: 'CC-{AAAA}{MM}{N:3}', reinicio: 'Mensual', emitidos: 5 },
  { id: 'cs11', tipo: 'Consultas de rooming', formato: '{N:4}', reinicio: 'Nunca', emitidos: 1395 },
];

const tiposDocumento: TipoDocumento[] = [
  ['FACTURA', 'Factura electrónica'], ['NOTA_CREDITO', 'Nota de crédito'], ['PREFACTURA', 'Prefactura'], ['RECIBO', 'Recibo de pago'],
  ['TARJETA_REG', 'Tarjeta de registro'], ['CONF_RESERVA', 'Confirmación de reserva'], ['DEP_GARANTIA', 'Comprobante de depósito'],
  ['CANJE', 'Recibo de canje'], ['CIERRE_TURNO', 'Cierre de turno'], ['CHEQUE', 'Cheque'], ['REPORTE', 'Reportes'],
].map(([codigo, nombre], i) => ({ id: 'td' + i, codigo, nombre, enUso: true }));

const asignaciones: AsignacionImpresora[] = [
  { tipo: 'FACTURA', impresora: 'i1' }, { tipo: 'NOTA_CREDITO', impresora: 'i1' }, { tipo: 'PREFACTURA', impresora: '' },
  { tipo: 'RECIBO', impresora: 'no' }, { tipo: 'TARJETA_REG', impresora: 'i1' }, { tipo: 'CONF_RESERVA', impresora: '' },
  { tipo: 'DEP_GARANTIA', impresora: 'i2' }, { tipo: 'CANJE', impresora: 'i2' }, { tipo: 'CIERRE_TURNO', impresora: 'i2' },
  { tipo: 'CHEQUE', impresora: 'no' }, { tipo: 'REPORTE', impresora: '' },
];

// Colones por unidad de la divisa. La última fecha de cada moneda es la tasa vigente.
const tiposCambio: TipoCambio[] = [
  ['2026-10-06', 'USD', 506, 'Importación'], ['2026-10-06', 'EUR', 550, 'Manual'],
  ['2026-10-05', 'USD', 505.5, 'Importación'], ['2026-10-05', 'EUR', 549.2, 'Manual'],
  ['2026-10-04', 'USD', 505.8, 'Importación'], ['2026-10-03', 'USD', 506.2, 'Importación'],
  ['2026-10-02', 'USD', 507, 'Manual'], ['2026-10-01', 'USD', 507.4, 'Importación'], ['2026-10-01', 'EUR', 551.3, 'Manual'],
].map(([fecha, moneda, tasa, fuente], i) => ({ id: 'tc' + i, fecha, moneda, tasa, fuente }) as TipoCambio);

export const EMPRESA_INICIAL = { consecutivos, tiposDocumento, asignaciones, tiposCambio };
