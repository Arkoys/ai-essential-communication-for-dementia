import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const conversations = await db.all(
      'SELECT * FROM conversations WHERE userId = ? ORDER BY updatedAt DESC',
      [userId]
    );
    return NextResponse.json(conversations);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, title } = await request.json();
    
    if (!userId || !title) {
      return NextResponse.json({ error: 'Missing userId or title' }, { status: 400 });
    }

    const db = await getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      'INSERT INTO conversations (id, userId, title, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
      [id, userId, title, now, now]
    );

    return NextResponse.json({ id, userId, title, createdAt: now, updatedAt: now });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
