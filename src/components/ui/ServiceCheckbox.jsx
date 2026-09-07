import { CheckSquare, Square } from 'lucide-react'
import styles from './ServiceCheckbox.module.css'

export default function ServiceCheckbox({ label, checked, onChange, icon: Icon, colorActive = 'var(--primary)' }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[styles.btn, checked ? styles.active : ''].join(' ')}
      style={checked ? { borderColor: colorActive, background: colorActive + '14' } : undefined}
      aria-pressed={checked}
    >
      {Icon && <Icon size={16} color={checked ? colorActive : 'var(--text-500)'} />}
      <span className={styles.label} style={checked ? { color: colorActive } : undefined}>{label}</span>
      {checked
        ? <CheckSquare size={16} color={colorActive} />
        : <Square size={16} color="var(--text-300)" />}
    </button>
  )
}
