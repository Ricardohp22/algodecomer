import { buildApp } from './app.js'
import { config } from './config.js'
import { pool } from './db/client.js'

const app = await buildApp()

async function shutdown(signal: string) {
  app.log.info({ signal }, 'shutting down')
  await app.close()
  await pool.end()
  process.exit(0)
}

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})

process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})

await app.listen({ host: config.API_HOST, port: config.API_PORT })
