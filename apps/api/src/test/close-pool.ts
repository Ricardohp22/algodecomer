import { after } from 'node:test'
import { pool } from '../db/client.js'

let registered = false

export function closePoolAfterTests(): void {
  if (registered) {
    return
  }

  registered = true
  after(async () => {
    await pool.end()
  })
}
