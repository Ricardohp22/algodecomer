import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import Fastify, { type FastifyError } from 'fastify'
import { config } from './config.js'
import { healthRoutes } from './modules/health/routes.js'

export async function buildApp() {
  const app = Fastify({
    logger:
      config.NODE_ENV === 'test'
        ? false
        : {
            level: config.LOG_LEVEL,
            redact: ['req.headers.authorization', 'req.headers.cookie'],
          },
  })

  const isProduction = config.NODE_ENV === 'production'
  await app.register(helmet, {
    hsts: isProduction,
    contentSecurityPolicy: isProduction,
  })
  await app.register(cors, { origin: config.WEB_ORIGIN })
  await app.register(healthRoutes, { prefix: '/api/v1' })

  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({ error: 'No encontrado' })
  })

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, 'unhandled error')
    const statusCode = error.statusCode ?? 500

    if (statusCode >= 500) {
      return reply.code(statusCode).send({ error: 'Error interno' })
    }

    return reply.code(statusCode).send({ error: error.message })
  })

  return app
}
