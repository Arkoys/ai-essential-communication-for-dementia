import { GoogleGenAI } from '@google/genai';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface KnowledgeChunk {
  id: string;
  content: string;
  embedding: number[];
  source: string;
}

export interface RagConfig {
  topK: number;
  similarityThreshold: number;
}

export const DEFAULT_RAG_CONFIG: RagConfig = {
  topK: 3,
  similarityThreshold: 0.7,
};

export async function getRagConfig(): Promise<RagConfig> {
  try {
    const docRef = doc(db, 'app_settings', 'rag_config');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as RagConfig;
    }
  } catch (error) {
    console.error("Error fetching RAG config:", error);
  }
  return DEFAULT_RAG_CONFIG;
}

export async function saveRagConfig(config: RagConfig): Promise<void> {
  const docRef = doc(db, 'app_settings', 'rag_config');
  await setDoc(docRef, config);
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

  // Fetch all chunks (in a real app with large data, use a vector DB like Pinecone or pgvector)
  // For MVP, we fetch all and calculate similarity in memory
  const chunksRef = collection(db, 'knowledge_chunks');
  const snapshot = await getDocs(chunksRef);
  
  const chunks: (KnowledgeChunk & { similarity: number })[] = [];
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.embedding && data.embedding.length > 0) {
      const similarity = cosineSimilarity(queryEmbedding, data.embedding);
      if (similarity >= config.similarityThreshold) {
        chunks.push({
          id: doc.id,
          content: data.content,
          embedding: data.embedding,
          source: data.source,
          similarity,
        });
      }
    }
  });

  // Sort by similarity descending and take topK
  chunks.sort((a, b) => b.similarity - a.similarity);
  return chunks.slice(0, config.topK);
}
