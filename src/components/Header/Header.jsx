import { useState } from 'react'
import styles from './Header.module.css'

const API_URL = import.meta.env.VITE_API_URL
const BACKEND = API_URL ? 'prod' : (import.meta.env.DEV ? 'local' : 'prod')

export default function Header({ identity, playerCount, onLeave, onExportPdf }) {
  const [showCode, setShowCode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showBackend, setShowBackend] = useState(false)
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
        <span className={styles.logo} onClick={() => setShowBackend(s => !s)}>
          Hexacon XXXVIII
          {showBackend && <span className={styles.backendTag}>{BACKEND}</span>}
        </span>
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
        {onExportPdf && (
          <button className={styles.pdfBtn} onClick={onExportPdf} title="Download PDF schedule">
            PDF
          </button>
        )}
        <button className={styles.leaveBtn} onClick={onLeave} title="Leave event">
          &times;
        </button>
      </div>
    </header>
  )
}
