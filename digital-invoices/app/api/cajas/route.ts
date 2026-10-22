import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { tiposNumeracion } from '@/data/catalogosHacienda';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarGET() {
  const db = await getDb();
  const { rows } = await db.execute(`
    SELECT c.id, c.sucursal, c.terminal, c.nombre, c.emisor_id, c.activa, c.numeracion_continuada,
           COALESCE(n.consecutivo_actual, c.consecutivo_actual) AS consecutivo_actual
    FROM cajas c
    LEFT JOIN cajas_numeracion n ON n.caja_id = c.id AND n.tipo_documento = 'Factura electrónica'
    ORDER BY c.nombre
  `);
  return NextResponse.json(rows);
}

async function manejarPOST(req: NextRequest) {
  const body = await req.json();
  const db = await getDb();
  const id = 'caja-' + Math.random().toString(36).slice(2);
  // Emisor: el único activo (una cuenta = un emisor).
  const emisorId = body.emisorId || String((await db.execute(`SELECT id FROM emisores WHERE activo = 1 ORDER BY id LIMIT 1`)).rows[0]?.id ?? '');
  // Numeración por tipo: { [tipo]: próximo número }. Vacío = empieza en 1.
  // Sirve cuando la caja ya venía emitiendo desde otro sistema, para no
  // repetir consecutivos que Hacienda ya recibió.
  const numeracion = (body.numeracion ?? {}) as Record<string, string | number | null | undefined>;
  const consecutivoDe = (tipo: string) => {
    const v = numeracion[tipo];
    return v === null || v === undefined || v === '' ? 0 : Math.max(0, Number(v) - 1);
  };
  const continuada = tiposNumeracion().some(t => consecutivoDe(t.tipo) > 0);
  await db.execute({
    sql: `INSERT INTO cajas (id, sucursal, terminal, nombre, emisor_id, consecutivo_actual, activa, numeracion_continuada) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    args: [id, body.sucursal || '001', body.terminal, body.nombre, emisorId, consecutivoDe('Factura electrónica'), continuada ? 1 : 0],
  });
  for (const t of tiposNumeracion()) {
    await db.execute({
      sql: `INSERT INTO cajas_numeracion (id, caja_id, tipo_documento, consecutivo_actual) VALUES (?, ?, ?, ?)`,
      args: ['cn-' + Math.random().toString(36).slice(2), id, t.tipo, consecutivoDe(t.tipo)],
    });
  }
  return NextResponse.json({ id });
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const POST = conPaisDeSolicitud(manejarPOST);
