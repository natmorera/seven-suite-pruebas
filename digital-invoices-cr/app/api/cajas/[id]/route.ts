import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = await getDb();
  if ('activa' in body) {
    await db.execute({ sql: 'UPDATE cajas SET activa = ? WHERE id = ?', args: [body.activa ? 1 : 0, id] });
  }
  const camposSimples: Record<string, string> = { nombre: 'nombre', sucursal: 'sucursal', terminal: 'terminal', emisorId: 'emisor_id' };
  const sets: string[] = [];
  const args: string[] = [];
  for (const [key, columna] of Object.entries(camposSimples)) {
    if (key in body) { sets.push(`${columna} = ?`); args.push(body[key]); }
  }
  if (sets.length > 0) {
    args.push(id);
    await db.execute({ sql: `UPDATE cajas SET ${sets.join(', ')} WHERE id = ?`, args });
  }
  // numeracion: { [tipoDocumento]: proximoConsecutivo } — actualiza varios
  // tipos de una sola vez, típicamente al migrar desde otro sistema que ya
  // traía consecutivos emitidos POR TIPO (Hacienda numera cada tipo aparte).
  if ('numeracion' in body && body.numeracion) {
    let algunoContinuado = false;
    for (const [tipo, proximo] of Object.entries(body.numeracion as Record<string, string | number | null | undefined>)) {
      if (proximo === null || proximo === undefined || proximo === '') continue;
      const consecutivo = Math.max(0, Number(proximo) - 1);
      const r = await db.execute({
        sql: `UPDATE cajas_numeracion SET consecutivo_actual = ? WHERE caja_id = ? AND tipo_documento = ?`,
        args: [consecutivo, id, tipo],
      });
      if (!r.rowsAffected) {
        await db.execute({ sql: `INSERT INTO cajas_numeracion (id, caja_id, tipo_documento, consecutivo_actual) VALUES (?, ?, ?, ?)`, args: ['cn-' + Math.random().toString(36).slice(2), id, tipo, consecutivo] });
      }
      if (consecutivo > 0) algunoContinuado = true;
    }
    if (algunoContinuado) await db.execute({ sql: 'UPDATE cajas SET numeracion_continuada = 1 WHERE id = ?', args: [id] });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM cajas_numeracion WHERE caja_id = ?', args: [id] });
  await db.execute({ sql: 'DELETE FROM cajas WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const { rows } = await db.execute({ sql: 'SELECT tipo_documento, consecutivo_actual FROM cajas_numeracion WHERE caja_id = ?', args: [id] });
  return NextResponse.json(rows);
}
