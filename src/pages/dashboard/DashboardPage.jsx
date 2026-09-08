import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import styles from "./DashboardPage.module.css";

/* ── Módulos por rol — fiel al Excel ──────────────────
   agente:        compensación, reportes
   lider:         vuelo, compensación, reportes, proveedores
   administrador: vuelo, compensación, reportes, Administrador (panel)
   aerolinea:     reportes
   proveedor:     reportes
   ─────────────────────────────────────────────────── */
const ALL_MODULES = {
  vuelo: {
    id: "vuelo",
    title: "Registro de Vuelo",
    desc: "Registra vuelos con contingencia y habilita los recursos del día",
    path: "/lider/vuelo",
    color: "#E63946",
    bgColor: "rgba(230,57,70,0.12)",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" width="28" height="28">
        <path
          d="M34 20.5V18L22 12V5.5A2 2 0 0 0 20 3.5A2 2 0 0 0 18 5.5V12L6 18V20.5L18 17V25L14 27.5V30L20 28.5L26 30V27.5L22 25V17L34 20.5Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  compensacion: {
    id: "compensacion",
    title: "Registro de Compensación",
    desc: "Registra pasajeros afectados y asigna servicios de hotel, transporte y restaurante",
    path: "/agente/atencion",
    color: "#2D9B6F",
    bgColor: "rgba(45,155,111,0.12)",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" width="28" height="28">
        <circle cx="14" cy="13" r="5" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="26" cy="13" r="5" stroke="currentColor" strokeWidth="2.5" />
        <path
          d="M4 32c0-5.523 4.477-10 10-10h12c5.523 0 10 4.477 10 10"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  reportes: {
    id: "reportes",
    title: "Gestión de Reportes",
    desc: "Visualiza, filtra y exporta reportes de atenciones y vouchers",
    path: "/reportes",
    color: "#7B5EA7",
    bgColor: "rgba(123,94,167,0.12)",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" width="28" height="28">
        <rect
          x="5"
          y="5"
          width="30"
          height="30"
          rx="4"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <path
          d="M12 27V20M20 27V13M28 27V17"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  proveedores: {
    id: "proveedores",
    title: "Gestión de Proveedores",
    desc: "Administra hoteles, transportes y restaurantes con sus tarifas",
    path: "/admin/proveedores",
    color: "#E07A20",
    bgColor: "rgba(224,122,32,0.12)",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" width="28" height="28">
        <path
          d="M6 34V18l14-12 14 12v16"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <rect
          x="14"
          y="22"
          width="6"
          height="8"
          rx="1"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <rect
          x="20"
          y="22"
          width="6"
          height="8"
          rx="1"
          stroke="currentColor"
          strokeWidth="2.5"
        />
      </svg>
    ),
  },
  administrador: {
    id: "administrador",
    title: "Administrador",
    desc: "Gestiona proveedores, usuarios, vuelos y auditoría del sistema",
    path: "/admin",
    color: "#EA580C",
    bgColor: "rgba(234,88,12,0.12)",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" width="28" height="28">
        <rect
          x="4"
          y="4"
          width="14"
          height="14"
          rx="3"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <rect
          x="22"
          y="4"
          width="14"
          height="14"
          rx="3"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <rect
          x="4"
          y="22"
          width="14"
          height="14"
          rx="3"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <rect
          x="22"
          y="22"
          width="14"
          height="14"
          rx="3"
          stroke="currentColor"
          strokeWidth="2.5"
          opacity=".45"
        />
      </svg>
    ),
  },
};

/* Mapeo fiel al Excel + la card de administrador como módulo agrupado */
const MODULES_BY_ROL = {
  AGENTE_SAASA: ["compensacion", "reportes"],
  LIDER_SAASA: ["vuelo", "compensacion", "reportes", "proveedores"],
  ADMINISTRADOR: ["vuelo", "compensacion", "reportes", "administrador"],
  LINEA_AEREA: ["reportes"],
  PROVEEDOR: ["reportes"],
};

const ROL_LABELS = {
  ADMINISTRADOR: "Administrador del Sistema",
  //LIDER_SAASA: "Líder Aeroportuario",
  LIDER_SAASA: "Líder SAASA",
  AGENTE_SAASA: "Agente SAASA",
  LINEA_AEREA: "Línea Aérea",
  PROVEEDOR: "Proveedor",
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, rol, logout, esAdministradorGlobal, seleccionarEstacion,
        estacionActiva, lineaAereaActiva } = useAuth();

  const moduleIds = MODULES_BY_ROL[rol] ?? [];
  const modules = moduleIds.map((id) => ALL_MODULES[id]).filter(Boolean);
    // Parte 3: el Administrador Global no opera desde una estación fija —
    // se le distingue del resto con su propia etiqueta en vez de la genérica
    // "Administrador del Sistema" que trae ROL_LABELS para ADMINISTRADOR.
  const rolLabel = esAdministradorGlobal
    ? "Administrador Global del Sistema"
    : ROL_LABELS[rol] ?? rol;

  


  // Botón inferior del dashboard (Fase 5):
  // - Administrador Global: NO cierra sesión, solo lo regresa al selector de
  //   aerolínea de la MISMA estación en la que ya está operando, para que
  //   pueda cambiar de aerolínea sin volver a elegir estación ni reloguear.
  //   Se mantiene estacionActiva y solo se limpia lineaAereaActiva para que
  //   el selector no arrastre la aerolínea de la sesión anterior.
  // - Cualquier otro usuario (con estación fija o varias asignadas): se
  //   mantiene el comportamiento actual, cerrar sesión.
    const handleVolver = () => {
      if (esAdministradorGlobal) {
        seleccionarEstacion(estacionActiva, null);
        navigate("/seleccionar-aerolinea", { state: { estacion: estacionActiva } });
      } else {
        logout();
      }
    };

  return (
    <div className={styles.page}>
      <div className={styles.bg} />
      <div className={styles.bgOverlay} />

      {/* Partículas decorativas */}
      <div
        className={styles.particle}
        style={{ top: "12%", left: "8%", animationDelay: "0s" }}
      />
      <div
        className={styles.particle}
        style={{ top: "25%", left: "85%", animationDelay: "1.2s" }}
      />
      <div
        className={styles.particle}
        style={{ top: "70%", left: "15%", animationDelay: "2.4s" }}
      />
      <div
        className={styles.particle}
        style={{ top: "80%", left: "75%", animationDelay: "0.8s" }}
      />

      <div className={styles.container}>
        {/* Ícono de avión */}
        <div className={styles.planeRing}>
          <svg viewBox="0 0 40 40" fill="none" width="32" height="32">
            <path
              d="M34 20.5V18L22 12V5.5A2 2 0 0 0 20 3.5A2 2 0 0 0 18 5.5V12L6 18V20.5L18 17V25L14 27.5V30L20 28.5L26 30V27.5L22 25V17L34 20.5Z"
              fill="white"
            />
          </svg>
        </div>

        {/* Bienvenida */}
        <div className={styles.welcome}>
          <p className={styles.welcomeSub}>Bienvenido,</p>
          <h1 className={styles.welcomeName}>
            {user?.nombre} {user?.apellido}
          </h1>
          <div className={styles.rolBadge}>{rolLabel}</div>
        </div>

        {/* Info sistema */}
        <div className={styles.sysInfo}>
        <span className={styles.sysTitle}>Gestión Aeroportuario</span>
        <span className={styles.sysDot}>·</span>
        <span className={styles.sysSub}>
        {estacionActiva?.nombre ?? "Sistema de Gestión"}
        {lineaAereaActiva?.lineaAereaNombre
          ? ` — ${lineaAereaActiva.lineaAereaNombre}`
          : ""}
    </span>
</div>

        {/* Cards */}
        <div className={styles.grid} style={{ "--count": modules.length }}>
          {modules.map((mod, i) => (
            <button
              key={mod.id}
              className={styles.card}
              onClick={() => navigate(mod.path)}
              style={{
                "--delay": `${i * 0.07}s`,
                "--accent": mod.color,
                "--accentBg": mod.bgColor,
              }}
            >
              <div
                className={styles.cardIcon}
                style={{ background: mod.bgColor, color: mod.color }}
              >
                {mod.icon}
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{mod.title}</h3>
                <p className={styles.cardDesc}>{mod.desc}</p>
              </div>
              <div className={styles.cardArrow} style={{ color: mod.color }}>
                <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                  <path
                    d="M4 10h12M12 6l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className={styles.cardShine} />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button className={styles.logoutBtn} onClick={handleVolver}>
          <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
            <path
              d="M7 3H4a1 1 0 00-1 1v12a1 1 0 001 1h3M13 15l4-5-4-5M17 10H7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {esAdministradorGlobal ? "Volver a selección de aerolínea" : "Volver al inicio de sesión"}
        </button>
      </div>
    </div>
  );
}
