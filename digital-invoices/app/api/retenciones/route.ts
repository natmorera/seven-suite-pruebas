import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarGET() {
  const db = await getDb();
  const { rows } = await db.execute('SELECT * FROM retenciones ORDER BY nombre, porcentaje');
  return NextResponse.json(rows);
}

async function manejarPOST(req: NextRequest) {
  const body = await req.json();
  if (!body.nombre) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
  const db = await getDb();
  const id = 'ret-' + Math.random().toString(36).slice(2);
  await db.execute({
    sql: `INSERT INTO retenciones (id, nombre, tipo, porcentaje, descripcion, activo) VALUES (?, ?, ?, ?, ?, 1)`,
    args: [id, body.nombre, body.tipo ?? '', Number(body.porcentaje) || 0, body.descripcion ?? ''],
  });
  return NextResponse.json({ id });
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const POST = conPaisDeSolicitud(manejarPOST);
