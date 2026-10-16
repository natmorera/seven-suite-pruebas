import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { estadoConfiguracionFE } from '@/lib/configuracionFE';

export async function GET() {
  return NextResponse.json(await estadoConfiguracionFE(await getDb()));
}

// Marca a mano un paso que lo permite (hoy: credenciales de Hacienda). { paso, listo }
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const paso = String(b?.paso ?? '');
  if (!['credenciales'].includes(paso)) return NextResponse.json({ error: 'Ese paso no se puede marcar a mano.' }, { status: 400 });
  const db = await getDb();
  if (b.listo === false) await db.execute({ sql: 'DELETE FROM app_meta WHERE clave = ?', args: ['fe_paso_manual_' + paso] });
  else await db.execute({ sql: `INSERT INTO app_meta (clave, valor) VALUES (?, '1') ON CONFLICT(clave) DO UPDATE SET valor = '1'`, args: ['fe_paso_manual_' + paso] });
  return NextResponse.json(await estadoConfiguracionFE(db));
}
