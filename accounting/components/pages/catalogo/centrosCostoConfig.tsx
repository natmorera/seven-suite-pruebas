'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

// ── Centros de costo (lista plana compartida) ────────────────────────────────
// Issue: esta lista vivía duplicada como constante local en AccountDetail.tsx
// (para asignar centro de costo a una cuenta) sin ningún contexto compartido,
// así que cualquier otra pantalla que necesitara "los centros de costo reales"
// (como Presupuesto) no tenía de dónde leerlos y terminaba con su propia copia
// mock, que podía desincronizarse. Se centraliza acá, siguiendo el mismo
// patrón que FirmasProvider.
//
// Nota: Catálogo de cuentas > Centros de costo (CatalogoTabs.tsx) maneja una
// jerarquía más rica (Grupo → Centro, con alta/edición/baja) para ADMINISTRAR
// esos centros. Esta lista plana es la que se usa para ASIGNAR/FILTRAR por
// centro de costo en otras pantallas (AccountDetail, Presupuesto). Unificar
// también con esa jerarquía de administración es un cambio más grande que
// queda fuera de este alcance.
export interface CentroCosto { id: string; codigo: string; descripcion: string; }

export const CENTROS_COSTO_INIT: CentroCosto[] = [
  { id:'cc1', codigo:'ADM', descripcion:'Administración' },
  { id:'cc2', codigo:'RST', descripcion:'Restaurante' },
  { id:'cc3', codigo:'SPA', descripcion:'Spa' },
  { id:'cc4', codigo:'MNT', descripcion:'Mantenimiento' },
  { id:'cc5', codigo:'MRN', descripcion:'Marina' },
  { id:'cc6', codigo:'LVN', descripcion:'Lavandería' },
];

interface CentrosCostoCtx {
  centrosCosto: CentroCosto[];
  setCentrosCosto: (c: CentroCosto[] | ((prev: CentroCosto[]) => CentroCosto[])) => void;
}

const Ctx = createContext<CentrosCostoCtx>({ centrosCosto: [], setCentrosCosto: () => {} });

export function CentrosCostoProvider({ children }: { children: ReactNode }) {
  const [centrosCosto, setCentrosCosto] = useState<CentroCosto[]>(CENTROS_COSTO_INIT);
  return <Ctx.Provider value={{ centrosCosto, setCentrosCosto }}>{children}</Ctx.Provider>;
}

export function useCentrosCostoConfig() {
  return useContext(Ctx);
}
