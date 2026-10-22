import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getDb, carpetaDatos } from '@/lib/db';
import forge from 'node-forge';
import { extraerLlaveP12 } from '@/lib/firma';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// NOTA DE SEGURIDAD: para simplicidad de la demo, el PIN se guarda tal cual
// en SQLite y el .p12 se guarda como archivo plano en disco. En producción
// esto DEBE cifrarse en reposo (ej. un secreto en Vault/KMS, o al menos
// cifrado simétrico con una clave que no viva en la misma base de datos).

async function manejarPOST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await req.formData();
  const file = form.get('archivo') as File | null;
  const pin = String(form.get('pin') ?? '');
  const vigencia = String(form.get('vigencia') ?? '');

  if (!file || !pin) {
    return NextResponse.json({ error: 'Falta el archivo .p12 o el PIN.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let vigenciaCert = '';
  let emisorCert = '';
  try {
    const llave = extraerLlaveP12(buffer, pin);
    try {
      const cert = forge.pki.certificateFromPem(llave.certificatePem);
      vigenciaCert = cert.validity.notAfter.toISOString().slice(0, 10);
      emisorCert = String(cert.subject.getField('CN')?.value ?? '');
    } catch { /* se usa la vigencia indicada a mano */ }
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    const error = /MAC could not be verified|Invalid password/i.test(m) ? 'El PIN no corresponde a ese certificado.'
      : /Too few bytes|not a|ASN\.1|parse/i.test(m) ? 'El archivo no es un certificado .p12 válido.' : (m || 'Archivo .p12 o PIN inválido.');
    return NextResponse.json({ error }, { status: 400 });
  }

  const dir = carpetaDatos('llaves');
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${id}.p12`);
  await fs.writeFile(filePath, buffer);

  const db = await getDb();
  await db.execute({
    sql: `UPDATE emisores SET llave_cargada = 1, vigencia_llave = ?, llave_pin = ?, llave_pfx_path = ?, certificado_nombre = ?, certificado_emisor = ? WHERE id = ?`,
    args: [vigenciaCert || vigencia || null, pin, filePath, file.name, emisorCert || null, id],
  });

  return NextResponse.json({ ok: true, vigencia: vigenciaCert || vigencia || null });
}

// Cada solicitud corre con el país de la empresa elegida
export const POST = conPaisDeSolicitud(manejarPOST);
