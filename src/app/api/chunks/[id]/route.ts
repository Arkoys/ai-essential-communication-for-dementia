import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const db = await getDb();
    const { id } = params;

    await db.run('DELETE FROM knowledge_chunks WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
