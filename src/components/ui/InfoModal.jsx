import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'
import styles from './InfoModal.module.css'

const CONFIG = {
  success: { Icon: CheckCircle, color: '#15803D', bg: '#DCFCE7' },
  error:   { Icon: XCircle,     color: '#DC2626', bg: '#FEE2E2' },
  warning: { Icon: AlertTriangle,color: '#B45309', bg: '#FEF3C7' },
  info:    { Icon: Info,        color: '#1D4ED8', bg: '#DBEAFE' },
}

export default function InfoModal({ open, onClose, type = 'info', title, message, actionLabel = 'Aceptar' }) {
  const { Icon, color, bg } = CONFIG[type] ?? CONFIG.info
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className={styles.content}>
        <div className={styles.iconWrap} style={{ background: bg }}>
          <Icon size={48} color={color} />
        </div>
        {title && <h3 className={styles.title}>{title}</h3>}
        {message && <p className={styles.message}>{message}</p>}
        <Button onClick={onClose}>{actionLabel}</Button>
      </div>
    </Modal>
  )
}
