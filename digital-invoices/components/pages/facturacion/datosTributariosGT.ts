// Datos tributarios de una empresa de Guatemala (afiliación, frases y
// certificadores): lectura y guardado desde el navegador.
import type { FraseEmisor, CertificadorEmisor } from '@/lib/perfilPais';

export interface DatosTributariosGT {
  afiliacionIva: string; vigenteDesde: string; regimenIsr: string; agenteRetencionIva: boolean;
  frases: FraseEmisor[]; frasesRtu: FraseEmisor[]; certificadores: CertificadorEmisor[];
}

export async function leerDatosGT(): Promise<DatosTributariosGT> {
  return fetch('/api/gt/tributaria').then(r => r.json());
}
export async function guardarDatosGT(cuerpo: Record<string, unknown>): Promise<{ error?: string; datos?: DatosTributariosGT }> {
  const r = await fetch('/api/gt/tributaria', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  const d = await r.json().catch(() => ({}));
  return r.ok ? { datos: d } : { error: d.error ?? 'No se pudo guardar.' };
}
