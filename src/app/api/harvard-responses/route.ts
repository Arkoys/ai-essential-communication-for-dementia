// POST /api/harvard-responses — server-side proxy to Harvard Responses API.
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

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

  const input = typeof body.input === 'string' ? body.input : '';
  if (!input) {
    return Response.json({ error: 'missing_input' }, { status: 400 });
  }
  const model = typeof body.model === 'string' ? body.model : 'gpt-4.1';
  const stream = Boolean(body.stream);

  const payload: Record<string, unknown> = { input, model, stream };
  if (typeof body.instructions === 'string') payload.instructions = body.instructions;
  if (typeof body.temperature === 'number') payload.temperature = body.temperature;

  try {
    const upstream = await fetch(baseUrl.replace(/\/$/, '') + '/responses', {
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
