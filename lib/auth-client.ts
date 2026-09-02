'use client';

import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  // Same-origin by default; override here only if you proxy Better Auth elsewhere.
  baseURL:
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL,
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

/**
 * Client-side admin check.
 *
 * The server-side check (`lib/admin.ts`) is the source of truth and is what
 * actually protects `/api/knowledge-chunks`. This client helper exists so the
 * UI can decide whether to show the AdminPanel button without round-tripping
 * to the server.
 *
 * The allowlist comes from the `NEXT_PUBLIC_ADMIN_EMAILS` build-time env var
 * (comma-separated). If it's empty, only users whose DB row has `is_admin=true`
 * are treated as admins. We bake the env list into the bundle at build time so
 * no secrets leak — emails only.
 */
const ADMIN_EMAILS_PUBLIC = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
const adminSet = new Set(ADMIN_EMAILS_PUBLIC);

/**
 * Returns true if the given email is in the admin allowlist. Pass null safely.
 * Pure email-based check (no session object needed).
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminSet.has(email.trim().toLowerCase());
}

/**
 * `session` shape mirrors what `useSession()` returns from Better Auth.
 */
export function isAdminFromSession(
  session: { user?: { email?: string | null; isAdmin?: boolean | null } } | null | undefined,
): boolean {
  if (!session?.user) return false;
  if (session.user.isAdmin === true) return true;
  return isAdminEmail(session.user.email);
}


