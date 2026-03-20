import styles from './CalendarViewToggle.module.css'

export default function CalendarViewToggle({ viewMode, onViewModeChange }) {
  return (
    <div className={styles.toggle}>
      <button
        className={`${styles.btn} ${viewMode === 'my' ? styles.active : ''}`}
        onClick={() => onViewModeChange('my')}
      >
        My Games
      </button>
      <button
        className={`${styles.btn} ${viewMode === 'all' ? styles.active : ''}`}
        onClick={() => onViewModeChange('all')}
      >
        All Games
      </button>
    </div>
  )
}
