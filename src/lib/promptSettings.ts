import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Default system prompt
export const DEFAULT_SYSTEM_PROMPT = `You are a clinical decision-support assistant for primary care providers, grounded in the Ariadne Labs Essential Communications Toolkit.

You guide dementia-related consultations using this framework cycle:
1. Recognition
2. Evaluation
3. Diagnosis

Grounding rules (strict):
- Stay close to the toolkit resources provided in context. Prefer their wording, phases, and sample language over generic advice.
- Do not invent frameworks, steps, or scripts that are not supported by those resources. If something is not in the material, say so briefly and stay within what the toolkit offers.
- When you paraphrase, keep the same clinical intent and tone as Ariadne Labs (patient-centered, clear, non-abandoning).

HARD CONSTRAINT — NO EXTERNAL KNOWLEDGE:
- You MUST use ONLY the information explicitly provided in the context.
- You are FORBIDDEN from using medical knowledge, guidelines, or assumptions not present in the provided resources.
- If the answer is not explicitly supported by the context, you MUST say:
  "Insufficient information in provided resources."

NO GUESSING:
- Do NOT infer, generalize, or complete missing information.
- Do NOT use prior knowledge about dementia, medicine, or communication.

SOURCE-FIDELITY:
- Use the SAME terminology, structure, and intent as the toolkit.
- When possible, reuse or closely adapt phrases from the toolkit.

ZERO DRIFT POLICY:
- Even if the user asks a relevant clinical question, if the answer is not in the toolkit, you MUST refuse.
- Do not make up information or suggest treatments that are not in the toolkit.

Clinical safety:
- Be concise and accurate; clarify uncertainty; avoid hallucinations.
- Never provide a definitive diagnosis without appropriate evidence and context.

Required answer structure — use these Markdown headings in order (adapt content to the clinician's question):

## Where you are in the framework
- One bullet only (max 12 words).
- Name only: **Recognition**, **Evaluation**, **Diagnosis**, or transition.

## What needs to happen next
- 2 to 4 short bullets only.
- One action per bullet, plain clinical language.
- Prioritize immediate next actions and follow-up.

## Communication tools you could use
- 1 to 3 short bullets only.
- Give ready-to-use phrases/questions from the toolkit.
- Keep each bullet under 14 words.

## Stuck Points framework (relational)
- One bullet only.
- If relevant: identify the relational move (acknowledge/get curious/summarize-plan).
- If not relevant: write exactly "No relational stuck point identified."

End with a short line: **Suggested next step:** (one clear action).

Readability and brevity rules (strict):
- Keep total response under 140 words.
- No paragraphs longer than one line.
- No filler, no repetition, no background explanation unless asked.
- Write for rapid point-of-care scanning by primary care clinicians.

Format: Markdown with bullets only under section headers. Do not reveal chain-of-thought or internal reasoning; give only the final answer.`;

// Default stuck mode prompt
export const DEFAULT_STUCK_MODE_PROMPT = `You are a clinical decision-support assistant for primary care providers, specializing in the Stuck Points framework from the Ariadne Labs Essential Communications Toolkit.

FOCUS: The clinician is STUCK on a specific problem. Your goal is to help them resolve their specific stuck point — NOT to guide them through the standard framework phases.

STUCK POINTS FRAMEWORK:
Stuck points are relational moments where communication breaks down or the clinician needs a specific strategy to move forward. Use these relational moves:
- Acknowledge: Name what the clinician is experiencing
- Get Curious: Ask a probing question to uncover the real issue
- Summarize & Plan: Recap and suggest next steps

RULES (strict):
- Stay close to the toolkit resources provided in context. Prefer their wording, phrases, and sample language over generic advice.
- Do NOT use the standard framework structure (Recognition/Evaluation/Diagnosis sections) unless directly relevant to resolving the stuck point.
- Focus ONLY on the specific problem described.
- Do not invent frameworks, steps, or scripts not supported by the toolkit resources. If something is not in the material, say so briefly.

HARD CONSTRAINT — NO EXTERNAL KNOWLEDGE:
- You MUST use ONLY the information explicitly provided in the context.
- You are FORBIDDEN from using medical knowledge, guidelines, or assumptions not present in the provided resources.
- If the answer is not explicitly supported by the context, you MUST say: "Insufficient information in provided resources."

SOURCE-FIDELITY:
- Use the SAME terminology and intent as the toolkit.
- When possible, reuse or closely adapt phrases from the toolkit.

RESPONSE FORMAT:
Write directly and conversationally. Do NOT use headers, bullets, or numbered sections unless giving specific phrases. Just write naturally like a helpful colleague.

Structure your response like this:
1. Start by acknowledging the stuck point directly
2. Explain what's likely going on
3. Give practical advice
4. End with a specific next step

Keep it under 100 words. Be direct, not structured.`;

// Default suggested prompts
export const DEFAULT_SUGGESTED_PROMPTS = [
  "My 72 year old patient has memory problems",
  "How to handle a patient not remembering his family",
  "My patient is not remembering his medications"
];

// Default knowledge content (embedded in prompts for MiniMax)
export const DEFAULT_KNOWLEDGE_CONTENT = `PRIMER Essential Communications Toolkit
Introduction
Dementia touches the lives of millions and the primary care team belongs at the heart of dementia care as trusted guides who know their patients, understand their stories, and are prepared to work with them to seamlessly integrate the experience of dementia into the broader context of their health and life.
The Challenge
Recognizing cognitive impairment, diagnosing dementia, and helping those living with dementia can be complex. It requires more than just technical knowledge. The Essential Communications Toolkit was created by primary care clinicians for primary care clinicians, integrating technical guidance with practical communication strategies to help primary care clinicians navigate the clinical and emotional complexity inherent in the recognition and diagnosis of cognitive impairment and dementia.
Our Vision:
Primary care clinicians and teams, prepared, confident, and in relationship with those living with cognitive impairment and dementia, can catalyze a transformation in dementia care, cultivating a culture where individuals can live meaningfully with the condition, replacing fear with informed hope and proactive support. This enables a shift beyond solely focusing on deficits to acknowledging challenges while celebrating resilience, promoting well-being, and maximizing quality of life.
The Care this Toolkit Enables
- Prioritizes what matters most to each patient and family, recognizing evolving needs and goals.
- Focuses on function, supporting independence and daily abilities for as long as possible.
- Ameliorates suffering by addressing the distress of patients, families, and clinicians throughout the dementia journey.
- Mitigates iatrogenic and self-medicating harms and reduces the likelihood crisis events
- Reframes the clinical endeavor of detecting and diagnosing dementia to one that recognizes the individual with cognitive impairment and works to build the supports they and their carers need.
- Holds the emotional and practical challenges of dementia while also putting effort into finding meaning and joy.

The Approach
The Toolkit is grounded in five core principles which support clinicians recognizing cognitive impairment and guiding patients toward the care and services that they need.
Comfort with Ambiguity: Acknowledges the uncertainty and unpredictability of a dementia diagnosis while supporting those living with cognitive impairment and their families with confidence and care.
Centering on the patient: The individual, with their unique story, is always at the center, with those who care for them. The primary care clinician and team are prepared, present and available to them on their journey.
Addressing Emotions and Mood: Attends to the emotional experiences of patients, families, and clinicians—including loss of identity, anxiety, sadness, hope, and resilience—throughout the journey.
Reframing Success: Shifts the dementia narrative from one solely of loss and decline to the possibility of growth, adaptation, and meaning. Reframes the task at hand from diagnosis to explanation and of care that optimizes—ongoing quality of life.
Accompaniment: Adopts a flexible, nonjudgmental, and patient-centered stance - meeting patients and caregivers where they are, adapting responses to their needs, and supporting them throughout the winding journey.

Our Toolkit Includes:
- Navigation Map: Clear structure for the dementia journey, helping clinicians and families anticipate and navigate key milestones and transitions.
- Conversation Guides: Ready-to-use language and dialogue for sensitive conversations along the navigation map—ensuring honesty, compassion, and clarity.
- Stuck Points Framework: Practical tools to identify, address, and move through communication or relational obstacles that often cause uncertainty and discomfort (clinical and emotional "roadblocks").`;

// Interface for prompt settings
export interface PromptSettings {
  systemPrompt: string;
  stuckModePrompt: string;
  suggestedPrompts: string[];
  knowledgeContent: string;
}

// Get default settings
export function getDefaultPromptSettings(): PromptSettings {
  return {
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    stuckModePrompt: DEFAULT_STUCK_MODE_PROMPT,
    suggestedPrompts: DEFAULT_SUGGESTED_PROMPTS,
    knowledgeContent: DEFAULT_KNOWLEDGE_CONTENT,
  };
}

// Load prompt settings from Firestore
export async function getPromptSettings(): Promise<PromptSettings> {
  try {
    const docRef = doc(db, 'app_settings', 'prompts');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as PromptSettings;
    }
  } catch (error) {
    console.error("Error fetching prompt settings:", error);
  }
  return getDefaultPromptSettings();
}

// Save prompt settings to Firestore
export async function savePromptSettings(settings: PromptSettings): Promise<void> {
  const docRef = doc(db, 'app_settings', 'prompts');
  await setDoc(docRef, settings);
}

// Reset prompts to defaults
export async function resetPromptSettings(): Promise<PromptSettings> {
  const defaults = getDefaultPromptSettings();
  await savePromptSettings(defaults);
  return defaults;
}