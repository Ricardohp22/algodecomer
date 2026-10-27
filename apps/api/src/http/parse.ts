import { z, type ZodType } from 'zod'
import { HttpError } from './errors.js'

export function parse<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new HttpError(
      400,
      result.error.issues.map((issue) => `${issue.path.join('.') || 'dato'}: ${issue.message}`).join('; '),
    )
  }
  return result.data
}
