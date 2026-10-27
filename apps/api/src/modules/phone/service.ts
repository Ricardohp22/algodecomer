import { createHash, randomInt } from 'node:crypto'
import { and, desc, eq, sql } from 'drizzle-orm'
import { config } from '../../config.js'
import { db } from '../../db/client.js'
import { phoneVerifications, users } from '../../db/schema/index.js'
import { OTP_MAX_ATTEMPTS, OTP_MAX_REQUESTS_PER_HOUR, OTP_TTL_SECONDS } from '../../domain/platform.js'
import { HttpError } from '../../http/errors.js'

const PHONE = /^\+[1-9]\d{7,14}$/

function codeHash(code: string): string {
  return createHash('sha256').update(`${config.OTP_PEPPER}:${code}`).digest('hex')
}

export async function requestPhoneCode(userId: string, phone: string) {
  if (!PHONE.test(phone)) {
    throw new HttpError(400, 'El teléfono debe estar en formato internacional, por ejemplo +525512345678')
  }

  const recent = await db.execute(sql`
    SELECT count(*)::int AS total
    FROM phone_verifications
    WHERE user_id = ${userId}::uuid
      AND created_at > now() - interval '1 hour'
  `)
  const total = resultTotal(recent)
  if (total >= OTP_MAX_REQUESTS_PER_HOUR) {
    throw new HttpError(429, 'Espera un momento antes de pedir otro código')
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000)
  await db.insert(phoneVerifications).values({
    userId,
    phone,
    codeHash: codeHash(code),
    expiresAt,
  })

  return {
    expiresAt: expiresAt.toISOString(),
    devCode: config.NODE_ENV === 'production' ? undefined : code,
  }
}

export async function confirmPhoneCode(userId: string, phone: string, code: string) {
  if (!PHONE.test(phone) || !/^\d{6}$/.test(code)) {
    throw new HttpError(400, 'El código no coincide')
  }

  const [latest] = await db
    .select()
    .from(phoneVerifications)
    .where(and(eq(phoneVerifications.userId, userId), eq(phoneVerifications.phone, phone)))
    .orderBy(desc(phoneVerifications.createdAt))
    .limit(1)

  if (!latest || latest.expiresAt.getTime() <= Date.now()) {
    throw new HttpError(400, 'El código expiró. Pide uno nuevo')
  }

  if (latest.attempts >= OTP_MAX_ATTEMPTS) {
    throw new HttpError(400, 'Demasiados intentos. Pide un código nuevo')
  }

  if (codeHash(code) !== latest.codeHash) {
    await db
      .update(phoneVerifications)
      .set({ attempts: latest.attempts + 1 })
      .where(eq(phoneVerifications.id, latest.id))
    throw new HttpError(400, 'El código no coincide')
  }

  await db
    .update(users)
    .set({ phone, phoneVerifiedAt: new Date() })
    .where(eq(users.id, userId))
}

function resultTotal(result: unknown): number {
  if (typeof result !== 'object' || result === null || !('rows' in result) || !Array.isArray(result.rows)) {
    return 0
  }
  const row = result.rows[0] as { total?: number } | undefined
  return row?.total ?? 0
}
