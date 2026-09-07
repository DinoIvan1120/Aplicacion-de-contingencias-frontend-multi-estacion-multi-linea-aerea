import styles from './RoomSelector.module.css'

function RoomRow({ label, sub, count, onInc, onDec, max, disabled }) {
  const available = max - count
  const soldOut = max === 0
  return (
    <div className={styles.row}>
      <div className={styles.info}>
        <span className={styles.label}>{label}</span>
        <span className={styles.sub}>{sub}</span>
        {soldOut
          ? <span className={styles.soldOut}>¡Agotado!</span>
          : <span className={styles.available}>Disponibles: {available}</span>}
      </div>
      <div className={styles.controls}>
        <button
          type="button"
          onClick={onDec}
          disabled={disabled || count <= 0}
          className={styles.btn}
          aria-label="Decrementar"
        >−</button>
        <span className={styles.count}>{count}</span>
        <button
          type="button"
          onClick={onInc}
          disabled={disabled || count >= max || soldOut}
          className={styles.btn}
          aria-label="Incrementar"
        >+</button>
      </div>
    </div>
  )
}

export default function RoomSelector({ value = {}, onChange, maxSimples = 0, maxDobles = 0, maxMatrimoniales = 0, disabled = false }) {
  const { simples = 0, dobles = 0, matrimoniales = 0 } = value

  const update = (key, delta) => {
    onChange({ ...value, [key]: (value[key] ?? 0) + delta })
  }

  return (
    <div className={styles.wrap}>
      <RoomRow
        label="Simples"
        sub="1 persona por habitación"
        count={simples}
        max={maxSimples}
        onInc={() => update('simples', 1)}
        onDec={() => update('simples', -1)}
        disabled={disabled}
      />
      <RoomRow
        label="Dobles"
        sub="2 camas individuales"
        count={dobles}
        max={maxDobles}
        onInc={() => update('dobles', 1)}
        onDec={() => update('dobles', -1)}
        disabled={disabled}
      />
      <RoomRow
        label="Matrimoniales"
        sub="1 cama matrimonial"
        count={matrimoniales}
        max={maxMatrimoniales}
        onInc={() => update('matrimoniales', 1)}
        onDec={() => update('matrimoniales', -1)}
        disabled={disabled}
      />
    </div>
  )
}
