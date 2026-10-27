<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, errorText } from '../api'
import { useSession } from '../session'

const router = useRouter()
const { refresh } = useSession()
const email = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)

async function submit(): Promise<void> {
  error.value = ''
  pending.value = true
  try {
    await api('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.value, password: password.value }),
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
    <h1>Entrar</h1>
    <form class="form card" @submit.prevent="submit">
      <label>
        Correo
        <input v-model="email" type="email" autocomplete="username" required />
      </label>
      <label>
        Contraseña
        <input v-model="password" type="password" autocomplete="current-password" minlength="10" required />
      </label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button type="submit" :disabled="pending">Entrar</button>
      <p class="hint">¿Aún no tienes cuenta? <router-link to="/registro">Regístrate</router-link></p>
    </form>
  </main>
</template>
