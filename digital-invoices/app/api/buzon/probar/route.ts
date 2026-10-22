import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerConfig, probarConexion } from '@/lib/buzon';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Prueba la conexión con los datos del formulario (sin guardarlos). Si no se
// escribió la contraseña, usa la guardada.
async function manejarPOST(req: NextRequest) {
  const b = await req.json();
  const act = await leerConfig(await getDb());
  return NextResponse.json(await probarConexion({
    ...act, host: String(b.host ?? '').trim(), puerto: Number(b.puerto) || 993, seguro: b.seguro !== false,
    usuario: String(b.usuario ?? '').trim(), clave: b.clave ? String(b.clave) : act.clave, carpeta: String(b.carpeta || 'INBOX'),
  }));
}

// Cada solicitud corre con el país de la empresa elegida
export const POST = conPaisDeSolicitud(manejarPOST);
