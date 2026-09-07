import styles from './Input.module.css'

export default function Input({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  disabled = false,
  required = false,
  icon: Icon,
  ...rest
}) {
  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={name} className={styles.label}>
          {label}
          {required && <span className={styles.req}>*</span>}
        </label>
      )}
      <div className={styles.inputWrap}>
        {Icon && <span className={styles.icon}><Icon size={16} /></span>}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={[styles.input, Icon ? styles.withIcon : '', error ? styles.hasError : ''].filter(Boolean).join(' ')}
          {...rest}
        />
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
