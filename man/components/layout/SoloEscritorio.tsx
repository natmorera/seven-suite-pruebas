'use client';
// Lo que solo se hace en computadora o tablet. La integración de módulos no se muestra en el celular (se pide otro
// dispositivo); en las demás pantallas se puede consultar, pero crear un registro nuevo también pide otro dispositivo.
import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { C, FONT, radius } from '@/components/suite/tokens';
import { Button } from '@/components/suite/ui';
import { ModalBase } from '@/components/kit/modales';

/** Rutas que solo se trabajan en pantallas de 720 px o más. */
const RUTAS_ESCRITORIO = ['/modulos'];
export const esRutaEscritorio = (ruta: string) => RUTAS_ESCRITORIO.includes(ruta);

const CONSULTA = '(max-width: 719px)';
const suscribir = (cb: () => void) => {
  const m = window.matchMedia(CONSULTA);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};
/** true en pantallas de celular. En el servidor se asume una pantalla grande. */
export const useCelular = () => useSyncExternalStore(suscribir, () => window.matchMedia(CONSULTA).matches, () => false);

const IcDispositivos = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="2" y="4" width="15" height="11" rx="1.5" /><path d="M6 19h7M9.5 15v4" /><rect x="17" y="9" width="5" height="10" rx="1" /><path d="M19.5 17h0" />
  </svg>
);

export function SoloEscritorio() {
  return (
    <div role="status" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 8px', fontFamily: FONT }}>
      <div style={{ maxWidth: 320, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 72, height: 72, borderRadius: '50%', background: C.brandBg, color: C.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IcDispositivos />
        </span>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.n900 }}>Continúa en una computadora o tablet</h2>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: C.n700 }}>
          Esta configuración afecta a todos los módulos y necesita una pantalla más grande para trabajarla con seguridad.
        </p>
        <Link href="/empresa" style={{ marginTop: 4, padding: '8px 16px', borderRadius: radius.md, border: `1px solid ${C.n500}`, color: C.n900, fontSize: 13, textDecoration: 'none' }}>
          Ir a Empresa
        </Link>
      </div>
    </div>
  );
}

const Proteger = createContext<<A extends unknown[]>(fn: (...a: A) => void) => (...a: A) => void>(fn => fn);
/** Envuelve la acción de crear algo nuevo: en el celular muestra el aviso de usar otro dispositivo en lugar de hacerla. */
export const useCrearEnEscritorio = () => useContext(Proteger);

export function ProveedorEscritorio({ children }: { children: ReactNode }) {
  const celular = useCelular();
  const [aviso, setAviso] = useState(false);
  const proteger = <A extends unknown[]>(fn: (...a: A) => void) => (...a: A) => (celular ? setAviso(true) : fn(...a));
  return (
    <Proteger.Provider value={proteger}>
      {children}
      {aviso && (
        <ModalBase titulo="Continúa en una computadora o tablet" onClose={() => setAviso(false)} ancho={360}
          pie={<Button onClick={() => setAviso(false)}>Entendido</Button>}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: C.n700, fontFamily: FONT }}>Crear registros nuevos se hace en una pantalla más grande. Aquí puedes consultar la información.</p>
        </ModalBase>
      )}
    </Proteger.Provider>
  );
}
