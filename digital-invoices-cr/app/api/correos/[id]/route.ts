import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { InValue } from '@libsql/client';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM correos WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}
