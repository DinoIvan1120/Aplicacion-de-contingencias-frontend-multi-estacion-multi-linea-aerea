/**
 * Formatea un LocalDateTime que viene del backend.
 *
 * El backend usa LocalDateTime sin zona + BD en UTC.
 * Jackson serializa sin sufijo 'Z', ej: "2026-05-09T16:00:00"
 * pero el valor real en BD es UTC.
 * Al agregar 'Z' forzamos que JS lo interprete como UTC
 * y luego Intl lo convierte correctamente a Lima (UTC-5).
 */
export function formatearFecha(fecha) {
  if (!fecha) return "—";
  // Si ya trae zona (contiene + o Z), no modificar
  const raw =
    typeof fecha === "string" && !fecha.includes("Z") && !fecha.includes("+")
      ? fecha + "-05:00" // offset Lima — el backend ya guarda hora Lima
      : fecha;
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Lima",
  }).format(new Date(raw));
}

export function formatearFechaSolo(fecha) {
  if (!fecha) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(fecha));
}

export function formatearMonto(monto) {
  if (monto == null) return "S/ 0.00";
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(monto);
}

export function formatearCorrelativo(num) {
  if (!num) return "—";
  return `SGC-${String(num).padStart(9, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────
// Telefono (WhatsApp) - prefijo internacional +51 (Peru) fijo
// ─────────────────────────────────────────────────────────────────────────

export const PREFIJO_PERU = "+51";

/**
 * Extrae solo el numero local (digitos, sin prefijo de pais) a partir
 * de un valor arbitrario que puede venir en distintos formatos:
 * - Ya en E.164 con el prefijo: "+51987654321" -> "987654321"
 * - Pegado sin el "+": "51987654321" -> "987654321"
 * - Con el 00 internacional: "0051987654321" -> "987654321"
 * - Con espacios/guiones: "987 654 321" -> "987654321"
 * - Ya limpio: "987654321" -> "987654321"
 *
 * Evita que el prefijo quede duplicado (ej. "+51 +51987654321") sin
 * importar como el usuario haya escrito o pegado el numero.
 */
export function limpiarNumeroLocalPeru(raw) {
  if (!raw) return "";
  const str = String(raw).trim();

  // Si viene con el "+51" explícito, el prefijo es inequívoco: se quita siempre,
  // sin importar cuántos dígitos locales queden (por eso fallaba al borrar).
  if (str.startsWith(PREFIJO_PERU)) {
    return str.slice(PREFIJO_PERU.length).replace(/\D/g, "").slice(0, 9);
  }

  let digits = str.replace(/\D/g, "");

  if (digits.startsWith("0051")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("51") && digits.length > 9) {
    digits = digits.slice(2);
  }

  return digits.slice(0, 9);
}

/**
 * Arma el numero completo en formato internacional E.164 a partir del
 * numero local ingresado por el usuario. Devuelve "" (no null) si no
 * hay numero, para que sea facil de usar en inputs controlados.
 */
export function formatearTelefonoPeru(numeroLocal) {
  const local = limpiarNumeroLocalPeru(numeroLocal);
  return local ? `${PREFIJO_PERU}${local}` : "";
}
