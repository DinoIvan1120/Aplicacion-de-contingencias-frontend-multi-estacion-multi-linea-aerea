import { useNavigate } from "react-router-dom";
import styles from "./AdminDashboardPage.module.css";

const CARDS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
        <path
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
    label: "Proveedores",
    desc: "Gestiona hoteles, transportes y restaurantes",
    to: "/admin/proveedores",
    color: "#4F46E5",
    bg: "#EEF2FF",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
        <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M16 11l2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    label: "Usuarios",
    desc: "Administra cuentas y roles del sistema",
    to: "/admin/usuarios",
    color: "#16A34A",
    bg: "#F0FDF4",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
        <path
          d="M21 16V14L13 9V3.5A1.5 1.5 0 0 0 11.5 2A1.5 1.5 0 0 0 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z"
          fill="currentColor"
        />
      </svg>
    ),
    label: "Carga de Vuelos",
    desc: "Importación masiva de vuelos por Excel",
    to: "/admin/vuelos",
    color: "#EA580C",
    bg: "#FFF7ED",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
        <path
          d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9 12l2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    label: "Auditoría",
    desc: "Log de actividad del sistema",
    to: "/auditoria",
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      {/* ── Encabezado ── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerIcon}>
          <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
            <rect
              x="3"
              y="3"
              width="7"
              height="7"
              rx="1.5"
              fill="var(--rol-admin)"
            />
            <rect
              x="14"
              y="3"
              width="7"
              height="7"
              rx="1.5"
              fill="var(--rol-admin)"
              opacity=".6"
            />
            <rect
              x="3"
              y="14"
              width="7"
              height="7"
              rx="1.5"
              fill="var(--rol-admin)"
              opacity=".6"
            />
            <rect
              x="14"
              y="14"
              width="7"
              height="7"
              rx="1.5"
              fill="var(--rol-admin)"
              opacity=".35"
            />
          </svg>
        </div>
        <div>
          <h1 className={styles.title}>Panel de Administración</h1>
          <p className={styles.sub}>
            AirportHub SAASA — Sistema de Gestión de Contingencias
          </p>
        </div>
      </div>

      {/* ── Stats rápidas ── */}
      {/* <div className={styles.statsRow}>
        {[
          { label: "Sistema activo", value: "✓", color: "var(--success)" },
          { label: "Backend", value: "Spring Boot 3", color: "var(--primary)" },
          {
            label: "Plus Ultra Airlines",
            value: "SAASA 2026",
            color: "var(--rol-admin)",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className={styles.statCard}>
            <span className={styles.statValue} style={{ color }}>
              {value}
            </span>
            <span className={styles.statLabel}>{label}</span>
          </div>
        ))}
      </div> */}

      {/* ── 4 Cards centradas ── */}
      <div className={styles.cardsGrid}>
        {CARDS.map(({ icon, label, desc, to, color, bg }) => (
          <button
            key={to}
            className={styles.card}
            onClick={() => navigate(to)}
            style={{ "--accent": color, "--accentBg": bg }}
          >
            {/* Ícono CENTRADO */}
            <div className={styles.cardIconWrap} style={{ background: bg }}>
              <span style={{ color }}>{icon}</span>
            </div>

            <div className={styles.cardContent}>
              <h3 className={styles.cardLabel}>{label}</h3>
              <p className={styles.cardDesc}>{desc}</p>
            </div>

            <span className={styles.cardLink} style={{ color }}>
              → Gestionar
            </span>
          </button>
        ))}
      </div>

      {/* ── Accesos rápidos ── */}
      <div className={styles.quickSection}>
        <h2 className={styles.sectionTitle}>Accesos rápidos</h2>
        <div className={styles.quickLinks}>
          {[
            {
              label: "Ver Reportes",
              path: "/reportes",
              color: "var(--primary)",
            },
            {
              label: "Registrar Vuelo",
              path: "/lider/vuelo",
              color: "var(--rol-lider)",
            },
            {
              label: "Atención Pasajero",
              path: "/agente/atencion",
              color: "var(--rol-agente)",
            },
          ].map(({ label, path, color }) => (
            <button
              key={path}
              className={styles.quickLink}
              style={{ "--q-color": color }}
              onClick={() => navigate(path)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
