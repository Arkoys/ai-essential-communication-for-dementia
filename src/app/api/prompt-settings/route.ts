// GET /api/prompt-settings — load the current user's saved prompt settings.
// Returns defaults if nothing is saved yet.
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { promptSettings } from '@/lib/db/schema';
import { getDefaultPromptSettings, type PromptSettingsWire } from '@/lib/prompt-settings-shared';
import { requireUser } from '@/lib/auth-server';

export const runtime = 'nodejs';

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

  return Response.json({ settings: row ?? null, defaults: getDefaultPromptSettings() });
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

  const merged = { ...getDefaultPromptSettings(), ...body };

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