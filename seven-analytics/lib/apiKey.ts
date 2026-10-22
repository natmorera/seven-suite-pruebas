// API Key de Seven Analytics (ANA): la llave con la que Management (MAN) se
// conecta. El módulo no tiene servidor: se guarda en el navegador.
import { type LlaveModulo } from "@/components/integracion/SeccionApiKey";

const CLAVE = "ana_api_key";

function nueva(): LlaveModulo {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return { clave: `ana_live_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`, creada: new Date().toISOString() };
}
function guardar(l: LlaveModulo) {
  try { localStorage.setItem(CLAVE, JSON.stringify(l)); } catch { /* sin almacenamiento */ }
  return l;
}

export async function obtenerApiKey(): Promise<LlaveModulo> {
  try { const g = localStorage.getItem(CLAVE); if (g) return JSON.parse(g); } catch { /* se genera abajo */ }
  return guardar(nueva());
}
export async function regenerarApiKey(): Promise<LlaveModulo> { return guardar(nueva()); }
