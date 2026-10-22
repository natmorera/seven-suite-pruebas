import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verificarCredenciales } from '@/lib/hacienda';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Verificar credenciales de Hacienda. Si no se manda la contraseña se usa la guardada del emisor.
async function manejarPOST(req: NextRequest) {
  const b = await req.json().catch(() => ({})) as { emisorId?: string; usuario?: string; clave?: string; ambiente?: string };
  let clave = b.clave ?? '';
  if (!clave && b.emisorId) {
    const { rows } = await (await getDb()).execute({ sql: 'SELECT clave_hacienda FROM emisores WHERE id = ?', args: [b.emisorId] });
    clave = String(rows[0]?.clave_hacienda ?? '');
  }
  return NextResponse.json(await verificarCredenciales(b.usuario ?? '', clave, b.ambiente === 'pruebas' ? 'pruebas' : 'produccion'));
}

// Cada solicitud corre con el país de la empresa elegida
export const POST = conPaisDeSolicitud(manejarPOST);
