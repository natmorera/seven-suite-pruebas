'use client';
// Pestañas de una pantalla guardadas en la dirección (?tab=…), así se puede enlazar o recargar una pestaña.
// La primera pestaña es la de la dirección sin parámetro.
import { Fragment, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TabsEnBarra } from './Pantalla';

export function PestanasUrl<T extends string>({ tabs }: { tabs: { id: T; label: string; contenido: () => ReactNode }[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const actual = tabs.find(t => t.id === params.get('tab')) ?? tabs[0];
  // Conserva los demás parámetros de la dirección (p. ej. el usuario abierto).
  const cambiar = (id: T) => {
    const q = new URLSearchParams(params.toString());
    if (id === tabs[0].id) q.delete('tab'); else q.set('tab', id);
    const s = q.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };
  return (
    <>
      <TabsEnBarra activo={actual.id} onChange={cambiar} items={tabs.map(t => ({ id: t.id, label: t.label }))} />
      <Fragment key={actual.id}>{actual.contenido()}</Fragment>
    </>
  );
}
