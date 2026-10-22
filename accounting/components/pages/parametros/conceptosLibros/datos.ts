import { FONT } from '@/components/ui/tokens';

export const F = FONT;
export const CATS = ['Ajuste','Ingreso','Gasto','Otro'];
export const BLANK_C = { codigo:'', descripcion:'', categoria:'Ajuste', activo:true };
export const BLANK_L = { codigo:'', nombre:'', descripcion:'', activo:true };
export const BLANK_TA = { codigo:'', nombre:'', descripcion:'', activo:true };
export interface Concepto { id:number; codigo:string; descripcion:string; categoria:string; activo:boolean; }
export interface Libro    { id:number; codigo:string; nombre:string; descripcion:string; activo:boolean; }
export interface TipoAsiento { id:number; codigo:string; nombre:string; descripcion:string; activo:boolean; }
export const C_INIT: Concepto[] = [
  { id:1,codigo:'DEP',descripcion:'Depreciación de activos fijos',   categoria:'Ajuste',   activo:true },
  { id:2,codigo:'AMO',descripcion:'Amortización de intangibles',     categoria:'Ajuste',   activo:true },
  { id:3,codigo:'ING',descripcion:'Ingresos por servicios hoteleros',categoria:'Ingreso',  activo:true },
  { id:4,codigo:'GAS',descripcion:'Gastos operativos generales',     categoria:'Gasto',    activo:true },
];
export const L_INIT: Libro[] = [
  { id:1,codigo:'GEN',nombre:'Libro General',   descripcion:'Libro contable principal',    activo:true  },
  { id:2,codigo:'AJU',nombre:'Libro de Ajustes',descripcion:'Asientos de ajuste periódico',activo:true  },
  { id:3,codigo:'CIE',nombre:'Libro de Cierre', descripcion:'Asientos de cierre anual',    activo:false },
];
// Tipos de asiento reales del sistema (A/M/I/D/P ya se usan en Bandeja de
// asientos para clasificar el origen de cada asiento) - acá quedan visibles
// y administrables desde un solo lugar, junto a Libros contables.
export const TA_INIT: TipoAsiento[] = [
  { id:1, codigo:'A', nombre:'Automático', descripcion:'Generado por integración con otro módulo (Front Desk, Tour Operator, POS, etc.)', activo:true },
  { id:2, codigo:'M', nombre:'Manual',     descripcion:'Registrado a mano desde Bandeja de asientos.', activo:true },
  { id:3, codigo:'I', nombre:'Importado',  descripcion:'Cargado por importación masiva.', activo:true },
  { id:4, codigo:'D', nombre:'Duplicado',  descripcion:'Generado al duplicar otro asiento existente.', activo:true },
  { id:5, codigo:'P', nombre:'Plantilla',  descripcion:'Generado a partir de una plantilla de asiento.', activo:true },
];
// ── Pestaña Formularios ──────────────────────────────
export const FORMATOS=[{value:'CSV',label:'CSV'},{value:'TXT',label:'TXT'},{value:'XML',label:'XML'}];
export const TIPOS_EXP=[{value:'CC',label:'CC - Cuenta Cliente'},{value:'CTA',label:'CTA - Cuenta'}];
interface CuentaForm { id:string; cuentaContable:string; iban:string; consecutivo:number; }
// Cuentas contables de tipo banco disponibles (dropdown)
export const CUENTAS_BANCARIAS = [
  '110-001-0001 - BAC ₡ 4546-545-466888',
  '110-002-0001 - BAC $ 4563-212-454587',
  '110-003-0001 - BNCR ₡ 5565-554-554',
  '110-003-0002 - BNCR $ 5565-554-7777',
];
export interface Formulario { id:number; nombre:string; banco:string; concepto:string; tipoExportacion:string; formato:string; porDefecto:boolean; cuenta:string; cuentas:CuentaForm[]; }
export const F_INIT: Formulario[] = [
  { id:1,nombre:'Banco BAC San José',banco:'BAC San José',concepto:'Pago Facturas',tipoExportacion:'CC',formato:'CSV',porDefecto:true,cuenta:'',cuentas:[{id:'f1',cuentaContable:'1102003 - BAC Colones',iban:'CR21015100935911667001',consecutivo:1}] },
  { id:2,nombre:'Banco BAC Sinpe',   banco:'BAC Sinpe',   concepto:'Transferencia', tipoExportacion:'CTA',formato:'CSV',porDefecto:false,cuenta:'',cuentas:[] },
  { id:3,nombre:'Banco BCT',         banco:'BCT',         concepto:'Pago',          tipoExportacion:'CC', formato:'TXT',porDefecto:false,cuenta:'',cuentas:[] },
  { id:4,nombre:'Banco Costa Rica',  banco:'BCR',         concepto:'Pago',          tipoExportacion:'CC', formato:'TXT',porDefecto:false,cuenta:'',cuentas:[] },
];
