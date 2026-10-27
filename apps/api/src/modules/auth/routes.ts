import { createHash, randomBytes } from 'node:crypto'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { config } from '../../config.js'
import { HttpError } from '../../http/errors.js'
import { parse } from '../../http/parse.js'
import { requireUser } from '../access.js'
import {
  SESSION_COOKIE,
  linkGoogleProfile,
  loginWithPassword,
  publicUser,
  readSession,
  registerWithPassword,
  revokeSession,
  sessionCookieOptions,
} from './service.js'

const credentials = z.object({
  email: z.email(),
  password: z.string().min(10).max(200),
})

export async function authRoutes(app: FastifyInstance) {
  app.get('/auth/providers', async () => ({ google: config.googleEnabled }))

  app.post('/auth/register', async (request, reply) => {
    const body = parse(credentials.extend({ name: z.string().trim().min(1).max(120) }), request.body)
    const token = await registerWithPassword(body)
    reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions())
    return publicUser(requireUser(await readSession(token)).userId)
  })

  app.post('/auth/login', async (request, reply) => {
    const body = parse(credentials, request.body)
    const token = await loginWithPassword(body)
    reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions())
    return publicUser(requireUser(await readSession(token)).userId)
  })

  app.post('/auth/logout', async (request, reply) => {
    const token = sessionToken(request)
    if (token) {
      await revokeSession(token)
    }
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    return { ok: true }
  })

  app.get('/auth/me', async (request) => publicUser(requireUser(request.auth).userId))

  app.get('/auth/google/start', async (_request, reply) => {
    if (!config.googleEnabled) {
      throw new HttpError(404, 'El acceso con Google no está configurado')
    }
    const state = randomBytes(24).toString('base64url')
    const verifier = randomBytes(48).toString('base64url')
    const challenge = createHash('sha256').update(verifier).digest('base64url')
    const cookie = { ...sessionCookieOptions(), maxAge: 60 * 10 }
    reply.setCookie('google_oauth_state', state, cookie)
    reply.setCookie('google_oauth_verifier', verifier, cookie)
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', config.GOOGLE_CLIENT_ID)
    url.searchParams.set('redirect_uri', config.GOOGLE_REDIRECT_URI)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'openid email profile')
    url.searchParams.set('state', state)
    url.searchParams.set('code_challenge', challenge)
    url.searchParams.set('code_challenge_method', 'S256')
    return reply.redirect(url.toString())
  })

  app.get('/auth/google/callback', async (request, reply) => {
    const query = parse(z.object({ code: z.string().min(1), state: z.string().min(1) }), request.query)
    const state = unsignedCookie(request, 'google_oauth_state')
    const verifier = unsignedCookie(request, 'google_oauth_verifier')
    reply.clearCookie('google_oauth_state', { path: '/' })
    reply.clearCookie('google_oauth_verifier', { path: '/' })
    if (!state || !verifier || state !== query.state) {
      return reply.redirect(`${config.WEB_ORIGIN}/entrar?error=google`)
    }

    try {
      const profile = await googleProfile(query.code, verifier)
      if (!profile) {
        return reply.redirect(`${config.WEB_ORIGIN}/entrar?error=google`)
      }
      const session = await linkGoogleProfile(profile)
      reply.setCookie(SESSION_COOKIE, session, sessionCookieOptions())
      return reply.redirect(`${config.WEB_ORIGIN}/panel`)
    } catch (error) {
      request.log.error({ err: error }, 'google oauth failed')
      return reply.redirect(`${config.WEB_ORIGIN}/entrar?error=google`)
    }
  })
}

export function sessionToken(request: FastifyRequest): string | null {
  return unsignedCookie(request, SESSION_COOKIE)
}

function unsignedCookie(request: FastifyRequest, name: string): string | null {
  const raw = request.cookies[name]
  if (!raw) {
    return null
  }
  const unsigned = request.unsignCookie(raw)
  return unsigned.valid ? unsigned.value : null
}

async function googleProfile(code: string, verifier: string) {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.GOOGLE_CLIENT_ID,
      client_secret: config.GOOGLE_CLIENT_SECRET,
      redirect_uri: config.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!tokenResponse.ok) {
    return null
  }
  const tokenBody: unknown = await tokenResponse.json()
  const accessToken =
    typeof tokenBody === 'object' && tokenBody !== null && 'access_token' in tokenBody
      ? tokenBody.access_token
      : null
  if (typeof accessToken !== 'string') {
    return null
  }

  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  })
  if (!profileResponse.ok) {
    return null
  }
  const profile: unknown = await profileResponse.json()
  if (typeof profile !== 'object' || profile === null) {
    return null
  }
  const record = profile as Record<string, unknown>
  if (typeof record.sub !== 'string' || typeof record.email !== 'string' || record.email_verified !== true) {
    return null
  }
  return {
    sub: record.sub,
    email: record.email,
    emailVerified: true,
    name: typeof record.name === 'string' ? record.name : record.email,
  }
}
