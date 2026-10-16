'use client';
// Pide al servidor que corra las tareas automáticas (buzón y recurrentes) y
// avisa el resultado a las pantallas abiertas con el evento «tareas-hechas».
// Si ya hay una petición en curso, se reutiliza.
import { useEffect, useRef } from 'react';
import type { ResultadoTareas } from '@/lib/tareas';

const EVENTO = 'tareas-hechas';
let enCurso: Promise<ResultadoTareas | null> | null = null;

export function pedirTareas(): Promise<ResultadoTareas | null> {
  if (!enCurso) {
    enCurso = fetch('/api/tareas', { method: 'POST' })
      .then(r => (r.ok ? r.json() : null))
      .then((d: ResultadoTareas | null) => {
        if (d) window.dispatchEvent(new CustomEvent<ResultadoTareas>(EVENTO, { detail: d }));
        return d;
      })
      .catch(() => null)
      .finally(() => { enCurso = null; });
  }
  return enCurso;
}

// Escucha los resultados (vengan de esta pantalla, del menú lateral o de otra).
export function useTareasHechas(alTerminar: (r: ResultadoTareas) => void) {
  const ref = useRef(alTerminar);
  useEffect(() => { ref.current = alTerminar; });
  useEffect(() => {
    const oir = (e: Event) => ref.current((e as CustomEvent<ResultadoTareas>).detail);
    window.addEventListener(EVENTO, oir);
    return () => window.removeEventListener(EVENTO, oir);
  }, []);
}
