import styles from './SeatSlot.module.css'

export default function SeatSlot({ seat, isCurrentPlayer, isHost, onRemove }) {
  const isReserved = seat?.status === 'reserved'

  return (
    <div className={`${styles.slot} ${seat ? (isReserved ? styles.reserved : styles.filled) : styles.empty}`}>
      {seat ? (
        <div className={styles.seatContent}>
          <div className={styles.seatMain}>
            <span className={isCurrentPlayer ? styles.you : ''}>
              {seat.playerName}{isCurrentPlayer ? ' (you)' : ''}
            </span>
            {isReserved && <span className={styles.reservedBadge}>reserved</span>}
          </div>
          {seat.note && <span className={styles.seatNote}>{seat.note}</span>}
          {isReserved && onRemove && (
            <button className={styles.removeBtn} onClick={onRemove} title="Remove reservation">x</button>
          )}
        </div>
      ) : (
        <span className={styles.emptyLabel}>Empty seat</span>
      )}
    </div>
  )
}
