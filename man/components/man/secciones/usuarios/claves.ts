// Contraseñas de los usuarios: requisitos de una contraseña nueva y contraseña temporal.
/** Requisitos de toda contraseña de la suite. */
export const REGLAS = { longitudMin: 8, mayuscula: true, numero: true };

/** Primer requisito que no cumple la contraseña, o null si la cumple. */
function validarClave(clave: string, p = REGLAS): string | null {
  if (clave.length < p.longitudMin) return `Debe tener al menos ${p.longitudMin} caracteres.`;
  if (p.mayuscula && !/[A-ZÁÉÍÓÚÑ]/.test(clave)) return 'Debe tener al menos una mayúscula.';
  if (p.numero && !/\d/.test(clave)) return 'Debe tener al menos un número.';
  return null;
}

/** Contraseña temporal que cumple los requisitos. */
export function claveTemporal(p = REGLAS) {
  const letras = 'abcdefghjkmnpqrstuvwxyz';
  let s = 'Sv';
  while (s.length < Math.max(p.longitudMin - 2, 6)) s += letras[Math.floor(Math.random() * letras.length)];
  return s + Math.floor(10 + Math.random() * 89);
}

export interface ClaveNueva { clave: string; confirmar: string }
export const errorClave = (f: ClaveNueva) => validarClave(f.clave) ?? (f.clave !== f.confirmar ? 'Las contraseñas no coinciden.' : null);
