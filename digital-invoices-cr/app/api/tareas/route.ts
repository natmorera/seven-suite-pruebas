import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ejecutarTareas } from '@/lib/tareas';

export const maxDuration = 120;

// GET: lo llama el cron de Vercel (con CRON_SECRET si está definido).
// POST: lo llaman las pantallas de Ventas y Compras al abrirse.
export async function GET(req: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.get('authorization') !== `Bearer ${secreto}`) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  return NextResponse.json(await ejecutarTareas(await getDb()));
}

export async function POST() {
  return NextResponse.json(await ejecutarTareas(await getDb()));
}
