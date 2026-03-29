import { useState, useEffect } from 'react'
import { PASSPHRASE_QUESTION, PASSPHRASE_ANSWER } from '../../lib/auth-config.js'
import { loadIdentity } from '../../lib/storage.js'
import styles from './JoinScreen.module.css'

export default function JoinScreen({ onJoin, onRejoin, onActivate }) {
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [check1, setCheck1] = useState(false)
  const [check2, setCheck2] = useState(false)
  const [check3, setCheck3] = useState(false)
  const [showImpressum, setShowImpressum] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [mode, setMode] = useState('join')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [registeredIdentity, setRegisteredIdentity] = useState(null)
  const [copied, setCopied] = useState(false)

  // Auto-fill rejoin from URL parameter or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const rejoinId = params.get('rejoin')
    if (rejoinId) {
      setCode(rejoinId)
    } else {
      const saved = loadIdentity()
      if (saved?.playerId) {
        setCode(saved.playerId)
      }
    }
  }, [])

  const validJoin = name.trim().length >= 2 && passphrase.trim().length > 0
  const validRejoin = code.trim().length >= 4

  function checkPassphrase() {
    return passphrase.trim().toLowerCase() === PASSPHRASE_ANSWER.trim().toLowerCase()
  }

  async function handleJoinSubmit(e) {
    e.preventDefault()
    if (submitting || !validJoin) return
    setError(null)

    if (!checkPassphrase()) {
      setError('Wrong answer — try again!')
      return
    }

    setSubmitting(true)
    try {
      const newIdentity = await onJoin(name.trim(), passphrase.trim())
      setRegisteredIdentity(newIdentity)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRejoinSubmit(e) {
    e.preventDefault()
    if (submitting || !validRejoin) return
    setError(null)
    setSubmitting(true)
    try {
      await onRejoin(code.trim())
      const url = new URL(window.location.href)
      url.searchParams.delete('rejoin')
      window.history.replaceState({}, '', url.pathname + url.search)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (registeredIdentity) {
    const rejoinLink = `${window.location.origin}${window.location.pathname}?rejoin=${registeredIdentity.playerId}`
    return (
      <div className={styles.screen}>
        <div className={styles.card}>
          <h1 className={styles.title}>Welcome, {registeredIdentity.displayName}!</h1>
          <p className={styles.subtitle}>Save your player code or bookmark the link below to rejoin on any device.</p>
          <div className={styles.codeBox}>
            <label className={styles.codeLabel}>Your player code</label>
            <code className={styles.code}>{registeredIdentity.playerId}</code>
          </div>
          <div className={styles.codeBox}>
            <label className={styles.codeLabel}>Quick rejoin link</label>
            <a href={rejoinLink} className={styles.code}>{rejoinLink}</a>
          </div>
          <div className={styles.linkActions}>
            <button
              className={styles.buttonOutline}
              onClick={() => {
                navigator.clipboard.writeText(rejoinLink)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            {navigator.share && (
              <button
                className={styles.buttonOutline}
                onClick={() => navigator.share({ title: 'Hexacon XXXVIII', text: 'My rejoin link', url: rejoinLink })}
              >
                Share
              </button>
            )}
          </div>
          <button
            className={styles.button}
            onClick={() => onActivate(registeredIdentity)}
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  if (!disclaimerAccepted) {
    return (
      <div className={styles.screen}>
        <div className={styles.card}>
          <h1 className={styles.title}>Hexacon XXXVIII</h1>
          <p className={styles.subtitle}>Braunfels, 8.–17. Mai 2026</p>

          <div className={styles.disclaimerText}>
            <h3>1. Haftungsausschluss (Legal Disclaimer)</h3>
            <p><strong>Deutsch</strong></p>
            <p>Haftungsausschluss: Dies ist ein privates Hobby-Projekt, das ausschließlich im Zeitraum von zwei Monaten vor bis zum Ende des Vereinstreffens zur Verfügung steht. Die Inhalte werden „wie besehen" bereitgestellt. Ich übernehme keinerlei Gewährleistung oder Haftung für Schäden, die durch die Nutzung entstehen könnten. Die Nutzung erfolgt auf eigene Gefahr.</p>
            <p><strong>English</strong></p>
            <p><em>Disclaimer: This is a private hobby project available only during the period starting two months before and ending with the association meeting. All features are provided on an "as is" basis. The author shall not be held liable for any damages arising from the use of this project. Use at your own risk.</em></p>

            <h3>2. Technischer Hinweis (Technical Disclaimer)</h3>
            <p><strong>Deutsch</strong></p>
            <p>Technik &amp; Performance: Dieses Projekt nutzt frei zugängliche Dienste (GitHub und Google Drive). Da für diesen begrenzten Zeitraum keine dedizierte Datenbank eingesetzt wird, ist die Datenverarbeitung (Speichern/Laden) langsam. Bitte haben Sie Geduld – jeder Klick benötigt einen Moment Zeit.</p>
            <p><strong>English</strong></p>
            <p><em>Technical Note: This project relies on free-to-use services (GitHub and Google Drive). Since no dedicated database is used for this short-term setup, data processing is slow. We appreciate your patience—each interaction may take a few moments.</em></p>

            <h3>3. Datenschutz (GDPR / DSGVO)</h3>
            <p><strong>Deutsch</strong></p>
            <p>Datenschutz: Dieses Projekt ist nicht-kommerziell und nur per Vereins-Passphrase zugänglich.</p>
            <p>Speicherung: Mit der Eingabe Ihres Namens willigen Sie ein, dass dieser in einem Google Sheet gespeichert wird.</p>
            <p>Zeitrahmen: Die Anwendung und alle darin gespeicherten Namen werden unmittelbar nach Ende des Vereinstreffens vollständig gelöscht.</p>
            <p>Drittanbieter: Infrastruktur durch GitHub/Google (technisch bedingte Verarbeitung der IP-Adresse).</p>
            <p>Nach der Löschung der aktiven Daten können diese technisch bedingt noch für einen begrenzten Zeitraum in den systemseitigen Backups der Dienstanbieter (Google/GitHub) verbleiben, auf die der Autor keinen Zugriff hat.</p>
            <p><strong>English</strong></p>
            <p><em>Privacy Policy: This is a non-commercial project accessible only via the association's passphrase.</em></p>
            <p><em>Data Storage: By entering your name, you consent to it being stored in a Google Sheet.</em></p>
            <p><em>Timeline: This application and all stored names will be permanently deleted immediately after the association meeting ends.</em></p>
            <p><em>Third-Party: Hosted via GitHub/Google (technical processing of IP addresses).</em></p>
            <p><em>After the deletion of active data, traces may remain in the service providers' (Google/GitHub) system backups for a limited time. The author has no access to or control over these backups.</em></p>

          </div>

          <button type="button" className={styles.impressumLink} onClick={() => setShowImpressum(true)}>
            Impressum
          </button>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={check1} onChange={e => setCheck1(e.target.checked)} />
              <span>Ich nutze die App auf eigene Gefahr (verfügbar bis Ende des Treffens).</span>
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={check2} onChange={e => setCheck2(e.target.checked)} />
              <span>Ich akzeptiere die langsamen Ladezeiten durch die Google Drive/GitHub-Anbindung.</span>
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={check3} onChange={e => setCheck3(e.target.checked)} />
              <span>Ich willige in die befristete Speicherung meines Namens ein (Löschung direkt nach dem Treffen).</span>
            </label>
          </div>

          <button
            className={styles.button}
            disabled={!check1 || !check2 || !check3}
            onClick={() => setDisclaimerAccepted(true)}
          >
            Accept & Continue
          </button>
        </div>

        {showImpressum && (
          <div className={styles.modalOverlay} onClick={() => setShowImpressum(false)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
              <h2 className={styles.modalTitle}>Impressum</h2>
              <p><strong>Angaben gemäß § 5 TMG</strong></p>
              <p>Karsten Droste<br />
              Tannenstraße 43<br />
              67655 Kaiserslautern</p>
              <p><strong>Kontakt</strong><br />
              E-Mail: spieldroesig@gmail.com</p>
              <p><strong>Hinweis</strong><br />
              Privates, nicht-kommerzielles Hobby-Projekt. Keine Abmahnungen ohne vorherigen Kontakt.</p>
              <button className={styles.button} onClick={() => setShowImpressum(false)}>Close</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <h1 className={styles.title}>Hexacon XXXVIII</h1>
        <p className={styles.subtitle}>Braunfels, 8.–17. Mai 2026</p>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.dualPane}>
          <form onSubmit={handleJoinSubmit} className={styles.pane}>
            <h2 className={styles.paneTitle}>New Player</h2>
            <input
              type="text"
              className={styles.input}
              placeholder="Your display name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={30}
            />
            <div className={styles.passphraseGroup}>
              <label className={styles.passphraseLabel}>{PASSPHRASE_QUESTION}</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Your answer"
                value={passphrase}
                onChange={e => { setPassphrase(e.target.value); setError(null) }}
                maxLength={100}
              />
            </div>
            <button
              type="submit"
              className={styles.button}
              disabled={!validJoin || submitting}
            >
              {submitting ? 'Joining...' : 'Join Event'}
            </button>
          </form>

          <div className={styles.divider}>
            <span className={styles.dividerText}>or</span>
          </div>

          <form onSubmit={handleRejoinSubmit} className={styles.pane}>
            <h2 className={styles.paneTitle}>Returning Player</h2>
            <input
              type="text"
              className={styles.input}
              placeholder="Your player code"
              value={code}
              onChange={e => setCode(e.target.value)}
              maxLength={50}
            />
            <button
              type="submit"
              className={styles.buttonOutline}
              disabled={!validRejoin || submitting}
            >
              {submitting ? 'Rejoining...' : 'Rejoin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
