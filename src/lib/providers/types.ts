/**
 * Provider types and configuration
 */

/**
 * Available AI providers in the application
 */
export type AIProvider = 'gemini' | 'minimax' | 'harvard';

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
  gemini: {
    name: 'Google Gemini',
    description: 'Google\'s Gemini models via Vertex AI',
    models: ['gemini-3.1-pro-preview', 'gemini-2.5-pro-preview'],
    requiresApiKey: true,
    supportsStreaming: true,
    isConfigured: Boolean(process.env.GEMINI_API_KEY),
  },
  minimax: {
    name: 'MiniMax',
    description: 'MiniMax text generation models',
    models: ['MiniMax-Text-01'],
    requiresApiKey: true,
    supportsStreaming: false,
    isConfigured: Boolean(process.env.MINIMAX_API_KEY),
  },
  harvard: {
    name: 'Harvard HUIT',
    description: 'Harvard\'s OpenAI-compatible gateway (api-key auth)',
    models: ['gpt-4o-mini', 'gpt-4.1'],
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