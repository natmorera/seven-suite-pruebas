import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { InValue } from '@libsql/client';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarPATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = await getDb();
  const campos: string[] = [];
  const args: InValue[] = [];
  if ('favorito' in body) { campos.push('favorito = ?'); args.push(body.favorito ? 1 : 0); }
  if ('importado' in body) { campos.push('importado = ?'); args.push(body.importado ? 1 : 0); }
  if (!campos.length) return NextResponse.json({ ok: true });
  args.push(id);
  await db.execute({ sql: `UPDATE correos SET ${campos.join(', ')} WHERE id = ?`, args });
  return NextResponse.json({ ok: true });
}

async function manejarDELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM correos WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}

// Cada solicitud corre con el país de la empresa elegida
export const PATCH = conPaisDeSolicitud(manejarPATCH);
export const DELETE = conPaisDeSolicitud(manejarDELETE);
