import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plane, Eye, EyeOff } from "lucide-react";
import authApi from "../../api/authApi";
import InfoModal from "../../components/ui/InfoModal.jsx";
import styles from "./RecoveryPage.module.css";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    correo: "",
    codigo: "",
    nuevaPassword: "",
    confirmar: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({
    open: false,
    type: "error",
    title: "",
    message: "",
  });

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.nuevaPassword !== form.confirmar) {
      setModal({
        open: true,
        type: "error",
        title: "Contraseñas no coinciden",
        message: "La nueva contraseña y la confirmación deben ser iguales.",
      });
      return;
    }
    if (form.nuevaPassword.length < 8) {
      setModal({
        open: true,
        type: "error",
        title: "Contraseña débil",
        message:
          "La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.",
      });
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({
        correo: form.correo,
        codigo: form.codigo,
        nuevaPassword: form.nuevaPassword,
      });
      setModal({
        open: true,
        type: "success",
        title: "¡Contraseña actualizada!",
        message:
          "Tu contraseña fue cambiada exitosamente. Ahora puedes iniciar sesión.",
      });
    } catch (err) {
      setModal({
        open: true,
        type: "error",
        title: "Error",
        message: err.response?.data?.message ?? "Código inválido o expirado.",
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
        <h2 className={styles.title}>Cambiar Contraseña</h2>
        <p className={styles.sub}>
          Ingresa el código de verificación y tu nueva contraseña
        </p>
        <form onSubmit={handleSubmit} className={styles.form}>
          {[
            {
              name: "correo",
              label: "Correo electrónico",
              type: "email",
              placeholder: "usuario@saasa.com",
            },
            {
              name: "codigo",
              label: "Código de verificación (6 dígitos)",
              type: "text",
              placeholder: "123456",
              maxLength: 6,
            },
          ].map(({ name, label, type, placeholder, maxLength }) => (
            <div key={name} className={styles.field}>
              <label className={styles.label} htmlFor={name}>
                {label}
              </label>
              <input
                id={name}
                name={name}
                type={type}
                value={form[name]}
                onChange={handleChange}
                placeholder={placeholder}
                maxLength={maxLength}
                className={styles.input}
                required
              />
            </div>
          ))}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="nuevaPassword">
              Nueva contraseña
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="nuevaPassword"
                name="nuevaPassword"
                type={showPass ? "text" : "password"}
                value={form.nuevaPassword}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
                className={styles.input}
                style={{ width: "100%", paddingRight: "3rem" }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-500)",
                  display: "flex",
                }}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirmar">
              Confirmar contraseña
            </label>
            <input
              id="confirmar"
              name="confirmar"
              type="password"
              value={form.confirmar}
              onChange={handleChange}
              placeholder="Repite la nueva contraseña"
              className={styles.input}
              required
            />
          </div>
          <button type="submit" disabled={loading} className={styles.btn}>
            {loading ? "Actualizando..." : "Actualizar contraseña"}
          </button>
          <Link to="/login" className={styles.backLink}>
            ← Volver al inicio
          </Link>
        </form>
      </div>
      <InfoModal
        open={modal.open}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => {
          setModal((m) => ({ ...m, open: false }));
          if (modal.type === "success") navigate("/login");
        }}
      />
    </div>
  );
}
