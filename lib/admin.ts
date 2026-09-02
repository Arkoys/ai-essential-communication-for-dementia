/**
 * Admin gating helpers.
 *
 * Admins are listed in the `ADMIN_EMAILS` server env var as a comma-separated
 * list (case-insensitive, whitespace-tolerant). Example:
 *
 *   ADMIN_EMAILS=alice@example.com,bob@example.com
 *
 * Used to gate endpoints that mutate knowledge chunks (RAG corpus). The client
 * also checks `isAdmin` from the session to decide whether to render the
 * AdminPanel — see `App.tsx` and `lib/auth-client.ts`.
 *
 * Server-only — do not import this from client components.
 */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const adminSet = new Set(ADMIN_EMAILS);

/**
 * Returns true if the given email is in the admin allowlist. Pass null safely.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminSet.has(email.trim().toLowerCase());
}

/**
 * Read-only view of the admin list. Useful for logging.
 */
export function getAdminEmails(): string[] {
  return ADMIN_EMAILS.slice();
}

