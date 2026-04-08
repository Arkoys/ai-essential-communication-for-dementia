import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { generateEmbedding } from '@/lib/rag';

export async function GET() {
  try {
    const db = await getDb();
    const chunks = await db.all('SELECT id, source, content FROM knowledge_chunks');
    return NextResponse.json(chunks);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { content, source } = await request.json();
    if (!content || !source) {
      return NextResponse.json({ error: 'Missing content or source' }, { status: 400 });
    }

    const db = await getDb();
    const id = uuidv4();
    const embedding = await generateEmbedding(content);

    await db.run(
      'INSERT INTO knowledge_chunks (id, source, content, embedding) VALUES (?, ?, ?, ?)',
      [id, source, content, JSON.stringify(embedding)]
    );

    return NextResponse.json({ id, source, content });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
