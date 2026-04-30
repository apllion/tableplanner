import styles from './CalendarGameCard.module.css'

export default function CalendarGameCard({ game, seatCount, overlapColor, isMine, onClick }) {
  const colorMap = { red: styles.overlapRed, yellow: styles.overlapYellow, green: styles.overlapGreen }
  const overlapClass = overlapColor ? colorMap[overlapColor] || '' : ''

  return (
    <button className={`${styles.card} ${overlapClass} ${isMine ? styles.mine : ''}`} onClick={onClick}>
      <span className={styles.time}>{game.scheduledTime}{game.endTime ? `–${game.endTime}` : ''}</span>
      <span className={styles.game}>{game.name}</span>
      {game.note && <span className={styles.note}>{game.note}</span>}
      <span className={styles.info}>
        {seatCount}/{game.maxSeats}
      </span>
    </button>
  )
}
