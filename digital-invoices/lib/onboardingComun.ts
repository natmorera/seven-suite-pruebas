// Tipos y reglas del onboarding contable que usan tanto el servidor como la pantalla.
import { CUENTAS_INIT, type Cuenta } from '@/components/pages/catalogo/catalogoData';

export type PasoId = 'empresa' | 'nomenclatura' | 'catalogo' | 'cuentas' | 'ejercicio' | 'consecutivos' | 'tributaria' | 'hacienda' | 'sucursal';
export const PASOS_ORDEN: PasoId[] = ['empresa', 'nomenclatura', 'catalogo', 'cuentas', 'ejercicio', 'consecutivos', 'tributaria', 'hacienda', 'sucursal'];
// Pasos según la versión. Este proyecto tiene dos (la versión solo Accounting
// vive en su propio proyecto):
//   Accounting + Digital Invoices: los 9 pasos (incluye las cuentas de los asientos de facturación)
//   solo Digital Invoices:         empresa + los 3 de facturación
export const PASOS_FACTURACION: PasoId[] = ['tributaria', 'hacienda', 'sucursal'];
export const pasosDe = (m: { contabilidad: boolean; facturacion: boolean }): PasoId[] =>
  m.contabilidad ? PASOS_ORDEN : ['empresa', ...PASOS_FACTURACION];

export interface Nomenclatura {
  longitudes: { mayor: number; submajor: number; detalle: number };
  separador: '-' | '.' | '';
  decimalSep: '.' | ',';
}
export const NOMENCLATURA_INICIAL: Nomenclatura = { longitudes: { mayor: 3, submajor: 3, detalle: 4 }, separador: '-', decimalSep: '.' };
// El catálogo base viene escrito con 3, 3 y 4 dígitos y guion medio (100-001-0001)
export const NOMENCLATURA_BASE: Nomenclatura = NOMENCLATURA_INICIAL;
export const mismaNomenclatura = (a: Nomenclatura | null, b: Nomenclatura | null) =>
  Boolean(a && b && a.separador === b.separador && a.longitudes.mayor === b.longitudes.mayor && a.longitudes.submajor === b.longitudes.submajor && a.longitudes.detalle === b.longitudes.detalle);

// Parte un código según su nomenclatura: [mayor, submayor, detalle, auxiliar?]
export function partirCodigo(codigo: string, n: Nomenclatura): string[] {
  if (n.separador) return codigo.split(n.separador);
  const largos = [n.longitudes.mayor, n.longitudes.submajor, n.longitudes.detalle];
  const segs: string[] = []; let i = 0;
  for (const l of largos) { if (i >= codigo.length) break; segs.push(codigo.slice(i, i + l)); i += l; }
  if (i < codigo.length) segs.push(codigo.slice(i));
  return segs;
}

// Reescribe los códigos de un plan con otra nomenclatura. La cuenta mayor
// conserva sus primeros dígitos (100 → 1000 o 10); submayor, detalle y
// auxiliar conservan su número (001 → 01 o 00001).
export function recodificar(arbol: Cuenta[], de: Nomenclatura, a: Nomenclatura): { cuentas: Cuenta[]; error: string | null } {
  if (mismaNomenclatura(de, a)) return { cuentas: arbol, error: null };
  const largos = [a.longitudes.mayor, a.longitudes.submajor, a.longitudes.detalle];
  const NIVELES = new Set(['mayor', 'submajor', 'detalle', 'auxiliar']);
  let error: string | null = null;
  const vistos = new Set<string>();
  const nuevo = (codigo: string) => {
    const segs = partirCodigo(codigo, de).map((s, i) => {
      if (i === 0) return s.length >= largos[0] ? s.slice(0, largos[0]) : s.padEnd(largos[0], '0');
      const largo = i < 3 ? largos[i] : s.length;
      const v = String(Number(s));
      if (v.length > largo) error ??= `El código ${codigo} no cabe en ${largo} dígitos.`;
      return v.padStart(largo, '0');
    });
    const r = segs.join(a.separador);
    if (vistos.has(r)) error ??= `Con esta nomenclatura dos cuentas quedarían con el código ${r}. Usa más dígitos en la cuenta mayor.`;
    vistos.add(r);
    return r;
  };
  const rec = (ns: Cuenta[]): Cuenta[] => ns.map(c => {
    const cambia = NIVELES.has(c.nivel);
    const code = cambia ? nuevo(c.code) : c.code;
    return { ...c, code, ...(c.codigo !== undefined && cambia ? { codigo: code } : {}), ...(c.children ? { children: rec(c.children) } : {}) };
  });
  const cuentas = rec(arbol);
  return { cuentas, error };
}

// El catálogo base arranca en cero y con la moneda funcional en las cuentas posteables
export const baseEnCero = (ns: Cuenta[], moneda: string): Cuenta[] => ns.map(c => ({
  ...c, saldo: 0, fechaUltimoAsiento: undefined, ...(c.posteable ? { moneda } : {}),
  ...(c.children ? { children: baseEnCero(c.children, moneda) } : {}),
}));

// El plan base, en cero, en la moneda primaria y con la nomenclatura elegida
export const planBase = (moneda: string, n: Nomenclatura) => recodificar(baseEnCero(CUENTAS_INIT, moneda), NOMENCLATURA_BASE, n);

export const aplanar = (ns: Cuenta[]): Cuenta[] => ns.flatMap(c => [c, ...aplanar(c.children ?? [])]);
export const posteablesConMoneda = (arbol: Cuenta[]) => aplanar(arbol).filter(c => c.posteable && !c.inactiva && Boolean(c.moneda)).length;
// ── Plan de cuentas subido por el cliente ─────────────────────────────────
// Cada fila trae un código con la nomenclatura definida: 1 nivel = cuenta
// mayor, 2 = sub mayor, 3 = detalle, 4 = auxiliar. El padre sale del mismo
// código; las cuentas mayores quedan bajo su grupo (primer dígito).
export interface FilaPlan { codigo: string; nombre: string; naturaleza?: string; posteable?: string; moneda?: string }
const GRUPOS: Record<string, { nombre: string; nat: 'Deudora' | 'Acreedora' }> = {
  '1': { nombre: 'Activos', nat: 'Deudora' }, '2': { nombre: 'Pasivos', nat: 'Acreedora' }, '3': { nombre: 'Patrimonio', nat: 'Acreedora' },
  '4': { nombre: 'Ingresos', nat: 'Acreedora' }, '5': { nombre: 'Costos', nat: 'Deudora' }, '6': { nombre: 'Gastos', nat: 'Deudora' },
  '7': { nombre: 'Otros resultados', nat: 'Deudora' }, '8': { nombre: 'Cuentas de orden', nat: 'Deudora' }, '9': { nombre: 'Cuentas de orden', nat: 'Acreedora' },
};
const NIVELES_PLAN = ['mayor', 'submajor', 'detalle', 'auxiliar'] as const;

export function armarPlan(filas: FilaPlan[], nom: Nomenclatura, moneda: string): { cuentas: Cuenta[]; errores: string[]; total: number } {
  const errores: string[] = [];
  const largos = [nom.longitudes.mayor, nom.longitudes.submajor, nom.longitudes.detalle];
  const partir = (codigo: string): string[] | null => {
    const limpio = codigo.trim();
    if (nom.separador) return limpio.split(nom.separador);
    const segs: string[] = []; let i = 0;
    for (const l of largos) { if (i >= limpio.length) break; segs.push(limpio.slice(i, i + l)); i += l; }
    if (i < limpio.length) segs.push(limpio.slice(i));
    return segs;
  };
  const porCodigo = new Map<string, Cuenta>();
  const orden: { c: Cuenta; segs: string[] }[] = [];
  filas.forEach((f, idx) => {
    const fila = idx + 2;
    if (!f.codigo && !f.nombre) return;
    const segs = partir(f.codigo);
    if (!f.codigo || !segs) { errores.push(`Fila ${fila}: falta el código.`); return; }
    if (!f.nombre) { errores.push(`Fila ${fila}: falta el nombre de ${f.codigo}.`); return; }
    if (segs.length > 4 || segs.some(s => !/^\d+$/.test(s)) || segs.slice(0, 3).some((s, i) => s.length !== largos[i])) {
      errores.push(`Fila ${fila}: el código ${f.codigo} no sigue la nomenclatura ${largos.join('-')}.`); return;
    }
    const code = segs.join(nom.separador);
    if (porCodigo.has(code)) { errores.push(`Fila ${fila}: el código ${code} está repetido.`); return; }
    const grupo = segs[0][0];
    const nat = /^a/i.test(f.naturaleza ?? '') ? 'Acreedora' : /^d/i.test(f.naturaleza ?? '') ? 'Deudora' : (GRUPOS[grupo]?.nat ?? 'Deudora');
    const c: Cuenta = {
      id: `u-${code}`, code, nombre: f.nombre.trim(), nivel: NIVELES_PLAN[segs.length - 1], grupo, naturaleza: nat,
      posteable: false, saldo: 0, tipoEspecial: null, centroCostoObligatorio: false, expanded: segs.length < 3, children: [],
    };
    (c as Cuenta & { _post?: string; _mon?: string })._post = f.posteable; (c as Cuenta & { _mon?: string })._mon = f.moneda;
    porCodigo.set(code, c); orden.push({ c, segs });
  });
  const raiz = new Map<string, Cuenta>();
  for (const { c, segs } of orden) {
    if (segs.length === 1) {
      const g = c.grupo;
      if (!raiz.has(g)) raiz.set(g, { id: `u-g${g}`, code: g, nombre: GRUPOS[g]?.nombre ?? `Grupo ${g}`, nivel: 'grupo', grupo: g, naturaleza: GRUPOS[g]?.nat ?? 'Deudora', posteable: false, saldo: 0, tipoEspecial: null, centroCostoObligatorio: false, expanded: false, children: [] });
      c.parentId = raiz.get(g)!.id; raiz.get(g)!.children!.push(c);
    } else {
      const padre = porCodigo.get(segs.slice(0, -1).join(nom.separador));
      if (!padre) { errores.push(`El código ${c.code} no tiene su cuenta superior ${segs.slice(0, -1).join(nom.separador)}.`); continue; }
      c.parentId = padre.id; padre.children!.push(c);
    }
  }
  for (const { c } of orden) {
    const x = c as Cuenta & { _post?: string; _mon?: string };
    const post = (x._post ?? '').trim();
    c.posteable = post ? /^(s|si|sí|x|1|true)$/i.test(post) : !(c.children?.length);
    const mon = (x._mon ?? '').trim().toUpperCase();
    if (c.posteable) c.moneda = mon || moneda;
    delete x._post; delete x._mon;
  }
  const cuentas = [...raiz.values()].sort((a, b) => a.code.localeCompare(b.code));
  return { cuentas, errores, total: orden.length };
}
