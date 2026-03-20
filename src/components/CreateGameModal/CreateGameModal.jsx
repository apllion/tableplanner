import { useState } from 'react'
import Modal from '../Modal/Modal.jsx'
import { getDayLabel, TOTAL_DAYS } from '../../lib/event-days.js'
import styles from './CreateGameModal.module.css'

const TIME_OPTIONS = []
for (let h = 8; h <= 23; h++) {
  for (const m of [0, 15, 30, 45]) {
    if (h === 23 && m > 0) break
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
}

export default function CreateGameModal({ identity, api, onClose, initialDay, initialHour, editGame }) {
  const [name, setName] = useState(editGame?.name || '')
  const [minPlayers, setMinPlayers] = useState(editGame?.minPlayers ?? 1)
  const [maxPlayers, setMaxPlayers] = useState(editGame?.maxPlayers ?? 2)
  const [note, setNote] = useState(editGame?.note || '')
  const [table, setTable] = useState(editGame?.table || '')
  const [scheduledDay, setScheduledDay] = useState(
    editGame?.scheduledDay ? String(editGame.scheduledDay) : initialDay ? String(initialDay) : ''
  )
  const [scheduledTime, setScheduledTime] = useState(
    editGame?.scheduledTime
      ? editGame.scheduledTime
      : initialHour != null ? `${String(initialHour).padStart(2, '0')}:00` : ''
  )
  const [endTime, setEndTime] = useState(editGame?.endTime || '')
  const [endDay, setEndDay] = useState(
    editGame?.endDay ? String(editGame.endDay) : ''
  )
  const [reservedNames, setReservedNames] = useState([])
  const [reserveInput, setReserveInput] = useState('')
  const [busy, setBusy] = useState(false)

  const isEdit = !!editGame

  const minP = minPlayers ? Number(minPlayers) : null
  const maxP = maxPlayers ? Number(maxPlayers) : null
  const nameOk = name.trim().length >= 1
  const maxPOk = maxP && maxP >= 2 && maxP <= 20
  const minMaxOk = (!minP || !maxP || minP <= maxP)
  const valid = nameOk && maxPOk && minMaxOk

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    try {
      const params = {
        playerId: identity.playerId,
        name: name.trim(),
        minPlayers: minPlayers ? Number(minPlayers) : null,
        maxPlayers: maxPlayers ? Number(maxPlayers) : null,
        maxSeats: maxPlayers ? Number(maxPlayers) : null,
        note: note.trim() || null,
        scheduledDay: scheduledDay ? Number(scheduledDay) : null,
        scheduledTime: scheduledTime || null,
        table: table.trim() || null,
        endTime: endTime || null,
        endDay: endDay ? Number(endDay) : null,
      }
      if (isEdit) params.gameId = editGame.gameId
      const result = await api.call(isEdit ? 'editGame' : 'createGame', params)
      if (result.ok) {
        if (!isEdit && result.gameId && reservedNames.length > 0) {
          for (const rn of reservedNames) {
            await api.call('reserveSeat', {
              playerId: identity.playerId,
              gameId: result.gameId,
              playerName: rn,
            })
          }
        }
        onClose()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Game' : 'Create Game'} onClose={onClose}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.label}>
          Game Name
          <input
            type="text"
            className={styles.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Wooden Ships and Iron Men"
            autoFocus
            maxLength={60}
          />
        </label>

        <div className={styles.row}>
          <label className={styles.label}>
            Min Players
            <input
              type="number"
              className={styles.input}
              value={minPlayers}
              onChange={e => setMinPlayers(e.target.value)}
              placeholder="—"
              min={1}
              max={20}
            />
          </label>
          <label className={styles.label}>
            Max Players
            <input
              type="number"
              className={styles.input}
              value={maxPlayers}
              onChange={e => setMaxPlayers(e.target.value)}
              placeholder="—"
              min={1}
              max={20}
            />
          </label>
        </div>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Start</legend>
          <div className={styles.row}>
            <label className={styles.label}>
              Day
              <select
                className={styles.select}
                value={scheduledDay}
                onChange={e => {
                  setScheduledDay(e.target.value)
                  if (!endDay) setEndDay(e.target.value)
                }}
              >
                <option value="">Spontaneous</option>
                {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{getDayLabel(d)}</option>
                ))}
              </select>
            </label>
            <label className={styles.label}>
              Time
              <select
                className={styles.select}
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
              >
                <option value="">—</option>
                {TIME_OPTIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        {scheduledDay && (
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>End</legend>
            <div className={styles.row}>
              <label className={styles.label}>
                Day
                <select
                  className={styles.select}
                  value={endDay || scheduledDay}
                  onChange={e => setEndDay(e.target.value)}
                >
                  {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1)
                    .filter(d => d >= Number(scheduledDay))
                    .map(d => (
                      <option key={d} value={d}>{getDayLabel(d)}</option>
                    ))}
                </select>
              </label>
              <label className={styles.label}>
                Time
                <select
                  className={styles.select}
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                >
                  <option value="">—</option>
                  {TIME_OPTIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>
        )}

        <label className={styles.label}>
          Table / Location (optional)
          <input
            type="text"
            className={styles.input}
            value={table}
            onChange={e => setTable(e.target.value)}
            placeholder="e.g. Tisch 5"
            maxLength={40}
          />
        </label>

        <label className={styles.label}>
          Note (optional)
          <input
            type="text"
            className={styles.input}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Beginners welcome!"
            maxLength={100}
          />
        </label>

        {!isEdit && (
          <div className={styles.reserveSection}>
            <span className={styles.label}>Reserve Seats</span>
            {reservedNames.map((rn, i) => (
              <div key={i} className={styles.reservedName}>
                <span>{rn}</span>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => setReservedNames(reservedNames.filter((_, j) => j !== i))}
                >
                  x
                </button>
              </div>
            ))}
            <div className={styles.reserveRow}>
              <input
                type="text"
                className={styles.input}
                placeholder="Player name"
                value={reserveInput}
                onChange={e => setReserveInput(e.target.value)}
                maxLength={30}
                onKeyDown={e => {
                  if (e.key === 'Enter' && reserveInput.trim()) {
                    e.preventDefault()
                    setReservedNames([...reservedNames, reserveInput.trim()])
                    setReserveInput('')
                  }
                }}
              />
              <button
                type="button"
                className={styles.addBtn}
                disabled={!reserveInput.trim()}
                onClick={() => {
                  setReservedNames([...reservedNames, reserveInput.trim()])
                  setReserveInput('')
                }}
              >
                +
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          className={styles.submit}
          disabled={!valid || busy}
        >
          {busy ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Game')}
        </button>
      </form>
    </Modal>
  )
}
