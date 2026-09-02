// CRUD for conversations backed by Postgres + Drizzle.
import { NextRequest } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { conversations, conversationType } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth-server';

export const runtime = 'nodejs';

const VALID_TYPES = new Set<string>(conversationType.enumValues);

// GET /api/conversations — list current user's conversations, newest first.
export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch (resp) {
    return resp as Response;
  }

  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, user.id))
    .orderBy(desc(conversations.updatedAt));

  return Response.json({ conversations: rows });
}

// POST /api/conversations — create a new conversation for the current user.
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (resp) {
    return resp as Response;
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* allow empty body */
  }

  const title = typeof body.title === 'string' && body.title.trim()
    ? body.title.trim()
    : 'New Consultation';

  const type = typeof body.type === 'string' && VALID_TYPES.has(body.type)
    ? (body.type as 'normal' | 'dual' | 'compare')
    : 'normal';

  const primaryProvider = typeof body.primaryProvider === 'string'
    ? body.primaryProvider
    : null;
  const secondaryProvider = typeof body.secondaryProvider === 'string'
    ? body.secondaryProvider
    : null;

  const id = randomUUID();
  await db.insert(conversations).values({
    id,
    userId: user.id,
    title,
    type,
    primaryProvider,
    secondaryProvider,
  });

  const [row] = await db.select().from(conversations).where(eq(conversations.id, id));
  return Response.json({ conversation: row }, { status: 201 });
}
