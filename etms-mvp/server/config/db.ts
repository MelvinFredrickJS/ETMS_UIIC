import { Pool } from 'pg'

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'etms_dev',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
})

async function testConnection(): Promise<void> {
  try {
    await pool.query('SELECT NOW()')
    console.log('✅ PostgreSQL connected')
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', (err as Error).message)
  }
}

export = Object.assign(pool, { testConnection })
