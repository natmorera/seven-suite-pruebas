'use client';
// La acción principal de algunas pantallas («+ Nuevo…») está en el encabezado
// de la página y la atiende la pestaña activa: el encabezado incrementa la
// señal y la pestaña ejecuta su acción cada vez que cambia.
import { useEffect, useRef } from 'react';

export function useSenalAgregar(senal: number | boolean | undefined, alAtender: (() => void) | undefined, accion: () => void) {
  const actual = useRef({ accion, alAtender });
  useEffect(() => { actual.current = { accion, alAtender }; });
  useEffect(() => {
    if (!senal) return;
    actual.current.accion();
    actual.current.alAtender?.();
  }, [senal]);
}
