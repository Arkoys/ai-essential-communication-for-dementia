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
