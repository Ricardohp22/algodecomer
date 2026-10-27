<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, errorText } from '../api'
import { useSession } from '../session'

type PendingBranch = {
  id: string
  name: string
  submittedAt: string | null
  legalName: string
  planCode: string
  ownerEmail: string
}

const { isAdmin } = useSession()
const branches = ref<PendingBranch[]>([])
const reasons = ref<Record<string, string>>({})
const error = ref('')
const pending = ref(false)

async function load(): Promise<void> {
  branches.value = await api<PendingBranch[]>('/api/v1/admin/branches')
}

async function approve(id: string): Promise<void> {
  error.value = ''
  pending.value = true
  try {
    await api(`/api/v1/admin/branches/${id}/approve`, { method: 'POST' })
    await load()
  } catch (caught) {
    error.value = errorText(caught)
  } finally {
    pending.value = false
  }
}

async function reject(id: string): Promise<void> {
  error.value = ''
  pending.value = true
  try {
    await api(`/api/v1/admin/branches/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: reasons.value[id] ?? '' }),
    })
    await load()
  } catch (caught) {
    error.value = errorText(caught)
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  if (!isAdmin.value) {
    return
  }
  void load().catch((caught: unknown) => {
    error.value = errorText(caught)
  })
})
</script>

<template>
  <main class="page">
    <h1>Revisiones</h1>
    <p v-if="!isAdmin" class="error">Esta sección es solo para administración.</p>
    <template v-else>
      <p v-if="branches.length === 0" class="hint">No hay sucursales esperando revisión.</p>
      <ul v-else class="stack">
        <li v-for="branch in branches" :key="branch.id" class="card">
          <h2>{{ branch.name }}</h2>
          <p>{{ branch.legalName }} · {{ branch.ownerEmail }} · plan {{ branch.planCode }}</p>
          <div class="actions">
            <button type="button" :disabled="pending" @click="approve(branch.id)">Aprobar y publicar</button>
          </div>
          <label>
            Motivo de rechazo
            <input v-model="reasons[branch.id]" type="text" maxlength="500" />
          </label>
          <button type="button" class="danger" :disabled="pending" @click="reject(branch.id)">Rechazar</button>
        </li>
      </ul>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </template>
  </main>
</template>
