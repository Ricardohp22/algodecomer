<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { api, errorText } from '../api'
import { zoneStatusLabel, zoneStatuses } from '../labels'
import { useSession } from '../session'

type Zone = { id: string; name: string; status: string }
type WaitEntry = { id: string; email: string; phone: string | null; latitude: number; longitude: number }

const { isAdmin } = useSession()
const zones = ref<Zone[]>([])
const waitlist = ref<WaitEntry[]>([])
const error = ref('')
const pending = ref(false)
const form = reactive({
  name: '',
  status: 'pilot',
  south: '19.35',
  west: '-99.20',
  north: '19.50',
  east: '-99.05',
})

async function load(): Promise<void> {
  const [zoneRows, waiting] = await Promise.all([
    api<Zone[]>('/api/v1/admin/coverage-zones'),
    api<WaitEntry[]>('/api/v1/admin/waitlist'),
  ])
  zones.value = zoneRows
  waitlist.value = waiting
}

async function createZone(): Promise<void> {
  error.value = ''
  pending.value = true
  try {
    await api('/api/v1/admin/coverage-zones', {
      method: 'POST',
      body: JSON.stringify({
        name: form.name,
        status: form.status,
        south: Number(form.south),
        west: Number(form.west),
        north: Number(form.north),
        east: Number(form.east),
      }),
    })
    form.name = ''
    await load()
  } catch (caught) {
    error.value = errorText(caught)
  } finally {
    pending.value = false
  }
}

function onStatus(event: Event, zone: Zone): void {
  const select = event.target
  if (select instanceof HTMLSelectElement) {
    void changeStatus(zone, select.value)
  }
}

async function changeStatus(zone: Zone, status: string): Promise<void> {
  error.value = ''
  try {
    await api(`/api/v1/admin/coverage-zones/${zone.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    await load()
  } catch (caught) {
    error.value = errorText(caught)
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
  <main class="page wide">
    <h1>Zonas de cobertura</h1>
    <p v-if="!isAdmin" class="error">Esta sección es solo para administración.</p>
    <template v-else>
      <p class="lead">Una sucursal solo se crea si el punto cae en una zona piloto o activa. La zona de demostración cubre el Centro de la Ciudad de México.</p>
      <form class="form card" @submit.prevent="createZone">
        <label>
          Nombre
          <input v-model="form.name" required maxlength="120" />
        </label>
        <label>
          Estado
          <select v-model="form.status">
            <option v-for="status in zoneStatuses" :key="status.value" :value="status.value">{{ status.label }}</option>
          </select>
        </label>
        <div class="split">
          <label>Latitud sur<input v-model="form.south" inputmode="decimal" required /></label>
          <label>Longitud oeste<input v-model="form.west" inputmode="decimal" required /></label>
          <label>Latitud norte<input v-model="form.north" inputmode="decimal" required /></label>
          <label>Longitud este<input v-model="form.east" inputmode="decimal" required /></label>
        </div>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <button type="submit" :disabled="pending">Crear zona</button>
      </form>

      <ul class="stack">
        <li v-for="zone in zones" :key="zone.id" class="card">
          <h2>{{ zone.name }}</h2>
          <p>{{ zoneStatusLabel(zone.status) }}</p>
          <label>
            Cambiar estado
            <select :value="zone.status" @change="onStatus($event, zone)">
              <option v-for="status in zoneStatuses" :key="status.value" :value="status.value">{{ status.label }}</option>
            </select>
          </label>
        </li>
      </ul>

      <section>
        <h2>Lista de espera</h2>
        <p v-if="waitlist.length === 0" class="hint">Nadie está esperando cobertura.</p>
        <ul v-else class="stack">
          <li v-for="entry in waitlist" :key="entry.id" class="card">
            <p>{{ entry.email }}</p>
            <p>{{ entry.phone }} · {{ entry.latitude }}, {{ entry.longitude }}</p>
          </li>
        </ul>
      </section>
    </template>
  </main>
</template>
