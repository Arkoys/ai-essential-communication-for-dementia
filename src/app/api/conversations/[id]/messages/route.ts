import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { generateClinicalResponseWithHistory } from '@/lib/llm';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb();
    const { id } = await params;

    const messages = await db.all(
      'SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC',
      [id]
    );

    return NextResponse.json(messages);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { content, currentPhase } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    const db = await getDb();
    const now = new Date().toISOString();

    // 1. Add User Message
    const userMsgId = uuidv4();
    await db.run(
      'INSERT INTO messages (id, conversationId, role, content, createdAt) VALUES (?, ?, ?, ?, ?)',
      [userMsgId, id, 'user', content, now]
    );

    // 2. Fetch History
    const history = await db.all(
      'SELECT role, content FROM messages WHERE conversationId = ? ORDER BY createdAt ASC',
      [id]
    );

    // 3. Generate LLM Response (Server-side)
    const responseText = await generateClinicalResponseWithHistory(content, history, currentPhase);

    // 4. Add Assistant Message
    const assistantMsgId = uuidv4();
    const assistantNow = new Date().toISOString();
    await db.run(
      'INSERT INTO messages (id, conversationId, role, content, createdAt) VALUES (?, ?, ?, ?, ?)',
      [assistantMsgId, id, 'assistant', responseText, assistantNow]
    );

    // 5. Update Conversation updatedAt
    await db.run(
      'UPDATE conversations SET updatedAt = ? WHERE id = ?',
      [assistantNow, id]
    );

    return NextResponse.json({ 
      userMessage: { id: userMsgId, role: 'user', content, createdAt: now },
      assistantMessage: { id: assistantMsgId, role: 'assistant', content: responseText, createdAt: assistantNow }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
