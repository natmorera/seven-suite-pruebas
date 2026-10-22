import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { conPaisDeSolicitud } from '@/lib/paisServidor';
import { esGuatemalaActual } from '@/lib/paisActual';

async function manejarGET() {
  const db = await getDb();
  const { rows } = await db.execute(`SELECT g.*, (SELECT COUNT(*) FROM cabys_favoritos f WHERE f.grupo_id = g.id) AS articulos FROM grupos_productos g ORDER BY g.nombre`);
  return NextResponse.json(rows);
}
async function manejarPOST(req: NextRequest) {
  const b = await req.json();
  // Costa Rica pide el CABYS; Guatemala, la clasificación del producto
  const gt = esGuatemalaActual();
  if (gt ? !b.nombre || !b.datosPais : !b.nombre || !/^\d{13}$/.test(String(b.codigoCabys ?? ''))) {
    return NextResponse.json({ error: gt ? 'Escribe el nombre y elige la clasificación.' : 'Escribe el nombre y elige un código CABYS.' }, { status: 400 });
  }
  const db = await getDb();
  const id = 'grp-' + Math.random().toString(36).slice(2);
  await db.execute({
    sql: `INSERT INTO grupos_productos (id, nombre, codigo_cabys, descripcion_cabys, impuesto, unidad, categoria, moneda, cuenta_ingreso, cuenta_costo, centro_costo, inventariable, datos_pais, activo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    // El grupo es la categoría: se guarda su nombre también como categoría.
    args: [id, b.nombre, b.codigoCabys, b.descripcionCabys ?? '', Number(b.impuesto ?? 13), b.unidad ?? 'Unid', b.nombre, b.moneda ?? 'CRC', b.cuentaIngreso ?? '', b.cuentaCosto ?? '', b.centroCosto ?? '', b.inventariable ? 1 : 0, String(b.datosPais ?? '')],
  });
  return NextResponse.json({ id });
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const POST = conPaisDeSolicitud(manejarPOST);
