// GET /api/rag-config — load current user's RAG config (top-k, threshold, enabled).
// Returns defaults if nothing is saved.
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ragConfig } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth-server';

export const runtime = 'nodejs';

const DEFAULT_RAG_CONFIG = {
  topK: 4,
  minSimilarity: '0.6',
  enabled: true,
};

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch (resp) {
    return resp as Response;
  }

  const [row] = await db.select().from(ragConfig).where(eq(ragConfig.userId, user.id));
  return Response.json({
    config: row ?? null,
    defaults: DEFAULT_RAG_CONFIG,
  });
}

// PUT /api/rag-config — upsert current user's RAG config.
export async function PUT(req: Request) {
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
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const topK = Number.isFinite(body.topK) ? Math.max(1, Math.min(50, Number(body.topK))) : DEFAULT_RAG_CONFIG.topK;
  const minSimilarity =
    typeof body.minSimilarity === 'string' ? body.minSimilarity : DEFAULT_RAG_CONFIG.minSimilarity;
  const enabled = typeof body.enabled === 'boolean' ? body.enabled : DEFAULT_RAG_CONFIG.enabled;

  await db
    .insert(ragConfig)
    .values({
      userId: user.id,
      topK,
      minSimilarity,
      enabled,
    })
    .onConflictDoUpdate({
      target: ragConfig.userId,
      set: {
        topK,
        minSimilarity,
        enabled,
        updatedAt: new Date(),
      },
    });

  const [row] = await db.select().from(ragConfig).where(eq(ragConfig.userId, user.id));
  return Response.json({ config: row });
}