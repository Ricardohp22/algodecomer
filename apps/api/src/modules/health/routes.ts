import type { FastifyPluginAsync } from 'fastify'
import { pool } from '../../db/client.js'

type HealthRow = {
  postgis: string
  timezone: string
}

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async (request, reply) => {
    reply.header('cache-control', 'no-store')

    try {
      const result = await pool.query<HealthRow>(
        "SELECT PostGIS_Version() AS postgis, current_setting('TIMEZONE') AS timezone",
      )
      const row = result.rows[0]

      if (!row?.postgis || !row.timezone) {
        return reply.code(503).send({
          status: 'error',
          service: 'api',
          database: 'down',
        })
      }

      return {
        status: 'ok',
        service: 'api',
        database: 'up',
        postgis: row.postgis,
        timezone: row.timezone,
      }
    } catch (error) {
      request.log.error({ err: error }, 'healthcheck failed')
      return reply.code(503).send({
        status: 'error',
        service: 'api',
        database: 'down',
      })
    }
  })
}
