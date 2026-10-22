'use client';

// Marco de Configuración: título de la sección y, cuando hay cambios sin guardar, una barra al pie con
// «Descartar» / «Guardar cambios». La barra actúa sobre el store de toda la configuración (store.tsx):
// Guardar fija los cambios y Descartar los deshace (con confirmación). El header queda libre para las
// acciones propias de cada pestaña.
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { CONFIG } from '@/components/layout/nav';
import { Button, Toast } from '@/components/suite/ui';
import { C } from '@/components/suite/tokens';
import { Pantalla } from '@/components/layout/Pantalla';
import { useConfig } from './store';
import { useConfirmar } from './kit';

/** Usuarios y permisos guarda con sus propios botones (como en el resto de la suite). */
const SIN_ACCIONES = ['/configuracion/usuarios-permisos'];

export function ConfiguracionShell({ children }: { children: ReactNode }) {
  return <Encabezado>{children}</Encabezado>;
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
    <Pantalla titulo={titulo} conRanuras
      pie={conAcciones && sucio ? (
        <>
          <span style={{ marginRight: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: C.n900 }}>
            <i style={{ width: 8, height: 8, borderRadius: '50%', background: C.warning }} />Tienes cambios sin guardar
          </span>
          <Button variant="secondary"
            onClick={() => pedir('Descartar cambios', 'Se perderán todos los cambios que no guardaste en Configuración. ¿Continuar?', () => { descartar(); setToast('Cambios descartados'); }, { accion: 'Descartar' })}>
            Descartar
          </Button>
          <Button onClick={() => { guardar(); setToast('Cambios guardados'); }}>Guardar cambios</Button>
        </>
      ) : undefined}>
      {children}
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
      {dialogo}
    </Pantalla>
  );
}
