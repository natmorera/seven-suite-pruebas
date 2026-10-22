import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerCuentasTerceros } from '@/lib/tercerosServidor';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

// Cuentas de detalle de proveedores y clientes y el separador del código (para las pantallas)
async function manejarGET() {
  return NextResponse.json(await leerCuentasTerceros(await getDb()));
}

// Cada solicitud corre con el país de la empresa elegida
export const GET = conPaisDeSolicitud(manejarGET);
