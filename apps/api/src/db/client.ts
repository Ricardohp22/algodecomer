import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { config } from '../config.js'
import * as schema from './schema/index.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: config.DATABASE_POOL_MAX,
  ssl: config.DATABASE_SSL === 'require' ? { rejectUnauthorized: true } : undefined,
  options: `-c TimeZone=${config.APP_TIMEZONE} -c application_name=algodecomer-api`,
})

export const db = drizzle(pool, { schema })
