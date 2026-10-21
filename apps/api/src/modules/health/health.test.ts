import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildApp } from '../../app.js'
import { closePoolAfterTests } from '../../test/close-pool.js'

closePoolAfterTests()

test('GET /api/v1/health reporta base, PostGIS y zona horaria', async () => {
  const app = await buildApp()
  const response = await app.inject({ method: 'GET', url: '/api/v1/health' })

  assert.equal(response.statusCode, 200)
  const body: unknown = response.json()
  assert.equal(isHealthOk(body), true)

  if (isHealthOk(body)) {
    assert.match(body.postgis, /3\./)
    assert.equal(body.timezone, 'America/Mexico_City')
    assert.equal(response.headers['cache-control'], 'no-store')
  }

  const missing = await app.inject({ method: 'GET', url: '/api/v1/no-existe' })
  assert.equal(missing.statusCode, 404)

  await app.close()
})

function isHealthOk(body: unknown): body is {
  status: string
  database: string
  postgis: string
  timezone: string
} {
  if (typeof body !== 'object' || body === null) {
    return false
  }

  const record = body as Record<string, unknown>
  return (
    record.status === 'ok' &&
    record.database === 'up' &&
    typeof record.postgis === 'string' &&
    typeof record.timezone === 'string'
  )
}
