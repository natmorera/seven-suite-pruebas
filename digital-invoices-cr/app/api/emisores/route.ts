import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { emisorPublico } from '@/lib/emisorPublico';

export async function GET() {
  const db = await getDb();
  const { rows } = await db.execute('SELECT * FROM emisores ORDER BY razon_social');
  return NextResponse.json(rows.map(r => emisorPublico(r as unknown as Record<string, unknown>)));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = await getDb();
  const id = 'em-' + Math.random().toString(36).slice(2);
  await db.execute({
    sql: `INSERT INTO emisores (id, razon_social, nombre_comercial, cedula_juridica, tipo_identificacion, actividad_economica, regimen, llave_cargada, activo)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)`,
    args: [id, body.razonSocial, body.nombreComercial, body.cedulaJuridica, body.tipoIdentificacion ?? '02', body.actividadEconomica, body.regimen],
  });
  return NextResponse.json({ id });
}
