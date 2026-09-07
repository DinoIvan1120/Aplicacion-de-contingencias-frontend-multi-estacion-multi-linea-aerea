import styles from "./PhoneInput.module.css";
import { PREFIJO_PERU, limpiarNumeroLocalPeru } from "../../utils/formatters";
import { validarTelefonoPeru } from "../../utils/validators";

/**
 * Input de teléfono con el prefijo internacional +51 (Perú) fijo y
 * no editable.
 *
 * El usuario solo escribe su número local (9 dígitos, ej. 987654321).
 * El componente arma y expone SIEMPRE el valor completo en formato
 * E.164 (ej. "+51987654321") a través de onChange, para que el resto
 * de la app (estado, submit al backend) no tenga que preocuparse por
 * el prefijo ni por duplicados como "+51 +51987654321".
 *
 * @param {string} value        Valor actual en formato E.164 (o vacío/null)
 * @param {(v:string)=>void} onChange  Recibe el nuevo valor en E.164 ("" si se vacía)
 */
export default function PhoneInput({
  id,
  label,
  value,
  onChange,
  placeholder = "987 654 321",
  error,
  disabled = false,
  required = false,
  helperText,
}) {
  const numeroLocal = limpiarNumeroLocalPeru(value);
  const esInvalido =
    numeroLocal.length > 0 &&
    !validarTelefonoPeru(`${PREFIJO_PERU}${numeroLocal}`);
  const mensajeError =
    error || (esInvalido ? "Ingresa un celular válido de 9 dígitos" : "");

  const handleChange = (e) => {
    const local = limpiarNumeroLocalPeru(e.target.value);
    onChange(local ? `${PREFIJO_PERU}${local}` : "");
  };

  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
          {required && <span className={styles.req}>*</span>}
        </label>
      )}
      <div
        className={[styles.inputGroup, mensajeError ? styles.hasError : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <span className={styles.prefix}>{PREFIJO_PERU}</span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          className={styles.input}
          value={numeroLocal}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={9}
        />
      </div>
      {mensajeError && <span className={styles.errorMsg}>{mensajeError}</span>}
      {!mensajeError && helperText && (
        <span className={styles.helperMsg}>{helperText}</span>
      )}
    </div>
  );
}
