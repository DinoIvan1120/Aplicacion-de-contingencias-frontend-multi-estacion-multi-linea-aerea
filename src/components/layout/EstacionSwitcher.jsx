import { useEffect, useRef, useState } from "react";
import { ChevronDown, Building2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import estacionesApi from "../../api/estacionesApi";
import styles from "./EstacionSwitcher.module.css";

/**
 * Muestra la estación activa en el Topbar y permite cambiarla sin cerrar
 * sesión (Fase 5). No es un control de seguridad — el backend sigue
 * resolviendo el acceso real con `estacionIds` del JWT — es solo el
 * "contexto de trabajo" que se manda al crear registros nuevos.
 *
 * - Usuario con una sola estación asignada: se muestra como badge fijo,
 *   sin flecha ni posibilidad de abrir el selector (no hay nada entre qué
 *   elegir).
 * - Administrador Global o usuario multi-estación: badge + desplegable.
 */
export default function EstacionSwitcher() {
  const {
    estacionIds,
    esAdministradorGlobal,
    lineaAereaFija,
    estacionActiva,
    lineaAereaActiva,
    seleccionarEstacion,
  } = useAuth();

  const puedeCambiar = esAdministradorGlobal || !lineaAereaFija;

  const [open, setOpen] = useState(false);
  const [estaciones, setEstaciones] = useState([]);
  const [loadingEstaciones, setLoadingEstaciones] = useState(false);
  const [estacionHover, setEstacionHover] = useState(null);
  const [lineas, setLineas] = useState([]);
  const [loadingLineas, setLoadingLineas] = useState(false);
  const panelRef = useRef(null);

  // Cerrar al hacer click afuera
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const abrirSelector = async () => {
    if (!puedeCambiar) return;
    setOpen((v) => !v);
    if (estaciones.length > 0) return; // ya cargadas
    setLoadingEstaciones(true);
    try {
      const { data } = await estacionesApi.getAll({ estado: 1 });
      const todas = data?.data ?? [];
      setEstaciones(
        esAdministradorGlobal
          ? todas
          : todas.filter((e) => estacionIds.includes(e.id)),
      );
    } catch {
      setEstaciones([]);
    } finally {
      setLoadingEstaciones(false);
    }
  };

  const elegirEstacion = async (estacion) => {
    setEstacionHover(estacion.id);
    setLoadingLineas(true);
    setLineas([]);
    try {
      const { data } = await estacionesApi.getLineasAereas(estacion.id, {
        estado: 1,
      });
      setLineas(data?.data ?? []);
    } catch {
      setLineas([]);
    } finally {
      setLoadingLineas(false);
    }
  };

  const confirmar = (estacion, lineaAereaResp) => {
    seleccionarEstacion(estacion, lineaAereaResp ?? null);
    setOpen(false);
  };

  if (!estacionActiva && !puedeCambiar) return null;

  return (
    <div className={styles.wrap} ref={panelRef}>
      <button
        type="button"
        className={[styles.badge, puedeCambiar ? styles.badgeClickable : ""].join(" ")}
        onClick={abrirSelector}
        disabled={!puedeCambiar}
      >
        <Building2 size={14} />
        <span className={styles.badgeText}>
          {estacionActiva?.nombre ?? "Elegir estación"}
          {lineaAereaActiva?.lineaAereaNombre
            ? ` · ${lineaAereaActiva.lineaAereaNombre}`
            : ""}
        </span>
        {puedeCambiar && <ChevronDown size={13} />}
      </button>

      {open && (
        <>
          {/* Fondo oscuro — solo se ve en móvil (CSS); click afuera cierra el panel */}
          <div className={styles.overlay} onClick={() => setOpen(false)} />
          <div className={styles.panel}>
            <div className={styles.panelHeader}>Cambiar estación de trabajo</div>

          {loadingEstaciones ? (
            <p className={styles.hint}>Cargando...</p>
          ) : estaciones.length === 0 ? (
            <p className={styles.hint}>No hay estaciones disponibles.</p>
          ) : (
            <div className={styles.grid}>
              <div className={styles.col}>
                {estaciones.map((e) => (
                  <button
                    type="button"
                    key={e.id}
                    className={[
                      styles.option,
                      estacionActiva?.id === e.id ? styles.optionActive : "",
                      estacionHover === e.id ? styles.optionHover : "",
                    ].join(" ")}
                    onClick={() => elegirEstacion(e)}
                  >
                    <span className={styles.optionCode}>{e.codigoIata}</span>
                    {e.nombre}
                  </button>
                ))}
              </div>

              {estacionHover && (
                <div className={styles.col}>
                  <div className={styles.colTitle}>Línea aérea (opcional)</div>
                  {loadingLineas ? (
                    <p className={styles.hint}>Cargando...</p>
                  ) : lineas.length === 0 ? (
                    <p className={styles.hint}>Sin líneas habilitadas.</p>
                  ) : (
                    lineas.map((l) => (
                      <button
                        type="button"
                        key={l.lineaAereaId}
                        className={styles.option}
                        onClick={() =>
                          confirmar(
                            estaciones.find((e) => e.id === estacionHover),
                            l,
                          )
                        }
                      >
                        <span className={styles.optionCode}>
                          {l.lineaAereaCodigoIata}
                        </span>
                        {l.lineaAereaNombre}
                      </button>
                    ))
                  )}
                  <button
                    type="button"
                    className={styles.skipBtn}
                    onClick={() =>
                      confirmar(
                        estaciones.find((e) => e.id === estacionHover),
                        null,
                      )
                    }
                  >
                    Continuar sin filtrar por línea →
                  </button>
                </div>
              )}
            </div>
          )}
          </div>
        </>
      )}
    </div>
  );
}
