import PlayerBadge from '../PlayerBadge/PlayerBadge.jsx'
import { isAway } from '../../lib/time.js'
import styles from './PlayerList.module.css'

export default function PlayerList({ players, identity }) {
  const sorted = [...players].sort((a, b) => {
    const aAway = isAway(a.lastSeen)
    const bAway = isAway(b.lastSeen)
    if (aAway !== bAway) return aAway ? 1 : -1
    return a.displayName.localeCompare(b.displayName)
  })

  return (
    <div className={styles.container}>
      {sorted.length === 0 && (
        <p className={styles.empty}>No players have joined yet.</p>
      )}
      <div className={styles.list}>
        {sorted.map(player => (
          <PlayerBadge
            key={player.playerId}
            player={player}
            isYou={player.playerId === identity.playerId}
          />
        ))}
      </div>
    </div>
  )
}
