import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env file')
  process.exit(1)
}

console.log('📦 Connecting to database:', DATABASE_URL.split('@')[1] || DATABASE_URL.substring(0, 20))

const pool = new Pool({
  connectionString: DATABASE_URL,
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
})

pool.on('connect', () => {
  console.log('✓ Database connection established')
})

export const query = (text, params = []) => pool.query(text, params)

export const initDB = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        payer_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        description VARCHAR(255),
        amount DECIMAL(10, 2) NOT NULL,
        split_type VARCHAR(50) DEFAULT 'equal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS expense_splits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
        member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        UNIQUE(expense_id, member_id)
      );

      CREATE TABLE IF NOT EXISTS settlements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        from_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        to_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log('✓ Database tables initialized')
  } catch (err) {
    console.error('❌ Error initializing database:', err.message)
  }
}

export default pool
