'use client';

// Encabezado de Configuración: título de la sección + «Cancelar» / «Guardar cambios».
// Los botones actúan sobre el store de toda la configuración (store.tsx):
// Guardar fija los cambios y Cancelar los descarta (con confirmación). Como en Accounting,
// los botones solo aparecen cuando se detectan cambios.
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { CONFIG } from '@/components/layout/nav';
import { Button, StatusBadge, Toast } from '@/components/suite/ui';
import { Pantalla } from '@/components/layout/Pantalla';
import { ConfigProvider, useConfig } from './store';
import { PermisosProvider } from './permisos/store';
import { useConfirmar } from './kit';

/** Usuarios y permisos guarda con sus propios botones (como en el resto de la suite). */
const SIN_ACCIONES = ['/configuracion/usuarios-permisos'];

export function ConfiguracionShell({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider>
      <PermisosProvider>
        <Encabezado>{children}</Encabezado>
      </PermisosProvider>
    </ConfigProvider>
  );
}

function Encabezado({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { sucio, guardar, descartar } = useConfig();
  const [toast, setToast] = useState<string | null>(null);
  const { pedir, dialogo } = useConfirmar();
  const items = CONFIG.grupos.flatMap((g) => g.items);
  const titulo = items.filter((i) => pathname === i.href || pathname.startsWith(i.href + '/')).sort((a, b) => b.href.length - a.href.length)[0]?.label ?? 'Configuración';
  const conAcciones = !SIN_ACCIONES.some((r) => pathname.startsWith(r));

  return (
    <Pantalla titulo={titulo} izquierda={sucio ? <StatusBadge label="Cambios sin guardar" color="yellow" /> : undefined} conRanuras
      acciones={conAcciones && sucio && (
          <>
            <Button variant="secondary"
              onClick={() => pedir('Descartar cambios', 'Se perderán todos los cambios que no guardaste en Configuración. ¿Continuar?', () => { descartar(); setToast('Cambios descartados'); }, { accion: 'Descartar' })}>
              Cancelar
            </Button>
            <Button onClick={() => { guardar(); setToast('Cambios guardados'); }}>Guardar cambios</Button>
          </>
        )}>
      {children}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      {dialogo}
    </Pantalla>
  );
}
