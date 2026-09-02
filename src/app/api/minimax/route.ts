// POST /api/minimax — server-side proxy to the MiniMax chat API.
// Keeps MINIMAX_API_KEY server-side only.
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.MINIMAX_API_KEY;
  const baseUrl = process.env.MINIMAX_API_BASE_URL ?? 'https://api.minimaxi.chat';
  const path = process.env.MINIMAX_API_PATH ?? '/v1/chat/completions';
  const model = process.env.MINIMAX_MODEL ?? 'MiniMax-Text-01';

  if (!apiKey) {
    return Response.json({ error: 'minimax_not_configured' }, { status: 503 });
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

  const payload: Record<string, unknown> = {
    model: typeof body.model === 'string' ? body.model : model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: Boolean(body.stream),
  };
  if (typeof body.temperature === 'number') payload.temperature = body.temperature;
  if (typeof body.max_tokens === 'number') payload.max_tokens = body.max_tokens;

  try {
    const upstream = await fetch(baseUrl.replace(/\/$/, '') + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      console.error('[minimax] upstream error', upstream.status, text);
      return Response.json(
        { error: 'minimax_upstream_error', status: upstream.status, detail: text.slice(0, 500) },
        { status: upstream.status },
      );
    }

    const data = await upstream.json();
    return Response.json(data);
  } catch (err) {
    console.error('[minimax] fetch failed', err);
    return Response.json({ error: 'minimax_unreachable' }, { status: 502 });
  }
}