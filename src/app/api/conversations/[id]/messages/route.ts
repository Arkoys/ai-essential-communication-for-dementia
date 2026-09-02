import { NextRequest } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { db } from '@/lib/db';
import { conversations, messages, messageRole, messageLane } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth-server';

export const runtime = 'nodejs';

const VALID_ROLES = new Set<string>(messageRole.enumValues);
const VALID_LANES = new Set<string>(messageLane.enumValues);

async function ensureOwned(userId: string, id: string) {
  const [row] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  return row ?? null;
}

// GET /api/conversations/[id]/messages — list messages for a conversation.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch (resp) {
    return resp as Response;
  }

  const { id } = await params;
  const owned = await ensureOwned(user.id, id);
  if (!owned) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  try {
    const rows = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));
    return Response.json({ messages: rows });
  } catch (err) {
    // The schema may not have been migrated yet (no `lane` column).
    // Return a clear, machine-readable error so the UI can surface it,
    // and fall back to listing without the new column so old messages
    // still load instead of returning a raw 500.
    const code = (err as { code?: string }).code;
    if (code === '42703' /* undefined_column */) {
      const client = new Pool({ connectionString: process.env.DATABASE_URL });
      try {
        const result = await client.query<{
          id: string;
          conversation_id: string;
          role: 'user' | 'assistant';
          content: string;
          is_stuck: boolean;
          is_insufficient_info: boolean;
          created_at: Date | string;
        }>(
          `SELECT id, conversation_id, role, content, is_stuck, is_insufficient_info, created_at
             FROM messages
            WHERE conversation_id = $1
            ORDER BY created_at ASC`,
          [id],
        );
        const rows = result.rows.map((r) => ({
          id: r.id,
          conversationId: r.conversation_id,
          role: r.role,
          content: r.content,
          isStuck: r.is_stuck,
          isInsufficientInfo: r.is_insufficient_info,
          lane: 'single' as const,
          createdAt:
            r.created_at instanceof Date
              ? r.created_at.toISOString()
              : String(r.created_at),
        }));
        return Response.json({ messages: rows, warning: 'lane_column_missing' });
      } catch (fallbackErr) {
        console.error('listMessages fallback failed:', fallbackErr);
        return Response.json(
          { error: 'lane_column_missing', migration: 'drizzle/0002_message_lane.sql' },
          { status: 503 },
        );
      } finally {
        await client.end().catch(() => undefined);
      }
    }
    throw err;
  }
}

// POST /api/conversations/[id]/messages — append a message. Bumps conversation updatedAt.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch (resp) {
    return resp as Response;
  }

  const { id } = await params;
  const owned = await ensureOwned(user.id, id);
  if (!owned) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const role = typeof body.role === 'string' && VALID_ROLES.has(body.role)
    ? (body.role as 'user' | 'assistant')
    : null;
  if (!role) {
    return Response.json({ error: 'invalid_role' }, { status: 400 });
  }
  const content = typeof body.content === 'string' ? body.content : '';
  if (!content) {
    return Response.json({ error: 'empty_content' }, { status: 400 });
  }
  const isStuck = Boolean(body.isStuck);
  const isInsufficientInfo = Boolean(body.isInsufficientInfo);
  const clientId = typeof body.clientId === 'string' ? body.clientId : null;
  const lane =
    typeof body.lane === 'string' && VALID_LANES.has(body.lane)
      ? (body.lane as 'single' | 'primary' | 'secondary' | 'basic' | 'condensed')
      : 'single';

  // Idempotency: if a message with the same clientId already exists, return it.
  if (clientId) {
    const [existing] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.conversationId, id), eq(messages.id, clientId)));
    if (existing) {
      return Response.json({ message: existing }, { status: 200 });
    }
  }

  const messageId = clientId ?? randomUUID();
  await db.insert(messages).values({
    id: messageId,
    conversationId: id,
    role,
    content,
    isStuck,
    isInsufficientInfo,
    lane,
  });

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, id));

  const [row] = await db.select().from(messages).where(eq(messages.id, messageId));
  return Response.json({ message: row }, { status: 201 });
}
