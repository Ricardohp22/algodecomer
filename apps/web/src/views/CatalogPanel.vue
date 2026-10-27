<script setup lang="ts">
import { ref } from 'vue'
import { api, errorText } from '../api'
import type { CatalogProduct } from '../types'

const props = defineProps<{
  branchId: string
  categories: Array<{ id: string; name: string }>
  products: CatalogProduct[]
}>()

const emit = defineEmits<{ changed: [] }>()

const categoryName = ref('')
const productName = ref('')
const productPrice = ref('')
const productCategoryId = ref('')
const error = ref('')
const pending = ref(false)

async function run(action: () => Promise<void>): Promise<void> {
  error.value = ''
  pending.value = true
  try {
    await action()
    emit('changed')
  } catch (caught) {
    error.value = errorText(caught)
  } finally {
    pending.value = false
  }
}

function addCategory(): Promise<void> {
  return run(async () => {
    await api(`/api/v1/branches/${props.branchId}/categories`, {
      method: 'POST',
      body: JSON.stringify({ name: categoryName.value, sortOrder: props.categories.length + 1 }),
    })
    categoryName.value = ''
  })
}

function addProduct(): Promise<void> {
  const categoryId = productCategoryId.value || props.categories[0]?.id
  if (!categoryId) {
    error.value = 'Primero crea una categoría'
    return Promise.resolve()
  }
  return run(async () => {
    await api(`/api/v1/branches/${props.branchId}/products`, {
      method: 'POST',
      body: JSON.stringify({
        categoryId,
        name: productName.value,
        description: '',
        basePrice: productPrice.value,
        availabilityStatus: 'available',
        published: true,
      }),
    })
    productName.value = ''
    productPrice.value = ''
  })
}

function removeProduct(productId: string): Promise<void> {
  return run(async () => {
    await api(`/api/v1/products/${productId}`, { method: 'DELETE' })
  })
}
</script>

<template>
  <section class="card">
    <h2>Catálogo</h2>
    <form class="form" @submit.prevent="addCategory">
      <label>
        Nueva categoría
        <input v-model="categoryName" type="text" required maxlength="80" />
      </label>
      <button type="submit" :disabled="pending">Agregar categoría</button>
    </form>
    <ul v-if="categories.length > 0" class="stack plain">
      <li v-for="category in categories" :key="category.id">{{ category.name }}</li>
    </ul>
    <form class="form split" @submit.prevent="addProduct">
      <label>
        Producto
        <input v-model="productName" type="text" required maxlength="160" />
      </label>
      <label>
        Precio MXN
        <input v-model="productPrice" type="text" inputmode="decimal" required placeholder="45" />
      </label>
      <label v-if="categories.length > 1">
        Categoría
        <select v-model="productCategoryId">
          <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
        </select>
      </label>
      <button type="submit" :disabled="pending || categories.length === 0">Publicar producto</button>
    </form>
    <p v-if="categories.length === 0" class="hint">Crea una categoría antes del primer producto.</p>
    <ul v-if="products.length > 0" class="stack plain">
      <li v-for="product in products" :key="product.id">
        <span>{{ product.name }} · ${{ product.basePrice }}</span>
        <button type="button" class="secondary" :disabled="pending" @click="removeProduct(product.id)">Quitar</button>
      </li>
    </ul>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </section>
</template>
