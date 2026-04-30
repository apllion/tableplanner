import { jsPDF } from 'jspdf'
import { getDayLabel, TOTAL_DAYS } from './event-days.js'

const PAGE_WIDTH = 210
const MARGIN = 15
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const LINE_HEIGHT = 5.5
const SECTION_GAP = 8
const DAY_GAP = 6

function formatTimeRange(game) {
  if (!game.scheduledTime) return null
  let range = game.scheduledTime
  if (game.endTime) range += `–${game.endTime}`
  return range
}

function groupByDay(games) {
  const days = new Map()
  for (const game of games) {
    const day = game.scheduledDay || 0
    if (!days.has(day)) days.set(day, [])
    days.get(day).push(game)
  }
  // Sort each day's games by time, then name
  for (const [, list] of days) {
    list.sort((a, b) => {
      if (a.scheduledTime && b.scheduledTime) return a.scheduledTime.localeCompare(b.scheduledTime)
      if (a.scheduledTime) return -1
      if (b.scheduledTime) return 1
      return a.name.localeCompare(b.name)
    })
  }
  // Sort days: numbered days first, then unscheduled (0)
  return [...days.entries()].sort((a, b) => {
    if (a[0] === 0) return 1
    if (b[0] === 0) return -1
    return a[0] - b[0]
  })
}

function ensureSpace(doc, y, needed) {
  if (y + needed > 280) {
    doc.addPage()
    return MARGIN
  }
  return y
}

function drawSection(doc, title, dayGroups, seatsByGame, playersById, startY) {
  let y = startY

  // Section title
  y = ensureSpace(doc, y, 12)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(title, MARGIN, y)
  y += 2
  doc.setDrawColor(80, 80, 80)
  doc.setLineWidth(0.5)
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
  y += SECTION_GAP

  if (dayGroups.length === 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(120, 120, 120)
    doc.text('No games', MARGIN, y)
    doc.setTextColor(0, 0, 0)
    y += LINE_HEIGHT * 2
    return y
  }

  for (const [dayNum, games] of dayGroups) {
    // Day header
    y = ensureSpace(doc, y, 14)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    const dayLabel = dayNum === 0 ? 'Unscheduled' : getDayLabel(dayNum)
    doc.text(dayLabel, MARGIN, y)
    y += 1
    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
    y += LINE_HEIGHT
    doc.setTextColor(0, 0, 0)

    // Games
    for (const game of games) {
      const noteLines = game.note ? doc.splitTextToSize(game.note, CONTENT_WIDTH - 5) : []
      const neededHeight = LINE_HEIGHT + noteLines.length * (LINE_HEIGHT - 1)
      y = ensureSpace(doc, y, neededHeight)

      // Time
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      const time = formatTimeRange(game) || '—'
      doc.text(time, MARGIN, y)

      // Name
      doc.setFont('helvetica', 'bold')
      const nameX = MARGIN + 32
      const maxNameWidth = 75
      const name = doc.splitTextToSize(game.name, maxNameWidth)[0]
      doc.text(name, nameX, y)

      // Seats — highlight if free spots available
      const seatCount = seatsByGame.get(game.gameId) || 0
      const freeSeats = game.maxSeats - seatCount
      const seatsX = MARGIN + 110
      if (freeSeats > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(34, 139, 34)
        // Draw open circle for free seats (BW-friendly)
        doc.setDrawColor(34, 139, 34)
        doc.setLineWidth(0.4)
        doc.circle(seatsX + 1.5, y - 1.2, 1.5)
        doc.text(`${seatCount}/${game.maxSeats}`, seatsX + 5, y)
      } else {
        doc.setFont('helvetica', 'normal')
        // Draw filled circle for full
        doc.setFillColor(100, 100, 100)
        doc.circle(seatsX + 1.5, y - 1.2, 1.5, 'F')
        doc.text(`${seatCount}/${game.maxSeats}`, seatsX + 5, y)
      }
      doc.setTextColor(0, 0, 0)
      doc.setDrawColor(0, 0, 0)

      // Table
      if (game.table) {
        doc.setFont('helvetica', 'normal')
        doc.text(game.table, MARGIN + 125, y)
      }

      // Host name
      const host = playersById.get(game.hostId)
      if (host) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(120, 120, 120)
        doc.text(host.displayName, MARGIN + 145, y)
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(9)
      }

      y += LINE_HEIGHT

      // Note
      if (noteLines.length > 0) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(100, 100, 100)
        for (const line of noteLines) {
          y = ensureSpace(doc, y, LINE_HEIGHT)
          doc.text(line, MARGIN + 5, y)
          y += LINE_HEIGHT - 1
        }
        doc.setTextColor(0, 0, 0)
      }
    }

    y += DAY_GAP
  }

  return y
}

export function exportCalendarPdf(data, identity) {
  if (!data) return

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // Build seat counts
  const seatsByGame = new Map()
  for (const seat of data.seats) {
    seatsByGame.set(seat.gameId, (seatsByGame.get(seat.gameId) || 0) + 1)
  }

  // Build player lookup
  const playersById = new Map()
  for (const p of data.players) {
    playersById.set(p.playerId, p)
  }

  // Player's game IDs
  const myGameIds = new Set(
    data.seats
      .filter(s => s.playerId === identity.playerId)
      .map(s => s.gameId)
  )

  // Filter scheduled games (have a day set)
  const allGames = data.games
  const myGames = allGames.filter(g => myGameIds.has(g.gameId))

  const myDayGroups = groupByDay(myGames)
  const allDayGroups = groupByDay(allGames)

  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Hexacon XXXVIII', MARGIN, MARGIN + 5)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`${identity.displayName} — ${new Date().toLocaleDateString('de-DE')}`, MARGIN, MARGIN + 11)
  doc.setTextColor(0, 0, 0)

  let y = MARGIN + 20

  // My Games section
  y = drawSection(doc, 'My Games', myDayGroups, seatsByGame, playersById, y)
  y += 4

  // All Games section — start on new page
  doc.addPage()
  y = MARGIN
  y = drawSection(doc, 'All Games', allDayGroups, seatsByGame, playersById, y)

  doc.save('hexacon-schedule.pdf')
}
