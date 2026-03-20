import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Read passphrase from auth-config.js (static parse) or env var
let PASSPHRASE_ANSWER = process.env.PASSPHRASE_ANSWER || 'CHANGEME'
try {
  const configPath = path.join(__dirname, '..', 'src', 'lib', 'auth-config.js')
  const configContent = fs.readFileSync(configPath, 'utf-8')
  const match = configContent.match(/PASSPHRASE_ANSWER\s*=\s*['"](.+?)['"]/)
  if (match) PASSPHRASE_ANSWER = match[1]
} catch { /* use default / env */ }

function uuid() {
  return crypto.randomUUID()
}

function findPlayer(db, playerId) {
  return db.players.find(p => p.playerId === playerId)
}

// Simple write-mutex: serialise all mutations so concurrent requests
// don't clobber each other (read-modify-write cycle).
let _lock = Promise.resolve()
function withLock(fn) {
  const next = _lock.then(fn, fn)
  _lock = next.catch(() => {})
  return next
}

export function createHandlers(storage) {
  const handlers = {
    async poll() {
      const db = await storage.read()
      const now = Date.now()
      for (const p of db.players) {
        p.status = (now - new Date(p.lastSeen).getTime() > 5 * 60_000) ? 'away' : 'active'
      }
      return { ok: true, data: db }
    },

    async registerPlayer({ playerId, displayName, passphrase }) {
      if (!playerId) return { ok: false, error: 'playerId required' }

      return withLock(async () => {
        const db = await storage.read()
        const existing = findPlayer(db, playerId)
        const now = new Date().toISOString()
        if (existing) {
          if (displayName && String(displayName).trim().length >= 2) {
            existing.displayName = displayName
          }
          existing.lastSeen = now
          existing.status = 'active'
          await storage.write(db)
          return { ok: true, displayName: existing.displayName }
        } else {
          if (!displayName || String(displayName).trim().length < 2) return { ok: false, error: 'displayName must be at least 2 characters' }
          if (!passphrase || String(passphrase).trim().toLowerCase() !== PASSPHRASE_ANSWER.trim().toLowerCase()) {
            return { ok: false, error: 'Invalid passphrase' }
          }
          db.players.push({ playerId, displayName, joinedAt: now, lastSeen: now, status: 'active' })
          await storage.write(db)
          return { ok: true }
        }
      })
    },

    async heartbeat({ playerId }) {
      return withLock(async () => {
        const db = await storage.read()
        const player = findPlayer(db, playerId)
        if (player) {
          player.lastSeen = new Date().toISOString()
          player.status = 'active'
          await storage.write(db)
        }
        return { ok: true }
      })
    },

    async createGame({ playerId, name, minPlayers, maxPlayers, maxSeats, note, scheduledDay, scheduledTime, table, endTime, endDay }) {
      if (!playerId) return { ok: false, error: 'playerId required' }
      if (!name || !String(name).trim()) return { ok: false, error: 'Name required' }
      const seats = Number(maxSeats)
      if (!seats || seats < 2 || seats > 20) return { ok: false, error: 'maxSeats must be 2–20' }
      const minP = minPlayers ? Number(minPlayers) : null
      const maxP = maxPlayers ? Number(maxPlayers) : null
      if (minP && (minP < 1 || minP > 20)) return { ok: false, error: 'minPlayers must be 1–20' }
      if (maxP && (maxP < 1 || maxP > 20)) return { ok: false, error: 'maxPlayers must be 1–20' }
      if (minP && maxP && minP > maxP) return { ok: false, error: 'minPlayers must be <= maxPlayers' }

      return withLock(async () => {
        const db = await storage.read()
        const player = findPlayer(db, playerId)
        if (!player) return { ok: false, error: 'Player not found' }

        const now = new Date().toISOString()
        const game = {
          gameId: uuid(),
          name,
          hostId: playerId,
          minPlayers: minPlayers ? Number(minPlayers) : null,
          maxPlayers: maxPlayers ? Number(maxPlayers) : null,
          maxSeats: Number(maxSeats),
          status: 'waiting',
          createdAt: now,
          startedAt: null,
          note: note || null,
          scheduledDay: scheduledDay ? Number(scheduledDay) : null,
          scheduledTime: scheduledTime || null,
          table: table || null,
          endTime: endTime || null,
          endDay: endDay ? Number(endDay) : null,
        }
        db.games.push(game)
        db.seats.push({
          seatId: uuid(),
          gameId: game.gameId,
          playerId,
          playerName: player.displayName,
          joinedAt: now,
          note: null,
          status: 'joined',
        })
        await storage.write(db)
        return { ok: true, gameId: game.gameId }
      })
    },

    async editGame({ gameId, playerId, name, minPlayers, maxPlayers, maxSeats, note, scheduledDay, scheduledTime, table, endTime, endDay }) {
      if (!gameId) return { ok: false, error: 'gameId required' }
      if (!playerId) return { ok: false, error: 'playerId required' }
      if (name !== undefined && !String(name).trim()) return { ok: false, error: 'Name cannot be empty' }
      if (maxSeats !== undefined) {
        const s = Number(maxSeats)
        if (!s || s < 2 || s > 20) return { ok: false, error: 'maxSeats must be 2–20' }
      }
      const minP = minPlayers ? Number(minPlayers) : null
      const maxP = maxPlayers ? Number(maxPlayers) : null
      if (minP && (minP < 1 || minP > 20)) return { ok: false, error: 'minPlayers must be 1–20' }
      if (maxP && (maxP < 1 || maxP > 20)) return { ok: false, error: 'maxPlayers must be 1–20' }
      if (minP && maxP && minP > maxP) return { ok: false, error: 'minPlayers must be <= maxPlayers' }

      return withLock(async () => {
        const db = await storage.read()
        const game = db.games.find(g => g.gameId === gameId)
        if (!game) return { ok: false, error: 'Game not found' }
        if (game.hostId !== playerId) return { ok: false, error: 'Not the host' }

        if (name !== undefined) game.name = name
        if (minPlayers !== undefined) game.minPlayers = minPlayers ? Number(minPlayers) : null
        if (maxPlayers !== undefined) game.maxPlayers = maxPlayers ? Number(maxPlayers) : null
        if (maxSeats !== undefined) game.maxSeats = Number(maxSeats)
        if (note !== undefined) game.note = note || null
        if (scheduledDay !== undefined) game.scheduledDay = scheduledDay ? Number(scheduledDay) : null
        if (scheduledTime !== undefined) game.scheduledTime = scheduledTime || null
        if (table !== undefined) game.table = table || null
        if (endTime !== undefined) game.endTime = endTime || null
        if (endDay !== undefined) game.endDay = endDay ? Number(endDay) : null

        await storage.write(db)
        return { ok: true }
      })
    },

    async joinGame({ playerId, gameId }) {
      if (!playerId) return { ok: false, error: 'playerId required' }
      if (!gameId) return { ok: false, error: 'gameId required' }

      return withLock(async () => {
        const db = await storage.read()
        const game = db.games.find(g => g.gameId === gameId)
        if (!game) return { ok: false, error: 'Game not found' }
        if (game.status !== 'waiting') return { ok: false, error: 'Game is not waiting for players' }

        const player = findPlayer(db, playerId)
        if (!player) return { ok: false, error: 'Player not found' }

        const gameSeats = db.seats.filter(s => s.gameId === gameId)
        if (gameSeats.some(s => s.playerId === playerId)) return { ok: false, error: 'Already seated' }
        if (gameSeats.length >= game.maxSeats) return { ok: false, error: 'Game is full' }

        db.seats.push({
          seatId: uuid(),
          gameId,
          playerId,
          playerName: player.displayName,
          joinedAt: new Date().toISOString(),
          note: null,
          status: 'joined',
        })
        await storage.write(db)
        return { ok: true }
      })
    },

    async leaveGame({ playerId, gameId }) {
      if (!playerId) return { ok: false, error: 'playerId required' }
      if (!gameId) return { ok: false, error: 'gameId required' }

      return withLock(async () => {
        const db = await storage.read()
        const game = db.games.find(g => g.gameId === gameId)
        if (!game) return { ok: false, error: 'Game not found' }

        db.seats = db.seats.filter(s => !(s.gameId === gameId && s.playerId === playerId))
        await storage.write(db)
        return { ok: true }
      })
    },

    async startGame({ gameId, playerId }) {
      if (!playerId) return { ok: false, error: 'playerId required' }
      if (!gameId) return { ok: false, error: 'gameId required' }

      return withLock(async () => {
        const db = await storage.read()
        const game = db.games.find(g => g.gameId === gameId)
        if (!game) return { ok: false, error: 'Game not found' }
        if (game.hostId !== playerId) return { ok: false, error: 'Not the host' }
        if (game.status !== 'waiting') return { ok: false, error: 'Game is not waiting' }

        game.status = 'playing'
        game.startedAt = new Date().toISOString()
        await storage.write(db)
        return { ok: true }
      })
    },

    async finishGame({ gameId, playerId }) {
      if (!playerId) return { ok: false, error: 'playerId required' }
      if (!gameId) return { ok: false, error: 'gameId required' }

      return withLock(async () => {
        const db = await storage.read()
        const game = db.games.find(g => g.gameId === gameId)
        if (!game) return { ok: false, error: 'Game not found' }
        if (game.hostId !== playerId) return { ok: false, error: 'Not the host' }
        if (game.status !== 'playing') return { ok: false, error: 'Game is not playing' }

        game.status = 'finished'
        await storage.write(db)
        return { ok: true }
      })
    },

    async deleteGame({ gameId, playerId }) {
      if (!playerId) return { ok: false, error: 'playerId required' }
      if (!gameId) return { ok: false, error: 'gameId required' }

      return withLock(async () => {
        const db = await storage.read()
        const game = db.games.find(g => g.gameId === gameId)
        if (!game) return { ok: false, error: 'Game not found' }
        if (game.hostId !== playerId) return { ok: false, error: 'Not the host' }

        db.games = db.games.filter(g => g.gameId !== gameId)
        db.seats = db.seats.filter(s => s.gameId !== gameId)
        await storage.write(db)
        return { ok: true }
      })
    },

    async reserveSeat({ playerId, gameId, playerName }) {
      if (!playerId) return { ok: false, error: 'playerId required' }
      if (!gameId) return { ok: false, error: 'gameId required' }

      return withLock(async () => {
        const db = await storage.read()
        const game = db.games.find(g => g.gameId === gameId)
        if (!game) return { ok: false, error: 'Game not found' }

        const player = findPlayer(db, playerId)
        if (!player) return { ok: false, error: 'Player not found' }

        const gameSeats = db.seats.filter(s => s.gameId === gameId)
        if (gameSeats.length >= game.maxSeats) return { ok: false, error: 'Game is full' }

        db.seats.push({
          seatId: uuid(),
          gameId,
          playerId: '',
          playerName: playerName || 'Reserved',
          joinedAt: new Date().toISOString(),
          note: `reserved by ${player.displayName}`,
          status: 'reserved',
        })
        await storage.write(db)
        return { ok: true }
      })
    },

    async unreserveSeat({ playerId, gameId, seatId }) {
      if (!playerId) return { ok: false, error: 'playerId required' }
      if (!gameId) return { ok: false, error: 'gameId required' }
      if (!seatId) return { ok: false, error: 'seatId required' }

      return withLock(async () => {
        const db = await storage.read()
        const game = db.games.find(g => g.gameId === gameId)
        if (!game) return { ok: false, error: 'Game not found' }

        db.seats = db.seats.filter(s => s.seatId !== seatId)
        await storage.write(db)
        return { ok: true }
      })
    },
  }

  return handlers
}
