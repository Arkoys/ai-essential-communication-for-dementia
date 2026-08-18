/**
 * Classification Matrix - loaded from JSON config
 */

import classificationMatrix from '../../config/classificationMatrix.json';

export interface QueryType {
  id: string;
  label: string;
  definition: string;
  in_scope: boolean;
  examplePrompts: string[];
  minTier: 'tier1' | 'none';
  responsePath: string;
  tier1Required: string[];
}

export interface Tier1Element {
  id: string;
  label: string;
  description: string;
  detectionPatterns: string[];
}

export interface ClassificationMatrixConfig {
  version: string;
  lastUpdated: string;
  description: string;
  queryTypes: QueryType[];
  tier1Elements: Tier1Element[];
  classificationPrompt: {
    systemInstruction: string;
    outputSchema: Record<string, unknown>;
    fallbackResponse: Record<string, unknown>;
  };
}

export const CLASSIFICATION_MATRIX = classificationMatrix as ClassificationMatrixConfig;

// Helper to get query type by ID
export function getQueryTypeById(id: string): QueryType | undefined {
  return CLASSIFICATION_MATRIX.queryTypes.find(qt => qt.id === id);
}

// Helper to get query type by response path
export function getQueryTypesByPath(path: string): QueryType[] {
  return CLASSIFICATION_MATRIX.queryTypes.filter(qt => qt.responsePath === path);
}

// Helper to get all response paths
export function getAllResponsePaths(): string[] {
  return [...new Set(CLASSIFICATION_MATRIX.queryTypes.map(qt => qt.responsePath))];
}

// Export tier 1 elements for detection
export const TIER1_ELEMENTS = CLASSIFICATION_MATRIX.tier1Elements;
export const QUERY_TYPES = CLASSIFICATION_MATRIX.queryTypes;
