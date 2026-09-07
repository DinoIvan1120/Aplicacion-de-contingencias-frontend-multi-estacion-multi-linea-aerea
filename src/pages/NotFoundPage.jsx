import { useNavigate } from 'react-router-dom'
import { Plane, Home } from 'lucide-react'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.iconWrap}>
          <Plane size={56} color="var(--primary)" />
        </div>
        <h1 className={styles.code}>404</h1>
        <h2 className={styles.title}>Página no encontrada</h2>
        <p className={styles.desc}>
          La página que buscas no existe o no tienes permisos para acceder a ella.
        </p>
        <button className={styles.btn} onClick={() => navigate(-1)}>
          <Home size={18} />
          Volver al inicio
        </button>
      </div>
    </div>
  )
}
