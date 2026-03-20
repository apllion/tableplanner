import { createFileStorage } from './file-storage.js'

/**
 * Create a storage backend based on STORAGE_BACKEND env var.
 *   'file'   (default) – local dev-db.json
 *   'sheets' – Google Sheets API
 */
export async function createStorage() {
  const backend = (process.env.STORAGE_BACKEND || 'file').toLowerCase()

  if (backend === 'sheets') {
    // Dynamic import so googleapis is not loaded in file mode
    const { createSheetsStorage } = await import('./sheets-storage.js')
    const storage = await createSheetsStorage()
    await storage.init()
    console.log('Storage: Google Sheets')
    return storage
  }

  const storage = createFileStorage()
  await storage.init()
  console.log('Storage: filesystem (dev-db.json)')
  return storage
}
