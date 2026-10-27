import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '../../db/client.js'
import {
  modifierGroups,
  modifierOptions,
  productCategories,
  productModifierGroups,
  productVariants,
  products,
} from '../../db/schema/index.js'
import type { AvailabilityStatus, SelectionType } from '../../domain/offer.js'
import { resultRows } from '../../db/rows.js'
import { HttpError, normalizeMoney } from '../../http/errors.js'
import { requireOwner } from '../access.js'
import { signedMediaPath } from '../media/urls.js'

export async function listCatalog(branchId: string, includeUnpublished: boolean) {
  const categoryRows = await db
    .select()
    .from(productCategories)
    .where(and(eq(productCategories.branchId, branchId), sql`${productCategories.deletedAt} IS NULL`))
    .orderBy(asc(productCategories.sortOrder), asc(productCategories.name))

  const productRows = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.branchId, branchId),
        sql`${products.deletedAt} IS NULL`,
        includeUnpublished ? sql`true` : eq(products.published, true),
      ),
    )
    .orderBy(asc(products.name))

  const productIds = productRows.map((product) => product.id)
  const variants = productIds.length
    ? await db.select().from(productVariants).where(sql`${productVariants.productId} IN ${sqlIdList(productIds)}`)
    : []
  const links = productIds.length
    ? await db
        .select()
        .from(productModifierGroups)
        .where(sql`${productModifierGroups.productId} IN ${sqlIdList(productIds)}`)
    : []
  const groups = await db.select().from(modifierGroups).where(eq(modifierGroups.branchId, branchId)).orderBy(asc(modifierGroups.name))
  const groupIds = groups.map((group) => group.id)
  const options = groupIds.length
    ? await db.select().from(modifierOptions).where(sql`${modifierOptions.groupId} IN ${sqlIdList(groupIds)}`)
    : []
  const photos = await db.execute(sql`
    SELECT pm.product_id AS "productId", ma.id
    FROM product_media pm
    JOIN media_assets ma ON ma.id = pm.asset_id
    WHERE ma.owner_branch_id = ${branchId}::uuid AND ma.kind = 'photo'
  `)
  const photoRows = resultRows<{ productId: string; id: string }>(photos)

  return {
    categories: categoryRows.map((category) => ({
      id: category.id,
      name: category.name,
      sortOrder: category.sortOrder,
    })),
    modifierGroups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      minSelect: group.minSelect,
      maxSelect: group.maxSelect,
      selectionType: group.selectionType,
      options: options
        .filter((option) => option.groupId === group.id && option.active)
        .map((option) => ({
          id: option.id,
          name: option.name,
          priceDelta: option.priceDelta,
          maxQuantity: option.maxQuantity,
        })),
    })),
    products: productRows.map((product) => ({
      id: product.id,
      categoryId: product.categoryId,
      name: product.name,
      description: product.description,
      basePrice: product.basePrice,
      availabilityStatus: product.availabilityStatus,
      published: product.published,
      variants: variants
        .filter((variant) => variant.productId === product.id && variant.active)
        .map((variant) => ({ id: variant.id, name: variant.name, priceDelta: variant.priceDelta })),
      modifierGroupIds: links.filter((link) => link.productId === product.id).map((link) => link.groupId),
      photos: photoRows
        .filter((photo) => photo.productId === product.id)
        .map((photo) => ({ id: photo.id, url: signedMediaPath(photo.id) })),
    })),
  }
}

export async function createCategory(userId: string, branchId: string, name: string, sortOrder: number) {
  await requireOwner(userId, branchId)
  const [category] = await db
    .insert(productCategories)
    .values({ branchId, name: name.trim(), sortOrder })
    .returning()
  if (!category) {
    throw new HttpError(500, 'No se pudo crear la categoría')
  }
  return { id: category.id, name: category.name, sortOrder: category.sortOrder }
}

export async function updateCategory(userId: string, categoryId: string, name: string, sortOrder: number) {
  const category = await requireCategoryOwner(userId, categoryId)
  await db
    .update(productCategories)
    .set({ name: name.trim(), sortOrder })
    .where(eq(productCategories.id, category.id))
}

export async function deleteCategory(userId: string, categoryId: string) {
  const category = await requireCategoryOwner(userId, categoryId)
  const [used] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.categoryId, category.id), sql`${products.deletedAt} IS NULL`))
    .limit(1)
  if (used) {
    throw new HttpError(409, 'La categoría todavía tiene productos')
  }
  await db.update(productCategories).set({ deletedAt: new Date() }).where(eq(productCategories.id, category.id))
}

export async function createProduct(
  userId: string,
  branchId: string,
  input: {
    categoryId: string
    name: string
    description: string
    basePrice: string
    availabilityStatus: AvailabilityStatus
    published: boolean
  },
) {
  await requireOwner(userId, branchId)
  await requireCategoryInBranch(input.categoryId, branchId)
  const [product] = await db
    .insert(products)
    .values({
      branchId,
      categoryId: input.categoryId,
      name: input.name.trim(),
      description: input.description.trim(),
      basePrice: normalizeMoney(input.basePrice),
      availabilityStatus: input.availabilityStatus,
      published: input.published,
      searchText: searchText(input.name, input.description),
    })
    .returning()
  if (!product) {
    throw new HttpError(500, 'No se pudo crear el producto')
  }
  return product.id
}

export async function updateProduct(
  userId: string,
  productId: string,
  input: {
    categoryId: string
    name: string
    description: string
    basePrice: string
    availabilityStatus: AvailabilityStatus
    published: boolean
  },
) {
  const product = await requireProductOwner(userId, productId)
  await requireCategoryInBranch(input.categoryId, product.branchId)
  if (product.published && !input.published) {
    await assertCanHide(product.branchId, product.id)
  }
  await db
    .update(products)
    .set({
      categoryId: input.categoryId,
      name: input.name.trim(),
      description: input.description.trim(),
      basePrice: normalizeMoney(input.basePrice),
      availabilityStatus: input.availabilityStatus,
      published: input.published,
      searchText: searchText(input.name, input.description),
    })
    .where(eq(products.id, product.id))
}

export async function deleteProduct(userId: string, productId: string) {
  const product = await requireProductOwner(userId, productId)
  if (product.published) {
    await assertCanHide(product.branchId, product.id)
  }
  await db.update(products).set({ deletedAt: new Date(), published: false }).where(eq(products.id, product.id))
}

export async function duplicateProduct(userId: string, productId: string) {
  const product = await requireProductOwner(userId, productId)
  const copyId = await db.transaction(async (tx) => {
    const [copy] = await tx
      .insert(products)
      .values({
        branchId: product.branchId,
        categoryId: product.categoryId,
        name: `${product.name} (copia)`,
        description: product.description,
        basePrice: product.basePrice,
        availabilityStatus: product.availabilityStatus,
        published: false,
        searchText: searchText(`${product.name} (copia)`, product.description),
      })
      .returning()
    if (!copy) {
      throw new HttpError(500, 'No se pudo duplicar el producto')
    }
    const variants = await tx.select().from(productVariants).where(eq(productVariants.productId, product.id))
    if (variants.length > 0) {
      await tx.insert(productVariants).values(
        variants.map((variant) => ({
          productId: copy.id,
          name: variant.name,
          priceDelta: variant.priceDelta,
          active: variant.active,
        })),
      )
    }
    const links = await tx.select().from(productModifierGroups).where(eq(productModifierGroups.productId, product.id))
    if (links.length > 0) {
      await tx.insert(productModifierGroups).values(
        links.map((link) => ({ productId: copy.id, groupId: link.groupId, sortOrder: link.sortOrder })),
      )
    }
    return copy.id
  })
  return copyId
}

export async function addVariant(userId: string, productId: string, name: string, priceDelta: string) {
  await requireProductOwner(userId, productId)
  const [variant] = await db
    .insert(productVariants)
    .values({ productId, name: name.trim(), priceDelta: normalizeMoney(priceDelta) })
    .returning()
  return variant?.id
}

export async function deleteVariant(userId: string, variantId: string) {
  const [variant] = await db.select().from(productVariants).where(eq(productVariants.id, variantId)).limit(1)
  if (!variant) {
    throw new HttpError(404, 'No encontramos esa variante')
  }
  await requireProductOwner(userId, variant.productId)
  await db.delete(productVariants).where(eq(productVariants.id, variantId))
}

export async function createModifierGroup(
  userId: string,
  branchId: string,
  input: { name: string; minSelect: number; maxSelect: number; selectionType: SelectionType },
) {
  await requireOwner(userId, branchId)
  if (input.selectionType === 'single' && input.maxSelect !== 1) {
    throw new HttpError(400, 'Una elección única solo puede tener un máximo de 1')
  }
  const [group] = await db
    .insert(modifierGroups)
    .values({
      branchId,
      name: input.name.trim(),
      minSelect: input.minSelect,
      maxSelect: input.maxSelect,
      selectionType: input.selectionType,
    })
    .returning()
  return group?.id
}

export async function addModifierOption(userId: string, groupId: string, name: string, priceDelta: string, maxQuantity: number) {
  const [group] = await db.select().from(modifierGroups).where(eq(modifierGroups.id, groupId)).limit(1)
  if (!group) {
    throw new HttpError(404, 'No encontramos ese grupo')
  }
  await requireOwner(userId, group.branchId)
  const [option] = await db
    .insert(modifierOptions)
    .values({
      groupId,
      name: name.trim(),
      priceDelta: normalizeMoney(priceDelta),
      maxQuantity,
    })
    .returning()
  return option?.id
}

export async function setProductModifiers(userId: string, productId: string, groupIds: string[]) {
  const product = await requireProductOwner(userId, productId)
  const unique = [...new Set(groupIds)]
  if (unique.length > 0) {
    const groups = await db
      .select({ id: modifierGroups.id })
      .from(modifierGroups)
      .where(and(eq(modifierGroups.branchId, product.branchId), sql`${modifierGroups.id} IN ${sqlIdList(unique)}`))
    if (groups.length !== unique.length) {
      throw new HttpError(422, 'Hay un grupo de opciones que no pertenece a la sucursal')
    }
  }
  await db.transaction(async (tx) => {
    await tx.delete(productModifierGroups).where(eq(productModifierGroups.productId, product.id))
    if (unique.length > 0) {
      await tx.insert(productModifierGroups).values(
        unique.map((groupId, index) => ({ productId: product.id, groupId, sortOrder: index })),
      )
    }
  })
}

function searchText(name: string, description: string) {
  return `${name} ${description}`.trim().toLowerCase()
}

function sqlIdList(ids: string[]) {
  return sql`(${sql.join(
    ids.map((id) => sql`${id}::uuid`),
    sql`, `,
  )})`
}

async function requireCategoryOwner(userId: string, categoryId: string) {
  const [category] = await db
    .select()
    .from(productCategories)
    .where(and(eq(productCategories.id, categoryId), sql`${productCategories.deletedAt} IS NULL`))
    .limit(1)
  if (!category) {
    throw new HttpError(404, 'No encontramos esa categoría')
  }
  await requireOwner(userId, category.branchId)
  return category
}

async function requireCategoryInBranch(categoryId: string, branchId: string) {
  const [category] = await db
    .select()
    .from(productCategories)
    .where(
      and(
        eq(productCategories.id, categoryId),
        eq(productCategories.branchId, branchId),
        sql`${productCategories.deletedAt} IS NULL`,
      ),
    )
    .limit(1)
  if (!category) {
    throw new HttpError(422, 'La categoría no pertenece a la sucursal')
  }
}

async function requireProductOwner(userId: string, productId: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), sql`${products.deletedAt} IS NULL`))
    .limit(1)
  if (!product) {
    throw new HttpError(404, 'No encontramos ese producto')
  }
  await requireOwner(userId, product.branchId)
  return product
}

async function assertCanHide(branchId: string, productId: string) {
  const result = await db.execute(sql`
    SELECT b.publication_status AS status, count(p.id)::int AS total
    FROM branches b
    LEFT JOIN products p ON p.branch_id = b.id AND p.deleted_at IS NULL AND p.published = true AND p.id <> ${productId}::uuid
    WHERE b.id = ${branchId}::uuid
    GROUP BY b.publication_status
  `)
  const row = resultRows<{ status: string; total: number }>(result)[0]
  if (row?.status === 'published' && row.total < 1) {
    throw new HttpError(409, 'La sucursal publicada necesita al menos un producto visible')
  }
}
