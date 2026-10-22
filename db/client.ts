import pg from 'pg';
const { Pool } = pg;
const globalDb = globalThis as typeof globalThis & { pickerPool?: pg.Pool };
export function getPool(): pg.Pool {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required. Start PostgreSQL and run npm run db:migrate.');
  if (!globalDb.pickerPool) {
    globalDb.pickerPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
    globalDb.pickerPool.on('error', (error: Error & {code?: string}) => console.error('PostgreSQL idle connection error', error.code||'unknown'));
  }
  return globalDb.pickerPool;
}
export async function closeDatabase() { if (globalDb.pickerPool) { await globalDb.pickerPool.end(); delete globalDb.pickerPool; } }
