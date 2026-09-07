import { Inbox } from 'lucide-react'
import Button from './Button.jsx'
import styles from './EmptyState.module.css'

export default function EmptyState({ title = 'Sin resultados', description, actionLabel, onAction }) {
  return (
    <div className={styles.wrap}>
      <Inbox size={48} color="var(--text-300)" />
      <h4 className={styles.title}>{title}</h4>
      {description && <p className={styles.desc}>{description}</p>}
      {actionLabel && <Button variant="ghost" onClick={onAction}>{actionLabel}</Button>}
    </div>
  )
}
