// POST /api/rag-search — server-side RAG retrieval.
// Accepts a query string, returns the top-K most similar knowledge chunks.
// Embedding is generated server-side; pgvector isn't queried directly
// (the corpus is small enough to scan in memory).
import { NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { knowledgeChunks, ragConfig } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth-server';

export const runtime = 'nodejs';

const DEFAULT_TOP_K = 4;
const DEFAULT_MIN_SIMILARITY = 0.6;
const EMBED_DIM = 768; // text-embedding-004 / gemini-embedding-2-preview

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (resp) {
    return resp as Response;
  }

  let body: { query?: string; topK?: number; minSimilarity?: number } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  if (!query) {
    return Response.json({ chunks: [] });
  }

  // Load per-user config (or defaults).
  const [cfg] = await db.select().from(ragConfig).where(eq(ragConfig.userId, user.id));
  const topK = Number.isFinite(body.topK)
    ? Number(body.topK)
    : cfg?.topK ?? DEFAULT_TOP_K;
  const minSimilarity = Number.isFinite(body.minSimilarity)
    ? Number(body.minSimilarity)
    : cfg?.minSimilarity
      ? Number(cfg.minSimilarity)
      : DEFAULT_MIN_SIMILARITY;

  // Generate embedding server-side.
  const queryEmbedding = await generateServerEmbedding(query);
  if (!queryEmbedding || queryEmbedding.length === 0) {
    return Response.json({ chunks: [] });
  }

  // Pull all chunks. We embed once and rank in memory — fine for the small
  // (<200 chunk) toolkit. For larger corpora switch to pgvector's `<=>` op.
  const rows = await db
    .select({
      id: knowledgeChunks.id,
      source: knowledgeChunks.source,
      content: knowledgeChunks.content,
      embedding: knowledgeChunks.embedding,
    })
    .from(knowledgeChunks);

  const scored = rows
    .map((row) => {
      const emb = toFloatArray(row.embedding);
      if (!emb || emb.length !== EMBED_DIM) return null;
      const sim = cosineSimilarity(queryEmbedding, emb);
      return { id: row.id, source: row.source, content: row.content, similarity: sim };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null && c.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return Response.json({ chunks: scored });
}

function toFloatArray(value: unknown): number[] | null {
  if (!value) return null;
  // pgvector comes back as a JSON-ish array string when the driver
  // serializes it. Handle both shapes.
  if (Array.isArray(value)) return value as number[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as number[]) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

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
  if (!res.ok) return null;
  const json = (await res.json()) as { embedding?: { values?: number[] } };
  return json.embedding?.values ?? null;
}