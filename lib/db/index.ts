import { Pool } from 'pg';

// Official Supabase IPv4 Transaction Pooler for project 'yhwwhqqffgtiavapgjvc' in Singapore (ap-southeast-1)
// Guaranteed IPv4 accessibility from Vercel Serverless / AWS Lambda environments
const DEFAULT_POOLER_URL =
  'postgresql://postgres.yhwwhqqffgtiavapgjvc:%40Limabelas15@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

const DB_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  DEFAULT_POOLER_URL;

let globalPool: Pool | null = null;

export function getDbPool(): Pool {
  if (!globalPool) {
    globalPool = new Pool({
      connectionString: DB_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    globalPool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }
  return globalPool;
}

/**
 * Execute a SQL query directly on Supabase PostgreSQL database
 */
export async function dbQuery<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const pool = getDbPool();
  const res = await pool.query(text, params);
  return res.rows as T[];
}

/**
 * Execute a SQL query and return the first row or null
 */
export async function dbQuerySingle<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await dbQuery<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute a mutation query (INSERT, UPDATE, DELETE) and return rowCount
 */
export async function dbExecute(text: string, params: any[] = []): Promise<number> {
  const pool = getDbPool();
  const res = await pool.query(text, params);
  return res.rowCount || 0;
}
