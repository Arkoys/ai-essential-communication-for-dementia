/**
 * Apply Drizzle migrations + ensure pgvector extension is loaded.
 * Run with: `npm run db:migrate` (uses Node 20's --env-file=.env.local).
 *
 * We track which SQL files have been applied in a `__migrations` table so
 * migrations are idempotent and survive restarts. (Avoids the need for
 * drizzle-kit-generated snapshot JSON which we don't ship in the repo.)
 */
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { Client } from 'pg';

async function ensurePgvector(client: Client) {
  await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
  console.log('✓ pgvector extension ensured');
}

async function ensureMigrationsTable(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS __migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function appliedMigrations(client: Client): Promise<Set<string>> {
  const { rows } = await client.query<{ id: string }>('SELECT id FROM __migrations');
  return new Set(rows.map((r) => r.id));
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await ensurePgvector(client);
    await ensureMigrationsTable(client);

    const applied = await appliedMigrations(client);
    const dir = join(process.cwd(), 'drizzle');
    const files = (await readdir(dir))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`✓ ${file} (already applied)`);
        continue;
      }
      const sql = await readFile(join(dir, file), 'utf8');
      // drizzle-kit wraps multiple statements with `--> statement-breakpoint`.
      // Split on that marker; pg's simple query protocol only allows one.
      const statements = sql
        .split(/-->\s*statement-breakpoint/i)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      console.log(`→ applying ${file} (${statements.length} statements)`);
      let hadError = false;
      for (const stmt of statements) {
        try {
          await client.query(stmt);
        } catch (err: unknown) {
          // Postgres "already exists" error codes. Tolerate them so the
          // migration is idempotent against partially-applied schemas.
          const code = (err as { code?: string }).code;
          if (code === '42710' /* duplicate_object */ || code === '42P07' /* duplicate_table */ || code === '42701' /* duplicate_column */ || code === '42P06' /* duplicate_schema */) {
            console.warn(`  …skipping (already exists): ${stmt.slice(0, 80).replace(/\s+/g, ' ')}…`);
            continue;
          }
          hadError = true;
          throw err;
        }
      }
      if (hadError) {
        // Not reached because we throw above, but keep TS happy.
      }
      await client.query('INSERT INTO __migrations (id) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
      console.log(`✓ ${file} applied`);
    }

    console.log('✓ migrations applied');
  } finally {
    await client.end();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
