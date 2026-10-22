// País de la empresa con la que se trabaja, para el código que comparten el
// servidor y las pantallas (catálogos, cálculos, textos). En el navegador lo
// fija PaisProvider con la empresa elegida (cambiar de empresa recarga la
// aplicación). En el servidor cada solicitud corre con el país de su empresa
// (lib/paisServidor.ts), así dos solicitudes de países distintos no se mezclan.
import type { PerfilPais } from './perfilPais';

let actual: PerfilPais = 'CR';
let lectorServidor: (() => PerfilPais | undefined) | null = null;

export const fijarPais = (p: PerfilPais) => { actual = p; };
/** Lo registra el servidor: devuelve el país de la solicitud en curso. */
export const registrarLectorServidor = (f: () => PerfilPais | undefined) => { lectorServidor = f; };
export const paisActualSync = (): PerfilPais => lectorServidor?.() ?? actual;
export const esGuatemalaActual = () => paisActualSync() === 'GT';
/** Ante quién se emite: Hacienda en Costa Rica, la SAT en Guatemala (al inicio de una frase, con mayúscula). */
export const autoridad = () => (esGuatemalaActual() ? 'la SAT' : 'Hacienda');
export const Autoridad = () => (esGuatemalaActual() ? 'La SAT' : 'Hacienda');

/**
 * Texto escrito para Costa Rica adaptado al país actual: en Guatemala,
 * Hacienda pasa a ser la SAT y la cédula, el NIT.
 */
export function segunPais(texto: string): string {
  if (!esGuatemalaActual()) return texto;
  return texto
    .replace(/(^|[.:!?]\s+|«)Hacienda\b/g, '$1La SAT')
    .replace(/\bHacienda\b/g, 'la SAT')
    .replace(/\bLa cédula\b/g, 'El NIT').replace(/\bla cédula\b/g, 'el NIT').replace(/\bcédula\b/g, 'NIT')
    .replace(/\ba el NIT\b/g, 'al NIT').replace(/\bde el NIT\b/g, 'del NIT');
}

/** Símbolo de la moneda local: colón en Costa Rica, quetzal en Guatemala. */
export const simboloLocal = () => (esGuatemalaActual() ? 'Q' : '₡');
/** Nombre de la moneda local en plural: colones o quetzales (con mayúscula inicial si se pide). */
export const nombreMonedaLocal = (mayuscula = false) => (esGuatemalaActual() ? (mayuscula ? 'Quetzales' : 'quetzales') : (mayuscula ? 'Colones' : 'colones'));
