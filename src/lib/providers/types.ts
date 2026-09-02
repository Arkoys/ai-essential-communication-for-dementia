'use client';

import { CLIENT_ENV } from '../env-client';

/**
 * Provider types and configuration
 */

/**
 * Available AI providers in the application.
 *
 * As of the post-MiniMax-removal migration, Harvard HUIT is the sole
 * supported provider. The union is kept for forward compatibility and to
 * avoid breaking legacy imports; treat any value other than `'harvard'` as
 * "unsupported".
 */
export type AIProvider = 'harvard';

/**
 * Configuration for each provider
 */
export interface ProviderConfig {
  name: string;
  description: string;
  models: string[];
  requiresApiKey: boolean;
  supportsStreaming: boolean;
  isConfigured: boolean;
}

/**
 * Provider registry with metadata
 */
export const PROVIDER_REGISTRY: Record<AIProvider, ProviderConfig> = {
  harvard: {
    name: 'Harvard HUIT',
    description: "Harvard's OpenAI-compatible gateway (api-key auth)",
    models: ['gpt-5.5', 'gpt-4o-mini', 'gpt-4.1', 'gpt-5.4-mini', 'gpt-5.4-nano'],
    requiresApiKey: true,
    supportsStreaming: true,
    isConfigured: Boolean(CLIENT_ENV.HARVARD_OPENAI_KEY),
  },
};

/**
 * Get all available providers
 */
export function getAvailableProviders(): ProviderConfig[] {
  return Object.values(PROVIDER_REGISTRY).filter(p => p.isConfigured);
}

/**
 * Get provider config by name
 */
export function getProviderConfig(provider: AIProvider): ProviderConfig | undefined {
  return PROVIDER_REGISTRY[provider];
}