import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarPATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = await getDb();
  const campos: Record<string, string> = {
    nombre: 'nombre', tipoDocumento: 'tipo_documento', numeroDocumento: 'numero_documento', institucion: 'institucion',
    fechaEmision: 'fecha_emision', porcentaje: 'porcentaje', articulo: 'articulo', inciso: 'inciso', descripcion: 'descripcion', activo: 'activo',
    tipoDocumentoOtro: 'tipo_documento_otro', nombreInstitucionOtros: 'nombre_institucion_otros',
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
  args.push(id);
  await db.execute({ sql: `UPDATE exoneraciones SET ${sets.join(', ')} WHERE id = ?`, args });
  return NextResponse.json({ ok: true });
}

async function manejarDELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM exoneraciones WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}

// Cada solicitud corre con el país de la empresa elegida
export const PATCH = conPaisDeSolicitud(manejarPATCH);
export const DELETE = conPaisDeSolicitud(manejarDELETE);
