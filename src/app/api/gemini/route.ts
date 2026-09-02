// POST /api/gemini — server-side proxy to Google Gemini.
// Keeps GEMINI_API_KEY server-side only.
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'gemini_not_configured' }, { status: 503 });
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

  const model = typeof body.model === 'string' ? body.model : 'gemini-1.5-flash';

  // Gemini's generateContent expects a `contents` array. We convert the
  // OpenAI-style messages to Gemini's format (system goes into
  // `systemInstruction`, the rest alternates user/model roles).
  const systemInstruction = messages.find((m) => m.role === 'system')?.content;
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const generationConfig: Record<string, unknown> = {};
  if (typeof body.temperature === 'number') generationConfig.temperature = body.temperature;
  if (typeof body.max_tokens === 'number') generationConfig.maxOutputTokens = body.max_tokens;

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
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
      console.error('[gemini] upstream error', upstream.status, text);
      return Response.json(
        { error: 'gemini_upstream_error', status: upstream.status, detail: text.slice(0, 500) },
        { status: upstream.status },
      );
    }

    const data = (await upstream.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

    // Return OpenAI-compatible shape so the client can parse uniformly.
    return Response.json({
      choices: [
        {
          message: { role: 'assistant', content: text },
          finish_reason: 'stop',
        },
      ],
    });
  } catch (err) {
    console.error('[gemini] fetch failed', err);
    return Response.json({ error: 'gemini_unreachable' }, { status: 502 });
  }
}