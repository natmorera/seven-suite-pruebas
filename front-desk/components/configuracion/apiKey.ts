// API Key de Front Desk (FDK): la llave con la que Management (MAN) se conecta a este módulo.
// Mientras el módulo no tenga servidor, la llave se genera en el navegador y se guarda en su almacenamiento local.
import type { LlaveModulo } from '@/components/ui/integracion/SeccionApiKey';

export const MODULO = { codigo: 'FDK', nombre: 'Front Desk' };
const CLAVE = 'fdk.apiKey';

/** «fdk_live_» seguido de 48 caracteres hexadecimales. */
function nueva(): LlaveModulo {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return { clave: `${MODULO.codigo.toLowerCase()}_live_${[...bytes].map(b => b.toString(16).padStart(2, '0')).join('')}`, creada: new Date().toISOString() };
}

function guardar(l: LlaveModulo) {
  try { localStorage.setItem(CLAVE, JSON.stringify(l)); } catch { /* sin almacenamiento: la llave dura lo que la pestaña */ }
  return l;
}

let enMemoria: LlaveModulo | null = null;

export async function obtenerApiKey(): Promise<LlaveModulo> {
  try {
    const s = localStorage.getItem(CLAVE);
    if (s) { const l = JSON.parse(s) as LlaveModulo; if (l?.clave) return (enMemoria = l); }
  } catch { /* se genera abajo */ }
  return (enMemoria ??= guardar(nueva()));
}

export async function regenerarApiKey(): Promise<LlaveModulo> {
  return (enMemoria = guardar(nueva()));
}
