import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { vector } from 'drizzle-orm/pg-core/columns/vector_extension/vector';

/* ============================================================================
 * ENUMS
 * ========================================================================== */

export const conversationType = pgEnum('conversation_type', [
  'normal',
  'dual',
  'compare',
]);

export const messageRole = pgEnum('message_role', ['user', 'assistant']);

/**
 * `lane` distinguishes which pane a row belongs to in dual / compare
 * conversations. Normal conversations always store `single`.
 *
 * - `single`     : default, used by the regular one-pane chat
 * - `primary`    : dual-mode primary (left) pane
 * - `secondary`  : dual-mode secondary (right) pane
 * - `basic`      : compare-mode Basic (left) pane
 * - `condensed`  : compare-mode Condensed (right) pane
 */
export const messageLane = pgEnum('message_lane', [
  'single',
  'primary',
  'secondary',
  'basic',
  'condensed',
]);

export const phaseName = pgEnum('phase_name', [
  'Recognition',
  'Evaluation',
  'Naming & Diagnosis',
]);

/* ============================================================================
 * BETTER AUTH tables
 * Shape matches Better Auth defaults so the CLI-generated schema lines up.
 * Run `npm run auth:generate` to reconcile against lib/auth.ts.
 * ========================================================================== */

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  // App-specific:
  isAdmin: boolean('is_admin').notNull().default(false),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    userIdIdx: index('session_user_id_idx').on(t.userId),
  }),
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Added in better-auth@1.7+. Local issuer namespace for credential
    // accounts (e.g. "https://localhost:3000/api/auth") — required by the
    // adapter when inserting a credential account on sign-up.
    issuer: text('issuer').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    // better-auth expects the unique constraint on (issuer, accountId),
    // not (providerId, accountId). Keeping providerId indexed for lookups.
    issuerAccountIdx: uniqueIndex('account_issuer_account_idx').on(
      t.issuer,
      t.accountId,
    ),
    userIdIdx: index('account_user_id_idx').on(t.userId),
  }),
);

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/* ============================================================================
 * APP DOMAIN
 * ========================================================================== */

export const conversations = pgTable(
  'conversations',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    type: conversationType('type').notNull().default('normal'),
    primaryProvider: text('primary_provider'),
    secondaryProvider: text('secondary_provider'),
    currentPhase: phaseName('current_phase'),
    currentStep: text('current_step'),
    lastDetectedPhase: phaseName('last_detected_phase'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    userUpdatedIdx: index('conversations_user_updated_idx').on(
      t.userId,
      t.updatedAt,
    ),
  }),
);

export const messages = pgTable(
  'messages',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: messageRole('role').notNull(),
    content: text('content').notNull(),
    isStuck: boolean('is_stuck').notNull().default(false),
    isInsufficientInfo: boolean('is_insufficient_info')
      .notNull()
      .default(false),
    lane: messageLane('lane').notNull().default('single'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    convCreatedIdx: index('messages_conv_created_idx').on(
      t.conversationId,
      t.createdAt,
    ),
    convLaneCreatedIdx: index('messages_conv_lane_created_idx').on(
      t.conversationId,
      t.lane,
      t.createdAt,
    ),
  }),
);

// Singleton per user. Mirrors Firestore `app_settings/prompts`.
export const promptSettings = pgTable('prompt_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull().default('harvard'),
  // dualModeProvider / dualModeSelectedModel are retained for DB-schema
  // backward compatibility after the MiniMax removal; they no longer drive
  // any UI or runtime behavior. Defaults mirror the primary lane.
  dualModeProvider: text('dual_mode_provider').notNull().default('harvard'),
  selectedModel: text('selected_model').notNull().default('gpt-5.5'),
  dualModeSelectedModel: text('dual_mode_selected_model')
    .notNull()
    .default('gpt-5.5'),
  systemPrompt: text('system_prompt').notNull().default(''),
  stuckModePrompt: text('stuck_mode_prompt').notNull().default(''),
  suggestedPrompts: jsonb('suggested_prompts').notNull().default(sql`'[]'::jsonb`),
  knowledgeContent: text('knowledge_content').notNull().default(''),
  coachingResource: text('coaching_resource').notNull().default(''),
  responseMode: text('response_mode').notNull().default('basic'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Singleton per user. Mirrors Firestore `app_settings/rag_config`.
export const ragConfig = pgTable('rag_config', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  topK: integer('top_k').notNull().default(4),
  minSimilarity: text('min_similarity').notNull().default('0.6'),
  enabled: boolean('enabled').notNull().default(true),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/* ============================================================================
 * KNOWLEDGE CHUNKS (RAG) — pgvector embedding column.
 * Default dimensions = 768 (text-embedding-004). Adjust if you switch models.
 * ========================================================================== */

export const knowledgeChunks = pgTable('knowledge_chunks', {
  id: text('id').primaryKey(),
  source: text('source').notNull(),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 768 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
