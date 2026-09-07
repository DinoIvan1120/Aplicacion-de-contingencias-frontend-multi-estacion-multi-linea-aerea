import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import estacionesApi from "../../api/estacionesApi";
import { useLogoLineaAerea } from "../../hooks/useLineasAereas";
import styles from "./SeleccionSharedPage.module.css";

/**
 * Segunda pantalla del flujo post-login (Fase 5 — rediseño).
 * Recibe la estación elegida en location.state (viene de
 * SeleccionarEstacionPage). Si no existe (recarga directa de la URL,
 * navegación manual, etc.) se manda de vuelta al selector de estación.
 */
export default function SeleccionarAerolineaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { seleccionarEstacion, logout, esAdministradorGlobal } = useAuth();

  const estacion = location.state?.estacion ?? null;

  const [lineas, setLineas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // - Administrador Global: "volver" lo manda al selector de estación
  //   (mismo destino que "← Cambiar estación"), no cierra sesión.
  // - Cualquier otro usuario: se mantiene el comportamiento actual, logout.
  const handleVolver = () => {
    if (esAdministradorGlobal) {
      navigate("/seleccionar-estacion");
    } else {
      logout();
    }
  };

  useEffect(() => {
    if (!estacion) {
      navigate("/seleccionar-estacion", { replace: true });
      return;
    }
    let cancelado = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await estacionesApi.getLineasAereas(estacion.id, {
          estado: 1,
        });
        if (!cancelado) setLineas(data?.data ?? []);
      } catch {
        if (!cancelado) setError("No se pudieron cargar las líneas aéreas.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estacion?.id]);

  if (!estacion) return null;

  const confirmar = (linea) => {
    seleccionarEstacion(estacion, linea ?? null);
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className={styles.page}>
      <div className={styles.bg} />
      <div className={styles.bgOverlay} />

      <div className={styles.container}>
        <div className={styles.planeRing}>
          <svg viewBox="0 0 40 40" fill="none" width="30" height="30">
            <circle cx="14" cy="13" r="5" stroke="white" strokeWidth="2.5" />
            <circle cx="26" cy="13" r="5" stroke="white" strokeWidth="2.5" />
            <path
              d="M4 32c0-5.523 4.477-10 10-10h12c5.523 0 10 4.477 10 10"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className={styles.header}>
          <button
            type="button"
            className={styles.backLink}
            onClick={() => navigate("/seleccionar-estacion")}
          >
            ← Cambiar estación
          </button>
          <h1 className={styles.headerTitle}>Seleccionar Aerolínea</h1>
          <p className={styles.headerHint}>
            Estación: <strong>{estacion.nombre}</strong> ({estacion.codigoIata})
          </p>
        </div>

        {loading ? (
          <p className={styles.emptyHint}>Cargando líneas aéreas...</p>
        ) : error ? (
          <p className={styles.emptyHint}>{error}</p>
        ) : lineas.length === 0 ? (
          <>
            <p className={styles.emptyHint}>
              Esta estación no tiene líneas aéreas habilitadas todavía.
            </p>
            <button className={styles.skipBtn} onClick={() => confirmar(null)}>
              Continuar sin aerolínea →
            </button>
          </>
        ) : (
          <>
            <div className={styles.gridAirlines}>
              {lineas.map((l, i) => (
                <button
                  key={l.lineaAereaId}
                  type="button"
                  className={styles.airlineCard}
                  style={{ "--delay": `${i * 0.05}s` }}
                  onClick={() => confirmar(l)}
                >
                  <AirlineLogo
                    lineaAereaId={l.lineaAereaId}
                    codigoIata={l.lineaAereaCodigoIata}
                  />
                  <span className={styles.airlineCode}>
                    {l.lineaAereaCodigoIata}
                  </span>
                  <span className={styles.airlineName}>
                    {l.lineaAereaNombre}
                  </span>
                  <span className={styles.airlineFlightBadge}>
                    {l.totalVuelos ?? 0} vuelo{(l.totalVuelos ?? 0) === 1 ? "" : "s"}
                  </span>
                </button>
              ))}
            </div>

            {/* <button className={styles.skipBtn} onClick={() => confirmar(null)}>
              Continuar sin filtrar por aerolínea →
            </button> */}
          </>
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
          {esAdministradorGlobal ? "Retroceder a estación" : "Volver al inicio de sesión"}
        </button>
      </div>
      
    </div>
  );
}

function AirlineLogo({ lineaAereaId, codigoIata }) {
  const { data: logoUrl, isLoading, isError } = useLogoLineaAerea(lineaAereaId);
  const mostrarImagen = !isLoading && !isError && logoUrl;

  return (
    <span className={styles.airlineLogo}>
      {mostrarImagen ? (
        <img src={logoUrl} alt="" />
      ) : (
        <span className={styles.airlineLogoFallback}>{codigoIata}</span>
      )}
    </span>
  );
}
