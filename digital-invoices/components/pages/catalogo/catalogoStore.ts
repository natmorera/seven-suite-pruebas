'use client';
// Catálogo de cuentas compartido por toda la aplicación (Catálogo, buscadores
// de cuentas de Facturación, reportes). Se lee una vez de /api/catalogo y cada
// cambio se guarda en la base. Mientras carga se usa el catálogo inicial.
import { useSyncExternalStore } from 'react';
import { CUENTAS_INIT, type Cuenta } from './catalogoData';

let actual: Cuenta[] = CUENTAS_INIT;
let cargado = false;
let solicitud: Promise<void> | null = null;
let temporizador: ReturnType<typeof setTimeout> | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach(f => f());

// Lo que se guarda no incluye qué ramas están abiertas en pantalla
const sinPantalla = (ns: Cuenta[]): unknown => ns.map(({ expanded, ...c }) => { void expanded; return c; }).map(c => ({ ...c, children: c.children ? sinPantalla(c.children) : undefined }));

function cargar() {
  if (solicitud || typeof window === 'undefined') return;
  solicitud = fetch('/api/catalogo').then(r => r.json()).then((d: Cuenta[]) => {
    if (Array.isArray(d) && d.length) { actual = d; cargado = true; avisar(); }
  }).catch(() => {});
}

export function catalogoActual(): Cuenta[] { return actual; }
// Vuelve a leer el catálogo de la base (p. ej. después de que el asistente inicial lo reemplazó)
export function recargarCatalogo() { solicitud = null; cargar(); }
export function catalogoCargado(): boolean { return cargado; }

export function useCatalogo(): Cuenta[] {
  return useSyncExternalStore(avisarA => { oyentes.add(avisarA); cargar(); return () => { oyentes.delete(avisarA); }; }, () => actual, () => CUENTAS_INIT);
}

// Cambia el catálogo; si cambió algo más que ramas abiertas, se guarda (con una pausa corta)
export function cambiarCatalogo(nuevo: Cuenta[] | ((prev: Cuenta[]) => Cuenta[])) {
  const siguiente = typeof nuevo === 'function' ? nuevo(actual) : nuevo;
  const guardar = JSON.stringify(sinPantalla(siguiente)) !== JSON.stringify(sinPantalla(actual));
  actual = siguiente;
  avisar();
  if (!guardar) return;
  if (temporizador) clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    fetch('/api/catalogo', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(actual) }).catch(() => {});
  }, 400);
}
