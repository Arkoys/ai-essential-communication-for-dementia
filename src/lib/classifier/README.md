# Classification Pipeline Documentation

## Overview

This document describes the classification pipeline that routes clinician prompts to appropriate response templates.

## Pipeline Architecture

```
┌─────────────────┐
│  User Prompt    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Step 1: Safety │
│  Pre-Filter     │  ← Deterministic rules
└────────┬────────┘
         │
    ┌────┴────┐
    │ Override?│───Yes──→ Template 6 (Delirium)
    └────┬────┘
         │ No
         ▼
┌─────────────────┐
│  Step 2: LLM    │
│  Classification │  ← Structured JSON output
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Step 3:        │
│  Template       │
│  Selection      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Response       │
│  Generation     │
└─────────────────┘
```

## Step 1: Safety Pre-Filter

**File:** `src/lib/classifier/safetyPreFilter.ts`

Detects potential delirium in diagnosed dementia patients BEFORE any LLM classification.

### Trigger Conditions (ALL required):
- Acute indicators: "soudain", "sudden", "rapidement", "rapid", "worsening"
- Confusion indicators: "confus", "confused", "agité", "agitated", "hallucinations"
- Dementia context: "alzheimer", "dément", "dementia", "diagnosed"

### Output:
```typescript
interface SafetyPreFilterResult {
  shouldOverride: boolean;
  template?: 'delirium_flag';
  alertLevel?: 'info' | 'warning' | 'urgent';
  reason?: string;
}
```

### Configuration:
Rules are loaded from `src/config/safetyRules.json` for clinical team maintainability.

---

## Step 2: LLM Classification

**File:** `src/lib/classifier/classifier.ts`

Performs structured classification using the matrix from `src/config/classificationMatrix.json`.

### Provider-Specific Implementation:

| Provider | Method |
|----------|--------|
| **OpenAI (Harvard)** | Structured Outputs (JSON Schema enforcement) |

> Note: the former MiniMax prompt-based classifier was removed alongside the
> provider itself. Only the OpenAI Structured Outputs path remains.

### Output:
```typescript
interface ClassificationResult {
  query_type_id: string;
  query_type_label: string;
  in_scope: boolean;
  tier1: {
    age_present: boolean;
    symptom_present: boolean;
    duration_present: boolean;
  };
  tier1_complete: boolean;
  response_path: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning?: string;
  missing_elements?: string[];
  requires_clarification?: boolean;
}
```

### Query Types (13 total):

| ID | Label | Template |
|----|-------|----------|
| `initial_assessment` | Initial Assessment | T1/T3 |
| `diagnosis_process` | Diagnosis Process | T1/T3 |
| `workup_planning` | Workup Planning | T1/T3 |
| `management` | Management | T1/T3 |
| `safety_assessment` | Safety Assessment | T1/T3 |
| `language_recommendation` | Language Recommendation | T1/T3 |
| `conceptual_educational` | Conceptual/Educational | T2 |
| `differential_diagnosis` | Differential Diagnosis | T4 |
| `result_interpretation` | Result Interpretation | T4 |
| `referral_decision` | Referral Decision | T4 |
| `therapeutics` | Therapeutics | T4 |
| `relational_challenges` | Relational Challenges | T5 |
| `unrelated_to_dementia` | Unrelated | Out of Scope |

---

## Step 3: Template Selection

**File:** `src/lib/classifier/templateSelector.ts`

Routes to appropriate template based on classification result.

### Template Routing Logic:

| Classification | Tier1 | Template |
|----------------|-------|----------|
| `assess_template_1_or_3` | false | **Template 1** (Clarification) |
| `assess_template_1_or_3` | true | **Template 3** (Complete Guidance) |
| `direct_template_2` | - | **Template 2** (Direct Éducatif) |
| `direct_template_4` | - | **Template 4** (Conditional) |
| `assess_template_5` | - | **Template 5** (Relational) |
| `delirium_flag` | - | **Template 6** (Delirium) |
| `out_of_scope` | - | Out of Scope Response |

---

## Templates Summary

### Template 1 - Clarification
- **Trigger:** tier1 incomplete
- **Purpose:** Collect missing information
- **Questions:** 1-3 targeted questions
- **Provides:** General guidance while awaiting info

### Template 2 - Direct Éducatif
- **Trigger:** Conceptual/educational question
- **Purpose:** Immediate knowledge response
- **No patient context needed**
- **Never ends with a question**

### Template 3 - Complete Guidance
- **Trigger:** tier1 complete
- **Purpose:** Full patient-specific guidance
- **Uses:** Navigation Map framework
- **Includes:** Sample language, next steps, red flags

### Template 4 - Conditional
- **Trigger:** Ambiguous decision
- **Purpose:** Structure clinical thinking
- **Format:** If/then reasoning
- **Never:** Definitive yes/no decisions

### Template 5 - Relational
- **Trigger:** Emotional/relational challenge
- **Purpose:** Practical communication help
- **Provides:** Exact phrases to use
- **Options:** Multiple valid strategies

### Template 6 - Delirium Flag
- **Trigger:** Safety override
- **Purpose:** Signal acute deterioration
- **Focus:** Delirium workup
- **Urgency:** Alert but not alarming

---

## Error Handling

### Classification Failure
- Retry up to 1 time
- Fallback to generic clarification (Template 1)
- Log for audit

### Confidence: Low
- Show notification badge to user
- Proceed with generic guidance
- Log for review

---

## Files Structure

```
src/
├── config/
│   ├── safetyRules.json           # Delirium detection rules
│   └── classificationMatrix.json  # Query type definitions
│
├── lib/
│   ├── classifier/
│   │   ├── index.ts              # Unified exports
│   │   ├── types.ts              # TypeScript interfaces
│   │   ├── safetyPreFilter.ts    # Step 1
│   │   ├── classifier.ts         # Step 2 + quick classify
│   │   ├── templateSelector.ts   # Step 3
│   │   ├── classificationMatrix.ts
│   │   └── providers/
│   │       └── openaiClassifier.ts   # OpenAI Structured Outputs
│   │
│   └── templates/
│       ├── index.ts              # Template instructions
│       ├── template1.ts
│       ├── template2.ts
│       ├── template3.ts
│       ├── template4.ts
│       ├── template5.ts
│       └── template6.ts
│
└── components/
    └── NotificationBadge.tsx     # Fallback notification
```

---

## Testing

Run the evaluation set with:

```typescript
import evalSet from './lib/evaluation/evalSet.json';

// For each test case:
const result = await classifyPrompt(testCase.prompt);
// Compare result.response_path with testCase.expected_path
```

See `src/lib/evaluation/evalSet.json` for all 45 test cases.

---

## Maintenance

### Adding New Query Types
1. Add entry to `src/config/classificationMatrix.json`
2. Update `QUERY_TYPES` constant
3. Update classifier prompts if needed

### Modifying Safety Rules
1. Edit `src/config/safetyRules.json`
2. Version bump the `version` field
3. Update clinical team

### Adding New Templates
1. Create `src/lib/templates/templateN.ts`
2. Add to `TEMPLATE_INSTRUCTIONS` in `index.ts`
3. Update `templateSelector.ts`
4. Add to routing logic
