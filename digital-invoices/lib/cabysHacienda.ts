// Consulta al catálogo CABYS oficial de Hacienda (api.hacienda.go.cr/fe/cabys),
// con caché en memoria de 1 h. Lo usan la búsqueda en vivo y el alta de ítems.
import { Autoridad } from '@/lib/paisActual';
export interface CabysOficial { codigo: string; descripcion: string; impuesto: number }
const cache = new Map<string, { t: number; lista: CabysOficial[] }>();

export async function consultarCabysHacienda(p: { q?: string; codigo?: string }): Promise<CabysOficial[]> {
  const codigo = (p.codigo ?? '').replace(/\D/g, '');
  const q = (p.q ?? '').trim();
  if (!codigo && q.length < 3) return [];
  const clave = codigo ? `c:${codigo}` : `q:${q.toLowerCase()}`;
  const hit = cache.get(clave);
  if (hit && Date.now() - hit.t < 3_600_000) return hit.lista;
  const url = codigo ? `https://api.hacienda.go.cr/fe/cabys?codigo=${codigo}` : `https://api.hacienda.go.cr/fe/cabys?q=${encodeURIComponent(q)}&top=25`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error(`${Autoridad()} respondió ${r.status}`);
    const d = await r.json();
    const bruto = (Array.isArray(d) ? d : d.cabys ?? []) as { codigo: string; descripcion: string; impuesto: number }[];
    const lista = bruto.map(x => ({ codigo: String(x.codigo), descripcion: String(x.descripcion), impuesto: Number(x.impuesto ?? 13) }));
    cache.set(clave, { t: Date.now(), lista });
    return lista;
  } finally { clearTimeout(t); }
}
