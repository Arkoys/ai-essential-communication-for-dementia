import { GoogleGenAI } from '@google/genai';
import { retrieveRelevantChunks } from './rag';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'MiniMax-Text-01';
const MINIMAX_API_BASE_URL = process.env.MINIMAX_API_BASE_URL || 'https://api.minimaxi.chat';
const MINIMAX_API_PATH = process.env.MINIMAX_API_PATH || '/v1/chat/completions';

const SYSTEM_PROMPT = `You are a clinical decision-support assistant for primary care providers.

You help guide dementia-related consultations using a structured framework:
1. Recognition
2. Evaluation
3. Diagnosis

You must:
- Be concise and clinically accurate
- Suggest next steps
- Clarify uncertainty
- Avoid hallucinations
- Never provide definitive diagnosis without evidence

Always align your response with the current phase of care.

Return your response in Markdown format. Use clear headings, bullet points, and bold text for emphasis.
End your response with a "Suggested next step:" section.

Do not reveal chain-of-thought, hidden reasoning, or internal deliberations. Provide only the final answer.`;

function sanitizeModelOutput(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\s*Insufficient Information\s*$/gim, '## Insufficient Information')
    .trim();
}

async function generateWithMinimax(messages: { role: string; content: string }[]) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error('MINIMAX_API_KEY is missing. Add it to your local env file.');
  }

  const url = `${MINIMAX_API_BASE_URL}${MINIMAX_API_PATH}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MINIMAX_MODEL,
      messages,
      temperature: 0.2,
    }),
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
  currentPhase: string | null
) {
  try {
    const contents = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // RAG Retrieval
    const relevantChunks = await retrieveRelevantChunks(query);
    let contextString = '';
    if (relevantChunks.length > 0) {
      contextString = "\n\n[System Note: Here is some relevant clinical context retrieved from Ariadne Labs resources. Use this to inform your response if applicable:]\n";
      relevantChunks.forEach((chunk, index) => {
        contextString += `\n--- Resource ${index + 1} (${chunk.source}) ---\n${chunk.content}\n`;
      });
    }

    const phaseContext = currentPhase 
      ? `\n\n[System Note: The user is currently focusing on the "${currentPhase}" phase of the dementia care framework. Please tailor your response to this phase.]`
      : '';

    contents.push({
      role: 'user',
      parts: [{ text: query + contextString + phaseContext }]
    });

    if (LLM_PROVIDER === 'minimax') {
      const minimaxMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: 'user', content: query + contextString + phaseContext },
      ];

      return await generateWithMinimax(minimaxMessages);
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2,
      },
    });

    return sanitizeModelOutput(response.text || '');
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}
