import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ZONE_STATUSES } from '../../domain/offer.js'
import { parse } from '../../http/parse.js'
import { requireAdmin, requireUser } from '../access.js'
import { approveBranch, listPendingBranches, rejectBranch } from '../branches/service.js'
import { createRectangularZone, listWaitlist, listZones, updateZoneStatus } from '../coverage/service.js'

export async function adminRoutes(app: FastifyInstance) {
  app.get('/admin/coverage-zones', async (request) => {
    await requireAdmin(requireUser(request.auth).userId)
    return listZones()
  })

  app.post('/admin/coverage-zones', async (request) => {
    const adminId = requireUser(request.auth).userId
    await requireAdmin(adminId)
    const body = parse(
      z.object({
        name: z.string().trim().min(1).max(120),
        status: z.enum(ZONE_STATUSES),
        south: z.number().gte(-90).lte(90),
        west: z.number().gte(-180).lte(180),
        north: z.number().gte(-90).lte(90),
        east: z.number().gte(-180).lte(180),
      }),
      request.body,
    )
    return { id: await createRectangularZone(adminId, body) }
  })

  app.patch('/admin/coverage-zones/:id', async (request) => {
    const adminId = requireUser(request.auth).userId
    await requireAdmin(adminId)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    const body = parse(z.object({ status: z.enum(ZONE_STATUSES) }), request.body)
    await updateZoneStatus(adminId, params.id, body.status)
    return { ok: true }
  })

  app.get('/admin/branches', async (request) => {
    await requireAdmin(requireUser(request.auth).userId)
    return listPendingBranches()
  })

  app.post('/admin/branches/:id/approve', async (request) => {
    const adminId = requireUser(request.auth).userId
    await requireAdmin(adminId)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    await approveBranch(adminId, params.id)
    return { ok: true }
  })

  app.post('/admin/branches/:id/reject', async (request) => {
    const adminId = requireUser(request.auth).userId
    await requireAdmin(adminId)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    const body = parse(z.object({ reason: z.string().trim().min(1).max(500) }), request.body)
    await rejectBranch(adminId, params.id, body.reason)
    return { ok: true }
  })

  app.get('/admin/waitlist', async (request) => {
    await requireAdmin(requireUser(request.auth).userId)
    return listWaitlist()
  })
}
