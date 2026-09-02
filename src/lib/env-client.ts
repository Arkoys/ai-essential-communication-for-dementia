'use client';

/**
 * Server-side env vars are used directly by the /api/* proxies.
 *
 * This file is kept as a thin shim so legacy imports (`import { CLIENT_ENV }
 * from '../env-client'`) keep compiling. The values are always empty —
 * `isConfigured` checks elsewhere should be treated as "depends on server
 * env, not client".
 */
export const CLIENT_ENV = {
  LLM_PROVIDER: 'harvard',
  GEMINI_API_KEY: '',
  MINIMAX_API_KEY: '',
  MINIMAX_MODEL: '',
  MINIMAX_API_BASE_URL: '',
  MINIMAX_API_PATH: '',
  HARVARD_OPENAI_KEY: '',
  HARVARD_OPENAI_BASE_URL: '',
  HARVARD_MODEL: 'gpt-4o-mini',
};
