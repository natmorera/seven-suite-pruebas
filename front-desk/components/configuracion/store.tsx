'use client';
// Estado de toda la Configuración. Vive en el layout de /configuracion, así
// que sobrevive al cambiar de sección. «Guardar cambios» fija una copia y
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

  const valor = useMemo<Ctx>(() => ({
    datos, set,
    // cambios reales: si el usuario vuelve al valor original, deja de estar «sucio»
    sucio: datos !== guardado && JSON.stringify(datos) !== JSON.stringify(guardado),
    guardar: () => setGuardado(datos),
    descartar: () => setDatos(guardado),
  }), [datos, guardado, set]);

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
