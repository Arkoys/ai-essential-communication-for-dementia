/**
 * OpenAI/Structured Outputs Classifier
 * 
 * Uses OpenAI's Structured Outputs feature for reliable JSON enforcement.
 * This is the most reliable method for getting structured data from LLMs.
 */

import type { ClassificationResult } from '../types';
import { CLASSIFICATION_MATRIX } from '../classificationMatrix';

// The JSON Schema for structured outputs - defines the exact output format
const CLASSIFICATION_SCHEMA = {
  type: "object",
  properties: {
    query_type_id: {
      type: "string",
      enum: CLASSIFICATION_MATRIX.queryTypes.map(qt => qt.id)
    },
    query_type_label: { type: "string" },
    in_scope: { type: "boolean" },
    tier1: {
      type: "object",
      additionalProperties: false,
      properties: {
        age_present: { type: "boolean" },
        symptom_present: { type: "boolean" },
        duration_present: { type: "boolean" }
      },
      required: ["age_present", "symptom_present", "duration_present"]
    },
    tier1_complete: { type: "boolean" },
    response_path: {
      type: "string",
      enum: [
        "assess_template_1_or_3",
        "direct_template_2",
        "direct_template_4",
        "assess_template_5",
        "delirium_flag",
        "out_of_scope"
      ]
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"]
    },
    reasoning: { 
      type: ["string", "null"]
    },
    missing_elements: {
      type: ["array", "null"],
      items: { type: "string" }
    },
    requires_clarification: { type: "boolean" }
  },
  required: [
    "query_type_id",
    "query_type_label",
    "in_scope",
    "tier1",
    "tier1_complete",
    "response_path",
    "confidence",
    "reasoning",
    "missing_elements",
    "requires_clarification"
  ],
  additionalProperties: false
};

// System prompt for classification
const SYSTEM_PROMPT = `You are a clinical query classifier for a dementia care support tool.

CLASSIFICATION TASK:
Analyze the clinician's prompt and classify it according to the provided categories.

TIER 1 ELEMENTS (minimum required for patient-specific guidance):
- age: Does the prompt mention the patient's age?
- symptom: Does the prompt describe cognitive/behavioral symptoms?
- duration: Does the prompt mention how long symptoms have been present?

QUERY TYPES (pick the most appropriate):
${CLASSIFICATION_MATRIX.queryTypes.map(qt => 
  `- ${qt.id}: ${qt.label} - ${qt.definition}`
).join('\n')}

RULES:
1. If any tier1 element is missing for a patient-specific query, tier1_complete = false
2. educational/conceptual questions about dementia (not patient-specific) → direct_template_2
3. relational/emotional challenges (family conflict, patient denial, ethics) → assess_template_5
4. differential diagnosis, result interpretation, referral, therapeutics → direct_template_4
5. out of scope (unrelated to dementia) → out_of_scope
6. If uncertain, set confidence = "low" and requires_clarification = true

OUTPUT FORMAT:
Return ONLY valid JSON matching the specified schema. No additional text.`;

/**
 * Classify using OpenAI Structured Outputs
 */
export async function classifyWithOpenAI(
  context: string
): Promise<ClassificationResult> {
  // Build the user message with context
  const userMessage = `CLASSIFY THIS PROMPT:

${context}

Respond with classification in JSON format.`;

  // Call the LLM with structured outputs
  // Note: This requires the OpenAI provider to support response_format parameter
  const response = await callLLMWithStructuredOutput(userMessage);
  
  return response;
}

/**
 * Call LLM with structured output support
 * This integrates with the existing harvard provider or direct OpenAI
 */
async function callLLMWithStructuredOutput(
  userMessage: string
): Promise<ClassificationResult> {
  // Try using the Harvard provider's structured output support
  try {
    const response = await callHarvardStructuredOutput(userMessage);
    return response;
  } catch (error) {
    console.error('OpenAI structured output failed:', error);
    throw error;
  }
}

/**
 * Call Harvard provider with structured output (OpenAI-compatible)
 */
async function callHarvardStructuredOutput(
  userMessage: string
): Promise<ClassificationResult> {
  // Use the Harvard OpenAI-compatible endpoint
  const apiBaseUrl = import.meta.env.VITE_API_PROXY_URL || '/api';
  
  const response = await fetch(`${apiBaseUrl}/harvard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Use mini for faster classification
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'classification_result',
          strict: true,
          schema: CLASSIFICATION_SCHEMA
        }
      },
      temperature: 0.1, // Low temperature for consistent classification
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Harvard API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  
  // Parse the response content as JSON
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content in response');
  }

  try {
    return JSON.parse(content) as ClassificationResult;
  } catch {
    throw new Error('Failed to parse classification result as JSON');
  }
}

/**
 * Validate that a result matches expected schema (for extra safety)
 */
export function validateOpenAIResult(result: unknown): result is ClassificationResult {
  if (!result || typeof result !== 'object') return false;
  
  const r = result as Record<string, unknown>;
  
  // Check required fields
  if (typeof r.query_type_id !== 'string') return false;
  if (typeof r.in_scope !== 'boolean') return false;
  if (typeof r.tier1 !== 'object') return false;
  if (typeof r.response_path !== 'string') return false;
  if (typeof r.confidence !== 'string') return false;
  
  // Validate tier1 structure
  const tier1 = r.tier1 as Record<string, unknown>;
  return (
    typeof tier1.age_present === 'boolean' &&
    typeof tier1.symptom_present === 'boolean' &&
    typeof tier1.duration_present === 'boolean'
  );
}
