<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSession } from '../session'

type HealthState = { kind: 'loading' } | { kind: 'down'; message: string } | { kind: 'ok'; postgis: string; timezone: string }

const { currentUser } = useSession()
const health = ref<HealthState>({ kind: 'loading' })

async function loadHealth(): Promise<void> {
  health.value = { kind: 'loading' }
  try {
    const response = await fetch('/api/v1/health')
    const body: unknown = await response.json()
    if (!response.ok || !isHealthOk(body)) {
      health.value = { kind: 'down', message: 'La API respondió, pero la base de datos no está disponible.' }
      return
    }
    health.value = { kind: 'ok', postgis: body.postgis, timezone: body.timezone }
  } catch {
    health.value = { kind: 'down', message: 'No se pudo contactar la API.' }
  }
}

function isHealthOk(body: unknown): body is { postgis: string; timezone: string } {
  if (typeof body !== 'object' || body === null) {
    return false
  }
  const record = body as Record<string, unknown>
  return record.status === 'ok' && record.database === 'up' && typeof record.postgis === 'string' && typeof record.timezone === 'string'
}

onMounted(() => {
  void loadHealth()
})
</script>

<template>
  <main class="page">
    <p class="eyebrow">Oferta local</p>
    <h1>Publica tu cocina cuando ya hay cobertura</h1>
    <p class="lead">
      Registra el negocio, arma el catálogo y envíalo a revisión. Solo se publica si el punto cae en una zona piloto o activa.
    </p>
    <p class="actions">
      <router-link v-if="currentUser" class="button" to="/panel">Ir a mi negocio</router-link>
      <template v-else>
        <router-link class="button" to="/registro">Crear cuenta</router-link>
        <router-link class="button secondary" to="/entrar">Ya tengo cuenta</router-link>
      </template>
    </p>

    <section class="card" aria-live="polite">
      <h2>Estado del sistema</h2>
      <p v-if="health.kind === 'loading'">Consultando la API…</p>
      <dl v-else-if="health.kind === 'ok'">
        <div>
          <dt>API</dt>
          <dd>Operativa</dd>
        </div>
        <div>
          <dt>Base de datos</dt>
          <dd>Conectada</dd>
        </div>
        <div>
          <dt>PostGIS</dt>
          <dd>{{ health.postgis }}</dd>
        </div>
        <div>
          <dt>Zona horaria</dt>
          <dd>{{ health.timezone }}</dd>
        </div>
      </dl>
      <p v-else class="error">{{ health.message }}</p>
      <button type="button" class="secondary" @click="loadHealth">Volver a comprobar</button>
    </section>
  </main>
</template>
