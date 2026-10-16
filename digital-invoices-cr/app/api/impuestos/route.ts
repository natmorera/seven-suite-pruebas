import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = await getDb();
  const { rows } = await db.execute('SELECT * FROM impuestos ORDER BY nombre, porcentaje');
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.nombre) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
  const db = await getDb();
  const id = 'imp-' + Math.random().toString(36).slice(2);
  await db.execute({
    sql: `INSERT INTO impuestos (id, nombre, tipo, porcentaje, impuesto_acreditable, descripcion, activo, cuenta, codigo_otro) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    args: [id, body.nombre, body.tipo ?? '', Number(body.porcentaje) || 0, body.impuestoAcreditable ? 1 : 0, body.descripcion ?? '', body.cuenta ?? '', body.codigoOtro ?? ''],
  });
  return NextResponse.json({ id });
}
