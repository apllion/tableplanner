import { useState, useCallback } from 'react'
import { useIdentity } from './hooks/useIdentity.js'
import { useEventData } from './hooks/useEventData.js'
import { useApi } from './hooks/useApi.js'
import { getTodayDayNumber } from './lib/event-days.js'
import JoinScreen from './components/JoinScreen/JoinScreen.jsx'
import Header from './components/Header/Header.jsx'
import TabBar from './components/TabBar/TabBar.jsx'
import DayNav from './components/DayNav/DayNav.jsx'
import DayCalendar from './components/DayCalendar/DayCalendar.jsx'
import GameList from './components/GameList/GameList.jsx'
import PlayerList from './components/PlayerList/PlayerList.jsx'
import GameDetail from './components/GameDetail/GameDetail.jsx'
import CreateGameModal from './components/CreateGameModal/CreateGameModal.jsx'
import styles from './App.module.css'

export default function App() {
  const { identity, register, activate, rejoin, clearIdentity } = useIdentity()
  const { data, loading, error, refresh } = useEventData(identity)
  const api = useApi(refresh)

  const [activeTab, setActiveTab] = useState('my-calendar')
  const [selectedGameId, setSelectedGameId] = useState(null)
  const [showCreateGame, setShowCreateGame] = useState(false)
  const [editingGame, setEditingGame] = useState(null)
  const [currentDay, setCurrentDay] = useState(getTodayDayNumber)
  const [createInitialDay, setCreateInitialDay] = useState(null)
  const [createInitialHour, setCreateInitialHour] = useState(null)

  const isCalendar = activeTab === 'my-calendar' || activeTab === 'all-calendar'

  const handleJoin = useCallback(async (displayName, passphrase) => {
    return await register(displayName, passphrase)
  }, [register])

  const handleRejoin = useCallback(async (playerId) => {
    const id = await rejoin(playerId)
    return id
  }, [rejoin])

  function openCreateFromCalendar(hour) {
    setCreateInitialDay(currentDay)
    setCreateInitialHour(hour)
    setShowCreateGame(true)
  }

  function openCreateDefault() {
    setCreateInitialDay(null)
    setCreateInitialHour(null)
    setShowCreateGame(true)
  }

  function handleEdit(game) {
    setSelectedGameId(null)
    setEditingGame(game)
  }

  if (!identity) {
    return <JoinScreen onJoin={handleJoin} onRejoin={handleRejoin} onActivate={activate} />
  }

  const selectedGame = data?.games?.find(g => g.gameId === selectedGameId) ?? null
  const selectedGameSeats = data?.seats?.filter(s => s.gameId === selectedGameId) ?? []

  return (
    <div className={styles.app}>
      <Header
        identity={identity}
        playerCount={data?.players?.filter(p => p.status === 'active').length ?? 0}
        onLeave={clearIdentity}
        onExportPdf={async () => {
          const { exportCalendarPdf } = await import('./lib/export-pdf.js')
          exportCalendarPdf(data, identity)
        }}
      />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      {isCalendar && (
        <DayNav currentDay={currentDay} onDayChange={setCurrentDay} />
      )}
      <main className={styles.content}>
        {isCalendar && (
          <DayCalendar
            games={data?.games ?? []}
            seats={data?.seats ?? []}
            currentDay={currentDay}
            onSelectGame={setSelectedGameId}
            onCreateGame={openCreateFromCalendar}
            viewMode={activeTab === 'my-calendar' ? 'my' : 'all'}
            identity={identity}
          />
        )}
        {activeTab === 'games' && (
          <GameList
            games={data?.games ?? []}
            seats={data?.seats ?? []}
            identity={identity}
            onSelectGame={setSelectedGameId}
            onCreateGame={openCreateDefault}
          />
        )}
        {activeTab === 'players' && (
          <PlayerList
            players={data?.players ?? []}
            identity={identity}
          />
        )}
      </main>

      {selectedGame && (
        <GameDetail
          game={selectedGame}
          seats={selectedGameSeats}
          identity={identity}
          api={api}
          onClose={() => setSelectedGameId(null)}
          onEdit={handleEdit}
        />
      )}
      {showCreateGame && (
        <CreateGameModal
          identity={identity}
          api={api}
          onClose={() => setShowCreateGame(false)}
          initialDay={createInitialDay}
          initialHour={createInitialHour}
        />
      )}
      {editingGame && (
        <CreateGameModal
          identity={identity}
          api={api}
          onClose={() => setEditingGame(null)}
          editGame={editingGame}
        />
      )}
    </div>
  )
}
