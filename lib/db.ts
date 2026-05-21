import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Local PostgreSQL — no SSL needed
  ssl: false,
  max: 10,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Pre-warm: grab a connection immediately so the first query is instant
pool.connect().then(client => client.release()).catch(() => {});

/**
 * Tagged template literal interface compatible with @neondatabase/serverless.
 * Usage: sql`SELECT * FROM users WHERE id = ${id}`
 */
export default function sql(strings: TemplateStringsArray, ...values: unknown[]): Promise<Record<string, unknown>[]> {
  // Convert tagged template to parameterized query
  // sql`SELECT * FROM users WHERE id = ${id}` → ('SELECT * FROM users WHERE id = $1', [id])
  let query = '';
  strings.forEach((str, i) => {
    query += str;
    if (i < values.length) {
      query += `$${i + 1}`;
    }
  });

  return pool.query(query, values).then(res => res.rows);
}

/**
 * Raw parameterized query for dynamic WHERE clauses.
 * Usage: rawQuery('SELECT * FROM users WHERE id = $1', [id])
 */
export function rawQuery(query: string, values: unknown[] = []): Promise<Record<string, unknown>[]> {
  return pool.query(query, values).then(res => res.rows);
}
