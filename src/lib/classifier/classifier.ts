'use client';

/**
 * Classifier - Étape 2 du pipeline
 *
 * Performs structured LLM classification to determine query type and routing.
 * Uses OpenAI Structured Outputs (JSON Schema enforcement) via the Harvard
 * HUIT gateway. Results are validated against a schema before being returned.
 */

import { CLASSIFICATION_MATRIX } from './classificationMatrix';
import type { ClassificationResult, ResponsePath, Confidence, QueryTypeId, Tier1 } from './types';

// Provider-specific classification functions
import { classifyWithOpenAI } from './providers/openaiClassifier';

// Provider type for dispatching. Only 'openai' is supported after the
// MiniMax removal; the union is kept so legacy call sites keep compiling.
export type ClassifierProvider = 'openai';

interface ClassifierOptions {
  provider: ClassifierProvider;
  conversationHistory?: { role: string; content: string }[];
  maxRetries?: number;
}

/**
 * Main classification function - dispatches to the OpenAI provider.
 *
 * The former prompt-based MiniMax fallback path has been removed: Harvard
 * Structured Outputs is the sole implementation. If the OpenAI call fails,
 * the error propagates and the pipeline falls back to its static Template 1
 * fallback (see `pipeline.ts`).
 */
export async function classifyPrompt(
  userPrompt: string,
  conversationHistory: { role: string; content: string }[] = [],
  provider: ClassifierProvider = 'openai'
): Promise<ClassificationResult> {
  const maxRetries = 1;

  // Build the full context for classification
  const fullContext = buildClassificationContext(userPrompt, conversationHistory);

  let lastError: Error | null = null;
  let lastRawResult: unknown = null;

  // Track the provider we actually used so we can log it on the fallback path.
  let attemptedProvider: ClassifierProvider = provider;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result: ClassificationResult = await classifyWithOpenAI(fullContext);
      attemptedProvider = 'openai';

      // Validate the result
      if (validateClassificationResult(result)) {
        return result;
      }

      // If validation fails, try again — but log the raw payload so the actual
      // reason for rejection is visible (not just "validation failed").
      lastRawResult = result;
      console.warn(
        `Classification attempt ${attempt + 1} failed validation, retrying...`,
        { provider: attemptedProvider, rawResult: result }
      );

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Classification error (attempt ${attempt + 1}):`, lastError);
    }
  }

  // All attempts failed - return fallback.
  // Log the underlying cause so debugging doesn't require reproducing the request.
  console.error('Classification failed after retries, using fallback', {
    configuredProvider: provider,
    attemptedProvider,
    lastError: lastError?.message,
    lastRawResult,
  });
  return createFallbackResult();
}

/**
 * Build full context for classification including conversation history
 */
function buildClassificationContext(
  currentPrompt: string,
  history: { role: string; content: string }[]
): string {
  const historyContext = history
    .slice(-6) // Last 6 messages for context
    .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n\n');
  
  return `CONVERSATION HISTORY:
${historyContext || '(No previous messages)'}

CURRENT PROMPT:
${currentPrompt}`;
}

/**
 * Validate classification result against expected schema
 */
function validateClassificationResult(result: unknown): result is ClassificationResult {
  if (!result || typeof result !== 'object') return false;
  
  const r = result as Record<string, unknown>;
  
  // Required fields
  if (typeof r.query_type_id !== 'string') return false;
  if (typeof r.in_scope !== 'boolean') return false;
  if (typeof r.tier1 !== 'object' || r.tier1 === null) return false;
  if (typeof r.response_path !== 'string') return false;
  if (typeof r.confidence !== 'string') return false;
  
  // Tier1 structure
  const tier1 = r.tier1 as Record<string, unknown>;
  if (typeof tier1.age_present !== 'boolean') return false;
  if (typeof tier1.symptom_present !== 'boolean') return false;
  if (typeof tier1.duration_present !== 'boolean') return false;
  
  // Valid enum values
  const validPaths: ResponsePath[] = [
    'assess_template_1_or_3', 'direct_template_2', 'direct_template_4',
    'assess_template_5', 'delirium_flag', 'out_of_scope'
  ];
  if (!validPaths.includes(r.response_path as ResponsePath)) return false;

  const validConfidences: Confidence[] = ['high', 'medium', 'low'];
  if (!validConfidences.includes(r.confidence as Confidence)) return false;

  // Valid query type IDs — derived from the dynamic matrix so newly added
  // query types don't trip validation.
  const validQueryTypes = CLASSIFICATION_MATRIX.queryTypes.map(qt => qt.id);
  if (!validQueryTypes.includes(r.query_type_id as QueryTypeId)) return false;

  return true;
}

/**
 * Create fallback result when classification fails
 */
function createFallbackResult(): ClassificationResult {
  const fallback = CLASSIFICATION_MATRIX.classificationPrompt.fallbackResponse;
  return {
    query_type_id: fallback.query_type_id as QueryTypeId,
    query_type_label: fallback.query_type_label as string,
    in_scope: fallback.in_scope as boolean,
    tier1: fallback.tier1 as Tier1,
    tier1_complete: fallback.tier1_complete as boolean,
    response_path: fallback.response_path as ResponsePath,
    confidence: fallback.confidence as Confidence,
    reasoning: fallback.reasoning as string,
    missing_elements: fallback.missing_elements as string[],
    requires_clarification: fallback.requires_clarification as boolean
  };
}

/**
 * Quick classification for simple prompts (without LLM call)
 * Uses rule-based detection for common patterns
 */
export function quickClassify(userPrompt: string): ClassificationResult | null {
  const normalized = userPrompt.toLowerCase();
  
  // Check for conceptual/educational keywords
  const educationalKeywords = [
    'what is', 'what are', 'how does', 'define', 'definition',
    'difference between', 'explain', 'criteria', 'staging', 'administer'
  ];
  
  if (educationalKeywords.some(kw => normalized.includes(kw))) {
    return {
      query_type_id: 'conceptual_educational',
      query_type_label: 'Conceptual / Educational / Standard Protocols',
      in_scope: true,
      tier1: { age_present: false, symptom_present: false, duration_present: false },
      tier1_complete: false,
      response_path: 'direct_template_2',
      confidence: 'high',
      reasoning: 'Rule-based detection: educational keyword pattern'
    };
  }
  
  // Check for relational/emotional keywords
  const relationalKeywords = [
    'family', 'deny', 'doesn\'t believe', 'lying', 'ethic', 'dilemma',
    'caregiver', 'burnout', 'conflict', 'frustrated', 'alone'
  ];
  
  if (relationalKeywords.some(kw => normalized.includes(kw))) {
    return {
      query_type_id: 'relational_challenges',
      query_type_label: 'Relational Challenges / Emotional Stuck Point',
      in_scope: true,
      tier1: { age_present: false, symptom_present: false, duration_present: false },
      tier1_complete: true,
      response_path: 'assess_template_5',
      confidence: 'high',
      reasoning: 'Rule-based detection: relational keyword pattern'
    };
  }
  
  // Check for score/interpretation patterns
  const scorePatterns = [
    /moca.*\d+/i, /mmse.*\d+/i, /score.*\d+/i, /\d+.*moca/i, /\d+.*mmse/i
  ];
  
  if (scorePatterns.some(pattern => pattern.test(normalized))) {
    return {
      query_type_id: 'result_interpretation',
      query_type_label: 'Result Interpretation',
      in_scope: true,
      tier1: { age_present: false, symptom_present: false, duration_present: false },
      tier1_complete: false,
      response_path: 'direct_template_4',
      confidence: 'high',
      reasoning: 'Rule-based detection: score interpretation pattern'
    };
  }
  
  // No quick match - return null to trigger LLM classification
  return null;
}

/**
 * Log classification for audit purposes
 */
export interface ClassificationLogEntry {
  timestamp: string;
  userPrompt: string;
  conversationId?: string;
  classificationResult: ClassificationResult;
  safetyOverride: boolean;
  finalTemplate: ResponsePath;
  provider: ClassifierProvider;
}

export function logClassification(entry: ClassificationLogEntry): void {
  // In production, this would send to a logging service
  console.log('[Classification Log]', JSON.stringify(entry, null, 2));
}
