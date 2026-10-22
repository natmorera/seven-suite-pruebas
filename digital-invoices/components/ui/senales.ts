'use client';
// Utilidades de estado compartidas por pantallas de configuración.
import { useEffect, useState, useSyncExternalStore } from 'react';

// Señal de «agregar» que llega del encabezado de la página (un número que cambia
// en cada clic): ejecuta la acción una vez por cada valor nuevo y avisa al padre.
export function useSenalAgregar(senal: number | undefined, accion: () => void, alAtender?: () => void) {
  // undefined al montar: una señal que ya viene puesta también se atiende
  const [atendida, setAtendida] = useState<number | undefined>(undefined);
  if (senal !== atendida) {
    setAtendida(senal);
    if (senal) accion();
  }
  useEffect(() => {
    if (senal) alAtender?.();
    // Solo cuando cambia la señal: el padre suele pasar una función nueva en cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [senal]);
}

// Valor de un parámetro de la dirección (?tab=…) leído en el navegador; null en el servidor.
const sinSuscripcion = () => () => {};
export function useParametroUrl(nombre: string): string | null {
  return useSyncExternalStore(sinSuscripcion, () => {
    try { return new URLSearchParams(window.location.search).get(nombre); } catch { return null; }
  }, () => null);
}

// Valor anterior de algo, para reaccionar a su cambio durante el render (sin efecto)
export function useCambio<T>(valor: T, alCambiar: (anterior: T) => void) {
  const [anterior, setAnterior] = useState(valor);
  if (!Object.is(anterior, valor)) {
    setAnterior(valor);
    alCambiar(anterior);
  }
}
