import { GoogleGenAI } from '@google/genai';
import { DEFAULT_KNOWLEDGE_CHUNKS } from './defaultData';
import { retrieveRelevantChunks } from './rag';
import { 
  DEFAULT_SYSTEM_PROMPT, 
  DEFAULT_STUCK_MODE_PROMPT, 
  DEFAULT_KNOWLEDGE_CONTENT,
  getPromptSettings 
} from './promptSettings';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'MiniMax-Text-01';
const MINIMAX_API_BASE_URL = process.env.MINIMAX_API_BASE_URL || 'https://api.minimaxi.chat';
const MINIMAX_API_PATH = process.env.MINIMAX_API_PATH || '/v1/chat/completions';

// Use configurable system prompt, fallback to default
const SYSTEM_PROMPT = DEFAULT_SYSTEM_PROMPT;

// Build toolkit reference from default knowledge chunks
function buildToolkitReferenceForPrompt(): string {
  return DEFAULT_KNOWLEDGE_CHUNKS.map(
    (chunk) => `### ${chunk.source}\n\n${chunk.content}`
  ).join('\n\n---\n\n');
}

// Build full MiniMax system prompt with knowledge embedded
function buildMinimaxSystemPrompt(systemPrompt: string, knowledgeContent: string): string {
  return `${systemPrompt}

---

## Toolkit reference (Ariadne Labs Essential Communications)
The following excerpts are the authoritative in-app reference. Your answers must follow this material: same terminology, phases, and sample language. Do not drift into general advice that is not reflected here.

${knowledgeContent || buildToolkitReferenceForPrompt()}

---

## Output format (STRICT — mandatory)

You MUST follow EXACTLY this structure and NOTHING else.

Your response MUST contain ONLY the following 4 sections, in this exact order and with these exact titles:

## 1. Where you are in the framework
One bullet only (max 12 words). Name phase/transition only.

## 2. What needs to happen next
2 to 4 short action bullets.

## 3. Communication tools you could use
1 to 3 short toolkit phrase/question bullets.

## 4. Relational considerations (Stuck Points framework)
One bullet only. If not relevant, write exactly: "No relational stuck point identified."

FORMATTING RULES (SPACING — MANDATORY):
- Insert ONE blank line after each section title.
- Insert ONE blank line between sections in your answer.
- Do NOT write content on the same line as a section title.
- Use short bullets only (no prose paragraphs).
- Keep each bullet to one idea.

BREVITY RULES (MANDATORY):
- Entire response under 140 words.
- Direct, actionable, point-of-care wording.
- No introductions or conclusions.

FINAL RULES:
- Do NOT add any other sections.
- Do NOT rename any section.
- Do NOT reorder sections.
- Do NOT merge sections.
- Do NOT add introductions or conclusions outside these sections.
- Output MUST start directly with "## 1. Where you are in the framework".
Reply in Markdown only.


`;
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

  // Model sometimes outputs a think block then the real§ answer — keep the tail after the last closing tag.
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

async function generateWithMinimax(
  messages: { role: string; content: string }[]
) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error('MINIMAX_API_KEY is missing. Add it to your local env file.');
  }

  const url = `${MINIMAX_API_BASE_URL}${MINIMAX_API_PATH}`;
  const body: Record<string, unknown> = {
    model: MINIMAX_MODEL,
    messages,
    temperature: 0.2,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MiniMax API request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const rawText = (
    data?.choices?.[0]?.message?.content ||
    data?.reply ||
    data?.output_text ||
    'No response text returned from MiniMax.'
  );
  return sanitizeModelOutput(rawText);
}

function buildStuckModeSystemPrompt(stuckModePrompt: string, knowledgeContent: string): string {
  return `${stuckModePrompt}

---

## Toolkit reference (Ariadne Labs Essential Communications)

${knowledgeContent || buildToolkitReferenceForPrompt()}

---

## Output format (STRICT — mandatory for Stuck Mode)

Write directly and conversationally. Structure your response naturally without headers or bullet lists.
Keep it under 100 words. Be direct and helpful.
`;
}

export async function generateClinicalResponseWithHistory(
  query: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  currentPhase: string | null,
  isStuck?: boolean
) {
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

    // Use configurable prompts, fallback to defaults
    const systemPrompt = isStuck 
      ? buildStuckModeSystemPrompt(
          promptSettings.stuckModePrompt || DEFAULT_STUCK_MODE_PROMPT,
          promptSettings.knowledgeContent || DEFAULT_KNOWLEDGE_CONTENT
        )
      : promptSettings.systemPrompt || SYSTEM_PROMPT;

    // MiniMax: no RAG — full toolkit text is embedded in the system prompt.
    if (LLM_PROVIDER === 'minimax') {
      const userContent = query + phaseContext;
      const minimaxMessages = [
        { 
          role: 'system', 
          content: isStuck 
            ? buildStuckModeSystemPrompt(
                promptSettings.stuckModePrompt || DEFAULT_STUCK_MODE_PROMPT,
                promptSettings.knowledgeContent || DEFAULT_KNOWLEDGE_CONTENT
              )
            : buildMinimaxSystemPrompt(
                promptSettings.systemPrompt || SYSTEM_PROMPT,
                promptSettings.knowledgeContent || DEFAULT_KNOWLEDGE_CONTENT
              )
        },
        ...history.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: 'user', content: userContent },
      ];

      return await generateWithMinimax(minimaxMessages);
    }

    // Gemini: RAG retrieval for relevant chunks only
    const relevantChunks = await retrieveRelevantChunks(query);
    let contextString = '';
    if (relevantChunks.length > 0) {
      contextString = "\n\n[System Note: Here is some relevant clinical context retrieved from Ariadne Labs resources. Use this to inform your response if applicable: The following is the ONLY information you are allowed to use. You MUST NOT use any external knowledge. If the answer is not contained here, reply: Insufficient information in provided resources.]\n";
      relevantChunks.forEach((chunk, index) => {
        contextString += `\n--- Resource ${index + 1} (${chunk.source}) ---\n${chunk.content}\n`;
      });
    }

    const userText =
      query +
      contextString +
      phaseContext;

    contents.push({
      role: 'user',
      parts: [{ text: userText }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
      },
    });

    return sanitizeModelOutput(response.text || '');
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}
