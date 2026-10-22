// API Key de cada módulo: lo genera el propio módulo (en su configuración) y en el MAN se pega y se valida.
// Sin backend se simula la respuesta del módulo: acepta un API Key con el formato PREFIJO-XXXX-XXXX-MAN (hexadecimal),
// emitido para ese módulo. Con backend, validarApiKey pasa a ser la llamada al módulo.
import type { ModuloId } from '../tipos';

const prefijo = (m: ModuloId) => m.replace('_', '');
/** Ejemplo del formato del API Key de un módulo. */
export const ejemploApiKey = (m: ModuloId) => `${prefijo(m)}-1F2B-3C4D-MAN`;

/** Mensaje de error si el módulo rechaza el API Key, o null si lo acepta. */
export function validarApiKey(m: ModuloId, apiKey: string): string | null {
  const k = apiKey.trim().toUpperCase();
  if (!/^[A-Z]+-[0-9A-F]{4}-[0-9A-F]{4}-MAN$/.test(k)) return `El API Key no tiene el formato del módulo (${ejemploApiKey(m)}).`;
  if (!k.startsWith(`${prefijo(m)}-`)) return 'Ese API Key es de otro módulo.';
  return null;
}
