/**
 * Provider types and configuration
 */

/**
 * Available AI providers in the application
 */
export type AIProvider = 'minimax' | 'harvard';

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
  minimax: {
    name: 'MiniMax',
    description: 'MiniMax text generation models',
    models: ['MiniMax-Text-01', 'MiniMax-M2.7'],
    requiresApiKey: true,
    supportsStreaming: false,
    isConfigured: Boolean(process.env.MINIMAX_API_KEY),
  },
  harvard: {
    name: 'Harvard HUIT',
    description: 'Harvard\'s OpenAI-compatible gateway (api-key auth)',
    models: ['gpt-4o-mini', 'gpt-4.1', 'gpt-5.5'],
    requiresApiKey: true,
    supportsStreaming: true,
    isConfigured: Boolean(process.env.HARVARD_OPENAI_KEY),
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