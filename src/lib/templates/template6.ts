/**
 * Template 6 - Delirium Flag (Acute Deterioration Alert)
 * 
 * Trigger: safety_override = true (from Safety Pre-Filter)
 * 
 * Purpose: Signal potential delirium in a diagnosed dementia patient.
 * This is a safety-critical response requiring urgent but calm guidance.
 */

export const TEMPLATE_6_CONFIG = {
  name: 'Template 6 - Delirium Flag',
  trigger: 'delirium_flag',
  safety: true,
  
  structure: [
    {
      step: 1,
      title: '**URGENT FLAG**',
      description: 'Signal the concern clearly but calmly'
    },
    {
      step: 2,
      title: '**CONTEXT**',
      description: 'Frame as acute worsening in a patient with known/suspected dementia'
    },
    {
      step: 3,
      title: '**IMMEDIATE ACTIONS**',
      description: 'Clinical actions to consider right away'
    },
    {
      step: 4,
      title: '**TARGETED ASSESSMENT**',
      description: 'Questions to guide delirium workup'
    },
    {
      step: 5,
      title: '**ESCALATION**',
      description: 'When to escalate immediately'
    }
  ],
  
  tone: {
    style: 'alert but not alarming',
    emphasis: 'clinical urgency without panic, systematic workup guidance'
  },
  
  rules: [
    'Prioritize safety assessment',
    'Ask about common delirium precipitants',
    'Include warning signs for immediate escalation',
    'Guide toward delirium workup protocol',
    'Age is useful but should NOT delay the alert'
  ],
  
  deliriumDefinition: `DELIRIUM OVERVIEW
Delirium = Acute change in mental status with fluctuating course
- Superimposed on dementia (common and underrecognized)
- Often reversible if underlying cause identified
- Medical emergency in elderly

KEY FEATURES:
• Acute onset (hours to days)
• Fluctuating course
• Inattention (primary)
• Disorganized thinking

SUBTYPES:
• Hyperactive: Agitation, hallucinations
• Hypoactive: Withdrawn, drowsy (often missed)
• Mixed`,

  commonPrecipitants: [
    {
      category: 'Infections',
      examples: ['UTI (most common)', 'Pneumonia', 'Sepsis', 'Wound infection'],
      screening: 'UA, CXR, CBC, cultures'
    },
    {
      category: 'Medications',
      examples: ['Anticholinergics', 'Benzodiazepines', 'Opioids', 'New medications', 'Medication interactions'],
      screening: 'Medication review, anticholinergic burden'
    },
    {
      category: 'Metabolic',
      examples: ['Dehydration', 'Electrolyte abnormalities', 'Hypoglycemia', 'Thyroid', 'Anemia'],
      screening: 'CBC, BMP, TSH, B12'
    },
    {
      category: 'Environmental',
      examples: ['Unfamiliar environment', 'Sleep deprivation', 'Sensory impairment', 'Immobility'],
      interventions: 'Reorient, normalize sleep, glasses/hearing aids'
    },
    {
      category: 'Other',
      examples: ['Pain', 'Constipation/retention', 'Malnutrition', 'Stroke', 'Myocardial event'],
      screening: 'As clinically indicated'
    }
  ],

  assessmentQuestions: [
    'When did you first notice the change? (hours, days, weeks?)',
    'Is the confusion worse at certain times of day? (sundowning pattern?)',
    'Has there been any fever, cough, or change in urination?',
    'Any new medications started recently?',
    'How is eating and drinking? Any signs of dehydration?',
    'Is there new pain or discomfort?',
    'Any change in bowel movements or urination?',
    'How much help does the patient need with daily activities now vs before?'
  ],

  immediateActions: [
    {
      priority: '1',
      action: 'Identify and treat underlying cause',
      details: 'Workup for infection, metabolic, medications, etc.'
    },
    {
      priority: '2',
      action: 'Non-pharmacological management',
      details: 'Reorient patient, normalize sleep-wake cycle, ensure sensory aids available, family presence'
    },
    {
      priority: '3',
      action: 'Review medications',
      details: 'Stop or reduce deliriogenic medications if possible'
    },
    {
      priority: '4',
      action: 'Consider pharmacologic treatment if severe agitation',
      details: 'Low-dose haloperidol or atypical antipsychotic; NOT for sedation alone'
    }
  ],

  escalationCriteria: [
    'Agitation threatening patient safety',
    'Severe agitation not controlled',
    'Signs of medical emergency (SIRS, shock)',
    'New focal neurological signs',
    'Suspected intracranial process',
    'Unable to complete workup as outpatient'
  ],

  sampleLanguage: {
    opening: 'I want to flag something important about this presentation.',
    explanation: 'The sudden/acute change in mental status in someone with dementia raises concern for delirium — which is a medical condition that needs evaluation.',
    workup: 'I recommend checking for common causes: infection (especially urinary), medication effects, dehydration, and metabolic abnormalities.',
    reassurance: 'Delirium often improves when the underlying cause is treated. The priority is finding and addressing what\'s causing this change.',
    followUp: 'If symptoms worsen significantly or you\'re unable to complete the evaluation as outpatient, consider urgent evaluation.'
  },

  redFlags: [
    '⚠️ Sudden onset in previously stable dementia',
    '⚠️ Fluctuating consciousness',
    '⚠️ Visual hallucinations (new)',
    '⚠️ Signs of infection (fever, tachycardia)',
    '⚠️ Unable to recognize family',
    '⚠️ Agitation with safety concerns',
    '⚠️ Focal neurological signs'
  ],

  example: {
    input: 'My patient with Alzheimer\'s is suddenly much more confused. She\'s been like this for 3 days.',
    output: `⚠️ **URGENT: Consider Delirium**

This acute change in a patient with known Alzheimer's raises strong concern for **delirium superimposed on dementia**.

**Key Points:**
- Delirium is common in dementia patients and often reversible
- Acute onset + fluctuating course + inattention = classic delirium triad
- Need to identify and treat the underlying cause

**Immediate Assessment:**
1. **Infection workup**: UA, CBC, CXR (UTI is most common cause in elderly)
2. **Medication review**: Any new meds? Anticholinergics? Benzodiazepines?
3. **Metabolic**: Dehydration, electrolytes, glucose
4. **Vital signs**: Fever? Tachycardia?

**Questions to ask family:**
- When exactly did this start?
- Is it worse at night (sundowning)?
- Any fever, cough, or urinary symptoms?
- Any new medications recently?
- How is eating and drinking?

**Red flags requiring urgent evaluation:**
- New hallucinations or paranoia
- Agitation threatening safety
- Unable to recognize family
- Vital sign abnormalities

**Management:**
- Treat underlying cause
- Non-pharmacological: reorient, normalize sleep, family presence
- Avoid restraints if possible
- Consider antipsychotic only if severe agitation (low dose, short term)

This usually improves when the precipitating factor is addressed. Prioritize finding and treating the underlying cause.`
  }
};
