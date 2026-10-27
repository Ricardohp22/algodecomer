import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AMENITY_CODES, BUSINESS_TYPES, PLAN_CODES } from '../../domain/offer.js'
import { parse } from '../../http/parse.js'
import { requireUser } from '../access.js'
import { listCatalog } from '../catalog/service.js'
import { listBranchFiles } from '../media/service.js'
import {
  createBranch,
  getOwnerBranch,
  getPublicBranch,
  listMyBranches,
  replaceAmenities,
  replaceHours,
  submitForReview,
  updateBranch,
} from './service.js'

const phone = z.string().regex(/^\+[1-9]\d{7,14}$/)
const money = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/)
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

const branchBody = z
  .object({
    legalName: z.string().trim().min(1).max(160),
    branchName: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2000),
    businessType: z.enum(BUSINESS_TYPES),
    phone,
    whatsapp: z.union([phone, z.literal(''), z.null()]).optional(),
    address: z.string().trim().min(1).max(240),
    exposePublicAddress: z.boolean(),
    latitude: z.number().gte(-90).lte(90),
    longitude: z.number().gte(-180).lte(180),
    planCode: z.enum(PLAN_CODES),
    dineIn: z.boolean(),
    pickup: z.boolean(),
    delivery: z.boolean(),
    deliveryFee: money.default('0'),
    deliveryRadiusM: z.number().int().positive().nullable(),
    minOrder: z.union([money, z.null()]),
    coverageConsent: z.boolean().optional(),
  })
  .refine((value) => value.dineIn || value.pickup || value.delivery, {
    message: 'Elige al menos una modalidad de servicio',
  })
  .refine((value) => !value.delivery || (value.deliveryRadiusM !== null && value.deliveryRadiusM > 0), {
    message: 'Indica el radio de entrega en metros',
  })

export async function branchRoutes(app: FastifyInstance) {
  app.get('/branches/:id', async (request) => {
    const params = parse(z.object({ id: z.uuid() }), request.params)
    const branch = await getPublicBranch(params.id)
    const catalog = await listCatalog(params.id, false)
    const files = await listBranchFiles(params.id)
    return { ...branch, ...catalog, ...files }
  })

  app.get('/me/branches', async (request) => {
    const auth = requireUser(request.auth)
    return listMyBranches(auth.userId)
  })

  app.get('/me/branches/:id', async (request) => {
    const auth = requireUser(request.auth)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    return ownerBundle(auth.userId, params.id)
  })

  app.post('/branches', async (request) => {
    const auth = requireUser(request.auth)
    const body = parse(branchBody, request.body)
    const created = await createBranch(auth.userId, toInput(body), body.coverageConsent === true)
    return ownerBundle(auth.userId, created.id)
  })

  app.patch('/branches/:id', async (request) => {
    const auth = requireUser(request.auth)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    const body = parse(branchBody, request.body)
    await updateBranch(auth.userId, params.id, toInput(body))
    return ownerBundle(auth.userId, params.id)
  })

  app.put('/branches/:id/hours', async (request) => {
    const auth = requireUser(request.auth)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    const body = parse(
      z.object({
        intervals: z
          .array(z.object({ weekday: z.number().int().min(1).max(7), opensAt: clock, closesAt: clock }))
          .max(21),
      }),
      request.body,
    )
    return replaceHours(auth.userId, params.id, body.intervals)
  })

  app.put('/branches/:id/amenities', async (request) => {
    const auth = requireUser(request.auth)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    const body = parse(z.object({ codes: z.array(z.enum(AMENITY_CODES)).max(AMENITY_CODES.length) }), request.body)
    return replaceAmenities(auth.userId, params.id, body.codes)
  })

  app.post('/branches/:id/submit-review', async (request) => {
    const auth = requireUser(request.auth)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    return submitForReview(auth.userId, params.id)
  })
}

async function ownerBundle(userId: string, branchId: string) {
  const branch = await getOwnerBranch(userId, branchId)
  const catalog = await listCatalog(branchId, true)
  const files = await listBranchFiles(branchId)
  return { ...branch, ...catalog, ...files }
}

function toInput(body: z.infer<typeof branchBody>) {
  return {
    legalName: body.legalName,
    branchName: body.branchName,
    description: body.description,
    businessType: body.businessType,
    phone: body.phone,
    whatsapp: body.whatsapp ? body.whatsapp : null,
    address: body.address,
    exposePublicAddress: body.exposePublicAddress,
    latitude: body.latitude,
    longitude: body.longitude,
    planCode: body.planCode,
    dineIn: body.dineIn,
    pickup: body.pickup,
    delivery: body.delivery,
    deliveryFee: body.deliveryFee,
    deliveryRadiusM: body.deliveryRadiusM,
    minOrder: body.minOrder,
  }
}
