import { config as loadEnv } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import {
  DEFAULT_ORDER_ACCEPTANCE_TIMEOUT_SECONDS,
  PLATFORM_TIMEZONE,
} from './domain/platform.js'

const rootEnvPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env')
loadEnv({ path: rootEnvPath })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().min(1).default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  WEB_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((value) => value.startsWith('postgres://') || value.startsWith('postgresql://'), {
      message: 'debe empezar con postgres:// o postgresql://',
    }),
  DATABASE_SSL: z.enum(['disable', 'require']).default('disable'),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().max(50).default(10),
  APP_TIMEZONE: z.string().min(1).default(PLATFORM_TIMEZONE),
  ORDER_ACCEPTANCE_TIMEOUT_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(DEFAULT_ORDER_ACCEPTANCE_TIMEOUT_SECONDS),
  MINIO_ENDPOINT: z.string().min(1).default('http://localhost:9000'),
  MINIO_ACCESS_KEY: z.string().min(1).default('minio'),
  MINIO_SECRET_KEY: z.string().min(1).default('minio12345'),
  MINIO_BUCKET: z.string().min(1).default('algodecomer'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || 'entorno'}: ${issue.message}`)
    .join('\n')
  throw new Error(`Variables de entorno inválidas:\n${details}`)
}

export const config = parsed.data
