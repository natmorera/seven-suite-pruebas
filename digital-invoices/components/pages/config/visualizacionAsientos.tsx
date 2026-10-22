'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

// ── Visualización de asientos: Detallado vs. Consolidado ────────────────────
// Configuración a nivel de empresa (Parámetros generales → Asientos contables).
// Los módulos integrados (Front Desk, Tour Operator, POS, etc.) siempre mandan
// el asiento con el detalle línea por línea - esto NO cambia. Lo que cambia acá
// es solo cómo se VISUALIZA ese asiento en pantalla y en los reportes:
//  - Detallado: cada línea tal cual llegó.
//  - Consolidado: las líneas se agrupan sumando por cuenta + centro de costos.
// El valor de acá es el default para toda la empresa; cada pantalla de reporte
// puede tener su propio botón para cambiar la vista en el momento, pero arranca
// siempre con este default.
export type VisualizacionAsiento = 'detallado' | 'consolidado';

interface VisualizacionAsientosCtx {
  default_: VisualizacionAsiento;
  setDefault: (v: VisualizacionAsiento) => void;
}

const Ctx = createContext<VisualizacionAsientosCtx>({ default_: 'detallado', setDefault: () => {} });

export function VisualizacionAsientosProvider({ children }: { children: ReactNode }) {
  const [default_, setDefault] = useState<VisualizacionAsiento>('detallado');
  return <Ctx.Provider value={{ default_, setDefault }}>{children}</Ctx.Provider>;
}

// Hook para pantallas de reporte: devuelve el default de empresa y permite que
// esa pantalla mantenga su propia vista actual, inicializada en ese default.
export function useVisualizacionAsientosDefault() {
  return useContext(Ctx);
}
