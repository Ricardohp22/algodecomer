import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db, pool } from './client.js'

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../../drizzle')

await migrate(db, { migrationsFolder })
await pool.end()
