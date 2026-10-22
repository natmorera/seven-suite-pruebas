// Asientos de ejemplo. Se cargan una sola vez en la base de datos (lib/db.ts)
// para que la Bandeja tenga movimientos desde el primer día.
export type TipoAsiento = 'A' | 'M' | 'I' | 'D' | 'P';
export type Moneda = 'CRC' | 'USD';
export interface LineaAsiento { id: number; cuenta: string; descripcion: string; cCostos: string; debe: number; haber: number; }
export interface AsientoEjemplo {
  id: number; tipo: TipoAsiento; origen: string; fecha: string; consecutivo: string;
  titulo: string; moneda: Moneda; importe: number; usuario: string; documento: string;
  observacion: string; contabilizado: boolean; lineas: LineaAsiento[];
  documentoRefId?: string | null;   // factura electrónica que lo generó
  archivos?: string[]; historial?: { color: string; texto: string; fecha: string; usuario: string }[];
  motivoAnulacion?: string;
  conciliacion?: { id: string; detalle: string } | null;
}
type Asiento = AsientoEjemplo;

export const ASIENTOS_EJEMPLO: Asiento[] = [
  { id:1, tipo:'A', origen:'FrontDesk', fecha:'2026-02-15', consecutivo:'20260200001',
    titulo:'Ingresos de producción del día', moneda:'USD', importe:14309.10,
    usuario:'jperez', documento:'FE0002093', observacion:'Movimientos automáticos del día de Front Desk.',
    contabilizado:false, documentoRefId:'#26900', archivos:['factura-001.pdf','detalle.xlsx'],
    historial:[
      { color:'#4CAF50', texto:'Asiento creado desde FrontDesk', fecha:'15/02/2026 08:14', usuario:'sistema' },
      { color:'#F44336', texto:'Contabilización fallida - desbalanceado (₡ 0.12)', fecha:'15/02/2026 10:32', usuario:'jperez' },
      { color:'#4CAF50', texto:'Línea 100-002-0001 corregida a ₡ 467,779.00', fecha:'15/02/2026 11:05', usuario:'jperez' },
      { color:'#EF9F27', texto:'Observación editada', fecha:'16/02/2026 09:22', usuario:'sblandon' },
      { color:'#4CAF50', texto:'Adjunto: factura-001.pdf', fecha:'17/02/2026 08:50', usuario:'yader' },
    ],
    lineas:[
      { id:1, cuenta:'100-002-0001', descripcion:'Depósito adelantado',  cCostos:'',    debe:50000.12,  haber:0 },
      { id:2, cuenta:'100-002-0001', descripcion:'Depósito en efectivo', cCostos:'',    debe:417778.88, haber:0 },
      { id:3, cuenta:'400-010-0001', descripcion:'Ingresos del día',     cCostos:'',    debe:0, haber:467779.00 },
      { id:4, cuenta:'400-010-0001', descripcion:'Ingresos hospedaje',   cCostos:'10002',debe:28000.00, haber:0 },
      { id:5, cuenta:'200-001-0001', descripcion:'Pago proveedor',       cCostos:'',    debe:0, haber:28000.00 },
      { id:6, cuenta:'500-010-0001', descripcion:'Gasto operativo',      cCostos:'ADM', debe:9800.00, haber:0 },
      { id:7, cuenta:'100-001-0001', descripcion:'Caja chica',           cCostos:'ADM', debe:0, haber:9800.00 },
    ],
  },
  { id:2, tipo:'M', origen:'Accounting', fecha:'2026-02-15', consecutivo:'20260200002',
    titulo:'Registro de póliza de incendios', moneda:'CRC', importe:450000,
    usuario:'sblandon', documento:'FE0000001', observacion:'Póliza anual contra incendios de la propiedad principal, vigencia 15/02/2026 a 14/02/2027.',
    contabilizado:false, archivos:['poliza-incendios-2026.pdf'],
    conciliacion:{ id:'BAC-CRC-ABR26', detalle:'BAC ¢ 4546545466888 · Abril 2026' },
    historial:[
      { color:'#4CAF50', texto:'Asiento creado manualmente', fecha:'15/02/2026 09:05', usuario:'sblandon' },
      { color:'#4CAF50', texto:'Adjunto: poliza-incendios-2026.pdf', fecha:'15/02/2026 09:07', usuario:'sblandon' },
    ],
    lineas:[{ id:1, cuenta:'600-002-0004', descripcion:'Seguro incendio', cCostos:'', debe:450000, haber:0 },{ id:2, cuenta:'200-001-0001', descripcion:'Por pagar', cCostos:'', debe:0, haber:450000 }] },
  { id:3, tipo:'I', origen:'Accounting', fecha:'2026-02-15', consecutivo:'20260200025',
    titulo:'Importación saldo de clientes', moneda:'CRC', importe:1450000,
    usuario:'yader', documento:'IMP001', observacion:'Carga de saldos iniciales de clientes desde el sistema anterior, archivo IMP001.',
    contabilizado:false, archivos:['saldos-clientes-imp001.xlsx'],
    historial:[
      { color:'#4CAF50', texto:'Asiento importado desde archivo IMP001.xlsx', fecha:'15/02/2026 07:40', usuario:'yader' },
      { color:'#4CAF50', texto:'Validación de saldos completada sin errores', fecha:'15/02/2026 07:41', usuario:'sistema' },
    ],
    lineas:[{ id:1, cuenta:'100-002-0001', descripcion:'Saldo importado', cCostos:'', debe:1450000, haber:0 },{ id:2, cuenta:'300-000-0001', descripcion:'Apertura', cCostos:'', debe:0, haber:1450000 }] },
  { id:4, tipo:'D', origen:'Accounting', fecha:'2026-02-15', consecutivo:'20260200030',
    titulo:'(Dup. 20260200001) Ingresos de producción del día', moneda:'USD', importe:14309.10,
    usuario:'yader', documento:'FE0002093', observacion:'Duplicado del asiento 20260200001 para revisión de diferencial cambiario.',
    contabilizado:false, archivos:[],
    historial:[
      { color:'#6B7280', texto:'Duplicado a partir de 20260200001', fecha:'15/02/2026 14:12', usuario:'yader' },
    ],
    lineas:[
      { id:1, cuenta:'100-002-0001', descripcion:'Depósito adelantado (revisión)', cCostos:'', debe:14309.10, haber:0 },
      { id:2, cuenta:'400-010-0001', descripcion:'Ingresos del día (revisión)',    cCostos:'', debe:0, haber:14309.10 },
    ] },
  { id:5, tipo:'A', origen:'Inventario', fecha:'2026-02-15', consecutivo:'20260200032',
    titulo:'Ajuste inventario almacén principal', moneda:'CRC', importe:88500,
    usuario:'glopez', documento:'AJ-001', observacion:'Ajuste por diferencia de conteo físico vs. sistema en el almacén principal.',
    contabilizado:false, archivos:['conteo-fisico-feb2026.xlsx'],
    historial:[
      { color:'#4CAF50', texto:'Asiento generado automáticamente desde Inventario', fecha:'15/02/2026 18:00', usuario:'sistema' },
      { color:'#EF9F27', texto:'Adjunto conteo físico agregado', fecha:'15/02/2026 18:03', usuario:'glopez' },
    ],
    lineas:[
      { id:1, cuenta:'500-020-0001', descripcion:'Ajuste por faltante de inventario', cCostos:'ADM', debe:88500, haber:0 },
      { id:2, cuenta:'120-001-0001', descripcion:'Inventario general almacén',        cCostos:'',    debe:0, haber:88500 },
    ] },
  { id:6, tipo:'A', origen:'Activos fijos', fecha:'2026-02-15', consecutivo:'20260200033',
    titulo:'Depreciación mensual activos fijos', moneda:'CRC', importe:210000,
    usuario:'glopez', documento:'', observacion:'Depreciación mensual calculada automáticamente sobre el catálogo de activos fijos vigente.',
    contabilizado:false, archivos:[],
    historial:[
      { color:'#4CAF50', texto:'Asiento generado automáticamente desde Activos fijos', fecha:'15/02/2026 23:50', usuario:'sistema' },
    ],
    lineas:[
      { id:1, cuenta:'600-030-0001', descripcion:'Gasto por depreciación',       cCostos:'ADM', debe:210000, haber:0 },
      { id:2, cuenta:'200-002-0001', descripcion:'Depreciación acumulada',      cCostos:'',    debe:0, haber:210000 },
    ] },
];
export const ANULADOS_EJEMPLO: Asiento[] = [
  { id:99, tipo:'M', origen:'Accounting', fecha:'2026-02-15', consecutivo:'20260200000',
    titulo:'Asiento de prueba eliminado', moneda:'CRC', importe:5000,
    usuario:'sblandon', documento:'', observacion:'Movimientos automáticos.',
    motivoAnulacion:'Error en cuenta contable asignada. Se re-registró con 100-002-0001.',
    contabilizado:false, archivos:['factura-001.pdf'],
    historial:[
      { color:'#4CAF50', texto:'Asiento creado manualmente', fecha:'15/02/2026 08:00', usuario:'sblandon' },
      { color:'#F44336', texto:'Asiento anulado - error en cuenta contable asignada', fecha:'15/02/2026 08:20', usuario:'sblandon' },
    ],
    lineas:[{ id:1, cuenta:'100-002-0001', descripcion:'Dep. adelantado', cCostos:'', debe:50000, haber:0 }] },
];
