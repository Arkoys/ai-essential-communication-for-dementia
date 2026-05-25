/**
 * Harvard HUIT OpenAI Direct v2 Provider
 * 
 * Uses Harvard's OpenAI-compatible gateway with api-key header authentication.
 * All secrets are kept server-side only via environment variables.
 * 
 * PRODUCTION: Uses Netlify Function proxy to avoid CORS issues.
 * DEVELOPMENT: Uses local proxy server or direct API call.
 */

const HARVARD_API_KEY = process.env.HARVARD_OPENAI_KEY || '';
const HARVARD_BASE_URL = process.env.HARVARD_OPENAI_BASE_URL || 'https://go.apis.huit.harvard.edu/ais-openai-direct/v2/';

// API base URL - uses proxy in production to avoid CORS
const API_BASE_URL = import.meta.env.VITE_API_PROXY_URL || '/api';

/**
 * Generate chat completion using Harvard gateway via proxy.
 * Uses Netlify Function proxy in production to avoid CORS issues.
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
  // Use proxy URL for both development and production
  const proxyUrl = `${API_BASE_URL}/harvard`;

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        model,
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens,
        stream: options?.stream ?? false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Harvard Provider] API error:', response.status, errorData);
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error: unknown) {
    // Log server-side only - never expose to client
    console.error('[Harvard Provider] Chat completion failed:', error);
    
    // Provide user-friendly error messages without exposing internal details
    if (error && typeof error === 'object') {
      const errorMessage = (error as { message?: string }).message || '';
      if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('Invalid API key')) {
        throw new Error('Invalid API key. Please check your Harvard API configuration.');
      }
      if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
        throw new Error('Harvard gateway temporarily unavailable. Please try again.');
      }
    }
    throw new Error('Failed to generate response from Harvard provider.');
  }
}

/**
 * Generate response using Harvard's Responses API (preferred for new features).
 * Uses Netlify Function proxy in production to avoid CORS issues.
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
  // Use proxy URL for both development and production
  const proxyUrl = `${API_BASE_URL}/harvardResponses`;

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input,
        model,
        instructions: options?.instructions,
        temperature: options?.temperature ?? 0.2,
        stream: options?.stream ?? false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Harvard Provider] Responses API error:', response.status, errorData);
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();

  } catch (error: unknown) {
    console.error('[Harvard Provider] Responses API failed:', error);
    throw new Error('Failed to generate response from Harvard provider.');
  }
}

/**
 * Check if Harvard provider is configured and available.
 * Note: Configuration is done server-side via Netlify environment variables.
 */
export function isHarvardConfigured(): boolean {
  // Provider is configured when the proxy is accessible
  // Actual API key check happens server-side
  return true;
}
