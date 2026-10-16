import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { leerProvincias } from '@/lib/catalogosBase';

// División territorial (provincia › cantón › distrito) guardada en la base
export async function GET() {
  return NextResponse.json(await leerProvincias(await getDb()));
}
