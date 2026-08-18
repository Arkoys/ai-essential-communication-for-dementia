/**
 * Classifier - Étape 2 du pipeline
 * 
 * Performs structured LLM classification to determine query type and routing.
 * Supports multiple providers with provider-specific implementation:
 * - OpenAI/Harvard: Uses Structured Outputs (JSON Schema enforcement)
 * - MiniMax: Uses strict prompt + JSON extraction + validation
 * 
 * Results are validated against a schema before being returned.
 */

import { CLASSIFICATION_MATRIX } from './classificationMatrix';
import type { ClassificationResult, ResponsePath, Confidence, QueryTypeId, Tier1 } from './types';

// Provider-specific classification functions
import { classifyWithOpenAI } from './providers/openaiClassifier';
import { classifyWithMinimax } from './providers/minimaxClassifier';

// Provider type for dispatching
export type ClassifierProvider = 'openai' | 'minimax';

interface ClassifierOptions {
  provider: ClassifierProvider;
  conversationHistory?: { role: string; content: string }[];
  maxRetries?: number;
}

/**
 * Main classification function - dispatches to provider-specific implementation
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
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      let result: ClassificationResult;
      
      // Dispatch to provider-specific classifier
      switch (provider) {
        case 'openai':
          result = await classifyWithOpenAI(fullContext);
          break;
        case 'minimax':
          result = await classifyWithMinimax(fullContext);
          break;
        default:
          // Default to MiniMax-style (more compatible)
          result = await classifyWithMinimax(fullContext);
      }
      
      // Validate the result
      if (validateClassificationResult(result)) {
        return result;
      }
      
      // If validation fails, try again
      console.warn(`Classification attempt ${attempt + 1} failed validation, retrying...`);
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Classification error (attempt ${attempt + 1}):`, lastError.message);
    }
  }
  
  // All attempts failed - return fallback
  console.error('Classification failed after retries, using fallback');
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
  
  // Valid query type IDs
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
