import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import styles from "./DatePicker.module.css";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const DIAS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

function fmt(d) {
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// "yyyy-MM-dd" → Date
function fromISO(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Date → "yyyy-MM-dd"
function toISO(d) {
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Sub-componente: Calendario
// ═════════════════════════════════════════════════════════════════════════════
function Calendar_({
  viewing,
  selected,
  rangeStart,
  rangeEnd,
  onPick,
  onNav,
  alignRight,
}) {
  const y = viewing.getFullYear();
  const m = viewing.getMonth();
  const first = new Date(y, m, 1);
  const startDow = (first.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrev = new Date(y, m, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells = [];

  // Días del mes anterior (relleno)
  for (let i = 0; i < startDow; i++) {
    cells.push({
      day: daysInPrev - startDow + i + 1,
      current: false,
      date: null,
    });
  }

  // Días del mes actual
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true, date: new Date(y, m, d) });
  }

  // Días del mes siguiente (relleno para completar filas)
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, current: false, date: null });
  }

  return (
    <div className={`${styles.cal} ${alignRight ? styles.calRight : ""}`}>
      {/* Navegación */}
      <div className={styles.calHead}>
        <button
          className={styles.navBtn}
          onClick={() => onNav(-1)}
          aria-label="Mes anterior"
        >
          <ChevronLeft size={14} />
        </button>
        <span className={styles.calTitle}>
          {MESES[m]} {y}
        </span>
        <button
          className={styles.navBtn}
          onClick={() => onNav(1)}
          aria-label="Mes siguiente"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Días de la semana */}
      <div className={styles.dow}>
        {DIAS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      {/* Grilla de días */}
      <div className={styles.days}>
        {cells.map((cell, i) => {
          if (!cell.current) {
            return (
              <span key={i} className={styles.dayOther}>
                {cell.day}
              </span>
            );
          }

          const dt = cell.date;
          const isToday = sameDay(dt, today);
          const isSelected = sameDay(dt, selected);
          const isStart = sameDay(dt, rangeStart);
          const isEnd = sameDay(dt, rangeEnd);
          const inRange =
            rangeStart && rangeEnd && dt > rangeStart && dt < rangeEnd;

          let cls = styles.day;
          if (isToday) cls += ` ${styles.dayToday}`;
          if (isSelected || isStart || isEnd) cls += ` ${styles.daySelected}`;
          else if (inRange) cls += ` ${styles.dayInRange}`;

          return (
            <button key={i} className={cls} onClick={() => onPick(dt)}>
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DatePicker — input con dropdown de calendario
// ═════════════════════════════════════════════════════════════════════════════
const CAL_WIDTH = 252; // debe coincidir con el width del .cal en CSS

export function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
  rangeStart,
  rangeEnd,
}) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const [viewing, setViewing] = useState(() => {
    const d = fromISO(value);
    return d
      ? new Date(d.getFullYear(), d.getMonth(), 1)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });
  const ref = useRef(null);
  const triggerRef = useRef(null);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Al abrir, detectar si el calendario se sale por la derecha
  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Si el borde derecho del calendario supera el viewport, alinear a la derecha
      setAlignRight(rect.left + CAL_WIDTH > window.innerWidth - 8);
    }
    setOpen((v) => !v);
  };

  const handlePick = useCallback(
    (date) => {
      const minDate = fromISO(min);
      const maxDate = fromISO(max);
      if (minDate && date < minDate) return;
      if (maxDate && date > maxDate) return;
      onChange(toISO(date));
      setOpen(false);
    },
    [min, max, onChange],
  );

  const handleNav = (dir) => {
    setViewing((v) => new Date(v.getFullYear(), v.getMonth() + dir, 1));
  };

  const selected = fromISO(value);

  return (
    <div className={styles.field} ref={ref}>
      {label && <span className={styles.label}>{label}</span>}
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
        onClick={handleOpen}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Calendar size={14} className={styles.triggerIcon} aria-hidden="true" />
        <span>{fmt(selected) || "DD/MM/AAAA"}</span>
      </button>

      {open && (
        <Calendar_
          viewing={viewing}
          selected={selected}
          rangeStart={fromISO(rangeStart)}
          rangeEnd={fromISO(rangeEnd)}
          onPick={handlePick}
          onNav={handleNav}
          alignRight={alignRight}
        />
      )}
    </div>
  );
}
