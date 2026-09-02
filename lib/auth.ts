import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import * as schema from './db/schema';

/**
 * Better Auth instance.
 *
 * Providers:
 *  - Email + password (classic credentials)
 *
 * Requires Postgres + Drizzle tables defined in lib/db/schema.ts.
 *
 * Env vars (server-side only):
 *   BETTER_AUTH_SECRET         random >= 32 chars
 *   BETTER_AUTH_URL            e.g. http://localhost:3000 (dev) or https://ec-dementia-app.ariadnelabs.net
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    requireEmailVerification: false, // flip to true when SMTP is set up
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,       // 7 days
    updateAge: 60 * 60 * 24,           // refresh sliding window every 24h
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  advanced: {
    cookiePrefix: 'dementia-coach',
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  ],
});

export type Auth = typeof auth;
