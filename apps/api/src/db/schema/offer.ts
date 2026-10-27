import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import {
  ACCEPTING_ORDERS,
  AMENITY_CODES,
  APPROVAL_STATUSES,
  AVAILABILITY_STATUSES,
  BUSINESS_TYPES,
  MEDIA_KINDS,
  MODERATION_STATUSES,
  PLAN_CODES,
  PUBLICATION_STATUSES,
  SCAN_STATUSES,
  SELECTION_TYPES,
  WAITLIST_CONTACT_TYPES,
  ZONE_STATUSES,
} from '../../domain/offer.js'
import { users } from './identity.js'

const multiPolygon = customType<{ data: string }>({
  dataType() {
    return 'geometry(MultiPolygon,4326)'
  },
})

function sqlList(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '))
}

function createdAt() {
  return timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}

function updatedAt() {
  return timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}

export const plans = pgTable(
  'plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    priceMonthly: numeric('price_monthly', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('MXN'),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('plans_code_unique').on(table.code),
    check('plans_code_check', sql`${table.code} IN (${sqlList(PLAN_CODES)})`),
    check('plans_currency_mxn', sql`${table.currency} = 'MXN'`),
    check('plans_price_nonnegative', sql`${table.priceMonthly} >= 0`),
    check('plans_name_present', sql`char_length(btrim(${table.name})) > 0`),
  ],
)

export const planEntitlements = pgTable(
  'plan_entitlements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'cascade' }),
    featureCode: text('feature_code').notNull(),
    limitValue: integer('limit_value').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('plan_entitlements_feature_unique').on(table.planId, table.featureCode),
    check('plan_entitlements_limit_nonnegative', sql`${table.limitValue} >= 0`),
    check('plan_entitlements_feature_present', sql`char_length(btrim(${table.featureCode})) > 0`),
  ],
)

export const businesses = pgTable(
  'businesses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    legalDisplayName: text('legal_display_name').notNull(),
    description: text('description').notNull().default(''),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('businesses_owner_user_id_idx').on(table.ownerUserId),
    check('businesses_name_present', sql`char_length(btrim(${table.legalDisplayName})) > 0`),
  ],
)

export const branches = pgTable(
  'branches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    businessType: text('business_type').notNull(),
    phone: text('phone').notNull(),
    whatsapp: text('whatsapp'),
    addressPrivate: text('address_private').notNull(),
    addressPublic: text('address_public'),
    exposePublicAddress: boolean('expose_public_address').notNull().default(false),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    approvalStatus: text('approval_status').notNull().default('draft'),
    publicationStatus: text('publication_status').notNull().default('unpublished'),
    moderationStatus: text('moderation_status').notNull().default('clear'),
    acceptingOrders: text('accepting_orders').notNull().default('inquiries_only'),
    rejectionReason: text('rejection_reason'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('branches_business_id_idx').on(table.businessId),
    index('branches_plan_id_idx').on(table.planId),
    index('branches_publication_idx').on(table.approvalStatus, table.publicationStatus),
    check('branches_name_present', sql`char_length(btrim(${table.name})) > 0`),
    check('branches_type_check', sql`${table.businessType} IN (${sqlList(BUSINESS_TYPES)})`),
    check('branches_phone_e164', sql`${table.phone} ~ '^\\+[1-9][0-9]{7,14}$'`),
    check(
      'branches_whatsapp_e164',
      sql`${table.whatsapp} IS NULL OR ${table.whatsapp} ~ '^\\+[1-9][0-9]{7,14}$'`,
    ),
    check('branches_latitude_range', sql`${table.latitude} BETWEEN -90 AND 90`),
    check('branches_longitude_range', sql`${table.longitude} BETWEEN -180 AND 180`),
    check('branches_approval_check', sql`${table.approvalStatus} IN (${sqlList(APPROVAL_STATUSES)})`),
    check(
      'branches_publication_check',
      sql`${table.publicationStatus} IN (${sqlList(PUBLICATION_STATUSES)})`,
    ),
    check(
      'branches_moderation_check',
      sql`${table.moderationStatus} IN (${sqlList(MODERATION_STATUSES)})`,
    ),
    check(
      'branches_accepting_orders_check',
      sql`${table.acceptingOrders} IN (${sqlList(ACCEPTING_ORDERS)})`,
    ),
    check(
      'branches_public_address_consistency',
      sql`(${table.exposePublicAddress} = false AND ${table.addressPublic} IS NULL) OR (${table.exposePublicAddress} = true AND ${table.addressPublic} IS NOT NULL)`,
    ),
    check(
      'branches_published_requires_approval',
      sql`${table.publicationStatus} = 'unpublished' OR ${table.approvalStatus} = 'approved'`,
    ),
  ],
)

export const branchMembers = pgTable(
  'branch_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('owner'),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('branch_members_pair_unique').on(table.branchId, table.userId),
    check('branch_members_role_owner', sql`${table.role} = 'owner'`),
  ],
)

export const branchHours = pgTable(
  'branch_hours',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    weekday: integer('weekday').notNull(),
    opensAt: time('opens_at').notNull(),
    closesAt: time('closes_at').notNull(),
    serviceType: text('service_type'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('branch_hours_branch_id_idx').on(table.branchId),
    check('branch_hours_weekday_check', sql`${table.weekday} BETWEEN 1 AND 7`),
    check('branch_hours_nonzero', sql`${table.opensAt} <> ${table.closesAt}`),
  ],
)

export const branchAmenities = pgTable(
  'branch_amenities',
  {
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    amenityCode: text('amenity_code').notNull(),
  },
  (table) => [
    uniqueIndex('branch_amenities_pair_unique').on(table.branchId, table.amenityCode),
    check('branch_amenities_code_check', sql`${table.amenityCode} IN (${sqlList(AMENITY_CODES)})`),
  ],
)

export const coverageZones = pgTable(
  'coverage_zones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    status: text('status').notNull(),
    geom: multiPolygon('geom').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('coverage_zones_name_unique').on(table.name),
    check('coverage_zones_status_check', sql`${table.status} IN (${sqlList(ZONE_STATUSES)})`),
    check('coverage_zones_name_present', sql`char_length(btrim(${table.name})) > 0`),
  ],
)

export const coverageWaitlist = pgTable(
  'coverage_waitlist',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contactType: text('contact_type').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    zoneId: uuid('zone_id').references(() => coverageZones.id, { onDelete: 'set null' }),
    consentAt: timestamp('consent_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('coverage_waitlist_email_idx').on(table.email),
    check(
      'coverage_waitlist_contact_check',
      sql`${table.contactType} IN (${sqlList(WAITLIST_CONTACT_TYPES)})`,
    ),
    check('coverage_waitlist_email_normalized', sql`${table.email} = lower(${table.email})`),
    check('coverage_waitlist_latitude_range', sql`${table.latitude} BETWEEN -90 AND 90`),
    check('coverage_waitlist_longitude_range', sql`${table.longitude} BETWEEN -180 AND 180`),
    check(
      'coverage_waitlist_phone_e164',
      sql`${table.phone} IS NULL OR ${table.phone} ~ '^\\+[1-9][0-9]{7,14}$'`,
    ),
  ],
)

export const deliverySettings = pgTable(
  'delivery_settings',
  {
    branchId: uuid('branch_id')
      .primaryKey()
      .references(() => branches.id, { onDelete: 'cascade' }),
    deliveryEnabled: boolean('delivery_enabled').notNull().default(false),
    pickupEnabled: boolean('pickup_enabled').notNull().default(false),
    dineInEnabled: boolean('dine_in_enabled').notNull().default(false),
    fixedFee: numeric('fixed_fee', { precision: 12, scale: 2 }).notNull().default('0'),
    minOrder: numeric('min_order', { precision: 12, scale: 2 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check('delivery_settings_fee_nonnegative', sql`${table.fixedFee} >= 0`),
    check('delivery_settings_min_order_nonnegative', sql`${table.minOrder} IS NULL OR ${table.minOrder} >= 0`),
    check(
      'delivery_settings_has_channel',
      sql`${table.deliveryEnabled} OR ${table.pickupEnabled} OR ${table.dineInEnabled}`,
    ),
  ],
)

export const deliveryAreas = pgTable(
  'delivery_areas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    radiusM: integer('radius_m').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('delivery_areas_branch_id_idx').on(table.branchId),
    check('delivery_areas_radius_positive', sql`${table.radiusM} > 0`),
  ],
)

export const productCategories = pgTable(
  'product_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('product_categories_branch_id_idx').on(table.branchId),
    check('product_categories_name_present', sql`char_length(btrim(${table.name})) > 0`),
  ],
)

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => productCategories.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    basePrice: numeric('base_price', { precision: 12, scale: 2 }).notNull(),
    availabilityStatus: text('availability_status').notNull().default('available'),
    published: boolean('published').notNull().default(false),
    searchText: text('search_text').notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('products_branch_id_idx').on(table.branchId),
    index('products_category_id_idx').on(table.categoryId),
    check('products_name_present', sql`char_length(btrim(${table.name})) > 0`),
    check('products_price_nonnegative', sql`${table.basePrice} >= 0`),
    check(
      'products_availability_check',
      sql`${table.availabilityStatus} IN (${sqlList(AVAILABILITY_STATUSES)})`,
    ),
  ],
)

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    priceDelta: numeric('price_delta', { precision: 12, scale: 2 }).notNull().default('0'),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('product_variants_product_id_idx').on(table.productId),
    check('product_variants_name_present', sql`char_length(btrim(${table.name})) > 0`),
    check('product_variants_delta_nonnegative', sql`${table.priceDelta} >= 0`),
  ],
)

export const modifierGroups = pgTable(
  'modifier_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    minSelect: integer('min_select').notNull().default(0),
    maxSelect: integer('max_select').notNull(),
    selectionType: text('selection_type').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('modifier_groups_branch_id_idx').on(table.branchId),
    check('modifier_groups_name_present', sql`char_length(btrim(${table.name})) > 0`),
    check('modifier_groups_min_nonnegative', sql`${table.minSelect} >= 0`),
    check('modifier_groups_max_gte_min', sql`${table.maxSelect} >= ${table.minSelect}`),
    check(
      'modifier_groups_selection_check',
      sql`${table.selectionType} IN (${sqlList(SELECTION_TYPES)})`,
    ),
    check(
      'modifier_groups_single_max',
      sql`${table.selectionType} <> 'single' OR ${table.maxSelect} = 1`,
    ),
  ],
)

export const modifierOptions = pgTable(
  'modifier_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => modifierGroups.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    priceDelta: numeric('price_delta', { precision: 12, scale: 2 }).notNull().default('0'),
    active: boolean('active').notNull().default(true),
    maxQuantity: integer('max_quantity').notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('modifier_options_group_id_idx').on(table.groupId),
    check('modifier_options_name_present', sql`char_length(btrim(${table.name})) > 0`),
    check('modifier_options_delta_nonnegative', sql`${table.priceDelta} >= 0`),
    check('modifier_options_quantity_positive', sql`${table.maxQuantity} > 0`),
  ],
)

export const productModifierGroups = pgTable(
  'product_modifier_groups',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id')
      .notNull()
      .references(() => modifierGroups.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [uniqueIndex('product_modifier_groups_pair_unique').on(table.productId, table.groupId)],
)

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerBranchId: uuid('owner_branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    objectKey: text('object_key').notNull(),
    mimeType: text('mime_type').notNull(),
    bytes: integer('bytes').notNull(),
    scanStatus: text('scan_status').notNull().default('not_scanned'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('media_assets_object_key_unique').on(table.objectKey),
    index('media_assets_branch_kind_idx').on(table.ownerBranchId, table.kind),
    check('media_assets_kind_check', sql`${table.kind} IN (${sqlList(MEDIA_KINDS)})`),
    check('media_assets_bytes_positive', sql`${table.bytes} > 0`),
    check('media_assets_scan_check', sql`${table.scanStatus} IN (${sqlList(SCAN_STATUSES)})`),
  ],
)

export const productMedia = pgTable(
  'product_media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [
    uniqueIndex('product_media_asset_unique').on(table.assetId),
    index('product_media_product_id_idx').on(table.productId),
  ],
)

export const visualMenus = pgTable(
  'visual_menus',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    pageCount: integer('page_count'),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('visual_menus_asset_unique').on(table.assetId),
    index('visual_menus_branch_id_idx').on(table.branchId),
    check('visual_menus_page_count_positive', sql`${table.pageCount} IS NULL OR ${table.pageCount} > 0`),
  ],
)

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    beforeJson: jsonb('before_json').$type<Record<string, unknown> | null>(),
    afterJson: jsonb('after_json').$type<Record<string, unknown> | null>(),
    createdAt: createdAt(),
  },
  (table) => [
    index('audit_logs_entity_idx').on(table.entityType, table.entityId),
    check('audit_logs_action_present', sql`char_length(btrim(${table.action})) > 0`),
  ],
)
