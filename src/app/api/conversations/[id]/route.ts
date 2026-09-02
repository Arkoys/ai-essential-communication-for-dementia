import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { conversations } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth-server';

export const runtime = 'nodejs';

async function loadOwnedConversation(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  return row ?? null;
}

// GET /api/conversations/[id] — fetch a single conversation owned by the user.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch (resp) {
    return resp as Response;
  }

  const { id } = await params;
  const row = await loadOwnedConversation(user.id, id);
  if (!row) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }
  return Response.json({ conversation: row });
}

// PATCH /api/conversations/[id] — update mutable fields. Bumps updatedAt.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch (resp) {
    return resp as Response;
  }

  const { id } = await params;
  const existing = await loadOwnedConversation(user.id, id);
  if (!existing) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim();
  if (typeof body.currentPhase === 'string' || body.currentPhase === null) {
    patch.currentPhase = body.currentPhase;
  }
  if (typeof body.currentStep === 'string' || body.currentStep === null) {
    patch.currentStep = body.currentStep;
  }
  if (typeof body.lastDetectedPhase === 'string' || body.lastDetectedPhase === null) {
    patch.lastDetectedPhase = body.lastDetectedPhase;
  }
  if (typeof body.primaryProvider === 'string' || body.primaryProvider === null) {
    patch.primaryProvider = body.primaryProvider;
  }
  if (typeof body.secondaryProvider === 'string' || body.secondaryProvider === null) {
    patch.secondaryProvider = body.secondaryProvider;
  }

  await db.update(conversations).set(patch).where(eq(conversations.id, id));
  const [row] = await db.select().from(conversations).where(eq(conversations.id, id));
  return Response.json({ conversation: row });
}

// DELETE /api/conversations/[id] — delete the conversation and its messages (cascade).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch (resp) {
    return resp as Response;
  }

  const { id } = await params;
  const existing = await loadOwnedConversation(user.id, id);
  if (!existing) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  await db.delete(conversations).where(eq(conversations.id, id));
  return Response.json({ ok: true });
}
