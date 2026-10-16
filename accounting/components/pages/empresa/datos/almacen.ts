'use client';
// Almacén en memoria compartido entre pantallas. Los datos viven mientras la
// pestaña del navegador esté abierta; al recargar vuelven a los de ejemplo.
import { useSyncExternalStore } from 'react';

export interface Almacen<T> {
  inicial: T;
  leer: () => T;
  guardar: (valor: T | ((anterior: T) => T)) => void;
  suscribir: (avisar: () => void) => () => void;
}

export function crearAlmacen<T>(inicial: T): Almacen<T> {
  let valor = inicial;
  const oyentes = new Set<() => void>();
  const suscribir = (avisar: () => void) => { oyentes.add(avisar); return () => { oyentes.delete(avisar); }; };
  const leer = () => valor;
  const guardar = (nuevo: T | ((anterior: T) => T)) => {
    valor = typeof nuevo === 'function' ? (nuevo as (anterior: T) => T)(valor) : nuevo;
    oyentes.forEach(avisar => avisar());
  };
  return { inicial, leer, guardar, suscribir };
}

// Valor actual del almacén; el componente se vuelve a dibujar cuando cambia.
// En el servidor se dibujan siempre los datos iniciales.
export function useAlmacen<T>(almacen: Almacen<T>): T {
  return useSyncExternalStore(almacen.suscribir, almacen.leer, () => almacen.inicial);
}
