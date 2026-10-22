'use client';
// Estado de todo el MAN. Vive en el shell, así
// que sobrevive al cambiar de pantalla. «Guardar cambios» fija una copia y
// «Cancelar» vuelve a ella. Para conectar el backend basta con cargar INICIAL
// desde la API y persistir en `guardar()`.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { INICIAL, type Datos } from './inicial';

type Setter<T> = (v: T | ((prev: T) => T)) => void;

interface Ctx {
  datos: Datos;
  set: <K extends keyof Datos>(k: K, v: Datos[K] | ((prev: Datos[K]) => Datos[K])) => void;
  sucio: boolean;
  guardar: () => void;
  descartar: () => void;
  /** Resultado de una operación (probar, sincronizar, ejecutar): se aplica a los datos y a la copia guardada, así no cuenta como cambio. */
  operar: <K extends keyof Datos>(k: K, f: (prev: Datos[K]) => Datos[K]) => void;
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

  const operar = useCallback<Ctx['operar']>((k, f) => {
    setDatos(prev => ({ ...prev, [k]: f(prev[k]) }));
    setGuardado(prev => ({ ...prev, [k]: f(prev[k]) }));
  }, []);

  const valor = useMemo<Ctx>(() => ({
    datos, set, operar,
    // cambios reales: si el usuario vuelve al valor original, deja de estar «sucio»
    sucio: datos !== guardado && JSON.stringify(datos) !== JSON.stringify(guardado),
    guardar: () => setGuardado(datos),
    descartar: () => setDatos(guardado),
  }), [datos, guardado, set, operar]);

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

/** Aplica el resultado de una operación sin marcar cambios pendientes: const operar = useOperacion('enlaces') */
export function useOperacion<K extends keyof Datos>(k: K) {
  const { operar } = useConfig();
  return useCallback((f: (prev: Datos[K]) => Datos[K]) => operar(k, f), [k, operar]);
}
