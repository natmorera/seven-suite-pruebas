// Perfil de país de la facturación electrónica. El país de la empresa elegida
// (lib/empresas.ts) decide qué textos, catálogos y reglas se muestran. Costa Rica usa el régimen de
// Hacienda; Guatemala, el régimen FEL de la SAT con certificadores.
// Lo usan tanto el servidor como las pantallas: no importa nada del servidor.

export type PerfilPais = 'CR' | 'GT';
export const perfilDe = (pais?: string | null): PerfilPais => (pais === 'GT' ? 'GT' : 'CR');
export const esGuatemala = (pais: string | null | undefined) => perfilDe(pais) === 'GT';

// ── Textos que cambian según el país ─────────────────────────────────────
export interface TextosPais {
  autoridad: string;              // ante quién se emite
  idEmisor: string;               // abreviatura de la identificación del emisor
  sucursal: string; sucursales: string; nuevaSucursal: string;
  pasoTributaria: { titulo: string; detalle: string };
  pasoConexion: { titulo: string; detalle: string };
  pasoSucursal: { titulo: string; detalle: string };
  pestanaImpuestos: string;
  recomendadoProductos: string;
}
export const TEXTOS: Record<PerfilPais, TextosPais> = {
  CR: {
    autoridad: 'Hacienda', idEmisor: 'Céd.', sucursal: 'Sucursal', sucursales: 'Sucursales', nuevaSucursal: '+ Nueva sucursal',
    pasoTributaria: { titulo: 'Datos para Hacienda', detalle: 'Actividad, dirección y correo' },
    pasoConexion: { titulo: 'Conexión con Hacienda', detalle: 'Certificado y credenciales' },
    pasoSucursal: { titulo: 'Sucursal y caja', detalle: 'Desde donde se emite' },
    pestanaImpuestos: 'Impuestos',
    recomendadoProductos: 'Así cada línea de factura trae su CABYS, IVA y precio.',
  },
  GT: {
    autoridad: 'SAT', idEmisor: 'NIT', sucursal: 'Establecimiento', sucursales: 'Establecimientos', nuevaSucursal: '+ Nuevo establecimiento',
    pasoTributaria: { titulo: 'Datos para la SAT', detalle: 'Afiliación al IVA, frases y dirección' },
    pasoConexion: { titulo: 'Certificador', detalle: 'Certificador FEL y credenciales' },
    pasoSucursal: { titulo: 'Establecimiento y caja', detalle: 'Desde donde se emite' },
    pestanaImpuestos: 'Unidades gravables',
    recomendadoProductos: 'Así cada línea de factura trae su unidad gravable, unidad de medida y precio.',
  },
};
export const textosDe = (pais: string | null | undefined) => TEXTOS[perfilDe(pais)];

// ── Afiliación al IVA y régimen de ISR ───────────────────────────────────
export const AFILIACIONES_IVA = [
  { value: 'GEN', label: 'General' },
  { value: 'PEQ', label: 'Pequeño contribuyente' },
  { value: 'PEE', label: 'Pequeño contribuyente régimen electrónico' },
  { value: 'AGR', label: 'Contribuyente agropecuario' },
  { value: 'AGE', label: 'Agropecuario régimen electrónico especial' },
  { value: 'PRI', label: 'Régimen primario' },
  { value: 'PEC', label: 'Régimen pecuario' },
  { value: 'EXE', label: 'Sin afiliación al IVA' },
];
export const nombreAfiliacion = (v: string) => AFILIACIONES_IVA.find(a => a.value === v)?.label ?? v;

// Escenarios de la frase tipo 1 (retención del ISR): son el régimen de ISR
export const REGIMENES_ISR = [
  { value: '1', label: 'Utilidades de actividades lucrativas', frase: 'Sujeto a pagos trimestrales ISR' },
  { value: '2', label: 'Opcional simplificado, sujeto a retención', frase: 'Sujeto a retención definitiva ISR' },
  { value: '3', label: 'Opcional simplificado con pago directo', frase: 'Sujeto a pago directo ISR' },
];

// ── Frases ───────────────────────────────────────────────────────────────
export const TIPOS_FRASE: { tipo: number; nombre: string }[] = [
  { tipo: 1, nombre: 'Retención del ISR' }, { tipo: 2, nombre: 'Agente de retención del IVA' },
  { tipo: 3, nombre: 'No genera derecho a crédito fiscal' }, { tipo: 4, nombre: 'Exento o no afecto al IVA' },
  { tipo: 5, nombre: 'Factura especial' }, { tipo: 6, nombre: 'Contribuyente agropecuario' },
  { tipo: 7, nombre: 'Regímenes electrónicos' }, { tipo: 8, nombre: 'Exento de ISR' },
  { tipo: 9, nombre: 'Especiales' }, { tipo: 10, nombre: 'Régimen primario' },
  { tipo: 11, nombre: 'Régimen pecuario' }, { tipo: 12, nombre: 'Factura específica' },
];
export const nombreTipoFrase = (t: number) => TIPOS_FRASE.find(x => x.tipo === t)?.nombre ?? `Tipo ${t}`;

// Escenarios por tipo de frase, con el texto que va en la representación gráfica
export const ESCENARIOS_FRASE: Record<number, { escenario: number; nombre: string; texto: string }[]> = {
  1: REGIMENES_ISR.map(r => ({ escenario: Number(r.value), nombre: r.label, texto: r.frase })),
  2: [{ escenario: 1, nombre: 'Es agente de retención del IVA', texto: 'Agente de Retención del IVA' }],
  3: [{ escenario: 1, nombre: 'Régimen simplificado del IVA', texto: 'No genera derecho a crédito fiscal' }],
  4: [
    [1, 'Exportaciones', 'Exenta del IVA (art. 7 num. 2 Ley del IVA)'],
    [2, 'Servicios de instituciones fiscalizadas por la Superintendencia de Bancos', 'Exenta del IVA (art. 7 num. 4 Ley del IVA)'],
    [3, 'Ventas de cooperativas', 'Exenta del IVA (art. 7 num. 5 Ley del IVA)'],
    [4, 'Donaciones', 'Exenta del IVA (art. 7 num. 9 Ley del IVA)'],
    [5, 'Cuotas de miembros', 'Exenta del IVA (art. 7 num. 10 Ley del IVA)'],
    [6, 'Servicios exentos de entidades no lucrativas', 'Exenta del IVA (art. 7 num. 13 Ley del IVA)'],
    [7, 'Venta de activos de bancos o sociedades financieras', 'Exenta del IVA (art. 7 num. 14 Ley del IVA)'],
    [8, 'Servicios exentos de centros educativos privados', 'Exenta del IVA (art. 8 num. 1 Ley del IVA)'],
    [9, 'Medicamentos', 'Exenta del IVA (art. 7 num. 15 Ley del IVA)'],
    [10, 'Vehículos de dos o más años', 'Esta factura no incluye IVA (art. 55 Ley del IVA)'],
    [11, 'Maquilas, zonas francas y coexportadores', 'No afecta al IVA (Decreto 29-89 Ley de Maquila)'],
    [12, 'Ventas a zonas francas', 'No afecta al IVA (Decreto 65-89 Ley de Zonas Francas)'],
    [13, 'Venta de vivienda', 'Exenta del IVA (art. 7 num. 12, Ley del IVA)'],
    [14, 'Venta de títulos y acciones', 'Exenta del IVA (art. 7 num. 6 Ley del IVA)'],
    [15, 'Venta al menudeo en mercados', 'Exenta del IVA (art. 7 num. 11 Ley del IVA)'],
    [16, 'Ventas y servicios de universidades', 'Exenta del IVA (art. 8 num. 2 Ley del IVA)'],
    [17, 'Ventas de usuarios Zolic', 'Exenta del IVA (art. 32 literal c, Ley Orgánica Zolic)'],
    [18, 'Ventas exentas por disposición específica', 'Contribuyentes con disposiciones específicas de exención al IVA'],
    [19, 'Faltante de inventario por casos fortuitos o delitos', 'Exenta del IVA (art. 3 num. 7 Ley del IVA)'],
    [21, 'Cargos e impuestos de otros países (aerolíneas)', 'Cargos e impuestos no sujetos a IVA (Aerolíneas)'],
    [22, 'Nota sobre un documento sin IVA', 'Factura origen no incluye IVA'],
    [23, 'Aportación de bienes muebles a sociedades', 'Exenta del IVA (art. 7, numeral 3, literal c, Ley del IVA)'],
    [24, 'Servicios prestados fuera del territorio nacional', 'No afecto al IVA (Fuera del hecho generador art. 3, 7 y 8, Ley del IVA)'],
    [25, 'Ventas Zolic', 'Exenta del IVA (art. 31 Dec. 22-73 Ley Orgánica Zolic)'],
    [33, 'Cuotas de condóminos', 'No afecto al IVA (Fuera del hecho generador art. 3, Ley del IVA)'],
  ].map(([escenario, nombre, texto]) => ({ escenario: Number(escenario), nombre: String(nombre), texto: String(texto) })),
  5: [
    { escenario: 1, nombre: 'El vendedor se negó a emitir la factura', texto: 'El vendedor o prestador del servicio se negó a emitir la factura correspondiente. (art. 52 Ley del IVA)' },
    { escenario: 2, nombre: 'Productos agropecuarios, artesanales o reciclados', texto: 'Vendedor de productos agropecuarios, artesanales y productos reciclados' },
  ],
  6: [
    { escenario: 1, nombre: 'Pago del 5 % sobre las ventas brutas', texto: 'Con forma de pago sobre las ventas brutas' },
    { escenario: 2, nombre: 'Pago del 5 % sobre las utilidades', texto: 'Con forma de pago sobre las utilidades, no retener' },
  ],
  7: [
    { escenario: 1, nombre: 'Pequeño contribuyente régimen electrónico', texto: 'No retener, [resolución]' },
    { escenario: 2, nombre: 'Agropecuario régimen electrónico especial', texto: 'No retener, [resolución]' },
  ],
  8: [
    [1, 'Universidades', 'Exenta del ISR (art. 8 núm. 2 Ley de Actualización Tributaria)'],
    [2, 'Centros educativos privados', 'Exenta del ISR (art. 8 núm. 3 Ley de Actualización Tributaria)'],
    [3, 'Iglesias', 'Exenta del ISR (art. 8 núm. 5 Ley de Actualización Tributaria)'],
    [4, 'Entes no lucrativos', 'Exenta del ISR (art. 11 núm. 1 Ley de Actualización Tributaria)'],
    [5, 'Cooperativas', 'Exenta del ISR (art. 11 núm. 2 Ley de Actualización Tributaria)'],
    [8, 'Entidades del Estado', 'Exenta del ISR (art. 8 núm. 1 Ley de Actualización Tributaria)'],
    [12, 'Cuotas de condóminos', 'No afecta al ISR (Fuera del hecho generador, arto. 10, Ley de Actualización Tributaria)'],
  ].map(([escenario, nombre, texto]) => ({ escenario: Number(escenario), nombre: String(nombre), texto: String(texto) })),
  9: [{ escenario: 14, nombre: 'Emisión en ubicación temporal', texto: 'Emisión en ubicación temporal' }],
};
export const escenarioFrase = (tipo: number, escenario: number) => ESCENARIOS_FRASE[tipo]?.find(e => e.escenario === escenario);

// Número y fecha de resolución solo se piden en estos escenarios; en
// cualquier otro deben ir vacíos.
export const pideNumeroResolucion = (tipo: number, escenario: number) => (tipo === 1 && escenario === 3) || (tipo === 7 && (escenario === 1 || escenario === 2));
export const pideFechaResolucion = (tipo: number, escenario: number) => tipo === 1 && escenario === 3;

export interface FraseEmisor { tipo: number; escenario: number; resolucion: string; fecha: string; origen: 'rtu' | 'manual' }

// Frases que salen del RTU según la afiliación del emisor (tipos 1, 2, 3, 6 y 7)
export function frasesDelRtu(afiliacion: string, regimenIsr: string, agenteRetencionIva: boolean): FraseEmisor[] {
  const f = (tipo: number, escenario: number): FraseEmisor => ({ tipo, escenario, resolucion: '', fecha: '', origen: 'rtu' });
  const lista: FraseEmisor[] = [];
  if (afiliacion === 'GEN') lista.push(f(1, Number(regimenIsr) || 1));
  if (agenteRetencionIva) lista.push(f(2, 1));
  if (['PEQ', 'PEE', 'AGR', 'AGE', 'PRI', 'PEC'].includes(afiliacion)) lista.push(f(3, 1));
  if (afiliacion === 'AGR') lista.push(f(6, 1));
  if (afiliacion === 'PEE') lista.push(f(7, 1));
  if (afiliacion === 'AGE') lista.push(f(7, 2));
  return lista;
}

// ── Tipos de DTE ─────────────────────────────────────────────────────────
export interface TipoDte { codigo: string; nombre: string; afiliaciones: string[]; uso: 'venta' | 'compra' }
export const TIPOS_DTE: TipoDte[] = [
  { codigo: 'FACT', nombre: 'Factura', afiliaciones: ['GEN'], uso: 'venta' },
  { codigo: 'FCAM', nombre: 'Factura cambiaria', afiliaciones: ['GEN'], uso: 'venta' },
  { codigo: 'FPEQ', nombre: 'Factura pequeño contribuyente', afiliaciones: ['PEQ'], uso: 'venta' },
  { codigo: 'FCAP', nombre: 'Factura cambiaria pequeño contribuyente', afiliaciones: ['PEQ'], uso: 'venta' },
  { codigo: 'FAPE', nombre: 'Factura pequeño contribuyente régimen electrónico', afiliaciones: ['PEE'], uso: 'venta' },
  { codigo: 'FCPE', nombre: 'Factura cambiaria pequeño contribuyente régimen electrónico', afiliaciones: ['PEE'], uso: 'venta' },
  { codigo: 'FACA', nombre: 'Factura contribuyente agropecuario', afiliaciones: ['AGR'], uso: 'venta' },
  { codigo: 'FCCA', nombre: 'Factura cambiaria contribuyente agropecuario', afiliaciones: ['AGR'], uso: 'venta' },
  { codigo: 'FAAE', nombre: 'Factura agropecuario régimen electrónico especial', afiliaciones: ['AGE'], uso: 'venta' },
  { codigo: 'FCAE', nombre: 'Factura cambiaria agropecuario régimen electrónico especial', afiliaciones: ['AGE'], uso: 'venta' },
  { codigo: 'NCRE', nombre: 'Nota de crédito', afiliaciones: ['GEN'], uso: 'venta' },
  { codigo: 'NDEB', nombre: 'Nota de débito', afiliaciones: ['GEN'], uso: 'venta' },
  { codigo: 'RANT', nombre: 'Recibo de anticipos', afiliaciones: ['GEN'], uso: 'venta' },
  { codigo: 'NABN', nombre: 'Nota de abono', afiliaciones: ['GEN', 'PEQ', 'PEE', 'AGR', 'AGE'], uso: 'venta' },
  { codigo: 'FESP', nombre: 'Factura especial', afiliaciones: ['GEN', 'PEQ', 'PEE', 'AGR', 'AGE', 'EXE'], uso: 'compra' },
];
export const tiposDteVenta = (afiliacion: string) => TIPOS_DTE.filter(t => t.uso === 'venta' && t.afiliaciones.includes(afiliacion || 'GEN'));
export const nombreDte = (codigo: string) => TIPOS_DTE.find(t => t.codigo === codigo)?.nombre ?? codigo;

// Documentos de compra que se registran sin certificador (para el libro de compras)
export const COMPRAS_FISICAS = [
  { codigo: 'SCOM', nombre: 'Compra factura física' },
  { codigo: 'SNCC', nombre: 'Nota de crédito de compra física' },
  { codigo: 'SNDC', nombre: 'Nota de débito de compra física' },
  { codigo: 'SCCA', nombre: 'Compra de factura cambiaria física' },
];

// Clasificación de la operación. FEL solo lleva la marca de exportación; las
// demás sirven para los libros.
export const TIPOS_TRANSACCION = ['Local', 'Importación', 'Exportación', 'Adquisición', 'Transferencia'];

// ── Receptor ─────────────────────────────────────────────────────────────
export const TIPOS_ID_RECEPTOR = [
  { value: 'NIT', label: 'NIT' }, { value: 'CF', label: 'Consumidor final (CF)' },
  { value: 'CUI', label: 'CUI (DPI)' }, { value: 'EXT', label: 'Extranjero (pasaporte)' },
];
// Monto desde el que un documento a consumidor final exige identificar al receptor
export const TOPE_CONSUMIDOR_FINAL = 2500;

// Dígito verificador del NIT: dígitos de derecha a izquierda por 2, 3, 4…;
// (11 − suma mod 11) mod 11, y 10 es «K».
export function nitValido(nit: string): boolean {
  const limpio = nit.replace(/[\s-]/g, '').toUpperCase();
  if (!/^\d{1,11}[\dK]$/.test(limpio)) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  let suma = 0;
  for (let i = 0; i < cuerpo.length; i++) suma += Number(cuerpo[cuerpo.length - 1 - i]) * (i + 2);
  const r = (11 - (suma % 11)) % 11;
  return (r === 10 ? 'K' : String(r)) === dv;
}

// ── Impuestos y unidades gravables ───────────────────────────────────────
// Datos de un artículo que solo usa Guatemala
export interface DatosArticuloGT { bienServicio: 'B' | 'S'; unidadIva: number; unidadIth: number | null; escenarioExencion: number | null; clasificacion?: string | null }
export const ARTICULO_GT_INICIAL: DatosArticuloGT = { bienServicio: 'S', unidadIva: 1, unidadIth: null, escenarioExencion: null, clasificacion: null };
export function leerDatosArticuloGT(texto: string | null | undefined): DatosArticuloGT {
  try { return { ...ARTICULO_GT_INICIAL, ...(texto ? JSON.parse(texto) : {}) }; } catch { return { ...ARTICULO_GT_INICIAL }; }
}

// Cálculo de una línea en Guatemala: el precio lleva el IVA incluido y el
// impuesto de turismo se calcula sobre el mismo monto gravable y se suma.
const r2 = (n: number) => Math.round(n * 100) / 100;
export function calcularLineaGT(precio: number, descuento: number, unidadIva: number, unidadIth: number | null) {
  const neto = precio - descuento;
  const montoGravable = r2(unidadIva === 1 ? neto / 1.12 : neto);
  const iva = r2(unidadIva === 1 ? montoGravable * 0.12 : 0);
  const ith = r2(unidadIth === 1 ? montoGravable * 0.1 : 0);
  return { montoGravable, iva, ith, total: r2(neto + ith) };
}

// ── Certificadores y división territorial ────────────────────────────────
export const CERTIFICADORES_GT = ['DIGIFACT', 'Infile', 'Megaprint'];
export interface CertificadorEmisor {
  id: string; certificador: string; usuario: string; identificador: string; certificado: string;
  principal: boolean; verificado: boolean; tieneClave: boolean;
}

export const DEPARTAMENTOS_GT: Record<string, string> = {
  '01': 'Guatemala', '02': 'El Progreso', '03': 'Sacatepéquez', '04': 'Chimaltenango', '05': 'Escuintla', '06': 'Santa Rosa',
  '07': 'Sololá', '08': 'Totonicapán', '09': 'Quetzaltenango', '10': 'Suchitepéquez', '11': 'Retalhuleu', '12': 'San Marcos',
  '13': 'Huehuetenango', '14': 'Quiché', '15': 'Baja Verapaz', '16': 'Alta Verapaz', '17': 'Petén', '18': 'Izabal',
  '19': 'Zacapa', '20': 'Chiquimula', '21': 'Jalapa', '22': 'Jutiapa',
};
// En Guatemala la ubicación se guarda en los mismos campos que en Costa Rica:
// provincia = «GT» + código de departamento, cantón = municipio y distrito =
// código postal.
export const PREFIJO_DEPARTAMENTO = 'GT';
export const esUbicacionGT = (provincia: string | null | undefined) => String(provincia ?? '').startsWith(PREFIJO_DEPARTAMENTO);
export const nombreDepartamento = (provincia: string) => DEPARTAMENTOS_GT[provincia.slice(PREFIJO_DEPARTAMENTO.length)] ?? '';

// Cómo se llaman en Guatemala los tipos de documento que ya maneja el
// sistema. El tiquete no existe en FEL (es una factura a consumidor final) y
// la factura electrónica de compra equivale a la factura especial.
export const NOMBRE_TIPO_GT: Record<string, string> = {
  'Factura electrónica': 'Factura (FACT)',
  'Nota de crédito': 'Nota de crédito (NCRE)',
  'Nota de débito': 'Nota de débito (NDEB)',
  'Factura de exportación': 'Factura de exportación (FACT con marca Exp)',
  'Factura electrónica de compra': 'Factura especial (FESP)',
  'Tiquete electrónico': 'Factura a consumidor final',
  'Recibo de anticipos': 'Recibo de anticipos (RANT)',
};
export const PESTANA_VENTAS_GT: Record<string, string> = {
  'Factura electrónica': 'Facturas', 'Tiquete electrónico': 'Consumidor final', 'Factura de exportación': 'Exportación',
};
// Tipos que se ofrecen al crear un documento en Guatemala (sin tiquete)
export const tiposCreablesGT = (tipos: readonly string[]) => tipos.filter(t => t !== 'Tiquete electrónico' && t !== 'Factura de exportación');

// ── Emisión ──────────────────────────────────────────────────────────────
// Tipo de DTE de un documento del sistema. A crédito, la factura es cambiaria.
export function tipoDteDe(tipo: string, condicionVenta?: string | null): string {
  if (tipo === 'Nota de crédito') return 'NCRE';
  if (tipo === 'Nota de débito') return 'NDEB';
  if (tipo === 'Factura electrónica de compra') return 'FESP';
  if (tipo === 'Recibo de anticipos') return 'RANT';
  if (tipo === 'Factura electrónica' && condicionVenta === '02') return 'FCAM';
  return 'FACT';
}

// Serie y número que asigna el certificador: la serie son los primeros 8
// caracteres del número de autorización (UUID) y el número, el valor decimal
// de los caracteres 9 a 16 (sin guiones).
export function serieNumeroDeUuid(uuid: string): { serie: string; numero: string } {
  const hex = uuid.replace(/-/g, '').toUpperCase();
  return { serie: hex.slice(0, 8), numero: String(parseInt(hex.slice(8, 16), 16)) };
}

// Receptor: devuelve el error o null. El monto es el total en quetzales.
export function errorReceptorGT(tipoId: string, numero: string, totalQ: number, tipoDte: string): string | null {
  const n = (numero ?? '').trim().toUpperCase();
  if (tipoId === '06' || n === 'CF') {
    if (['NCRE', 'NDEB', 'FESP'].includes(tipoDte)) return 'Las notas de crédito y débito y la factura especial no se pueden emitir a consumidor final: indica el NIT o CUI.';
    if (totalQ > TOPE_CONSUMIDOR_FINAL) return `Desde Q${TOPE_CONSUMIDOR_FINAL.toLocaleString('en-US')} el receptor no puede ser consumidor final: indica el NIT, CUI o pasaporte.`;
    return null;
  }
  if (tipoId === '02' && !nitValido(n)) return 'El NIT del receptor no es válido: revisa el dígito verificador.';
  if (tipoId === '01' && !/^\d{12,13}$/.test(n)) return 'El CUI del receptor lleva 12 o 13 dígitos.';
  if (tipoId === '05' && !/^[A-Z0-9&%\-\/#]{3,18}$/.test(n.replace(/\s/g, ''))) return 'El documento del extranjero lleva de 3 a 18 letras o números, sin espacios.';
  return null;
}

// Frases de un documento: las del emisor que admite el tipo de DTE y las que
// dependen del documento (exento, exportación, notas sin IVA, factura especial).
export function frasesDocumento(p: {
  tipoDte: string; frasesEmisor: FraseEmisor[]; exportacion: boolean; hayExentas: boolean; escenariosExencion: number[]; escenarioFesp?: number;
}): FraseEmisor[] {
  const f = (tipo: number, escenario: number): FraseEmisor => ({ tipo, escenario, resolucion: '', fecha: '', origen: 'rtu' });
  const lista: FraseEmisor[] = [];
  const conIsr = ['FACT', 'FCAM'].includes(p.tipoDte);
  for (const x of p.frasesEmisor) {
    if (x.tipo === 1 && !conIsr) continue;
    if (x.tipo === 2 && !['FACT', 'FCAM', 'NCRE', 'NDEB'].includes(p.tipoDte)) continue;
    lista.push(x);
  }
  if (p.tipoDte === 'FESP') lista.push(f(5, p.escenarioFesp === 2 ? 2 : 1));
  if (p.exportacion) lista.push(f(4, 1));
  else if (p.hayExentas && ['NCRE', 'NDEB'].includes(p.tipoDte)) lista.push(f(4, 22));
  else if (p.hayExentas) for (const e of [...new Set(p.escenariosExencion)]) lista.push(f(4, e));
  const vistos = new Set<string>();
  return lista.filter(x => { const k = `${x.tipo}-${x.escenario}`; if (vistos.has(k)) return false; vistos.add(k); return true; });
}

// Texto de una frase para el documento impreso
export function textoFraseDocumento(x: FraseEmisor): string {
  const base = escenarioFrase(x.tipo, x.escenario)?.texto ?? `Frase ${x.tipo}, escenario ${x.escenario}`;
  if (x.tipo === 1 && x.escenario === 3) return `${base} (${x.resolucion} - ${x.fecha ? x.fecha.split('-').reverse().join('/') : ''})`;
  return base.replace('[resolución]', x.resolucion);
}

// Abono de una factura cambiaria. Fecha y monto van en el DTE; el medio de
// pago es opcional y el pago se confirma después, cuando se cobra.
export interface PagoAbono { fecha: string; medio: string; comprobante?: string }
export interface AbonoFcam { numero: number; fechaVencimiento: string; monto: number; medio?: string; pagado?: PagoAbono | null }

// ── Clasificación del artículo (equivalente al CABYS de Costa Rica) ───────
// Al elegir una clasificación se completan bien o servicio, unidad, IVA,
// impuesto al turismo de hospedaje (ITH) y, si es exento, el motivo de la
// exención (frase tipo 4). Las de hotel van primero; luego, una por cada
// motivo de exención del catálogo de la SAT.
export interface ClasificacionGT {
  id: string; nombre: string; ejemplos: string; bienServicio: 'B' | 'S'; unidad: string;
  unidadIva: number; unidadIth: number | null; escenarioExencion: number | null;
}
const CLASIFICACIONES_HOTEL: ClasificacionGT[] = [
  { id: 'hospedaje', nombre: 'Hospedaje', ejemplos: 'habitación, noche, suite, cama adicional', bienServicio: 'S', unidad: 'Noche', unidadIva: 1, unidadIth: 1, escenarioExencion: null },
  { id: 'alimentos', nombre: 'Alimentos y bebidas', ejemplos: 'restaurante, desayuno, room service, bar', bienServicio: 'B', unidad: 'Unid', unidadIva: 1, unidadIth: null, escenarioExencion: null },
  { id: 'minibar', nombre: 'Minibar y tienda', ejemplos: 'snacks, agua, souvenirs, artesanías', bienServicio: 'B', unidad: 'Unid', unidadIva: 1, unidadIth: null, escenarioExencion: null },
  { id: 'eventos', nombre: 'Salones y eventos', ejemplos: 'alquiler de salón, banquete, equipo audiovisual', bienServicio: 'S', unidad: 'Servicio', unidadIva: 1, unidadIth: null, escenarioExencion: null },
  { id: 'tours', nombre: 'Tours y traslados', ejemplos: 'excursión, traslado al aeropuerto, lancha, guía', bienServicio: 'S', unidad: 'Servicio', unidadIva: 1, unidadIth: null, escenarioExencion: null },
  { id: 'spa', nombre: 'Spa y bienestar', ejemplos: 'masaje, sauna, gimnasio', bienServicio: 'S', unidad: 'Servicio', unidadIva: 1, unidadIth: null, escenarioExencion: null },
  { id: 'lavanderia', nombre: 'Lavandería', ejemplos: 'lavado, planchado', bienServicio: 'S', unidad: 'Servicio', unidadIva: 1, unidadIth: null, escenarioExencion: null },
  { id: 'otros-servicios', nombre: 'Otros servicios', ejemplos: 'estacionamiento, internet, llamadas, cargo por cancelación', bienServicio: 'S', unidad: 'Servicio', unidadIva: 1, unidadIth: null, escenarioExencion: null },
];
export const CLASIFICACIONES_GT: ClasificacionGT[] = [
  ...CLASIFICACIONES_HOTEL,
  ...ESCENARIOS_FRASE[4].filter(e => e.escenario !== 1 && e.escenario !== 22).map(e => ({
    id: `exento-${e.escenario}`, nombre: `Exento: ${e.nombre}`, ejemplos: e.texto,
    bienServicio: (e.escenario === 9 || e.escenario === 10 ? 'B' : 'S') as 'B' | 'S', unidad: e.escenario === 9 ? 'Unid' : 'Servicio',
    unidadIva: 2, unidadIth: null, escenarioExencion: e.escenario,
  })),
];
const sinTildes = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function buscarClasificacion(texto: string): ClasificacionGT[] {
  const q = sinTildes(texto.trim());
  if (!q) return CLASIFICACIONES_HOTEL;
  return CLASIFICACIONES_GT.filter(c => sinTildes(`${c.nombre} ${c.ejemplos}`).includes(q));
}
export const clasificacionPorId = (id: string | null | undefined) => CLASIFICACIONES_GT.find(c => c.id === id);
