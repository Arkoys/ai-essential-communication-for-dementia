'use client';

/**
 * Template 5 - Blocage Relationnel (Relational/Emotional Guidance)
 * 
 * Trigger: assess_template_5
 * 
 * Purpose: Help clinicians navigate difficult relational and emotional situations.
 * Focus on practical language and strategy options.
 */

export const TEMPLATE_5_CONFIG = {
  name: 'Template 5 - Blocage Relationnel',
  trigger: 'assess_template_5',
  
  structure: [
    {
      step: 1,
      title: '**VALIDATE THE DIFFICULTY**',
      description: 'Acknowledge the situation is genuinely hard to navigate'
    },
    {
      step: 2,
      title: '**NAME THE TENSION**',
      description: 'Identify the underlying conflict: autonomy vs safety, truth vs protection, etc.'
    },
    {
      step: 3,
      title: '**READY-TO-USE LANGUAGE**',
      description: 'Exact phrases the clinician can use verbatim or adapt'
    },
    {
      step: 4,
      title: '**STRATEGY OPTIONS**',
      description: '1-2 posture/strategy options with explicit tradeoffs'
    },
    {
      step: 5,
      title: '**EXPLORE FURTHER**',
      description: 'End with option to continue the conversation'
    }
  ],
  
  tone: {
    style: 'warm, concrete, non-clinical in form',
    emphasis: 'action-oriented ("use this phrase"), practical language'
  },
  
  rules: [
    'Never psychoanalyze family or patient',
    'Provide exact phrases, not abstract advice',
    'Acknowledge multiple valid approaches',
    'No moral judgment',
    'Focus on practical language clinician can use'
  ],
  
  scenarios: {
    patientDenial: {
      title: 'Patient doesn\'t believe they have dementia',
      tension: 'Autonomy vs protection, therapeutic alliance vs honesty',
      sampleLanguage: [
        '"I hear that you don\'t feel like there\'s a problem with your memory. Can you tell me more about that?"',
        '"Many people in similar situations don\'t notice the changes at first. Can I share what I\'ve observed?"',
        '"I\'m wondering if we could approach this differently — what if we focus on what we CAN do to support your brain health?"'
      ],
      strategyOptions: [
        {
          name: 'Gradual approach',
          approach: 'Address concerns gradually over multiple visits',
          tradeoffs: 'Respects patient\'s pace but may delay care planning'
        },
        {
          name: 'Functional focus',
          approach: 'Focus on function and daily activities rather than diagnosis',
          tradeoffs: 'May be more acceptable to patient but less clear about diagnosis'
        }
      ]
    },
    
    familyConflict: {
      title: 'Family members in conflict about care',
      tension: 'Different family dynamics, competing priorities, caregiver burden',
      sampleLanguage: [
        '"It sounds like there are different perspectives in the family about how to best help [patient]. That\'s very common."',
        '"I\'d like to understand each of your concerns better. What are you most worried about?"',
        '"Let\'s think together about what would work best for [patient] as the priority."'
      ],
      strategyOptions: [
        {
          name: 'Individual meetings',
          approach: 'Meet with family members separately to understand each perspective',
          tradeoffs: 'Can uncover hidden concerns but time-intensive'
        },
        {
          name: 'Family meeting',
          approach: 'Facilitate a joint conversation with all parties',
          tradeoffs: 'Efficient but may escalate conflict in the moment'
        }
      ]
    },
    
    truthTelling: {
      title: 'Ethically difficult situations around truth-telling',
      tension: 'Truth vs protection, autonomy vs beneficence',
      sampleLanguage: [
        '"This is a difficult situation. I want to think through this with you."',
        '"There\'s a balance between being honest and not causing unnecessary distress. What feels right to you as we navigate this?"',
        '"Sometimes people find it helpful to focus on what we CAN do rather than what we can\'t."'
      ],
      strategyOptions: [
        {
          name: 'Gradual disclosure',
          approach: 'Let the patient guide the pace of information sharing',
          tradeoffs: 'Respects autonomy but requires careful monitoring'
        },
        {
          name: 'Needs-based approach',
          approach: 'Share information when patient seems ready or when it would help them make decisions',
          tradeoffs: 'Practical but may feel manipulative to some'
        }
      ]
    },
    
    caregiverBurnout: {
      title: 'Exhausted or frustrated caregiver',
      tension: 'Caregiver wellbeing vs patient care needs',
      sampleLanguage: [
        '"I can hear how exhausting this has been for you. Thank you for sharing that."',
        '"Taking care of yourself isn\'t selfish — it\'s essential for you to be able to care for [patient]."',
        '"What support would be most helpful right now?"'
      ],
      strategyOptions: [
        {
          name: 'Resource connection',
          approach: 'Connect with respite services, support groups, caregiver programs',
          tradeoffs: 'Practical help but may not address emotional exhaustion'
        },
        {
          name: 'Validation first',
          approach: 'Focus on emotional validation before problem-solving',
          tradeoffs: 'Builds trust but takes time'
        }
      ]
    },
    
    aloneInVisit: {
      title: 'Patient alone when family involvement would help',
      tension: 'Respecting patient autonomy vs family involvement',
      sampleLanguage: [
        '"Having someone with you at appointments can be really helpful. Would you consider bringing a family member next time?"',
        '"Sometimes it helps to have another set of ears. What do you think about [family member] coming to the next visit?"'
      ],
      strategyOptions: [
        {
          name: 'Direct invitation',
          approach: 'Ask patient directly to bring someone',
          tradeoffs: 'Clear but patient may feel pressured'
        },
        {
          name: 'Indirect invitation',
          approach: 'Suggest family members might want to be involved',
          tradeoffs: 'Less pressure but may not result in attendance'
        }
      ]
    }
  },
  
  corePhrases: [
    'I hear you.',
    'That sounds really difficult.',
    'Thank you for sharing that with me.',
    'You\'re not alone in this.',
    'Let\'s think through this together.',
    'What would be most helpful right now?',
    'I\'m here to support you.'
  ]
};
