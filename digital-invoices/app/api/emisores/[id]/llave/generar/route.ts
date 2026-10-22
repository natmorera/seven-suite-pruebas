import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getDb, carpetaDatos } from '@/lib/db';
import { generarLlaveP12 } from '@/lib/firma';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarPOST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const pin = String(body.pin ?? '');
  if (pin.length < 4) return NextResponse.json({ error: 'El PIN debe tener al menos 4 caracteres.' }, { status: 400 });
  if (pin !== String(body.confirmacionPin ?? '')) return NextResponse.json({ error: 'El PIN y su confirmación no coinciden.' }, { status: 400 });

  const db = await getDb();
  const emisorRes = await db.execute({ sql: 'SELECT * FROM emisores WHERE id = ?', args: [id] });
  const emisor = emisorRes.rows[0] as unknown as Record<string, string> | undefined;
  if (!emisor) return NextResponse.json({ error: 'Emisor no encontrado.' }, { status: 404 });

  const p12Buffer = generarLlaveP12(pin, emisor.nombre_comercial, emisor.cedula_juridica);

  const dir = carpetaDatos('llaves');
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${id}.p12`);
  await fs.writeFile(filePath, p12Buffer);

  const vigencia = new Date();
  vigencia.setFullYear(vigencia.getFullYear() + 2);

  await db.execute({
    sql: `UPDATE emisores SET llave_cargada = 1, vigencia_llave = ?, llave_pin = ?, llave_pfx_path = ?, certificado_nombre = ? WHERE id = ?`,
    args: [vigencia.toISOString().slice(0, 10), pin, filePath, `llave-${id}.p12`, id],
  });

  return NextResponse.json({ ok: true, archivoBase64: p12Buffer.toString('base64'), nombreArchivo: `llave-${id}.p12` });
}

// Cada solicitud corre con el país de la empresa elegida
export const POST = conPaisDeSolicitud(manejarPOST);
