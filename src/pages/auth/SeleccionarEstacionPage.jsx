import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import estacionesApi from "../../api/estacionesApi";
import { useFotoEstacion } from "../../hooks/useEstaciones";
import styles from "./SeleccionSharedPage.module.css";

/**
 * Pantalla intermedia post-login (Fase 5 — rediseño) ────────────────────────
 *
 * Antes esta selección vivía DENTRO de la tarjeta de login (LoginPage,
 * vista "ESTACION"). Se traslada a una pantalla propia, en el mismo formato
 * de tarjetas que ya usa DashboardPage, para que el flujo del Administrador
 * Global (o de un usuario con varias estaciones asignadas) sea:
 *
 *   Login → Seleccionar Estación → Seleccionar Aerolínea → Dashboard
 *
 * Es un traslado de la lógica que ya existía (misma API, mismo contexto de
 * auth) — no hay cambios de negocio, solo de presentación/ubicación.
 */
export default function SeleccionarEstacionPage() {
  const navigate = useNavigate();
  const { user, estacionIds, esAdministradorGlobal, logout } = useAuth();

   // - Administrador Global: llegó aquí desde Seleccionar Modo ("Operar en
  //   una estación"), así que "volver" lo regresa ahí, no cierra sesión.
  // - Cualquier otro usuario (multi-estación no-admin): se mantiene el
  //   comportamiento actual, cerrar sesión.
  const handleVolver = () => {
    if (esAdministradorGlobal) {
      navigate("/seleccionar-modo");
    } else {
      logout();
    }
  };

  const [estaciones, setEstaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await estacionesApi.getAll({ estado: 1 });
        const todas = data?.data ?? [];
        const filtradas = esAdministradorGlobal
          ? todas
          : todas.filter((e) => estacionIds.includes(e.id));
        if (!cancelado) setEstaciones(filtradas);
      } catch {
        if (!cancelado) setError("No se pudieron cargar las estaciones.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elegirEstacion = (estacion) => {
    navigate("/seleccionar-aerolinea", { state: { estacion } });
  };

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
          <h1 className={styles.headerTitle}>Seleccionar Estación</h1>
          <p className={styles.headerHint}>
            Elige el aeropuerto donde vas a operar
          </p>
        </div>

        {loading ? (
          <p className={styles.emptyHint}>Cargando estaciones...</p>
        ) : error ? (
          <p className={styles.emptyHint}>{error}</p>
        ) : estaciones.length === 0 ? (
          <p className={styles.emptyHint}>
            No se encontraron estaciones disponibles para tu usuario.
            Contacta a tu administrador.
          </p>
        ) : (
          <div className={styles.grid}>
            {estaciones.map((e, i) => (
              <EstacionCard
                key={e.id}
                estacion={e}
                delay={i * 0.05}
                onClick={() => elegirEstacion(e)}
              />
            ))}
          </div>
        )}

        <button className={styles.logoutBtn} onClick={handleVolver}>
          <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
            <path
              d="M7 3H4a1 1 0 00-1 1v12a1 1 0 001 1h3M13 15l4-5-4-5M17 10H7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {esAdministradorGlobal ? "Volver a Seleccionar Modo" : "Volver al inicio de sesión"}
        </button>
      </div>
    </div>
  );
}

/**
 * Tarjeta de estación con foto real (subida en el módulo Administrador →
 * Estaciones y Líneas Aéreas). Si la estación todavía no tiene foto, cae
 * al badge con el código IATA — mismo aspecto de siempre.
 */
function EstacionCard({ estacion, delay, onClick }) {
  const tieneFoto = !!estacion.fotoKey;
  const { data: fotoUrl, isLoading, isError } = useFotoEstacion(estacion.id, {
    enabled: tieneFoto,
  });
  const mostrarFoto = tieneFoto && !isLoading && !isError && fotoUrl;

  return (
    <button
      type="button"
      className={styles.card}
      style={{ "--delay": `${delay}s` }}
      onClick={onClick}
    >
      <div className={styles.fotoWrapper}>
        <div className={styles.fotoInner}>
          {mostrarFoto ? (
            <img
              src={fotoUrl}
              alt={`Foto ${estacion.nombre}`}
              className={styles.fotoImg}
            />
          ) : (
            <div className={styles.fotoPlaceholder}>
              <Building2 size={26} />
              <span>Sin foto</span>
            </div>
          )}
        </div>
      </div>
      <div className={styles.cardBody}>
        <span className={styles.cardCode}>{estacion.codigoIata}</span>
        <h3 className={styles.cardName}>{estacion.nombre}</h3>
      </div>
      <div className={styles.cardShine} />
    </button>
  );
}
