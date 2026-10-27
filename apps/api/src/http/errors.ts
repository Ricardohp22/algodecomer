export class HttpError extends Error {
  readonly statusCode: number
  readonly details: Record<string, unknown> | undefined

  constructor(statusCode: number, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
    this.details = details
  }
}

export function postgresCode(error: unknown): string | undefined {
  let current: unknown = error
  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof current !== 'object' || current === null) {
      return undefined
    }
    if ('code' in current && typeof current.code === 'string') {
      return current.code
    }
    current = 'cause' in current ? current.cause : undefined
  }
  return undefined
}

export function normalizeMoney(value: string): string {
  const match = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(value)
  if (!match) {
    throw new HttpError(400, 'El precio no es válido')
  }
  const whole = match[1] ?? '0'
  const fraction = match[2] ?? ''
  return `${whole}.${fraction.padEnd(2, '0')}`
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
