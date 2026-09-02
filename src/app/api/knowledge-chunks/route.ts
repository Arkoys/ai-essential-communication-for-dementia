// GET /api/knowledge-chunks — list all knowledge chunks (RAG corpus).
// POST /api/knowledge-chunks — create a new chunk with a generated embedding.
import { NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { knowledgeChunks } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth-server';
import { isAdminEmail } from '@/lib/admin';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireUser();
  } catch (resp) {
    return resp as Response;
  }

  const rows = await db
    .select({
      id: knowledgeChunks.id,
      source: knowledgeChunks.source,
      content: knowledgeChunks.content,
      createdAt: knowledgeChunks.createdAt,
    })
    .from(knowledgeChunks)
    .orderBy(sql`${knowledgeChunks.source} ASC`);

  return Response.json({ chunks: rows });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (resp) {
    return resp as Response;
  }

  // Only admins can create chunks — checked at API boundary.
  if (!isAdminEmail(user.email)) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: { source?: string; content?: string; embedding?: number[] } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const source = typeof body.source === 'string' ? body.source.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!source || !content) {
    return Response.json({ error: 'missing_source_or_content' }, { status: 400 });
  }

  // Server-side embedding generation. Caller can pass a pre-computed
  // embedding (e.g. from the client) to skip the API call here.
  let embedding: number[] | null = Array.isArray(body.embedding) ? body.embedding : null;
  if (!embedding) {
    try {
      embedding = await generateServerEmbedding(content);
    } catch (err) {
      console.warn('[knowledge-chunks] server embedding failed:', err);
    }
  }

  const id = randomUUID();
  await db.insert(knowledgeChunks).values({
    id,
    source,
    content,
    // pgvector: drizzle's vector() helper accepts a plain number[].
    embedding: embedding ?? null,
  });

  return Response.json({ chunk: { id, source, content, embedding } }, { status: 201 });
}

// DELETE /api/knowledge-chunks?id=<uuid> — delete a chunk. Admin only.
export async function DELETE(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (resp) {
    return resp as Response;
  }

  if (!isAdminEmail(user.email)) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return Response.json({ error: 'missing_id' }, { status: 400 });
  }

  await db.delete(knowledgeChunks).where(sql`id = ${id}`);
  return Response.json({ ok: true });
}

/**
 * Server-side embedding using Gemini (text-embedding-004). We do this here
 * so the client never needs the GEMINI_API_KEY. Falls back to null on
 * failure — chunks without an embedding are skipped by RAG retrieval.
 */
async function generateServerEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text }] },
    }),
  });
  if (!res.ok) {
    console.warn('[knowledge-chunks] embedding HTTP', res.status);
    return null;
  }
  const json = (await res.json()) as { embedding?: { values?: number[] } };
  return json.embedding?.values ?? null;
}