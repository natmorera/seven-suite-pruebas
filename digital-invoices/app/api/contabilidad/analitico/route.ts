import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { movimientosMayor, cuentasMayor } from '@/lib/libroMayor';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Movimientos de todas las cuentas (de los asientos guardados) y las cuentas
async function manejarGET() {
  const db = await getDb();
  const movimientos = await movimientosMayor(db);
  const cuentas = await cuentasMayor(db, movimientos);
  return NextResponse.json({ cuentas, movimientos });
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
