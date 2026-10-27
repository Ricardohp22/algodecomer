import { createHmac, timingSafeEqual } from 'node:crypto'
import { config } from '../../config.js'
import { MEDIA_URL_TTL_SECONDS } from '../../domain/platform.js'
import { HttpError } from '../../http/errors.js'

export function signedMediaPath(assetId: string): string {
  const exp = Math.floor(Date.now() / 1000) + MEDIA_URL_TTL_SECONDS
  const sig = sign(assetId, exp)
  return `/api/v1/media/${assetId}?exp=${exp}&sig=${sig}`
}

export function assertMediaSignature(assetId: string, expRaw: string, sig: string) {
  const exp = Number(expRaw)
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    throw new HttpError(403, 'El enlace del archivo expiró')
  }

  const expected = sign(assetId, exp)
  const left = Buffer.from(sig)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new HttpError(403, 'El enlace del archivo no es válido')
  }
}

function sign(assetId: string, exp: number): string {
  return createHmac('sha256', config.MEDIA_SIGNING_SECRET).update(`${assetId}.${exp}`).digest('base64url')
}
