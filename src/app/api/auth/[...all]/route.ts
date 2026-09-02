import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Wrap Better Auth's handlers so we get a useful error log instead of a bare 500.
// Without this, a thrown error inside Better Auth (e.g. missing DB column,
// wrong env) surfaces to the browser as "500 Internal Server Error" with no
// body, which makes diagnosis painful.
const handler = toNextJsHandler(auth.handler);

export async function POST(req: NextRequest) {
  try {
    return await handler.POST(req);
  } catch (err) {
    console.error('[auth] POST error:', err);
    return NextResponse.json(
      {
        error: 'auth_error',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    return await handler.GET(req);
  } catch (err) {
    console.error('[auth] GET error:', err);
    return NextResponse.json(
      {
        error: 'auth_error',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
