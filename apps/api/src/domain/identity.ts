export const ROLE_CODES = ['admin', 'customer', 'operator', 'owner', 'superadmin'] as const

export type RoleCode = (typeof ROLE_CODES)[number]

export const AUTH_PROVIDERS = ['password', 'google'] as const

export type AuthProvider = (typeof AUTH_PROVIDERS)[number]

export const USER_STATUSES = ['active', 'disabled'] as const

export type UserStatus = (typeof USER_STATUSES)[number]

export const ROLE_SCOPE_TYPES = ['global', 'branch'] as const

export type RoleScopeType = (typeof ROLE_SCOPE_TYPES)[number]
