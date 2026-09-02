'use client';

// Server-side RAG retrieval wrappers. The API does the embedding + scoring
// so we never need a client-side Gemini key.

import {
  getRagConfig as fetchRagConfig,
  saveRagConfig as persistRagConfig,
  listKnowledgeChunks,
  createKnowledgeChunk,
  deleteKnowledgeChunk,
  ragSearch,
  type ApiRagConfig,
  type ApiKnowledgeChunk,
} from '@/lib/api-client';

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

function wireToRagConfig(wire: ApiRagConfig): RagConfig {
  return {
    topK: wire.topK,
    similarityThreshold: Number(wire.minSimilarity) || DEFAULT_RAG_CONFIG.similarityThreshold,
  };
}

export async function getRagConfig(): Promise<RagConfig> {
  try {
    const { config, defaults } = await fetchRagConfig();
    return wireToRagConfig((config ?? defaults) as ApiRagConfig);
  } catch (error) {
    console.error('Error fetching RAG config:', error);
    return DEFAULT_RAG_CONFIG;
  }
}

export async function saveRagConfig(config: RagConfig): Promise<void> {
  await persistRagConfig({
    topK: config.topK,
    minSimilarity: String(config.similarityThreshold),
    enabled: true,
  });
}

export async function generateEmbedding(_text: string): Promise<number[]> {
  // Client-side embedding generation is no longer used — the API handles it.
  // Returning an empty array lets callers bail out gracefully if they still
  // call this function.
  return [];
}

export async function retrieveRelevantChunks(query: string): Promise<KnowledgeChunk[]> {
  try {
    const config = await getRagConfig();
    const { chunks } = await ragSearch(query, config.topK, config.similarityThreshold);
    return chunks.map((c) => ({
      id: c.id,
      content: c.content,
      embedding: [],
      source: c.source,
    }));
  } catch (error) {
    console.error('Error retrieving relevant chunks:', error);
    return [];
  }
}

// Re-export the chunk CRUD helpers so AdminPanel.tsx can keep its existing
// import shape (`import { ... } from '../lib/rag'`).
export async function listChunks(): Promise<ApiKnowledgeChunk[]> {
  const { chunks } = await listKnowledgeChunks();
  return chunks;
}

export async function addChunk(input: { source: string; content: string; embedding?: number[] }) {
  return createKnowledgeChunk(input);
}

export async function removeChunk(id: string) {
  return deleteKnowledgeChunk(id);
}
