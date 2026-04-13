import { GoogleGenAI } from '@google/genai';
import { DEFAULT_KNOWLEDGE_CHUNKS } from './defaultData';
import { retrieveRelevantChunks } from './rag';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'MiniMax-Text-01';
const MINIMAX_API_BASE_URL = process.env.MINIMAX_API_BASE_URL || 'https://api.minimaxi.chat';
const MINIMAX_API_PATH = process.env.MINIMAX_API_PATH || '/v1/chat/completions';

const SYSTEM_PROMPT = `You are a clinical decision-support assistant for primary care providers, grounded in the Ariadne Labs Essential Communications Toolkit.

You guide dementia-related consultations using this framework cycle:
1. Recognition
2. Evaluation
3. Diagnosis

Grounding rules (strict):
- Stay close to the toolkit resources provided in context. Prefer their wording, phases, and sample language over generic advice.
- Do not invent frameworks, steps, or scripts that are not supported by those resources. If something is not in the material, say so briefly and stay within what the toolkit offers.
- When you paraphrase, keep the same clinical intent and tone as Ariadne Labs (patient-centered, clear, non-abandoning).

Clinical safety:
- Be concise and accurate; clarify uncertainty; avoid hallucinations.
- Never provide a definitive diagnosis without appropriate evidence and context.

Required answer structure — use these Markdown headings in order (adapt content to the clinician's question):

## Where you are in the framework
State whether the situation maps best to **Recognition**, **Evaluation**, or **Diagnosis** (or a transition between them). One short paragraph.

## What needs to happen next
Concrete clinical and follow-up actions aligned with that phase, drawn from the toolkit.

## Communication tools you could use
Specific phrases, questions, or approaches from the toolkit (conversation guides, sample language) that fit this moment. Quote or closely adapt toolkit wording when possible.

## Stuck Points framework (relational)
When relevant, tie to the Stuck Points ideas (notice tension, acknowledge emotion, get curious, summarize and plan). If the situation is not a "stuck" moment, state that briefly and still offer relational language from the toolkit that fits.

End with a short line: **Suggested next step:** (one clear action).

Format: Markdown with bullets where helpful. Do not reveal chain-of-thought or internal reasoning; give only the final answer.`;

export type AnswerLengthMode = 'concise' | 'detailed';

/** Appended to Gemini system instruction when concise. */
function answerLengthSuffix(mode: AnswerLengthMode): string {
  if (mode === 'detailed') return '';
  return `

---

## Length mode: Concise (clinician-selected)
FINAL AUTHORITY over earlier wording: reply **≤55 words total** (hard cap). Same four ## headings in order; under each heading **exactly one** bullet of **≤8 words** OR one **≤8-word** sentence—no other lines under that heading. **Suggested next step:** one line, **≤8 words**. No intro, no closing filler.`;
}

/** Last block in MiniMax system prompt so it wins over the long toolkit. */
function minimaxConciseFinalBlock(): string {
  return `

---

## FINAL OVERRIDE (CONCISE — highest priority)
Ignore any earlier instruction to use paragraphs or “one short paragraph” per section. The clinician chose CONCISE.
Hard limits: **≤55 words** for the entire assistant message. Four ## headings only; under each heading **one** bullet, **≤8 words**. Then **Suggested next step:** one line, **≤8 words**. Toolkit is reference only—do not quote long passages.`;
}

/** Injected on the user turn so the model sees it after long system context. */
function userConciseReminder(): string {
  return '\n\n[Reply mode: CONCISE — ≤55 words total, one short bullet per ## section, Suggested next step ≤8 words.]';
}

function buildToolkitReferenceForPrompt(): string {
  return DEFAULT_KNOWLEDGE_CHUNKS.map(
    (chunk) => `### ${chunk.source}\n\n${chunk.content}`
  ).join('\n\n---\n\n');
}

function buildMinimaxSystemPrompt(answerLength: AnswerLengthMode): string {
  const base = `${SYSTEM_PROMPT}

---

## Toolkit reference (Ariadne Labs Essential Communications)
The following excerpts are the authoritative in-app reference. Your answers must follow this material: same terminology, phases, and sample language. Do not drift into general advice that is not reflected here.

${buildToolkitReferenceForPrompt()}

---

## Output format (required)
Reply with Markdown only. Follow the required headings (Where you are in the framework → What needs to happen next → Communication tools → Stuck Points framework). Do not include scratchpads, think tags, or hidden reasoning. Start with the first heading.`;

  return answerLength === 'concise' ? `${base}${minimaxConciseFinalBlock()}` : base;
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

async function generateWithMinimax(
  messages: { role: string; content: string }[],
  answerLength: AnswerLengthMode
) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error('MINIMAX_API_KEY is missing. Add it to your local env file.');
  }

  const url = `${MINIMAX_API_BASE_URL}${MINIMAX_API_PATH}`;
  const body: Record<string, unknown> = {
    model: MINIMAX_MODEL,
    messages,
    temperature: answerLength === 'concise' ? 0.1 : 0.2,
  };
  if (answerLength === 'concise') {
    body.max_tokens = 180;
  }

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

export async function generateClinicalResponseWithHistory(
  query: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  currentPhase: string | null,
  answerLength: AnswerLengthMode = 'detailed'
) {
  try {
    const contents = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const phaseContext = currentPhase
      ? `\n\n[System Note: The user is currently focusing on the "${currentPhase}" phase of the dementia care framework. Please tailor your response to this phase.]`
      : '';

    // MiniMax: no RAG — full toolkit text is embedded in the system prompt.
    if (LLM_PROVIDER === 'minimax') {
      const userContent =
        query +
        phaseContext +
        (answerLength === 'concise' ? userConciseReminder() : '');
      const minimaxMessages = [
        { role: 'system', content: buildMinimaxSystemPrompt(answerLength) },
        ...history.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: 'user', content: userContent },
      ];

      return await generateWithMinimax(minimaxMessages, answerLength);
    }

    // Gemini: RAG retrieval for relevant chunks only
    const relevantChunks = await retrieveRelevantChunks(query);
    let contextString = '';
    if (relevantChunks.length > 0) {
      contextString = "\n\n[System Note: Here is some relevant clinical context retrieved from Ariadne Labs resources. Use this to inform your response if applicable:]\n";
      relevantChunks.forEach((chunk, index) => {
        contextString += `\n--- Resource ${index + 1} (${chunk.source}) ---\n${chunk.content}\n`;
      });
    }

    const userText =
      query +
      contextString +
      phaseContext +
      (answerLength === 'concise' ? userConciseReminder() : '');

    contents.push({
      role: 'user',
      parts: [{ text: userText }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_PROMPT + answerLengthSuffix(answerLength),
        temperature: answerLength === 'concise' ? 0.1 : 0.2,
        ...(answerLength === 'concise' ? { maxOutputTokens: 200 } : {}),
      },
    });

    return sanitizeModelOutput(response.text || '');
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}
