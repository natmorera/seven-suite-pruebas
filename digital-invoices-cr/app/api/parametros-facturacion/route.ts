import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = await getDb();
  const { rows } = await db.execute(`SELECT * FROM parametros_facturacion WHERE id = 'default'`);
  return NextResponse.json(rows[0] ?? null);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const db = await getDb();
  const campos: Record<string, string> = {
    condicionImpuestoDefault: 'condicion_impuesto_default',
    prorratearIva: 'prorratear_iva',
    aplicaExoneracion: 'aplica_exoneracion',
    exoneracionCodigo: 'exoneracion_codigo',
    exoneracionPorcentaje: 'exoneracion_porcentaje',
    exoneracionArticulo: 'exoneracion_articulo',
    exoneracionInciso: 'exoneracion_inciso',
  };
  const sets: string[] = [];
  const args: (string | number)[] = [];
  for (const [key, columna] of Object.entries(campos)) {
    if (key in body) {
      sets.push(`${columna} = ?`);
      const v = body[key];
      args.push(typeof v === 'boolean' ? (v ? 1 : 0) : v);
    }
  }
  if (sets.length === 0) return NextResponse.json({ ok: true });
  await db.execute({ sql: `UPDATE parametros_facturacion SET ${sets.join(', ')} WHERE id = 'default'`, args });
  return NextResponse.json({ ok: true });
}
