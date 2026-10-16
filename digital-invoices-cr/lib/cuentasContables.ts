// Cuentas contables para Facturación (inventario, compras y ventas).
//
// Clientes y proveedores se llevan en cuentas de NIVEL 4 (auxiliar):
//   300-001-0001-0003  → Proveedores nacionales / Insumos del Norte Ltda.
//   110-001-0001-0002  → Clientes nacionales / Hotel Las Palmas S.A.
// Salen de dos lugares: el catálogo de cuentas (auxiliares bajo un detalle
// con rol especial 02 Clientes o 04 Proveedores) y la base única de terceros
// (tabla `clientes`, cuyo perfil guarda cuentaCode + auxId). Este módulo las
// junta, las sugiere a partir de la cédula o el nombre del XML, y propone
// una cuenta nueva cuando el tercero todavía no tiene.
//
// Se usa en el cliente y en el servidor (sin dependencias de React).
import { CUENTAS_INIT, flattenAll, type Cuenta } from '@/components/pages/catalogo/catalogoData';

export interface CuentaOpcion { code: string; nombre: string; grupo: string; nivel: string; tipoEspecial?: string | null; identificacion?: string; terceroId?: string }

const TODAS = flattenAll(CUENTAS_INIT);

export function cuentasPosteables(filtro?: (c: Cuenta) => boolean): CuentaOpcion[] {
  return TODAS.filter(c => c.posteable && !c.inactiva && (!filtro || filtro(c)))
    .map(c => ({ code: c.code, nombre: c.nombre, grupo: c.grupo, nivel: c.nivel, tipoEspecial: c.tipoEspecial }));
}
export function nombreCuenta(code: string | null | undefined): string {
  if (!code) return '';
  return TODAS.find(c => c.code === code)?.nombre ?? '';
}

// Cuentas para el DEBE de una compra: inventario, activos, costos y gastos.
export const cuentasCompra = () => cuentasPosteables(c =>
  (c.grupo === '1' && (c.code.startsWith('120') || (c.code.startsWith('130-001') && c.tipoEspecial !== '08') || (c.code.startsWith('200-00') && !c.code.startsWith('200-002'))))
  || c.grupo === '5' || c.grupo === '6');
export const cuentasIngreso = () => cuentasPosteables(c => c.grupo === '4');
export const cuentasCosto = () => cuentasPosteables(c => c.grupo === '5' || c.grupo === '6');
export const cuentasInventario = () => cuentasPosteables(c => c.code.startsWith('120'));

// Detalle (nivel 3) donde cuelgan los auxiliares de cada tipo.
export const DETALLE_PROVEEDORES = { code: '300-001-0001', nombre: 'Proveedores nacionales' };
export const DETALLE_CLIENTES = { code: '110-001-0001', nombre: 'Clientes nacionales' };

// ── Terceros ───────────────────────────────────────────────────────────────
export interface TerceroFila {
  id: string; nombre: string; tipo: string; numero_identificacion: string | null; datos_json?: string | null;
}
interface PerfilMin { cuentaCode?: string; auxId?: string; numeroIdentificacion?: string }

export const soloDigitos = (s: string | null | undefined) => String(s ?? '').replace(/\D/g, '');
export function normalizar(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\b(s\.?\s?a\.?|sociedad anonima|ltda\.?|limitada|srl|s\.?r\.?l\.?|de|del|la|el|los|las|y|cia)\b/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
function similitud(a: string, b: string) {
  const ta = new Set(normalizar(a).split(' ').filter(t => t.length > 2));
  const tb = new Set(normalizar(b).split(' ').filter(t => t.length > 2));
  if (!ta.size || !tb.size) return 0;
  let comunes = 0;
  ta.forEach(t => { if (tb.has(t)) comunes++; });
  return comunes / Math.min(ta.size, tb.size);
}

// Cuentas nivel 4 de proveedores (tipo='proveedor') o de clientes.
export function cuentasTerceros(tipo: 'proveedor' | 'cliente', terceros: TerceroFila[] = []): CuentaOpcion[] {
  const rol = tipo === 'proveedor' ? '04' : '02';
  const delCatalogo: CuentaOpcion[] = TODAS.filter(c => c.nivel === 'auxiliar' && c.tipoEspecial === rol && !c.inactiva)
    .map(c => ({ code: c.code, nombre: c.nombre, grupo: c.grupo, nivel: 'auxiliar', tipoEspecial: rol, identificacion: soloDigitos(c.entornoFiscal?.numeroIdentificacion) }));
  const out = new Map(delCatalogo.map(c => [c.code, c]));
  for (const t of terceros.filter(x => x.tipo === tipo)) {
    let p: PerfilMin = {};
    try { p = t.datos_json ? JSON.parse(t.datos_json) : {}; } catch { /* sin perfil */ }
    if (!p.cuentaCode || !p.auxId) continue;
    const code = `${p.cuentaCode}-${p.auxId}`;
    const previa = out.get(code);
    // Si el catálogo ya tiene ese código con otro nombre, manda el tercero (es el registro vivo).
    out.set(code, { code, nombre: t.nombre, grupo: tipo === 'proveedor' ? '2' : '1', nivel: 'auxiliar', tipoEspecial: rol,
      identificacion: soloDigitos(t.numero_identificacion ?? p.numeroIdentificacion) || previa?.identificacion, terceroId: t.id });
  }
  return [...out.values()].sort((a, b) => a.code.localeCompare(b.code));
}

export function siguienteAuxiliar(detalle: string, existentes: CuentaOpcion[]): string {
  const usados = existentes.filter(c => c.code.startsWith(detalle + '-')).map(c => Number(c.code.slice(detalle.length + 1)) || 0);
  return `${detalle}-${String(Math.max(0, ...usados) + 1).padStart(4, '0')}`;
}

export interface SugerenciaTercero { cuenta: CuentaOpcion | null; motivo: 'cedula' | 'nombre' | 'nueva'; nueva?: CuentaOpcion }
// Cédula exacta > nombre parecido > proponer una cuenta auxiliar nueva.
export function sugerirCuentaTercero(nombre: string, identificacion: string, lista: CuentaOpcion[], tipo: 'proveedor' | 'cliente' = 'proveedor'): SugerenciaTercero {
  const ced = soloDigitos(identificacion);
  if (ced) {
    const c = lista.find(x => x.identificacion && x.identificacion === ced);
    if (c) return { cuenta: c, motivo: 'cedula' };
  }
  let mejor: CuentaOpcion | null = null; let puntaje = 0;
  for (const c of lista) { const s = similitud(nombre, c.nombre); if (s > puntaje) { puntaje = s; mejor = c; } }
  if (mejor && puntaje >= 0.6) return { cuenta: mejor, motivo: 'nombre' };
  const detalle = tipo === 'proveedor' ? DETALLE_PROVEEDORES.code : DETALLE_CLIENTES.code;
  const nueva: CuentaOpcion = { code: siguienteAuxiliar(detalle, lista), nombre: nombre || 'Nuevo tercero', grupo: tipo === 'proveedor' ? '2' : '1', nivel: 'auxiliar', tipoEspecial: tipo === 'proveedor' ? '04' : '02', identificacion: ced };
  return { cuenta: null, motivo: 'nueva', nueva };
}

// ── Cuenta sugerida para una línea de compra ────────────────────────────────
// 1) lo aprendido (mismo proveedor + mismo código/descripción);
// 2) palabras clave típicas de un hotel; 3) la cuenta por defecto.
const REGLAS: [RegExp, string][] = [
  [/electric|luz\b|\bice\b|cnfl|agua potable|acueducto|\baya\b|internet|telefon|cable|kolbi|liberty|claro/i, '800-001-0003'],
  [/llave|tubo|pvc|tornill|pintura|ferreter|cemento|cable electrico|bombillo|reparaci|mantenimiento|repuesto|herramient|brocha|clavo/i, '800-001-0004'],
  [/carne|pollo|pescado|marisco|verdura|fruta|queso|leche|huevo|arroz|frijol|harina|pan\b|cafe|azucar|aceite de cocina|abarrote|cerveza|vino|licor|ron\b|refresco|gaseosa|jugo|bebida|agua embotellada/i, '700-001-0001'],
  [/sabana|toalla|almohada|amenidad|amenities|jabon|shampoo|champu|papel higienico|detergente|cloro|limpieza|desinfect|lavanderia|blancos|colchon/i, '700-001-0002'],
  [/masaje|aceite esencial|spa|crema corporal|exfoliante|aromaterapia/i, '700-001-0003'],
  [/computadora|laptop|impresora|mueble|silla|mesa|aire acondicionado|refrigeradora|televisor|\btv\b|equipo/i, '200-001-0003'],
  [/licencia|software|suscripci|hosting|dominio/i, '200-003-0001'],
  [/seguro|poliza|\bins\b/i, '130-001-0001'],
  [/alquiler|arrendamiento/i, '130-001-0002'],
];
export const CUENTA_GASTO_DEFAULT = '800-001-0005';

export function claveMapeo(proveedorIdentificacion: string, codigo: string, detalle: string) {
  return `${soloDigitos(proveedorIdentificacion) || normalizar(detalle).slice(0, 20)}|${(codigo || normalizar(detalle)).slice(0, 60)}`;
}
export function sugerirCuentaLinea(detalle: string, aprendida?: string | null, porDefecto?: string | null): { cuenta: string; motivo: 'aprendida' | 'palabra' | 'defecto' } {
  if (aprendida) return { cuenta: aprendida, motivo: 'aprendida' };
  const txt = detalle.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [re, cuenta] of REGLAS) if (re.test(txt)) return { cuenta, motivo: 'palabra' };
  return { cuenta: porDefecto || CUENTA_GASTO_DEFAULT, motivo: 'defecto' };
}

// ── Árbol completo (para el buscador de cuentas) ──────────────────────────
export interface CuentaArbol {
  code: string; nombre: string; nivel: string; grupo: string; posteable: boolean; profundidad: number;
  ruta: string[];            // nombres de las cuentas superiores (mayor → detalle)
  mayor: string;             // código de la cuenta mayor a la que pertenece
}
export function arbolCuentas(catalogo: Cuenta[] = CUENTAS_INIT): CuentaArbol[] {
  const out: CuentaArbol[] = [];
  const NIVELES_RUTA = new Set(['mayor', 'submajor', 'detalle']);
  const recorrer = (nodos: Cuenta[], ruta: string[], mayor: string, profundidad: number) => {
    for (const c of nodos) {
      if (c.inactiva) continue;
      const miMayor = c.nivel === 'mayor' ? c.code : mayor;
      out.push({ code: c.code, nombre: c.nombre, nivel: c.nivel, grupo: c.grupo, posteable: Boolean(c.posteable), profundidad, ruta, mayor: miMayor });
      if (c.children?.length) recorrer(c.children, NIVELES_RUTA.has(c.nivel) ? [...ruta, c.nombre] : ruta, miMayor, profundidad + 1);
    }
  };
  recorrer(catalogo, [], '', 0);
  return out;
}
