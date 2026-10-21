import { useState } from "react";
import { Printer } from "lucide-react";
import atencionesApi from "../../api/atencionesApi";
import Spinner from "./Spinner.jsx";
import styles from "./BotonImprimirTicket.module.css";

/**
 * NUEVO — Botón "Imprimir ticket" (voucher en formato rollo térmico).
 *
 * Llama a GET /atenciones/{id}/voucher/ticket?ancho=80|104 y abre el PDF en
 * una pestaña nueva, desde donde el agente lo imprime (o lo comparte a la
 * app de la impresora). Si la atención pertenece a un grupo, el backend
 * devuelve automáticamente el ticket GRUPAL.
 *
 * El ancho del rollo elegido se recuerda en el navegador (localStorage), así
 * el agente lo configura una sola vez por dispositivo.
 *
 * Props:
 *  - atencionId        id de la atención (obligatorio)
 *  - disabled          deshabilita el botón (por ejemplo, atención anulada)
 *  - mostrarSelector   muestra el selector de ancho 80/104 mm (default: true)
 *  - compacto          versión pequeña para filas de listas (default: false)
 *  - bloqueEnMovil     en pantallas angostas ocupa todo el ancho (default: false)
 *  - onError(mensaje)  callback para mostrar el error con el modal de la página
 */

const CLAVE_ANCHO = "saasa.ticket.ancho";
const ANCHOS = [80, 104];

function leerAnchoGuardado() {
  try {
    const v = Number(window.localStorage.getItem(CLAVE_ANCHO));
    return ANCHOS.includes(v) ? v : 80;
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
  mostrarSelector = true,
  compacto = false,
  bloqueEnMovil = false,
  onError,
}) {
  const [ancho, setAncho] = useState(leerAnchoGuardado);
  const [cargando, setCargando] = useState(false);

  const cambiarAncho = (e) => {
    const nuevo = Number(e.target.value);
    setAncho(nuevo);
    guardarAncho(nuevo);
  };

  const handleImprimir = async () => {
    if (!atencionId || cargando) return;

    // La pestaña se abre ANTES de la petición, dentro del clic: si se abre
    // después del await, Safari/Chrome móvil la bloquean como popup.
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
      {mostrarSelector && (
        <select
          className={styles.selector}
          value={ancho}
          onChange={cambiarAncho}
          disabled={disabled || cargando}
          aria-label="Ancho del rollo de la impresora"
          title="Ancho del rollo de la impresora"
        >
          {ANCHOS.map((a) => (
            <option key={a} value={a}>
              {a} mm
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        className={styles.btn}
        onClick={handleImprimir}
        disabled={disabled || cargando || !atencionId}
        title={`Imprimir voucher en ticket de ${ancho} mm`}
      >
        {cargando ? <Spinner size="sm" /> : <Printer size={compacto ? 14 : 15} />}
        {cargando ? "Generando..." : compacto ? "Ticket" : "Imprimir ticket"}
      </button>
    </div>
  );
}