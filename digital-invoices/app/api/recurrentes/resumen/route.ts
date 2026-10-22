import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Resumen de facturas recurrentes para el Dashboard: emitidas hoy, por
// emitir (fecha vencida o con error) y próximas 7 días.
async function manejarGET() {
  const db = await getDb();
  const hoy = new Date().toISOString().slice(0, 10);
  const en7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const base = `SELECT r.id, r.documento_id, r.frecuencia, r.proxima, COALESCE(r.modo, 'revisar') AS modo, COALESCE(r.ultimo_error, '') AS ultimo_error,
      d.cliente_nombre, d.total, d.moneda, d.tipo FROM documentos_recurrentes r JOIN documentos_emitidos d ON d.id = r.documento_id WHERE r.activa = 1`;
  const [emitidas, porEmitir, proximas, activas] = await Promise.all([
    db.execute({ sql: `SELECT id, numero_factura, cliente_nombre, total, moneda, estado, COALESCE(envio_correo, '') AS envio_correo, COALESCE(emitida_sola, 0) AS automatica
      FROM documentos_emitidos WHERE recurrencia_id IS NOT NULL AND substr(fecha_emision, 1, 10) = ? ORDER BY fecha_emision DESC`, args: [hoy] }),
    db.execute({ sql: `${base} AND r.proxima <= ? ORDER BY r.proxima`, args: [hoy] }),
    db.execute({ sql: `${base} AND r.proxima > ? AND r.proxima <= ? ORDER BY r.proxima`, args: [hoy, en7] }),
    db.execute('SELECT COUNT(*) AS n FROM documentos_recurrentes WHERE activa = 1'),
  ]);
  return NextResponse.json({ emitidasHoy: emitidas.rows, porEmitir: porEmitir.rows, proximas: proximas.rows, activas: Number(activas.rows[0]?.n ?? 0) });
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
