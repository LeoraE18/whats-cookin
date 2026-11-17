import 'dotenv/config';
import pg from 'pg';
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://cookin:cookin@localhost:5432/whats_cookin' });
