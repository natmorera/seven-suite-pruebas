import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = await getDb();
  const { rows } = await db.execute(`SELECT g.*, (SELECT COUNT(*) FROM cabys_favoritos f WHERE f.grupo_id = g.id) AS articulos FROM grupos_productos g ORDER BY g.nombre`);
  return NextResponse.json(rows);
}
export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.nombre || !/^\d{13}$/.test(String(b.codigoCabys ?? ''))) return NextResponse.json({ error: 'Escribe el nombre y elige un código CABYS.' }, { status: 400 });
  const db = await getDb();
  const id = 'grp-' + Math.random().toString(36).slice(2);
  await db.execute({
    sql: `INSERT INTO grupos_productos (id, nombre, codigo_cabys, descripcion_cabys, impuesto, unidad, categoria, moneda, cuenta_ingreso, cuenta_costo, centro_costo, inventariable, activo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    // El grupo es la categoría: se guarda su nombre también como categoría.
    args: [id, b.nombre, b.codigoCabys, b.descripcionCabys ?? '', Number(b.impuesto ?? 13), b.unidad ?? 'Unid', b.nombre, b.moneda ?? 'CRC', b.cuentaIngreso ?? '', b.cuentaCosto ?? '', b.centroCosto ?? '', b.inventariable ? 1 : 0],
  });
  return NextResponse.json({ id });
}
