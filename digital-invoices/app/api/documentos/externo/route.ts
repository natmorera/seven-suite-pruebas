import { NextRequest, NextResponse } from 'next/server';
import { crearDocumento, ORIGENES_VALIDOS, type Origen } from '@/lib/crearDocumento';
import { conPaisDeSolicitud } from '@/lib/paisServidor';

async function manejarPOST(req: NextRequest) {
  const body = await req.json();

  // Los módulos pueden mandar el nombre anterior o la sigla (FDK, POS, TO)
  const ALIAS: Record<string, string> = { 'Front Desk (PMS)': 'Front Desk', PMS: 'Front Desk', FDK: 'Front Desk', POS: 'Punto de Venta (POS)', TO: 'Tour Operador' };
  if (body.origen && ALIAS[body.origen]) body.origen = ALIAS[body.origen];
  if (!ORIGENES_VALIDOS.includes(body.origen) || body.origen === 'Manual') {
    return NextResponse.json({ error: `origen inválido; debe ser uno de: ${ORIGENES_VALIDOS.filter(o => o !== 'Manual').join(', ')}` }, { status: 400 });
  }

  const resultado = await crearDocumento({ ...body, origen: body.origen as Origen });
  if ('error' in resultado) return NextResponse.json(resultado, { status: 400 });
  return NextResponse.json(resultado, { status: 201 });
}

// Cada solicitud corre con el país de la empresa elegida
export const POST = conPaisDeSolicitud(manejarPOST);
