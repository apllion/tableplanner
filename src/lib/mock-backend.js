import { generateId } from './ids.js'
import { loadMockDb, saveMockDb } from './storage.js'
import { PASSPHRASE_ANSWER } from './auth-config.js'

function getDb() {
  return loadMockDb() || { players: [], games: [], seats: [] }
}

function save(db) {
  saveMockDb(db)
}

function findPlayer(db, playerId) {
  return db.players.find(p => p.playerId === playerId)
}

const handlers = {
  poll() {
    const db = getDb()
    // Update player statuses based on lastSeen
    const now = Date.now()
    for (const p of db.players) {
      p.status = (now - new Date(p.lastSeen).getTime() > 5 * 60_000) ? 'away' : 'active'
    }
    return { ok: true, data: db }
  },

  registerPlayer({ playerId, displayName, passphrase }) {
    const db = getDb()
    const existing = findPlayer(db, playerId)
    const now = new Date().toISOString()
    if (existing) {
      if (displayName && String(displayName).trim().length >= 2) {
        existing.displayName = displayName
      }
      existing.lastSeen = now
      existing.status = 'active'
      save(db)
      return { ok: true, displayName: existing.displayName }
    } else {
      if (!displayName || String(displayName).trim().length < 2) return { ok: false, error: 'displayName must be at least 2 characters' }
      // New player: require passphrase
      if (!passphrase || String(passphrase).trim().toLowerCase() !== PASSPHRASE_ANSWER.trim().toLowerCase()) {
        return { ok: false, error: 'Invalid passphrase' }
      }
      db.players.push({
        playerId,
        displayName,
        joinedAt: now,
        lastSeen: now,
        status: 'active',
      })
    }
    save(db)
    return { ok: true }
  },

  heartbeat({ playerId }) {
    const db = getDb()
    const player = findPlayer(db, playerId)
    if (player) {
      player.lastSeen = new Date().toISOString()
      player.status = 'active'
      save(db)
    }
    return { ok: true }
  },

  createGame({ playerId, name, minPlayers, maxPlayers, maxSeats, note, scheduledDay, scheduledTime, table, endTime, endDay }) {
    const db = getDb()
    const player = findPlayer(db, playerId)
    if (!player) return { ok: false, error: 'Player not found' }

    const now = new Date().toISOString()
    const game = {
      gameId: generateId(),
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

    // Auto-seat the host
    db.seats.push({
      seatId: generateId(),
      gameId: game.gameId,
      playerId,
      playerName: player.displayName,
      joinedAt: now,
      note: null,
      status: 'joined',
    })

    save(db)
    return { ok: true, gameId: game.gameId }
  },

  joinGame({ playerId, gameId }) {
    const db = getDb()
    const game = db.games.find(g => g.gameId === gameId)
    if (!game) return { ok: false, error: 'Game not found' }
    if (game.status !== 'waiting') return { ok: false, error: 'Game is not waiting for players' }

    const player = findPlayer(db, playerId)
    if (!player) return { ok: false, error: 'Player not found' }

    const gameSeats = db.seats.filter(s => s.gameId === gameId)
    if (gameSeats.some(s => s.playerId === playerId)) {
      return { ok: false, error: 'Already seated' }
    }
    if (gameSeats.length >= game.maxSeats) {
      return { ok: false, error: 'Game is full' }
    }

    db.seats.push({
      seatId: generateId(),
      gameId,
      playerId,
      playerName: player.displayName,
      joinedAt: new Date().toISOString(),
      note: null,
      status: 'joined',
    })
    save(db)
    return { ok: true }
  },

  leaveGame({ playerId, gameId }) {
    const db = getDb()
    const game = db.games.find(g => g.gameId === gameId)
    if (!game) return { ok: false, error: 'Game not found' }

    db.seats = db.seats.filter(s => !(s.gameId === gameId && s.playerId === playerId))
    save(db)
    return { ok: true }
  },

  startGame({ gameId, playerId }) {
    const db = getDb()
    const game = db.games.find(g => g.gameId === gameId)
    if (!game) return { ok: false, error: 'Game not found' }
    if (game.hostId !== playerId) return { ok: false, error: 'Not the host' }
    if (game.status !== 'waiting') return { ok: false, error: 'Game is not waiting' }

    game.status = 'playing'
    game.startedAt = new Date().toISOString()
    save(db)
    return { ok: true }
  },

  finishGame({ gameId, playerId }) {
    const db = getDb()
    const game = db.games.find(g => g.gameId === gameId)
    if (!game) return { ok: false, error: 'Game not found' }
    if (game.hostId !== playerId) return { ok: false, error: 'Not the host' }
    if (game.status !== 'playing') return { ok: false, error: 'Game is not playing' }

    game.status = 'finished'
    save(db)
    return { ok: true }
  },

  editGame({ gameId, playerId, name, minPlayers, maxPlayers, maxSeats, note, scheduledDay, scheduledTime, table, endTime, endDay }) {
    const db = getDb()
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

    save(db)
    return { ok: true }
  },

  deleteGame({ gameId, playerId }) {
    const db = getDb()
    const game = db.games.find(g => g.gameId === gameId)
    if (!game) return { ok: false, error: 'Game not found' }
    if (game.hostId !== playerId) return { ok: false, error: 'Not the host' }

    db.games = db.games.filter(g => g.gameId !== gameId)
    db.seats = db.seats.filter(s => s.gameId !== gameId)
    save(db)
    return { ok: true }
  },

  reserveSeat({ playerId, gameId, playerName }) {
    const db = getDb()
    const game = db.games.find(g => g.gameId === gameId)
    if (!game) return { ok: false, error: 'Game not found' }

    const player = findPlayer(db, playerId)
    if (!player) return { ok: false, error: 'Player not found' }

    const gameSeats = db.seats.filter(s => s.gameId === gameId)
    if (gameSeats.length >= game.maxSeats) return { ok: false, error: 'Game is full' }

    db.seats.push({
      seatId: generateId(),
      gameId,
      playerId: '',
      playerName: playerName || 'Reserved',
      joinedAt: new Date().toISOString(),
      note: `reserved by ${player.displayName}`,
      status: 'reserved',
    })
    save(db)
    return { ok: true }
  },

  unreserveSeat({ playerId, gameId, seatId }) {
    const db = getDb()
    const game = db.games.find(g => g.gameId === gameId)
    if (!game) return { ok: false, error: 'Game not found' }

    db.seats = db.seats.filter(s => s.seatId !== seatId)
    save(db)
    return { ok: true }
  },
}

export async function mockCallApi(action, params = {}) {
  // Simulate tiny network delay
  await new Promise(r => setTimeout(r, 50))

  const handler = handlers[action]
  if (!handler) return { ok: false, error: `Unknown action: ${action}` }
  return handler(params)
}
