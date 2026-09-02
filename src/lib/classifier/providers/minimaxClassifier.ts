'use client';

import { CLIENT_ENV } from '../../env-client';

/**
 * MiniMax Classifier
 *
 * Uses strict prompt engineering + JSON extraction + validation.
 * MiniMax doesn't support Structured Outputs, so we use a different approach:
 * 1. Very explicit prompt with examples
 * 2. Extract JSON from response using regex
 * 3. Validate against schema
 * 4. Retry if validation fails
 */

import type { ClassificationResult } from '../types';
import { CLASSIFICATION_MATRIX } from '../classificationMatrix';

// System prompt for MiniMax classification (more explicit due to no structured output support)
const SYSTEM_PROMPT = `You are a clinical query classifier for a dementia care support tool.
Your task is to classify the clinician's prompt and return ONLY valid JSON.

CLASSIFICATION RULES:

TIER 1 ELEMENTS:
- age_present: Does the prompt mention patient's age (e.g., "72 years old", "elderly")?
- symptom_present: Does the prompt describe cognitive/behavioral symptoms (memory loss, confusion)?
- duration_present: Does the prompt mention how long symptoms have been present?

QUERY TYPE IDS (use EXACTLY these values):
${CLASSIFICATION_MATRIX.queryTypes.map(qt => 
  `- ${qt.id}`
).join('\n')}

RESPONSE PATHS (use EXACTLY these values):
- assess_template_1_or_3: For assessment guidance (when tier1 needed/complete)
- direct_template_2: For educational/conceptual questions
- direct_template_4: For differential diagnosis, results, referrals, therapeutics
- assess_template_5: For relational/emotional challenges
- delirium_flag: For acute deterioration in diagnosed dementia
- out_of_scope: For questions unrelated to dementia

EXAMPLES:

Input: "What is Lewy Body dementia?"
Output: {"query_type_id":"conceptual_educational","query_type_label":"Conceptual / Educational / Standard Protocols","in_scope":true,"tier1":{"age_present":false,"symptom_present":false,"duration_present":false},"tier1_complete":false,"response_path":"direct_template_2","confidence":"high","reasoning":"Educational question about dementia type","missing_elements":[],"requires_clarification":false}

Input: "My 75-year-old patient has had memory problems for 6 months, getting worse. What should I do?"
Output: {"query_type_id":"initial_assessment","query_type_label":"Initial Assessment Guidance","in_scope":true,"tier1":{"age_present":true,"symptom_present":true,"duration_present":true},"tier1_complete":true,"response_path":"assess_template_1_or_3","confidence":"high","reasoning":"All tier1 elements present, initial assessment question","missing_elements":[],"requires_clarification":false}

Input: "The family is fighting about care decisions"
Output: {"query_type_id":"relational_challenges","query_type_label":"Relational Challenges / Emotional Stuck Point","in_scope":true,"tier1":{"age_present":false,"symptom_present":false,"duration_present":false},"tier1_complete":true,"response_path":"assess_template_5","confidence":"high","reasoning":"Relational challenge, no tier1 needed","missing_elements":[],"requires_clarification":false}

CRITICAL: Return ONLY the JSON object. No markdown, no explanation, no text before or after.`;

/**
 * Classify using MiniMax with prompt-based approach
 */
export async function classifyWithMinimax(
  context: string
): Promise<ClassificationResult> {
  const userMessage = `CLASSIFY THIS:

${context}

Return JSON only.`;

  // Call MiniMax API
  const result = await callMinimaxAPI(userMessage);
  
  // Extract and validate JSON
  const extracted = extractJSON(result);
  
  if (!extracted) {
    throw new Error('Failed to extract valid JSON from MiniMax response');
  }
  
  return extracted;
}

/**
 * Call MiniMax API
 */
async function callMinimaxAPI(userMessage: string): Promise<string> {
  const apiKey = CLIENT_ENV.MINIMAX_API_KEY;
  const apiBase = CLIENT_ENV.MINIMAX_API_BASE_URL;
  const apiPath = CLIENT_ENV.MINIMAX_API_PATH;
  
  if (!apiKey) {
    throw new Error('MiniMax API key not configured');
  }

  const response = await fetch(`${apiBase}${apiPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'MiniMax-Text-01',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MiniMax API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  
  // Extract content from MiniMax response
  return data.choices?.[0]?.message?.content || 
         data.reply ||
         data.output_text ||
         '';
}

/**
 * Extract JSON from response text
 * Handles cases where model adds markdown code blocks or extra text
 */
function extractJSON(text: string): ClassificationResult | null {
  if (!text) return null;
  
  // Try direct parse first
  try {
    const parsed = JSON.parse(text);
    if (isValidClassificationResult(parsed)) {
      return parsed;
    }
  } catch {
    // Continue to extraction
  }
  
  // Extract from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (isValidClassificationResult(parsed)) {
        return parsed;
      }
    } catch {
      // Continue
    }
  }
  
  // Try to find JSON object pattern
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (isValidClassificationResult(parsed)) {
        return parsed;
      }
    } catch {
      // Continue
    }
  }
  
  return null;
}

/**
 * Validate classification result structure
 */
function isValidClassificationResult(result: unknown): result is ClassificationResult {
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
  
  // Valid values check
  const validPaths = [
    'assess_template_1_or_3', 'direct_template_2', 'direct_template_4',
    'assess_template_5', 'delirium_flag', 'out_of_scope'
  ];
  if (!validPaths.includes(r.response_path as string)) return false;
  
  const validConfidences = ['high', 'medium', 'low'];
  if (!validConfidences.includes(r.confidence as string)) return false;
  
  return true;
}
