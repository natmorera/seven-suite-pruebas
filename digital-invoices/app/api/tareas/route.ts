import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ejecutarTareas } from '@/lib/tareas';
import { conPais, conPaisDeSolicitud } from '@/lib/paisServidor';

export const maxDuration = 120;

// GET: lo llama el cron de Vercel (con CRON_SECRET si está definido).
// POST: lo llaman las pantallas de Ventas y Compras al abrirse.
async function manejarGET(req: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.get('authorization') !== `Bearer ${secreto}`) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  // El cron no trae empresa: revisa la base de cada país
  return NextResponse.json({
    CR: await conPais('CR', async () => ejecutarTareas(await getDb('CR'))),
    GT: await conPais('GT', async () => ejecutarTareas(await getDb('GT'))),
  });
}

async function manejarPOST() {
  return NextResponse.json(await ejecutarTareas(await getDb()));
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const POST = conPaisDeSolicitud(manejarPOST);
