import styles from './StatusDot.module.css'

export default function StatusDot({ status }) {
  return <span className={`${styles.dot} ${styles[status]}`} />
}
