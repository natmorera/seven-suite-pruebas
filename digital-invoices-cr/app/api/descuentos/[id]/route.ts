import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { InValue } from '@libsql/client';

const CAMPOS: Record<string, string> = { nombre: 'nombre', codigo: 'codigo', naturaleza: 'naturaleza', tipo: 'tipo', valor: 'valor', descripcion: 'descripcion', activo: 'activo', cuenta: 'cuenta', codigoOtro: 'codigo_otro' };
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const db = await getDb();
  const sets: string[] = []; const args: InValue[] = [];
  for (const [k, c] of Object.entries(CAMPOS)) if (k in b) { sets.push(`${c} = ?`); args.push(typeof b[k] === 'boolean' ? (b[k] ? 1 : 0) : b[k]); }
  if (sets.length) { args.push(id); await db.execute({ sql: `UPDATE descuentos SET ${sets.join(', ')} WHERE id = ?`, args }); }
  return NextResponse.json({ ok: true });
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM descuentos WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}
