// API Key del módulo Accounting (ACC): la llave con la que Management (MAN)
// se conecta. El prototipo no tiene servidor: se guarda en el navegador. Con
// backend, aquí se pide al servidor (GET) y se regenera (POST).
import { type LlaveModulo } from '@/components/ui/integracion/SeccionApiKey';

export const MODULO_ACC = { codigo: 'ACC', nombre: 'Accounting' };
const CLAVE = 'acc_api_key';

function nueva(): LlaveModulo {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return { clave: `acc_live_${Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')}`, creada: new Date().toISOString() };
}
function guardar(l: LlaveModulo) { try { localStorage.setItem(CLAVE, JSON.stringify(l)); } catch { /* sin almacenamiento */ } return l; }

export async function obtenerApiKey(): Promise<LlaveModulo> {
  try { const g = localStorage.getItem(CLAVE); if (g) return JSON.parse(g); } catch { /* se genera abajo */ }
  return guardar(nueva());
}
export async function regenerarApiKey(): Promise<LlaveModulo> { return guardar(nueva()); }
