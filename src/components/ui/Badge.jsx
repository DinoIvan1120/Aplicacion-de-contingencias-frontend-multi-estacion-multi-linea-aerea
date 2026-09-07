import styles from './Badge.module.css'

export default function Badge({ label, variant = 'neutral' }) {
  return <span className={[styles.badge, styles[variant]].join(' ')}>{label}</span>
}
