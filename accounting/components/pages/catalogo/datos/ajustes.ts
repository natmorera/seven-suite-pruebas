

// ── Movimientos de ajuste (líneas de ajuste en Cobros / Pagos y demás operaciones bancarias)
// ── Cada empresa crea sus tipos de movimiento (p. ej. «Retención en la fuente», «Comisión
// bancaria», «Redondeo») y define su efecto contable (suma/resta), a qué operaciones aplican y
// a qué cuentas se enlazan. «Nota administrativa» es la única fija: no se enlaza a cuenta
// porque usa la del cliente o proveedor de la operación.
export type TipoMovimientoAjuste = string;
const NOTA_ADMINISTRATIVA_VALUE = 'nota_administrativa';
export const NOTA_ADMINISTRATIVA = {
  value: NOTA_ADMINISTRATIVA_VALUE,
  label: 'Nota administrativa',
  desc: 'El cliente pagó de más y no hay factura a la cual aplicarlo - genera un saldo a favor. Siempre usa la cuenta del cliente/proveedor.',
  signo: 1 as const,
};
// Operaciones bancarias donde puede aplicar un movimiento de ajuste.
export const OPERACIONES_AJUSTE: { value: string; label: string }[] = [
  { value:'cobros',        label:'Cobros' },
  { value:'pagos',         label:'Pagos' },
  { value:'depositos',     label:'Depósitos' },
  { value:'transferencias',label:'Transferencias' },
  { value:'tarjetas',      label:'Gestión de tarjetas' },
  { value:'cheques',       label:'Cheques' },
];
export interface EnlaceAjuste {
  id: string;
  tipoMovimiento: TipoMovimientoAjuste; // nombre libre, lo escribe quien lo crea
  aplicaA: string[]; // subconjunto de OPERACIONES_AJUSTE (values)
  cuentaCode?: string; // opcional
  cuentaNombre?: string;
  signo: 1 | -1; // 1 = suma (crédito) · -1 = resta (débito)
  activo: boolean;
  // los movimientos de ajuste siempre son un porcentaje (ej. 2% de
  // retención en la fuente) - no un monto fijo, porque el monto real se
  // calcula sobre el total de cada operación. Es opcional: si se deja en
  // blanco, el porcentaje se sigue escribiendo a mano en la línea de ajuste.
  porcentaje?: number;
}
// Enlaces tomados del documento de escenarios de Cobros y Pagos (Nicaragua).
export const ENLACES_AJUSTE_INIT: EnlaceAjuste[] = [
  { id:'ea1', tipoMovimiento:'Retención en la fuente',   aplicaA:['cobros'], cuentaCode:'160-001-0001', cuentaNombre:'Retención compra de bienes y servicios',     signo:-1, activo:true, porcentaje:2 },
  { id:'ea2', tipoMovimiento:'Retención municipal',      aplicaA:['cobros'], cuentaCode:'160-001-0002', cuentaNombre:'Retención 1% municipal',                       signo:-1, activo:true, porcentaje:1 },
  { id:'ea3', tipoMovimiento:'Retención en la fuente',   aplicaA:['pagos'],  cuentaCode:'200-001-0001', cuentaNombre:'Retención compra de bienes y servicios',     signo:-1, activo:true, porcentaje:2 },
  { id:'ea4', tipoMovimiento:'Retención en la fuente',   aplicaA:['pagos'],  cuentaCode:'200-001-0002', cuentaNombre:'Retención servicios profesionales jurídico', signo:-1, activo:true, porcentaje:10 },
  { id:'ea5', tipoMovimiento:'Retención en la fuente',   aplicaA:['pagos'],  cuentaCode:'200-001-0003', cuentaNombre:'Retención servicios profesionales natural',  signo:-1, activo:true, porcentaje:10 },
  { id:'ea6', tipoMovimiento:'Retención en la fuente',   aplicaA:['pagos'],  cuentaCode:'200-001-0010', cuentaNombre:'Retención por renta de capital',               signo:-1, activo:true, porcentaje:1.5 },
  { id:'ea7', tipoMovimiento:'Retención municipal',      aplicaA:['pagos'],  cuentaCode:'200-001-0011', cuentaNombre:'Retención 1% municipal',                       signo:-1, activo:true, porcentaje:1 },
];
export function enlacesPara(tipo: TipoMovimientoAjuste, operacion: string, enlaces: EnlaceAjuste[] = ENLACES_AJUSTE_INIT): EnlaceAjuste[] {
  // Solo interesan acá los enlaces que sí tienen una cuenta asignada - la
  // cuenta es opcional en la configuración (puede existir un tipo con solo
  // el porcentaje, a modo de referencia), pero sin cuenta no hay nada que
  // ofrecer para autocompletar en la línea de ajuste.
  return enlaces.filter(e => e.activo && e.tipoMovimiento === tipo && e.aplicaA.includes(operacion) && !!e.cuentaCode);
}
