import { relations, sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { AUTH_PROVIDERS, ROLE_CODES, ROLE_SCOPE_TYPES, USER_STATUSES } from '../../domain/identity.js'

function sqlList(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '))
}

function createdAt() {
  return timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}

function updatedAt() {
  return timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    passwordHash: text('password_hash'),
    name: text('name').notNull(),
    phone: text('phone'),
    phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
    status: text('status').notNull().default('active'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('users_email_unique').on(table.email),
    check('users_email_normalized', sql`${table.email} = lower(${table.email})`),
    check(
      'users_email_shape',
      sql`char_length(${table.email}) BETWEEN 3 AND 320 AND position('@' in ${table.email}) > 1`,
    ),
    check('users_name_present', sql`char_length(btrim(${table.name})) > 0`),
    check('users_status_check', sql`${table.status} IN (${sqlList(USER_STATUSES)})`),
    check(
      'users_password_hash_present',
      sql`${table.passwordHash} IS NULL OR char_length(${table.passwordHash}) > 0`,
    ),
    check(
      'users_phone_e164',
      sql`${table.phone} IS NULL OR ${table.phone} ~ '^\\+[1-9][0-9]{7,14}$'`,
    ),
  ],
)

export const authIdentities = pgTable(
  'auth_identities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerSubject: text('provider_subject').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('auth_identities_provider_subject_unique').on(table.provider, table.providerSubject),
    index('auth_identities_user_id_idx').on(table.userId),
    check('auth_identities_provider_check', sql`${table.provider} IN (${sqlList(AUTH_PROVIDERS)})`),
    check(
      'auth_identities_subject_present',
      sql`char_length(btrim(${table.providerSubject})) > 0`,
    ),
  ],
)

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('roles_code_unique').on(table.code),
    check('roles_code_check', sql`${table.code} IN (${sqlList(ROLE_CODES)})`),
  ],
)

export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    scopeType: text('scope_type').notNull(),
    // Apunta a una sucursal. La llave foránea se agrega cuando exista la tabla branches.
    scopeId: uuid('scope_id'),
    createdAt: createdAt(),
  },
  (table) => [
    index('user_roles_user_id_idx').on(table.userId),
    index('user_roles_scope_idx').on(table.scopeType, table.scopeId),
    check('user_roles_scope_type_check', sql`${table.scopeType} IN (${sqlList(ROLE_SCOPE_TYPES)})`),
    check(
      'user_roles_scope_consistency',
      sql`(${table.scopeType} = 'global' AND ${table.scopeId} IS NULL) OR (${table.scopeType} = 'branch' AND ${table.scopeId} IS NOT NULL)`,
    ),
    uniqueIndex('user_roles_global_unique')
      .on(table.userId, table.roleId)
      .where(sql`${table.scopeType} = 'global'`),
    uniqueIndex('user_roles_branch_unique')
      .on(table.userId, table.roleId, table.scopeId)
      .where(sql`${table.scopeType} = 'branch'`),
  ],
)

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('sessions_refresh_token_hash_unique').on(table.refreshTokenHash),
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
    check('sessions_refresh_token_present', sql`char_length(${table.refreshTokenHash}) > 0`),
    check('sessions_expiry_after_create', sql`${table.expiresAt} > ${table.createdAt}`),
  ],
)

export const phoneVerifications = pgTable(
  'phone_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    phone: text('phone').notNull(),
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('phone_verifications_user_id_idx').on(table.userId),
    check('phone_verifications_attempts_nonnegative', sql`${table.attempts} >= 0`),
    check('phone_verifications_code_present', sql`char_length(${table.codeHash}) > 0`),
    check('phone_verifications_phone_e164', sql`${table.phone} ~ '^\\+[1-9][0-9]{7,14}$'`),
  ],
)

export const usersRelations = relations(users, ({ many }) => ({
  identities: many(authIdentities),
  roleAssignments: many(userRoles),
  sessions: many(sessions),
  phoneVerifications: many(phoneVerifications),
}))

export const authIdentitiesRelations = relations(authIdentities, ({ one }) => ({
  user: one(users, {
    fields: [authIdentities.userId],
    references: [users.id],
  }),
}))

export const rolesRelations = relations(roles, ({ many }) => ({
  assignments: many(userRoles),
}))

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const phoneVerificationsRelations = relations(phoneVerifications, ({ one }) => ({
  user: one(users, {
    fields: [phoneVerifications.userId],
    references: [users.id],
  }),
}))
