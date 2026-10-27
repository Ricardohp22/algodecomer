<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, errorText } from '../api'
import { useSession } from '../session'

const router = useRouter()
const { refresh } = useSession()
const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)

async function submit(): Promise<void> {
  error.value = ''
  pending.value = true
  try {
    await api('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: name.value, email: email.value, password: password.value }),
    })
    await refresh()
    await router.push('/verificar-telefono')
  } catch (caught) {
    error.value = errorText(caught)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="page">
    <h1>Crear cuenta</h1>
    <p class="lead">Después hay que verificar el teléfono. Sin eso no se puede registrar un negocio.</p>
    <form class="form card" @submit.prevent="submit">
      <label>
        Nombre
        <input v-model="name" type="text" autocomplete="name" required maxlength="120" />
      </label>
      <label>
        Correo
        <input v-model="email" type="email" autocomplete="email" required />
      </label>
      <label>
        Contraseña
        <input v-model="password" type="password" autocomplete="new-password" minlength="10" required />
      </label>
      <p class="hint">Mínimo 10 caracteres.</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button type="submit" :disabled="pending">Crear cuenta</button>
    </form>
  </main>
</template>
