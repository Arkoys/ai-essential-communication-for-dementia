/**
 * Shared types and defaults for prompt settings.
 *
 * These exist as a separate, server-only-safe module so the API route
 * (`/api/prompt-settings`) and the legacy client helper can both use them
 * without depending on each other or pulling in firebase code.
 */
import {
  DEFAULT_SUGGESTED_PROMPTS,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_STUCK_MODE_PROMPT,
  DEFAULT_KNOWLEDGE_CONTENT,
  DEFAULT_COACHING_RESOURCE,
} from './promptSettings';

export interface PromptSettingsWire {
  provider: string;
  dualModeProvider: string;
  selectedModel: string;
  dualModeSelectedModel: string;
  systemPrompt: string;
  stuckModePrompt: string;
  suggestedPrompts: string[];
  knowledgeContent: string;
  coachingResource: string;
  responseMode: 'basic' | 'condensed';
}

export function getDefaultPromptSettings(): PromptSettingsWire {
  return {
    provider: 'harvard',
    dualModeProvider: 'minimax',
    selectedModel: 'gpt-4o-mini',
    dualModeSelectedModel: 'MiniMax-Text-01',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    stuckModePrompt: DEFAULT_STUCK_MODE_PROMPT,
    suggestedPrompts: DEFAULT_SUGGESTED_PROMPTS,
    knowledgeContent: DEFAULT_KNOWLEDGE_CONTENT,
    coachingResource: DEFAULT_COACHING_RESOURCE,
    responseMode: 'basic',
  };
}