import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { emitirCopia } from '@/lib/emitirCopia';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Refacturar: emite un documento nuevo con las mismas líneas y condiciones
// del original, a nombre de otro receptor, con referencia al original.
async function manejarPOST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = '#' + idParam;
  const b = await req.json();
  const db = await getDb();
  const { rows } = await db.execute({ sql: 'SELECT tipo, numero_factura, clave, fecha_emision FROM documentos_emitidos WHERE id = ?', args: [id] });
  const doc = rows[0];
  if (!doc) return NextResponse.json({ error: 'No se encontró el documento.' }, { status: 404 });
  const r = b.receptor ?? {};
  if (!r.nombre) return NextResponse.json({ error: 'Elige o crea el receptor.' }, { status: 400 });
  const resultado = await emitirCopia(db, id, {
    receptor: { clienteId: r.clienteId ?? null, nombre: r.nombre, tipoIdentificacion: r.tipoIdentificacion, numeroIdentificacion: r.numeroIdentificacion, email: r.email },
    referencia: { tipoDocumento: String(doc.tipo), numero: String(doc.clave || doc.numero_factura), fecha: String(doc.fecha_emision), codigo: '04', razon: 'Refacturación a otro receptor' },
    observaciones: `Refacturación de ${doc.tipo === 'Tiquete electrónico' ? 'el tiquete' : 'la factura'} ${doc.numero_factura}`,
  });
  if ('error' in resultado) return NextResponse.json(resultado, { status: 400 });
  return NextResponse.json(resultado);
}

// Cada solicitud corre con el país de la empresa elegida
export const POST = conPaisDeSolicitud(manejarPOST);
