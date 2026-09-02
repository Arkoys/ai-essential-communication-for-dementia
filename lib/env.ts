/**
 * Server-side environment variable validation.
 * Throws on import if required vars are missing — fail fast at startup.
 *
 * Import this from any server-only file (Route Handlers, server actions,
 * lib/auth.ts, scripts/migrate.ts) to guarantee the env is configured.
 */
import { z } from 'zod';

const ServerEnv = z.object({
  // Postgres
  DATABASE_URL: z.string().url(),

  // Better Auth
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),

  // Node env
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type ServerEnv = z.infer<typeof ServerEnv>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = ServerEnv.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Invalid server environment variables:\n${issues}\n\n` +
        `Check your .env.local or Docker environment.`,
    );
  }
  cached = parsed.data;
  return cached;
}
