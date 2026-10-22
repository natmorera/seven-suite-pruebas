import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerProvincias } from '@/lib/catalogosBase';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// División territorial (provincia › cantón › distrito) guardada en la base
async function manejarGET() {
  return NextResponse.json(await leerProvincias(await getDb()));
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
