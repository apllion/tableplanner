import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStorage } from './storage/index.js'
import { createHandlers } from './handlers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, '..', 'dist')
const PORT = process.env.PORT || 3000

async function main() {
  const storage = await createStorage()
  const handlers = createHandlers(storage)

  const app = express()

  // CORS
  const corsOrigin = process.env.CORS_ORIGIN
  if (corsOrigin) {
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', corsOrigin)
      res.header('Access-Control-Allow-Methods', 'GET, OPTIONS')
      res.header('Access-Control-Allow-Headers', 'Content-Type')
      if (req.method === 'OPTIONS') return res.sendStatus(204)
      next()
    })
  }

  // API endpoint
  app.get('/api', async (req, res) => {
    const action = req.query.action
    const handler = handlers[action]

    let result
    if (!handler) {
      result = { ok: false, error: `Unknown action: ${action}` }
    } else {
      try {
        result = await handler(req.query)
      } catch (err) {
        result = { ok: false, error: err.message }
      }
    }

    res.json(result)
  })

  // Static files + SPA fallback
  app.use(express.static(DIST))
  app.use((req, res) => {
    res.sendFile(path.join(DIST, 'index.html'))
  })

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`)
  })
}

main().catch(err => {
  console.error('Failed to start:', err)
  process.exit(1)
})
