import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Plane } from "lucide-react";
import authApi from "../../api/authApi";
import InfoModal from "../../components/ui/InfoModal.jsx";
import styles from "./RecoveryPage.module.css";

export default function RecoveryPage() {
  const [correo, setCorreo] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [modal, setModal] = useState({
    open: false,
    type: "error",
    title: "",
    message: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!correo) return;
    setLoading(true);
    try {
      await authApi.forgotPassword({ correo });
      setSent(true);
    } catch {
      setModal({
        open: true,
        type: "error",
        title: "Error",
        message: "No se pudo procesar la solicitud.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <Plane size={28} color="var(--primary)" />
        </div>
        <h2 className={styles.title}>Recuperar Contraseña</h2>
        <p className={styles.sub}>
          Ingresa tu correo para recibir instrucciones
        </p>

        {sent ? (
          <div className={styles.success}>
            <Mail size={40} color="var(--success)" />
            <p>
              ¡Correo enviado exitosamente! Revisa tu correo para restablecer tu
              contraseña.
            </p>
            <Link to="/login" className={styles.backLink}>
              Volver al inicio
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="correo">
                Correo electrónico
              </label>
              <input
                id="correo"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="usuario@saasa.com"
                className={styles.input}
                required
              />
            </div>
            <button type="submit" disabled={loading} className={styles.btn}>
              {loading ? "Enviando..." : "Enviar instrucciones"}
            </button>
            <Link to="/login" className={styles.backLink}>
              ← Volver al inicio
            </Link>
          </form>
        )}
      </div>
      <InfoModal
        open={modal.open}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />
    </div>
  );
}
