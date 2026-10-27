import '@fastify/multipart'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { HttpError } from '../../http/errors.js'
import { parse } from '../../http/parse.js'
import { requireUser } from '../access.js'
import { deleteAsset, readPublicAsset, savePhoto, saveProductPhoto, saveVisualMenu } from './service.js'
import { assertMediaSignature } from './urls.js'

export async function mediaRoutes(app: FastifyInstance) {
  app.get('/media/:id', async (request, reply) => {
    const params = parse(z.object({ id: z.uuid() }), request.params)
    const query = parse(z.object({ exp: z.string(), sig: z.string() }), request.query)
    assertMediaSignature(params.id, query.exp, query.sig)
    const file = await readPublicAsset(params.id)
    return reply
      .header('content-type', file.mimeType)
      .header('cache-control', 'private, max-age=60')
      .header('x-content-type-options', 'nosniff')
      .send(file.body)
  })

  app.post('/branches/:id/photos', async (request) => {
    const auth = requireUser(request.auth)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    const file = await readUpload(request)
    return savePhoto(auth.userId, params.id, null, file)
  })

  app.post('/products/:id/photos', async (request) => {
    const auth = requireUser(request.auth)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    const file = await readUpload(request)
    return saveProductPhoto(auth.userId, params.id, file)
  })

  app.post('/branches/:id/visual-menus', async (request) => {
    const auth = requireUser(request.auth)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    const file = await readUpload(request)
    return saveVisualMenu(auth.userId, params.id, file)
  })

  app.delete('/media/:id', async (request) => {
    const auth = requireUser(request.auth)
    const params = parse(z.object({ id: z.uuid() }), request.params)
    await deleteAsset(auth.userId, params.id)
    return { ok: true }
  })
}

async function readUpload(request: FastifyRequest) {
  const upload = await request.file()
  if (!upload) {
    throw new HttpError(400, 'Falta el archivo')
  }
  return upload.toBuffer()
}
