import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerEmpresa, guardarEmpresa } from '@/lib/empresa';

export async function GET() {
  return NextResponse.json(await leerEmpresa(await getDb()));
}

export async function PUT(req: NextRequest) {
  const b = await req.json();
  const fe = b.facturacionElectronica;
  return NextResponse.json(await guardarEmpresa(await getDb(), {
    datos: b.datos,
    facturacionElectronica: fe === 'si' || fe === 'no' ? fe : undefined,
  }));
}
