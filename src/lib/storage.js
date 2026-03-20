const IDENTITY_KEY = 'table-planer-identity'
const MOCK_DB_KEY = 'table-planer-mock-db'

export function loadIdentity() {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveIdentity(identity) {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
}

export function clearIdentity() {
  localStorage.removeItem(IDENTITY_KEY)
}

export function loadMockDb() {
  try {
    const raw = localStorage.getItem(MOCK_DB_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveMockDb(db) {
  localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db))
}
