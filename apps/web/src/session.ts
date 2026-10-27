import { computed, ref } from 'vue'
import { ApiError, api } from './api'

export type SessionUser = {
  id: string
  email: string
  name: string
  phone: string | null
  phoneVerified: boolean
  roles: Array<{ code: string; scopeType: string; scopeId: string | null }>
}

const currentUser = ref<SessionUser | null | undefined>(undefined)

export function useSession() {
  const isAdmin = computed(
    () =>
      currentUser.value?.roles.some(
        (role) => (role.code === 'admin' || role.code === 'superadmin') && role.scopeType === 'global',
      ) ?? false,
  )

  async function refresh(): Promise<void> {
    try {
      currentUser.value = await api<SessionUser>('/api/v1/auth/me')
    } catch (error) {
      currentUser.value = error instanceof ApiError && error.status === 401 ? null : null
    }
  }

  async function logout(): Promise<void> {
    await api('/api/v1/auth/logout', { method: 'POST' })
    currentUser.value = null
  }

  return { currentUser, isAdmin, refresh, logout }
}
