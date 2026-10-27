import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { config } from '../../config.js'

export async function putObject(key: string, body: Buffer) {
  const path = objectPath(key)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, body)
}

export async function readObject(key: string): Promise<Buffer | null> {
  try {
    return await readFile(objectPath(key))
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return null
    }
    throw error
  }
}

export async function deleteObject(key: string) {
  await rm(objectPath(key), { force: true })
}

function objectPath(key: string): string {
  if (!/^[a-z0-9/-]+$/i.test(key) || key.includes('..')) {
    throw new Error('Clave de archivo inválida')
  }
  const root = resolve(config.UPLOAD_DIR)
  const target = resolve(root, key)
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error('Clave de archivo inválida')
  }
  return target
}
