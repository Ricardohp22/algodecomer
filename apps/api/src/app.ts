import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import Fastify, { type FastifyError } from 'fastify'
import { config } from './config.js'
import { HttpError } from './http/errors.js'
import { adminRoutes } from './modules/admin/routes.js'
import { authRoutes, sessionToken } from './modules/auth/routes.js'
import { readSession, type AuthContext } from './modules/auth/service.js'
import { branchRoutes } from './modules/branches/routes.js'
import { catalogRoutes } from './modules/catalog/routes.js'
import { healthRoutes } from './modules/health/routes.js'
import { mediaRoutes } from './modules/media/routes.js'
import { phoneRoutes } from './modules/phone/routes.js'

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null
  }
}

export async function buildApp() {
  const app = Fastify({
    logger:
      config.NODE_ENV === 'test'
        ? false
        : {
            level: config.LOG_LEVEL,
            redact: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password', 'req.body.code'],
          },
  })

  const isProduction = config.NODE_ENV === 'production'
  await app.register(helmet, {
    hsts: isProduction,
    contentSecurityPolicy: isProduction,
  })
  await app.register(cors, { origin: config.WEB_ORIGIN, credentials: true })
  await app.register(cookie, { secret: config.COOKIE_SECRET })
  await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024, files: 1 } })
  await app.register(rateLimit, {
    max: config.NODE_ENV === 'test' ? 10_000 : 300,
    timeWindow: '1 minute',
  })

  app.addHook('onRequest', async (request) => {
    const token = sessionToken(request)
    request.auth = token ? await readSession(token) : null
  })

  app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
      return
    }
    if (request.headers['x-algodecomer-request'] !== '1') {
      return reply.code(403).send({ error: 'Falta la cabecera de la aplicación' })
    }
  })

  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({ error: 'No encontrado' })
  })

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof HttpError) {
      if (error.statusCode >= 500) {
        request.log.error({ err: error }, 'request failed')
      }
      return reply.code(error.statusCode).send({ error: error.message, ...(error.details ?? {}) })
    }

    const statusCode = error.statusCode ?? 500
    if (statusCode === 429) {
      return reply.code(429).send({ error: 'Demasiadas solicitudes. Espera un momento.' })
    }
    if (statusCode >= 500) {
      request.log.error({ err: error }, 'unhandled error')
      return reply.code(statusCode).send({ error: 'Error interno' })
    }

    return reply.code(statusCode).send({ error: error.message })
  })

  await app.register(healthRoutes, { prefix: '/api/v1' })
  await app.register(authRoutes, { prefix: '/api/v1' })
  await app.register(phoneRoutes, { prefix: '/api/v1' })
  await app.register(branchRoutes, { prefix: '/api/v1' })
  await app.register(catalogRoutes, { prefix: '/api/v1' })
  await app.register(mediaRoutes, { prefix: '/api/v1' })
  await app.register(adminRoutes, { prefix: '/api/v1' })

  return app
}
