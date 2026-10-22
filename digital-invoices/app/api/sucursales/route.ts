import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { configPlan } from '@/lib/plan';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Sucursales del emisor (código de 3 dígitos del consecutivo). Cada una
// muestra cuántas cajas/terminales tiene.
async function manejarGET(req: NextRequest) {
  const db = await getDb();
  const emisor = req.nextUrl.searchParams.get('emisor');
  const { rows } = await db.execute({
    sql: `SELECT s.*, (SELECT COUNT(*) FROM cajas c WHERE c.sucursal = s.codigo AND (c.emisor_id = s.emisor_id OR c.emisor_id IS NULL)) AS cajas
          FROM sucursales s ${emisor ? 'WHERE s.emisor_id = ?' : ''} ORDER BY s.codigo`,
    args: emisor ? [emisor] : [],
  });
  return NextResponse.json(rows);
}

async function manejarPOST(req: NextRequest) {
  const b = await req.json();
  const db = await getDb();
  const plan = configPlan();
  if (!plan.implementacion) return NextResponse.json({ error: 'Las sucursales las crea el equipo de implementación según tu plan.' }, { status: 403 });
  const { rows: cuenta } = await db.execute({ sql: 'SELECT COUNT(*) AS n FROM sucursales WHERE emisor_id = ?', args: [b.emisorId] });
  if (Number(cuenta[0]?.n ?? 0) >= plan.limiteSucursales) return NextResponse.json({ error: `El plan incluye ${plan.limiteSucursales} sucursal${plan.limiteSucursales === 1 ? '' : 'es'}.` }, { status: 400 });
  if (!/^\d{1,3}$/.test(String(b.codigo ?? ''))) return NextResponse.json({ error: 'El código de sucursal son 3 dígitos.' }, { status: 400 });
  const codigo = String(b.codigo ?? '').padStart(3, '0').slice(-3);
  const dup = await db.execute({ sql: 'SELECT id FROM sucursales WHERE emisor_id = ? AND codigo = ?', args: [b.emisorId, codigo] });
  if (dup.rows.length) return NextResponse.json({ error: `Ya existe la sucursal ${codigo}.` }, { status: 400 });
  const id = 'suc-' + Math.random().toString(36).slice(2);
  await db.execute({
    sql: `INSERT INTO sucursales (id, emisor_id, codigo, nombre, provincia, canton, distrito, otras_senas, telefono, correo, activa) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    args: [id, b.emisorId, codigo, b.nombre ?? '', b.provincia ?? '', b.canton ?? '', b.distrito ?? '', b.otrasSenas ?? '', b.telefono ?? '', b.correo ?? ''],
  });
  return NextResponse.json({ id });
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const POST = conPaisDeSolicitud(manejarPOST);
