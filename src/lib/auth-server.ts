/**
 * Server-side auth helpers.
 *
 * Wraps Better Auth's `getSession` so route handlers can do a one-liner:
 *
 *   const user = await requireUser();
 *
 * Throws a 401-shaped Response if the request has no valid session cookie.
 */
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export interface AuthedUser {
  id: string;
  email: string | null;
  name: string | null;
}

export async function getAuthedUser(): Promise<AuthedUser | null> {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
  };
}

export async function requireUser(): Promise<AuthedUser> {
  const user = await getAuthedUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
  return user;
}