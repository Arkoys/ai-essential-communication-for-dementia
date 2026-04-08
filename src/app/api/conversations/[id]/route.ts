import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb();
    const { id } = await params;

    await db.run('DELETE FROM messages WHERE conversationId = ?', [id]);
    await db.run('DELETE FROM conversations WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
