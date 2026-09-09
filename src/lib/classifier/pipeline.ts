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

  // ===== STEP 1.5: Session Pin — once Template 5 has been entered in this
  // conversation, every subsequent turn stays in Template 5 so the four-step
  // coaching dialog (Ground Yourself → Bridge Connection → Explore →
  // Find a Path Forward) plays out turn-by-turn. The only ways out are:
  //   • safety override (Template 6) — already checked above
  //   • explicit user exit ("different case", "start over", "never mind",
  //     "stop", "back to regular", "exit coaching")
  if (isStuckPointsSession(conversationHistory) && !userRequestsExit(userPrompt)) {
    return {
      template: 'assess_template_5' as ResponsePath,
      tier1Complete: true,
      systemPromptAddon: TEMPLATE_SYSTEM_ADDONS.template_5,
      safetyOverride: false,
      fallbackTriggered: false,
      fallbackReason: 'stuck_points_session_pin',
      templateSelection: {
        template: 'assess_template_5' as ResponsePath,
        tier1_complete: true,
        templateInstructions: '',
        systemPromptAddon: TEMPLATE_SYSTEM_ADDONS.template_5,
      },
    };
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

/**
 * Header patterns emitted by the LLM in Stuck Points Mode. If any of these
 * appear in a prior assistant message, the conversation has been "entered"
 * into the Stuck Points Framework coaching dialog and should stay there.
 */
const STUCK_POINTS_HEADER_PATTERNS: RegExp[] = [
  /^#{1,3}\s*Ground Yourself\b/im,
  /^#{1,3}\s*Bridge Connection\b/im,
  /^#{1,3}\s*Explore(\s+Experience)?\b/im,
  /^#{1,3}\s*Find a Path Forward\b/im,
  // Opening intro line — present in the very first response of Stuck Points Mode
  // (e.g. "The Ariadne Labs Stuck Points Framework is meant for exactly this:…").
  /Stuck Points Framework\b/i,
];

/**
 * Has the conversation already entered the Stuck Points Framework?
 * True if any prior assistant message contains one of the framework headers
 * or the framework intro line.
 */
function isStuckPointsSession(
  conversationHistory: { role: string; content: string }[],
): boolean {
  for (const msg of conversationHistory) {
    if (msg.role !== 'assistant') continue;
    const text = (msg.content ?? '').toString();
    for (const pattern of STUCK_POINTS_HEADER_PATTERNS) {
      if (pattern.test(text)) return true;
    }
  }
  return false;
}

/**
 * Patterns that signal the user wants to leave the Stuck Points Framework
 * dialog entirely (so the next turn re-runs the classifier).
 */
const STUCK_POINTS_EXIT_PATTERNS: RegExp[] = [
  /\b(different case|new case|switch (case|patient)|different patient|back to (regular|normal))\b/i,
  /\b(exit coaching|never\s*mind|forget it|stop coaching|end coaching)\b/i,
];

function userRequestsExit(userPrompt: string): boolean {
  const text = (userPrompt ?? '').toString();
  for (const pattern of STUCK_POINTS_EXIT_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}
