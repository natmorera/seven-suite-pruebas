'use client';
// Versión del sitio en el navegador (ver lib/modulos.ts)
import { useSyncExternalStore } from 'react';
import { MODOS, MODO_FIJO, type Modulos, type ModoSitio } from '@/lib/modulos';

let actual: Modulos = MODO_FIJO ? MODOS[MODO_FIJO] : MODOS.completo;
let pedido = false;
let cambiadoAqui = false;   // un cambio local manda sobre la lectura que llegue tarde
const oyentes = new Set<() => void>();
function cargar() {
  if (pedido || typeof window === 'undefined' || MODO_FIJO) return;
  pedido = true;
  fetch('/api/empresa/modulos').then(r => r.json()).then(d => {
    if (!cambiadoAqui && d && typeof d.contabilidad === 'boolean') { actual = { ...MODOS.completo, ...d }; oyentes.forEach(f => f()); }
  }).catch(() => {});
}
export function useModulos(): Modulos {
  return useSyncExternalStore(f => { oyentes.add(f); cargar(); return () => { oyentes.delete(f); }; }, () => actual, () => actual);
}
export function modoDe(m: Modulos): ModoSitio {
  return !m.contabilidad ? 'dicr' : !m.facturacion ? 'acc' : 'completo';
}
export async function cambiarModulos(m: Partial<Modulos>) {
  if (MODO_FIJO) return;
  const nuevo = { ...actual, ...m };
  cambiadoAqui = true; pedido = true;
  actual = nuevo; oyentes.forEach(f => f());
  await fetch('/api/empresa/modulos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevo) }).catch(() => {});
}
export const cambiarModo = (modo: ModoSitio) => cambiarModulos(MODOS[modo]);
export { MODO_FIJO };
// Para validaciones fuera de render: ¿se piden cuentas contables?
export function conContabilidad(): boolean { cargar(); return actual.contabilidad; }
