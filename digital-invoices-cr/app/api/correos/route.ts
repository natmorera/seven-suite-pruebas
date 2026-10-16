import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = await getDb();
  const { rows } = await db.execute('SELECT * FROM correos ORDER BY fecha DESC');
  return NextResponse.json(rows);
}
