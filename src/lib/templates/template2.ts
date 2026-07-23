/**
 * Template 2 - Direct Éducatif (Educational Response)
 * 
 * Trigger: direct_template_2
 * 
 * Purpose: Answer conceptual/educational questions immediately without needing patient context.
 * These are questions of knowledge, not clinical decision-making.
 */

export const TEMPLATE_2_CONFIG = {
  name: 'Template 2 - Direct Éducatif',
  trigger: 'direct_template_2',
  
  structure: [
    {
      step: 1,
      title: 'Direct Complete Response',
      description: 'Answer immediately with complete information - no preamble, no context request'
    },
    {
      step: 2,
      title: 'Structured Content When Useful',
      description: 'Use bullets, steps, or definitions for protocols, criteria, or tools'
    },
    {
      step: 3,
      title: 'No Clarification Questions',
      description: 'This template should NEVER end with a question (except for lexical ambiguity)'
    }
  ],
  
  tone: {
    style: 'informative, pedagogical, factual',
    emphasis: 'educational focus, complete answers'
  },
  
  rules: [
    'Answer immediately without asking for patient context',
    'Use structure (bullets, steps) when presenting protocols or criteria',
    'Do NOT drift toward patient-specific advice',
    'If user asks "for MY patient", redirect to a new classification round',
    'This is the ONLY template that should never end with a question'
  ],
  
  topics: [
    'Dementia syndromes (Alzheimer\'s, Lewy Body, Vascular, Frontotemporal)',
    'Diagnostic criteria (NIA-AA, DSM-5)',
    'Staging systems (GDS, CDR, FAST)',
    'Assessment tools (MoCA, MMSE, Mini-Cog)',
    'Tool administration protocols',
    'General pathophysiology'
  ],
  
  examples: {
    'What is Lewy Body dementia?': {
      topic: 'Dementia syndrome definition',
      structure: 'Definition → Key features → Diagnostic criteria → Management notes'
    },
    'How do I administer the MoCA?': {
      topic: 'Tool protocol',
      structure: 'Overview → Administration steps → Scoring → Interpretation'
    },
    'What are the NIA-AA criteria for Alzheimer\'s?': {
      topic: 'Diagnostic criteria',
      structure: 'Biomarker framework → AT(N) classification → Clinical criteria'
    }
  },
  
  vigilancePoint: `VIGILANCE: Do not let this template drift toward patient-specific advice.
If the clinician's question shows an inflection toward "and for MY patient specifically",
redirect to a new classification round rather than answering in this template.`
};
