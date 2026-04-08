import { GoogleGenAI } from '@google/genai';
import { retrieveRelevantChunks } from './rag';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
End your response with a "Suggested next step:" section.`;

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

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2,
      },
    });

    return response.text;
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}
