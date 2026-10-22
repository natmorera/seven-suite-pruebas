'use client';
// El onboarding contable es obligatorio: mientras no esté completo, cualquier
// pantalla manda al asistente. Devuelve 'pendiente' mientras consulta o
// redirige, para no mostrar la aplicación a medias.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export const RUTA_ONBOARDING = '/onboarding-contable';

export function useOnboardingObligatorio(activo: boolean, pathname: string): 'ok' | 'pendiente' {
  const router = useRouter();
  // La respuesta vale solo para la pantalla en que se pidió: al terminar el
  // onboarding y pasar al dashboard se vuelve a consultar antes de decidir.
  const [respuesta, setRespuesta] = useState<{ ruta: string; completo: boolean } | null>(null);
  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    fetch('/api/onboarding-contable').then(r => r.json())
      .then(e => { if (vivo) setRespuesta({ ruta: pathname, completo: Boolean(e?.datos?.completado) }); })
      .catch(() => { if (vivo) setRespuesta({ ruta: pathname, completo: true }); });
    return () => { vivo = false; };
  }, [activo, pathname]);
  const completo = respuesta?.ruta === pathname ? respuesta.completo : null;
  const debeIr = activo && completo === false && pathname !== RUTA_ONBOARDING;
  useEffect(() => { if (debeIr) router.replace(RUTA_ONBOARDING); }, [debeIr, router]);
  if (!activo || pathname === RUTA_ONBOARDING) return 'ok';
  return completo === null || debeIr ? 'pendiente' : 'ok';
}

// Demostración: vuelve a pedir el onboarding y lo abre. Recuerda la pantalla
// de origen para volver a ella con «Salir de la demostración».
const CLAVE_DEMO = 'onboarding-demo-origen';
const post = (accion: string) => fetch('/api/onboarding-contable', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion }) });

export async function verOnboarding(irA: (ruta: string) => void) {
  try { sessionStorage.setItem(CLAVE_DEMO, window.location.pathname + window.location.search); } catch { /* sin almacenamiento */ }
  await post('reiniciar');
  irA(RUTA_ONBOARDING);
}

// Pantalla desde la que se abrió la demostración (null si no es una demostración)
export function origenDemostracion(): string | null {
  try { return sessionStorage.getItem(CLAVE_DEMO); } catch { return null; }
}

// Sale de la demostración sin terminarla y vuelve a la pantalla de origen
export async function salirDeDemostracion(irA: (ruta: string) => void) {
  const origen = origenDemostracion() ?? '/dashboard';
  await post('salir');
  try { sessionStorage.removeItem(CLAVE_DEMO); } catch { /* sin almacenamiento */ }
  irA(origen);
}

// Al terminar la demostración ya no hay a dónde volver
export function olvidarDemostracion() {
  try { sessionStorage.removeItem(CLAVE_DEMO); } catch { /* sin almacenamiento */ }
}
