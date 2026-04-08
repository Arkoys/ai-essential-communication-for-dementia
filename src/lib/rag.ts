import { GoogleGenAI } from '@google/genai';
import { getDb } from './db';
import { KnowledgeChunk, RagConfig, DEFAULT_RAG_CONFIG } from './rag-types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getRagConfig(): Promise<RagConfig> {
  try {
    const db = await getDb();
    const config = await db.get('SELECT * FROM rag_config WHERE id = ?', ['default']);
    if (config) {
      return {
        topK: config.topK,
        similarityThreshold: config.similarityThreshold
      };
    }
  } catch (error) {
    console.error("Error fetching RAG config:", error);
  }
  return DEFAULT_RAG_CONFIG;
}

export async function saveRagConfig(config: RagConfig): Promise<void> {
  const db = await getDb();
  await db.run(
    'UPDATE rag_config SET topK = ?, similarityThreshold = ? WHERE id = ?',
    [config.topK, config.similarityThreshold, 'default']
  );
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-2-preview',
    contents: text,
  });
  return response.embeddings?.[0]?.values || [];
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function retrieveRelevantChunks(query: string): Promise<KnowledgeChunk[]> {
  const config = await getRagConfig();
  const queryEmbedding = await generateEmbedding(query);
  
  if (!queryEmbedding || queryEmbedding.length === 0) {
    return [];
  }

  const db = await getDb();
  const rows = await db.all('SELECT * FROM knowledge_chunks');
  
  const chunks: (KnowledgeChunk & { similarity: number })[] = [];
  
  for (const row of rows) {
    let embedding: number[] = [];
    try {
      embedding = JSON.parse(row.embedding);
    } catch (e) {
      continue;
    }

    if (embedding && embedding.length > 0) {
      const similarity = cosineSimilarity(queryEmbedding, embedding);
      if (similarity >= config.similarityThreshold) {
        chunks.push({
          id: row.id,
          content: row.content,
          embedding: embedding,
          source: row.source,
          similarity,
        });
      }
    }
  }

  chunks.sort((a, b) => b.similarity - a.similarity);
  return chunks.slice(0, config.topK);
}
