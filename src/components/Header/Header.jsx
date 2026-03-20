import { useState } from 'react'
import styles from './Header.module.css'

export default function Header({ identity, playerCount, onLeave }) {
  const [showCode, setShowCode] = useState(false)
  const [copied, setCopied] = useState(false)
  const shortCode = identity.playerId.split('-')[0]

  function copyRejoinLink() {
    const url = `${window.location.origin}${window.location.pathname}?rejoin=${identity.playerId}`
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <span className={styles.logo}>Hexacon XXXVIII</span>
      </div>
      <div className={styles.right}>
        <span className={styles.playerCount}>{playerCount} online</span>
        <button
          className={styles.name}
          onClick={() => {
            setShowCode(s => !s)
            if (!showCode) {
              copyRejoinLink()
            }
          }}
          title={showCode ? (copied ? 'Rejoin link copied!' : identity.playerId) : 'Copy rejoin link'}
        >
          {identity.displayName}
          {showCode && <span className={styles.code}>{copied ? 'copied!' : shortCode}</span>}
        </button>
        <button className={styles.leaveBtn} onClick={onLeave} title="Leave event">
          &times;
        </button>
      </div>
    </header>
  )
}
