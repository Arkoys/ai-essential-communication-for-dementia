'use client';

/**
 * Template Selector - Étape 3a du pipeline
 * 
 * Determines which template to use based on classification result.
 * Handles the assess_template_1_or_3 split (Template 1 vs 3 based on tier1_complete).
 */

import type { ClassificationResult, ResponsePath, TemplateSelection } from './types';
import { TEMPLATE_INSTRUCTIONS, TEMPLATE_SYSTEM_ADDONS } from '../templates';

/**
 * Select the appropriate template based on classification result
 */
export function selectTemplate(
  classification: ClassificationResult,
  safetyOverride: boolean = false
): TemplateSelection {
  // Safety override takes precedence
  if (safetyOverride && classification.response_path !== 'delirium_flag') {
    return {
      template: 'delirium_flag',
      tier1_complete: false,
      templateInstructions: TEMPLATE_INSTRUCTIONS.delirium_flag,
      systemPromptAddon: TEMPLATE_SYSTEM_ADDONS.delirium_flag
    };
  }

  const { response_path, tier1_complete, in_scope } = classification;

  // Handle out of scope
  if (!in_scope || response_path === 'out_of_scope') {
    return {
      template: 'out_of_scope',
      tier1_complete: false,
      templateInstructions: TEMPLATE_INSTRUCTIONS.out_of_scope,
      systemPromptAddon: TEMPLATE_SYSTEM_ADDONS.out_of_scope
    };
  }

  // Handle assess_template_1_or_3 split
  if (response_path === 'assess_template_1_or_3') {
    if (tier1_complete) {
      return {
        template: 'template_3',
        tier1_complete: true,
        templateInstructions: TEMPLATE_INSTRUCTIONS.template_3,
        systemPromptAddon: TEMPLATE_SYSTEM_ADDONS.template_3
      };
    } else {
      return {
        template: 'template_1',
        tier1_complete: false,
        templateInstructions: TEMPLATE_INSTRUCTIONS.template_1,
        systemPromptAddon: TEMPLATE_SYSTEM_ADDONS.template_1
      };
    }
  }

  // Direct template mappings
  const templateMap: Record<ResponsePath, string> = {
    'direct_template_2': 'template_2',
    'direct_template_4': 'template_4',
    'assess_template_5': 'template_5',
    'delirium_flag': 'template_6',
    'out_of_scope': 'out_of_scope',
    'assess_template_1_or_3': 'template_1' // Fallback
  };

  const templateKey = templateMap[response_path] || 'template_1';

  return {
    template: response_path,
    tier1_complete,
    templateInstructions: TEMPLATE_INSTRUCTIONS[templateKey as keyof typeof TEMPLATE_INSTRUCTIONS] || TEMPLATE_INSTRUCTIONS.template_1,
    systemPromptAddon: TEMPLATE_SYSTEM_ADDONS[templateKey as keyof typeof TEMPLATE_SYSTEM_ADDONS] || ''
  };
}

/**
 * Get the system prompt addon for a specific template
 */
export function getTemplateSystemPrompt(template: ResponsePath | string): string {
  const addons: Record<string, string> = {
    'template_1': TEMPLATE_SYSTEM_ADDONS.template_1,
    'template_2': TEMPLATE_SYSTEM_ADDONS.template_2,
    'template_3': TEMPLATE_SYSTEM_ADDONS.template_3,
    'template_4': TEMPLATE_SYSTEM_ADDONS.template_4,
    'template_5': TEMPLATE_SYSTEM_ADDONS.template_5,
    'template_6': TEMPLATE_SYSTEM_ADDONS.template_6,
    'delirium_flag': TEMPLATE_SYSTEM_ADDONS.delirium_flag,
    'out_of_scope': TEMPLATE_SYSTEM_ADDONS.out_of_scope,
    'assess_template_1_or_3': TEMPLATE_SYSTEM_ADDONS.template_1
  };
  
  return addons[template] || '';
}

/**
 * Get template name for display
 */
export function getTemplateDisplayName(template: ResponsePath | string): string {
  const names: Record<string, string> = {
    'template_1': 'Template 1 - In-Scope Insufficient Information → Clarifying Response',
    'template_2': 'Template 2 - Out of Scope Conceptual Query → Redirect',
    'template_3': 'Template 3 - Guidance Complète',
    'template_4': 'Template 4 - Out of Scope → Redirect',
    'template_5': 'Template 5 - Stuck Points Framework',
    'template_6': 'Template 6 - Delirium Flag',
    'delirium_flag': 'Delirium Flag',
    'out_of_scope': 'Out of Scope',
    'assess_template_1_or_3': 'Assessment (Tier1 pending)'
  };
  
  return names[template] || template;
}
