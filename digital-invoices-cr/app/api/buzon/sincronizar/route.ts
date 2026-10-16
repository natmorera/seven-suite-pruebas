import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sincronizar } from '@/lib/buzon';

export const maxDuration = 120;

export async function POST() {
  return NextResponse.json(await sincronizar(await getDb()));
}
