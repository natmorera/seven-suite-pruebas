import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarGET() {
  const db = await getDb();
  const { rows } = await db.execute('SELECT * FROM descuentos ORDER BY nombre');
  return NextResponse.json(rows);
}
async function manejarPOST(req: NextRequest) {
  const b = await req.json();
  if (!b.nombre) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
  const db = await getDb();
  const id = 'dsc-' + Math.random().toString(36).slice(2);
  await db.execute({
    sql: 'INSERT INTO descuentos (id, nombre, codigo, naturaleza, tipo, valor, descripcion, activo, cuenta, codigo_otro) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)',
    args: [id, b.nombre, b.codigo ?? '07', b.naturaleza ?? '', b.tipo === 'monto' ? 'monto' : 'porcentaje', Number(b.valor) || 0, b.descripcion ?? '', b.cuenta ?? '', b.codigoOtro ?? ''],
  });
  return NextResponse.json({ id });
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const POST = conPaisDeSolicitud(manejarPOST);
