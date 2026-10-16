import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = await getDb();
  const { rows } = await db.execute('SELECT * FROM exoneraciones ORDER BY nombre');
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.nombre) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
  const db = await getDb();
  const id = 'exo-' + Math.random().toString(36).slice(2);
  await db.execute({
    sql: `INSERT INTO exoneraciones (id, nombre, tipo_documento, numero_documento, institucion, fecha_emision, porcentaje, articulo, inciso, descripcion, activo,
            tipo_documento_otro, nombre_institucion_otros)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    args: [
      id, body.nombre, body.tipoDocumento ?? '04', body.numeroDocumento ?? '', body.institucion ?? '01',
      body.fechaEmision ?? '', Number(body.porcentaje) || 100, body.articulo ?? '', body.inciso ?? '0', body.descripcion ?? '',
      body.tipoDocumentoOtro ?? '', body.nombreInstitucionOtros ?? '',
    ],
  });
  return NextResponse.json({ id });
}
