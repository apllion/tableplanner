// Google Sheets API storage backend.
// Env vars:
//   GOOGLE_SHEETS_ID          – spreadsheet ID
//   GOOGLE_SERVICE_ACCOUNT_JSON – service-account key JSON (string or file path)

const PLAYER_HEADERS = ['playerId', 'displayName', 'joinedAt', 'lastSeen', 'status']
const GAME_HEADERS   = ['gameId', 'name', 'hostId', 'minPlayers', 'maxPlayers', 'maxSeats', 'status', 'createdAt', 'startedAt', 'note', 'scheduledDay', 'scheduledTime', 'table', 'endTime', 'endDay']
const SEAT_HEADERS   = ['seatId', 'gameId', 'playerId', 'playerName', 'joinedAt', 'note', 'status']

const TABS = {
  players: { range: 'Players', headers: PLAYER_HEADERS },
  games:   { range: 'Games',   headers: GAME_HEADERS },
  seats:   { range: 'Seats',   headers: SEAT_HEADERS },
}

// Numeric fields that should be parsed from strings
const NUMERIC_FIELDS = new Set(['minPlayers', 'maxPlayers', 'maxSeats', 'scheduledDay'])

function parseRow(headers, row) {
  const obj = {}
  for (let i = 0; i < headers.length; i++) {
    let val = row[i] !== undefined ? row[i] : null
    if (val === '') val = null
    if (val !== null && NUMERIC_FIELDS.has(headers[i])) {
      const n = Number(val)
      val = Number.isNaN(n) ? null : n
    }
    obj[headers[i]] = val
  }
  return obj
}

function toRow(headers, obj) {
  return headers.map(h => {
    const v = obj[h]
    return v === null || v === undefined ? '' : v
  })
}

export async function createSheetsStorage() {
  const { google } = await import('googleapis')

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID
  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_ID env var required')

  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!saJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON env var required')

  let credentials
  try {
    // Try as JSON string first
    credentials = JSON.parse(saJson)
  } catch {
    // Fall back to file path
    const fs = await import('node:fs')
    credentials = JSON.parse(fs.readFileSync(saJson, 'utf-8'))
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })

  // Simple in-memory cache with 2s TTL
  let _cache = null
  let _cacheTime = 0
  const CACHE_TTL = 2000

  function invalidateCache() {
    _cache = null
  }

  return {
    async init() {
      // Verify connectivity
      await sheets.spreadsheets.get({ spreadsheetId })
    },

    async read() {
      const now = Date.now()
      if (_cache && (now - _cacheTime) < CACHE_TTL) return _cache

      const res = await sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: [
          'Players!A:E',
          'Games!A:N',
          'Seats!A:E',
        ],
      })

      const [playersData, gamesData, seatsData] = res.data.valueRanges

      function parseSheet(data, headers) {
        const rows = data.values || []
        if (rows.length < 2) return []
        // Skip header row (row 0)
        return rows.slice(1).map(row => parseRow(headers, row))
      }

      const db = {
        players: parseSheet(playersData, PLAYER_HEADERS),
        games:   parseSheet(gamesData, GAME_HEADERS),
        seats:   parseSheet(seatsData, SEAT_HEADERS),
      }

      _cache = db
      _cacheTime = now
      return db
    },

    async write(db) {
      invalidateCache()

      // Clear data rows (keep headers) then write all data
      await sheets.spreadsheets.values.batchClear({
        spreadsheetId,
        requestBody: {
          ranges: [
            'Players!A2:E',
            'Games!A2:N',
            'Seats!A2:E',
          ],
        },
      })

      const requests = []

      if (db.players.length) {
        requests.push({
          range: 'Players!A2',
          values: db.players.map(p => toRow(PLAYER_HEADERS, p)),
        })
      }
      if (db.games.length) {
        requests.push({
          range: 'Games!A2',
          values: db.games.map(g => toRow(GAME_HEADERS, g)),
        })
      }
      if (db.seats.length) {
        requests.push({
          range: 'Seats!A2',
          values: db.seats.map(s => toRow(SEAT_HEADERS, s)),
        })
      }

      if (requests.length) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: {
            valueInputOption: 'RAW',
            data: requests,
          },
        })
      }
    },
  }
}
