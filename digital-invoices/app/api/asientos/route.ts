import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerAsientos, insertarAsiento, actualizarAsientos, type AsientoDb } from '@/lib/asientosDb';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Bandeja de asientos: GET devuelve activos y anulados; POST crea uno;
// PATCH cambia varios a la vez (contabilizar, anular, restaurar, archivos).
async function manejarGET() {
  const db = await getDb();
  const [activos, anulados] = await Promise.all([leerAsientos(db), leerAsientos(db, { anulados: true })]);
  return NextResponse.json({ activos, anulados });
}

async function manejarPOST(req: NextRequest) {
  const a = await req.json() as AsientoDb;
  if (!a?.consecutivo || !Array.isArray(a.lineas)) return NextResponse.json({ error: 'Faltan datos del asiento.' }, { status: 400 });
  const debe = a.lineas.reduce((s, l) => s + (Number(l.debe) || 0), 0), haber = a.lineas.reduce((s, l) => s + (Number(l.haber) || 0), 0);
  if (Math.abs(debe - haber) > 0.01) return NextResponse.json({ error: 'El asiento no cuadra: el debe y el haber deben ser iguales.' }, { status: 400 });
  const id = await insertarAsiento(await getDb(), a);
  return NextResponse.json({ id });
}

async function manejarPATCH(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const ids: number[] = Array.isArray(b.ids) ? b.ids.map(Number).filter(Number.isFinite) : [];
  if (!ids.length) return NextResponse.json({ error: 'Indica los asientos.' }, { status: 400 });
  const db = await getDb();
  // Restaurar un asiento de facturación cuando su documento ya tiene otro activo lo duplicaría
  if (b.anulado === false) {
    const { rows } = await db.execute({
      sql: `SELECT a.consecutivo, (SELECT o.consecutivo FROM asientos o WHERE o.documento_ref_id = a.documento_ref_id AND COALESCE(o.anulado, 0) = 0 AND o.rowid <> a.rowid LIMIT 1) AS otro
            FROM asientos a WHERE a.rowid IN (${ids.map(() => '?').join(',')}) AND COALESCE(a.documento_ref_id, '') <> ''`, args: ids });
    const choque = rows.find(r => r.otro);
    if (choque) return NextResponse.json({ error: `No se puede restaurar ${choque.consecutivo}: su documento ya tiene el asiento ${choque.otro}. Anula ese primero si quieres volver a este.` }, { status: 409 });
  }
  await actualizarAsientos(db, ids, {
    contabilizado: typeof b.contabilizado === 'boolean' ? b.contabilizado : undefined,
    anulado: typeof b.anulado === 'boolean' ? b.anulado : undefined,
    motivoAnulacion: b.motivoAnulacion !== undefined ? (b.motivoAnulacion ?? null) : undefined,
    archivos: Array.isArray(b.archivos) ? b.archivos.map(String) : undefined,
  });
  return NextResponse.json({ ok: true });
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const POST = conPaisDeSolicitud(manejarPOST);
export const PATCH = conPaisDeSolicitud(manejarPATCH);
