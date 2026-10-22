import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerApiKey, regenerarApiKey, apiKeyValida, moduloActual } from '@/lib/apiKey';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// GET: la API Key del módulo (para la pantalla Empresa › API Key)
async function manejarGET() {
  return NextResponse.json({ ...moduloActual(), ...(await leerApiKey(await getDb())) });
}

// POST: genera una nueva; la anterior deja de funcionar
async function manejarPOST() {
  return NextResponse.json({ ...moduloActual(), ...(await regenerarApiKey(await getDb())) });
}

// PUT: Management prueba la conexión mandando la llave en «x-api-key»
async function manejarPUT(req: NextRequest) {
  const ok = await apiKeyValida(await getDb(), req.headers.get('x-api-key'));
  return NextResponse.json(ok ? { ok: true, modulo: moduloActual().codigo } : { ok: false, error: 'API Key inválida.' }, { status: ok ? 200 : 401 });
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const POST = conPaisDeSolicitud(manejarPOST);
export const PUT = conPaisDeSolicitud(manejarPUT);
