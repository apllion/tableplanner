import { useState } from 'react'
import Modal from '../Modal/Modal.jsx'
import SeatSlot from '../SeatSlot/SeatSlot.jsx'
import StatusDot from '../StatusDot/StatusDot.jsx'
import { getDayLabel, getDayDate } from '../../lib/event-days.js'
import styles from './GameDetail.module.css'

const STATUS_LABELS = {
  waiting: 'Waiting for players',
  playing: 'Game in progress',
  finished: 'Game finished',
}

export default function GameDetail({ game, seats, identity, api, onClose, onEdit }) {
  const [busy, setBusy] = useState(false)
  const [showReserve, setShowReserve] = useState(false)
  const [reserveName, setReserveName] = useState('')
  const [confirmAction, setConfirmAction] = useState(null) // { label, onConfirm }

  const isHost = game.hostId === identity.playerId
  const isSeated = seats.some(s => s.playerId === identity.playerId)
  const isFull = seats.length >= game.maxSeats

  const seatSlots = []
  for (let i = 0; i < game.maxSeats; i++) {
    seatSlots.push(seats[i] || null)
  }

  async function action(name, params) {
    setBusy(true)
    try {
      await api.call(name, { ...params, playerId: identity.playerId })
    } finally {
      setBusy(false)
    }
  }

  const playerRange =
    game.minPlayers && game.maxPlayers
      ? `${game.minPlayers}–${game.maxPlayers} players`
      : game.minPlayers
        ? `ab ${game.minPlayers} players`
        : game.maxPlayers
          ? `bis ${game.maxPlayers} players`
          : null

  return (
    <Modal title={game.name} onClose={onClose}>
      <div className={styles.statusRow}>
        <StatusDot status={game.status} />
        <span>{STATUS_LABELS[game.status]}</span>
      </div>

      {playerRange && <p className={styles.meta}>{playerRange}</p>}

      {game.scheduledDay && (
        <p className={styles.schedule}>
          {getDayLabel(game.scheduledDay)}
          {game.scheduledTime ? `, ${game.scheduledTime}` : ''}
          {game.endTime ? (game.endDay && game.endDay !== game.scheduledDay
            ? `–${getDayDate(game.endDay).toLocaleDateString('de-DE', { weekday: 'short' })} ${game.endTime}`
            : `–${game.endTime}`) : ''}
        </p>
      )}

      {game.table && <p className={styles.location}>{game.table}</p>}

      {game.note && <p className={styles.note}>{game.note}</p>}

      <div className={styles.seats}>
        <h3 className={styles.seatsTitle}>
          Seats ({seats.length}/{game.maxSeats})
        </h3>
        <div className={styles.seatList}>
          {seatSlots.map((seat, i) => (
            <SeatSlot
              key={seat?.seatId || `empty-${i}`}
              seat={seat}
              isCurrentPlayer={seat?.playerId === identity.playerId}
              isHost={isHost}
              onRemove={seat?.status === 'reserved' ? () => setConfirmAction({
                label: `Remove reservation for ${seat.playerName}?`,
                onConfirm: () => action('unreserveSeat', { gameId: game.gameId, seatId: seat.seatId }),
              }) : undefined}
            />
          ))}
        </div>
      </div>

      <div className={styles.actions}>
        {game.status === 'waiting' && !isSeated && !isFull && (
          <button
            className={styles.btnPrimary}
            disabled={busy}
            onClick={() => action('joinGame', { gameId: game.gameId })}
          >
            Join Game
          </button>
        )}
        {game.status === 'waiting' && isSeated && (
          <button
            className={styles.btnDanger}
            disabled={busy}
            onClick={() => setConfirmAction({
              label: 'Leave this game?',
              onConfirm: () => action('leaveGame', { gameId: game.gameId }),
            })}
          >
            Leave Game
          </button>
        )}
        {!isFull && game.status === 'waiting' && !showReserve && (
          <button
            className={styles.btnOutline}
            disabled={busy}
            onClick={() => setShowReserve(true)}
          >
            Reserve Seat
          </button>
        )}
        {showReserve && (
          <div className={styles.reserveForm}>
            <input
              type="text"
              className={styles.reserveInput}
              placeholder="Player name"
              value={reserveName}
              onChange={e => setReserveName(e.target.value)}
              maxLength={30}
              autoFocus
            />
            <div className={styles.reserveActions}>
              <button
                className={styles.btnPrimary}
                disabled={busy || !reserveName.trim()}
                onClick={async () => {
                  await action('reserveSeat', {
                    gameId: game.gameId,
                    playerName: reserveName.trim(),
                  })
                  setReserveName('')
                  setShowReserve(false)
                }}
              >
                Confirm
              </button>
              <button
                className={styles.btnOutline}
                onClick={() => setShowReserve(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {isHost && (
          <button
            className={styles.btnOutline}
            disabled={busy}
            onClick={() => onEdit(game)}
          >
            Edit Game
          </button>
        )}
        {isHost && (
          <button
            className={styles.btnDangerOutline}
            disabled={busy}
            onClick={() => setConfirmAction({
              label: 'Delete this game and all its seats?',
              onConfirm: async () => {
                await action('deleteGame', { gameId: game.gameId })
                onClose()
              },
            })}
          >
            Delete Game
          </button>
        )}
      </div>

      {confirmAction && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmBox}>
            <p className={styles.confirmLabel}>{confirmAction.label}</p>
            <div className={styles.confirmActions}>
              <button
                className={styles.btnDanger}
                disabled={busy}
                onClick={async () => {
                  await confirmAction.onConfirm()
                  setConfirmAction(null)
                }}
              >
                Yes
              </button>
              <button
                className={styles.btnOutline}
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
