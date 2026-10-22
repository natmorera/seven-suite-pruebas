

// Shared types and data for Catálogo de Cuentas
// 4-level hierarchy: grupo → mayor → submajor → detalle → auxiliar (optional 4th)

export type Nivel = 'grupo' | 'subgrupo' | 'subsubgrupo' | 'mayor' | 'submajor' | 'detalle' | 'auxiliar';
export type Naturaleza = 'Deudora' | 'Acreedora';
export interface Cuenta {
  id: string;
  code: string;
  codigo?: string;
  nombre: string;
  nivel: Nivel;
  grupo: string;
  naturaleza: Naturaleza;
  posteable: boolean;
  saldo: number;
  parentId?: string;
  tipoEspecial?: string | null;
  children?: Cuenta[];
  descripcion?: string;
  descripcionNivel?: string;
  usaCentroCosto?: boolean;
  centroCostoObligatorio?: boolean;
  centrosCostoIds?: string[];
  mantenimientoValor?: boolean;
  moneda?: string;
  grupoPatrimonio?: string | null;
  inactiva?: boolean;
  expanded?: boolean;
  nombreAlt?: string;
  // Solo aplica a cuentas Auxiliar bajo un Detalle con rol especial Proveedores (04)
  entornoFiscal?: { tipoIdentificacion:string; numeroIdentificacion:string; regimen:string };
  bancarias?: { id:string; banco:string; numero:string; moneda:string; tipo:string }[];
  diasCredito?: number;
  // Fecha del último asiento contabilizado que afectó el saldo
  fechaUltimoAsiento?: string;
  // Configuración de impuestos (dashboard 1.6): identifica qué cuentas captan
  // impuesto acreditable (crédito fiscal) vs. débito fiscal (impuesto por pagar),
  // y de qué tipo de impuesto se trata. El indicador de Impuestos del dashboard
  // se arma sumando el saldo de las cuentas configuradas acá, en vez de asumir
  // una única cuenta fija de IVA.
  configImpuesto?: { rol: 'acreditable' | 'debito'; tipoImpuesto: string } | null;
}
export const TIPOS_IMPUESTO = [
  { value:'iva',        label:'IVA' },
  { value:'retencion',  label:'Retención en la fuente' },
  { value:'otro',       label:'Otro' },
];
export const REGIMENES_FISCALES = [
  { value:'tradicional',   label:'Régimen tradicional' },
  { value:'simplificado',  label:'Régimen simplificado' },
  { value:'exento',        label:'Exento' },
];
export const TIPOS_IDENTIFICACION_FISCAL = [
  { value:'juridica',  label:'Persona jurídica' },
  { value:'fisica',    label:'Persona física' },
  { value:'extranjer', label:'Extranjero (sin identificación CR)' },
];
export const MONEDAS_BANCO = [
  { value:'CRC', label:'¢ Colón costarricense' },
  { value:'USD', label:'$ Dólar estadounidense' },
];
export const TIPOS_CUENTA_BANCO = [
  { value:'corriente', label:'Cuenta corriente' },
  { value:'ahorros',   label:'Cuenta de ahorros' },
];
export const GRUPOS_NIIF = [
  { value:'1', label:'1 · Activos',          naturaleza:'Deudora'   as Naturaleza },
  { value:'2', label:'2 · Pasivos',          naturaleza:'Acreedora' as Naturaleza },
  { value:'3', label:'3 · Patrimonio',       naturaleza:'Acreedora' as Naturaleza },
  { value:'4', label:'4 · Ingresos',         naturaleza:'Acreedora' as Naturaleza },
  { value:'5', label:'5 · Costos',           naturaleza:'Deudora'   as Naturaleza },
  { value:'6', label:'6 · Gastos',           naturaleza:'Deudora'   as Naturaleza },
  { value:'7', label:'7 · Cuentas de orden', naturaleza:'Deudora'   as Naturaleza },
];
export const TIPOS_ESPECIAL = [
  { value:'',   label:'Ninguno'                 },
  { value:'01', label:'01 · Caja'                   },
  { value:'02', label:'02 · Clientes'               },
  { value:'03', label:'03 · Clientes Casa'          },
  { value:'04', label:'04 · Proveedores'            },
  { value:'05', label:'05 · Bancos'                 },
  { value:'06', label:'06 · Efectivo por depositar' },
  { value:'07', label:'07 · Inventario'             },
  { value:'08', label:'08 · IVA por pagar'          },
  { value:'09', label:'09 · Retención en la fuente' },
  { value:'10', label:'10 · Gasto x Intereses'      },
];
// Niveles visibles en UI (sin grupo - los grupos son raíces NIIF fijas)
export const NIVELES = [
  { value:'mayor',    label:'Mayor'    },
  { value:'submajor', label:'Sub mayor'},
  { value:'detalle',  label:'Detalle'  },
  { value:'auxiliar', label:'Auxiliar' },
];
// Etiquetas de nivel
export const NIVEL_LABELS: Record<string, string> = {
  grupo:       'Grupo NIIF',
  subgrupo:    'Sub grupo',
  subsubgrupo: 'Sub sub grupo',
  mayor:       'Mayor',
  submajor:    'Sub mayor',
  detalle:     'Detalle',
  auxiliar:    'Auxiliar',
};
// Segment lengths by level
export const LONGITUD: Record<string, number> = {
  mayor:    3,
  submajor: 3,
  detalle:  4,
  auxiliar: 4,
};
// Groups that always require centro de costo
const GRUPOS_CC_OBLIGATORIO = ['4','5','6'];
export function isCCObligatorioBySpec(grupo: string, tipoEspecial?: string | null) {
  return GRUPOS_CC_OBLIGATORIO.includes(grupo) || tipoEspecial === '07';
}
export const MONEDAS = [
  { value:'CRC', label:'Colón costarricense', symbol:'₡' },
  { value:'USD', label:'Dólar estadounidense', symbol:'$' },
];
export const SEP = '-';
