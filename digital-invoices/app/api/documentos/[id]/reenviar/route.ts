import { NextRequest, NextResponse } from 'next/server';
import { enviarDocumentoPorCorreo } from '@/lib/correo';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Uno o varios destinatarios, mensaje opcional y adjuntos elegidos.
async function manejarPOST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const body = await req.json();
  const para: string[] = Array.isArray(body.para) ? body.para : body.destinatario ? [String(body.destinatario)] : [];
  if (!para.length) return NextResponse.json({ error: 'Escribe al menos un correo.' }, { status: 400 });
  const r = await enviarDocumentoPorCorreo('#' + idParam, para, String(body.mensaje ?? '').trim(), Array.isArray(body.adjuntos) ? body.adjuntos : ['xml']);
  if ('error' in r && r.error === 'No encontrado') return NextResponse.json(r, { status: 404 });
  return NextResponse.json(r);
}

// Cada solicitud corre con el país de la empresa elegida
export const POST = conPaisDeSolicitud(manejarPOST);
