import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../db/client.js'
import { branchMembers, roles, userRoles } from '../db/schema/index.js'
import { HttpError } from '../http/errors.js'
import type { AuthContext } from './auth/service.js'

export function requireUser(auth: AuthContext | null): AuthContext {
  if (!auth) {
    throw new HttpError(401, 'Inicia sesión')
  }
  return auth
}

export async function requireOwner(userId: string, branchId: string) {
  const [member] = await db
    .select({ id: branchMembers.id })
    .from(branchMembers)
    .where(
      and(
        eq(branchMembers.branchId, branchId),
        eq(branchMembers.userId, userId),
        eq(branchMembers.active, true),
      ),
    )
    .limit(1)

  if (!member) {
    throw new HttpError(404, 'No encontramos esa sucursal')
  }
}

export async function requireAdmin(userId: string) {
  const rows = await db
    .select({ code: roles.code })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.scopeType, 'global'),
        inArray(roles.code, ['admin', 'superadmin']),
      ),
    )
    .limit(1)

  if (!rows[0]) {
    throw new HttpError(403, 'No tienes permiso de administrador')
  }
}
