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
