import { formatearMonto } from "../../utils/formatters";
import styles from "./AuditoriaPage.module.css";

/* Etiquetas legibles para las claves JSON que guarda el backend */
const LABELS = {
  atencionId: "ID atención",
  correlativo: "Correlativo",
  pnr: "PNR",
  nombre: "Nombre",
  apellido: "Apellido",
  correo: "Correo",
  telefono: "Teléfono",
  nuevoTotal: "Nuevo total",
  motivo: "Motivo",
  pdfUrl: "PDF",
  registroDiarioId: "Registro diario",
};

const etiqueta = (k) =>
  LABELS[k] ??
  k
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase());

function formatearValor(clave, valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (clave === "nuevoTotal" && !Number.isNaN(Number(valor)))
    return formatearMonto(Number(valor));
  if (clave === "pdfUrl") return String(valor).split("/").pop();
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

function parsear(detalle) {
  if (!detalle || typeof detalle !== "string") return null;
  try {
    const obj = JSON.parse(detalle);
    return obj && typeof obj === "object" && !Array.isArray(obj) ? obj : null;
  } catch {
    // Algunos registros antiguos no son JSON válido (p. ej. nombres con comillas)
    return null;
  }
}

export default function DetalleAuditoria({ detalle }) {
  if (!detalle) return <span className={styles.dash}>—</span>;

  const obj = parsear(detalle);
  if (!obj) return <span className={styles.detalleRaw}>{detalle}</span>;

  const entradas = Object.entries(obj);
  if (entradas.length === 0) return <span className={styles.dash}>—</span>;

  return (
    <dl className={styles.detalleList}>
      {entradas.map(([k, v]) => (
        <div key={k} style={{ display: "contents" }}>
          <dt className={styles.detalleLabel}>{etiqueta(k)}</dt>
          <dd
            className={styles.detalleValor}
            title={typeof v === "string" ? v : undefined}
          >
            {formatearValor(k, v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}