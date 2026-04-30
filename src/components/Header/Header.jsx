import { useState, useRef, useEffect } from 'react'
import styles from './Header.module.css'

const API_URL = import.meta.env.VITE_API_URL
const BACKEND = API_URL ? 'prod' : (import.meta.env.DEV ? 'local' : 'prod')

export default function Header({ identity, playerCount, onLeave, onExport }) {
  const [showCode, setShowCode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showBackend, setShowBackend] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const menuRef = useRef()
  const shortCode = identity.playerId.split('-')[0]

  useEffect(() => {
    if (!showExportMenu) return
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showExportMenu])

  function copyRejoinLink() {
    const url = `${window.location.origin}${window.location.pathname}?rejoin=${identity.playerId}`
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleExport(type) {
    setShowExportMenu(false)
    onExport?.(type)
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
        {onExport && (
          <div className={styles.exportWrap} ref={menuRef}>
            <button
              className={styles.exportBtn}
              onClick={() => setShowExportMenu(s => !s)}
              title="Export"
            >
              Export
            </button>
            {showExportMenu && (
              <div className={styles.exportMenu}>
                <div className={styles.exportGroup}>Export</div>
                <button onClick={() => handleExport('pdf')}>PDF Schedule</button>
                <button onClick={() => handleExport('xls')}>Excel (XLS)</button>
                <button onClick={() => handleExport('ics-my')}>ICS My Games</button>
                <button onClick={() => handleExport('ics-all')}>ICS All Games</button>
                <div className={styles.exportGroup}>Copy to Clipboard</div>
                <button onClick={() => handleExport('copy-all')}>All Games</button>
                <button onClick={() => handleExport('copy-my')}>My Games</button>
                <button onClick={() => handleExport('copy-free')}>Free Seats</button>
              </div>
            )}
          </div>
        )}
        <a className={styles.helpBtn} href="help.html" title="Hilfe">?</a>
        <button className={styles.leaveBtn} onClick={onLeave} title="Leave event">
          &times;
        </button>
      </div>
    </header>
  )
}
