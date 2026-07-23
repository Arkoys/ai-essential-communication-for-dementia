/**
 * Classification Types for the Dementia Clinical Coach
 * These types define the structure of the classification pipeline
 */

// Tier 1 elements - minimum required information for patient-specific guidance
export interface Tier1Elements {
  age_present: boolean;
  symptom_present: boolean;
  duration_present: boolean;
}

export interface Tier1 {
  age_present: boolean;
  symptom_present: boolean;
  duration_present: boolean;
}

// Query types from the classification matrix
export type QueryTypeId =
  | 'initial_assessment'
  | 'diagnosis_process'
  | 'workup_planning'
  | 'management'
  | 'safety_assessment'
  | 'language_recommendation'
  | 'conceptual_educational'
  | 'differential_diagnosis'
  | 'result_interpretation'
  | 'referral_decision'
  | 'therapeutics'
  | 'relational_challenges'
  | 'unrelated_to_dementia';

// Response path - determines which template to use
export type ResponsePath =
  | 'assess_template_1_or_3'
  | 'direct_template_2'
  | 'direct_template_4'
  | 'assess_template_5'
  | 'delirium_flag'
  | 'out_of_scope';

export type Confidence = 'high' | 'medium' | 'low';

export interface SafetyCheckResult {
  isOverride: boolean;
  reason?: string;
  notificationLevel?: 'info' | 'warning' | 'urgent';
  requiresTemplate?: ResponsePath;
}

// Classification result from the LLM classifier
export interface ClassificationResult {
  query_type_id: QueryTypeId;
  query_type_label: string;
  in_scope: boolean;
  tier1: Tier1;
  tier1_complete: boolean;
  response_path: ResponsePath;
  confidence: Confidence;
  reasoning?: string;
  missing_elements?: string[];
  requires_clarification?: boolean;
}

// Template selection result
export interface TemplateSelection {
  template: ResponsePath;
  tier1_complete: boolean;
  templateInstructions: string;
  systemPromptAddon: string;
}

// Safety pre-filter result
export interface SafetyPreFilterResult {
  shouldOverride: boolean;
  template?: ResponsePath;
  alertLevel?: 'info' | 'warning' | 'urgent';
  reason?: string;
  suggestedResponse?: string;
}

// Evaluation set item for testing
export interface EvalItem {
  id: string;
  prompt: string;
  expected_path: ResponsePath;
  expected_tier1_complete: boolean;
  notes?: string;
  category?: QueryTypeId;
}

// Classification log entry for audit
export interface ClassificationLog {
  timestamp: string;
  conversation_id: string;
  user_prompt: string;
  safety_result: SafetyPreFilterResult | null;
  classification_result: ClassificationResult | null;
  template_selected: ResponsePath | null;
  fallback_triggered: boolean;
  fallback_reason?: string;
}
