import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { estadoOnboarding, guardarPaso, reiniciarOnboarding, salirDeDemostracion, PASOS_ORDEN, type PasoId } from '@/lib/onboardingContable';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarGET() {
  return NextResponse.json(await estadoOnboarding(await getDb()));
}

async function manejarPUT(req: NextRequest) {
  const body = await req.json().catch(() => null) as { paso?: string; valores?: Record<string, unknown> } | null;
  const paso = body?.paso;
  if (!paso || !(PASOS_ORDEN.includes(paso as PasoId) || paso === 'completar')) return NextResponse.json({ error: 'Paso desconocido.' }, { status: 400 });
  const db = await getDb();
  const error = await guardarPaso(db, paso as PasoId | 'completar', body?.valores ?? {});
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json(await estadoOnboarding(db));
}

// Demostración: vuelve a pedir el onboarding o sale de ella
async function manejarPOST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { accion?: string } | null;
  if (body?.accion !== 'reiniciar' && body?.accion !== 'salir') return NextResponse.json({ error: 'Acción desconocida.' }, { status: 400 });
  const db = await getDb();
  if (body.accion === 'salir') await salirDeDemostracion(db);
  else await reiniciarOnboarding(db);
  return NextResponse.json(await estadoOnboarding(db));
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const PUT = conPaisDeSolicitud(manejarPUT);
export const POST = conPaisDeSolicitud(manejarPOST);
