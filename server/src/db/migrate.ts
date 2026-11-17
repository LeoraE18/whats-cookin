import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { pool } from './pool.js';
export async function migrate(client: { query: (sql:string, values?: unknown[]) => Promise<unknown> } = pool as any) {
  await client.query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await migrate();
  console.log('Database schema is ready.');
  await pool.end();
}
