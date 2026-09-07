import styles from './Spinner.module.css'

export default function Spinner({ size = 'md', color }) {
  return (
    <span
      className={[styles.spinner, styles[size]].join(' ')}
      style={color ? { borderTopColor: color } : undefined}
      role="status"
      aria-label="Cargando"
    />
  )
}
