import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { parse } from '../../http/parse.js'
import { requireUser } from '../access.js'
import { confirmPhoneCode, requestPhoneCode } from './service.js'

export async function phoneRoutes(app: FastifyInstance) {
  app.post('/phone/verifications', async (request) => {
    const auth = requireUser(request.auth)
    const body = parse(z.object({ phone: z.string() }), request.body)
    return requestPhoneCode(auth.userId, body.phone)
  })

  app.post('/phone/verifications/confirm', async (request) => {
    const auth = requireUser(request.auth)
    const body = parse(z.object({ phone: z.string(), code: z.string() }), request.body)
    await confirmPhoneCode(auth.userId, body.phone, body.code)
    return { ok: true }
  })
}
