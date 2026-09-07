import styles from './Select.module.css'

export default function Select({
  label,
  name,
  value,
  onChange,
  options = [],
  error,
  disabled = false,
  placeholder = 'Seleccione...',
  required = false,
}) {
  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={name} className={styles.label}>
          {label}
          {required && <span className={styles.req}>*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={[styles.select, error ? styles.hasError : ''].filter(Boolean).join(' ')}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
