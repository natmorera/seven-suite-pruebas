import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Comentarios de un producto/servicio: quién, cuándo y qué.
async function manejarGET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const { rows } = await db.execute({ sql: 'SELECT * FROM productos_comentarios WHERE articulo_id = ? ORDER BY fecha DESC', args: [id] });
  return NextResponse.json(rows);
}

async function manejarPOST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const texto = String(b.texto ?? '').trim();
  if (!texto) return NextResponse.json({ error: 'Escribe un comentario.' }, { status: 400 });
  const db = await getDb();
  const fila = { id: 'com-' + Math.random().toString(36).slice(2, 10), articulo_id: id, autor: String(b.autor || 'Usuario'), texto, fecha: new Date().toISOString() };
  await db.execute({ sql: 'INSERT INTO productos_comentarios (id, articulo_id, autor, texto, fecha) VALUES (?, ?, ?, ?, ?)', args: [fila.id, fila.articulo_id, fila.autor, fila.texto, fila.fecha] });
  return NextResponse.json(fila);
}

async function manejarDELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const comentario = req.nextUrl.searchParams.get('comentario') ?? '';
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM productos_comentarios WHERE id = ? AND articulo_id = ?', args: [comentario, id] });
  return NextResponse.json({ ok: true });
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const POST = conPaisDeSolicitud(manejarPOST);
export const DELETE = conPaisDeSolicitud(manejarDELETE);
