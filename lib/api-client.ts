/**
 * Thin client-side wrapper around the Postgres-backed API routes.
 *
 * Every fetch includes the session cookie automatically (same-origin) so the
 * server can identify the user via Better Auth. All functions return parsed
 * JSON or throw an `ApiError` with a useful message.
 */

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    credentials: 'same-origin',
  });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => null);
    }
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: unknown }).error)
        : res.statusText || `HTTP ${res.status}`;
    throw new ApiError(message, res.status, body);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

/* -------------------------------------------------------------------------- */
/*  Conversations                                                             */
/* -------------------------------------------------------------------------- */

export interface ApiConversation {
  id: string;
  userId: string;
  title: string;
  type: 'normal' | 'dual' | 'compare';
  primaryProvider: string | null;
  secondaryProvider: string | null;
  currentPhase: string | null;
  currentStep: string | null;
  lastDetectedPhase: string | null;
  createdAt: string;
  updatedAt: string;
}

export function listConversations(): Promise<{ conversations: ApiConversation[] }> {
  return request('/api/conversations');
}

export function createConversation(input: {
  title?: string;
  type?: 'normal' | 'dual' | 'compare';
  primaryProvider?: string;
  secondaryProvider?: string;
}): Promise<{ conversation: ApiConversation }> {
  return request('/api/conversations', { method: 'POST', body: JSON.stringify(input) });
}

export function patchConversation(
  id: string,
  patch: Partial<{
    title: string;
    currentPhase: string | null;
    currentStep: string | null;
    lastDetectedPhase: string | null;
    primaryProvider: string | null;
    secondaryProvider: string | null;
  }>,
): Promise<{ conversation: ApiConversation }> {
  return request(`/api/conversations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function deleteConversation(id: string): Promise<{ ok: true }> {
  return request(`/api/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/* -------------------------------------------------------------------------- */
/*  Messages                                                                  */
/* -------------------------------------------------------------------------- */

export interface ApiMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  isStuck: boolean;
  isInsufficientInfo: boolean;
  lane: 'single' | 'primary' | 'secondary' | 'basic' | 'condensed';
  createdAt: string;
}

export function listMessages(conversationId: string): Promise<{ messages: ApiMessage[] }> {
  return request(`/api/conversations/${encodeURIComponent(conversationId)}/messages`);
}

export function appendMessage(
  conversationId: string,
  input: {
    role: 'user' | 'assistant';
    content: string;
    isStuck?: boolean;
    isInsufficientInfo?: boolean;
    clientId?: string;
    lane?: 'single' | 'primary' | 'secondary' | 'basic' | 'condensed';
  },
): Promise<{ message: ApiMessage }> {
  return request(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/* -------------------------------------------------------------------------- */
/*  Prompt settings                                                          */
/* -------------------------------------------------------------------------- */

export function getPromptSettings(): Promise<{
  settings: ApiPromptSettings | null;
  defaults: ApiPromptSettings;
}> {
  return request('/api/prompt-settings');
}

export function savePromptSettings(
  settings: Partial<ApiPromptSettings>,
): Promise<{ settings: ApiPromptSettings }> {
  return request('/api/prompt-settings', { method: 'PUT', body: JSON.stringify(settings) });
}

export function resetPromptSettings(): Promise<{ settings: null; defaults: ApiPromptSettings }> {
  return request('/api/prompt-settings', { method: 'DELETE' });
}

export interface ApiPromptSettings {
  provider: string;
  dualModeProvider: string;
  selectedModel: string;
  dualModeSelectedModel: string;
  systemPrompt: string;
  stuckModePrompt: string;
  suggestedPrompts: string[];
  knowledgeContent: string;
  coachingResource: string;
  responseMode: 'basic' | 'condensed';
}

/* -------------------------------------------------------------------------- */
/*  RAG                                                                      */
/* -------------------------------------------------------------------------- */

export interface ApiRagConfig {
  topK: number;
  minSimilarity: string;
  enabled: boolean;
}

export function getRagConfig(): Promise<{ config: ApiRagConfig | null; defaults: ApiRagConfig }> {
  return request('/api/rag-config');
}

export function saveRagConfig(config: Partial<ApiRagConfig>): Promise<{ config: ApiRagConfig }> {
  return request('/api/rag-config', { method: 'PUT', body: JSON.stringify(config) });
}

export interface ApiKnowledgeChunk {
  id: string;
  source: string;
  content: string;
  createdAt: string;
}

export function listKnowledgeChunks(): Promise<{ chunks: ApiKnowledgeChunk[] }> {
  return request('/api/knowledge-chunks');
}

export function createKnowledgeChunk(input: {
  source: string;
  content: string;
  embedding?: number[];
}): Promise<{ chunk: ApiKnowledgeChunk & { embedding: number[] | null } }> {
  return request('/api/knowledge-chunks', { method: 'POST', body: JSON.stringify(input) });
}

export function deleteKnowledgeChunk(id: string): Promise<{ ok: true }> {
  return request(`/api/knowledge-chunks?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function ragSearch(
  query: string,
  topK?: number,
  minSimilarity?: number,
): Promise<{ chunks: { id: string; source: string; content: string; similarity: number }[] }> {
  return request('/api/rag-search', {
    method: 'POST',
    body: JSON.stringify({ query, topK, minSimilarity }),
  });
}

/* -------------------------------------------------------------------------- */
/*  Chat (LLM proxy)                                                         */
/* -------------------------------------------------------------------------- */

export interface ApiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function chatCompletion(input: {
  provider?: string;
  model?: string;
  messages: ApiChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}): Promise<{
  choices: { message: { role: string; content: string }; finish_reason: string }[];
}> {
  return request('/api/chat', { method: 'POST', body: JSON.stringify(input) });
}
