export class ApiError extends Error {
  readonly status: number
  readonly body: Record<string, unknown>

  constructor(message: string, status: number, body: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  if (init.method && init.method !== 'GET' && init.method !== 'HEAD') {
    headers.set('x-algodecomer-request', '1')
  }
  const response = await fetch(path, { ...init, headers, credentials: 'include' })
  const text = await response.text()
  const parsed: unknown = text ? JSON.parse(text) : null
  if (!response.ok) {
    const body = isRecord(parsed) ? parsed : {}
    const message = typeof body.error === 'string' ? body.error : 'No se pudo completar la solicitud'
    throw new ApiError(message, response.status, body)
  }
  return parsed as T
}

export function errorText(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'No se pudo completar la solicitud'
  }
  const missing = error.body.missing
  if (Array.isArray(missing) && missing.every((item) => typeof item === 'string')) {
    return `${error.message} ${missing.join(' ')}`
  }
  return error.message
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
