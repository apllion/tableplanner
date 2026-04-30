import { getDayLabel } from './event-days.js'

function formatGame(game, seatCount) {
  const free = game.maxSeats - seatCount
  let line = game.name
  if (free > 0) line += ` (${free} frei)`
  else line += ` (voll)`
  if (game.scheduledDay && game.scheduledTime) {
    line += ` — ${getDayLabel(game.scheduledDay)}, ${game.scheduledTime}`
    if (game.endTime) line += `–${game.endTime}`
  }
  if (game.table) line += ` @ ${game.table}`
  if (game.note) line += ` — ${game.note}`
  return line
}

function buildList(title, games, seatsByGame) {
  if (games.length === 0) return `${title}: keine Spiele`
  return `${title} (${games.length}):\n` +
    games.map(g => `• ${formatGame(g, seatsByGame.get(g.gameId) || 0)}`).join('\n') +
    `\n\nhttps://apllion.github.io/tableplanner/`
}

export function copyGamesToClipboard(data, identity, mode) {
  if (!data) return

  const seatsByGame = new Map()
  for (const s of data.seats) {
    seatsByGame.set(s.gameId, (seatsByGame.get(s.gameId) || 0) + 1)
  }

  const myGameIds = new Set(
    data.seats
      .filter(s => s.playerId === identity.playerId)
      .map(s => s.gameId)
  )

  let games, title
  if (mode === 'my') {
    games = data.games.filter(g => myGameIds.has(g.gameId))
    title = 'Meine Spiele'
  } else if (mode === 'free') {
    games = data.games.filter(g => (seatsByGame.get(g.gameId) || 0) < g.maxSeats)
    title = 'Spiele mit freien Plaetzen'
  } else {
    games = data.games
    title = 'Alle Spiele'
  }

  // Sort by day, then time
  games = [...games].sort((a, b) => {
    if (a.scheduledDay && b.scheduledDay) {
      if (a.scheduledDay !== b.scheduledDay) return a.scheduledDay - b.scheduledDay
      return (a.scheduledTime || '').localeCompare(b.scheduledTime || '')
    }
    if (a.scheduledDay) return -1
    if (b.scheduledDay) return 1
    return a.name.localeCompare(b.name)
  })

  const text = buildList(title, games, seatsByGame)
  navigator.clipboard?.writeText(text)
}
