'use client';
// Preferencia del menú lateral (abierto o cerrado) guardada en la sesión del
// navegador. En el servidor siempre se dibuja abierto.
import { useSyncExternalStore } from 'react';

const EVENTO = 'menu-lateral';
function suscribir(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  return () => window.removeEventListener(EVENTO, avisar);
}
function leer(): boolean {
  try { return sessionStorage.getItem('sidebar') !== 'closed'; } catch { return true; }
}

export function guardarMenuAbierto(valor: boolean) {
  try { sessionStorage.setItem('sidebar', valor ? 'open' : 'closed'); } catch { /* el navegador no permite almacenamiento */ }
  window.dispatchEvent(new Event(EVENTO));
}

export const useMenuAbierto = () => useSyncExternalStore(suscribir, leer, () => true);
