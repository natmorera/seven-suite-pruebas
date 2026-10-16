import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { movimientosMayor, cuentasMayor } from '@/lib/libroMayor';

// Movimientos de todas las cuentas (de los asientos guardados) y las cuentas
export async function GET() {
  const db = await getDb();
  const movimientos = await movimientosMayor(db);
  const cuentas = await cuentasMayor(db, movimientos);
  return NextResponse.json({ cuentas, movimientos });
}
