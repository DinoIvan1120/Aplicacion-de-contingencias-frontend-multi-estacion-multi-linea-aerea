import { useState,useRef,useEffect } from "react";
import { Menu, LogOut, AlertTriangle,User  } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getRolColor, getRolLabel } from "../../utils/roleUtils";
import EstacionSwitcher from "./EstacionSwitcher";
import styles from "./Topbar.module.css";

// FIX: vistas de alcance general que NO filtran por el contexto de
// trabajo (estación+línea) activo — Usuarios se acota por las
// estaciones asignadas al Administrador en su JWT (no por el selector
// del topbar) y Estaciones es un catálogo global. Mostrar el selector
// ahí sugiere al usuario que cambiar de estación va a filtrar algo,
// cuando en realidad no tiene ningún efecto.
const RUTAS_SIN_SELECTOR_ESTACION_SIEMPRE = ["/admin/estaciones"];

const RUTAS_SIN_SELECTOR_ESTACION_SOLO_GLOBAL = ["/admin/usuarios"];

export default function Topbar({ onMenuClick }) {
  const { user, rol, logout, esAdministradorGlobal } = useAuth();
  const rolColor = getRolColor(rol);
  const envLabel = import.meta.env.VITE_ENV_LABEL;
  const ocultoSiempre = RUTAS_SIN_SELECTOR_ESTACION_SIEMPRE.some((ruta) =>
    location.pathname.startsWith(ruta),
  );
  const ocultoSoloGlobal =
    esAdministradorGlobal &&
    RUTAS_SIN_SELECTOR_ESTACION_SOLO_GLOBAL.some((ruta) =>
      location.pathname.startsWith(ruta),
    );
  const mostrarSelectorEstacion = !ocultoSiempre && !ocultoSoloGlobal;

  // Estado del diálogo de confirmación
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Estado del popover de rol (solo visible en móvil, botón compacto)
  const [roleOpen, setRoleOpen] = useState(false);
  const roleRef = useRef(null);

  useEffect(() => {
    if (!roleOpen) return;
    const onClickOutside = (e) => {
      if (roleRef.current && !roleRef.current.contains(e.target)) {
        setRoleOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [roleOpen]);

  // Abre el diálogo
  const handleLogoutClick = () => setConfirmOpen(true);

  // Cancela — cierra el diálogo con animación de salida
  const handleCancel = () => {
    setExiting(true);
    setTimeout(() => {
      setConfirmOpen(false);
      setExiting(false);
    }, 220);
  };

  // Confirma — animación breve antes de ejecutar el logout
  const handleConfirm = () => {
    setExiting(true);
    // Pequeño delay para que la animación de salida del modal se vea
    setTimeout(() => {
      setConfirmOpen(false);
      setExiting(false);
      logout(); // navigate() suave — no hard reload
    }, 200);
  };

  return (
    <>
      <header className={styles.topbar} style={{ background: rolColor }}>
        <div className={styles.left}>
          <button
            className={styles.menuBtn}
            onClick={onMenuClick}
            aria-label="Abrir menú"
          >
            <Menu size={22} color="#fff" />
          </button>
          <div className={styles.title}>
            <span className={styles.appName}>Diseño e Innovación</span>
            {envLabel && <span className={styles.envBadge}>{envLabel}</span>}
          </div>
        </div>

        <div className={styles.right}>
          {mostrarSelectorEstacion && <EstacionSwitcher />}

          <div className={styles.userInfo}>
            <span className={styles.userName}>
              {user?.nombre} {user?.apellido}
            </span>
            <span className={styles.rolLabel}>{getRolLabel(rol)}</span>
          </div>

          {/* Botón compacto de rol — solo visible en móvil (CSS) */}
          <div className={styles.roleWrap} ref={roleRef}>
            <button
              type="button"
              className={styles.roleBtn}
              onClick={() => setRoleOpen((v) => !v)}
              aria-label="Ver usuario y rol"
            >
              <User size={16} color="#fff" />
            </button>
            {roleOpen && (
              <div className={styles.rolePanel}>
                <span className={styles.rolePanelName}>
                  {user?.nombre} {user?.apellido}
                </span>
                <span className={styles.rolePanelLabel}>
                  {getRolLabel(rol)}
                </span>
              </div>
            )}
          </div>

          {/* Botón de logout — ahora abre el diálogo */}
          <button
            className={styles.logoutBtn}
            onClick={handleLogoutClick}
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} color="#fff" />
            <span className={styles.logoutLabel}>Salir</span>
          </button>
        </div>
      </header>

      {/* ── Diálogo de confirmación de cierre de sesión ── */}
      {confirmOpen && (
        <div
          className={[
            styles.overlay,
            exiting ? styles.overlayOut : styles.overlayIn,
          ].join(" ")}
        >
          <div
            className={[
              styles.dialog,
              exiting ? styles.dialogOut : styles.dialogIn,
            ].join(" ")}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-desc"
          >
            {/* Ícono de advertencia */}
            <div className={styles.dialogIcon}>
              <AlertTriangle size={32} color="#B45309" />
            </div>

            {/* Texto */}
            <div className={styles.dialogBody}>
              <h3 className={styles.dialogTitle} id="logout-title">
                ¿Cerrar sesión?
              </h3>
              <p className={styles.dialogDesc} id="logout-desc">
                Tu sesión se cerrará y serás redirigido a la pantalla de inicio
                de sesión.
              </p>
            </div>

            {/* Botones */}
            <div className={styles.dialogActions}>
              <button
                className={styles.cancelBtn}
                onClick={handleCancel}
                autoFocus
              >
                Cancelar
              </button>
              <button className={styles.confirmBtn} onClick={handleConfirm}>
                <LogOut size={15} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
