import * as XLSX from 'xlsx'
import { getDayLabel } from './event-days.js'

export function exportXls(data) {
  if (!data) return

  const playersById = new Map()
  for (const p of data.players) playersById.set(p.playerId, p)

  const gameRows = data.games.map(game => {
    const seatCount = data.seats.filter(s => s.gameId === game.gameId).length
    const host = playersById.get(game.hostId)
    const players = data.seats
      .filter(s => s.gameId === game.gameId)
      .map(s => s.playerName)
      .join(', ')

    return {
      Name: game.name,
      Day: game.scheduledDay ? getDayLabel(game.scheduledDay) : '',
      Start: game.scheduledTime || '',
      End: game.endTime || '',
      Table: game.table || '',
      Seats: `${seatCount}/${game.maxSeats}`,
      Host: host?.displayName || '',
      Players: players,
      Note: game.note || '',
    }
  })

  const playerRows = data.players.map(p => ({
    Name: p.displayName,
    Status: p.status,
    Joined: p.joinedAt,
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(gameRows), 'Games')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(playerRows), 'Players')
  XLSX.writeFile(wb, 'hexacon-games.xlsx')
}
