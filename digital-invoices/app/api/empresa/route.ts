import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerEmpresa, guardarEmpresa } from '@/lib/empresa';
import { leerModulos } from '@/lib/modulos';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarGET() {
  const db = await getDb();
  const empresa = await leerEmpresa(db);
  // Si el producto incluye facturación electrónica, ya se eligió en el
  // onboarding: queda activa sin preguntarlo en Empresa.
  if (empresa.facturacionElectronica !== 'si' && (await leerModulos(db)).facturacion) {
    return NextResponse.json(await guardarEmpresa(db, { facturacionElectronica: 'si' }));
  }
  return NextResponse.json(empresa);
}

async function manejarPUT(req: NextRequest) {
  const b = await req.json();
  const fe = b.facturacionElectronica;
  return NextResponse.json(await guardarEmpresa(await getDb(), {
    datos: b.datos,
    facturacionElectronica: fe === 'si' || fe === 'no' ? fe : undefined,
  }));
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
export const PUT = conPaisDeSolicitud(manejarPUT);
