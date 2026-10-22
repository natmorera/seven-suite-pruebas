'use client';
// País de la empresa en las pantallas. Lo fija el diseño de la aplicación con
// la empresa elegida (cookie), así el servidor y el navegador dibujan lo mismo.
// Al cambiar de empresa se recarga la aplicación con la del otro país.
import { createContext, useContext, type ReactNode } from 'react';
import { textosDe, type PerfilPais, type TextosPais } from '@/lib/perfilPais';
import { fijarPais } from '@/lib/paisActual';
import { COOKIE_EMPRESA } from '@/lib/empresas';

const Contexto = createContext<PerfilPais>('CR');

export function PaisProvider({ pais, children }: { pais: PerfilPais; children: ReactNode }) {
  // Las funciones que no son componentes (símbolo de la moneda, PDF…) leen el país de paisActual
  fijarPais(pais);
  return <Contexto.Provider value={pais}>{children}</Contexto.Provider>;
}

export interface PaisEmpresa { pais: PerfilPais; perfil: PerfilPais; gt: boolean; textos: TextosPais; listo: boolean }
export function usePaisEmpresa(): PaisEmpresa {
  const p = useContext(Contexto);
  return { pais: p, perfil: p, gt: p === 'GT', textos: textosDe(p), listo: true };
}

/** Guarda la empresa elegida en su cookie (la leen el servidor y el diseño de la aplicación). */
export function guardarEmpresaElegida(nombre: string) {
  document.cookie = `${COOKIE_EMPRESA}=${encodeURIComponent(nombre)}; path=/; max-age=31536000; samesite=lax`;
}
