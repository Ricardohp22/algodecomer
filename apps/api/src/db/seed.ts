import { db, pool } from './client.js'
import { roles } from './schema/index.js'
import { ROLE_CODES } from '../domain/identity.js'

for (const code of ROLE_CODES) {
  await db.insert(roles).values({ code }).onConflictDoNothing({ target: roles.code })
}

await pool.end()
