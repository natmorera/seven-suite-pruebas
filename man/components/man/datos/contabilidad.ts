// Integración contable de ejemplo. Las cuentas y los libros son del catálogo de Accounting: con backend se leen
// de Accounting por su conexión; aquí son una lista fija.
import type { IntegracionContable } from '../tipos';

/** Nivel de una cuenta en el catálogo de Accounting: solo las auxiliares reciben movimientos. */
export type NivelCuenta = 'Mayor' | 'Submayor' | 'Detalle' | 'Auxiliar';
export interface CuentaContable { codigo: string; nombre: string; nivel: NivelCuenta }

const NIVEL_POR_LARGO: Record<number, NivelCuenta> = { 1: 'Mayor', 2: 'Submayor', 4: 'Detalle', 6: 'Auxiliar' };
/** Catálogo de cuentas de Accounting (ejemplo): el largo del código indica el nivel (1, 2, 4 y 6 dígitos). */
export const CUENTAS_ACC: CuentaContable[] = ([
  ['1', 'Activo'], ['11', 'Activo corriente'], ['1101', 'Caja'], ['110101', 'Caja general'], ['110102', 'Caja chica'],
  ['1102', 'Bancos'], ['110201', 'Bancos colones'], ['110202', 'Bancos dólares'],
  ['1103', 'Cuentas por cobrar'], ['110301', 'Cuentas por cobrar huéspedes'], ['110302', 'Cuentas por cobrar agencias'],
  ['2', 'Pasivo'], ['21', 'Pasivo corriente'], ['2101', 'Depósitos recibidos'], ['210101', 'Depósitos adelantados'], ['210102', 'Depósitos con tarjeta'],
  ['4', 'Ingresos'], ['41', 'Ingresos de operación'], ['4101', 'Hospedaje'], ['410101', 'Ingresos por hospedaje'],
  ['4102', 'Alimentos y bebidas'], ['410201', 'Ventas de alimentos'], ['410202', 'Ventas de bebidas'],
  ['5', 'Gastos'], ['55', 'Gastos financieros'], ['5501', 'Diferencias y comisiones'], ['550101', 'Diferencial cambiario'], ['550102', 'Comisiones bancarias'],
  ['550103', 'Cheques devueltos'],
] as [string, string][]).map(([codigo, nombre]) => ({ codigo, nombre, nivel: NIVEL_POR_LARGO[codigo.length] }));
export const cuentaPorCodigo = (codigo: string) => CUENTAS_ACC.find(c => c.codigo === codigo);
/** Libros contables de Accounting. */
export const LIBROS_ACC = ['Diario general', 'Ventas Front Desk', 'Ingresos y cobros'];
export const SISTEMAS_CONTABLES = ['Seven Accounting', 'Otro sistema'];

/** La configuración contable de Front Desk empieza vacía: se completa al integrarlo. */
export const contabilidadFDK: IntegracionContable = {
  sistema: '', inventario: '', libro: '',
  noContabilizarDiario: false, contabilizarDocumentos: false, balanceVias: false, integracionAsientos: false, produccionRepuestos: false,
  cuentaCargoDivisa: '', cuentaNoCheques: '',
  alertas: { folios: '', reservas: '', agencias: '', saldos: '', cancelaciones: '' },
};
