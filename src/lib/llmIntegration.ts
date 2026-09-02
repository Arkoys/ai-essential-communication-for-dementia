'use client';

/**
 * Integration layer for the classification pipeline
 * 
 * This file provides the integration between the existing LLM system
 * and the new classification pipeline.
 */

import {
  runClassificationPipeline,
  buildSystemPrompt,
  getFallbackNotificationMessage,
  type PipelineResult,
  type ClassifierProvider
} from './classifier/pipeline';

import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_KNOWLEDGE_CONTENT,
  getPromptSettings
} from './promptSettings';

import { generateClinicalResponseWithHistory } from './llm';

/**
 * Process a user message through the classification pipeline and generate response
 */
export async function processWithClassification(
  userPrompt: string,
  conversationHistory: { role: string; content: string }[],
  currentPhase: string | null,
  provider: ClassifierProvider = 'openai',
  isStuck: boolean = false
): Promise<{
  response: string;
  pipelineResult: PipelineResult;
  notification: { message: string; type: 'info' | 'warning' | 'error' } | null;
}> {
  // Run the classification pipeline
  const pipelineResult = await runClassificationPipeline(
    userPrompt,
    conversationHistory,
    provider,
    { skipLLM: isStuck } // Skip LLM classification in stuck mode
  );

  // Build the system prompt with template addon
  const promptSettings = await getPromptSettings();
  const basePrompt = isStuck 
    ? promptSettings.stuckModePrompt || DEFAULT_SYSTEM_PROMPT
    : promptSettings.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  
  const fullSystemPrompt = buildSystemPrompt(basePrompt, pipelineResult.systemPromptAddon);

  // Generate response using the existing LLM function
  let response: string;
  
  try {
    response = await generateClinicalResponseWithHistory(
      userPrompt,
      conversationHistory,
      currentPhase,
      isStuck,
      provider
    );
  } catch (error) {
    console.error('Response generation failed:', error);
    response = 'I apologize, but I encountered an error generating a response. Please try again.';
  }

  // Build notification if fallback was triggered
  let notification: { message: string; type: 'info' | 'warning' | 'error' } | null = null;
  
  if (pipelineResult.fallbackTriggered) {
    notification = getFallbackNotificationMessage(pipelineResult.fallbackReason);
  }

  return {
    response,
    pipelineResult,
    notification
  };
}

/**
 * Quick check for template selection (without generating response)
 * Useful for previewing or debugging
 */
export async function previewTemplate(
  userPrompt: string,
  conversationHistory: { role: string; content: string }[] = [],
  provider: ClassifierProvider = 'openai'
): Promise<PipelineResult> {
  return runClassificationPipeline(userPrompt, conversationHistory, provider);
}
