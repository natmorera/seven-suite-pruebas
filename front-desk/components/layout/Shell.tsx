'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import SuiteShell from '@/components/suite/SuiteShell';
import { EMPRESAS } from '@/components/suite/modulos';
import { NAV, CONFIG } from './nav';
import { HotelProvider } from '@/components/hotel/store';

/** Empresa (hotel) elegida en el selector del menú lateral. */
const EmpresaCtx = createContext<string>(EMPRESAS[0] ?? '');
export const useEmpresa = () => useContext(EmpresaCtx);

export default function Shell({ children }: { children: ReactNode }) {
  const [empresa, setEmpresa] = useState(EMPRESAS[0] ?? '');
  return (
    <SuiteShell modulo="FDK" producto="Seven Front Desk" nav={NAV} config={CONFIG} fechaHotelera="06/10/2026" empresa={empresa} onEmpresaChange={setEmpresa}>
      <EmpresaCtx.Provider value={empresa}>
        <HotelProvider>{children}</HotelProvider>
      </EmpresaCtx.Provider>
    </SuiteShell>
  );
}
