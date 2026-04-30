import GameCard from '../GameCard/GameCard.jsx'
import styles from './GameList.module.css'

const STATUS_ORDER = { waiting: 0, playing: 1, finished: 2 }

export default function GameList({ games, seats, identity, onSelectGame, onCreateGame }) {
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

  return (
    <div className={styles.container}>
      {sorted.length === 0 && (
        <p className={styles.empty}>No games yet. Create one to get started!</p>
      )}
      <div className={styles.list}>
        {sorted.map(game => {
          const isMine = seats.some(s => s.gameId === game.gameId && s.playerId === identity?.playerId)
          return (
            <GameCard
              key={game.gameId}
              game={game}
              seatCount={seats.filter(s => s.gameId === game.gameId).length}
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
