import 'dotenv/config';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/whats_cookin';
const connectionUrl = new URL(connectionString);
const requiresSsl = connectionUrl.searchParams.get('sslmode') === 'require';

// Render's fromDatabase reference uses the private URL (no TLS required).
// External Render URLs include sslmode=require; node-postgres needs TLS with
// certificate verification disabled to match PostgreSQL's `require` mode.
if (requiresSsl) connectionUrl.searchParams.delete('sslmode');

export const pool = new pg.Pool({
  connectionString: requiresSsl ? connectionUrl.toString() : connectionString,
  ...(requiresSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  max: Number(process.env.PG_POOL_MAX || 10),
});
