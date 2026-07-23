/**
 * Template 4 - Guidance Conditionnelle (Conditional Guidance)
 * 
 * Trigger: direct_template_4
 * 
 * Purpose: Provide structured "if/then" reasoning for ambiguous clinical decisions.
 * The app is not positioned to make diagnostic or therapeutic decisions.
 */

export const TEMPLATE_4_CONFIG = {
  name: 'Template 4 - Guidance Conditionnelle',
  trigger: 'direct_template_4',
  
  structure: [
    {
      step: 1,
      title: 'Frame the Limit',
      description: 'Remind that the final decision rests with the clinician\'s judgment'
    },
    {
      step: 2,
      title: 'If/Then Reasoning',
      description: 'Structured conditional guidance: "If [factor A], suggests X; if [factor B], suggests Y"'
    },
    {
      step: 3,
      title: 'Key Decision Factors',
      description: 'List factors that would tip the decision one way or another'
    },
    {
      step: 4,
      title: 'Specialist Orientation',
      description: 'Orient toward specialist/resource if relevant (without being prescriptive)'
    }
  ],
  
  tone: {
    style: 'prudent, structuring',
    emphasis: 'help clinician structure their own thinking',
    avoid: 'definitive yes/no decisions, prescriptive statements'
  },
  
  queryTypes: [
    'differential_diagnosis',
    'result_interpretation',
    'referral_decision',
    'therapeutics'
  ],
  
  rules: [
    '"If [factor A] is present, this suggests X; if [factor B], suggests Y"',
    'Do NOT make yes/no decisions',
    'Do NOT be prescriptive on therapeutics',
    'If completely unrelated to dementia, politely redirect'
  ],
  
  differentialDiagnosisGuidance: {
    framing: 'Consider the differential based on clinical features',
    factors: [
      'Age of onset',
      'Symptom progression (rapid vs slow)',
      'Cognitive profile (memory-predominant vs executive)',
      'Associated features (parkinsonism, hallucinations, behavior changes)',
      'Vascular risk factors'
    ],
    syndromes: [
      {
        name: 'Alzheimer\'s Disease',
        hints: 'Gradual onset, memory-predominant, insidiously progressive'
      },
      {
        name: 'Vascular Dementia',
        hints: 'Stepwise decline, focal deficits, vascular risk factors'
      },
      {
        name: 'Dementia with Lewy Bodies',
        hints: 'Fluctuating cognition, visual hallucinations, parkinsonism, REM sleep disorder'
      },
      {
        name: 'Frontotemporal Dementia',
        hints: 'Early behavioral/personality changes or language dysfunction, younger onset'
      }
    ]
  },
  
  resultInterpretationGuidance: {
    scoringFrameworks: {
      'MoCA': {
        normal: '26-30',
        MCI: '18-25',
        dementia: '<18',
        note: 'Cutoffs vary by education and age'
      },
      'MMSE': {
        normal: '24-30',
        mild: '18-23',
        moderate: '12-17',
        severe: '<12',
        note: 'Less sensitive than MoCA for MCI'
      }
    }
  },
  
  referralGuidance: {
    neurology: {
      consider: [
        'Early-onset dementia (<65)',
        'Atypical presentation',
        'Rapid progression',
        'Diagnostic uncertainty',
        'Complex medication decisions'
      ]
    },
    geriatrics: {
      consider: [
        'Multimorbidity',
        'Complex care needs',
        'Caregiver support needs'
      ]
    },
    psychiatry: {
      consider: [
        'Significant behavioral symptoms',
        'Mood symptoms predominating',
        'Treatment-resistant symptoms'
      ]
    }
  },
  
  therapeuticsGuidance: {
    cholinesteraseInhibitors: {
      drugs: ['Donepezil', 'Rivastigmine', 'Galantamine'],
      indications: 'Mild to moderate Alzheimer\'s, Lewy Body, Parkinson\'s dementia',
      considerations: ['GI side effects', 'Cardiac (bradycardia)', 'Weight loss']
    },
    memantine: {
      indications: 'Moderate to severe Alzheimer\'s (alone or with cholinesterase inhibitor)',
      considerations: ['Dizziness', 'Constipation']
    },
    antiAmyloid: {
      lecanemab: {
        indications: 'Early Alzheimer\'s with confirmed amyloid',
        considerations: ['ARIA risk', 'Requires amyloid PET or CSF', 'Specialist monitoring']
      }
    }
  },
  
  examples: {
    scoreInterpretation: {
      input: 'What does a MoCA of 22 mean?',
      output: `A MoCA score of 22 falls in the **Mild Cognitive Impairment (MCI)** range, though interpretation depends on context.

**General interpretation:**
- 26-30: Normal
- 18-25: MCI
- <18: Dementia range

**Key factors to consider:**
- Education level (less educated = lower expected scores)
- Age (older = lower expected scores)
- Language/cultural background
- Baseline functioning

**What this suggests:**
This score indicates mild cognitive impairment — changes noticeable but not significantly impacting daily function. However, the score alone doesn't determine diagnosis.

**Clinical correlation needed:** Compare with functional assessment and history. Consider referral for neuropsych testing if diagnostic uncertainty.`
    },
    referral: {
      input: 'Should I refer this patient to neurology?',
      output: `The decision to refer depends on several factors. Consider neurology if:

**Favoring referral:**
- Patient age <65 (early-onset)
- Atypical features (rapid progression, focal symptoms)
- Diagnostic uncertainty after initial workup
- Consider neuropsych testing for complex cases

**May not need referral:**
- Typical Alzheimer's presentation in elderly
- Clear clinical picture
- Already stable on treatment

**How to frame the referral question:**
"This patient has progressive memory decline over [timeframe]. I'd appreciate your evaluation for diagnostic confirmation and management recommendations."

**Bottom line:** Refer when it would change management or provide diagnostic clarity you can't achieve in primary care.`
    }
  }
};
