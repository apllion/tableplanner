import { getDayLabel, getTodayDayNumber, TOTAL_DAYS } from '../../lib/event-days.js'
import styles from './DayNav.module.css'

export default function DayNav({ currentDay, onDayChange }) {
  const todayNum = getTodayDayNumber()

  return (
    <div className={styles.nav}>
      <button
        className={styles.arrow}
        disabled={currentDay <= 1}
        onClick={() => onDayChange(currentDay - 1)}
        aria-label="Previous day"
      >
        &#8592;
      </button>
      <span className={styles.label}>{getDayLabel(currentDay)}</span>
      <button
        className={styles.arrow}
        disabled={currentDay >= TOTAL_DAYS}
        onClick={() => onDayChange(currentDay + 1)}
        aria-label="Next day"
      >
        &#8594;
      </button>
      <div className={styles.dots}>
        {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map(d => (
          <button
            key={d}
            className={`${styles.dot} ${d === currentDay ? styles.dotActive : ''} ${d === todayNum ? styles.dotToday : ''}`}
            onClick={() => onDayChange(d)}
            aria-label={`Tag ${d}`}
          />
        ))}
      </div>
    </div>
  )
}
