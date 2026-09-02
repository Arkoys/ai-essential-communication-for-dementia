'use client';

/**
 * Classification Pipeline - Main Orchestration
 * 
 * This module orchestrates the full classification pipeline:
 * Step 1: Safety Pre-Filter
 * Step 2: LLM Classification  
 * Step 3: Template Selection
 * 
 * Usage:
 * ```typescript
 * import { runClassificationPipeline } from './pipeline';
 * 
 * const result = await runClassificationPipeline(
 *   userPrompt,
 *   conversationHistory,
 *   provider
 * );
 * ```
 */

import {
  checkSafetyPreFilter,
  classifyPrompt,
  selectTemplate,
  quickClassify,
  quickSafetyCheck,
  type ClassifierProvider,
  type ClassificationResult,
  type SafetyPreFilterResult,
  type TemplateSelection,
  type ResponsePath
} from './index';

import { TEMPLATE_SYSTEM_ADDONS } from '../templates';

export interface PipelineConfig {
  /** Provider to use for LLM classification */
  provider: ClassifierProvider;
  /** Skip LLM classification (use only quick/rule-based) */
  skipLLM?: boolean;
  /** Max retries for classification */
  maxRetries?: number;
}

export interface PipelineResult {
  /** The selected template */
  template: ResponsePath;
  /** Whether tier1 was complete */
  tier1Complete: boolean;
  /** Template system prompt addon */
  systemPromptAddon: string;
  /** Safety override was triggered */
  safetyOverride: boolean;
  /** Classification result (if available) */
  classification?: ClassificationResult;
  /** Safety check result */
  safetyResult?: SafetyPreFilterResult;
  /** Whether fallback was used */
  fallbackTriggered: boolean;
  /** Reason for fallback if applicable */
  fallbackReason?: string;
  /** Template selection result */
  templateSelection?: TemplateSelection;
}

export interface PipelineError {
  type: 'classification_failed' | 'safety_failed' | 'unknown';
  message: string;
  fallbackTemplate: ResponsePath;
}

/**
 * Run the full classification pipeline
 * 
 * @param userPrompt - The current user prompt
 * @param conversationHistory - Previous messages in the conversation
 * @param provider - LLM provider to use
 * @param config - Optional pipeline configuration
 */
export async function runClassificationPipeline(
  userPrompt: string,
  conversationHistory: { role: string; content: string }[] = [],
  provider: ClassifierProvider = 'openai',
  config?: Partial<PipelineConfig>
): Promise<PipelineResult> {
  const skipLLM = config?.skipLLM ?? false;
  
  // ===== STEP 1: Safety Pre-Filter =====
  const safetyResult = checkSafetyPreFilter(conversationHistory, userPrompt);
  
  if (safetyResult.shouldOverride && safetyResult.template) {
    // Safety override takes precedence
    return {
      template: safetyResult.template,
      tier1Complete: false,
      systemPromptAddon: TEMPLATE_SYSTEM_ADDONS.delirium_flag,
      safetyOverride: true,
      safetyResult,
      fallbackTriggered: false,
      templateSelection: {
        template: safetyResult.template,
        tier1_complete: false,
        templateInstructions: '',
        systemPromptAddon: TEMPLATE_SYSTEM_ADDONS.delirium_flag
      }
    };
  }

  // ===== STEP 2: Try Quick Classification =====
  if (skipLLM) {
    const quickResult = quickClassify(userPrompt);
    if (quickResult) {
      const templateSelection = selectTemplate(quickResult, false);
      return {
        template: templateSelection.template,
        tier1Complete: templateSelection.tier1_complete,
        systemPromptAddon: templateSelection.systemPromptAddon,
        safetyOverride: false,
        classification: quickResult,
        fallbackTriggered: false,
        templateSelection
      };
    }
  }

  // ===== STEP 2 (full): LLM Classification =====
  let classification: ClassificationResult;
  let fallbackTriggered = false;
  let fallbackReason: string | undefined;

  try {
    classification = await classifyPrompt(
      userPrompt,
      conversationHistory,
      provider
    );
  } catch (error) {
    console.error('Classification failed:', error);
    fallbackTriggered = true;
    fallbackReason = error instanceof Error ? error.message : 'Unknown error';
    
    // Use fallback classification
    classification = {
      query_type_id: 'initial_assessment',
      query_type_label: 'Initial Assessment Guidance',
      in_scope: true,
      tier1: { age_present: false, symptom_present: false, duration_present: false },
      tier1_complete: false,
      response_path: 'assess_template_1_or_3',
      confidence: 'low',
      reasoning: 'Fallback due to classification failure',
      missing_elements: ['age', 'symptom', 'duration'],
      requires_clarification: true
    };
  }

  // ===== STEP 3: Template Selection =====
  const templateSelection = selectTemplate(classification, false);

  // ===== Handle Low Confidence =====
  if (classification.confidence === 'low') {
    fallbackTriggered = true;
    fallbackReason = `Low confidence (${classification.confidence})`;
  }

  // ===== Return Final Result =====
  return {
    template: templateSelection.template,
    tier1Complete: templateSelection.tier1_complete,
    systemPromptAddon: templateSelection.systemPromptAddon,
    safetyOverride: false,
    classification,
    safetyResult,
    fallbackTriggered,
    fallbackReason,
    templateSelection
  };
}

/**
 * Quick pipeline check without LLM (for previews/fast paths)
 */
export function quickPipelineCheck(
  userPrompt: string
): { template: ResponsePath; confidence: 'high' | 'low' } {
  // Quick safety check
  const safety = quickSafetyCheck(userPrompt);
  if (safety.shouldOverride) {
    return { template: 'delirium_flag', confidence: 'high' };
  }

  // Quick classification
  const quick = quickClassify(userPrompt);
  if (quick) {
    return {
      template: quick.response_path as ResponsePath,
      confidence: quick.confidence as 'high' | 'low'
    };
  }

  // Default
  return { template: 'assess_template_1_or_3', confidence: 'low' };
}

/**
 * Build the full system prompt with template addon
 */
export function buildSystemPrompt(
  basePrompt: string,
  templateAddon: string
): string {
  return `${basePrompt}\n\n${templateAddon}`;
}

/**
 * Get notification message for fallback
 */
export function getFallbackNotificationMessage(
  reason?: string
): { message: string; type: 'info' | 'warning' | 'error' } {
  if (reason?.includes('Low confidence')) {
    return {
      message: 'Showing general guidance — please provide more specific details',
      type: 'warning'
    };
  }
  
  if (reason?.includes('classification failed') || reason?.includes('Unknown error')) {
    return {
      message: 'Unable to fully analyze — showing standard guidance',
      type: 'info'
    };
  }
  
  return {
    message: 'Showing guidance based on available information',
    type: 'info'
  };
}
