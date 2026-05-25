/**
 * AI Provider exports
 * 
 * Central exports for all AI providers.
 * Add new providers here to keep imports clean.
 */

export { 
  createHarvardClient, 
  getHarvardClient, 
  harvardChatCompletion, 
  harvardResponsesAPI,
  isHarvardConfigured 
} from './harvard';

// Re-export types for convenience
export type { ProviderConfig, AIProvider } from './types';