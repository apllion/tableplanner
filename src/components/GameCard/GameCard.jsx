import StatusDot from '../StatusDot/StatusDot.jsx'
import { timeAgo } from '../../lib/time.js'
import { getDayDate } from '../../lib/event-days.js'
import styles from './GameCard.module.css'

const STATUS_LABELS = {
  waiting: 'Waiting',
  playing: 'Playing',
  finished: 'Finished',
}

function formatTimeRange(game) {
  if (!game.scheduledDay) return timeAgo(game.createdAt)
  if (!game.scheduledTime) return `Tag ${game.scheduledDay}`

  const d = getDayDate(game.scheduledDay)
  const weekday = d.toLocaleDateString('de-DE', { weekday: 'short' })
  let label = `Tag ${game.scheduledDay} · ${weekday}`
  if (game.scheduledTime) label += `, ${game.scheduledTime}`

  if (game.endTime) {
    if (game.endDay && game.endDay !== game.scheduledDay) {
      const ed = getDayDate(game.endDay)
      const ewd = ed.toLocaleDateString('de-DE', { weekday: 'short' })
      label += `–${ewd} ${game.endTime}`
    } else {
      label += `–${game.endTime}`
    }
  }

  return label
}

export default function GameCard({ game, seatCount, isMine, onClick }) {
  return (
    <button className={`${styles.card} ${isMine ? styles.mine : ''}`} onClick={onClick}>
      <div className={styles.top}>
        <span className={styles.gameName}>{game.name}</span>
        <span className={styles.badge}>
          <StatusDot status={game.status} />
          {STATUS_LABELS[game.status]}
        </span>
      </div>
      <div className={styles.bottom}>
        <span className={styles.seats}>
          {seatCount}/{game.maxSeats} seats
          {game.minPlayers && game.maxPlayers && ` (${game.minPlayers}–${game.maxPlayers}p)`}
        </span>
        {game.table && <span className={styles.table}>{game.table}</span>}
        {game.note && <span className={styles.note}>{game.note}</span>}
        <span className={styles.time}>{formatTimeRange(game)}</span>
      </div>
    </button>
  )
}
