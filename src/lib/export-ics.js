import { getDayDate } from './event-days.js'

function pad(n) {
  return String(n).padStart(2, '0')
}

function toIcsDate(date, timeStr) {
  const [h, m] = (timeStr || '00:00').split(':').map(Number)
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(h)}${pad(m)}00`
}

function escapeIcs(str) {
  return (str || '').replace(/[\\;,\n]/g, c => c === '\n' ? '\\n' : '\\' + c)
}

function buildIcs(games, seats, players) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hexacon//TablePlaner//EN',
    'CALSCALE:GREGORIAN',
  ]

  const playersById = new Map()
  for (const p of players) playersById.set(p.playerId, p)

  for (const game of games) {
    if (!game.scheduledDay || !game.scheduledTime) continue

    const startDate = getDayDate(game.scheduledDay)
    const endDate = game.endDay ? getDayDate(game.endDay) : startDate
    const endTime = game.endTime || game.scheduledTime

    const gameSeats = seats.filter(s => s.gameId === game.gameId)
    const seatCount = gameSeats.length
    const host = playersById.get(game.hostId)

    const descParts = []
    if (host) descParts.push(`Host: ${host.displayName}`)
    descParts.push(`Seats: ${seatCount}/${game.maxSeats}`)
    if (game.note) descParts.push(game.note)
    const attendees = gameSeats.map(s => s.playerName).join(', ')
    if (attendees) descParts.push(`Players: ${attendees}`)

    lines.push('BEGIN:VEVENT')
    lines.push(`DTSTART:${toIcsDate(startDate, game.scheduledTime)}`)
    lines.push(`DTEND:${toIcsDate(endDate, endTime)}`)
    lines.push(`SUMMARY:${escapeIcs(game.name)}`)
    lines.push(`DESCRIPTION:${escapeIcs(descParts.join('\\n'))}`)
    if (game.table) lines.push(`LOCATION:${escapeIcs(game.table)}`)
    lines.push(`UID:${game.gameId}@tableplaner`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

function download(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportIcs(data, identity, mode) {
  if (!data) return

  const myGameIds = new Set(
    data.seats
      .filter(s => s.playerId === identity.playerId)
      .map(s => s.gameId)
  )

  const games = mode === 'my'
    ? data.games.filter(g => myGameIds.has(g.gameId))
    : data.games

  const ics = buildIcs(games, data.seats, data.players)
  const filename = mode === 'my' ? 'my-games.ics' : 'all-games.ics'
  download(ics, filename, 'text/calendar')
}
