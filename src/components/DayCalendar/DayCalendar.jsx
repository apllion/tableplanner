import CalendarGameCard from '../CalendarGameCard/CalendarGameCard.jsx'
import styles from './DayCalendar.module.css'

const START_HOUR = 8
const END_HOUR = 23
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)
const ROW_HEIGHT = 60

function timeFrac(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h + m / 60
}

function getStartFrac(game) {
  return timeFrac(game.scheduledTime)
}

function getSpanHours(game) {
  if (!game.endTime) return 1
  let diff = timeFrac(game.endTime) - timeFrac(game.scheduledTime)
  if (game.endDay && game.endDay > game.scheduledDay) {
    diff += (game.endDay - game.scheduledDay) * 24
  } else if (diff <= 0) {
    diff += 24 // crosses midnight, no endDay specified
  }
  return diff
}

function computeLanes(games) {
  if (games.length === 0) return new Map()

  const sorted = [...games].sort((a, b) => {
    const diff = getStartFrac(a) - getStartFrac(b)
    if (diff !== 0) return diff
    return getSpanHours(b) - getSpanHours(a)
  })

  // Find connected overlap groups
  const groups = []
  let group = [sorted[0]]
  let groupEnd = getStartFrac(sorted[0]) + getSpanHours(sorted[0])

  for (let i = 1; i < sorted.length; i++) {
    const g = sorted[i]
    const start = getStartFrac(g)
    if (start < groupEnd) {
      group.push(g)
      groupEnd = Math.max(groupEnd, start + getSpanHours(g))
    } else {
      groups.push(group)
      group = [g]
      groupEnd = start + getSpanHours(g)
    }
  }
  groups.push(group)

  // Assign lanes within each group
  const result = new Map()

  for (const grp of groups) {
    const lanes = [] // end-hour per lane
    for (const g of grp) {
      const start = getStartFrac(g)
      const end = start + getSpanHours(g)
      let idx = lanes.findIndex(laneEnd => laneEnd <= start)
      if (idx === -1) {
        idx = lanes.length
        lanes.push(0)
      }
      lanes[idx] = end
      result.set(g.gameId, { lane: idx, totalLanes: 0 })
    }
    const total = lanes.length
    for (const g of grp) {
      result.get(g.gameId).totalLanes = total
    }
  }

  return result
}

function computeOverlapColors(playerGames) {
  // For each game, compute worst overlap with any other game of the player
  const colors = new Map()
  for (const game of playerGames) {
    colors.set(game.gameId, 'green')
  }

  for (let i = 0; i < playerGames.length; i++) {
    for (let j = i + 1; j < playerGames.length; j++) {
      const a = playerGames[i]
      const b = playerGames[j]

      const aStart = getStartFrac(a)
      const aEnd = aStart + getSpanHours(a)
      const bStart = getStartFrac(b)
      const bEnd = bStart + getSpanHours(b)

      const overlapStart = Math.max(aStart, bStart)
      const overlapEnd = Math.min(aEnd, bEnd)
      const overlapHours = overlapEnd - overlapStart

      if (overlapHours <= 0) continue

      const color = overlapHours >= 1 ? 'red' : 'yellow'

      // Upgrade both games to worst color
      for (const game of [a, b]) {
        const current = colors.get(game.gameId)
        if (color === 'red') {
          colors.set(game.gameId, 'red')
        } else if (color === 'yellow' && current !== 'red') {
          colors.set(game.gameId, 'yellow')
        }
      }
    }
  }

  return colors
}

export default function DayCalendar({ games, seats, currentDay, onSelectGame, onCreateGame, viewMode, identity }) {
  const allDayGames = games.filter(g => g.scheduledDay === currentDay && g.scheduledTime)

  // Get the player's game IDs for this day
  const playerGameIds = new Set(
    seats
      .filter(s => identity && s.playerId === identity.playerId)
      .map(s => s.gameId)
  )
  const playerDayGames = allDayGames.filter(g => playerGameIds.has(g.gameId))

  // Filter based on view mode
  const dayGames = viewMode === 'my' ? playerDayGames : allDayGames

  // Compute overlap colors for the player's games
  const overlapColors = identity ? computeOverlapColors(playerDayGames) : new Map()

  const laneMap = computeLanes(dayGames)
  const hoursWithGames = new Set()
  dayGames.forEach(g => hoursWithGames.add(Math.floor(getStartFrac(g))))

  const GAP = 4
  const MIN_LANE_WIDTH = 120
  const maxLanes = dayGames.length > 0
    ? Math.max(...[...laneMap.values()].map(v => v.totalLanes))
    : 1
  const contentMinWidth = maxLanes > 3 ? maxLanes * MIN_LANE_WIDTH : undefined

  return (
    <div className={styles.wrapper}>
    <div className={styles.calendar} style={contentMinWidth ? { gridTemplateColumns: `52px ${contentMinWidth}px` } : undefined}>
      {HOURS.map(hour => (
        <div
          key={`label-${hour}`}
          className={styles.hourLabel}
          style={{ gridRow: hour - START_HOUR + 1 }}
        >
          {`${String(hour).padStart(2, '0')}:00`}
        </div>
      ))}

      <div
        className={styles.content}
        style={{
          gridColumn: 2,
          gridRow: `1 / span ${HOURS.length}`,
        }}
      >
        {HOURS.map(hour => (
          <div
            key={`slot-${hour}`}
            className={styles.slot}
            style={{
              top: (hour - START_HOUR) * ROW_HEIGHT,
              height: ROW_HEIGHT,
            }}
            onClick={() => onCreateGame(hour)}
          >
            {!hoursWithGames.has(hour) && (
              <span className={styles.empty}>+</span>
            )}
          </div>
        ))}

        {dayGames.map(game => {
          const startFrac = getStartFrac(game)
          const spanHours = Math.min(getSpanHours(game), END_HOUR + 1 - startFrac)
          const { lane, totalLanes } = laneMap.get(game.gameId)

          // Only show overlap color in "my" mode or when game belongs to player
          const overlapColor = viewMode === 'my' ? (overlapColors.get(game.gameId) || null) : null

          return (
            <div
              key={game.gameId}
              className={styles.gamePosition}
              style={{
                top: (startFrac - START_HOUR) * ROW_HEIGHT + GAP,
                height: spanHours * ROW_HEIGHT - GAP * 2,
                left: `calc(${(lane / totalLanes) * 100}% + ${GAP}px)`,
                width: `calc(${(1 / totalLanes) * 100}% - ${GAP * 2}px)`,
              }}
            >
              <CalendarGameCard
                game={game}
                seatCount={seats.filter(s => s.gameId === game.gameId).length}
                overlapColor={overlapColor}
                isMine={playerGameIds.has(game.gameId)}
                onClick={e => {
                  e.stopPropagation()
                  onSelectGame(game.gameId)
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
    </div>
  )
}
