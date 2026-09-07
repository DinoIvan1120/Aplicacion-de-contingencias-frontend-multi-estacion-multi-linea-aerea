import { User, Users } from "lucide-react";
import styles from "./TransportSelector.module.css";

const OPTIONS = [
  {
    value: "individual",
    label: "Aeropuerto - Domicilio",
    icon: User,
    desc: "Traslado del aeropuerto al domicilio",
  },
  {
    value: "grupal",
    label: "Domicilio - Aeropuerto",
    icon: Users,
    desc: "Traslado del domicilio al aeropuerto",
  },
  {
    value: "ambos",
    label: "Ambos",
    icon: Users,
    desc: "Ambos tramos: aeropuerto-domicilio y domicilio-aeropuerto",
  },
];

export default function TransportSelector({ value, onChange }) {
  return (
    <div className={styles.wrap}>
      {OPTIONS.map(({ value: v, label, icon: Icon, desc }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={[styles.card, active ? styles.active : ""].join(" ")}
            aria-pressed={active}
          >
            <Icon
              size={22}
              color={active ? "var(--primary)" : "var(--text-500)"}
            />
            <span className={styles.label}>{label}</span>
            <span className={styles.desc}>{desc}</span>
          </button>
        );
      })}
    </div>
  );
}
