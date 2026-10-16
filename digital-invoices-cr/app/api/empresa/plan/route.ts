import { NextResponse } from 'next/server';
import { configPlan } from '@/lib/plan';

export async function GET() {
  return NextResponse.json(configPlan());
}
