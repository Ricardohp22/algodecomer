import { randomUUID } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { mediaAssets, productMedia, visualMenus } from '../../db/schema/index.js'
import { resultRows } from '../../db/rows.js'
import { HttpError } from '../../http/errors.js'
import { requireOwner } from '../access.js'
import { deleteObject, putObject, readObject } from './storage.js'
import { signedMediaPath } from './urls.js'

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function detectMime(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf' | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png'
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp'
  }
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return 'application/pdf'
  }
  return null
}

export async function saveProductPhoto(userId: string, productId: string, buffer: Buffer) {
  const result = await db.execute(sql`
    SELECT branch_id AS "branchId"
    FROM products
    WHERE id = ${productId}::uuid AND deleted_at IS NULL
    LIMIT 1
  `)
  const branchId = resultRows<{ branchId: string }>(result)[0]?.branchId
  if (!branchId) {
    throw new HttpError(404, 'No encontramos ese producto')
  }
  return savePhoto(userId, branchId, productId, buffer)
}

export async function savePhoto(userId: string, branchId: string, productId: string | null, buffer: Buffer) {
  await requireOwner(userId, branchId)
  const mime = detectMime(buffer)
  if (!mime || !IMAGE_TYPES.has(mime)) {
    throw new HttpError(400, 'La fotografía debe ser JPG, PNG o WebP')
  }
  if (productId) {
    await assertProductInBranch(productId, branchId)
  }

  await assertWithinLimit(branchId, 'photo', 'max_photos', 'fotografías')
  await assertSize(branchId, buffer.length)
  const asset = await storeAsset(branchId, 'photo', mime, buffer)
  if (productId) {
    await db.insert(productMedia).values({ productId, assetId: asset.id, sortOrder: 0 })
  }
  return { id: asset.id, url: signedMediaPath(asset.id) }
}

export async function saveVisualMenu(userId: string, branchId: string, buffer: Buffer) {
  await requireOwner(userId, branchId)
  const mime = detectMime(buffer)
  if (!mime) {
    throw new HttpError(400, 'El menú visual debe ser PDF, JPG, PNG o WebP')
  }
  await assertWithinLimit(branchId, 'visual_menu', 'max_visual_menus', 'menús visuales')
  await assertSize(branchId, buffer.length)
  const asset = await storeAsset(branchId, 'visual_menu', mime, buffer)
  const [menu] = await db
    .insert(visualMenus)
    .values({ branchId, assetId: asset.id, active: true })
    .returning({ id: visualMenus.id })
  return { id: menu?.id, assetId: asset.id, url: signedMediaPath(asset.id), mimeType: mime }
}

export async function deleteAsset(userId: string, assetId: string) {
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, assetId)).limit(1)
  if (!asset) {
    throw new HttpError(404, 'No encontramos el archivo')
  }
  await requireOwner(userId, asset.ownerBranchId)
  await db.delete(mediaAssets).where(eq(mediaAssets.id, assetId))
  await deleteObject(asset.objectKey)
}

export async function listBranchFiles(branchId: string) {
  const gallery = await db.execute(sql`
    SELECT ma.id
    FROM media_assets ma
    WHERE ma.owner_branch_id = ${branchId}::uuid
      AND ma.kind = 'photo'
      AND NOT EXISTS (SELECT 1 FROM product_media pm WHERE pm.asset_id = ma.id)
    ORDER BY ma.created_at
  `)
  const menus = await db.execute(sql`
    SELECT vm.id, ma.id AS "assetId", ma.mime_type AS "mimeType"
    FROM visual_menus vm
    JOIN media_assets ma ON ma.id = vm.asset_id
    WHERE vm.branch_id = ${branchId}::uuid AND vm.active = true
    ORDER BY vm.created_at
  `)
  const photoRows = resultRows<{ id: string }>(gallery)
  const menuRows = resultRows<{ id: string; assetId: string; mimeType: string }>(menus)
  return {
    photos: photoRows.map((photo) => ({ id: photo.id, url: signedMediaPath(photo.id) })),
    visualMenus: menuRows.map((menu) => ({
      id: menu.id,
      assetId: menu.assetId,
      mimeType: menu.mimeType,
      url: signedMediaPath(menu.assetId),
    })),
  }
}

export async function readPublicAsset(assetId: string) {
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, assetId)).limit(1)
  if (!asset || asset.scanStatus === 'rejected') {
    throw new HttpError(404, 'No encontramos el archivo')
  }
  const body = await readObject(asset.objectKey)
  if (!body) {
    throw new HttpError(404, 'No encontramos el archivo')
  }
  return { mimeType: asset.mimeType, body }
}

async function storeAsset(
  branchId: string,
  kind: 'photo' | 'visual_menu',
  mime: string,
  buffer: Buffer,
) {
  const objectKey = `branches/${branchId}/${randomUUID()}`
  await putObject(objectKey, buffer)
  const [asset] = await db
    .insert(mediaAssets)
    .values({
      ownerBranchId: branchId,
      kind,
      objectKey,
      mimeType: mime,
      bytes: buffer.length,
      scanStatus: 'not_scanned',
    })
    .returning()
  if (!asset) {
    throw new HttpError(500, 'No se pudo guardar el archivo')
  }
  return asset
}

async function assertWithinLimit(branchId: string, kind: 'photo' | 'visual_menu', feature: string, label: string) {
  const limit = await entitlement(branchId, feature)
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.ownerBranchId, branchId), eq(mediaAssets.kind, kind)))
  if ((row?.total ?? 0) >= limit) {
    throw new HttpError(422, `Tu plan permite hasta ${limit} ${label}`)
  }
}

async function assertSize(branchId: string, bytes: number) {
  const megabytes = await entitlement(branchId, 'max_upload_mb')
  if (bytes > megabytes * 1024 * 1024) {
    throw new HttpError(413, `El archivo supera el máximo de ${megabytes} MB de tu plan`)
  }
}

async function entitlement(branchId: string, feature: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT pe.limit_value AS limit_value
    FROM branches b
    JOIN plan_entitlements pe ON pe.plan_id = b.plan_id
    WHERE b.id = ${branchId}::uuid AND pe.feature_code = ${feature}
    LIMIT 1
  `)
  const limit = Number(resultRows<{ limit_value: number }>(result)[0]?.limit_value)
  if (!Number.isFinite(limit)) {
    throw new HttpError(500, 'El plan no tiene ese límite configurado')
  }
  return limit
}

async function assertProductInBranch(productId: string, branchId: string) {
  const result = await db.execute(sql`
    SELECT id FROM products
    WHERE id = ${productId}::uuid AND branch_id = ${branchId}::uuid AND deleted_at IS NULL
    LIMIT 1
  `)
  const rows = (result as { rows?: unknown[] }).rows
  if (!rows?.[0]) {
    throw new HttpError(404, 'No encontramos ese producto')
  }
}
