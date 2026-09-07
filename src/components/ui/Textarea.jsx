import styles from './Textarea.module.css'

export default function Textarea({ label, name, value, onChange, error, placeholder, disabled, rows = 3, required }) {
  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={name} className={styles.label}>
          {label}
          {required && <span className={styles.req}>*</span>}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={[styles.textarea, error ? styles.hasError : ''].filter(Boolean).join(' ')}
      />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
