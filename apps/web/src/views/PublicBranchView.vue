<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ApiError, api, errorText } from '../api'
import { amenities, businessTypeLabel, weekdayLabel } from '../labels'
import type { PublicBranch } from '../types'

const route = useRoute()
const branch = ref<PublicBranch | null>(null)
const error = ref('')

function amenityLabel(code: string): string {
  return amenities.find((item) => item.value === code)?.label ?? code
}

async function load(): Promise<void> {
  error.value = ''
  branch.value = null
  const id = route.params.id
  if (typeof id !== 'string') {
    return
  }
  try {
    branch.value = await api<PublicBranch>(`/api/v1/branches/${id}`)
  } catch (caught) {
    error.value = caught instanceof ApiError && caught.status === 404 ? 'Esta sucursal no está publicada.' : errorText(caught)
  }
}

onMounted(() => {
  void load()
})

watch(() => route.params.id, () => {
  void load()
})
</script>

<template>
  <main class="page">
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <template v-else-if="branch">
      <p class="eyebrow">{{ businessTypeLabel(branch.businessType) }}</p>
      <h1>{{ branch.name }}</h1>
      <p class="lead">{{ branch.description }}</p>
      <p v-if="branch.addressPublic">{{ branch.addressPublic }}</p>
      <p v-else class="hint">El domicilio no se publica.</p>
      <p>{{ branch.phone }}</p>
      <section v-if="branch.hours.length > 0">
        <h2>Horario</h2>
        <ul>
          <li v-for="hour in branch.hours" :key="`${hour.weekday}-${hour.opensAt}`">
            {{ weekdayLabel(hour.weekday) }} {{ hour.opensAt }}–{{ hour.closesAt }}
          </li>
        </ul>
      </section>
      <p v-if="branch.amenities.length > 0">{{ branch.amenities.map(amenityLabel).join(' · ') }}</p>
      <section>
        <h2>Menú</h2>
        <ul class="stack">
          <li v-for="product in branch.products" :key="product.id" class="card">
            <h3>{{ product.name }}</h3>
            <p v-if="product.description">{{ product.description }}</p>
            <p>${{ product.basePrice }} MXN</p>
          </li>
        </ul>
      </section>
      <ul v-if="branch.photos.length > 0" class="gallery">
        <li v-for="photo in branch.photos" :key="photo.id">
          <img :src="photo.url" alt="" />
        </li>
      </ul>
      <p v-for="menu in branch.visualMenus" :key="menu.id">
        <a :href="menu.url">Ver menú visual</a>
      </p>
    </template>
  </main>
</template>
