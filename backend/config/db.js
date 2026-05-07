import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Supabase
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle DB client:', err);
});

// Test connection on startup
pool.query('SELECT NOW()').then(() => {
  console.log('✅ Connected to Supabase PostgreSQL');
}).catch((err) => {
  console.error('❌ Database connection failed:', err.message);
  process.exit(1);
});

export default pool;
