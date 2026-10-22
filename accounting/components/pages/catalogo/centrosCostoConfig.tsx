'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';

// ── Centros de costo (lista plana compartida) ── Lista que usan las pantallas para asignar o
// filtrar por centro de costo (ficha de cuenta, Presupuesto), con el mismo patrón que
// FirmasProvider. La administración de centros (grupos y centros, con alta, edición y baja)
// está en Catálogo de cuentas › Centros de costo.
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
