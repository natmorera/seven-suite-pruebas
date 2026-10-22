// Shared types and data for Catálogo de Cuentas
// 4-level hierarchy: grupo → mayor → submajor → detalle → auxiliar (optional 4th)
import { simboloLocal } from '@/lib/paisActual';

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

// Nivel labels for display
export const NIVEL_LABELS: Record<string, string> = {
  grupo:       'Grupo NIIF',
  subgrupo:    'Sub grupo',
  subsubgrupo: 'Sub sub grupo',
  mayor:       'Mayor',
  submajor:    'Sub mayor',
  detalle:     'Detalle',
  auxiliar:    'Auxiliar',
};

// Descriptions per level
export const NIVEL_DESC: Record<string, string> = {
  grupo:       'Grupo NIIF (1–7). Clasificación fija, no editable.',
  subgrupo:    'Sub grupo NIIF. Clasificación fija, no editable.',
  subsubgrupo: 'Sub sub grupo NIIF. Clasificación fija, no editable.',
  mayor:       'Primer nivel configurable (ej. 100). 3 dígitos.',
  submajor:    'Sub mayor (ej. 100-001). 3 dígitos adicionales.',
  detalle:     'Detalle (ej. 100-001-0001). 4 dígitos. Acepta asientos.',
  auxiliar:    'Cliente o proveedor específico. Acepta asientos.',
};

// Segment lengths by level
export const LONGITUD: Record<string, number> = {
  mayor:    3,
  submajor: 3,
  detalle:  4,
  auxiliar: 4,
};
// Niveles que el usuario puede crear (no incluye grupo/subgrupo/subsubgrupo que son fijos NIIF)
export const NIVELES_CONFIGURABLES: Nivel[] = ['mayor', 'submajor', 'detalle', 'auxiliar'];
export const NIVELES_FIJOS: Nivel[] = ['grupo', 'subgrupo', 'subsubgrupo'];
export function esNivelFijo(nivel: Nivel): boolean {
  return NIVELES_FIJOS.includes(nivel);
}

// Groups that always require centro de costo
export const GRUPOS_CC_OBLIGATORIO = ['4','5','6'];
export function isCCObligatorioBySpec(grupo: string, tipoEspecial?: string | null) {
  return GRUPOS_CC_OBLIGATORIO.includes(grupo) || tipoEspecial === '07';
}

// Centro de costo only applies to auxiliar level (or detalle for some special types)
export function requiresCentroCosto(nivel: Nivel, grupo: string, tipoEspecial?: string | null): boolean {
  if (nivel === 'auxiliar') return true;
  if (nivel === 'detalle' && GRUPOS_CC_OBLIGATORIO.includes(grupo)) return true;
  if (tipoEspecial === '07') return true;
  return false;
}

export const MONEDAS = [
  { value:'CRC', label:'Colón costarricense', get symbol() { return simboloLocal(); } },
  { value:'USD', label:'Dólar estadounidense', symbol:'$' },
];

export const SEP = '-';

export function genId() { return `c-${Date.now()}-${Math.random().toString(36).slice(2,6)}`; }
export function getNaturaleza(grupo: string): Naturaleza {
  return GRUPOS_NIIF.find(g=>g.value===grupo)?.naturaleza ?? 'Deudora';
}

// Posting only at detalle and auxiliar levels
export function isPosteable(nivel: string) {
  return nivel === 'detalle' || nivel === 'auxiliar';
}

// Child level sequence (fijos NIIF no configurables, configurables desde mayor hacia abajo)
// grupo → subgrupo → subsubgrupo → mayor → submajor → detalle → (auxiliar si posteable)
export function getChildNivel(parentNivel: Nivel | null): Nivel {
  const order: Nivel[] = ['grupo','subgrupo','subsubgrupo','mayor','submajor','detalle'];
  const idx = order.indexOf(parentNivel as Nivel);
  if (idx === -1 || idx >= order.length - 1) return 'auxiliar';
  return order[idx + 1];
}

// El usuario crea: desde Mayor (si padre es SSG), Submajor (si padre es Mayor),
// Detalle (si padre es Submajor), Auxiliar (si padre es Detalle posteable)
export function getChildNivelConfigurable(parentNivel: Nivel | null): Nivel | null {
  if (!parentNivel) return 'mayor'; // raíz libre → Mayor
  const map: Partial<Record<Nivel, Nivel>> = {
    subsubgrupo: 'mayor',
    mayor:       'submajor',
    submajor:    'detalle',
    detalle:     'auxiliar',
  };
  return map[parentNivel] ?? null;
}

// Can a node have children added from UI?
export function canAddChild(nivel: Nivel, tipoEspecial?: string | null): boolean {
  if (nivel === 'auxiliar') return false;
  // grupo y subgrupo son puramente de clasificación NIIF - no se les agrega nada desde UI
  if (nivel === 'grupo' || nivel === 'subgrupo') return false;
  // subsubgrupo SÍ permite agregar Mayor (es el punto de entrada del usuario)
  if (nivel === 'subsubgrupo') return true;
  // Detalle solo puede tener auxiliares si es cuenta de clientes o proveedores
  if (nivel === 'detalle') {
    return tipoEspecial === '02' || tipoEspecial === '03' || tipoEspecial === '04';
  }
  return true;
}

export function fmt(n: number, decimals = 2) {
  const parts = Math.abs(n).toFixed(decimals).split('.');
  const int   = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '-' : '') + int + (decimals > 0 ? '.' + parts[1] : '');
}

// Build full code from parent code + segment
export function buildCode(parentCode: string | undefined, segment: string, nivel: Nivel): string {
  if (nivel === 'mayor') return segment;
  if (!parentCode) return segment;
  return parentCode + SEP + segment;
}

// Suggest next segment for a new child
export function suggestSegment(parent: Cuenta): string {
  const childNivel = getChildNivel(parent.nivel);
  const len = LONGITUD[childNivel] ?? 4;
  const siblings = (parent.children || []).filter(s => s.nivel === childNivel);
  if (!siblings.length) {
    if (childNivel === 'mayor') return '100';
    return '1'.padStart(len, '0');
  }
  const nums = siblings.map(s => {
    const parts = (s.code || '').split(SEP);
    return parseInt(parts[parts.length - 1], 10) || 0;
  });
  const next = Math.max(...nums) + 1;
  if (childNivel === 'mayor') {
    // Mayores saltan de 100 en 100 por convención
    const rounded = Math.ceil(next / 100) * 100;
    return String(rounded).padStart(3, '0');
  }
  return String(next).padStart(len, '0');
}

// Tree helpers
export function flattenTree(nodes: Cuenta[], depth=0, parentId: string|undefined=undefined): (Cuenta & {depth:number})[] {
  return nodes.flatMap(n => [
    { ...n, depth },
    ...(n.children?.length && n.expanded ? flattenTree(n.children, depth+1, n.id) : []),
  ]);
}

// Aplana TODO el árbol sin importar el estado "expanded" de la UI - para usar en
// selectores (cuenta padre, validación de código duplicado, etc.) que necesitan
// ver todas las cuentas existentes, no solo las que están visualmente desplegadas.
export function flattenAll(nodes: Cuenta[], depth=0): (Cuenta & {depth:number})[] {
  return nodes.flatMap(n => [
    { ...n, depth },
    ...(n.children?.length ? flattenAll(n.children, depth+1) : []),
  ]);
}

export function toggleNodeExpanded(nodes: Cuenta[], id: string): Cuenta[] {
  return nodes.map(n => n.id === id
    ? { ...n, expanded: !n.expanded }
    : { ...n, children: n.children ? toggleNodeExpanded(n.children, id) : [] }
  );
}

export function addNodeToTree(nodes: Cuenta[], parentId: string|null, newNode: Cuenta): Cuenta[] {
  if (!parentId) return [...nodes, newNode];
  return nodes.map(n => {
    if (n.id === parentId) return { ...n, expanded: true, children: [...(n.children||[]), newNode] };
    if (n.children?.length) return { ...n, children: addNodeToTree(n.children, parentId, newNode) };
    return n;
  });
}

export function updateNodeInTree(nodes: Cuenta[], data: Cuenta): Cuenta[] {
  return nodes.map(n => {
    if (n.id === data.id) return { ...n, ...data, children: n.children };
    if (n.children?.length) return { ...n, children: updateNodeInTree(n.children, data) };
    return n;
  });
}

export function removeNodeFromTree(nodes: Cuenta[], id: string): Cuenta[] {
  return nodes
    .filter(n => n.id !== id)
    .map(n => ({ ...n, children: n.children ? removeNodeFromTree(n.children, id) : [] }));
}

// ─── NIIF groups (raíces fijas, no editables) ───────────────────────────────
const G = (id: string, nombre: string, grupo: string, nat: Naturaleza, children: Cuenta[]): Cuenta => ({
  id, code: grupo, nombre,
  nivel: 'grupo', grupo, naturaleza: nat,
  posteable: false, centroCostoObligatorio: false, saldo: 0,
  tipoEspecial: null, descripcion: `Grupo NIIF ${grupo} - ${nombre}`,
  expanded: false, children,
});

// Sub grupo NIIF (fijo, no configurable por el usuario). siempre
// expandido por defecto - es un nivel de clasificación fija, no algo que el
// usuario gestione, así que no debería exigir un clic de más para verlo.
const SG = (id: string, code: string, nombre: string, grupo: string, nat: Naturaleza, children: Cuenta[]): Cuenta => ({
  id, code, nombre,
  nivel: 'subgrupo', grupo, naturaleza: nat,
  posteable: false, centroCostoObligatorio: false, saldo: 0,
  tipoEspecial: null, expanded: true, children,
});

// Sub sub grupo NIIF (fijo, no configurable por el usuario). idem - siempre expandido.
const SSG = (id: string, code: string, nombre: string, grupo: string, nat: Naturaleza, children: Cuenta[]): Cuenta => ({
  id, code, nombre,
  nivel: 'subsubgrupo', grupo, naturaleza: nat,
  posteable: false, centroCostoObligatorio: false, saldo: 0,
  tipoEspecial: null, expanded: true, children,
});

const M = (id: string, code: string, nombre: string, grupo: string, nat: Naturaleza, children: Cuenta[], extra?: Partial<Cuenta>): Cuenta => ({
  id, code, nombre,
  nivel: 'mayor', grupo, naturaleza: nat,
  posteable: false, centroCostoObligatorio: false, saldo: 0,
  tipoEspecial: null, expanded: true, children,
  ...extra,
});

const S = (id: string, code: string, nombre: string, grupo: string, nat: Naturaleza, children: Cuenta[], extra?: Partial<Cuenta>): Cuenta => ({
  id, code, nombre,
  nivel: 'submajor', grupo, naturaleza: nat,
  posteable: false, centroCostoObligatorio: false, saldo: 0,
  tipoEspecial: null, expanded: true, children,
  ...extra,
});

function fechaUltimoAsientoAuto(code: string, saldo: number): string | undefined {
  if (!saldo) return undefined;
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  const diasAtras = hash % 45;
  const hoy = new Date(2026, 5, 2);
  const d = new Date(hoy);
  d.setDate(hoy.getDate() - diasAtras);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

const D = (id: string, code: string, nombre: string, grupo: string, nat: Naturaleza, extra?: Partial<Cuenta>): Cuenta => {
  const base: Cuenta = {
    id, code, nombre,
    nivel: 'detalle', grupo, naturaleza: nat,
    posteable: true, centroCostoObligatorio: false, saldo: 0,
    tipoEspecial: null, expanded: false, children: [],
    ...extra,
  };
  if (base.posteable && !base.fechaUltimoAsiento) {
    base.fechaUltimoAsiento = fechaUltimoAsientoAuto(base.code, base.saldo ?? 0);
  }
  return base;
};

const A = (id: string, code: string, nombre: string, grupo: string, nat: Naturaleza, extra?: Partial<Cuenta>): Cuenta => {
  const base: Cuenta = {
    id, code, nombre,
    nivel: 'auxiliar', grupo, naturaleza: nat,
    posteable: true, centroCostoObligatorio: false, saldo: 0,
    tipoEspecial: null, expanded: false, children: [],
    ...extra,
  };
  if (base.posteable && !base.fechaUltimoAsiento) {
    base.fechaUltimoAsiento = fechaUltimoAsientoAuto(base.code, base.saldo ?? 0);
  }
  return base;
};

export const CUENTAS_INIT: Cuenta[] = [

  // ── 1. Activos ─────────────────────────────────────────────────────────────
  G('g1','Activos','1','Deudora',[
    SG('sg1.1','1.1','Activos corrientes','1','Deudora',[
      SSG('ssg1.1.1','1.1.1','Activos corrientes circulantes','1','Deudora',[

        M('m100','100','Efectivo en caja y banco','1','Deudora',[
          S('s100-001','100-001','Efectivo en caja','1','Deudora',[
            D('d100-001-0001','100-001-0001','Fondo de caja general','1','Deudora',{ saldo:150000, tipoEspecial:'01', moneda:'CRC' }),
            D('d100-001-0002','100-001-0002','Fondo de caja recepción','1','Deudora',{ saldo:50000, tipoEspecial:'01', moneda:'CRC' }),
          ],{saldo:200000}),
          S('s100-002','100-002','Bancos moneda nacional','1','Deudora',[
            D('d100-002-0001','100-002-0001','BAC ¢ 4546545466888','1','Deudora',{ saldo:1450250, tipoEspecial:'05', moneda:'CRC' }),
            D('d100-002-0002','100-002-0002','BAC ¢ 4546777778855','1','Deudora',{ saldo:785000, tipoEspecial:'05', moneda:'CRC' }),
          ],{saldo:2235250}),
          S('s100-003','100-003','Bancos moneda extranjera','1','Deudora',[
            D('d100-003-0001','100-003-0001','BAC $ 4563212454587','1','Deudora',{ saldo:4500680, tipoEspecial:'05', moneda:'USD' }),
            D('d100-003-0002','100-003-0002','BNCR $ 5565545547777','1','Deudora',{ saldo:2350000, tipoEspecial:'05', moneda:'USD' }),
          ],{saldo:6850680}),
          S('s100-004','100-004','Depósitos en tránsito','1','Deudora',[
            D('d100-004-0001','100-004-0001','Datafono BAC ¢','1','Deudora',{ saldo:1250000, tipoEspecial:'06', moneda:'CRC' }),
            D('d100-004-0002','100-004-0002','Datafono BAC $','1','Deudora',{ saldo:560000, tipoEspecial:'06', moneda:'USD' }),
          ],{saldo:1810500}),
        ]),

        M('m110','110','Cuentas por cobrar','1','Deudora',[
          S('s110-001','110-001','Clientes','1','Deudora',[
            D('d110-001-0001','110-001-0001','Clientes nacionales','1','Deudora',{ saldo:1595000, tipoEspecial:'02', moneda:'CRC', children:[
              A('a110-001-0001-0001','110-001-0001-0001','Distribuidora La Florida S.A.','1','Deudora',{ saldo:980000, tipoEspecial:'02', diasCredito:30 }),
              A('a110-001-0001-0002','110-001-0001-0002','Hotel Las Palmas S.A.','1','Deudora',{ saldo:615000, tipoEspecial:'02', diasCredito:15 }),
              A('a110-001-0001-0003','110-001-0001-0003','AuraTours S.A.','1','Deudora',{ tipoEspecial:'02', diasCredito:30 }),
              A('a110-001-0001-0004','110-001-0001-0004','Grupo Hotelero Central S.A.','1','Deudora',{ tipoEspecial:'02', diasCredito:45 }),
            ] }),
            D('d110-001-0002','110-001-0002','Clientes en casa','1','Deudora',{ saldo:375000, tipoEspecial:'03', moneda:'CRC' }),
            D('d110-001-0003','110-001-0003','Deudores diversos','1','Deudora'),
          ]),
          S('s110-002','110-002','Incobrables','1','Deudora',[
            D('d110-002-0001','110-002-0001','Estimación para incobrables','1','Deudora', { saldo:375000 }),

          ]),
        ]),

        M('m120','120','Inventarios','1','Deudora',[
          S('s120-001','120-001','Inventario general','1','Deudora',[
            D('d120-001-0001','120-001-0001','Inventarios DPV','1','Deudora',{ saldo:520000, tipoEspecial:'07', centroCostoObligatorio:true }),
            D('d120-001-0002','120-001-0002','Inventario consignado','1','Deudora',{ saldo:185000, tipoEspecial:'07' }),
            D('d120-001-0003','120-001-0003','Inventario en tránsito','1','Deudora',{ saldo:140000, tipoEspecial:'07' }),
          ],{saldo:845000}),
        ], {saldo:845000}),

      ]),
      SSG('ssg1.1.2','1.1.2','Otros activos circulantes','1','Deudora',[
        M('m130','130','Diferidos y prepagados','1','Deudora',[
          S('s130-001','130-001','Gastos pagados por adelantado','1','Deudora',[
            D('d130-001-0001','130-001-0001','Seguros prepagados','1','Deudora', { saldo:280000 }),

            D('d130-001-0002','130-001-0002','Arrendamientos prepagados','1','Deudora', { saldo:140000 }),

            D('d130-001-0003','130-001-0003','Otros activos circulantes','1','Deudora'),

            D('d130-001-0004','130-001-0004','IVA acreditable','1','Deudora', { saldo:96500, tipoEspecial:'08', configImpuesto:{ rol:'acreditable', tipoImpuesto:'iva' } }),
          ],{saldo:516500}),
        ], {saldo:516500}),
      ]),
    ]),
    SG('sg1.2','1.2','Activos no corrientes','1','Deudora',[
      SSG('ssg1.2.1','1.2.1','Propiedad planta y equipo','1','Deudora',[
        M('m200','200','Propiedad planta y equipo','1','Deudora',[
          S('s200-001','200-001','Activos fijos tangibles','1','Deudora',[
            D('d200-001-0001','200-001-0001','Terrenos','1','Deudora', { saldo:22000000 }),

            D('d200-001-0002','200-001-0002','Edificios e instalaciones','1','Deudora', { saldo:18500000 }),

            D('d200-001-0003','200-001-0003','Mobiliario y equipo','1','Deudora', { saldo:9800000 }),

            D('d200-001-0004','200-001-0004','Vehículos','1','Deudora', { saldo:6500000 }),

          ],{saldo:56800000}),
          S('s200-002','200-002','Depreciación acumulada','1','Deudora',[
            D('d200-002-0001','200-002-0001','Depreciación acum. edificios','1','Deudora', { saldo:-4200000 }),

            D('d200-002-0002','200-002-0002','Depreciación acum. equipo','1','Deudora', { saldo:-2800000 }),

            D('d200-002-0003','200-002-0003','Depreciación acum. vehículos','1','Deudora', { saldo:-1450000 }),

          ],{saldo:-8450000}),
          S('s200-003','200-003','Activos intangibles','1','Deudora',[
            D('d200-003-0001','200-003-0001','Licencias y software','1','Deudora', { saldo:480000 }),

            D('d200-003-0002','200-003-0002','Amortización acumulada','1','Deudora', { saldo:-130000 }),

          ],{saldo:350000}),
        ]),
        M('m210','210','Proyectos en proceso','1','Deudora',[
          S('s210-001','210-001','Obras en proceso','1','Deudora',[
            D('d210-001-0001','210-001-0001','Proyecto ampliación spa','1','Deudora', { saldo:1200000 }),

          ]),
        ]),
      ]),
    ]),
  ]),

  // ── 2. Pasivos ─────────────────────────────────────────────────────────────
  G('g2','Pasivos','2','Acreedora',[
    SG('sg2.1','2.1','Pasivos corrientes','2','Acreedora',[
      SSG('ssg2.1.1','2.1.1','Obligaciones a corto plazo','2','Acreedora',[

        M('m300','300','Cuentas por pagar','2','Acreedora',[
          S('s300-001','300-001','Proveedores','2','Acreedora',[
            D('d300-001-0001','300-001-0001','Proveedores nacionales','2','Acreedora',{ saldo:3800000, tipoEspecial:'04', moneda:'CRC', children:[
              A('a300-001-0001-0001','300-001-0001-0001','Materiales Occidente S.A.','2','Acreedora',{ saldo:2000000, tipoEspecial:'04', diasCredito:30 }),
              A('a300-001-0001-0002','300-001-0001-0002','Comercial Ferretero Monteverde','2','Acreedora',{ saldo:1800000, tipoEspecial:'04', diasCredito:15 }),
              A('a300-001-0001-0003','300-001-0001-0003','Insumos del Norte Ltda.','2','Acreedora',{ tipoEspecial:'04', diasCredito:45 }),
            ] }),
            D('d300-001-0002','300-001-0002','Acreedores diversos','2','Acreedora'),
            D('d300-001-0003','300-001-0003','Anticipo de clientes','2','Acreedora'),
          ]),
          S('s300-002','300-002','Otras obligaciones C/P','2','Acreedora',[
            D('d300-002-0001','300-002-0001','Obligaciones laborales','2','Acreedora', { saldo:240000 }),

            D('d300-002-0002','300-002-0002','Obligaciones tributarias IVA','2','Acreedora',{ saldo:140430, tipoEspecial:'08', configImpuesto:{ rol:'debito', tipoImpuesto:'iva' } }),
            D('d300-002-0003','300-002-0003','Financiamiento no bancario C/P','2','Acreedora'),
          ],{saldo:380430}),
          S('s300-003','300-003','Financiamiento bancario C/P','2','Acreedora',[
            D('d300-003-0001','300-003-0001','Préstamos bancarios C/P','2','Acreedora'),
          ]),
        ]),

      ]),
    ]),
    SG('sg2.2','2.2','Pasivos no corrientes','2','Acreedora',[
      SSG('ssg2.2.1','2.2.1','Obligaciones a largo plazo','2','Acreedora',[
        M('m400','400','Obligaciones a largo plazo','2','Acreedora',[
          S('s400-001','400-001','Financiamiento bancario L/P','2','Acreedora',[
            D('d400-001-0001','400-001-0001','Préstamos bancarios L/P','2','Acreedora', { saldo:8500000 }),

            D('d400-001-0002','400-001-0002','Financiamiento no bancario L/P','2','Acreedora'),
          ]),
        ]),
      ]),
    ]),
  ]),

  // ── 3. Patrimonio ──────────────────────────────────────────────────────────
  G('g3','Patrimonio','3','Acreedora',[
    SG('sg3.1','3.1','Capital','3','Acreedora',[
      SSG('ssg3.1.1','3.1.1','Capital social y reservas','3','Acreedora',[
        M('m500','500','Capital social','3','Acreedora',[
          S('s500-001','500-001','Capital en acciones','3','Acreedora',[
            D('d500-001-0001','500-001-0001','Capital en acciones suscritas','3','Acreedora', { saldo:20000000 }),

          ]),
        ]),
        M('m510','510','Reservas','3','Acreedora',[
          S('s510-001','510-001','Reservas de capital','3','Acreedora',[
            D('d510-001-0001','510-001-0001','Reserva legal','3','Acreedora', { saldo:2000000 }),

          ]),
        ]),
        M('m520','520','Resultados','3','Acreedora',[
          S('s520-001','520-001','Resultados acumulados','3','Acreedora',[
            D('d520-001-0001','520-001-0001','Utilidades retenidas años anteriores','3','Acreedora', { saldo:12500000 }),

            D('d520-001-0002','520-001-0002','Resultado del período actual','3','Acreedora', { saldo:1885750 }),

          ],{saldo:14385750}),
        ], {saldo:14385750}),
        M('m530','530','Aportes y subvenciones','3','Acreedora',[
          S('s530-001','530-001','Aportes','3','Acreedora',[
            D('d530-001-0001','530-001-0001','Aportes de capital','3','Acreedora'),
          ]),
          S('s530-002','530-002','Subvenciones','3','Acreedora',[
            D('d530-002-0001','530-002-0001','Donaciones recibidas','3','Acreedora'),
            D('d530-002-0002','530-002-0002','Superávit por revaluaciones','3','Acreedora'),
          ]),
        ]),
      ]),
    ]),
  ]),

  // ── 4. Ingresos ────────────────────────────────────────────────────────────
  G('g4','Ingresos','4','Acreedora',[
    SG('sg4.1','4.1','Ingresos operativos','4','Acreedora',[
      SSG('ssg4.1.1','4.1.1','Ingresos por ventas y servicios','4','Acreedora',[
        M('m600','600','Ingresos por servicios','4','Acreedora',[
          S('s600-001','600-001','Ingresos directos','4','Acreedora',[
            D('d600-001-0001','600-001-0001','Ingresos hospedaje','4','Acreedora', {  centroCostoObligatorio:true , saldo:9800000 }),

            D('d600-001-0002','600-001-0002','Ingresos restaurante','4','Acreedora', {  centroCostoObligatorio:true , saldo:3950000 }),

            D('d600-001-0003','600-001-0003','Ingresos spa y bienestar','4','Acreedora', {  centroCostoObligatorio:true , saldo:1680000 }),

            D('d600-001-0004','600-001-0004','Ingresos eventos y banquetes','4','Acreedora', {  centroCostoObligatorio:true , saldo:770000 }),

          ],{saldo:16200000}),
          S('s600-002','600-002','Descuentos y devoluciones','4','Acreedora',[
            D('d600-002-0001','600-002-0001','Descuentos sobre ventas','4','Acreedora', { centroCostoObligatorio:true, saldo:-450000 }),

          ]),
          S('s600-003','600-003','Ingresos financieros','4','Acreedora',[
            D('d600-003-0001','600-003-0001','Intereses ganados','4','Acreedora', {  centroCostoObligatorio:true , saldo:2150000 }),

            D('d600-003-0002','600-003-0002','Diferencial cambiario favor','4','Acreedora', {  centroCostoObligatorio:true , saldo:750000 }),

          ],{saldo:2900000}),
        ]),
      ]),
    ]),
  ]),

  // ── 5. Costos ──────────────────────────────────────────────────────────────
  G('g5','Costos','5','Deudora',[
    SG('sg5.1','5.1','Costo de ventas','5','Deudora',[
      SSG('ssg5.1.1','5.1.1','Costos directos de operación','5','Deudora',[
        M('m700','700','Costo de ventas y servicios','5','Deudora',[
          S('s700-001','700-001','Costos directos','5','Deudora',[
            D('d700-001-0001','700-001-0001','Costo de alimentos y bebidas','5','Deudora', {  centroCostoObligatorio:true , saldo:3850000 }),

            D('d700-001-0002','700-001-0002','Costo de servicios hoteleros','5','Deudora', {  centroCostoObligatorio:true , saldo:2980000 }),

            D('d700-001-0003','700-001-0003','Costo de insumos spa','5','Deudora', {  centroCostoObligatorio:true , saldo:890000 }),

            D('d700-001-0004','700-001-0004','Otros costos directos','5','Deudora', {  centroCostoObligatorio:true , saldo:700000 }),

          ],{saldo:8420000}),
        ], {saldo:8420000}),
      ]),
    ]),
  ]),

  // ── 6. Gastos ──────────────────────────────────────────────────────────────
  G('g6','Gastos','6','Deudora',[
    SG('sg6.1','6.1','Gastos de operación','6','Deudora',[
      SSG('ssg6.1.1','6.1.1','Gastos operativos y administrativos','6','Deudora',[
        M('m800','800','Gastos operativos','6','Deudora',[
          S('s800-001','800-001','Gastos administrativos','6','Deudora',[
            D('d800-001-0001','800-001-0001','Sueldos y salarios','6','Deudora', {  centroCostoObligatorio:true , saldo:3800000 }),

            D('d800-001-0002','800-001-0002','Cargas sociales','6','Deudora', {  centroCostoObligatorio:true , saldo:950000 }),

            D('d800-001-0003','800-001-0003','Servicios públicos','6','Deudora', {  centroCostoObligatorio:true , saldo:680000 }),

            D('d800-001-0004','800-001-0004','Mantenimiento y reparaciones','6','Deudora', {  centroCostoObligatorio:true , saldo:450000 }),

            D('d800-001-0005','800-001-0005','Otros gastos operativos','6','Deudora', {  centroCostoObligatorio:true , saldo:800000 }),

          ],{saldo:6680000}),
          S('s800-002','800-002','Gastos financieros','6','Deudora',[
            D('d800-002-0001','800-002-0001','Intereses bancarios','6','Deudora',{ saldo:1050000, tipoEspecial:'10', centroCostoObligatorio:true }),
            D('d800-002-0002','800-002-0002','Diferencial cambiario gasto','6','Deudora', {  centroCostoObligatorio:true , saldo:214250 }),

          ],{saldo:1264250}),
          S('s800-003','800-003','Gastos financieros','6','Deudora',[
            D('d800-003-0001','800-003-0001','Gastos financieros varios','6','Deudora',{ centroCostoObligatorio:true }),
          ]),
        ]),
      ]),
    ]),
  ]),
];

export const GRUPOS_PATRIMONIO = [
  { value:'001', label:'Capital social'     },
  { value:'002', label:'Reservas'           },
  { value:'003', label:'Utilidades ret.'    },
  { value:'004', label:'Resultado período'  },
];

// Legacy alias
export const LONGITUD_SEGMENTO = LONGITUD;

// ─── Funciones usadas por AccountDetail ──────────────────────────────────────

export function suggestNextSegment(parent: Cuenta | null): string {
  if (!parent) return '';
  return suggestSegment(parent);
}

// Sugerencia de próximo código Mayor cuando todavía no hay cuenta padre que
// consultar (Mayor es el primer nivel configurable) siempre debe
// ofrecerse una sugerencia. Se basa en el código Mayor más alto existente en
// todo el catálogo y salta al siguiente múltiplo de 100 (ej. último 600 → 700).
export function suggestNextMayorSegment(allNodes: (Cuenta & { depth?: number })[]): string {
  const mayores = allNodes.filter(n => n.nivel === 'mayor');
  if (!mayores.length) return '100';
  const max = Math.max(...mayores.map(n => parseInt(n.code, 10) || 0));
  const next = Math.ceil((max + 1) / 100) * 100;
  return String(next).padStart(3, '0');
}

export function buildCodePrefix(parent: Cuenta | null): string {
  if (!parent) return '';
  return parent.code + SEP;
}

export function codeExists(allNodes: (Cuenta & {depth?:number})[], fullCode: string, excludeId: string | null): boolean {
  return allNodes.some(n => n.code === fullCode && n.id !== excludeId);
}

export type TipoMovimientoAjuste = string;

export const NOTA_ADMINISTRATIVA_VALUE = 'nota_administrativa';
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
