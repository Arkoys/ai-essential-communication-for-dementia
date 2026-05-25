/**
 * Harvard HUIT OpenAI Direct v2 Provider
 * 
 * Uses Harvard's OpenAI-compatible gateway with api-key header authentication.
 * All secrets are kept server-side only via environment variables.
 */

import OpenAI from 'openai';

// Harvard gateway configuration
const HARVARD_API_KEY = process.env.HARVARD_OPENAI_KEY || '';
const HARVARD_BASE_URL = process.env.HARVARD_OPENAI_BASE_URL || 'https://go.apis.huit.harvard.edu/ais-openai-direct/v2/';

/**
 * Create Harvard OpenAI client with custom authentication.
 * Uses api-key header instead of Bearer token.
 */
export function createHarvardClient(): OpenAI | null {
  if (!HARVARD_API_KEY) {
    console.warn('[Harvard Provider] HARVARD_OPENAI_KEY is not set. Harvard provider unavailable.');
    return null;
  }

  return new OpenAI({
    apiKey: HARVARD_API_KEY,
    baseURL: HARVARD_BASE_URL,
    defaultHeaders: {
      'api-key': HARVARD_API_KEY,
    },
    timeout: 60000, // 60 second timeout
    maxRetries: 2,
    // Allow browser usage since API keys are managed via environment variables
    // and already bundled by Vite (consistent with existing Gemini/MiniMax approach)
    dangerouslyAllowBrowser: true,
  });
}

// Singleton instance
let harvardClientInstance: OpenAI | null = null;

export function getHarvardClient(): OpenAI | null {
  if (!harvardClientInstance) {
    harvardClientInstance = createHarvardClient();
  }
  return harvardClientInstance;
}

/**
 * Generate chat completion using Harvard gateway.
 * Supports streaming for real-time responses.
 */
export async function harvardChatCompletion(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  model: string = 'gpt-4o-mini',
  options?: {
    temperature?: number;
    stream?: boolean;
    maxTokens?: number;
  }
) {
  const client = getHarvardClient();
  
  if (!client) {
    throw new Error('Harvard client not initialized. Check HARVARD_OPENAI_KEY environment variable.');
  }

  try {
    // Convert messages to OpenAI-compatible format
    const openAIMessages = messages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
    }));

    const response = await client.chat.completions.create({
      model,
      messages: openAIMessages,
      temperature: options?.temperature ?? 0.2,
      stream: options?.stream ?? false,
      max_tokens: options?.maxTokens,
    });

    return response;
  } catch (error: unknown) {
    // Log server-side only - never expose to client
    console.error('[Harvard Provider] Chat completion failed:', error);
    
    // Provide user-friendly error messages without exposing internal details
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      if (status === 401 || status === 403) {
        throw new Error('Invalid API key. Please check your Harvard API configuration.');
      }
      if (status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (status === 500 || status === 502 || status === 503) {
        throw new Error('Harvard gateway temporarily unavailable. Please try again.');
      }
    }
    throw new Error('Failed to generate response from Harvard provider.');
  }
}

/**
 * Generate response using Harvard's Responses API (preferred for new features).
 * Supports streaming for real-time responses.
 */
export async function harvardResponsesAPI(
  input: string,
  model: string = 'gpt-4.1',
  options?: {
    temperature?: number;
    stream?: boolean;
    instructions?: string;
  }
) {
  const client = getHarvardClient();
  
  if (!client) {
    throw new Error('Harvard client not initialized. Check HARVARD_OPENAI_KEY environment variable.');
  }

  try {
    const response = await client.responses.create({
      model,
      input,
      instructions: options?.instructions,
      temperature: options?.temperature ?? 0.2,
      stream: options?.stream ?? false,
    });

    return response;
  } catch (error: unknown) {
    // Log server-side only - never expose to client
    console.error('[Harvard Provider] Responses API failed:', error);
    
    // Provide user-friendly error messages
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      if (status === 401 || status === 403) {
        throw new Error('Invalid API key. Please check your Harvard API configuration.');
      }
      if (status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (status === 500 || status === 502 || status === 503) {
        throw new Error('Harvard gateway temporarily unavailable. Please try again.');
      }
    }
    throw new Error('Failed to generate response from Harvard provider.');
  }
}

/**
 * Check if Harvard provider is configured and available.
 */
export function isHarvardConfigured(): boolean {
  return Boolean(HARVARD_API_KEY && HARVARD_BASE_URL);
}