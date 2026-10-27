import { createOrPromoteAdmin } from '../modules/auth/service.js'
import { pool } from './client.js'

const [email, password, name] = process.argv.slice(2).filter((argument) => argument !== '--')

if (!email || !password || password.length < 10) {
  console.error('Uso: pnpm admin:create -- correo contraseña "Nombre"')
  process.exit(1)
}

const userId = await createOrPromoteAdmin({
  email,
  password,
  name: name ?? 'Administrador',
})

console.log(`Administrador listo: ${userId}`)
await pool.end()
