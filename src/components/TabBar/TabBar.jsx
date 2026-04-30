import styles from './TabBar.module.css'

const TABS = [
  { id: 'my-calendar', label: 'My Games' },
  { id: 'all-calendar', label: 'All Games' },
  { id: 'games', label: 'List' },
  { id: 'free', label: 'Free' },
  { id: 'players', label: 'Players' },
]

export default function TabBar({ activeTab, onTabChange }) {
  return (
    <nav className={styles.bar}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
