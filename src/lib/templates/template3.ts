/**
 * Template 3 - Guidance Complète (Complete Clinical Guidance)
 * 
 * Trigger: assess_template_1_or_3 when tier1_complete = true
 * 
 * Purpose: Provide complete, actionable clinical guidance based on the Navigation Map
 * framework, with sample language ready to use.
 */

export const TEMPLATE_3_CONFIG = {
  name: 'Template 3 - Guidance Complète',
  trigger: 'assess_template_1_or_3',
  condition: 'tier1_complete = true',
  
  structure: [
    {
      step: 1,
      title: '**IMPLICIT CONTEXT CONFIRMATION**',
      description: 'Briefly reframe age/symptom/duration to anchor the response'
    },
    {
      step: 2,
      title: '**JOURNEY POSITION**',
      description: 'Identify where patient is (Recognition / Evaluation / Diagnosis)'
    },
    {
      step: 3,
      title: '**ACTIONABLE RECOMMENDATIONS**',
      description: 'Tests, scales, next steps, ready-to-use clinical language'
    },
    {
      step: 4,
      title: '**WARNING SIGNALS**',
      description: 'Red flags that would change management (if applicable)'
    },
    {
      step: 5,
      title: '**SUGGESTED NEXT STEP**',
      description: 'What the clinician should do or say next'
    }
  ],
  
  tone: {
    style: 'confident but nuanced clinical guidance',
    framing: 'decision support, not automated decision-making',
    emphasis: 'patient-specific but acknowledges uncertainty'
  },
  
  navigationMapPhases: {
    'Recognition': {
      steps: ['Open the Conversation', 'Assess Function', 'Assess Cognition', 'Assess Safety'],
      focus: 'Identifying concern, initial screening'
    },
    'Evaluation': {
      steps: ['Assess Function', 'Assess Cognition', 'Assess Safety', 'Targeted Exam', 'Labs and Imaging', 'Medication Review', 'Name Condition'],
      focus: 'Comprehensive assessment, ruling out reversible causes'
    },
    'Diagnosis': {
      steps: ['Assess and Align Understanding', 'Apply Diagnosis', 'Stage Condition', 'Address Risks and Concerns', 'Plan Follow-up'],
      focus: 'Naming the condition, planning care'
    }
  },
  
  rules: [
    'Use Navigation Map framework (Recognition → Evaluation → Diagnosis)',
    'Pull sample language from toolkit when possible',
    'Always resituate in "decision support" context',
    'Include red flags when relevant',
    'End with suggested next action'
  ],
  
  example: {
    input: 'Homme de 72 ans, 14 mois de perte de mémoire progressive, encore actif à temps partiel, aucun trouble fonctionnel rapporté. Quel outil de dépistage utiliser ?',
    output: `Based on your 72-year-old patient with 14 months of progressive memory loss but preserved function...

**Journey Position:** Recognition phase - initial assessment

**Recommended Screening Tool:** For this profile, consider the **MoCA** over Mini-Cog:
- Higher sensitivity for MCI (90% vs 76% for Mini-Cog)
- Better suited for higher-functioning patients
- Takes 10-15 minutes

**Ready-to-use language:**
"I'd like to do a brief screening that can give us more information about your brain health. It involves drawing a clock and remembering some words."

**Next steps:**
1. Administer MoCA
2. Assess functional impact with ADL/IADL questionnaire
3. Consider labs (B12, TSH) to rule out reversible causes

**Red flags to watch:** Rapid progression, focal deficits, postural instability early in course → consider referral`
  }
};
