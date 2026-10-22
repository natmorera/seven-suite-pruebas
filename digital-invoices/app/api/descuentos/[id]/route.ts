import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { InValue } from '@libsql/client';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

const CAMPOS: Record<string, string> = { nombre: 'nombre', codigo: 'codigo', naturaleza: 'naturaleza', tipo: 'tipo', valor: 'valor', descripcion: 'descripcion', activo: 'activo', cuenta: 'cuenta', codigoOtro: 'codigo_otro' };
async function manejarPATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const db = await getDb();
  const sets: string[] = []; const args: InValue[] = [];
  for (const [k, c] of Object.entries(CAMPOS)) if (k in b) { sets.push(`${c} = ?`); args.push(typeof b[k] === 'boolean' ? (b[k] ? 1 : 0) : b[k]); }
  if (sets.length) { args.push(id); await db.execute({ sql: `UPDATE descuentos SET ${sets.join(', ')} WHERE id = ?`, args }); }
  return NextResponse.json({ ok: true });
}
async function manejarDELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM descuentos WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}

// Cada solicitud corre con el país de la empresa elegida
export const PATCH = conPaisDeSolicitud(manejarPATCH);
export const DELETE = conPaisDeSolicitud(manejarDELETE);
