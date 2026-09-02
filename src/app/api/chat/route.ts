// Phase 1b: server-side proxy for LLM chat completions.
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const NO_TEMP_MODELS = new Set(['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano']);

export async function POST(req: NextRequest) {
  let body: { provider?: unknown; model?: unknown; messages?: unknown; temperature?: unknown; max_tokens?: unknown; stream?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
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

  // Normalize legacy 'minimax' values to 'harvard' for backward compatibility.
  const rawProvider = (body.provider as string) ?? process.env.LLM_PROVIDER ?? 'harvard';
  const provider = rawProvider.toLowerCase() === 'minimax' ? 'harvard' : rawProvider.toLowerCase();
  const model = typeof body.model === 'string' ? body.model : undefined;
  const temperature = typeof body.temperature === 'number' ? body.temperature : 0.2;
  const maxTokens = typeof body.max_tokens === 'number' ? body.max_tokens : undefined;
  const stream = Boolean(body.stream);

  switch (provider) {
    case 'harvard':
      return forwardToHarvard(messages, model, temperature, maxTokens, stream);
    case 'gemini':
      return forwardToGemini(messages, model, temperature, maxTokens, stream);
    default:
      return Response.json({ error: 'unknown_provider', provider }, { status: 400 });
  }
}

async function forwardToHarvard(
  messages: ChatMessage[],
  model: string | undefined,
  temperature: number,
  maxTokens: number | undefined,
  stream: boolean,
) {
  const apiKey = process.env.HARVARD_OPENAI_KEY;
  const baseUrl =
    process.env.HARVARD_OPENAI_BASE_URL ?? 'https://go.apis.huit.harvard.edu/ais-openai-direct/v2/';
  if (!apiKey) return Response.json({ error: 'harvard_not_configured' }, { status: 503 });

  const m = model ?? process.env.HARVARD_MODEL ?? 'gpt-5.5';
  const payload: Record<string, unknown> = { messages, model: m, stream };
  if (!NO_TEMP_MODELS.has(m)) payload.temperature = temperature;
  if (maxTokens) payload.max_tokens = maxTokens;

  try {
    const upstream = await fetch(baseUrl.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify(payload),
    });
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return Response.json(
        { error: 'harvard_upstream_error', status: upstream.status, detail: text.slice(0, 500) },
        { status: upstream.status },
      );
    }
    return Response.json(await upstream.json());
  } catch {
    return Response.json({ error: 'harvard_unreachable' }, { status: 502 });
  }
}

async function forwardToGemini(
  messages: ChatMessage[],
  model: string | undefined,
  temperature: number,
  maxTokens: number | undefined,
  stream: boolean,
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return Response.json({ error: 'gemini_not_configured' }, { status: 503 });

  const m = model ?? 'gemini-1.5-flash';
  const systemInstruction = messages.find((msg) => msg.role === 'system')?.content;
  const contents = messages
    .filter((msg) => msg.role !== 'system')
    .map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
  const generationConfig: Record<string, unknown> = { temperature };
  if (maxTokens) generationConfig.maxOutputTokens = maxTokens;

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
          generationConfig,
        }),
      },
    );
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return Response.json(
        { error: 'gemini_upstream_error', status: upstream.status, detail: text.slice(0, 500) },
        { status: upstream.status },
      );
    }
    const data = (await upstream.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    return Response.json({
      choices: [{ message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
    });
  } catch {
    return Response.json({ error: 'gemini_unreachable' }, { status: 502 });
  }
}
