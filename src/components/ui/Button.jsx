import styles from './Button.module.css'
import Spinner from './Spinner.jsx'

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  children,
  className = '',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={[styles.btn, styles[variant], styles[size], className].filter(Boolean).join(' ')}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
