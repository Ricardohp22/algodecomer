<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, api, errorText } from '../api'
import { amenities, businessTypes, weekdays } from '../labels'
import type { BranchBundle, HourInterval } from '../types'
import CatalogPanel from './CatalogPanel.vue'

const route = useRoute()
const router = useRouter()
const branchId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const bundle = ref<BranchBundle | null>(null)
const error = ref('')
const notice = ref('')
const pending = ref(false)
const waitlistReady = ref(false)

const form = reactive({
  legalName: '',
  branchName: '',
  description: '',
  businessType: 'restaurante',
  phone: '+52',
  whatsapp: '',
  address: '',
  exposePublicAddress: true,
  latitude: '',
  longitude: '',
  planCode: 'BASIC',
  dineIn: true,
  pickup: true,
  delivery: false,
  deliveryFee: '0',
  deliveryRadiusM: '',
  minOrder: '',
  amenities: [] as string[],
  hours: [{ weekday: 1, opensAt: '09:00', closesAt: '17:00' }] as HourInterval[],
})

const isKitchen = computed(() => form.businessType === 'cocina_en_casa')

function onBusinessType(event: Event): void {
  const select = event.target
  if (select instanceof HTMLSelectElement && select.value === 'cocina_en_casa') {
    form.exposePublicAddress = false
  }
}

function useDemoPoint(): void {
  form.latitude = '19.4326'
  form.longitude = '-99.1332'
}

function fill(detail: BranchBundle): void {
  form.legalName = detail.legalName
  form.branchName = detail.name
  form.description = detail.description
  form.businessType = detail.businessType
  form.phone = detail.phone
  form.whatsapp = detail.whatsapp ?? ''
  form.address = detail.addressPrivate ?? detail.addressPublic ?? ''
  form.exposePublicAddress = detail.exposePublicAddress
  form.latitude = String(detail.latitude)
  form.longitude = String(detail.longitude)
  form.planCode = detail.planCode
  form.dineIn = detail.delivery.dineIn
  form.pickup = detail.delivery.pickup
  form.delivery = detail.delivery.delivery
  form.deliveryFee = detail.delivery.fee
  form.deliveryRadiusM = detail.delivery.radiusM ? String(detail.delivery.radiusM) : ''
  form.minOrder = detail.delivery.minOrder ?? ''
  form.amenities = [...detail.amenities]
  form.hours = detail.hours.length > 0 ? detail.hours.map((hour) => ({ ...hour })) : [{ weekday: 1, opensAt: '09:00', closesAt: '17:00' }]
}

function payload(coverageConsent: boolean) {
  return {
    legalName: form.legalName,
    branchName: form.branchName,
    description: form.description,
    businessType: form.businessType,
    phone: form.phone,
    whatsapp: form.whatsapp || null,
    address: form.address,
    exposePublicAddress: form.exposePublicAddress,
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    planCode: form.planCode,
    dineIn: form.dineIn,
    pickup: form.pickup,
    delivery: form.delivery,
    deliveryFee: form.deliveryFee || '0',
    deliveryRadiusM: form.delivery ? Number(form.deliveryRadiusM) : null,
    minOrder: form.minOrder || null,
    coverageConsent,
  }
}

async function load(): Promise<void> {
  if (!branchId.value) {
    bundle.value = null
    return
  }
  bundle.value = await api<BranchBundle>(`/api/v1/me/branches/${branchId.value}`)
  fill(bundle.value)
}

async function saveProfile(coverageConsent = false): Promise<void> {
  error.value = ''
  notice.value = ''
  waitlistReady.value = false
  pending.value = true
  let createdId = ''
  try {
    const body = JSON.stringify(payload(coverageConsent))
    if (!branchId.value) {
      const created = await api<BranchBundle>('/api/v1/branches', { method: 'POST', body })
      createdId = created.id
      await saveHoursAndAmenities(created.id)
      notice.value = 'Sucursal creada. Publica al menos un producto antes de enviarla.'
      await router.replace(`/panel/sucursales/${created.id}`)
      return
    }
    await api(`/api/v1/branches/${branchId.value}`, { method: 'PATCH', body })
    await saveHoursAndAmenities(branchId.value)
    await load()
    notice.value = 'Cambios guardados.'
  } catch (caught) {
    if (caught instanceof ApiError && caught.body.code === 'out_of_coverage') {
      error.value = caught.message
      waitlistReady.value = !coverageConsent && !branchId.value
      if (typeof caught.body.waitlistId === 'string') {
        notice.value = 'Quedaste en la lista de espera. No se creó la sucursal.'
        waitlistReady.value = false
      }
    } else {
      error.value = errorText(caught)
    }
    if (createdId) {
      await router.replace(`/panel/sucursales/${createdId}`)
    }
  } finally {
    pending.value = false
  }
}

async function saveHoursAndAmenities(id: string): Promise<void> {
  await api(`/api/v1/branches/${id}/hours`, {
    method: 'PUT',
    body: JSON.stringify({
      intervals: form.hours.map((hour) => ({
        weekday: hour.weekday,
        opensAt: hour.opensAt.slice(0, 5),
        closesAt: hour.closesAt.slice(0, 5),
      })),
    }),
  })
  await api(`/api/v1/branches/${id}/amenities`, {
    method: 'PUT',
    body: JSON.stringify({ codes: form.amenities }),
  })
}

async function submitReview(): Promise<void> {
  if (!branchId.value) {
    return
  }
  error.value = ''
  notice.value = ''
  pending.value = true
  try {
    await api(`/api/v1/branches/${branchId.value}/submit-review`, { method: 'POST' })
    await load()
    notice.value = 'La sucursal quedó en revisión.'
  } catch (caught) {
    error.value = errorText(caught)
  } finally {
    pending.value = false
  }
}

async function upload(kind: 'photos' | 'visual-menus', file: File): Promise<void> {
  if (!branchId.value) {
    return
  }
  const body = new FormData()
  body.set('file', file)
  error.value = ''
  pending.value = true
  try {
    await api(`/api/v1/branches/${branchId.value}/${kind}`, { method: 'POST', body })
    await load()
  } catch (caught) {
    error.value = errorText(caught)
  } finally {
    pending.value = false
  }
}

async function removeFile(assetId: string): Promise<void> {
  error.value = ''
  pending.value = true
  try {
    await api(`/api/v1/media/${assetId}`, { method: 'DELETE' })
    await load()
  } catch (caught) {
    error.value = errorText(caught)
  } finally {
    pending.value = false
  }
}

function onPhoto(event: Event): void {
  const input = event.target
  if (!(input instanceof HTMLInputElement) || !input.files?.[0]) {
    return
  }
  void upload('photos', input.files[0])
  input.value = ''
}

function onMenu(event: Event): void {
  const input = event.target
  if (!(input instanceof HTMLInputElement) || !input.files?.[0]) {
    return
  }
  void upload('visual-menus', input.files[0])
  input.value = ''
}

function addHour(): void {
  form.hours.push({ weekday: 1, opensAt: '09:00', closesAt: '17:00' })
}

function removeHour(index: number): void {
  form.hours.splice(index, 1)
}

onMounted(() => {
  void load().catch((caught: unknown) => {
    error.value = errorText(caught)
  })
})

watch(branchId, () => {
  void load().catch((caught: unknown) => {
    error.value = errorText(caught)
  })
})
</script>

<template>
  <main class="page wide">
    <p class="eyebrow">Sucursal</p>
    <h1>{{ branchId ? 'Editar sucursal' : 'Nueva sucursal' }}</h1>
    <p v-if="bundle?.rejectionReason" class="error">Rechazada: {{ bundle.rejectionReason }}</p>

    <form class="form card" @submit.prevent="saveProfile(false)">
      <div class="split">
        <label>
          Nombre del negocio
          <input v-model="form.legalName" required maxlength="160" />
        </label>
        <label>
          Nombre de la sucursal
          <input v-model="form.branchName" required maxlength="160" />
        </label>
      </div>
      <label>
        Descripción
        <textarea v-model="form.description" rows="3" maxlength="2000" required />
      </label>
      <div class="split">
        <label>
          Tipo
          <select v-model="form.businessType" @change="onBusinessType">
            <option v-for="type in businessTypes" :key="type.value" :value="type.value">{{ type.label }}</option>
          </select>
        </label>
        <label>
          Plan de referencia
          <select v-model="form.planCode">
            <option value="BASIC">Básico · $29 MXN</option>
            <option value="PRO">PRO · $129 MXN</option>
          </select>
        </label>
      </div>
      <p class="hint">El cobro del plan llega después. Aquí solo define el cupo de fotos y menús visuales.</p>
      <div class="split">
        <label>
          Teléfono
          <input v-model="form.phone" type="tel" required />
        </label>
        <label>
          WhatsApp
          <input v-model="form.whatsapp" type="tel" />
        </label>
      </div>
      <label>
        Domicilio
        <input v-model="form.address" required maxlength="240" />
      </label>
      <label class="check">
        <input v-model="form.exposePublicAddress" type="checkbox" />
        Mostrar el domicilio en la página pública
      </label>
      <p v-if="isKitchen" class="hint">En una cocina en casa el domicilio queda privado, salvo que marques la casilla.</p>
      <div class="split">
        <label>
          Latitud
          <input v-model="form.latitude" inputmode="decimal" required />
        </label>
        <label>
          Longitud
          <input v-model="form.longitude" inputmode="decimal" required />
        </label>
      </div>
      <button type="button" class="secondary" @click="useDemoPoint">Usar punto de demostración</button>
      <fieldset>
        <legend>Modalidad</legend>
        <label class="check"><input v-model="form.dineIn" type="checkbox" /> Comer aquí</label>
        <label class="check"><input v-model="form.pickup" type="checkbox" /> Para llevar</label>
        <label class="check"><input v-model="form.delivery" type="checkbox" /> Entrega</label>
      </fieldset>
      <div v-if="form.delivery" class="split">
        <label>
          Costo de envío
          <input v-model="form.deliveryFee" inputmode="decimal" />
        </label>
        <label>
          Radio en metros
          <input v-model="form.deliveryRadiusM" inputmode="numeric" required />
        </label>
        <label>
          Pedido mínimo
          <input v-model="form.minOrder" inputmode="decimal" />
        </label>
      </div>
      <fieldset>
        <legend>Horario</legend>
        <div v-for="(hour, index) in form.hours" :key="index" class="split">
          <label>
            Día
            <select v-model.number="hour.weekday">
              <option v-for="day in weekdays" :key="day.value" :value="day.value">{{ day.label }}</option>
            </select>
          </label>
          <label>
            Abre
            <input v-model="hour.opensAt" type="time" required />
          </label>
          <label>
            Cierra
            <input v-model="hour.closesAt" type="time" required />
          </label>
          <button type="button" class="secondary" @click="removeHour(index)">Quitar</button>
        </div>
        <button type="button" class="secondary" @click="addHour">Agregar horario</button>
      </fieldset>
      <fieldset>
        <legend>Servicios</legend>
        <label v-for="amenity in amenities" :key="amenity.value" class="check">
          <input v-model="form.amenities" type="checkbox" :value="amenity.value" />
          {{ amenity.label }}
        </label>
      </fieldset>
      <p v-if="notice" class="hint">{{ notice }}</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button v-if="waitlistReady" type="button" :disabled="pending" @click="saveProfile(true)">Anotarme en la lista de espera</button>
      <button type="submit" :disabled="pending">{{ branchId ? 'Guardar ficha' : 'Crear sucursal' }}</button>
    </form>

    <template v-if="bundle">
      <CatalogPanel
        :branch-id="bundle.id"
        :categories="bundle.categories"
        :products="bundle.products"
        @changed="load"
      />

      <section class="card">
        <h2>Fotos y menú visual</h2>
        <label>
          Fotografía
          <input type="file" accept="image/jpeg,image/png,image/webp" @change="onPhoto" />
        </label>
        <ul v-if="bundle.photos.length > 0" class="gallery">
          <li v-for="photo in bundle.photos" :key="photo.id">
            <img :src="photo.url" alt="Fotografía de la sucursal" />
            <button type="button" class="secondary" @click="removeFile(photo.id)">Quitar</button>
          </li>
        </ul>
        <label>
          Menú visual
          <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" @change="onMenu" />
        </label>
        <ul v-if="bundle.visualMenus.length > 0" class="stack plain">
          <li v-for="menu in bundle.visualMenus" :key="menu.id">
            <a :href="menu.url">Abrir menú</a>
            <button type="button" class="secondary" @click="removeFile(menu.assetId)">Quitar</button>
          </li>
        </ul>
      </section>

      <section class="card">
        <h2>Requisitos para revisión</h2>
        <p v-if="bundle.missing.length === 0">La sucursal cumple el mínimo para enviarse.</p>
        <ul v-else>
          <li v-for="item in bundle.missing" :key="item">{{ item }}</li>
        </ul>
        <button type="button" :disabled="pending || bundle.approvalStatus === 'pending_review'" @click="submitReview">
          Enviar a revisión
        </button>
      </section>
    </template>
  </main>
</template>
