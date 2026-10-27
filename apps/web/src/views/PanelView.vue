<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, errorText } from '../api'
import { approvalLabel, businessTypeLabel, publicationLabel } from '../labels'
import { useSession } from '../session'
import type { BranchSummary } from '../types'

const { currentUser } = useSession()
const branches = ref<BranchSummary[]>([])
const error = ref('')

async function load(): Promise<void> {
  try {
    branches.value = await api<BranchSummary[]>('/api/v1/me/branches')
  } catch (caught) {
    error.value = errorText(caught)
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <main class="page">
    <p class="eyebrow">Mi negocio</p>
    <h1>Sucursales</h1>
    <p v-if="currentUser && !currentUser.phoneVerified" class="notice">
      Falta verificar tu teléfono.
      <router-link to="/verificar-telefono">Verificar ahora</router-link>
    </p>
    <p class="actions">
      <router-link class="button" to="/panel/sucursales/nueva">Nueva sucursal</router-link>
    </p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-else-if="branches.length === 0" class="hint">Todavía no registras una sucursal.</p>
    <ul v-else class="stack">
      <li v-for="branch in branches" :key="branch.id" class="card">
        <h2>{{ branch.name }}</h2>
        <p>{{ businessTypeLabel(branch.businessType) }} · {{ approvalLabel(branch.approvalStatus) }} · {{ publicationLabel(branch.publicationStatus) }}</p>
        <router-link :to="`/panel/sucursales/${branch.id}`">Editar</router-link>
        <router-link v-if="branch.publicationStatus === 'published'" :to="`/sucursales/${branch.id}`">Ver página pública</router-link>
      </li>
    </ul>
  </main>
</template>
