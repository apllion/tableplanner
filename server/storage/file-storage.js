import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_DB_PATH = path.join(__dirname, '..', '..', 'dev-db.json')

export function createFileStorage(dbPath = DEFAULT_DB_PATH) {
  return {
    async init() { /* nothing to initialise */ },

    async read() {
      try {
        return JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
      } catch {
        return { players: [], games: [], seats: [] }
      }
    },

    async write(db) {
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2))
    },
  }
}
