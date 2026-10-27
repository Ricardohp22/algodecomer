import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import type { FastifyInstance } from 'fastify'
import { pool } from '../../db/client.js'
import { buildApp } from '../../app.js'
import { createOrPromoteAdmin } from '../auth/service.js'
import { closePoolAfterTests } from '../../test/close-pool.js'

closePoolAfterTests()

const PASSWORD = 'contrasena-segura'
const PHONE = '+525512345678'
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

let app: FastifyInstance

before(async () => {
  app = await buildApp()
})

after(async () => {
  await pool.query(`DELETE FROM users WHERE email LIKE 'fase1-%@example.com'`)
  await pool.query(`DELETE FROM coverage_waitlist WHERE email LIKE 'fase1-%@example.com'`)
  await pool.query(`DELETE FROM coverage_zones WHERE name LIKE 'Zona prueba %'`)
  await pool.query(
    `UPDATE plan_entitlements SET limit_value = 10
     WHERE feature_code = 'max_photos'
       AND plan_id = (SELECT id FROM plans WHERE code = 'BASIC')`,
  )
  await app.close()
})

test('una mutación sin la cabecera de la aplicación se rechaza', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    headers: { 'content-type': 'application/json' },
    payload: { email: 'fase1-nadie@example.com', password: PASSWORD },
  })
  assert.equal(response.statusCode, 403)
})

test('el alta fuera de zona queda en lista de espera y no crea sucursal', async () => {
  const cookie = await registerAndVerify(`fase1-${randomUUID()}@example.com`)
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/branches',
    headers: json(cookie),
    payload: branchPayload(0, 0, true),
  })
  assert.equal(response.statusCode, 422, response.body)
  const body = response.json() as { code?: string; waitlistId?: string }
  assert.equal(body.code, 'out_of_coverage', response.body)
  assert.ok(body.waitlistId)
  const mine = await app.inject({ method: 'GET', url: '/api/v1/me/branches', headers: json(cookie) })
  assert.deepEqual(mine.json(), [])
})

test('la revisión publica el catálogo y oculta el domicilio de una cocina en casa', async () => {
  const sellerEmail = `fase1-${randomUUID()}@example.com`
  const seller = await registerAndVerify(sellerEmail)
  const early = await app.inject({
    method: 'POST',
    url: '/api/v1/branches',
    headers: json(seller),
    payload: branchPayload(20.5, -100.5, false),
  })
  assert.equal(early.statusCode, 422)

  const adminEmail = `fase1-admin-${randomUUID()}@example.com`
  await createOrPromoteAdmin({ email: adminEmail, password: PASSWORD, name: 'Admin Fase 1' })
  const admin = cookieFrom(
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: json(),
      payload: { email: adminEmail, password: PASSWORD },
    }),
  )
  const zoneName = `Zona prueba ${randomUUID()}`
  const zone = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/coverage-zones',
    headers: json(admin),
    payload: { name: zoneName, status: 'pilot', south: 20, west: -101, north: 21, east: -100 },
  })
  assert.equal(zone.statusCode, 200)

  const created = await app.inject({
    method: 'POST',
    url: '/api/v1/branches',
    headers: json(seller),
    payload: {
      ...branchPayload(20.5, -100.5, false),
      businessType: 'cocina_en_casa',
      exposePublicAddress: false,
      address: 'Calle privada 12',
    },
  })
  assert.equal(created.statusCode, 200, created.body)
  const branchId = (created.json() as { id: string }).id

  const premature = await app.inject({
    method: 'POST',
    url: `/api/v1/branches/${branchId}/submit-review`,
    headers: mutation(seller),
  })
  assert.equal(premature.statusCode, 422, premature.body)

  await app.inject({
    method: 'PUT',
    url: `/api/v1/branches/${branchId}/hours`,
    headers: json(seller),
    payload: { intervals: [{ weekday: 1, opensAt: '09:00', closesAt: '17:00' }] },
  })
  const category = await app.inject({
    method: 'POST',
    url: `/api/v1/branches/${branchId}/categories`,
    headers: json(seller),
    payload: { name: 'Guisados', sortOrder: 1 },
  })
  const categoryId = (category.json() as { id: string }).id
  const product = await app.inject({
    method: 'POST',
    url: `/api/v1/branches/${branchId}/products`,
    headers: json(seller),
    payload: {
      categoryId,
      name: 'Tacos de guisado',
      description: 'Con arroz',
      basePrice: '45',
      availabilityStatus: 'available',
      published: true,
    },
  })
  assert.equal(product.statusCode, 200, product.body)
  const productId = (product.json() as { id: string }).id

  const variant = await app.inject({
    method: 'POST',
    url: `/api/v1/products/${productId}/variants`,
    headers: json(seller),
    payload: { name: 'Orden', priceDelta: '10' },
  })
  assert.equal(variant.statusCode, 200)

  const hidden = await app.inject({ method: 'GET', url: `/api/v1/branches/${branchId}` })
  assert.equal(hidden.statusCode, 404)

  const stranger = await registerAndVerify(`fase1-${randomUUID()}@example.com`)
  const forbidden = await app.inject({
    method: 'PATCH',
    url: `/api/v1/branches/${branchId}`,
    headers: json(stranger),
    payload: branchPayload(20.5, -100.5, false),
  })
  assert.equal(forbidden.statusCode, 404)

  const submitted = await app.inject({
    method: 'POST',
    url: `/api/v1/branches/${branchId}/submit-review`,
    headers: mutation(seller),
  })
  assert.equal(submitted.statusCode, 200, submitted.body)

  const approved = await app.inject({
    method: 'POST',
    url: `/api/v1/admin/branches/${branchId}/approve`,
    headers: mutation(admin),
  })
  assert.equal(approved.statusCode, 200, approved.body)

  const published = await app.inject({ method: 'GET', url: `/api/v1/branches/${branchId}` })
  assert.equal(published.statusCode, 200)
  const body = published.json() as {
    addressPublic: string | null
    products: Array<{ name: string; basePrice: string }>
    phone: string
  }
  assert.equal(body.addressPublic, null)
  assert.equal('addressPrivate' in (published.json() as object), false)
  assert.equal(body.products[0]?.name, 'Tacos de guisado')
  assert.equal(body.products[0]?.basePrice, '45.00')

  const negative = await app.inject({
    method: 'POST',
    url: `/api/v1/branches/${branchId}/products`,
    headers: json(seller),
    payload: { categoryId, name: 'Gratis', basePrice: '-1', published: false },
  })
  assert.equal(negative.statusCode, 400)

  const other = await app.inject({
    method: 'POST',
    url: '/api/v1/branches',
    headers: json(stranger),
    payload: branchPayload(20.6, -100.6, false),
  })
  const otherId = (other.json() as { id: string }).id
  const foreignGroup = await app.inject({
    method: 'POST',
    url: `/api/v1/branches/${otherId}/modifier-groups`,
    headers: json(stranger),
    payload: { name: 'Salsas', minSelect: 0, maxSelect: 2, selectionType: 'multiple' },
  })
  const groupId = (foreignGroup.json() as { id: string }).id
  const linked = await app.inject({
    method: 'PUT',
    url: `/api/v1/products/${productId}/modifier-groups`,
    headers: json(seller),
    payload: { groupIds: [groupId] },
  })
  assert.equal(linked.statusCode, 422)

  await pool.query(
    `UPDATE plan_entitlements SET limit_value = 1
     WHERE feature_code = 'max_photos'
       AND plan_id = (SELECT id FROM plans WHERE code = 'BASIC')`,
  )
  const firstPhoto = await app.inject({
    method: 'POST',
    url: `/api/v1/branches/${branchId}/photos`,
    headers: { ...multipart(PNG).headers, 'x-algodecomer-request': '1', cookie: seller },
    payload: multipart(PNG).body,
  })
  assert.equal(firstPhoto.statusCode, 200, firstPhoto.body)
  const secondPhoto = await app.inject({
    method: 'POST',
    url: `/api/v1/branches/${branchId}/photos`,
    headers: { ...multipart(PNG).headers, 'x-algodecomer-request': '1', cookie: seller },
    payload: multipart(PNG).body,
  })
  assert.equal(secondPhoto.statusCode, 422)
})

async function registerAndVerify(email: string) {
  const registered = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    headers: json(),
    payload: { name: 'Ana Prueba', email, password: PASSWORD },
  })
  assert.equal(registered.statusCode, 200, registered.body)
  const cookie = cookieFrom(registered)
  const blocked = await app.inject({
    method: 'POST',
    url: '/api/v1/branches',
    headers: json(cookie),
    payload: branchPayload(20.5, -100.5, false),
  })
  assert.equal(blocked.statusCode, 403)

  const codeRequest = await app.inject({
    method: 'POST',
    url: '/api/v1/phone/verifications',
    headers: json(cookie),
    payload: { phone: PHONE },
  })
  assert.equal(codeRequest.statusCode, 200, codeRequest.body)
  const devCode = (codeRequest.json() as { devCode?: string }).devCode
  assert.ok(devCode)
  const wrong = await app.inject({
    method: 'POST',
    url: '/api/v1/phone/verifications/confirm',
    headers: json(cookie),
    payload: { phone: PHONE, code: '000000' },
  })
  assert.equal(wrong.statusCode, 400)
  const confirmed = await app.inject({
    method: 'POST',
    url: '/api/v1/phone/verifications/confirm',
    headers: json(cookie),
    payload: { phone: PHONE, code: devCode },
  })
  assert.equal(confirmed.statusCode, 200)
  return cookie
}

function branchPayload(latitude: number, longitude: number, coverageConsent: boolean) {
  return {
    legalName: 'Cocina Ana',
    branchName: 'Sucursal centro',
    description: 'Comida casera del día',
    businessType: 'restaurante',
    phone: PHONE,
    whatsapp: PHONE,
    address: 'Calle pública 8',
    exposePublicAddress: true,
    latitude,
    longitude,
    planCode: 'BASIC',
    dineIn: true,
    pickup: true,
    delivery: false,
    deliveryFee: '0',
    deliveryRadiusM: null,
    minOrder: null,
    coverageConsent,
  }
}

function json(cookie?: string) {
  return {
    'content-type': 'application/json',
    'x-algodecomer-request': '1',
    ...(cookie ? { cookie } : {}),
  }
}

function mutation(cookie?: string) {
  return {
    'x-algodecomer-request': '1',
    ...(cookie ? { cookie } : {}),
  }
}

function cookieFrom(response: { headers: { 'set-cookie'?: string | string[] | number } }) {
  const raw = response.headers['set-cookie']
  const header = Array.isArray(raw) ? raw.join(';') : String(raw ?? '')
  const match = /algodecomer_session=([^;]+)/.exec(header)
  assert.ok(match?.[1])
  return `algodecomer_session=${match[1]}`
}

function multipart(file: Buffer) {
  const boundary = '----algodecomer'
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="foto.png"\r\nContent-Type: image/png\r\n\r\n`,
    ),
    file,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])
  return { body, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } }
}
