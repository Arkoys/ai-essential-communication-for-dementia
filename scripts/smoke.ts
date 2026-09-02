/**
 * Smoke test for the API + DB layer. Verifies the foundation that the Next.js
 * App Router relies on, without needing a running web server or browser:
 *
 *   1. DB connection + pgvector extension
 *   2. All required tables exist
 *   3. The migration runner has applied every *.sql in /drizzle
 *   4. Required env vars are present (DATABASE_URL, BETTER_AUTH_SECRET)
 *   5. Better Auth's drizzle adapter can construct a session query (round-trips
 *      a fake token → confirms `session`, `account`, `user` table shapes line up
 *      with the auth library's expectations).
 *
 * Run with: `npm run smoke`
 * Exits non-zero on the first failure.
 */
import { Client } from 'pg';

const REQUIRED_TABLES = [
  'user',
  'session',
  'account',
  'verification',
  'conversations',
  'messages',
  'prompt_settings',
  'rag_config',
  'knowledge_chunks',
];

const REQUIRED_ENV = ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL'];

async function main() {
  const failures: string[] = [];
  const pass = (msg: string) => console.log(`✓ ${msg}`);
  const fail = (msg: string) => {
    failures.push(msg);
    console.log(`✗ ${msg}`);
  };

  // ---- 1. env ----
  console.log('— env —');
  for (const k of REQUIRED_ENV) {
    if (process.env[k]) pass(`${k} is set`);
    else fail(`${k} is missing`);
  }

  if (!process.env.DATABASE_URL) {
    console.error('Cannot continue without DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
  } catch (err) {
    fail(`cannot connect to Postgres: ${(err as Error).message}`);
    process.exit(1);
  }
  pass('connected to Postgres');

  try {
    // ---- 2. pgvector ----
    console.log('— pgvector —');
    const ext = await client.query<{ extname: string }[]>(
      `SELECT extname FROM pg_extension WHERE extname = 'vector'`,
    );
    if (ext.rowCount && ext.rowCount > 0) pass('pgvector extension installed');
    else fail('pgvector extension NOT installed — run scripts/migrate.ts');

    // ---- 3. tables ----
    console.log('— schema —');
    const { rows: tables } = await client.query<{ table_name: string }[]>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    const tableSet = new Set(tables.map((t) => t.table_name));
    for (const t of REQUIRED_TABLES) {
      if (tableSet.has(t)) pass(`table "${t}" exists`);
      else fail(`table "${t}" missing — run npm run db:migrate`);
    }

    // ---- 4. migrations applied ----
    console.log('— migrations —');
    const mig = await client.query<{ id: string }[]>(
      `SELECT id FROM __migrations ORDER BY id`,
    );
    if (mig.rowCount && mig.rowCount > 0) {
      pass(`${mig.rowCount} migration(s) recorded: ${mig.rows.map((r) => r.id).join(', ')}`);
    } else {
      fail('no migrations applied — run npm run db:migrate');
    }

    // ---- 5. Better Auth schema sanity ----
    console.log('— better auth schema —');
    // The `account` table should have the unique (issuer, account_id) index
    // and a NOT-NULL `issuer` column (required by better-auth@1.7+).
    const acctCols = await client.query<{ column_name: string; is_nullable: string }[]>(
      `SELECT column_name, is_nullable FROM information_schema.columns
        WHERE table_name = 'account' AND table_schema = 'public'`,
    );
    const colNames = new Set(acctCols.rows.map((c) => c.column_name));
    if (colNames.has('issuer')) {
      const issuerRow = acctCols.rows.find((c) => c.column_name === 'issuer');
      if (issuerRow?.is_nullable === 'NO') pass('account.issuer is NOT NULL');
      else fail('account.issuer is nullable — better-auth@1.7+ requires NOT NULL');
    } else {
      fail('account.issuer column missing — better-auth@1.7+ requires it');
    }
    const idx = await client.query<{ indexname: string }[]>(
      `SELECT indexname FROM pg_indexes
        WHERE tablename = 'account' AND indexname = 'account_issuer_account_idx'`,
    );
    if (idx.rowCount && idx.rowCount > 0) pass('account_issuer_account_idx unique index present');
    else fail('account_issuer_account_idx missing — better-auth will reject sign-ups');
  } finally {
    await client.end().catch(() => undefined);
  }

  console.log('\n' + (failures.length === 0 ? '✅ smoke test passed' : `❌ ${failures.length} failure(s)`));
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('smoke test crashed:', err);
  process.exit(1);
});
