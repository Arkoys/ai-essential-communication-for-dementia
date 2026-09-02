'use client';

/**
 * Template 1 - Clarification (Collecte d'information)
 * 
 * Trigger: assess_template_1_or_3 when tier1_complete = false
 * 
 * Purpose: Ask for missing patient information without leaving the clinician empty-handed.
 * Never give patient-specific advice on an incomplete basis.
 */

export const TEMPLATE_1_CONFIG = {
  name: 'Template 1 - Clarification',
  trigger: 'assess_template_1_or_3',
  condition: 'tier1_complete = false',
  
  structure: [
    {
      step: 1,
      title: '**BRIEF CLINICAL ACKNOWLEDGMENT**',
      description: 'Reformulate the question in one sentence to show understanding'
    },
    {
      step: 2,
      title: '**NAME MISSING TIER 1 ELEMENTS**',
      description: 'Explicitly identify what is missing: age, symptom, or duration/onset'
    },
    {
      step: 3,
      title: '**CONDITIONAL GENERAL RESPONSE**',
      description: 'Provide general guidance if possible while waiting for clarification'
    },
    {
      step: 4,
      title: '**CLARIFICATION QUESTIONS**',
      description: 'Ask 1-3 targeted questions, one at a time or in a short list'
    }
  ],
  
  tone: {
    style: 'direct, professional',
    avoid: 'guilt-inducing language, vague requests for more information',
    emphasis: 'keep clinician engaged with actionable guidance'
  },
  
  rules: [
    'Never give patient-specific advice on incomplete basis',
    'Provide general guidance when possible while waiting for clarification',
    'Maximum 3 questions at once',
    'Target specific missing elements (age, symptom, duration)'
  ],
  
  tier1Elements: {
    age: {
      label: 'Patient age',
      question: 'Could you share the patient\'s age?'
    },
    symptom: {
      label: 'Presenting symptom(s)',
      question: 'What cognitive or behavioral changes have you observed?'
    },
    duration: {
      label: 'Duration and onset pattern',
      question: 'How long have these symptoms been present? (gradual or sudden onset?)'
    }
  },
  
  example: {
    input: 'Mon patient a des pertes de mémoire. Que dois-je faire ?',
    output: `I understand you're dealing with memory concerns in one of your patients.

To provide specific guidance, I need a bit more information:

**What's missing:**
- Patient age
- Symptom duration and onset pattern

**General approach:** At this stage, standard practice involves:
- Brief cognitive screening (Mini-Cog or MoCA)
- Assessment of functional impact
- Consideration of reversible causes

**Could you tell me:**
1. What is the patient's approximate age?
2. How long have the memory issues been present? Are they gradually worsening, stable, or fluctuating?`
  }
};
