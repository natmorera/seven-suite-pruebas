'use client';
import { C, FONT } from '@/components/ui/tokens';
import { fmtNum } from '@/components/ui/formato';
import { type TipoMovimientoAjuste } from '@/components/pages/catalogo/datos/ajustes';

export const F = FONT;
export const BRAND = C.brand;
export function fmt2(n: number) { return fmtNum(n, 2); }
// ── Types ─────────────────────────────────────────────────────────────────────
type TipoOp = 'Cobro' | 'Pago';
type EstadoOp = 'Pendiente' | 'Aplicado' | 'Borrador' | 'Anulado' | 'Contabilizado';
export interface Factura {
  id: string;
  documento: string;
  fecha: string;
  descripcion: string;
  importeOriginal: number;
  saldoPendiente: number;
  abono?: number;
}
export interface LineaAjuste {
  id: number;
  cuenta: string;
  documento: string;
  moneda: string;
  monto: number;
  // Tipo de movimiento (ajustes predefinidos): define si el monto suma o resta en la operación
  // (crédito/débito), así nunca hay que escribir el signo. '' = línea manual: sin tipo, cuenta
  // libre y signo a criterio de quien la carga.
  tipoMovimiento: TipoMovimientoAjuste | '';
  justificacion: string;
}
export interface Operacion {
  id: number;
  tipo: TipoOp;
  estado: EstadoOp;
  consecutivo: number;
  cuenta: string;
  nombreAux: string;
  auxId: string;
  cuentaContable: string;
  titulo: string;
  flujo: string;
  fecha: string;
  moneda: 'CRC' | 'USD';
  importe: number;
  banco: string;
  referencia: string;
  facturas: Factura[];
  lineasAjuste: LineaAjuste[];
}
// ── Datos de ejemplo ─────────────────────────────────────────────────────────────────
export const BANCOS = ['BAC ¢ - Cta. 4646545466888', 'BNCR ¢ - Cta. 5565545547777', 'BAC $ - Cta. 4563212454587'];
export const FACTURAS_MOCK: Factura[] = [
  { id:'f1', documento:'FE00000001', fecha:'10/04/2026', descripcion:'Servicio hospedaje abril',  importeOriginal:380000, saldoPendiente:380000 },
  { id:'f2', documento:'FE00000002', fecha:'18/04/2026', descripcion:'Hospedaje - grupo',          importeOriginal:215000, saldoPendiente:215000 },
  { id:'f3', documento:'FE00000003', fecha:'02/05/2026', descripcion:'Eventos y banquetes',        importeOriginal:490000, saldoPendiente:490000 },
  { id:'f4', documento:'FE00000004', fecha:'01/03/2026', descripcion:'Alquiler sala de conferencias',importeOriginal:120000,saldoPendiente:120000 },
];
export const FACTURAS_PAGO_MOCK: Factura[] = [
  { id:'p1', documento:'FE00000001', fecha:'00/00/0000', descripcion:'Compra insumos cocina', importeOriginal:276000, saldoPendiente:276000, abono:276000 },
];
export const CUENTAS_CLIENTES = [
  { code:'100-002-0001-0001', nombre:'Distribuidora La Florida S.A.', tipo:'Cliente',    auxId:'CLI-0001' },
  { code:'100-002-0001-0002', nombre:'Hotel Las Palmas S.A.',          tipo:'Cliente',    auxId:'CLI-0002' },
  { code:'100-002-0001-0003', nombre:'AuraTours S.A.',                 tipo:'Cliente',    auxId:'CLI-0003' },
  { code:'100-002-0001-0004', nombre:'Corporación Selva Verde Ltda.',  tipo:'Cliente',    auxId:'CLI-0004' },
];
export const CUENTAS_PROVEEDORES = [
  { code:'200-001-0002-0001', nombre:'Materiales Occidente S.A.',   tipo:'Proveedor', auxId:'PRO-0001' },
  { code:'200-001-0002-0002', nombre:'Ferretero Monteverde S.A.',    tipo:'Proveedor', auxId:'PRO-0002' },
  { code:'200-001-0002-0003', nombre:'Insumos del Norte Ltda.',      tipo:'Proveedor', auxId:'PRO-0003' },
  { code:'200-001-0002-0004', nombre:'Proveedor General CR S.A.',    tipo:'Proveedor', auxId:'PRO-0004' },
];
export const OPS_INIT: Operacion[] = [
  { id:1,  tipo:'Cobro', estado:'Pendiente', consecutivo:356, cuenta:'100-001-0001-CLI0001', nombreAux:'Distribuidora ABC S.A.',  auxId:'CLI-0001', cuentaContable:'100-001-0001', titulo:'Gestión de cobro - Distribuidora ABC S.A. - 356', flujo:'Cobro de clientes - según catálogo', fecha:'', moneda:'CRC', importe:450000, banco:'BAC ¢ - Cta. 4646545466888', referencia:'', facturas: FACTURAS_MOCK.slice(0,3).map((f,i)=>({ ...f, abono: [390000,45000,25000][i] })), lineasAjuste:[{ id:1, cuenta:'650001001-1001: Diferencia en operaciones-Administrativo', documento:'FE00000003', moneda:'¢ CRC', monto:9000, tipoMovimiento:'ajuste_credito', justificacion:'Diferencia a favor por redondeo del banco.' },{ id:2, cuenta:'', documento:'', moneda:'¢ CRC', monto:0, tipoMovimiento:'', justificacion:'' }] },
  { id:2,  tipo:'Cobro', estado:'Aplicado',  consecutivo:355, cuenta:'100-001-0001-CLI0002', nombreAux:'AuraTours S.A.',          auxId:'CLI-0002', cuentaContable:'100-001-0001', titulo:'Gestión de cobro - AuraTours - 355',              flujo:'Cobro de clientes',                fecha:'2026-04-20', moneda:'USD', importe:1250,   banco:'BAC $ - Cta. 4563212454587',    referencia:'TXN-002', facturas:[], lineasAjuste:[] },
  { id:3,  tipo:'Pago',  estado:'Pendiente', consecutivo:67,  cuenta:'100-001-0001-CLI0001', nombreAux:'Materiales Occidente S.A.',auxId:'PRO-0012', cuentaContable:'100-001-0001', titulo:'Gestión de pago - Materiales Occidente S.A. - 67',flujo:'Pago de proveedores - según catálogo',fecha:'', moneda:'CRC', importe:276000, banco:'BAC ¢ - Cta. 4646545466888', referencia:'', facturas: FACTURAS_PAGO_MOCK, lineasAjuste:[{ id:1, cuenta:'200-001-0001: Retención compra de bienes y servicios', documento:'FE00000003', moneda:'¢ CRC', monto:552, tipoMovimiento:'retencion_fuente', justificacion:'Retención en la fuente 2% según legislación vigente.' }] },
  { id:4,  tipo:'Pago',  estado:'Aplicado',  consecutivo:66,  cuenta:'100-001-0001-CLI0002', nombreAux:'Ferretero Monteverde',    auxId:'PRO-0013', cuentaContable:'100-001-0001', titulo:'Gestión de pago - Ferretero Monteverde - 66',    flujo:'Pago de proveedores',              fecha:'2026-04-18', moneda:'CRC', importe:185000, banco:'BNCR ¢ - Cta. 5565545547777', referencia:'REF-044', facturas:[], lineasAjuste:[] },
  { id:5,  tipo:'Cobro', estado:'Aplicado',  consecutivo:354, cuenta:'100-001-0001-CLI0003', nombreAux:'Hotel Bougainvillea',      auxId:'CLI-0003', cuentaContable:'100-001-0001', titulo:'Gestión de cobro - Hotel Bougainvillea - 354',   flujo:'Cobro de clientes', fecha:'2026-05-10', moneda:'USD', importe:3200,   banco:'BAC $ - Cta. 4563212454587',    referencia:'TXN-081', facturas:[], lineasAjuste:[] },
  { id:7,  tipo:'Cobro', estado:'Pendiente', consecutivo:48,  cuenta:'100-001-0001-CLI0003', nombreAux:'AuraTours S.A.',          auxId:'CLI-0003', cuentaContable:'100-001-0001', titulo:'Anticipo de cliente - AuraTours - 48',   flujo:'Anticipo de clientes', fecha:'', moneda:'CRC', importe:150000, banco:'BAC ¢ - Cta. 4646545466888', referencia:'', facturas:[], lineasAjuste:[] },
  { id:6,  tipo:'Pago',  estado:'Pendiente', consecutivo:68,  cuenta:'100-001-0001-CLI0002', nombreAux:'Insumos del Norte Ltda.',  auxId:'PRO-0015', cuentaContable:'100-001-0001', titulo:'Gestión de pago - Insumos del Norte - 68',      flujo:'Pago de proveedores', fecha:'', moneda:'CRC', importe:94500,  banco:'BNCR ¢ - Cta. 5565545547777', referencia:'', facturas:[], lineasAjuste:[{ id:1, cuenta:'', documento:'', moneda:'¢ CRC', monto:0, tipoMovimiento:'', justificacion:'' }] },
];
export const ESTADO_STYLE: Record<EstadoOp, [string,string]> = {
  Pendiente:  ['#EF9F27','rgba(239,159,39,.12)'],
  Aplicado:   [C.success,'rgba(29,158,117,.12)'],
  Borrador:   ['#757575','rgba(117,117,117,.12)'],
  Anulado:    [C.error,'rgba(226,75,74,.12)'],
  Contabilizado: ['#2196F3','rgba(33,150,243,.12)'],
};
export interface ProveedorLote {
  id: string;
  nombre: string;
  cuentaContable: string;
  auxId: string;
  tieneDatosBancarios: boolean;
  documentos: Factura[];
}
export const PROVEEDORES_LOTE: ProveedorLote[] = [
  { id:'p1', nombre:'Materiales Occidente S.A.', cuentaContable:'210-001-0001-PRO0012', auxId:'PRO0012', tieneDatosBancarios:true,
    documentos:[
      { id:'d1', documento:'FE00000001', fecha:'10/05/26', descripcion:'Compra insumos cocina',     importeOriginal:276000, saldoPendiente:276000, abono:276000 },
      { id:'d2', documento:'FE00000004', fecha:'18/05/26', descripcion:'Mantenimiento equipos',     importeOriginal:98500,  saldoPendiente:98500,  abono:98500  },
      { id:'d3', documento:'FE00000007', fecha:'19/05/26', descripcion:'Suministros restaurante',   importeOriginal:45200,  saldoPendiente:45200,  abono:45200  },
    ],
  },
  { id:'p2', nombre:'Insumos del Norte Ltda.', cuentaContable:'210-001-0002-PRO0015', auxId:'PRO0015', tieneDatosBancarios:false,
    documentos:[
      { id:'d4', documento:'FE00000009', fecha:'05/05/26', descripcion:'Compra bebidas',            importeOriginal:55000,  saldoPendiente:55000,  abono:55000  },
    ],
  },
];
// ── Bancos con chequera (para opción generar cheque) ─────────────────────────
export const BANCOS_CON_CHEQUERA = new Set(['BNCR ¢ - Cta. 5565545547777']);
