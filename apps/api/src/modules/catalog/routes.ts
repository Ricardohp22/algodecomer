import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AVAILABILITY_STATUSES, SELECTION_TYPES } from '../../domain/offer.js'
import { parse } from '../../http/parse.js'
import { requireUser } from '../access.js'
import {
  addModifierOption,
  addVariant,
  createCategory,
  createModifierGroup,
  createProduct,
  deleteCategory,
  deleteProduct,
  deleteVariant,
  duplicateProduct,
  setProductModifiers,
  updateCategory,
  updateProduct,
} from './service.js'

const money = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/)
const productBody = z.object({
  categoryId: z.uuid(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).default(''),
  basePrice: money,
  availabilityStatus: z.enum(AVAILABILITY_STATUSES).default('available'),
  published: z.boolean().default(true),
})

export async function catalogRoutes(app: FastifyInstance) {
  app.post('/branches/:id/categories', async (request) => {
    const auth = requireUser(request.auth)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    const body = parse(z.object({ name: z.string().trim().min(1).max(80), sortOrder: z.number().int().default(0) }), request.body)
    return createCategory(auth.userId, params.id, body.name, body.sortOrder)
  })

  app.patch('/categories/:id', async (request) => {
    const auth = requireUser(request.auth)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    const body = parse(z.object({ name: z.string().trim().min(1).max(80), sortOrder: z.number().int() }), request.body)
    await updateCategory(auth.userId, params.id, body.name, body.sortOrder)
    return { ok: true }
  })

  app.delete('/categories/:id', async (request) => {
    const auth = requireUser(request.auth)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    await deleteCategory(auth.userId, params.id)
    return { ok: true }
  })

  app.post('/branches/:id/products', async (request) => {
    const auth = requireUser(request.auth)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    const body = parse(productBody, request.body)
    const id = await createProduct(auth.userId, params.id, body)
    return { id }
  })

  app.patch('/products/:id', async (request) => {
    const auth = requireUser(request.auth)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    const body = parse(productBody, request.body)
    await updateProduct(auth.userId, params.id, body)
    return { ok: true }
  })

  app.delete('/products/:id', async (request) => {
    const auth = requireUser(request.auth)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    await deleteProduct(auth.userId, params.id)
    return { ok: true }
  })

  app.post('/products/:id/duplicate', async (request) => {
    const auth = requireUser(request.auth)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    return { id: await duplicateProduct(auth.userId, params.id) }
  })

  app.post('/products/:id/variants', async (request) => {
    const auth = requireUser(request.auth)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    const body = parse(z.object({ name: z.string().trim().min(1).max(80), priceDelta: money }), request.body)
    return { id: await addVariant(auth.userId, params.id, body.name, body.priceDelta) }
  })

  app.delete('/variants/:id', async (request) => {
    const auth = requireUser(request.auth)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    await deleteVariant(auth.userId, params.id)
    return { ok: true }
  })

  app.post('/branches/:id/modifier-groups', async (request) => {
    const auth = requireUser(request.auth)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    const body = parse(
      z.object({
        name: z.string().trim().min(1).max(80),
        minSelect: z.number().int().min(0),
        maxSelect: z.number().int().min(1),
        selectionType: z.enum(SELECTION_TYPES),
      }),
      request.body,
    )
    return { id: await createModifierGroup(auth.userId, params.id, body) }
  })

  app.post('/modifier-groups/:id/options', async (request) => {
    const auth = requireUser(request.auth)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    const body = parse(
      z.object({
        name: z.string().trim().min(1).max(80),
        priceDelta: money,
        maxQuantity: z.number().int().positive().default(1),
      }),
      request.body,
    )
    return { id: await addModifierOption(auth.userId, params.id, body.name, body.priceDelta, body.maxQuantity) }
  })

  app.put('/products/:id/modifier-groups', async (request) => {
    const auth = requireUser(request.auth)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    const body = parse(z.object({ groupIds: z.array(z.uuid()).max(30) }), request.body)
    await setProductModifiers(auth.userId, params.id, body.groupIds)
    return { ok: true }
  })
}
