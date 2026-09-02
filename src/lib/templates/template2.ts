'use client';

/**
 * Template 2 - Out of Scope Conceptual Query → Redirect
 * 
 * Trigger: conceptual_query_redirect
 * 
 * Purpose: Handle conceptual questions that fall outside our knowledge documents
 * by providing evidence-based external information and redirecting to the LLM's scope.
 * 
 * Note: trustedSources are now dynamically loaded from resources.ts
 * Use the CURATED_EXTERNAL_RESOURCES for citation purposes.
 */

export const TEMPLATE_2_CONFIG = {
  name: 'Template 2 - Out of Scope Conceptual Query → Redirect',
  trigger: 'conceptual_query_redirect',
  
  structure: [
    {
      step: 1,
      title: '**PART 1: RESPOND TO THE QUESTION**',
      description: 'Briefly reflect their question back in your own words to confirm understanding. Provide a 1-3 sentence direct response drawing on trusted, evidence-based external sources. Cite the source(s) using markdown links.',
      instruction: `The response to these questions are not provided in our knowledge documents.
Briefly reflect their question back in your own words to confirm understanding.
Provide a 1-3 sentence summary of information from trusted external sources.
Cite the source(s) using markdown link format: [Source Name](URL).
Recommend that the user goes to them for more information.`
    },
    {
      step: 2,
      title: '**PART 2: REORIENT & REDIRECT**',
      description: 'State the scope of our LLM\'s role (using the map, offering sample language, and using the stuck points framework) and ask coaching questions to engage relative to the LLM\'s scope and knowledge base.',
      instruction: `State the scope of our LLM's role (using the map, offering sample language, and using the stuck points framework to provide guidance) and ask coaching questions to engage relative to the LLM's scope and knowledge base.
Ask questions to see if they are interested in exploring guidance available.`
    }
  ],
  
  tone: {
    style: 'empathetic, informative, redirective',
    emphasis: 'acknowledge the question, provide trusted external resources, then re-engage with coaching support'
  },
  
  rules: [
    'Do not pretend to have information not in our knowledge documents',
    'Briefly reflect the question back to confirm understanding',
    'Pull 1-3 sentence summary from trusted external sources',
    'Always cite the source(s) using markdown link format: [Name](URL)',
    'Include links to trusted sources from the available resources list',
    'After providing external info, shift to reorientation',
    'Clearly state the LLM\'s scope: navigation map, sample language, stuck points framework',
    'End with coaching questions to re-engage the user',
    'No header needed at the start of the response'
  ],
  
  // trustedSources removed - now dynamically sourced from resources.ts
  
  llmScope: {
    description: 'As your dementia communication coach, I can support you with:',
    offerings: [
      'Understanding where you are in the dementia diagnosis process',
      'Offering ways to communicate with your patient',
      'Providing support with difficult conversations with your patient',
      'Using the navigation map for guidance',
      'Sharing sample language for challenging situations',
      'Applying the stuck points framework to unblock progress'
    ]
  },
  
  examples: {
    'What is the latest research on Alzheimer\'s prevention?': {
      section1: {
        reflection: 'I understand you are looking to better understand current research on Alzheimer\'s prevention.',
        summary: 'Recent evidence suggests that regular physical exercise, cognitive stimulation, and cardiovascular health management may reduce risk, though no definitive prevention strategies exist.',
        citation: 'Alzheimer\'s Association, alz.org'
      },
      section2: {
        scope: 'As your dementia communication coach, I can support you with understanding where you are in the diagnosis process, offering ways to communicate with your patient, or providing support with difficult conversations.',
        question: 'Would it be helpful to understand where you are in this patient\'s diagnosis process or receive communication support?'
      }
    },
    'Can you explain the difference between MCI and dementia?': {
      section1: {
        reflection: 'I understand you are looking to better understand the distinction between Mild Cognitive Impairment and dementia.',
        summary: 'Mild Cognitive Impairment (MCI) involves measurable cognitive changes that are noticeable but don\'t significantly interfere with daily activities, while dementia represents a decline severe enough to impair independent functioning.',
        citation: 'Alzheimer\'s Association, alz.org'
      },
      section2: {
        scope: 'As your dementia communication coach, I can support you with understanding where you are in the diagnosis process, offering ways to communicate with your patient, or providing support with difficult conversations.',
        question: 'Would it be helpful to understand where you are in this patient\'s diagnosis process or receive communication support?'
      }
    }
  },
  
  vigilancePoint: `VIGILANCE: Always use external trusted sources (not our internal knowledge) for this template.
If the question CAN be answered from our knowledge documents, this is not the right template.
If the user asks about a specific patient, redirect to a patient-specific classification.`
};
