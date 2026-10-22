'use client';
// Shell del MAN: menú de la suite (y su versión para pantallas angostas), empresa elegida y encabezado con
// «Cancelar / Guardar cambios» (los botones aparecen solo cuando hay cambios, como en Accounting y Front Desk).
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import SuiteShell from '@/components/suite/SuiteShell';
import { EMPRESAS } from '@/components/suite/modulos';
import { Button, Toast } from '@/components/suite/ui';
import { MenuMovil } from './MenuMovil';
import { PanelNotificaciones } from './Notificaciones';
import { Pantalla } from './Pantalla';
import { NAV, tituloDe } from './nav';
import { ProveedorEscritorio, SoloEscritorio, esRutaEscritorio, useCelular } from './SoloEscritorio';
import { ConfigProvider, useConfig } from '@/components/man/store';
import { useConfirmar } from '@/components/kit';

/** Una pantalla puede guardar con su propio pie (p. ej. «Verificar y guardar» en la integración de un módulo):
 *  mientras está abierta, el header no muestra «Cancelar / Guardar cambios». */
const GuardadoPropio = createContext<(propio: boolean) => void>(() => {});
export function useGuardadoPropio() {
  const marcar = useContext(GuardadoPropio);
  useEffect(() => { marcar(true); return () => marcar(false); }, [marcar]);
}

const EmpresaCtx = createContext<{ empresa: string; elegir: (e: string) => void }>({ empresa: EMPRESAS[0] ?? '', elegir: () => {} });
/** Empresa elegida en el menú. */
export const useEmpresa = () => useContext(EmpresaCtx).empresa;
/** Cambia la empresa elegida (la misma del menú). */
export const useElegirEmpresa = () => useContext(EmpresaCtx).elegir;

export default function Shell({ children }: { children: ReactNode }) {
  const [empresa, setEmpresa] = useState(EMPRESAS[0] ?? '');
  const [avisos, setAvisos] = useState(false);
  // El botón «Notificaciones» del menú de la suite no recibe una acción: se detecta su clic para abrir el panel.
  useEffect(() => {
    const f = (e: MouseEvent) => {
      const b = (e.target as Element | null)?.closest?.('aside button');
      if (b && (b.textContent?.trim() === 'Notificaciones' || b.getAttribute('title') === 'Notificaciones')) setAvisos(true);
    };
    document.addEventListener('click', f);
    return () => document.removeEventListener('click', f);
  }, []);
  const elegir = (e: string) => {
    setEmpresa(e);
    try { localStorage.setItem('empresa', e); } catch { /* sin almacenamiento */ }
  };
  return (
    <SuiteShell modulo="MGT" producto="Seven Management" nav={NAV} empresa={empresa} onEmpresaChange={setEmpresa} ocultarEnMovil>
      <EmpresaCtx.Provider value={{ empresa, elegir }}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <MenuMovil empresa={empresa} onEmpresa={elegir} onNotificaciones={() => setAvisos(true)} />
          <div style={{ flex: 1, minHeight: 0 }}>
            <ConfigProvider>
              <ProveedorEscritorio><Encabezado>{children}</Encabezado></ProveedorEscritorio>
              {avisos && <PanelNotificaciones onClose={() => setAvisos(false)} />}
            </ConfigProvider>
          </div>
        </div>
      </EmpresaCtx.Provider>
    </SuiteShell>
  );
}

function Encabezado({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { sucio, guardar, descartar } = useConfig();
  const [propio, setPropio] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { pedir, dialogo } = useConfirmar();
  const titulo = tituloDe(pathname);
  const bloqueada = useCelular() && esRutaEscritorio(pathname);
  return (
    <Pantalla titulo={titulo}
      acciones={!bloqueada && !propio && sucio && (
        <>
          <Button variant="secondary" onClick={() => pedir('Descartar cambios', 'Se perderán todos los cambios que no guardaste. ¿Continuar?', () => { descartar(); setToast('Cambios descartados'); }, { accion: 'Descartar' })}>
            Cancelar
          </Button>
          <Button onClick={() => { guardar(); setToast('Cambios guardados'); }}>Guardar cambios</Button>
        </>
      )}>
      {bloqueada ? <SoloEscritorio /> : <GuardadoPropio.Provider value={setPropio}>{children}</GuardadoPropio.Provider>}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      {dialogo}
    </Pantalla>
  );
}
