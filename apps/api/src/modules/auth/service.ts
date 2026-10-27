import { createHash, randomBytes } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import { config } from '../../config.js'
import { db } from '../../db/client.js'
import { authIdentities, roles, sessions, userRoles, users } from '../../db/schema/index.js'
import type { RoleCode } from '../../domain/identity.js'
import { SESSION_TTL_SECONDS } from '../../domain/platform.js'
import { HttpError, normalizeEmail, postgresCode } from '../../http/errors.js'
import { resultRows } from '../../db/rows.js'
import { hashPassword, verifyPassword } from './passwords.js'

export const SESSION_COOKIE = 'algodecomer_session'

const INVALID_LOGIN = 'Correo o contraseña incorrectos'

export type AuthContext = {
  sessionId: string
  userId: string
}

export type PublicUser = {
  id: string
  email: string
  name: string
  phone: string | null
  phoneVerified: boolean
  roles: Array<{ code: string; scopeType: string; scopeId: string | null }>
}

type RoleExecutor = Pick<typeof db, 'execute'>

let dummyPasswordHash: Promise<string> | null = null

function dummyHash(): Promise<string> {
  dummyPasswordHash ??= hashPassword('not-a-real-password')
  return dummyPasswordHash
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.NODE_ENV === 'production',
    path: '/',
    signed: true,
    maxAge: SESSION_TTL_SECONDS,
  }
}

export async function assignRole(
  executor: RoleExecutor,
  userId: string,
  code: RoleCode,
  scopeType: 'global' | 'branch',
  scopeId: string | null,
) {
  const roleResult = await executor.execute(sql`SELECT id FROM roles WHERE code = ${code} LIMIT 1`)
  const role = resultRows<{ id: string }>(roleResult)[0]
  if (!role) {
    throw new HttpError(500, 'Falta un rol de la plataforma')
  }

  await executor.execute(sql`
    INSERT INTO user_roles (user_id, role_id, scope_type, scope_id)
    VALUES (${userId}::uuid, ${role.id}::uuid, ${scopeType}, ${scopeId}::uuid)
    ON CONFLICT DO NOTHING
  `)
}

async function openSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)
  await db.insert(sessions).values({
    userId,
    refreshTokenHash: hashSessionToken(token),
    expiresAt,
  })
  return token
}

export async function registerWithPassword(input: { name: string; email: string; password: string }) {
  const email = normalizeEmail(input.email)
  const passwordHash = await hashPassword(input.password)

  try {
    const user = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          email,
          name: input.name.trim(),
          passwordHash,
        })
        .returning()

      if (!created) {
        throw new HttpError(500, 'No se pudo crear la cuenta')
      }

      await tx.insert(authIdentities).values({
        userId: created.id,
        provider: 'password',
        providerSubject: created.id,
      })
      await assignRole(tx, created.id, 'customer', 'global', null)
      return created
    })

    return openSession(user.id)
  } catch (error) {
    if (error instanceof HttpError) {
      throw error
    }
    if (postgresCode(error) === '23505') {
      throw new HttpError(409, 'Ya existe una cuenta con ese correo')
    }
    throw error
  }
}

export async function loginWithPassword(input: { email: string; password: string }) {
  const email = normalizeEmail(input.email)
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  const passwordHash = user?.passwordHash ?? (await dummyHash())
  const matches = await verifyPassword(input.password, passwordHash)

  if (!user || !user.passwordHash || !matches || user.status !== 'active') {
    throw new HttpError(401, INVALID_LOGIN)
  }

  return openSession(user.id)
}

export async function readSession(token: string): Promise<AuthContext | null> {
  const [session] = await db
    .select({
      sessionId: sessions.id,
      userId: sessions.userId,
      status: users.status,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.refreshTokenHash, hashSessionToken(token)),
        sql`${sessions.revokedAt} IS NULL`,
        sql`${sessions.expiresAt} > now()`,
        eq(users.status, 'active'),
      ),
    )
    .limit(1)

  if (!session) {
    return null
  }

  return { sessionId: session.sessionId, userId: session.userId }
}

export async function revokeSession(token: string) {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.refreshTokenHash, hashSessionToken(token)))
}

export async function publicUser(userId: string): Promise<PublicUser> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) {
    throw new HttpError(401, 'Inicia sesión')
  }

  const assigned = await db
    .select({
      code: roles.code,
      scopeType: userRoles.scopeType,
      scopeId: userRoles.scopeId,
    })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId))

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    phoneVerified: user.phoneVerifiedAt !== null,
    roles: assigned,
  }
}

export async function linkGoogleProfile(profile: {
  sub: string
  email: string
  emailVerified: boolean
  name: string
}) {
  if (!profile.emailVerified) {
    throw new HttpError(403, 'Google no confirmó el correo')
  }

  const email = normalizeEmail(profile.email)
  const name = profile.name.trim() || email

  const userId = await db.transaction(async (tx) => {
    const [identity] = await tx
      .select()
      .from(authIdentities)
      .where(and(eq(authIdentities.provider, 'google'), eq(authIdentities.providerSubject, profile.sub)))
      .limit(1)

    if (identity) {
      return identity.userId
    }

    const [existing] = await tx.select().from(users).where(eq(users.email, email)).limit(1)
    if (existing) {
      await tx.insert(authIdentities).values({
        userId: existing.id,
        provider: 'google',
        providerSubject: profile.sub,
      })
      return existing.id
    }

    const [created] = await tx
      .insert(users)
      .values({
        email,
        name,
        passwordHash: null,
      })
      .returning()

    if (!created) {
      throw new HttpError(500, 'No se pudo crear la cuenta')
    }

    await tx.insert(authIdentities).values({
      userId: created.id,
      provider: 'google',
      providerSubject: profile.sub,
    })
    await assignRole(tx, created.id, 'customer', 'global', null)
    return created.id
  })

  return openSession(userId)
}

export async function createOrPromoteAdmin(input: { email: string; password: string; name: string }) {
  const email = normalizeEmail(input.email)
  const passwordHash = await hashPassword(input.password)

  const userId = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(users).where(eq(users.email, email)).limit(1)
    if (existing) {
      await tx.update(users).set({ passwordHash, name: input.name.trim(), status: 'active' }).where(eq(users.id, existing.id))
      await tx
        .insert(authIdentities)
        .values({
          userId: existing.id,
          provider: 'password',
          providerSubject: existing.id,
        })
        .onConflictDoNothing()
      await assignRole(tx, existing.id, 'admin', 'global', null)
      return existing.id
    }

    const [created] = await tx
      .insert(users)
      .values({
        email,
        name: input.name.trim(),
        passwordHash,
      })
      .returning()

    if (!created) {
      throw new HttpError(500, 'No se pudo crear el administrador')
    }

    await tx.insert(authIdentities).values({
      userId: created.id,
      provider: 'password',
      providerSubject: created.id,
    })
    await assignRole(tx, created.id, 'admin', 'global', null)
    return created.id
  })

  return userId
}
