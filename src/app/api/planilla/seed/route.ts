import { NextResponse } from 'next/server';
import { seedDemoData } from '@/lib/planilla/seed';

export async function POST() {
  try {
    const result = await seedDemoData();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: 'Error seeding data', details: String(err) },
      { status: 500 },
    );
  }
}
