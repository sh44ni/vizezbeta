import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

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
