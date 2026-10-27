<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useSession } from './session'

const router = useRouter()
const { currentUser, isAdmin, logout } = useSession()

async function signOut(): Promise<void> {
  await logout()
  await router.push('/')
}
</script>

<template>
  <div>
    <header class="topbar">
      <router-link class="brand" to="/">Algo de comer</router-link>
      <nav aria-label="Principal">
        <router-link v-if="currentUser" to="/panel">Mi negocio</router-link>
        <template v-if="isAdmin">
          <router-link to="/admin/zonas">Zonas</router-link>
          <router-link to="/admin/revisiones">Revisiones</router-link>
        </template>
        <button v-if="currentUser" type="button" class="secondary" @click="signOut">Salir</button>
        <router-link v-else to="/entrar">Entrar</router-link>
      </nav>
    </header>
    <router-view />
  </div>
</template>
