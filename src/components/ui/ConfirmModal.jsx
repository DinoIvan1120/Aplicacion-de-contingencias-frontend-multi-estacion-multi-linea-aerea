import { AlertTriangle } from 'lucide-react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'
import styles from './ConfirmModal.module.css'

export default function ConfirmModal({
  open, onClose, onConfirm, loading = false,
  title = '¿Confirmar acción?',
  message = 'Esta acción no se puede deshacer.',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className={styles.content}>
        <div className={styles.iconWrap}>
          <AlertTriangle size={40} color="#B45309" />
        </div>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading} disabled={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
