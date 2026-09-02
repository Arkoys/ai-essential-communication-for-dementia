'use client';

/**
 * Safety Pre-Filter - Étape 1 du pipeline
 * 
 * Detects potential delirium or acute cognitive deterioration in diagnosed dementia patients.
 * This filter runs BEFORE any LLM classification call.
 * Rules are loaded from safetyRules.json for clinical team maintainability.
 */

import safetyRules from '../../config/safetyRules.json';
import type { SafetyPreFilterResult } from './types';

interface SafetyRuleConfig {
  version: string;
  lastUpdated: string;
  deliriumIndicators: {
    acuteKeywords: string[];
    confusionKeywords: string[];
    timelinePatterns: string[];
  };
  dementiaIndicators: {
    diagnosticKeywords: string[];
    contextPatterns: string[];
  };
  timeThresholdDays: number;
  responseTemplate: string;
  warningMessage: string;
  notificationLevel: 'info' | 'warning' | 'urgent';
}

const config = safetyRules as SafetyRuleConfig;

// Normalize text for comparison
function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Check if acute indicators are present
function hasAcuteIndicators(text: string): boolean {
  const normalized = normalizeText(text);
  return config.deliriumIndicators.acuteKeywords.some(keyword => 
    normalized.includes(normalizeText(keyword))
  );
}

// Check if confusion indicators are present
function hasConfusionIndicators(text: string): boolean {
  const normalized = normalizeText(text);
  return config.deliriumIndicators.confusionKeywords.some(keyword => 
    normalized.includes(normalizeText(keyword))
  );
}

// Check if short timeline patterns are present
function hasShortTimeline(text: string): boolean {
  const normalized = normalizeText(text);
  return config.deliriumIndicators.timelinePatterns.some(pattern => {
    const regex = new RegExp(pattern, 'i');
    const match = normalized.match(regex);
    if (match) {
      // Extract the time value and check if it's within threshold
      const timeMatch = normalized.match(/(\d+)\s*(jour|semaine|day|week|heure|hour)/i);
      if (timeMatch) {
        const value = parseInt(timeMatch[1], 10);
        const unit = timeMatch[2].toLowerCase();
        
        // Convert to days
        let days = 0;
        if (unit.startsWith('jour') || unit.startsWith('day')) {
          days = value;
        } else if (unit.startsWith('semain') || unit.startsWith('week')) {
          days = value * 7;
        } else if (unit.startsWith('heur') || unit.startsWith('hour')) {
          days = value / 24;
        }
        
        return days <= config.timeThresholdDays;
      }
      
      // For relative time words (hier, aujourd'hui, etc.)
      return true;
    }
    return false;
  });
}

// Check if dementia diagnosis indicators are present
function hasDementiaIndicators(text: string): boolean {
  const normalized = normalizeText(text);
  
  // Check diagnostic keywords
  const hasKeywords = config.dementiaIndicators.diagnosticKeywords.some(keyword => 
    normalized.includes(normalizeText(keyword))
  );
  
  // Check context patterns
  const hasContext = config.dementiaIndicators.contextPatterns.some(pattern => {
    const regex = new RegExp(pattern, 'i');
    return regex.test(normalized);
  });
  
  return hasKeywords || hasContext;
}

/**
 * Main safety pre-filter function
 * Analyzes the full conversation history to detect delirium risk
 */
export function checkSafetyPreFilter(
  conversationHistory: { role: string; content: string }[],
  currentPrompt: string
): SafetyPreFilterResult {
  // Combine all conversation content for analysis
  const fullContext = conversationHistory
    .map(msg => msg.content)
    .join(' ')
    .concat(' ')
    .concat(currentPrompt);

  const normalizedContext = normalizeText(fullContext);
  const normalizedCurrent = normalizeText(currentPrompt);

  // Condition 1: Must have acute indicators
  const hasAcute = hasAcuteIndicators(normalizedContext) || hasAcuteIndicators(normalizedCurrent);
  
  // Condition 2: Must have confusion/behavioral change indicators
  const hasConfusion = hasConfusionIndicators(normalizedContext) || hasConfusionIndicators(normalizedCurrent);
  
  // Condition 3: Must have short timeline OR current prompt mentions time
  const hasShortTime = hasShortTimeline(normalizedContext) || hasShortTimeline(normalizedCurrent);
  
  // Condition 4: Must have dementia diagnosis context
  const hasDementia = hasDementiaIndicators(normalizedContext) || hasDementiaIndicators(normalizedCurrent);

  // All conditions must be met for delirium flag
  const isDeliriumRisk = hasAcute && hasConfusion && hasDementia;

  // More lenient short timeline check (only requires 2 of 3 conditions)
  const isPossibleDelirium = hasAcute && hasDementia && (hasConfusion || hasShortTime);

  if (isDeliriumRisk) {
    return {
      shouldOverride: true,
      template: 'delirium_flag',
      alertLevel: 'urgent',
      reason: 'Acute cognitive deterioration detected in diagnosed dementia patient - possible delirium',
      suggestedResponse: config.warningMessage
    };
  }

  if (isPossibleDelirium) {
    return {
      shouldOverride: true,
      template: 'delirium_flag',
      alertLevel: 'warning',
      reason: 'Possible delirium - consider safety assessment',
      suggestedResponse: 'This presentation warrants careful evaluation for delirium. Consider checking for common precipitants.'
    };
  }

  // No safety override needed
  return {
    shouldOverride: false
  };
}

/**
 * Quick check for current prompt only (lighter weight)
 */
export function quickSafetyCheck(prompt: string): SafetyPreFilterResult {
  const normalized = normalizeText(prompt);
  
  const hasAcute = hasAcuteIndicators(normalized);
  const hasConfusion = hasConfusionIndicators(normalized);
  const hasDementia = hasDementiaIndicators(normalized);
  
  // High confidence delirium signal
  if (hasAcute && hasConfusion && hasDementia) {
    return {
      shouldOverride: true,
      template: 'delirium_flag',
      alertLevel: 'urgent',
      reason: 'Acute confusion in dementia patient'
    };
  }
  
  return { shouldOverride: false };
}

/**
 * Get the safety rules version for logging
 */
export function getSafetyRulesVersion(): string {
  return config.version;
}
