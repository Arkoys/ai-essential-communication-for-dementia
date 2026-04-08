import { NextResponse } from 'next/server';
import { getRagConfig, saveRagConfig } from '@/lib/rag';

export async function GET() {
  try {
    const config = await getRagConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const config = await request.json();
    await saveRagConfig(config);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
