<script setup lang="ts">
import { onMounted, ref } from 'vue'

type HealthState =
  | { kind: 'loading' }
  | { kind: 'down'; message: string }
  | { kind: 'ok'; postgis: string; timezone: string }

const state = ref<HealthState>({ kind: 'loading' })

async function loadHealth(): Promise<void> {
  state.value = { kind: 'loading' }
  try {
    const response = await fetch('/api/v1/health')
    const body: unknown = await response.json()
    if (!response.ok || !isHealthOk(body)) {
      state.value = {
        kind: 'down',
        message: 'La API respondió, pero la base de datos no está disponible.',
      }
      return
    }
    state.value = {
      kind: 'ok',
      postgis: body.postgis,
      timezone: body.timezone,
    }
  } catch {
    state.value = {
      kind: 'down',
      message: 'No se pudo contactar la API. Comprueba que el servidor esté en marcha.',
    }
  }
}

function isHealthOk(body: unknown): body is { postgis: string; timezone: string } {
  if (typeof body !== 'object' || body === null) {
    return false
  }
  const record = body as Record<string, unknown>
  return (
    record.status === 'ok' &&
    record.database === 'up' &&
    typeof record.postgis === 'string' &&
    typeof record.timezone === 'string'
  )
}

onMounted(() => {
  void loadHealth()
})
</script>

<template>
  <main class="shell">
    <p class="eyebrow">Fase 0 · Fundamentos</p>
    <h1>Algo de comer</h1>
    <p class="lead">
      Entorno local de la plataforma gastronómica. Esta pantalla solo comprueba que la web, la API
      y PostgreSQL con PostGIS se hablan.
    </p>

    <section class="card" aria-live="polite">
      <h2>Estado del sistema</h2>
      <p v-if="state.kind === 'loading'">Consultando la API…</p>
      <dl v-else-if="state.kind === 'ok'">
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
          <dd>{{ state.postgis }}</dd>
        </div>
        <div>
          <dt>Zona horaria</dt>
          <dd>{{ state.timezone }}</dd>
        </div>
      </dl>
      <p v-else class="error">{{ state.message }}</p>
      <button type="button" @click="loadHealth">Volver a comprobar</button>
    </section>
  </main>
</template>

<style scoped>
.shell {
  max-width: 40rem;
  margin: 0 auto;
  padding: 4rem 1.25rem 3rem;
}

.eyebrow {
  margin: 0 0 0.75rem;
  color: var(--accent);
  font-family: "Avenir Next", "Segoe UI", sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 3rem;
  font-weight: 600;
  line-height: 1.05;
}

.lead {
  color: var(--muted);
  font-size: 1.05rem;
  line-height: 1.5;
}

.card {
  margin-top: 2rem;
  padding: 1.25rem 1.25rem 1.1rem;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 1rem;
}

h2 {
  margin: 0 0 1rem;
  font-size: 1.25rem;
}

dl {
  display: grid;
  gap: 0.85rem;
  margin: 0 0 1.25rem;
}

dl div {
  display: grid;
  grid-template-columns: 9rem 1fr;
  gap: 0.75rem;
}

dt {
  color: var(--muted);
}

dd {
  margin: 0;
}

.error {
  color: var(--danger);
}

button {
  border: 0;
  border-radius: 999px;
  padding: 0.7rem 1rem;
  background: var(--accent);
  color: #fffdf8;
  font-weight: 600;
  cursor: pointer;
}

button:hover {
  background: #0f4a38;
}
</style>
