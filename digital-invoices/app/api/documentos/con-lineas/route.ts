import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarGET() {
  const db = await getDb();
  const { rows: docs } = await db.execute('SELECT * FROM documentos_emitidos ORDER BY fecha_emision DESC');
  const { rows: lineas } = await db.execute('SELECT * FROM documentos_emitidos_lineas');

  const porDoc = new Map<string, typeof lineas>();
  for (const l of lineas) {
    const docId = String(l.documento_id);
    if (!porDoc.has(docId)) porDoc.set(docId, []);
    porDoc.get(docId)!.push(l);
  }

  const resultado = docs.map(d => ({ ...d, lineas: porDoc.get(String(d.id)) ?? [] }));
  return NextResponse.json(resultado);
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
