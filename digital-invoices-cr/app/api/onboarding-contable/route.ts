import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { estadoOnboarding, guardarPaso, reiniciarOnboarding, PASOS_ORDEN, type PasoId } from '@/lib/onboardingContable';

export async function GET() {
  return NextResponse.json(await estadoOnboarding(await getDb()));
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null) as { paso?: string; valores?: Record<string, unknown> } | null;
  const paso = body?.paso;
  if (!paso || !(PASOS_ORDEN.includes(paso as PasoId) || paso === 'completar')) return NextResponse.json({ error: 'Paso desconocido.' }, { status: 400 });
  const db = await getDb();
  const error = await guardarPaso(db, paso as PasoId | 'completar', body?.valores ?? {});
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json(await estadoOnboarding(db));
}

// Demostración: vuelve a pedir el onboarding
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { accion?: string } | null;
  if (body?.accion !== 'reiniciar') return NextResponse.json({ error: 'Acción desconocida.' }, { status: 400 });
  const db = await getDb();
  await reiniciarOnboarding(db);
  return NextResponse.json(await estadoOnboarding(db));
}
