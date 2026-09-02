'use client';

/**
 * TemplateDevBadge - Dev-only badge showing which template is being used
 * 
 * Displays the current template classification in a discreet badge
 * at the bottom of the screen (dev mode only).
 */

import React from 'react';
import type { ResponsePath } from '../lib/classifier/types';

// Template display names
const TEMPLATE_LABELS: Record<ResponsePath, string> = {
  'assess_template_1_or_3': 'T1 Clarification',
  'direct_template_2': 'T2 Éducatif',
  'direct_template_4': 'T4 Conditionnel',
  'assess_template_5': 'T5 Relationnel',
  'delirium_flag': 'T6 Delirium 🚨',
  'out_of_scope': 'Out of Scope',
};

const TEMPLATE_COLORS: Record<ResponsePath, string> = {
  'assess_template_1_or_3': 'bg-blue-100 text-blue-700 border-blue-300',
  'direct_template_2': 'bg-green-100 text-green-700 border-green-300',
  'direct_template_4': 'bg-purple-100 text-purple-700 border-purple-300',
  'assess_template_5': 'bg-pink-100 text-pink-700 border-pink-300',
  'delirium_flag': 'bg-red-100 text-red-700 border-red-300',
  'out_of_scope': 'bg-gray-100 text-gray-700 border-gray-300',
};

interface TemplateDevBadgeProps {
  template: ResponsePath;
  tier1Complete?: boolean;
  provider?: string;
}

export function TemplateDevBadge({ template, tier1Complete, provider }: TemplateDevBadgeProps) {
  const label = TEMPLATE_LABELS[template] || template;
  const colorClass = TEMPLATE_COLORS[template] || 'bg-gray-100 text-gray-700 border-gray-300';

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {/* Template Badge */}
      <div 
        className={`
          px-3 py-1.5 rounded-full text-xs font-mono font-medium border
          shadow-sm
          ${colorClass}
        `}
        title={`Template: ${template}\nTier1 Complete: ${tier1Complete ? 'Yes' : 'No'}`}
      >
        🏷️ {label}
      </div>
      
      {/* Tier1 Status */}
      {tier1Complete !== undefined && (
        <div 
          className={`
            px-3 py-1.5 rounded-full text-xs font-mono
            border shadow-sm
            ${tier1Complete 
              ? 'bg-emerald-100 text-emerald-700 border-emerald-300' 
              : 'bg-amber-100 text-amber-700 border-amber-300'
            }
          `}
        >
          {tier1Complete ? '✅ Tier1 Complete' : '⚠️ Tier1 Incomplete'}
        </div>
      )}
      
      {/* Provider */}
      {provider && (
        <div className="px-3 py-1.5 rounded-full text-xs font-mono bg-zinc-100 text-zinc-600 border border-zinc-300 shadow-sm">
          🤖 Harvard
        </div>
      )}
    </div>
  );
}

/**
 * Hook to manage template badge state
 */
export function useTemplateBadge() {
  const [currentTemplate, setCurrentTemplate] = React.useState<ResponsePath | null>(null);
  const [tier1Complete, setTier1Complete] = React.useState<boolean | null>(null);
  const [provider, setProvider] = React.useState<string | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  const updateTemplate = (
    template: ResponsePath, 
    tier1: boolean, 
    prov?: string,
    show: boolean = true
  ) => {
    setCurrentTemplate(template);
    setTier1Complete(tier1);
    if (prov) setProvider(prov);
    setIsVisible(show);
    
    // Auto-hide after 8 seconds
    if (show) {
      setTimeout(() => setIsVisible(false), 8000);
    }
  };

  const hideBadge = () => setIsVisible(false);
  const showBadge = () => setIsVisible(true);

  return {
    currentTemplate,
    tier1Complete,
    provider,
    isVisible,
    updateTemplate,
    hideBadge,
    showBadge,
  };
}
