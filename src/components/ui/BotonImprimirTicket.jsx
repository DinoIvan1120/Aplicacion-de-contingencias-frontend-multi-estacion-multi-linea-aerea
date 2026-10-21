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
  { ancho: 104, titulo: "Rollo 104 mm", detalle: "Impresora portátil (Zebra ZQ521)" },
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

  // Cerrar el panel con la tecla Escape
  useEffect(() => {
    if (!panelAbierto) return;
    const onKey = (e) => e.key === "Escape" && setPanelAbierto(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelAbierto]);

  const imprimir = async (ancho) => {
    if (!atencionId || cargando) return;
    setPanelAbierto(false);
    setUltimoAncho(ancho);
    guardarAncho(ancho);

    // La pestaña se abre dentro del clic (antes del await): si se abre
    // después, Safari/Chrome móvil la bloquean como popup.
    const pestana = window.open("", "_blank");
    if (pestana) {
      pestana.document.title = "Generando ticket...";
      pestana.document.body.innerHTML =
        '<p style="font-family:sans-serif;padding:24px">Generando ticket...</p>';
    }

    setCargando(true);
    try {
      const res = await atencionesApi.descargarVoucherTicket(atencionId, ancho);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      if (pestana) {
        pestana.location.href = url;
      } else {
        // Popup bloqueado: se descarga el archivo directamente.
        const a = document.createElement("a");
        a.href = url;
        a.download = `ticket-${atencionId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      if (pestana) pestana.close();
      const msg = await mensajeDeError(err);
      if (onError) onError(msg);
    } finally {
      setCargando(false);
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
    </div>
  );
}