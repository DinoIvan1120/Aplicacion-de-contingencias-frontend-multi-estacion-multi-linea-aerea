import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, Check, X } from "lucide-react";
import atencionesApi from "../../api/atencionesApi";
import Spinner from "./Spinner.jsx";
import styles from "./BotonImprimirTicket.module.css";

/**
 * Botón "Imprimir ticket" (voucher en formato rollo térmico).
 *
 * Al tocarlo se abre un panel para elegir el ancho del rollo (80 / 104 mm).
 * La última opción usada queda marcada y se recuerda en el navegador.
 * Si la atención pertenece a un grupo, el backend devuelve el ticket GRUPAL.
 *
 * Comportamiento según el dispositivo:
 *  - Celular/tablet (Android/iOS) con soporte para compartir archivos:
 *    se genera el PDF y se abre el menú "Compartir" del sistema con el
 *    ARCHIVO (no el enlace blob:, que otras apps no pueden abrir). El agente
 *    elige mPrint (Bixolon) y el ticket se imprime directo, sin pasar por el
 *    diálogo de impresión de Android.
 *    Si el navegador no permite abrir el menú automáticamente (por ejemplo,
 *    porque la generación tardó y expiró el gesto del usuario), se muestra
 *    una barra "Ticket listo" con un botón para abrirlo con un toque.
 *  - PC: igual que antes, el PDF se abre en una pestaña nueva para imprimir.
 *
 * Props:
 *  - atencionId     id de la atención (obligatorio)
 *  - disabled       deshabilita el botón (por ejemplo, atención anulada)
 *  - compacto       versión pequeña para filas de listas (default: false)
 *  - bloqueEnMovil  en pantallas angostas ocupa todo el ancho (default: false)
 *  - onError(msg)   callback para mostrar el error con el modal de la página
 */

const CLAVE_ANCHO = "saasa.ticket.ancho";

const OPCIONES = [
  { ancho: 80, titulo: "Rollo 80 mm", detalle: "Impresora de mostrador" },
  { ancho: 104, titulo: "Rollo 104 mm", detalle: "Impresora portátil (Bixolon / Zebra)" },
];

function leerAnchoGuardado() {
  try {
    const v = Number(window.localStorage.getItem(CLAVE_ANCHO));
    return OPCIONES.some((o) => o.ancho === v) ? v : 80;
  } catch {
    return 80;
  }
}

function guardarAncho(ancho) {
  try {
    window.localStorage.setItem(CLAVE_ANCHO, String(ancho));
  } catch {
    /* sin localStorage: se usa el valor en memoria */
  }
}

/** Con responseType "blob", el JSON de error del backend también llega como Blob. */
async function mensajeDeError(err) {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const json = JSON.parse(await data.text());
      if (json?.message) return json.message;
    } catch {
      /* no era JSON */
    }
  }
  return data?.message ?? "No se pudo generar el ticket.";
}

/** true en celulares y tablets (Android / iOS). */
function esMovil() {
  try {
    if (navigator.userAgentData?.mobile) return true;
  } catch {
    /* sin userAgentData */
  }
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

/** true si el navegador puede compartir un PDF con otras apps (Web Share). */
function puedeCompartirArchivos() {
  try {
    if (typeof navigator.canShare !== "function" || typeof navigator.share !== "function") {
      return false;
    }
    const prueba = new File([new Blob(["%PDF"])], "prueba.pdf", { type: "application/pdf" });
    return navigator.canShare({ files: [prueba] });
  } catch {
    return false;
  }
}

/** Descarga un Blob/File como archivo (respaldo cuando no se puede compartir). */
function descargarArchivo(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function BotonImprimirTicket({
  atencionId,
  disabled = false,
  compacto = false,
  bloqueEnMovil = false,
  onError,
}) {
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [ultimoAncho, setUltimoAncho] = useState(leerAnchoGuardado);
  const [cargando, setCargando] = useState(false);
  // PDF ya generado que espera un toque del agente para abrir "Compartir".
  const [archivoPendiente, setArchivoPendiente] = useState(null);

  // Cerrar el panel con la tecla Escape
  useEffect(() => {
    if (!panelAbierto) return;
    const onKey = (e) => e.key === "Escape" && setPanelAbierto(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelAbierto]);

  /**
   * Abre el menú "Compartir" del sistema con el PDF.
   * - AbortError: el agente cerró el menú sin elegir app → no se hace nada.
   * - NotAllowedError: expiró el gesto del usuario → se muestra la barra
   *   "Ticket listo" para abrirlo con un toque.
   * - Otro error: se descarga el PDF como respaldo.
   */
  const compartirArchivo = async (archivo) => {
    try {
      await navigator.share({ files: [archivo], title: "Ticket de voucher" });
      setArchivoPendiente(null);
    } catch (err) {
      if (err?.name === "AbortError") {
        setArchivoPendiente(null);
        return;
      }
      if (err?.name === "NotAllowedError") {
        setArchivoPendiente(archivo);
        return;
      }
      setArchivoPendiente(null);
      descargarArchivo(archivo, archivo.name);
    }
  };

  /** Flujo para celular: generar el PDF y compartirlo directo con mPrint. */
  const imprimirCompartiendo = async (ancho) => {
    setArchivoPendiente(null);
    setCargando(true);
    let archivo;
    try {
      const res = await atencionesApi.descargarVoucherTicket(atencionId, ancho);
      archivo = new File([res.data], `ticket-${atencionId}.pdf`, { type: "application/pdf" });
    } catch (err) {
      const msg = await mensajeDeError(err);
      if (onError) onError(msg);
      return;
    } finally {
      setCargando(false);
    }
    await compartirArchivo(archivo);
  };

  /** Flujo para PC: abrir el PDF en una pestaña nueva (sin cambios). */
  const imprimirEnPestana = async () => {
    // La pestaña se abre dentro del clic (antes del await): si se abre
    // después, el navegador la bloquea como popup.
    const pestana = window.open("", "_blank");
    if (pestana) {
      pestana.document.title = "Generando ticket...";
      pestana.document.body.innerHTML =
        '<p style="font-family:sans-serif;padding:24px">Generando ticket...</p>';
    }

    setCargando(true);
    try {
      const res = await atencionesApi.descargarVoucherTicket(atencionId, ultimoAnchoRef.actual);
      const blob = new Blob([res.data], { type: "application/pdf" });

      if (pestana) {
        const url = URL.createObjectURL(blob);
        pestana.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        // Popup bloqueado: se descarga el archivo directamente.
        descargarArchivo(blob, `ticket-${atencionId}.pdf`);
      }
    } catch (err) {
      if (pestana) pestana.close();
      const msg = await mensajeDeError(err);
      if (onError) onError(msg);
    } finally {
      setCargando(false);
    }
  };

  // Ancho elegido en el clic actual (evita depender del re-render del estado).
  const ultimoAnchoRef = { actual: ultimoAncho };

  const imprimir = async (ancho) => {
    if (!atencionId || cargando) return;
    setPanelAbierto(false);
    setUltimoAncho(ancho);
    guardarAncho(ancho);
    ultimoAnchoRef.actual = ancho;

    if (esMovil() && puedeCompartirArchivos()) {
      await imprimirCompartiendo(ancho);
    } else {
      await imprimirEnPestana();
    }
  };

  const clasesWrap = [
    styles.wrap,
    compacto ? styles.compacto : "",
    bloqueEnMovil ? styles.bloqueEnMovil : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={clasesWrap}>
      <button
        type="button"
        className={styles.btn}
        onClick={() => setPanelAbierto(true)}
        disabled={disabled || cargando || !atencionId}
        title="Imprimir voucher en ticket"
      >
        {cargando ? <Spinner size="sm" /> : <Printer size={compacto ? 14 : 15} />}
        {cargando ? "Generando..." : compacto ? "Ticket" : "Imprimir ticket"}
      </button>

      {/* El panel se monta en <body> para que no herede estilos de la página
          (por ejemplo, ".acciones button { width: 100% }" en móvil). */}
      {panelAbierto &&
        createPortal(
          <div
            className={styles.overlay}
            onClick={() => setPanelAbierto(false)}
            role="presentation"
          >
            <div
              className={styles.panel}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="ticket-panel-titulo"
            >
              <div className={styles.panelHeader}>
                <h3 id="ticket-panel-titulo" className={styles.panelTitulo}>
                  <Printer size={17} /> Imprimir ticket
                </h3>
                <button
                  type="button"
                  className={styles.panelCerrar}
                  onClick={() => setPanelAbierto(false)}
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>
              <p className={styles.panelDesc}>
                Elige el ancho del rollo de la impresora.
              </p>

              <div className={styles.opciones}>
                {OPCIONES.map((o) => {
                  const activo = o.ancho === ultimoAncho;
                  return (
                    <button
                      key={o.ancho}
                      type="button"
                      className={`${styles.opcion} ${activo ? styles.opcionActiva : ""}`}
                      onClick={() => imprimir(o.ancho)}
                      autoFocus={activo}
                    >
                      <span className={styles.opcionTexto}>
                        <span className={styles.opcionTitulo}>{o.titulo}</span>
                        <span className={styles.opcionDetalle}>
                          {activo ? "Último usado · " : ""}
                          {o.detalle}
                        </span>
                      </span>
                      {activo && <Check size={18} className={styles.opcionCheck} />}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className={styles.panelCancelar}
                onClick={() => setPanelAbierto(false)}
              >
                Cancelar
              </button>
            </div>
          </div>,
          document.body,
        )}

      {/* Barra "Ticket listo": aparece solo si el menú Compartir no pudo
          abrirse automáticamente. Un toque lo abre con el PDF. */}
      {archivoPendiente &&
        createPortal(
          <div
            role="dialog"
            aria-live="polite"
            style={{
              position: "fixed",
              left: 12,
              right: 12,
              bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
              zIndex: 10000,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              borderRadius: 14,
              background: "#111827",
              color: "#ffffff",
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              fontFamily: "inherit",
            }}
          >
            <Printer size={18} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 14, lineHeight: 1.3 }}>Ticket listo</span>
            <button
              type="button"
              onClick={() => compartirArchivo(archivoPendiente)}
              style={{
                border: "none",
                borderRadius: 10,
                padding: "10px 14px",
                background: "#ffffff",
                color: "#111827",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Imprimir con mPrint
            </button>
            <button
              type="button"
              onClick={() => setArchivoPendiente(null)}
              aria-label="Cerrar"
              style={{
                border: "none",
                background: "transparent",
                color: "#ffffff",
                padding: 4,
                cursor: "pointer",
                display: "flex",
              }}
            >
              <X size={18} />
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}