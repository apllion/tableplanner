import { createFileStorage } from './storage/file-storage.js'
import { createHandlers } from './handlers.js'

export default function apiPlugin() {
  const storage = createFileStorage()
  const handlers = createHandlers(storage)

  return {
    name: 'api-server',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        const params = Object.fromEntries(url.searchParams)
        const action = params.action

        const handler = handlers[action]
        let result
        if (!handler) {
          result = { ok: false, error: `Unknown action: ${action}` }
        } else {
          try {
            result = await handler(params)
          } catch (err) {
            result = { ok: false, error: err.message }
          }
        }

        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(result))
      })
    },
  }
}
