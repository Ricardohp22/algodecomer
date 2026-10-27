<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, errorText } from '../api'
import { useSession } from '../session'

const router = useRouter()
const { refresh } = useSession()
const phone = ref('+52')
const code = ref('')
const devCode = ref('')
const notice = ref('')
const error = ref('')
const pending = ref(false)

async function requestCode(): Promise<void> {
  error.value = ''
  notice.value = ''
  pending.value = true
  try {
    const result = await api<{ devCode?: string }>('/api/v1/phone/verifications', {
      method: 'POST',
      body: JSON.stringify({ phone: phone.value }),
    })
    devCode.value = result.devCode ?? ''
    notice.value = 'Te enviamos un código de 6 dígitos. Caduca en 10 minutos.'
  } catch (caught) {
    error.value = errorText(caught)
  } finally {
    pending.value = false
  }
}

async function confirmCode(): Promise<void> {
  error.value = ''
  pending.value = true
  try {
    await api('/api/v1/phone/verifications/confirm', {
      method: 'POST',
      body: JSON.stringify({ phone: phone.value, code: code.value }),
    })
    await refresh()
    await router.push('/panel')
  } catch (caught) {
    error.value = errorText(caught)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="page">
    <h1>Verificar teléfono</h1>
    <p class="lead">Usa formato internacional, por ejemplo +525512345678.</p>
    <form class="form card" @submit.prevent="requestCode">
      <label>
        Teléfono
        <input v-model="phone" type="tel" autocomplete="tel" required />
      </label>
      <button type="submit" :disabled="pending">Pedir código</button>
      <p v-if="devCode" class="hint">Código de desarrollo: <strong>{{ devCode }}</strong></p>
    </form>

    <form class="form card" @submit.prevent="confirmCode">
      <label>
        Código
        <input v-model="code" inputmode="numeric" autocomplete="one-time-code" minlength="6" maxlength="6" required />
      </label>
      <p v-if="notice" class="hint">{{ notice }}</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button type="submit" :disabled="pending">Confirmar</button>
    </form>
  </main>
</template>
