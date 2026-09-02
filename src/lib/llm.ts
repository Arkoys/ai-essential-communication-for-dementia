'use client';

import { DEFAULT_KNOWLEDGE_CHUNKS } from './defaultData';
import { retrieveRelevantChunks } from './rag';
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_STUCK_MODE_PROMPT,
  DEFAULT_KNOWLEDGE_CONTENT,
  getPromptSettings
} from './promptSettings';
import { harvardChatCompletion, isHarvardConfigured } from './providers/harvard';
import {
  CURATED_EXTERNAL_RESOURCES,
  generatePositiveCitationList
} from './resources';
import { runClassificationPipeline, buildSystemPrompt } from './classifier/pipeline';
import { TEMPLATE_SYSTEM_ADDONS } from './templates';
import { CONDENSED_MODE_ADDON } from './promptSettings';
import type { ResponsePath } from './classifier/types';
import { chatCompletion as serverChatCompletion } from '@/lib/api-client';

// Harvard configuration
const HARVARD_DEFAULT_MODEL = 'gpt-5.5';

// Use configurable system prompt, fallback to default
const SYSTEM_PROMPT = DEFAULT_SYSTEM_PROMPT;

// Build toolkit reference from default knowledge chunks
function buildToolkitReferenceForPrompt(): string {
  const chunks = DEFAULT_KNOWLEDGE_CHUNKS.map(
    (chunk) => `### ${chunk.source}\n\n${chunk.content}`
  ).join('\n\n---\n\n');
  
  // Append curated external resources with STRICT positive-only citation rules
  return `${chunks}

---

## Curated External Resources
${CURATED_EXTERNAL_RESOURCES}

---

## CITATION RULES (MANDATORY - STRICT)
### For Internal Sources (Ariadne Labs chunks):
You MAY cite these exact internal sources:
- "Ariadne Labs - Primer"
- "Ariadne Labs - Stuck Points Framework"
- "Ariadne Labs - Sample Language (Phase 1: Recognition)"
- "Ariadne Labs - Sample Language (Phase 2: Evaluation)"
- "Ariadne Labs - Sample Language (Phase 3: Diagnosis)"

### For External Sources:
${generatePositiveCitationList()}

### FORBIDDEN:
- DO NOT cite IQCODE (it is NOT in our resources)
- DO NOT cite any assessment tool, article, or resource NOT in the ALLOWED list above
- DO NOT invent or hallucinate any citation
- DO NOT include any external URLs or links except those from the ALLOWED list above
- If you mention any external resource, you MUST use ONLY the exact URLs provided in the ALLOWED list
- DO NOT add subpages, specific article URLs, or any URL variations not explicitly listed
- If no resource from the allowed list is relevant, simply do not include a Resources section
- NEVER write out URLs in full (e.g., write "[National Institute on Aging](https://www.nia.nih.gov/health/alzheimers-and-dementia)" not "https://www.nia.nih.gov/health/...")`;
}

// Build full Harvard system prompt with knowledge embedded
function buildHarvardSystemPrompt(systemPrompt: string, knowledgeContent: string): string {
  const baseKnowledge = knowledgeContent || buildToolkitReferenceForPrompt();
  
  // Always include Curated External Resources
  return `${systemPrompt}

---

## Toolkit reference (Ariadne Labs Essential Communications)
The following excerpts are the authoritative in-app reference. Your answers must follow this material: same terminology, phases, and sample language. Do not drift into general advice that is not reflected here.

${baseKnowledge}

---

## Curated External Resources (USE THESE ONLY)
You can use/mention the following resources only in your response:

${CURATED_EXTERNAL_RESOURCES}

---

## CITATION RULES (MANDATORY - STRICT)
### For Internal Sources (Ariadne Labs chunks):
You MAY cite these exact internal sources:
- "Ariadne Labs - Primer"
- "Ariadne Labs - Stuck Points Framework"
- "Ariadne Labs - Sample Language (Phase 1: Recognition)"
- "Ariadne Labs - Sample Language (Phase 2: Evaluation)"
- "Ariadne Labs - Sample Language (Phase 3: Diagnosis)"

### For External Sources:
${generatePositiveCitationList()}

### FORBIDDEN:
- DO NOT cite IQCODE (it is NOT in our resources)
- DO NOT cite any assessment tool, article, or resource NOT in the ALLOWED list above
- DO NOT invent or hallucinate any citation
- DO NOT include any external URLs or links except those from the ALLOWED list above
- If you mention any external resource, you MUST use ONLY the exact URLs provided in the ALLOWED list
- DO NOT add subpages, specific article URLs, or any URL variations not explicitly listed
- If no resource from the allowed list is relevant, simply do not include a Resources section
- NEVER write out URLs in full (e.g., write "[National Institute on Aging](https://www.nia.nih.gov/health/alzheimers-and-dementia)" not "https://www.nia.nih.gov/health/...")`;
}

/** Strip chain-of-thought wrappers some models (e.g. MiniMax) emit. */
function sanitizeModelOutput(text: string): string {
  let out = text;
  const stripPatterns: RegExp[] = [
    /<redacted_thinking>[\s\S]*?<\/think>/gi,
    /<redacted_thinking>[\s\S]*?<\/redacted_thinking>/gi,
    /<reasoning>[\s\S]*?<\/reasoning>/gi,
    /<analysis>[\s\S]*?<\/analysis>/gi,
    /<scratchpad>[\s\S]*?<\/scratchpad>/gi,
    /<internal>[\s\S]*?<\/internal>/gi,
    /```(?:thinking|reasoning|internal|scratchpad)[\s\S]*?```/gi,
  ];
  for (const re of stripPatterns) {
    out = out.replace(re, '');
  }
  out = out.replace(/^\s*(?:thinking|reasoning|scratchpad)\s*:\s*[^\n]+\n*/gim, '');

  // Model sometimes outputs a think block then the real answer — keep the tail after the last closing tag.
  const afterThinkClose = /(?:<\/think>|<\/redacted_thinking>|<\/reasoning>)\s*/gi;
  let match: RegExpExecArray | null;
  let lastEnd = -1;
  while ((match = afterThinkClose.exec(out)) !== null) {
    lastEnd = match.index + match[0].length;
  }
  if (lastEnd > 0) {
    const tail = out.slice(lastEnd).trim();
    if (tail.length > 40) {
      out = tail;
    }
  }

  return out
    .replace(/^\s*Insufficient Information\s*$/gim, '## Insufficient Information')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Detection patterns for insufficient information responses
const INSUFFICIENT_PATTERNS = [
  /^insufficient information$/im,
  /insufficient information in provided resources/i,
  /not in the provided resources/i,
  /not supported by the context/i,
  /cannot provide.*because.*not in/i,
  /cannot answer.*not enough/i,
  /^insufficient$/im,
  /the context.*not sufficient/i,
  /not enough information/i,
];

// Check if the response indicates insufficient information
export function isInsufficientInfoResponse(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Primary check: any mention of "insufficient" in the text
  const hasInsufficient = lowerText.includes('insufficient');
  
  // Check if response has full framework format (3+ section headers)
  const sectionCount = (text.match(/^## /gm) || []).length;
  const hasFullFormat = sectionCount >= 3;
  
  // If contains "insufficient" but NOT full framework format → flag as insufficient
  if (hasInsufficient && !hasFullFormat) {
    return true;
  }
  
  // Also check for other "not enough context" patterns
  if (lowerText.includes('not enough information') ||
      lowerText.includes('cannot determine') ||
      lowerText.includes('not enough context') ||
      lowerText.includes('unable to determine')) {
    return true;
  }
  
  return false;
}

// Patterns for detecting insufficient user input
const VAGUE_INPUT_PATTERNS = [
  /^help$/i,
  /^test$/i,
  /^hi$/i,
  /^hello$/i,
  /^hey$/i,
  /^dementia$/i,
  /^patient$/i,
  /^memory$/i,
  /^confused$/i,
  /^\?$/i,
  /^.$/i,
];

const VAGUE_KEYWORDS = [
  'help me',
  'what to do',
  'what should i',
  'not sure',
  'confused',
  'don\'t know',
  'idk',
  'tell me about',
  'explain',
];

// Check if user input is insufficient/lacking context
export function isInsufficientUserInput(query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  
  // DEFINITE insufficient patterns (immediate fail)
  const immediateFailPatterns = [
    /^help$/i, /^test$/i, /^hi$/i, /^hello$/i, /^hey$/i,
    /^dementia$/i, /^patient$/i, /^memory$/i, /^confused$/i,
    /^.$/, /^\?$/, /^ok$/i, /^yes$/i, /^no$/i, /^maybe$/i,
  ];
  
  if (immediateFailPatterns.some(p => p.test(trimmed))) {
    return true;
  }
  
  // Check if input is very short
  if (trimmed.length < 10) {
    return true;
  }
  
  // Check for vague greeting/question patterns
  if (trimmed.match(/^(hi|hello|hey|help|please)/i) && trimmed.length < 20) {
    return true;
  }
  
  // Check for generic words without context
  const genericPatterns = [
    'what to do', 'what should i', 'not sure', 'don\'t know',
    'idk', 'tell me about', 'explain', 'what is', 'how do',
  ];
  
  if (genericPatterns.some(p => trimmed.includes(p)) && trimmed.length < 60) {
    return true;
  }
  
  // Score the input for specificity
  let specificityScore = 0;
  
  // Positive indicators (add points)
  const hasAge = /\d{1,3}\s*(year|yr|yo|y\/o|age)/i.test(trimmed);
  if (hasAge) specificityScore += 2;
  
  const hasSymptoms = /forgot|confus|memory|cognitive|behavior|agitat|repeat|lost|wand|disorient|bathroom|kitchen|repeat/i.test(trimmed);
  if (hasSymptoms) specificityScore += 2;
  
  const hasFamily = /wife|husband|son|daughter|family|carer|caregiver|partner|sibling/i.test(trimmed);
  if (hasFamily) specificityScore += 1;
  
  const hasMedical = /medication|appointment|doctor|mri|ct|scan|test|diagnosis|moca|mmse/i.test(trimmed);
  if (hasMedical) specificityScore += 1;
  
  const hasSpecificDetails = /monday|tuesday|wednesday|thursday|friday|saturday|sunday|this morning|yesterday|last week/i.test(trimmed);
  if (hasSpecificDetails) specificityScore += 1;
  
  // Negative indicators (subtract points)
  if (trimmed.includes('?')) specificityScore -= 1;
  if (trimmed.match(/^(my|how|what|why|should)/)) specificityScore -= 1;
  
  // Final decision
  if (specificityScore < 2 && trimmed.length < 80) {
    return true;
  }
  
  return false;
}

// Generate a user guidance message for insufficient information scenarios (Template 1)
export function getInsufficientInfoGuidance(): string {
  return `I'd like to help you navigate this conversation, but I need a bit more context to point you in the right direction.

In order to best support you, I need to know:

- Patient age
- Symptoms presenting, if any
- Duration and onset pattern of symptoms
- What is driving your concern?

Once you provide this information, I can help you identify where you are in the dementia diagnosis journey and offer sample language to support your conversations.`;
}

async function generateWithHarvard(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  model: string,
  temperature: number
) {
  const result = await serverChatCompletion({
    provider: 'harvard',
    model,
    messages,
    temperature,
  });
  return sanitizeModelOutput(
    result?.choices?.[0]?.message?.content || 'No response returned.'
  );
}

function buildStuckModeSystemPrompt(stuckModePrompt: string, knowledgeContent: string): string {
  return `${stuckModePrompt}

---

## Toolkit reference (Ariadne Labs Essential Communications)

${knowledgeContent || buildToolkitReferenceForPrompt()}

---

## Curated External Resources
${CURATED_EXTERNAL_RESOURCES}

---

## CITATION RULES (MANDATORY - STRICT)
### For Internal Sources (Ariadne Labs chunks):
You MAY cite these exact internal sources:
- "Ariadne Labs - Primer"
- "Ariadne Labs - Stuck Points Framework"
- "Ariadne Labs - Sample Language (Phase 1: Recognition)"
- "Ariadne Labs - Sample Language (Phase 2: Evaluation)"
- "Ariadne Labs - Sample Language (Phase 3: Diagnosis)"

### For External Sources:
${generatePositiveCitationList()}

### FORBIDDEN:
- DO NOT cite IQCODE (it is NOT in our resources)
- DO NOT cite any assessment tool, article, or resource NOT in the ALLOWED list above
- DO NOT invent or hallucinate any citation
- DO NOT include any external URLs or links except those from the ALLOWED list above
- If you mention any external resource, you MUST use ONLY the exact URLs provided in the ALLOWED list
- DO NOT add subpages, specific article URLs, or any URL variations not explicitly listed
- If no resource from the allowed list is relevant, simply do not include a Resources section
- NEVER write out URLs in full (e.g., write "[National Institute on Aging](https://www.nia.nih.gov/health/alzheimers-and-dementia)" not "https://www.nia.nih.gov/health/...")

---

## Output format (STRICT — mandatory for Stuck Mode)

Write directly and conversationally. Structure your response naturally without headers or bullet lists.
Keep it under 100 words. Be direct and helpful.
`;
}

export interface GenerationResult {
  response: string;
  template: ResponsePath;
  tier1Complete: boolean;
  safetyOverride: boolean;
}

export async function generateClinicalResponseWithHistory(
  query: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  currentPhase: string | null,
  isStuck?: boolean,
  forceProvider?: string,
  responseMode?: 'basic' | 'condensed'
): Promise<GenerationResult> {
  try {
    // Load prompt settings from Firestore
    const promptSettings = await getPromptSettings();
    
    const contents = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const phaseContext = currentPhase
      ? `\n\n[System Note: The user is currently focusing on the "${currentPhase}" phase of the dementia care framework. Please tailor your response to this phase.]`
      : '';

    // Determine provider: forceProvider (for dual mode) > Firestore settings > env var > default
    const provider = (forceProvider || promptSettings.provider || 'harvard').toLowerCase();
    
    // ===== STEP 1: Run Classification Pipeline =====
    let classificationResult;
    let templateAddon = '';
    let detectedTemplate: ResponsePath = 'assess_template_1_or_3';
    let tier1Complete = false;
    let safetyOverride = false;
    
    if (!isStuck) {
      try {
        const pipelineResult = await runClassificationPipeline(
          query,
          history,
          'openai'
        );
        
        templateAddon = pipelineResult.systemPromptAddon;
        detectedTemplate = pipelineResult.template;
        tier1Complete = pipelineResult.tier1Complete;
        safetyOverride = pipelineResult.safetyOverride;
        classificationResult = pipelineResult;
        
        // Log for debugging
        console.log('[Template Classification]', {
          template: detectedTemplate,
          tier1Complete,
          safetyOverride,
          fallback: pipelineResult.fallbackTriggered
        });
      } catch (classError) {
        console.error('Classification pipeline failed:', classError);
        // Fallback to template 1 if classification fails
        templateAddon = TEMPLATE_SYSTEM_ADDONS.template_1;
        detectedTemplate = 'assess_template_1_or_3';
      }
    }

    // ===== STEP 2: Build System Prompt with Template Addon =====
    const knowledgeContent = promptSettings.knowledgeContent || DEFAULT_KNOWLEDGE_CONTENT;
    const baseSystemPrompt = promptSettings.systemPrompt || SYSTEM_PROMPT;
    
    // Build the base prompt with template addon
    let promptWithTemplate = templateAddon 
      ? buildSystemPrompt(
          buildHarvardSystemPrompt(baseSystemPrompt, knowledgeContent),
          templateAddon
        )
      : buildHarvardSystemPrompt(baseSystemPrompt, knowledgeContent);
    
    // Add condensed mode addon if enabled (only in normal mode, not stuck mode)
    const effectiveResponseMode = responseMode === 'condensed' && !isStuck ? 'condensed' : 'basic';
    if (effectiveResponseMode === 'condensed') {
      promptWithTemplate = `${promptWithTemplate}\n\n${CONDENSED_MODE_ADDON}`;
    }
    
    const fullSystemPrompt = promptWithTemplate;

    // ===== STEP 3: Generate Response Based on Provider =====
    
    // Harvard (sole supported provider): OpenAI-compatible gateway with
    // api-key auth (server-side proxy). Anything other than 'harvard' is
    // routed to the Gemini fallback below for graceful degradation.
    if (provider === 'harvard') {
      const userContent = query + phaseContext;
      const harvardModel = promptSettings.selectedModel || HARVARD_DEFAULT_MODEL;

      const harvardMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        {
          role: 'system',
          content: isStuck
            ? buildStuckModeSystemPrompt(
                promptSettings.stuckModePrompt || DEFAULT_STUCK_MODE_PROMPT,
                knowledgeContent
              )
            : fullSystemPrompt
        },
        ...history.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user', content: userContent },
      ];

      const responseText = await generateWithHarvard(
        harvardMessages,
        harvardModel,
        0.2
      );
      return {
        response: responseText,
        template: detectedTemplate,
        tier1Complete,
        safetyOverride,
      };
    }

    // Gemini fallback: RAG retrieval for relevant chunks only
    const relevantChunks = await retrieveRelevantChunks(query);
    let contextString = '';
    if (relevantChunks.length > 0) {
      contextString = "\n\n[System Note: Here is some relevant clinical context retrieved from Ariadne Labs resources. Use this to inform your response if applicable: The following is the ONLY information you are allowed to use. You MUST NOT use any external knowledge. If the answer is not contained here, reply: Insufficient information in provided resources.]\n";
      relevantChunks.forEach((chunk, index) => {
        contextString += `\n--- Resource ${index + 1} (${chunk.source}) ---\n${chunk.content}\n`;
      });
    }

    const userText = query + contextString + phaseContext;

    const result = await serverChatCompletion({
      provider: 'gemini',
      model: 'gemini-1.5-pro',
      messages: [
        { role: 'system', content: fullSystemPrompt },
        { role: 'user', content: userText },
      ],
      temperature: 0.2,
    });

    return {
      response: sanitizeModelOutput(result.choices?.[0]?.message?.content ?? ''),
      template: detectedTemplate,
      tier1Complete,
      safetyOverride
    };
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}

// Backward compatible function (returns just the response string)
export async function generateClinicalResponseString(
  query: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  currentPhase: string | null,
  isStuck?: boolean,
  forceProvider?: string
): Promise<string> {
  const result = await generateClinicalResponseWithHistory(query, history, currentPhase, isStuck, forceProvider);
  return result.response;
}
