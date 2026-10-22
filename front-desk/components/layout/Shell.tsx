'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import SuiteShell from '@/components/suite/SuiteShell';
import { EMPRESAS } from '@/components/suite/modulos';
import { NAV, CONFIG } from './nav';
import { HotelProvider } from '@/components/hotel/store';
import { ConfigProvider, useConfig } from '@/components/configuracion/store';
import { PermisosProvider } from '@/components/configuracion/permisos/store';

/** Empresa (hotel) elegida en el selector del menú lateral. */
const EmpresaCtx = createContext<string>(EMPRESAS[0] ?? '');
export const useEmpresa = () => useContext(EmpresaCtx);

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider>
      <ShellConFecha>{children}</ShellConFecha>
    </ConfigProvider>
  );
}

/** El pie muestra la fecha de operación configurada en Empresa. */
function ShellConFecha({ children }: { children: ReactNode }) {
  const [empresa, setEmpresa] = useState(EMPRESAS[0] ?? '');
  const fecha = useConfig().datos.general.fechaOperacion.fecha.split('-').reverse().join('/');
  return (
    <SuiteShell modulo="FDK" producto="Seven Front Desk" nav={NAV} config={CONFIG} fechaHotelera={fecha} empresa={empresa} onEmpresaChange={setEmpresa}>
      <EmpresaCtx.Provider value={empresa}>
        <HotelProvider>
          <PermisosProvider>{children}</PermisosProvider>
        </HotelProvider>
      </EmpresaCtx.Provider>
    </SuiteShell>
  );
}
