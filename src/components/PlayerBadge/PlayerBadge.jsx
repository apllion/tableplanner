import StatusDot from '../StatusDot/StatusDot.jsx'
import { isAway } from '../../lib/time.js'
import { timeAgo } from '../../lib/time.js'
import styles from './PlayerBadge.module.css'

export default function PlayerBadge({ player, isYou }) {
  const away = isAway(player.lastSeen)
  const status = away ? 'away' : 'active'

  return (
    <div className={styles.badge}>
      <StatusDot status={status} />
      <span className={`${styles.name} ${isYou ? styles.you : ''}`}>
        {player.displayName}{isYou ? ' (you)' : ''}
      </span>
      <span className={styles.time}>
        {away ? timeAgo(player.lastSeen) : 'online'}
      </span>
    </div>
  )
}
