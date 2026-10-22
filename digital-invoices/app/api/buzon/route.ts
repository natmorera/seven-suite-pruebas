import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerConfig, guardarConfig } from '@/lib/buzon';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Configuración del buzón IMAP. La contraseña nunca se devuelve.
async function manejarGET() {
  const db = await getDb();
  const c = await leerConfig(db);
  // Correo de CM al que el cliente redirige las facturas (regla de reenvío)
  const { rows } = await db.execute('SELECT cedula_juridica, correo_electronico FROM emisores ORDER BY activo DESC LIMIT 1');
  const cedula = String(rows[0]?.cedula_juridica ?? '').replace(/\D/g, '');
  const plantilla = process.env.CORREO_RECEPCION_CM ?? '';
  const correoCm = plantilla ? plantilla.replace('{cedula}', cedula) : '';
  return NextResponse.json({ ...c, clave: '', tieneClave: Boolean(c.clave), correoCm, correoCliente: String(rows[0]?.correo_electronico ?? '') });
}

async function manejarPUT(req: NextRequest) {
  const b = await req.json();
  const db = await getDb();
  const act = await leerConfig(db);
  const cambioCuenta = String(b.host ?? '') !== act.host || String(b.usuario ?? '') !== act.usuario || String(b.carpeta || 'INBOX') !== act.carpeta;
  await guardarConfig(db, {
    host: String(b.host ?? '').trim(), puerto: Number(b.puerto) || 993, seguro: b.seguro !== false,
    usuario: String(b.usuario ?? '').trim(), clave: b.clave ? String(b.clave) : act.clave,
    carpeta: String(b.carpeta || 'INBOX').trim(), dias: Math.min(365, Math.max(1, Number(b.dias) || 30)),
    auto: b.auto !== false, intervalo: [5, 15, 30, 60].includes(Number(b.intervalo)) ? Number(b.intervalo) : 15,
    // Otra cuenta/carpeta: se vuelve a leer desde el inicio.
    ...(cambioCuenta ? { ultimo_uid: 0 } : {}),
  });
  return NextResponse.json({ ok: true });
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const PUT = conPaisDeSolicitud(manejarPUT);
