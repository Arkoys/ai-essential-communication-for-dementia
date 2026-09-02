// GET /api/prompt-settings — load the current user's saved prompt settings.
// Returns defaults if nothing is saved yet.
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { promptSettings } from '@/lib/db/schema';
import { getDefaultPromptSettings, type PromptSettingsWire } from '@/lib/prompt-settings-shared';
import { requireUser } from '@/lib/auth-server';

export const runtime = 'nodejs';

// After the MiniMax removal we defensively coerce any stale provider / model
// strings on read. Rows that still carry the old 'minimax' value would
// otherwise fall through the Harvard branch and surface an "unknown
// provider" error from /api/chat. Treated as a no-op once the data is clean.
function normalizeProvider(raw: string | null | undefined): string {
  if (!raw) return 'harvard';
  const lowered = raw.toLowerCase();
  if (lowered === 'minimax') return 'harvard';
  return lowered;
}

function normalizeModel(raw: string | null | undefined): string {
  if (!raw) return 'gpt-5.5';
  if (raw === 'MiniMax-Text-01' || raw === 'MiniMax-M2.7') return 'gpt-5.5';
  return raw;
}

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch (resp) {
    return resp as Response;
  }

  const [row] = await db
    .select()
    .from(promptSettings)
    .where(eq(promptSettings.userId, user.id));

  const normalized = row
    ? {
        ...row,
        provider: normalizeProvider(row.provider),
        dualModeProvider: normalizeProvider(row.dualModeProvider),
        selectedModel: normalizeModel(row.selectedModel),
        dualModeSelectedModel: normalizeModel(row.dualModeSelectedModel),
      }
    : null;

  return Response.json({ settings: normalized, defaults: getDefaultPromptSettings() });
}

// PUT /api/prompt-settings — upsert the current user's prompt settings.
export async function PUT(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (resp) {
    return resp as Response;
  }

  let body: Partial<PromptSettingsWire> = {};
  try {
    body = (await req.json()) as Partial<PromptSettingsWire>;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  // Re-normalize any incoming provider / model fields so a client sending
  // a stale 'minimax' value can't persist it back to the DB.
  const merged: PromptSettingsWire = {
    ...getDefaultPromptSettings(),
    ...body,
    provider: normalizeProvider(body.provider ?? 'harvard'),
    dualModeProvider: normalizeProvider(body.dualModeProvider ?? 'harvard'),
    selectedModel: normalizeModel(body.selectedModel ?? 'gpt-5.5'),
    dualModeSelectedModel: normalizeModel(body.dualModeSelectedModel ?? 'gpt-5.5'),
  };

  await db
    .insert(promptSettings)
    .values({
      userId: user.id,
      provider: merged.provider,
      dualModeProvider: merged.dualModeProvider,
      selectedModel: merged.selectedModel,
      dualModeSelectedModel: merged.dualModeSelectedModel,
      systemPrompt: merged.systemPrompt,
      stuckModePrompt: merged.stuckModePrompt,
      suggestedPrompts: merged.suggestedPrompts,
      knowledgeContent: merged.knowledgeContent,
      coachingResource: merged.coachingResource,
      responseMode: merged.responseMode,
    })
    .onConflictDoUpdate({
      target: promptSettings.userId,
      set: {
        provider: merged.provider,
        dualModeProvider: merged.dualModeProvider,
        selectedModel: merged.selectedModel,
        dualModeSelectedModel: merged.dualModeSelectedModel,
        systemPrompt: merged.systemPrompt,
        stuckModePrompt: merged.stuckModePrompt,
        suggestedPrompts: merged.suggestedPrompts,
        knowledgeContent: merged.knowledgeContent,
        coachingResource: merged.coachingResource,
        responseMode: merged.responseMode,
        updatedAt: new Date(),
      },
    });

  const [row] = await db
    .select()
    .from(promptSettings)
    .where(eq(promptSettings.userId, user.id));

  return Response.json({ settings: row });
}

// DELETE /api/prompt-settings — reset to defaults.
export async function DELETE() {
  let user;
  try {
    user = await requireUser();
  } catch (resp) {
    return resp as Response;
  }

  await db.delete(promptSettings).where(eq(promptSettings.userId, user.id));
  return Response.json({ defaults: getDefaultPromptSettings(), settings: null });
}