import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '../../db/client.js'
import {
  auditLogs,
  branchAmenities,
  branchHours,
  branchMembers,
  branches,
  businesses,
  deliveryAreas,
  deliverySettings,
  plans,
  users,
} from '../../db/schema/index.js'
import type { BusinessType, PlanCode } from '../../domain/offer.js'
import { resultRows } from '../../db/rows.js'
import { HttpError, normalizeMoney } from '../../http/errors.js'
import { assignRole } from '../auth/service.js'
import { addBusinessWaitlist, findCoveringZone } from '../coverage/service.js'
import { requireOwner } from '../access.js'

export type BranchInput = {
  legalName: string
  branchName: string
  description: string
  businessType: BusinessType
  phone: string
  whatsapp: string | null
  address: string
  exposePublicAddress: boolean
  latitude: number
  longitude: number
  planCode: PlanCode
  dineIn: boolean
  pickup: boolean
  delivery: boolean
  deliveryFee: string
  deliveryRadiusM: number | null
  minOrder: string | null
}

export async function createBranch(userId: string, input: BranchInput, coverageConsent: boolean) {
  const user = await requireVerifiedUser(userId)
  const zone = await findCoveringZone(input.latitude, input.longitude)
  if (!zone) {
    if (!coverageConsent) {
      throw new HttpError(422, 'El punto está fuera de cobertura', { code: 'out_of_coverage' })
    }
    const waitlistId = await addBusinessWaitlist({
      email: user.email,
      phone: input.phone,
      latitude: input.latitude,
      longitude: input.longitude,
    })
    throw new HttpError(422, 'El punto está fuera de cobertura. Te anotamos en la lista de espera.', {
      code: 'out_of_coverage',
      waitlistId,
    })
  }

  const plan = await requirePlan(input.planCode)
  const address = addressFields(input)

  const branchId = await db.transaction(async (tx) => {
    const [business] = await tx
      .insert(businesses)
      .values({
        ownerUserId: userId,
        legalDisplayName: input.legalName.trim(),
        description: input.description.trim(),
      })
      .returning()
    if (!business) {
      throw new HttpError(500, 'No se pudo crear el negocio')
    }

    const [branch] = await tx
      .insert(branches)
      .values({
        businessId: business.id,
        planId: plan.id,
        name: input.branchName.trim(),
        description: input.description.trim(),
        businessType: input.businessType,
        phone: input.phone,
        whatsapp: input.whatsapp,
        addressPrivate: address.privateAddress,
        addressPublic: address.publicAddress,
        exposePublicAddress: address.expose,
        latitude: input.latitude,
        longitude: input.longitude,
      })
      .returning()
    if (!branch) {
      throw new HttpError(500, 'No se pudo crear la sucursal')
    }

    await tx.insert(deliverySettings).values({
      branchId: branch.id,
      deliveryEnabled: input.delivery,
      pickupEnabled: input.pickup,
      dineInEnabled: input.dineIn,
      fixedFee: normalizeMoney(input.deliveryFee),
      minOrder: input.minOrder ? normalizeMoney(input.minOrder) : null,
    })
    if (input.delivery && input.deliveryRadiusM) {
      await tx.insert(deliveryAreas).values({ branchId: branch.id, radiusM: input.deliveryRadiusM })
    }
    await tx.insert(branchMembers).values({
      branchId: branch.id,
      userId,
      role: 'owner',
      active: true,
    })
    await assignRole(tx, userId, 'owner', 'branch', branch.id)
    return branch.id
  })

  return getOwnerBranch(userId, branchId)
}

export async function updateBranch(userId: string, branchId: string, input: BranchInput) {
  await requireOwner(userId, branchId)
  const zone = await findCoveringZone(input.latitude, input.longitude)
  if (!zone) {
    throw new HttpError(422, 'El punto está fuera de una zona piloto o activa', { code: 'out_of_coverage' })
  }
  const plan = await requirePlan(input.planCode)
  const address = addressFields(input)
  const [current] = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1)
  if (!current) {
    throw new HttpError(404, 'No encontramos esa sucursal')
  }

  await db.transaction(async (tx) => {
    await tx
      .update(businesses)
      .set({
        legalDisplayName: input.legalName.trim(),
        description: input.description.trim(),
      })
      .where(eq(businesses.id, current.businessId))

    await tx
      .update(branches)
      .set({
        planId: plan.id,
        name: input.branchName.trim(),
        description: input.description.trim(),
        businessType: input.businessType,
        phone: input.phone,
        whatsapp: input.whatsapp,
        addressPrivate: address.privateAddress,
        addressPublic: address.publicAddress,
        exposePublicAddress: address.expose,
        latitude: input.latitude,
        longitude: input.longitude,
        approvalStatus: current.approvalStatus === 'pending_review' ? 'draft' : current.approvalStatus,
        rejectionReason: current.approvalStatus === 'pending_review' ? null : current.rejectionReason,
      })
      .where(eq(branches.id, branchId))

    await tx
      .update(deliverySettings)
      .set({
        deliveryEnabled: input.delivery,
        pickupEnabled: input.pickup,
        dineInEnabled: input.dineIn,
        fixedFee: normalizeMoney(input.deliveryFee),
        minOrder: input.minOrder ? normalizeMoney(input.minOrder) : null,
      })
      .where(eq(deliverySettings.branchId, branchId))

    await tx.delete(deliveryAreas).where(eq(deliveryAreas.branchId, branchId))
    if (input.delivery && input.deliveryRadiusM) {
      await tx.insert(deliveryAreas).values({ branchId, radiusM: input.deliveryRadiusM })
    }
  })

  return getOwnerBranch(userId, branchId)
}

export async function replaceHours(
  userId: string,
  branchId: string,
  intervals: Array<{ weekday: number; opensAt: string; closesAt: string }>,
) {
  await requireOwner(userId, branchId)
  for (const interval of intervals) {
    if (interval.opensAt === interval.closesAt) {
      throw new HttpError(400, 'El horario no puede abrir y cerrar a la misma hora')
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(branchHours).where(eq(branchHours.branchId, branchId))
    if (intervals.length > 0) {
      await tx.insert(branchHours).values(
        intervals.map((interval) => ({
          branchId,
          weekday: interval.weekday,
          opensAt: interval.opensAt,
          closesAt: interval.closesAt,
        })),
      )
    }
  })
  return getOwnerBranch(userId, branchId)
}

export async function replaceAmenities(userId: string, branchId: string, codes: string[]) {
  await requireOwner(userId, branchId)
  const unique = [...new Set(codes)]
  await db.transaction(async (tx) => {
    await tx.delete(branchAmenities).where(eq(branchAmenities.branchId, branchId))
    if (unique.length > 0) {
      await tx.insert(branchAmenities).values(unique.map((amenityCode) => ({ branchId, amenityCode })))
    }
  })
  return getOwnerBranch(userId, branchId)
}

export async function submitForReview(userId: string, branchId: string) {
  await requireOwner(userId, branchId)
  const [branch] = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1)
  if (!branch) {
    throw new HttpError(404, 'No encontramos esa sucursal')
  }
  if (branch.approvalStatus === 'pending_review' || branch.approvalStatus === 'approved') {
    throw new HttpError(409, 'Esta sucursal ya fue enviada a revisión')
  }
  const missing = await publicationGaps(branchId)
  if (missing.length > 0) {
    throw new HttpError(422, 'Faltan requisitos para enviar a revisión', { missing })
  }
  await db
    .update(branches)
    .set({
      approvalStatus: 'pending_review',
      submittedAt: new Date(),
      rejectionReason: null,
    })
    .where(eq(branches.id, branchId))
  return getOwnerBranch(userId, branchId)
}

export async function approveBranch(adminId: string, branchId: string) {
  const [branch] = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1)
  if (!branch || branch.approvalStatus !== 'pending_review') {
    throw new HttpError(409, 'La sucursal no está pendiente de revisión')
  }
  const missing = await publicationGaps(branchId)
  if (missing.length > 0) {
    throw new HttpError(422, 'La sucursal ya no cumple los requisitos de publicación', { missing })
  }

  await db.transaction(async (tx) => {
    await tx
      .update(branches)
      .set({
        approvalStatus: 'approved',
        publicationStatus: 'published',
        reviewedAt: new Date(),
        reviewedBy: adminId,
        rejectionReason: null,
      })
      .where(eq(branches.id, branchId))
    await tx.insert(auditLogs).values({
      actorId: adminId,
      action: 'branch.approved',
      entityType: 'branch',
      entityId: branchId,
      beforeJson: { approvalStatus: branch.approvalStatus, publicationStatus: branch.publicationStatus },
      afterJson: { approvalStatus: 'approved', publicationStatus: 'published' },
    })
  })
}

export async function rejectBranch(adminId: string, branchId: string, reason: string) {
  const trimmed = reason.trim()
  if (!trimmed) {
    throw new HttpError(400, 'Indica el motivo del rechazo')
  }
  const [branch] = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1)
  if (!branch || branch.approvalStatus !== 'pending_review') {
    throw new HttpError(409, 'La sucursal no está pendiente de revisión')
  }

  await db.transaction(async (tx) => {
    await tx
      .update(branches)
      .set({
        approvalStatus: 'rejected',
        publicationStatus: 'unpublished',
        reviewedAt: new Date(),
        reviewedBy: adminId,
        rejectionReason: trimmed,
      })
      .where(eq(branches.id, branchId))
    await tx.insert(auditLogs).values({
      actorId: adminId,
      action: 'branch.rejected',
      entityType: 'branch',
      entityId: branchId,
      beforeJson: { approvalStatus: branch.approvalStatus },
      afterJson: { approvalStatus: 'rejected', reason: trimmed },
    })
  })
}

export async function listMyBranches(userId: string) {
  return db
    .select({
      id: branches.id,
      name: branches.name,
      approvalStatus: branches.approvalStatus,
      publicationStatus: branches.publicationStatus,
      businessType: branches.businessType,
    })
    .from(branchMembers)
    .innerJoin(branches, eq(branches.id, branchMembers.branchId))
    .where(and(eq(branchMembers.userId, userId), eq(branchMembers.active, true)))
    .orderBy(asc(branches.createdAt))
}

export async function listPendingBranches() {
  const result = await db.execute(sql`
    SELECT b.id, b.name, b.submitted_at AS "submittedAt", bu.legal_display_name AS "legalName",
           p.code AS "planCode", u.email AS "ownerEmail"
    FROM branches b
    JOIN businesses bu ON bu.id = b.business_id
    JOIN plans p ON p.id = b.plan_id
    JOIN users u ON u.id = bu.owner_user_id
    WHERE b.approval_status = 'pending_review'
    ORDER BY b.submitted_at NULLS LAST
  `)
  return (result as { rows: unknown[] }).rows
}

export async function getOwnerBranch(userId: string, branchId: string) {
  await requireOwner(userId, branchId)
  const detail = await loadBranch(branchId, true)
  if (!detail) {
    throw new HttpError(404, 'No encontramos esa sucursal')
  }
  return { ...detail, missing: await publicationGaps(branchId) }
}

export async function getPublicBranch(branchId: string) {
  const detail = await loadBranch(branchId, false)
  if (!detail || detail.publicationStatus !== 'published' || detail.approvalStatus !== 'approved') {
    throw new HttpError(404, 'No encontramos esa sucursal')
  }
  const { addressPrivate: _private, missing: _missing, rejectionReason: _reason, ...publicView } = {
    ...detail,
    missing: [],
  }
  return publicView
}

export async function publicationGaps(branchId: string): Promise<string[]> {
  const [branch] = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1)
  if (!branch) {
    return ['La sucursal no existe']
  }
  const [business] = await db.select().from(businesses).where(eq(businesses.id, branch.businessId)).limit(1)
  const [owner] = business
    ? await db.select().from(users).where(eq(users.id, business.ownerUserId)).limit(1)
    : []
  const [delivery] = await db.select().from(deliverySettings).where(eq(deliverySettings.branchId, branchId)).limit(1)
  const hours = await db.select({ id: branchHours.id }).from(branchHours).where(eq(branchHours.branchId, branchId))
  const areas = await db.select({ id: deliveryAreas.id }).from(deliveryAreas).where(eq(deliveryAreas.branchId, branchId))
  const productCount = await db.execute(sql`
    SELECT count(*)::int AS total
    FROM products
    WHERE branch_id = ${branchId}::uuid AND deleted_at IS NULL AND published = true
  `)
  const total = resultRows<{ total: number }>(productCount)[0]?.total ?? 0
  const zone = await findCoveringZone(branch.latitude, branch.longitude)
  const gaps: string[] = []

  if (!owner?.phoneVerifiedAt) gaps.push('Verifica el teléfono de tu cuenta')
  if (!branch.description.trim()) gaps.push('Agrega una descripción')
  if (hours.length === 0) gaps.push('Define al menos un horario')
  if (!delivery?.dineInEnabled && !delivery?.pickupEnabled && !delivery?.deliveryEnabled) {
    gaps.push('Elige una modalidad de servicio')
  }
  if (delivery?.deliveryEnabled && areas.length === 0) gaps.push('Indica el radio de entrega')
  if (total < 1) gaps.push('Publica al menos un producto del catálogo')
  if (!zone) gaps.push('La sucursal quedó fuera de una zona piloto o activa')
  if (branch.moderationStatus !== 'clear') gaps.push('La sucursal está suspendida')
  return gaps
}

async function loadBranch(branchId: string, ownerView: boolean) {
  const result = await db.execute(sql`
    SELECT b.id, b.name, b.description, b.business_type AS "businessType", b.phone, b.whatsapp,
           b.address_private AS "addressPrivate", b.address_public AS "addressPublic",
           b.expose_public_address AS "exposePublicAddress", b.latitude, b.longitude,
           b.approval_status AS "approvalStatus", b.publication_status AS "publicationStatus",
           b.rejection_reason AS "rejectionReason", b.business_id AS "businessId",
           bu.legal_display_name AS "legalName", p.code AS "planCode"
    FROM branches b
    JOIN businesses bu ON bu.id = b.business_id
    JOIN plans p ON p.id = b.plan_id
    WHERE b.id = ${branchId}::uuid
    LIMIT 1
  `)
  const branch = (result as { rows: Array<Record<string, unknown>> }).rows[0]
  if (!branch) {
    return null
  }

  const hours = await db
    .select({
      weekday: branchHours.weekday,
      opensAt: branchHours.opensAt,
      closesAt: branchHours.closesAt,
    })
    .from(branchHours)
    .where(eq(branchHours.branchId, branchId))
    .orderBy(asc(branchHours.weekday), asc(branchHours.opensAt))

  const amenities = await db
    .select({ code: branchAmenities.amenityCode })
    .from(branchAmenities)
    .where(eq(branchAmenities.branchId, branchId))

  const [delivery] = await db.select().from(deliverySettings).where(eq(deliverySettings.branchId, branchId)).limit(1)
  const areas = await db.select({ radiusM: deliveryAreas.radiusM }).from(deliveryAreas).where(eq(deliveryAreas.branchId, branchId))

  return {
    id: String(branch.id),
    businessId: String(branch.businessId),
    legalName: String(branch.legalName),
    name: String(branch.name),
    description: String(branch.description),
    businessType: String(branch.businessType),
    phone: String(branch.phone),
    whatsapp: branch.whatsapp ? String(branch.whatsapp) : null,
    addressPrivate: ownerView ? String(branch.addressPrivate) : null,
    addressPublic: branch.addressPublic ? String(branch.addressPublic) : null,
    exposePublicAddress: Boolean(branch.exposePublicAddress),
    latitude: Number(branch.latitude),
    longitude: Number(branch.longitude),
    planCode: String(branch.planCode),
    approvalStatus: String(branch.approvalStatus),
    publicationStatus: String(branch.publicationStatus),
    rejectionReason: ownerView && branch.rejectionReason ? String(branch.rejectionReason) : null,
    hours: hours.map((hour) => ({
      weekday: hour.weekday,
      opensAt: hour.opensAt.slice(0, 5),
      closesAt: hour.closesAt.slice(0, 5),
    })),
    amenities: amenities.map((item) => item.code),
    delivery: {
      dineIn: delivery?.dineInEnabled ?? false,
      pickup: delivery?.pickupEnabled ?? false,
      delivery: delivery?.deliveryEnabled ?? false,
      fee: delivery?.fixedFee ?? '0.00',
      minOrder: delivery?.minOrder ?? null,
      radiusM: areas[0]?.radiusM ?? null,
    },
  }
}

async function requireVerifiedUser(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) {
    throw new HttpError(401, 'Inicia sesión')
  }
  if (!user.phoneVerifiedAt) {
    throw new HttpError(403, 'Verifica tu teléfono antes de registrar un negocio')
  }
  return user
}

async function requirePlan(code: PlanCode) {
  const [plan] = await db.select().from(plans).where(and(eq(plans.code, code), eq(plans.active, true))).limit(1)
  if (!plan) {
    throw new HttpError(400, 'El plan no está disponible')
  }
  return plan
}

function addressFields(input: BranchInput) {
  const expose = input.exposePublicAddress && input.businessType !== 'cocina_en_casa' ? true : input.exposePublicAddress
  return {
    expose,
    privateAddress: input.address.trim(),
    publicAddress: expose ? input.address.trim() : null,
  }
}
