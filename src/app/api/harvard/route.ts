// POST /api/harvard — server-side proxy to Harvard HUIT OpenAI gateway.
// Keeps HARVARD_OPENAI_KEY server-side only.
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const NO_TEMP_MODELS = new Set(['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano']);

export async function POST(req: NextRequest) {
  const apiKey = process.env.HARVARD_OPENAI_KEY;
  const baseUrl =
    process.env.HARVARD_OPENAI_BASE_URL ?? 'https://go.apis.huit.harvard.edu/ais-openai-direct/v2/';
  if (!apiKey) {
    return Response.json({ error: 'harvard_not_configured' }, { status: 503 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const messages = Array.isArray(body.messages)
    ? (body.messages as ChatMessage[]).filter(
        (m) => m && typeof m.content === 'string' && (m.role === 'system' || m.role === 'user' || m.role === 'assistant'),
      )
    : null;
  if (!messages || messages.length === 0) {
    return Response.json({ error: 'invalid_messages' }, { status: 400 });
  }

  const model = typeof body.model === 'string' ? body.model : 'gpt-4o-mini';
  const supportsTemp = !NO_TEMP_MODELS.has(model);
  const stream = Boolean(body.stream);

  const payload: Record<string, unknown> = {
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    model,
    stream,
  };
  if (supportsTemp) payload.temperature = typeof body.temperature === 'number' ? body.temperature : 0.2;
  if (typeof body.max_tokens === 'number') payload.max_tokens = body.max_tokens;

  // Forward Structured Outputs / JSON-mode constraints so the upstream gateway
  // can enforce the schema. Without it, gpt-4o-mini returns free-form prose and
  // the client-side JSON.parse in classifyWithOpenAI throws, leading to a
  // "Classification failed after retries" fallback in the browser console.
  if (body.response_format && typeof body.response_format === 'object') {
    payload.response_format = body.response_format;
  }

  try {
    const upstream = await fetch(baseUrl.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      console.error('[harvard] upstream error', upstream.status, text);
      return Response.json(
        { error: 'harvard_upstream_error', status: upstream.status, detail: text.slice(0, 500) },
        { status: upstream.status },
      );
    }

    const data = await upstream.json();
    return Response.json(data);
  } catch (err) {
    console.error('[harvard] fetch failed', err);
    return Response.json({ error: 'harvard_unreachable' }, { status: 502 });
  }
}