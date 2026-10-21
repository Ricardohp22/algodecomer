import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PoolClient } from 'pg'
import { ROLE_CODES } from '../domain/identity.js'
import { closePoolAfterTests } from '../test/close-pool.js'
import { pool } from './client.js'

closePoolAfterTests()

test('PostGIS, pg_trgm y la zona horaria de la plataforma están activos', async () => {
  const extensions = await pool.query<{ extname: string }>(
    "SELECT extname FROM pg_extension WHERE extname IN ('postgis', 'pg_trgm') ORDER BY extname",
  )
  assert.deepEqual(
    extensions.rows.map((row) => row.extname),
    ['pg_trgm', 'postgis'],
  )

  const timezone = await pool.query<{ timezone: string }>(
    "SELECT current_setting('TIMEZONE') AS timezone",
  )
  assert.equal(timezone.rows[0]?.timezone, 'America/Mexico_City')
})

test('el catálogo de roles coincide con el dominio', async () => {
  const result = await pool.query<{ code: string }>('SELECT code FROM roles ORDER BY code')
  assert.deepEqual(
    result.rows.map((row) => row.code),
    [...ROLE_CODES],
  )
})

test('las reglas de identidad rechazan datos incoherentes y conservan updated_at', async () => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const customer = await client.query<{ id: string }>(
      "SELECT id FROM roles WHERE code = 'customer'",
    )
    const customerRoleId = customer.rows[0]?.id
    assert.ok(customerRoleId)

    await expectSqlState(
      client,
      `INSERT INTO users (email, name) VALUES ('Mayuscula@example.com', 'Ana')`,
      [],
      '23514',
    )

    const inserted = await client.query<{ id: string; updatedAt: Date }>(
      `INSERT INTO users (email, name, phone)
       VALUES ('ana.fase0@example.com', 'Ana', '+525512345678')
       RETURNING id, updated_at AS "updatedAt"`,
    )
    const userId = inserted.rows[0]?.id
    const createdStamp = inserted.rows[0]?.updatedAt
    assert.ok(userId)
    assert.ok(createdStamp)

    await client.query('SELECT pg_sleep(0.05)')
    const updated = await client.query<{ updatedAt: Date }>(
      `UPDATE users SET name = 'Ana Actualizada' WHERE id = $1 RETURNING updated_at AS "updatedAt"`,
      [userId],
    )
    const updatedStamp = updated.rows[0]?.updatedAt
    assert.ok(updatedStamp)
    assert.ok(updatedStamp.getTime() > createdStamp.getTime())

    await client.query(
      `INSERT INTO user_roles (user_id, role_id, scope_type) VALUES ($1, $2, 'global')`,
      [userId, customerRoleId],
    )
    await expectSqlState(
      client,
      `INSERT INTO user_roles (user_id, role_id, scope_type) VALUES ($1, $2, 'global')`,
      [userId, customerRoleId],
      '23505',
    )

    await expectSqlState(
      client,
      `INSERT INTO user_roles (user_id, role_id, scope_type, scope_id)
       VALUES ($1, $2, 'global', $3)`,
      [userId, customerRoleId, '5d5c8a2e-3e0d-4c1a-9c1e-0c5a6a1b2c3d'],
      '23514',
    )

    await expectSqlState(
      client,
      `INSERT INTO user_roles (user_id, role_id, scope_type) VALUES ($1, $2, 'branch')`,
      [userId, customerRoleId],
      '23514',
    )

    await client.query(
      `INSERT INTO auth_identities (user_id, provider, provider_subject)
       VALUES ($1, 'password', $2)`,
      [userId, 'ana.fase0@example.com'],
    )
    await expectSqlState(
      client,
      `INSERT INTO auth_identities (user_id, provider, provider_subject)
       VALUES ($1, 'facebook', 'abc')`,
      [userId],
      '23514',
    )
  } finally {
    await client.query('ROLLBACK')
    client.release()
  }
})

async function expectSqlState(
  client: PoolClient,
  statement: string,
  params: unknown[],
  expected: string,
): Promise<void> {
  await client.query('SAVEPOINT integrity_check')
  try {
    await client.query(statement, params)
    assert.fail(`La sentencia debía fallar con ${expected}`)
  } catch (error) {
    if (error instanceof assert.AssertionError) {
      throw error
    }
    assert.equal(sqlState(error), expected)
  } finally {
    await client.query('ROLLBACK TO SAVEPOINT integrity_check')
    await client.query('RELEASE SAVEPOINT integrity_check')
  }
}

function sqlState(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = error.code
    return typeof code === 'string' ? code : undefined
  }
  return undefined
}
