'use client';

/**
 * Classifier Module - Unified Export
 * 
 * Entry point for the classification pipeline.
 * Coordinates: Safety Pre-Filter → Classification → Template Selection
 */

// Types
export * from './types';

// Classification functions
export { checkSafetyPreFilter, quickSafetyCheck, getSafetyRulesVersion } from './safetyPreFilter';
export { classifyPrompt, quickClassify, logClassification, type ClassifierProvider } from './classifier';

// Template selection
export { selectTemplate, getTemplateSystemPrompt, getTemplateDisplayName } from './templateSelector';

// Pipeline orchestration
export { 
  runClassificationPipeline, 
  quickPipelineCheck, 
  buildSystemPrompt, 
  getFallbackNotificationMessage,
  type PipelineConfig,
  type PipelineResult,
  type PipelineError
} from './pipeline';

// Template instructions
export { TEMPLATE_INSTRUCTIONS, TEMPLATE_SYSTEM_ADDONS } from '../templates';

// Re-export templates
import * as templates from '../templates';
export { templates };
