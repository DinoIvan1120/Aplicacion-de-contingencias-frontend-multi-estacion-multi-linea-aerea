import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, MapPinned, Camera } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useIconoModo, useSubirIconoModo } from "../../hooks/useIconosModo";
import styles from "./SeleccionSharedPage.module.css";

/**
 * Pantalla intermedia exclusiva para el Administrador Global (Fase 6).
 *
 * Antes del login lo mandaba directo a /seleccionar-estacion, forzándolo a
 * "elegir dónde operar" incluso cuando lo único que quería era entrar al
 * catálogo global de Estaciones y Líneas Aéreas (una acción que no depende
 * de ninguna estación en particular). Esta pantalla separa las dos rutas:
 *
 *   Login (Admin Global) → Seleccionar Modo ─┬─> Estaciones y Aerolíneas (catálogo)
 *                                             └─> Seleccionar Estación → Seleccionar
 *                                                 Aerolínea → Dashboard (operar)
 *
 * Cada opción admite subir su propio ícono (mismo mecanismo que la foto de
 * una estación o el logo de una línea aérea: click → seleccionar imagen →
 * sube a S3 → se guarda la key). Mientras no se suba nada, cae al ícono
 * genérico de lucide-react en un círculo de color.
 */
export default function SeleccionarModoAdminPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className={styles.page}>
      <div className={styles.bg} />
      <div className={styles.bgOverlay} />

      <div className={styles.container}>
        <div className={styles.planeRing}>
          <svg viewBox="0 0 40 40" fill="none" width="30" height="30">
            <path
              d="M34 20.5V18L22 12V5.5A2 2 0 0 0 20 3.5A2 2 0 0 0 18 5.5V12L6 18V20.5L18 17V25L14 27.5V30L20 28.5L26 30V27.5L22 25V17L34 20.5Z"
              fill="white"
            />
          </svg>
        </div>

        <div className={styles.header}>
          <p className={styles.headerSub}>
            Bienvenido, {user?.nombre} {user?.apellido}
          </p>
          <h1 className={styles.headerTitle}>¿Qué deseas hacer?</h1>
          <p className={styles.headerHint}>
            Elige cómo quieres continuar
          </p>
        </div>

         <div className={styles.grid}>
          <OpcionModo
            clave="GESTIONAR"
            nombre="Gestionar Estaciones y Aerolíneas"
            DefaultIcon={Building2}
            gradient="linear-gradient(135deg, var(--rol-admin, #EA580C), #F97316)"
            onClick={() => navigate("/admin/estaciones")}
          />

          <OpcionModo
            clave="OPERAR"
            nombre="Operar en una estación"
            DefaultIcon={MapPinned}
            gradient="linear-gradient(135deg, var(--primary, #4F46E5), var(--primary-dark, #3730A3))"
            onClick={() => navigate("/seleccionar-estacion")}
          />
        </div>

        <button className={styles.logoutBtn} onClick={logout}>
          <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
            <path
              d="M7 3H4a1 1 0 00-1 1v12a1 1 0 001 1h3M13 15l4-5-4-5M17 10H7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Volver al inicio de sesión
        </button>
      </div>
    </div>
  );
}

/**
 * Una de las dos tarjetas de opción. Es un <div role="button"> (no un
 * <button> nativo) porque adentro necesita otro botón real, el de subir
 * ícono — un <button> no puede anidar otro <button> sin que el navegador
 * rompa el interno.
 */
function OpcionModo({ clave, nombre, DefaultIcon, gradient, onClick }) {
  const { data: iconoUrl, isLoading, isError } = useIconoModo(clave);
  const subirIcono = useSubirIconoModo();
  const inputRef = useRef(null);

  const mostrarImagen = !isLoading && !isError && iconoUrl;

  const handleEditClick = (e) => {
    e.stopPropagation();
    inputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await subirIcono.mutateAsync({ clave, file });
    } catch {
      // Silencioso...
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={styles.card}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      <div className={styles.fotoWrapper}>
        <div className={styles.fotoInner}>
          {mostrarImagen ? (
            <img src={iconoUrl} alt="" className={styles.fotoImg} />
          ) : (
            <div
              className={styles.fotoPlaceholder}
              style={{ background: gradient, color: "#fff" }}
            >
              <DefaultIcon size={30} />
            </div>
          )}
          <button
            type="button"
            className={styles.fotoEditBtn}
            onClick={handleEditClick}
            disabled={subirIcono.isPending}
            title={mostrarImagen ? "Cambiar ícono" : "Subir ícono"}
          >
            <Camera size={14} />
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            style={{ display: "none" }}
            onClick={(e) => e.stopPropagation()}
            onChange={handleFileChange}
          />
        </div>
      </div>
      <div className={styles.cardBodyCentered}>
        <h3 className={styles.cardName}>{nombre}</h3>
      </div>
      <div className={styles.cardShine} />
    </div>
  );
}