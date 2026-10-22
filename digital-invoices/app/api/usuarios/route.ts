import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Usuarios, roles (plantillas de permisos) y firmantes de Usuarios y
// permisos, guardados en la base. GET devuelve null si nunca se guardaron
// (la pantalla usa los de ejemplo); PUT guarda todo.
const CLAVE = 'usuarios_permisos_json';

async function manejarGET() {
  const db = await getDb();
  const { rows } = await db.execute({ sql: 'SELECT valor FROM app_meta WHERE clave = ?', args: [CLAVE] });
  try { return NextResponse.json(rows[0]?.valor ? JSON.parse(String(rows[0].valor)) : null); } catch { return NextResponse.json(null); }
}

async function manejarPUT(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b || !Array.isArray(b.usuarios)) return NextResponse.json({ error: 'Faltan los usuarios.' }, { status: 400 });
  const db = await getDb();
  await db.execute({ sql: `INSERT INTO app_meta (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`, args: [CLAVE, JSON.stringify(b)] });
  return NextResponse.json({ ok: true });
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const PUT = conPaisDeSolicitud(manejarPUT);
