'use client';
// Estado de toda la Configuración. Vive en el shell de la aplicación, así
// que sobrevive al cambiar de sección y lo leen otras pantallas (Mi cuenta). «Guardar cambios» fija una copia y
// «Cancelar» vuelve a ella. Para conectar el backend basta con cargar INICIAL
// desde la API y persistir en `guardar()`.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { INICIAL, type Datos } from './inicial';

type Setter<T> = (v: T | ((prev: T) => T)) => void;

interface Ctx {
  datos: Datos;
  set: <K extends keyof Datos>(k: K, v: Datos[K] | ((prev: Datos[K]) => Datos[K])) => void;
  sucio: boolean;
  /** Aplica un cambio y lo da por guardado al instante, sin tocar los demás cambios pendientes. */
  fijar: <K extends keyof Datos>(k: K, f: (prev: Datos[K]) => Datos[K]) => void;
  guardar: () => void;
  descartar: () => void;
}

const ConfigCtx = createContext<Ctx | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [datos, setDatos] = useState<Datos>(INICIAL);
  const [guardado, setGuardado] = useState<Datos>(INICIAL);

  const set = useCallback<Ctx['set']>((k, v) => {
    setDatos(prev => {
      const nuevo = typeof v === 'function' ? (v as (p: Datos[typeof k]) => Datos[typeof k])(prev[k]) : v;
      return nuevo === prev[k] ? prev : { ...prev, [k]: nuevo };
    });
  }, []);

  const fijar = useCallback<Ctx['fijar']>((k, f) => {
    setDatos(prev => ({ ...prev, [k]: f(prev[k]) }));
    setGuardado(prev => ({ ...prev, [k]: f(prev[k]) }));
  }, []);

  const valor = useMemo<Ctx>(() => ({
    datos, set, fijar,
    // cambios reales: si el usuario vuelve al valor original, deja de estar «sucio»
    sucio: datos !== guardado && JSON.stringify(datos) !== JSON.stringify(guardado),
    guardar: () => setGuardado(datos),
    descartar: () => setDatos(guardado),
  }), [datos, guardado, set, fijar]);

  return <ConfigCtx.Provider value={valor}>{children}</ConfigCtx.Provider>;
}

export function useConfig() {
  const c = useContext(ConfigCtx);
  if (!c) throw new Error('useConfig debe usarse dentro de <ConfigProvider>');
  return c;
}

/** Lee y escribe una colección/sección del store: const [habs, setHabs] = useDato('habitaciones') */
export function useDato<K extends keyof Datos>(k: K): [Datos[K], Setter<Datos[K]>] {
  const { datos, set } = useConfig();
  const setter = useCallback<Setter<Datos[K]>>(v => set(k, v), [k, set]);
  return [datos[k], setter];
}

/** Atajo para editar un campo de un objeto de ajustes: patch({ checkin: '14:00' }) */
export function usePatch<K extends keyof Datos>(k: K) {
  const [v, setV] = useDato(k);
  const patch = useCallback((p: Partial<Datos[K]>) => setV(prev => ({ ...prev, ...p })), [setV]);
  return [v, patch, setV] as const;
}
