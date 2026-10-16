'use client';
// Buscador de CABYS: primero el catálogo local (instantáneo) y, en cuanto
// hay 3 letras o 13 dígitos, completa con el catálogo oficial de Hacienda.
import { useEffect, useState } from 'react';
import { buscarCabys, type CodigoCabys } from '@/data/cabysData';

interface Remoto { clave: string; lista: CodigoCabys[]; aviso: string | null; listo: boolean }

export function useCabys(q: string, max = 10): { lista: CodigoCabys[]; buscando: boolean; aviso: string | null } {
  const texto = q.trim();
  const digitos = (texto.match(/^[\d\s.-]+/)?.[0] ?? '').replace(/\D/g, '');
  const porCodigo = digitos.length >= 13;
  const consulta = porCodigo ? `codigo=${digitos.slice(0, 13)}` : texto.length >= 3 && !/^\d+$/.test(texto) ? `q=${encodeURIComponent(texto)}` : '';
  // El resultado remoto se guarda junto con la consulta que lo produjo: si la
  // consulta cambió, simplemente no se usa (sin limpiar estado en el efecto).
  const [remoto, setRemoto] = useState<Remoto>({ clave: '', lista: [], aviso: null, listo: true });
  useEffect(() => {
    if (!consulta && texto.length < 2) return;
    let vivo = true;
    const t = setTimeout(() => {
      // Catálogo de la base (actualizado por el script) + catálogo en vivo de Hacienda
      const base = fetch(`/api/catalogos/cabys?q=${encodeURIComponent(texto)}`).then(r => r.json()).catch(() => []) as Promise<CodigoCabys[]>;
      const vivoHacienda = consulta
        ? fetch(`/api/hacienda/cabys?${consulta}`).then(r => r.json()).catch(() => ({ resultados: [], error: 'Sin conexión con Hacienda.' }))
        : Promise.resolve({ resultados: [] as CodigoCabys[] });
      Promise.all([base, vivoHacienda]).then(([b, d]) => {
        if (vivo) setRemoto({ clave: consulta || texto, lista: [...(Array.isArray(b) ? b : []), ...(d.resultados ?? [])], aviso: d.error ?? null, listo: true });
      });
    }, 300);
    return () => { vivo = false; clearTimeout(t); };
  }, [consulta, texto]);
  const vigente = remoto.clave === (consulta || texto) ? remoto : null;
  const local = buscarCabys(texto);
  const vistos = new Set<string>();
  const lista = [...local, ...(vigente?.lista ?? [])].filter(c => !vistos.has(c.codigo) && vistos.add(c.codigo)).slice(0, max);
  return { lista, buscando: (Boolean(consulta) || texto.length >= 2) && !vigente, aviso: vigente?.aviso ?? null };
}
