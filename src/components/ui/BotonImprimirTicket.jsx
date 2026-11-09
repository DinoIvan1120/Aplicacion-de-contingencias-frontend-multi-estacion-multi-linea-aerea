import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, Check, X } from "lucide-react";
import atencionesApi from "../../api/atencionesApi";
import Spinner from "./Spinner.jsx";
import styles from "./BotonImprimirTicket.module.css";

/**
 * Botón "Imprimir ticket" (voucher en formato rollo térmico).
 *
 * Al tocarlo se abre un panel para elegir el rollo / impresora:
 *  - 80 mm mostrador (PC, diálogo de impresión)
 *  - 80 mm portátil Zebra (ZQ521 con rollo de 80 mm)
 *  - 104 mm portátil (rollo de 4")
 * La última opción usada queda marcada y se recuerda en el navegador.
 * Si la atención pertenece a un grupo, el backend devuelve el ticket GRUPAL.
 *
 * Cada opción define CÓMO se imprime (método):
 *  - "dialogo": el PDF se abre en una pestaña nueva y se imprime con el
 *    diálogo de impresión del sistema (impresora de mostrador en PC).
 *  - "compartir": SOLO en celular. Se genera el ticket y se abre el menú
 *    "Compartir" del sistema con el ARCHIVO. El agente elige "Imprimir"
 *    (servicio Zebra Print → ZQ521) o mPrint (Bixolon XM7-40).
 *    El ticket se comparte como IMAGEN PNG (no PDF): el servicio Zebra
 *    Print imprime imágenes sin problema pero falla con PDF ("No hay
 *    conexión con la impresora"). La imagen se genera en el navegador con
 *    PDF.js a la resolución de la impresora (203 dpi) y en blanco/negro
 *    puro, para que el texto y el QR salgan nítidos en papel térmico.
 *    Si la conversión falla, se comparte el PDF como respaldo.
 *    Si el menú no puede abrirse automáticamente, aparece la barra
 *    "Ticket listo" para abrirlo con un toque. En PC, o si el navegador no
 *    permite compartir archivos, se usa el método "dialogo".
 *
 * Props:
 *  - atencionId     id de la atención (obligatorio)
 *  - disabled       deshabilita el botón (por ejemplo, atención anulada)
 *  - compacto       versión pequeña para filas de listas (default: false)
 *  - bloqueEnMovil  en pantallas angostas ocupa todo el ancho (default: false)
 *  - onError(msg)   callback para mostrar el error con el modal de la página
 */

/** Guarda el id de la opción elegida. */
const CLAVE_OPCION = "saasa.ticket.opcion";
/** Clave anterior: solo guardaba el ancho (80 / 104). Se migra al leer. */
const CLAVE_ANCHO_ANTERIOR = "saasa.ticket.ancho";

/**
 * Cada opción portátil ("compartir") lleva la HOJA configurada en Zebra
 * Print para esa impresora (ancho x largo en mm). La imagen del ticket se
 * arma con EXACTAMENTE esa proporción y con el ancho físico del rollo:
 * si la hoja de Zebra Print y estos valores no coinciden, el ticket sale
 * recortado o reducido.
 */
const OPCIONES = [
  {
    id: "80",
    ancho: 80,
    metodo: "dialogo",
    titulo: "Rollo 80 mm",
    detalle: "Impresora de mostrador",
  },
  {
    id: "80-zebra",
    ancho: 80,
    metodo: "compartir",
    hoja: { anchoMm: 80, largoMm: 254 },
    titulo: "Rollo 80 mm portátil",
    detalle: "Impresora portátil Zebra (ZQ521)",
  },
  {
    id: "104",
    ancho: 104,
    metodo: "compartir",
    hoja: { anchoMm: 103.98, largoMm: 254 },
    titulo: "Rollo 104 mm",
    detalle: "Impresora portátil 4\" (Zebra / Bixolon)",
  },
];

const OPCION_POR_DEFECTO = "80";

function buscarOpcion(id) {
  return OPCIONES.find((o) => o.id === id) ?? OPCIONES.find((o) => o.id === OPCION_POR_DEFECTO);
}

function leerOpcionGuardada() {
  try {
    const guardada = window.localStorage.getItem(CLAVE_OPCION);
    if (OPCIONES.some((o) => o.id === guardada)) return guardada;

    // Migración de versiones anteriores (ids por impresora o solo ancho).
    if (guardada === "104-zebra") return "80-zebra";
    if (guardada === "104-bixolon") return "104";
    const anchoAnterior = Number(window.localStorage.getItem(CLAVE_ANCHO_ANTERIOR));
    if (anchoAnterior === 104) return "104";
    if (anchoAnterior === 80) return "80";
  } catch {
    /* sin localStorage: se usa el valor por defecto */
  }
  return OPCION_POR_DEFECTO;
}

function guardarOpcion(id) {
  try {
    window.localStorage.setItem(CLAVE_OPCION, id);
  } catch {
    /* sin localStorage: se usa el valor en memoria */
  }
}

// ── Conversión PDF → imagen PNG (solo para compartir en celular) ──────────

const PDFJS_VERSION = "3.11.174";
const PDFJS_BASE = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;
/** Resolución de las impresoras térmicas portátiles (ZQ521, XM7-40). */
const DPI_IMPRESORA = 203;
/**
 * Umbral blanco/negro (0-255): por debajo se imprime negro. Alto (200)
 * para que los logos de colores claros (pasados a gris en el backend) no
 * desaparezcan; el texto y el QR ya son negros y no se ven afectados.
 */
const UMBRAL_NEGRO = 200;
/**
 * La impresión de imágenes de Android RELLENA la hoja configurada en Zebra
 * Print (tipo Continuous, "Longitud variable" DESACTIVADA): amplía la
 * imagen hasta cubrirla y recorta lo que sobra, centrado. Por eso la
 * imagen se arma con EXACTAMENTE la proporción de la hoja de la opción
 * elegida (ver OPCIONES[].hoja):
 *  - Ticket individual: sale a tamaño real, ocupando el ancho del rollo.
 *  - Ticket grupal más largo que la hoja: sale completo, reducido para
 *    entrar en el largo de la hoja.
 * Si se cambia la hoja en Zebra Print, hay que cambiarla en OPCIONES.
 */
/**
 * Margen lateral en blanco (cada lado) dentro del ancho del rollo. El
 * contenido del PDF se escala para ocupar TODO el ancho restante, así el
 * texto (letras incluidas) queda proporcional al rollo y nunca se corta.
 */
const MARGEN_LATERAL_MM = 3;
/**
 * Márgenes en blanco alrededor del ticket dentro de la imagen:
 *  - arriba: si la impresora o Android recortan unos milímetros al inicio,
 *    se pierde blanco y no el logo;
 *  - abajo: las últimas líneas pasan la barra de corte antes de cortar.
 *    Al final de este margen se dibuja una línea punteada como guía de
 *    corte.
 */
const MARGEN_SUPERIOR_MM = 5;
const MARGEN_INFERIOR_MM = 20;

let promesaPdfJs = null;

/** Carga PDF.js una sola vez desde cdnjs (solo cuando se necesita). */
function cargarPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!promesaPdfJs) {
    promesaPdfJs = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${PDFJS_BASE}/pdf.min.js`;
      script.async = true;
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/pdf.worker.min.js`;
          resolve(window.pdfjsLib);
        } else {
          promesaPdfJs = null;
          reject(new Error("PDF.js no disponible"));
        }
      };
      script.onerror = () => {
        promesaPdfJs = null;
        reject(new Error("No se pudo cargar PDF.js"));
      };
      document.head.appendChild(script);
    });
  }
  return promesaPdfJs;
}

/** Deja cada píxel en blanco o negro puro (nitidez en papel térmico). */
function aBlancoYNegro(canvas) {
  const ctx = canvas.getContext("2d");
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const luz = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = luz < UMBRAL_NEGRO ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Convierte el PDF del ticket en UNA imagen PNG a 203 dpi, con el ancho
 * físico del rollo y la proporción de la hoja configurada en Zebra Print.
 * Cada página del PDF se escala para ocupar el ancho útil del rollo
 * (ancho de la hoja menos los márgenes laterales). Si el PDF tuviera
 * varias páginas (grupo muy grande), se apilan una debajo de otra.
 */
async function pdfAImagen(datosPdf, nombreBase, hoja) {
  const pdfjsLib = await cargarPdfJs();
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(datosPdf),
    standardFontDataUrl: `${PDFJS_BASE}/standard_fonts/`,
  }).promise;

  const pxPorMm = DPI_IMPRESORA / 25.4;
  const anchoHojaPx = Math.round(hoja.anchoMm * pxPorMm);
  const anchoUtilPx = Math.round((hoja.anchoMm - 2 * MARGEN_LATERAL_MM) * pxPorMm);

  const paginas = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const pagina = await pdf.getPage(n);
    const base = pagina.getViewport({ scale: 1 });
    const vista = pagina.getViewport({ scale: anchoUtilPx / base.width });
    const lienzo = document.createElement("canvas");
    lienzo.width = anchoUtilPx;
    lienzo.height = Math.ceil(vista.height);
    const ctx = lienzo.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    await pagina.render({ canvasContext: ctx, viewport: vista }).promise;
    paginas.push(lienzo);
  }

  // Tamaño del contenido (páginas apiladas) + márgenes arriba y abajo
  const margenSuperior = Math.round(MARGEN_SUPERIOR_MM * pxPorMm);
  const margenInferior = Math.round(MARGEN_INFERIOR_MM * pxPorMm);
  const anchoContenido = anchoUtilPx;
  const altoContenido =
    margenSuperior + paginas.reduce((total, c) => total + c.height, 0) + margenInferior;

  // Lienzo con la proporción exacta de la hoja:
  //  - ticket más corto que la hoja → se completa con blanco abajo
  //    (sale a tamaño real, ocupando el ancho del rollo);
  //  - ticket más largo (grupal grande) → se agregan márgenes blancos a
  //    los lados (sale completo, un poco reducido, sin cortarse).
  const proporcion = hoja.largoMm / hoja.anchoMm;
  let anchoFinal = anchoHojaPx;
  let altoFinal = Math.round(anchoHojaPx * proporcion);
  if (altoContenido > altoFinal) {
    altoFinal = altoContenido;
    anchoFinal = Math.round(altoContenido / proporcion);
  }

  const final = document.createElement("canvas");
  final.width = anchoFinal;
  final.height = altoFinal;
  const ctxFinal = final.getContext("2d");
  ctxFinal.fillStyle = "#ffffff";
  ctxFinal.fillRect(0, 0, final.width, final.height);
  let y = margenSuperior;
  const x = Math.round((anchoFinal - anchoContenido) / 2);
  for (const c of paginas) {
    ctxFinal.drawImage(c, x, y);
    y += c.height;
  }

  // Línea punteada de corte al final del margen inferior
  const grosorLinea = Math.max(2, Math.round(0.4 * pxPorMm));
  const yLinea = y + margenInferior - grosorLinea;
  const largoGuion = Math.round(2 * pxPorMm);
  ctxFinal.fillStyle = "#000000";
  for (let xi = x; xi < x + anchoContenido; xi += largoGuion * 2) {
    ctxFinal.fillRect(xi, yLinea, largoGuion, grosorLinea);
  }

  aBlancoYNegro(final);

  const blob = await new Promise((resolve, reject) =>
    final.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("No se pudo crear la imagen"))),
      "image/png",
    ),
  );
  return new File([blob], `${nombreBase}.png`, { type: "image/png" });
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
  const [ultimaOpcion, setUltimaOpcion] = useState(leerOpcionGuardada);
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
   * Abre el menú "Compartir" del sistema con el ticket (imagen o PDF).
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

  /**
   * Método "compartir": generar el ticket, convertirlo a imagen PNG y
   * compartirlo (Imprimir → Zebra Print, o mPrint). Si la conversión
   * falla, se comparte el PDF.
   */
  const imprimirCompartiendo = async (ancho, hoja) => {
    setArchivoPendiente(null);
    setCargando(true);
    let archivo;
    try {
      const res = await atencionesApi.descargarVoucherTicket(atencionId, ancho);
      const nombreBase = `ticket-${atencionId}`;
      try {
        const datos = res.data instanceof Blob ? await res.data.arrayBuffer() : res.data;
        archivo = await pdfAImagen(datos, nombreBase, hoja);
      } catch (errImagen) {
        console.warn("No se pudo convertir el ticket a imagen; se comparte el PDF.", errImagen);
        archivo = new File([res.data], `${nombreBase}.pdf`, { type: "application/pdf" });
      }
    } catch (err) {
      const msg = await mensajeDeError(err);
      if (onError) onError(msg);
      return;
    } finally {
      setCargando(false);
    }
    await compartirArchivo(archivo);
  };

  /**
   * Método "dialogo": abrir el PDF en una pestaña nueva para imprimirlo con
   * el diálogo del sistema (impresora de mostrador en PC).
   */
  const imprimirEnPestana = async (ancho) => {
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
      const res = await atencionesApi.descargarVoucherTicket(atencionId, ancho);
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

  const imprimir = async (opcion) => {
    if (!atencionId || cargando) return;
    setPanelAbierto(false);
    setUltimaOpcion(opcion.id);
    guardarOpcion(opcion.id);

    if (opcion.metodo === "compartir" && esMovil() && puedeCompartirArchivos()) {
      await imprimirCompartiendo(opcion.ancho, opcion.hoja);
    } else {
      await imprimirEnPestana(opcion.ancho);
    }
  };

  const opcionActiva = buscarOpcion(ultimaOpcion);

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
                Elige el rollo y la impresora.
              </p>

              <div className={styles.opciones}>
                {OPCIONES.map((o) => {
                  const activo = o.id === opcionActiva.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      className={`${styles.opcion} ${activo ? styles.opcionActiva : ""}`}
                      onClick={() => imprimir(o)}
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

      {/* Barra "Ticket listo": aparece si el menú Compartir no pudo abrirse
          automáticamente. Un toque lo abre con el ticket. */}
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
              Imprimir
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