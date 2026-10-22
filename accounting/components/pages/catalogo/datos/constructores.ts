import { type Cuenta, type Naturaleza } from '../catalogoData';

// ─── NIIF groups (raíces fijas, no editables) ───────────────────────────────
export const G = (id: string, nombre: string, grupo: string, nat: Naturaleza, children: Cuenta[]): Cuenta => ({
  id, code: grupo, nombre,
  nivel: 'grupo', grupo, naturaleza: nat,
  posteable: false, centroCostoObligatorio: false, saldo: 0,
  tipoEspecial: null, descripcion: `Grupo NIIF ${grupo} - ${nombre}`,
  expanded: false, children,
});
// Sub grupo NIIF (fijo, no configurable por el usuario). siempre
// expandido por defecto - es un nivel de clasificación fija, no algo que el
// usuario gestione, así que no debería exigir un clic de más para verlo.
export const SG = (id: string, code: string, nombre: string, grupo: string, nat: Naturaleza, children: Cuenta[]): Cuenta => ({
  id, code, nombre,
  nivel: 'subgrupo', grupo, naturaleza: nat,
  posteable: false, centroCostoObligatorio: false, saldo: 0,
  tipoEspecial: null, expanded: true, children,
});
// Sub sub grupo NIIF (fijo, no configurable por el usuario). idem - siempre expandido.
export const SSG = (id: string, code: string, nombre: string, grupo: string, nat: Naturaleza, children: Cuenta[]): Cuenta => ({
  id, code, nombre,
  nivel: 'subsubgrupo', grupo, naturaleza: nat,
  posteable: false, centroCostoObligatorio: false, saldo: 0,
  tipoEspecial: null, expanded: true, children,
});
export const M = (id: string, code: string, nombre: string, grupo: string, nat: Naturaleza, children: Cuenta[], extra?: Partial<Cuenta>): Cuenta => ({
  id, code, nombre,
  nivel: 'mayor', grupo, naturaleza: nat,
  posteable: false, centroCostoObligatorio: false, saldo: 0,
  tipoEspecial: null, expanded: true, children,
  ...extra,
});
export const S = (id: string, code: string, nombre: string, grupo: string, nat: Naturaleza, children: Cuenta[], extra?: Partial<Cuenta>): Cuenta => ({
  id, code, nombre,
  nivel: 'submajor', grupo, naturaleza: nat,
  posteable: false, centroCostoObligatorio: false, saldo: 0,
  tipoEspecial: null, expanded: true, children,
  ...extra,
});
// fecha del último asiento contabilizado, usada en el saldo de la
// cuenta. Se deriva de forma estable a partir del código (no aleatoria en cada
// render), dentro de los últimos ~45 días antes del "hoy" de referencia del
// mock (02/06/2026). Cuando el sistema tenga movimientos reales, esta fecha
// debe venir del último asiento contabilizado que afectó la cuenta.
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
export const D = (id: string, code: string, nombre: string, grupo: string, nat: Naturaleza, extra?: Partial<Cuenta>): Cuenta => {
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
export const A = (id: string, code: string, nombre: string, grupo: string, nat: Naturaleza, extra?: Partial<Cuenta>): Cuenta => {
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
