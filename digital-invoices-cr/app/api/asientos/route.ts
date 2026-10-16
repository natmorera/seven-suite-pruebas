import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerAsientos, insertarAsiento, actualizarAsientos, type AsientoDb } from '@/lib/asientosDb';

// Bandeja de asientos: GET devuelve activos y anulados; POST crea uno;
// PATCH cambia varios a la vez (contabilizar, anular, restaurar, archivos).
export async function GET() {
  const db = await getDb();
  const [activos, anulados] = await Promise.all([leerAsientos(db), leerAsientos(db, { anulados: true })]);
  return NextResponse.json({ activos, anulados });
}

export async function POST(req: NextRequest) {
  const a = await req.json() as AsientoDb;
  if (!a?.consecutivo || !Array.isArray(a.lineas)) return NextResponse.json({ error: 'Faltan datos del asiento.' }, { status: 400 });
  const debe = a.lineas.reduce((s, l) => s + (Number(l.debe) || 0), 0), haber = a.lineas.reduce((s, l) => s + (Number(l.haber) || 0), 0);
  if (Math.abs(debe - haber) > 0.01) return NextResponse.json({ error: 'El asiento no cuadra: el debe y el haber deben ser iguales.' }, { status: 400 });
  const id = await insertarAsiento(await getDb(), a);
  return NextResponse.json({ id });
}

export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const ids: number[] = Array.isArray(b.ids) ? b.ids.map(Number).filter(Number.isFinite) : [];
  if (!ids.length) return NextResponse.json({ error: 'Indica los asientos.' }, { status: 400 });
  await actualizarAsientos(await getDb(), ids, {
    contabilizado: typeof b.contabilizado === 'boolean' ? b.contabilizado : undefined,
    anulado: typeof b.anulado === 'boolean' ? b.anulado : undefined,
    motivoAnulacion: b.motivoAnulacion !== undefined ? (b.motivoAnulacion ?? null) : undefined,
    archivos: Array.isArray(b.archivos) ? b.archivos.map(String) : undefined,
  });
  return NextResponse.json({ ok: true });
}
