'use client';
// El onboarding contable es obligatorio: mientras no esté completo, cualquier
// pantalla manda al asistente.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onboardingAlmacen, reiniciarOnboarding } from './estado';
import { useAlmacen } from '@/components/pages/empresa/datos/almacen';

export const RUTA_ONBOARDING = '/onboarding-contable';

// 'pendiente' mientras redirige, para no mostrar la aplicación a medias
export function useOnboardingObligatorio(pathname: string): 'ok' | 'pendiente' {
  const router = useRouter();
  const { completado } = useAlmacen(onboardingAlmacen);
  const debeIr = !completado && pathname !== RUTA_ONBOARDING;
  useEffect(() => { if (debeIr) router.replace(RUTA_ONBOARDING); }, [debeIr, router]);
  return debeIr ? 'pendiente' : 'ok';
}

// Demostración: vuelve a pedir el onboarding y lo abre
export function verOnboarding(irA: (ruta: string) => void) {
  reiniciarOnboarding();
  irA(RUTA_ONBOARDING);
}
