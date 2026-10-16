import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { InValue } from '@libsql/client';

const CAMPOS: Record<string, string> = {
  nombre: 'nombre', codigoCabys: 'codigo_cabys', descripcionCabys: 'descripcion_cabys', impuesto: 'impuesto', unidad: 'unidad', categoria: 'categoria',
  moneda: 'moneda', cuentaIngreso: 'cuenta_ingreso', cuentaCosto: 'cuenta_costo', centroCosto: 'centro_costo', inventariable: 'inventariable', activo: 'activo',
};
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const db = await getDb();
  const sets: string[] = []; const args: InValue[] = [];
  for (const [k, c] of Object.entries(CAMPOS)) if (k in b) { sets.push(`${c} = ?`); args.push(typeof b[k] === 'boolean' ? (b[k] ? 1 : 0) : b[k]); }
  if (sets.length) { args.push(id); await db.execute({ sql: `UPDATE grupos_productos SET ${sets.join(', ')} WHERE id = ?`, args }); }
  // El nombre del grupo es la categoría de sus productos.
  if (b.nombre) {
    await db.execute({ sql: `UPDATE grupos_productos SET categoria = ? WHERE id = ?`, args: [b.nombre, id] });
    await db.execute({ sql: `UPDATE cabys_favoritos SET categoria = ? WHERE grupo_id = ?`, args: [b.nombre, id] });
  }
  return NextResponse.json({ ok: true });
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  await db.execute({ sql: `UPDATE cabys_favoritos SET grupo_id = '' WHERE grupo_id = ?`, args: [id] });
  await db.execute({ sql: 'DELETE FROM grupos_productos WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}
