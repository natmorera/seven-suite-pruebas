import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { InValue } from '@libsql/client';
import { configPlan } from '@/lib/plan';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

const CAMPOS: Record<string, string> = { nombre: 'nombre', provincia: 'provincia', canton: 'canton', distrito: 'distrito', otrasSenas: 'otras_senas', telefono: 'telefono', correo: 'correo', activa: 'activa' };

async function manejarPATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const db = await getDb();
  // Cambiar el código (al migrar un cliente no siempre se arranca en 001):
  // solo implementación, sin repetir otro código, y las cajas lo siguen.
  if ('codigo' in b) {
    if (!configPlan().implementacion) return NextResponse.json({ error: 'El código de la sucursal lo cambia el equipo de implementación.' }, { status: 403 });
    if (!/^\d{1,3}$/.test(String(b.codigo))) return NextResponse.json({ error: 'El código de sucursal son 3 dígitos.' }, { status: 400 });
    const nuevo = String(b.codigo).padStart(3, '0');
    const { rows } = await db.execute({ sql: 'SELECT codigo, emisor_id FROM sucursales WHERE id = ?', args: [id] });
    const actual = rows[0];
    if (!actual) return NextResponse.json({ error: 'No se encontró la sucursal.' }, { status: 404 });
    if (nuevo !== String(actual.codigo)) {
      const dup = await db.execute({ sql: 'SELECT 1 FROM sucursales WHERE emisor_id = ? AND codigo = ? AND id <> ?', args: [actual.emisor_id, nuevo, id] });
      if (dup.rows.length) return NextResponse.json({ error: `Ya existe la sucursal ${nuevo}.` }, { status: 400 });
      await db.execute({ sql: 'UPDATE cajas SET sucursal = ? WHERE sucursal = ? AND (emisor_id = ? OR emisor_id IS NULL)', args: [nuevo, String(actual.codigo), actual.emisor_id] });
      await db.execute({ sql: 'UPDATE sucursales SET codigo = ? WHERE id = ?', args: [nuevo, id] });
    }
  }
  const sets: string[] = []; const args: InValue[] = [];
  for (const [k, col] of Object.entries(CAMPOS)) if (k in b) { sets.push(`${col} = ?`); args.push(k === 'activa' ? (b[k] ? 1 : 0) : b[k]); }
  if (sets.length) { args.push(id); await db.execute({ sql: `UPDATE sucursales SET ${sets.join(', ')} WHERE id = ?`, args }); }
  return NextResponse.json({ ok: true });
}

async function manejarDELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const s = await db.execute({ sql: 'SELECT codigo, emisor_id FROM sucursales WHERE id = ?', args: [id] });
  const fila = s.rows[0];
  if (fila) {
    const c = await db.execute({ sql: 'SELECT COUNT(*) AS n FROM cajas WHERE sucursal = ?', args: [String(fila.codigo)] });
    if (Number(c.rows[0].n) > 0) return NextResponse.json({ error: 'La sucursal tiene cajas asignadas; desactívala en lugar de eliminarla.' }, { status: 400 });
  }
  await db.execute({ sql: 'DELETE FROM sucursales WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}

// Cada solicitud corre con el país de la empresa elegida
export const PATCH = conPaisDeSolicitud(manejarPATCH);
export const DELETE = conPaisDeSolicitud(manejarDELETE);
