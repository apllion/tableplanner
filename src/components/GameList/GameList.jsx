import { useState } from 'react'
import GameCard from '../GameCard/GameCard.jsx'
import { getDayLabel } from '../../lib/event-days.js'
import styles from './GameList.module.css'

const STATUS_ORDER = { waiting: 0, playing: 1, finished: 2 }

function formatGameForCopy(game, seatCount) {
  const free = game.maxSeats - seatCount
  let line = `${game.name} (${free} free)`
  if (game.scheduledDay && game.scheduledTime) {
    line += ` — ${getDayLabel(game.scheduledDay)}, ${game.scheduledTime}`
    if (game.endTime) line += `–${game.endTime}`
  }
  if (game.table) line += ` @ ${game.table}`
  if (game.note) line += ` — ${game.note}`
  return line
}

export default function GameList({ games, seats, identity, onSelectGame, onCreateGame }) {
  const [freeOnly, setFreeOnly] = useState(false)
  const [copied, setCopied] = useState(false)

  const seatCounts = new Map()
  for (const s of seats) {
    seatCounts.set(s.gameId, (seatCounts.get(s.gameId) || 0) + 1)
  }

  const sorted = [...games].sort((a, b) => {
    const orderDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (orderDiff !== 0) return orderDiff
    const aScheduled = a.scheduledDay != null
    const bScheduled = b.scheduledDay != null
    if (aScheduled !== bScheduled) return aScheduled ? -1 : 1
    if (aScheduled && bScheduled) {
      if (a.scheduledDay !== b.scheduledDay) return a.scheduledDay - b.scheduledDay
      return (a.scheduledTime || '').localeCompare(b.scheduledTime || '')
    }
    return new Date(b.createdAt) - new Date(a.createdAt)
  })

  const filtered = freeOnly
    ? sorted.filter(g => (seatCounts.get(g.gameId) || 0) < g.maxSeats)
    : sorted

  function copyFreeGames() {
    const freeGames = sorted.filter(g => (seatCounts.get(g.gameId) || 0) < g.maxSeats)
    if (freeGames.length === 0) return
    const text = `Freie Spiele (${freeGames.length}):\n` +
      freeGames.map(g => `• ${formatGameForCopy(g, seatCounts.get(g.gameId) || 0)}`).join('\n') +
      `\n\nhttps://apllion.github.io/tableplanner/`
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const freeCount = sorted.filter(g => (seatCounts.get(g.gameId) || 0) < g.maxSeats).length

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button
          className={`${styles.filterBtn} ${freeOnly ? styles.filterActive : ''}`}
          onClick={() => setFreeOnly(f => !f)}
        >
          Free Seats {freeCount > 0 && <span className={styles.badge}>{freeCount}</span>}
        </button>
        {freeCount > 0 && (
          <button className={styles.copyBtn} onClick={copyFreeGames}>
            {copied ? 'Copied!' : 'Copy List'}
          </button>
        )}
      </div>
      {filtered.length === 0 && (
        <p className={styles.empty}>
          {freeOnly ? 'All games are full!' : 'No games yet. Create one to get started!'}
        </p>
      )}
      <div className={styles.list}>
        {filtered.map(game => {
          const seatCount = seatCounts.get(game.gameId) || 0
          const isMine = seats.some(s => s.gameId === game.gameId && s.playerId === identity?.playerId)
          return (
            <GameCard
              key={game.gameId}
              game={game}
              seatCount={seatCount}
              isMine={isMine}
              onClick={() => onSelectGame(game.gameId)}
            />
          )
        })}
      </div>
      <button className={styles.fab} onClick={onCreateGame} title="Create game">
        +
      </button>
    </div>
  )
}
