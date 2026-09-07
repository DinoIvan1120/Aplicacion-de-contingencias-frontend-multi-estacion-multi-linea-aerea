/**
 * SessionExpiryModal
 *
 * Se muestra cuando faltan WARNING_SECONDS segundos para que el token expire.
 * - Muestra cuenta regresiva en tiempo real
 * - Botón "Mantener sesión" llama al endpoint /auth/refresh y reinicia el timer
 * - Botón "Cerrar sesión" o al llegar a 0 → logout automático
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Clock, LogOut, RefreshCw } from "lucide-react";
import styles from "./SessionExpiryModal.module.css";

// Cuántos segundos antes de expirar se muestra el modal
export const WARNING_SECONDS = 3 * 60; // 3 minutos

export default function SessionExpiryModal({
  open,
  secondsLeft,
  onExtend,
  onLogout,
}) {
  const [count, setCount] = useState(secondsLeft);
  const intervalRef = useRef(null);

  // Sincronizar cuando el padre actualiza secondsLeft
  useEffect(() => {
    setCount(secondsLeft);
  }, [secondsLeft]);

  // Countdown interno
  useEffect(() => {
    if (!open) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [open]);

  // Cuando el countdown llega a 0 → logout automático
  useEffect(() => {
    if (open && count === 0) {
      onLogout();
    }
  }, [count, open, onLogout]);

  const minutes = Math.floor(count / 60);
  const seconds = count % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Determinar urgencia visual
  const isUrgent = count <= 60; // último minuto → rojo

  if (!open) return null;

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-title"
    >
      <div className={styles.modal}>
        {/* Icono */}
        <div className={`${styles.iconWrap} ${isUrgent ? styles.urgent : ""}`}>
          <Clock size={32} />
        </div>

        {/* Título */}
        <h2 id="session-title" className={styles.title}>
          Tu sesión está por expirar
        </h2>

        {/* Descripción */}
        <p className={styles.desc}>
          Por seguridad, tu sesión se cerrará automáticamente en:
        </p>

        {/* Countdown */}
        <div className={`${styles.countdown} ${isUrgent ? styles.urgent : ""}`}>
          {formatted}
        </div>

        <p className={styles.hint}>¿Deseas mantener la sesión activa?</p>

        {/* Botones */}
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={onExtend} autoFocus>
            <RefreshCw size={16} />
            Mantener sesión
          </button>
          <button className={styles.btnSecondary} onClick={onLogout}>
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
