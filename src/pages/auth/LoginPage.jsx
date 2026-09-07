import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import authApi from "../../api/authApi";
import estacionesApi from "../../api/estacionesApi";
import styles from "./LoginPage.module.css";

const VIEW = { LOGIN: "login", FORGOT: "forgot", RESET: "reset" };

// Modo de login: correo (todos los roles) o DNI (solo AGENTE_SAASA)
const LOGIN_MODE = { CORREO: "correo", DNI: "dni" };

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, seleccionarEstacion } = useAuth();

  const [view, setView] = useState(VIEW.LOGIN);
  const [animating, setAnimating] = useState(false);

  const [loginMode, setLoginMode] = useState(LOGIN_MODE.CORREO);
  const [loginForm, setLoginForm] = useState({
    correo: "",
    dni: "",
    password: "",
  });

  // ── Estado forgot ─────────────────────────────────────────────────────────
  // forgotMode se hereda del loginMode: si el agente llegó con DNI,
  // la recuperación también usa DNI.
  const [forgotMode, setForgotMode] = useState(LOGIN_MODE.CORREO);
  const [forgotCorreo, setForgotCorreo] = useState("");
  const [forgotDni, setForgotDni] = useState("");

  // ── Estado reset ──────────────────────────────────────────────────────────
  // Necesitamos saber qué identificador usar al hacer reset (el mismo que en forgot).
  const [resetIdentificador, setResetIdentificador] = useState({
    type: "correo",
    value: "",
  });
  // const [resetForm, setResetForm] = useState({ codigo: "", nuevaPassword: "" });

  // const [forgotEmail, setForgotEmail] = useState("");
  const [resetForm, setResetForm] = useState({ codigo: "", nuevaPassword: "" });

  const [showPass, setShowPass] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  // Un único modal para éxito Y error — type: 'success' | 'error'
  const [modal, setModal] = useState({ show: false, type: "success", msg: "" });

  const goTo = (next) => {
    if (next === view) return;
    setAnimating(true);
    setTimeout(() => {
      setView(next);
      setAnimating(false);
    }, 260);
  };

  const goToForgot = () => {
    // Propagar el modo de login al modo de recuperación
    setForgotMode(loginMode);
    if (loginMode === LOGIN_MODE.DNI) setForgotDni(loginForm.dni);
    goTo(VIEW.FORGOT);
  };

  const showModal = (type, msg) => setModal({ show: true, type, msg });
  const showError = (msg) => showModal("error", msg);
  const showOk = (msg) => showModal("success", msg);

  const closeModal = () => {
    const { type } = modal;
    setModal({ show: false, type: "success", msg: "" });
    if (type === "success") {
      if (view === VIEW.FORGOT) goTo(VIEW.RESET);
      if (view === VIEW.RESET) {
        setForgotCorreo("");
        setForgotDni("");
        setResetForm({ codigo: "", nuevaPassword: "" });
        goTo(VIEW.LOGIN);
      }
    }
  };

  // ── Toggle de modo login ──────────────────────────────────────────────────
  const switchLoginMode = (mode) => {
    setLoginMode(mode);
    setLoginForm({ correo: "", dni: "", password: "" });
  };

  // ── Selector de estación/línea aérea (Fase 5 — rediseño) ──────────────────
  // Ya no se resuelve dentro de esta tarjeta de login: al detectar que el
  // usuario necesita elegir estación (Administrador Global o multi-estación
  // sin contexto fijo), se navega a la pantalla completa /seleccionar-estacion
  // (mismo formato de tarjetas que el Dashboard). Ver SeleccionarEstacionPage
  // y SeleccionarAerolineaPage.

  /** Caso normal (una sola estación asignada): se resuelve sin preguntar nada. */
  const autoSeleccionarContextoFijo = async (estacionId, lineaAereaId) => {
  try {
    const [{ data: estacionData }, { data: lineasData }] = await Promise.all([
      estacionesApi.getById(estacionId),
      estacionesApi.getLineasAereas(estacionId, { estado: 1 }),
    ]);
    const estacion = estacionData?.data ?? { id: estacionId };
    const linea = (lineasData?.data ?? []).find((l) => l.lineaAereaId === lineaAereaId)
      ?? { lineaAereaId };
    seleccionarEstacion(estacion, linea);
  } catch {
    seleccionarEstacion({ id: estacionId }, { lineaAereaId });
  }
};

  /* ── LOGIN ── */
  const handleLogin = async (e) => {
    e.preventDefault();

    if (
      loginMode === LOGIN_MODE.CORREO &&
      (!loginForm.correo || !loginForm.password)
    ) {
      showError("Por favor, ingresa tu correo y contraseña.");
      return;
    }
    if (
      loginMode === LOGIN_MODE.DNI &&
      (!loginForm.dni || !loginForm.password)
    ) {
      showError("Por favor, ingresa tu DNI y contraseña.");
      return;
    }

    setLoading(true);
    try {
      const body =
        loginMode === LOGIN_MODE.CORREO
          ? { correo: loginForm.correo, password: loginForm.password }
          : { dni: loginForm.dni, password: loginForm.password };

      const { data } = await authApi.login(body);
      if (data.success) {
        const payload = data.data; // { token, rol, nombre, apellido, expiresIn, estacionIds }
        login(payload);

         if (payload.lineaAereaFija) {
          await autoSeleccionarContextoFijo(payload.estacionFijaId, payload.lineaAereaFijaId);
          navigate("/dashboard", { replace: true });
        } else if ((payload.estacionIds ?? []).length === 0) {
          // Administrador Global (JWT sin estaciones asignadas): antes de
          // preguntarle dónde operar, se le da a elegir si en realidad
          // quiere entrar al catálogo global de Estaciones y Aerolíneas
          // (Fase 6 — separación de rutas).
          navigate("/seleccionar-modo", { replace: true });
        } else {
          // Usuario multi-estación (no admin global) sin contexto fijo:
          // la selección es una pantalla completa propia (Fase 5 — rediseño).
          navigate("/seleccionar-estacion", { replace: true });
        }
      } else {
        showError(data.message ?? "Credenciales inválidas.");
      }
    } catch (err) {
      showError(
        err.response?.data?.message ?? "No se pudo conectar al servidor.",
      );
    } finally {
      setLoading(false);
    }
  };
  // const handleLogin = async (e) => {
  //   e.preventDefault();
  //   if (!loginForm.correo || !loginForm.password) {
  //     showError("Por favor, ingresa tu correo y contraseña.");
  //     return;
  //   }
  //   setLoading(true);
  //   try {
  //     const { data } = await authApi.login({
  //       correo: loginForm.correo,
  //       password: loginForm.password,
  //     });
  //     if (data.success) {
  //       login(data.data);
  //       navigate("/dashboard", { replace: true });
  //     } else {
  //       showError(data.message ?? "Credenciales inválidas.");
  //     }
  //   } catch (err) {
  //     showError(
  //       err.response?.data?.message ?? "No se pudo conectar al servidor.",
  //     );
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  /* ── FORGOT ── */
  // const handleForgot = async (e) => {
  //   e.preventDefault();
  //   if (!forgotEmail) {
  //     showError("Por favor, ingresa tu correo electrónico.");
  //     return;
  //   }
  //   setLoading(true);
  //   try {
  //     await authApi.forgotPassword({ correo: forgotEmail });
  //     showOk(`Se envió el código de verificación al correo ${forgotEmail}`);
  //   } catch (err) {
  //     showError(
  //       err.response?.data?.message ??
  //         "No se pudo enviar el correo de recuperación.",
  //     );
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // ── FORGOT ────────────────────────────────────────────────────────────────
  const handleForgot = async (e) => {
    e.preventDefault();

    if (forgotMode === LOGIN_MODE.CORREO) {
      if (!forgotCorreo) {
        showError("Por favor, ingresa tu correo electrónico.");
        return;
      }
      setLoading(true);
      try {
        await authApi.forgotPassword({ correo: forgotCorreo });
        setResetIdentificador({ type: "correo", value: forgotCorreo });
        showOk(`Se envió el código de verificación al correo ${forgotCorreo}.`);
      } catch (err) {
        showError(
          err.response?.data?.message ??
            "No se pudo enviar el correo de recuperación.",
        );
      } finally {
        setLoading(false);
      }
    } else {
      // Modo DNI (AGENTE_SAASA)
      if (!forgotDni) {
        showError("Por favor, ingresa tu DNI.");
        return;
      }
      setLoading(true);
      try {
        // 1. Solicitar recuperación (el backend intentará enviar el código si hay correo)
        await authApi.forgotPasswordDni({ dni: forgotDni });

        // 2. Consultar si el agente tiene correo para mostrar el mensaje correcto
        const { data: checkData } = await authApi.agentetieneCorreo(forgotDni);
        const tieneCorreo = checkData?.data === true;

        setResetIdentificador({ type: "dni", value: forgotDni });

        if (tieneCorreo) {
          showOk("Se envió el código de verificación a tu correo registrado.");
        } else {
          // Sin correo → Flujo A: orientar al admin, pero igual dejamos avanzar al RESET
          // por si en el futuro el admin le envía el código por otro canal.
          showModal(
            "error",
            "No tienes correo registrado en el sistema. " +
              "Comunícate con tu administrador para restablecer tu contraseña.",
          );
          // No navegamos a RESET — el closeModal de error no navega
        }
      } catch (err) {
        showError(
          err.response?.data?.message ?? "No se pudo procesar la solicitud.",
        );
      } finally {
        setLoading(false);
      }
    }
  };

  /* ── RESET ── */
  // const handleReset = async (e) => {
  //   e.preventDefault();
  //   if (!resetForm.codigo || !resetForm.nuevaPassword) {
  //     showError("Por favor, completa el código y la nueva contraseña.");
  //     return;
  //   }
  //   if (resetForm.nuevaPassword.length < 8) {
  //     showError("La contraseña debe tener al menos 8 caracteres.");
  //     return;
  //   }
  //   setLoading(true);
  //   try {
  //     await authApi.resetPassword({
  //       correo: forgotEmail,
  //       codigo: resetForm.codigo,
  //       nuevaPassword: resetForm.nuevaPassword,
  //     });
  //     showOk(
  //       "¡Contraseña actualizada exitosamente! Ahora puedes ingresar a tu cuenta.",
  //     );
  //   } catch (err) {
  //     showError(err.response?.data?.message ?? "Código inválido o expirado.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const handleReset = async (e) => {
    e.preventDefault();
    if (!resetForm.codigo || !resetForm.nuevaPassword) {
      showError("Por favor, completa el código y la nueva contraseña.");
      return;
    }
    if (resetForm.nuevaPassword.length < 8) {
      showError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    const passRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passRegex.test(resetForm.nuevaPassword)) {
      showError(
        "La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número.",
      );
      return;
    }

    setLoading(true);
    try {
      const body =
        resetIdentificador.type === "correo"
          ? {
              correo: resetIdentificador.value,
              codigo: resetForm.codigo,
              nuevaPassword: resetForm.nuevaPassword,
            }
          : {
              dni: resetIdentificador.value,
              codigo: resetForm.codigo,
              nuevaPassword: resetForm.nuevaPassword,
            };

      await authApi.resetPassword(body);
      showOk(
        "¡Contraseña actualizada exitosamente! Ahora puedes ingresar a tu cuenta.",
      );
    } catch (err) {
      showError(err.response?.data?.message ?? "Código inválido o expirado.");
    } finally {
      setLoading(false);
    }
  };

  // const TITLES = {
  //   login: "Acceso Operativo",
  //   forgot: "Recuperar Acceso",
  //   reset: "Nueva Contraseña",
  // };

  const TITLES = {
    login: "Acceso Operativo",
    forgot: "Recuperar Acceso",
    reset: "Nueva Contraseña",
    estacion: "Selecciona tu Estación",
  };
  const SUBS = {
    login: "Sistema de Gestión de Contingencias Aeroportuarias",
    forgot:
      forgotMode === LOGIN_MODE.DNI
        ? "Ingresa tu DNI para recuperar el acceso"
        : "Recibirás un código de verificación en tu correo registrado",
    reset:
      resetIdentificador.type === "dni"
        ? "Ingresa el código que recibiste y define tu nueva contraseña"
        : "Ingresa el código recibido y define tu nueva contraseña",
    estacion: "Tu usuario tiene acceso a más de una estación — elige con cuál vas a trabajar ahora",
  };

  // const SUBS = {
  //   login: "Sistema de Gestión de Contingencias Aeroportuarias",
  //   forgot: "Recibirás un código de verificación en tu correo registrado",
  //   reset: "Ingresa el código recibido y define tu nueva contraseña",
  // };

  return (
    <div className={styles.page}>
      {/* ── PANEL IZQUIERDO ── */}
      <div className={styles.left}>
        <div className={styles.radarGrid} />
        <div className={styles.ring1} />
        <div className={styles.ring2} />
        <div className={styles.ring3} />
        <div className={styles.radarSweep} />

        <div className={styles.leftInner}>
          {/* Marca */}
          <div className={styles.brandWrap}>
            <div className={styles.brandLogo}>
              <svg viewBox="0 0 48 48" fill="none" width="36" height="36">
                <path
                  d="M24 4L40 13V27L24 44L8 27V13L24 4Z"
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M24 4L40 13V27L24 44L8 27V13L24 4Z"
                  stroke="white"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                  fill="none"
                />
                <path
                  d="M10 18L24 10L38 18"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1"
                />
                <circle cx="24" cy="22" r="3" fill="white" opacity="0.9" />
                <path
                  d="M24 22L34 30"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="1.5"
                />
                <path
                  d="M24 22L16 14"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1"
                />
              </svg>
            </div>
            <div>
              <p className={styles.brandName}>
                <span>SAASA</span> - Diseño e Innovación
              </p>
              <p className={styles.brandTagline}>Multi-estacion y multi-linea aerea</p>
            </div>
          </div>

          {/* Hero */}
          <div className={styles.heroBlock}>
            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeDot} />
              SISTEMA ACTIVO
            </div>
            <h1 className={styles.heroTitle}>
              Gestión de
              <br />
              Contingencias
              <br />
              Aeroportuarias
            </h1>
            <p className={styles.heroDesc}>
              Plataforma centralizada para atención de pasajeros afectados por
              cancelaciones, demoras y reprogramaciones de vuelo.
            </p>
          </div>

          {/* Stats */}
          <div className={styles.statsRow}>
            {[
              { val: "5", label: "Roles\noperativos" },
              { val: "24/7", label: "Monitoreo\nen tiempo real" },
              { val: "PDF", label: "Vouchers\nautomáticos" },
            ].map((s) => (
              <div key={s.label} className={styles.statItem}>
                <span className={styles.statVal}>{s.val}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className={styles.leftFooter}>
          ✈ Rutas nacionales e internacionales
        </p>
      </div>

      {/* ── PANEL DERECHO ── */}
      <div className={styles.right}>
        <div className={styles.noise} />
        <div className={styles.formCard}>
          {/* Indicador de pasos */}
          <div className={styles.viewIndicator}>
            {[VIEW.LOGIN, VIEW.FORGOT, VIEW.RESET].map((v) => (
              <div
                key={v}
                className={[
                  styles.viewDot,
                  view === v ? styles.viewDotActive : "",
                ].join(" ")}
              />
            ))}
          </div>

          {/* Ícono avión */}
          <div className={styles.planeIcon}>
            <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
              <path
                d="M21 16V14L13 9V3.5A1.5 1.5 0 0 0 11.5 2A1.5 1.5 0 0 0 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z"
                fill="currentColor"
              />
            </svg>
          </div>

          {/* Título */}
          <div className={styles.formHeader}>
            <h2
              className={[
                styles.formTitle,
                animating ? styles.fadeOut : styles.fadeIn,
              ].join(" ")}
            >
              {TITLES[view]}
            </h2>
            <p
              className={[
                styles.formSub,
                animating ? styles.fadeOut : styles.fadeIn,
              ].join(" ")}
            >
              {SUBS[view]}
            </p>
          </div>

          {/* ── Vistas ── */}
          <div
            className={[
              styles.formBody,
              animating ? styles.slideOut : styles.slideIn,
            ].join(" ")}
          >
            {/* ════════ LOGIN ════════ */}
            {view === VIEW.LOGIN && (
              <form onSubmit={handleLogin} noValidate>
                {/* Toggle correo / DNI */}
                <div className={styles.modeToggle}>
                  <button
                    type="button"
                    className={[
                      styles.modeBtn,
                      loginMode === LOGIN_MODE.CORREO
                        ? styles.modeBtnActive
                        : "",
                    ].join(" ")}
                    onClick={() => switchLoginMode(LOGIN_MODE.CORREO)}
                  >
                    Correo electrónico
                  </button>
                  <button
                    type="button"
                    className={[
                      styles.modeBtn,
                      loginMode === LOGIN_MODE.DNI ? styles.modeBtnActive : "",
                    ].join(" ")}
                    onClick={() => switchLoginMode(LOGIN_MODE.DNI)}
                  >
                    DNI (Agente)
                  </button>
                </div>

                <div className={styles.fieldGroup}>
                  {/* Campo correo o DNI según modo */}
                  {loginMode === LOGIN_MODE.CORREO ? (
                    <div className={styles.field}>
                      <label className={styles.label}>Correo electrónico</label>
                      <div className={styles.inputBox}>
                        <span className={styles.inputPre}>
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            width="16"
                            height="16"
                          >
                            <path
                              d="M3 4h14a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <path
                              d="M2 6l8 5 8-5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <input
                          type="email"
                          value={loginForm.correo}
                          autoComplete="email"
                          onChange={(e) =>
                            setLoginForm((f) => ({
                              ...f,
                              correo: e.target.value,
                            }))
                          }
                          placeholder="operaciones@saasa.com"
                          className={styles.input}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className={styles.field}>
                      <label className={styles.label}>DNI / Documento</label>
                      <div className={styles.inputBox}>
                        <span className={styles.inputPre}>
                          {/* Ícono ID card */}
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            width="16"
                            height="16"
                          >
                            <rect
                              x="2"
                              y="5"
                              width="16"
                              height="12"
                              rx="2"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <circle
                              cx="7"
                              cy="10"
                              r="2"
                              stroke="currentColor"
                              strokeWidth="1.2"
                            />
                            <path
                              d="M11 9h4M11 12h3"
                              stroke="currentColor"
                              strokeWidth="1.2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={loginForm.dni}
                          autoComplete="off"
                          onChange={(e) =>
                            setLoginForm((f) => ({
                              ...f,
                              dni: e.target.value.replace(/\D/g, ""),
                            }))
                          }
                          placeholder="12345678"
                          maxLength={20}
                          className={styles.input}
                        />
                      </div>
                      <span className={styles.hint}>
                        Solo disponible para el rol Agente SAASA
                      </span>
                    </div>
                  )}

                  {/* Contraseña (invariante) */}
                  <div className={styles.field}>
                    <label className={styles.label}>Contraseña</label>
                    <div className={styles.inputBox}>
                      <span className={styles.inputPre}>
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          width="16"
                          height="16"
                        >
                          <rect
                            x="3"
                            y="9"
                            width="14"
                            height="10"
                            rx="2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M7 9V6a3 3 0 016 0v3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <circle cx="10" cy="14" r="1.5" fill="currentColor" />
                        </svg>
                      </span>
                      <input
                        type={showPass ? "text" : "password"}
                        value={loginForm.password}
                        autoComplete="current-password"
                        onChange={(e) =>
                          setLoginForm((f) => ({
                            ...f,
                            password: e.target.value,
                          }))
                        }
                        placeholder="••••••••••"
                        className={styles.input}
                      />
                      <button
                        type="button"
                        className={styles.eyeBtn}
                        onClick={() => setShowPass((v) => !v)}
                      >
                        <EyeIcon open={showPass} />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={styles.primaryBtn}
                >
                  {loading && <span className={styles.spinner} />}
                  {loading
                    ? "Verificando credenciales..."
                    : "Ingresar al sistema"}
                </button>

                <div className={styles.linksRow}>
                  <button
                    type="button"
                    className={styles.textLink}
                    onClick={goToForgot}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </form>
            )}

            {/* ════════ FORGOT ════════ */}
            {view === VIEW.FORGOT && (
              <form onSubmit={handleForgot} noValidate>
                <div className={styles.fieldGroup}>
                  {forgotMode === LOGIN_MODE.CORREO ? (
                    <div className={styles.field}>
                      <label className={styles.label}>
                        Correo electrónico registrado
                      </label>
                      <div className={styles.inputBox}>
                        <span className={styles.inputPre}>
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            width="16"
                            height="16"
                          >
                            <path
                              d="M3 4h14a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <path
                              d="M2 6l8 5 8-5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <input
                          type="email"
                          value={forgotCorreo}
                          autoComplete="email"
                          onChange={(e) => setForgotCorreo(e.target.value)}
                          placeholder="correo@saasa.com"
                          className={styles.input}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className={styles.field}>
                      <label className={styles.label}>DNI / Documento</label>
                      <div className={styles.inputBox}>
                        <span className={styles.inputPre}>
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            width="16"
                            height="16"
                          >
                            <rect
                              x="2"
                              y="5"
                              width="16"
                              height="12"
                              rx="2"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <circle
                              cx="7"
                              cy="10"
                              r="2"
                              stroke="currentColor"
                              strokeWidth="1.2"
                            />
                            <path
                              d="M11 9h4M11 12h3"
                              stroke="currentColor"
                              strokeWidth="1.2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={forgotDni}
                          autoComplete="off"
                          onChange={(e) =>
                            setForgotDni(e.target.value.replace(/\D/g, ""))
                          }
                          placeholder="12345678"
                          maxLength={20}
                          className={styles.input}
                        />
                      </div>
                      <span className={styles.hint}>
                        Si tienes correo registrado recibirás el código allí. Si
                        no, contacta a tu administrador.
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={styles.primaryBtn}
                >
                  {loading && <span className={styles.spinner} />}
                  {loading
                    ? "Enviando código..."
                    : "Enviar código de verificación"}
                </button>

                <div className={styles.linksRow}>
                  <button
                    type="button"
                    className={styles.textLink}
                    onClick={() => goTo(VIEW.LOGIN)}
                  >
                    ← Volver al inicio de sesión
                  </button>
                </div>
              </form>
            )}

            {/* RESET */}
            {view === VIEW.RESET && (
              <form onSubmit={handleReset} noValidate>
                <div className={styles.fieldGroup}>
                  <div className={styles.field}>
                    <label className={styles.label}>
                      Código de verificación
                    </label>
                    <div className={styles.inputBox}>
                      <span className={styles.inputPre}>
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          width="16"
                          height="16"
                        >
                          <rect
                            x="3"
                            y="5"
                            width="14"
                            height="12"
                            rx="2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M7 9h6M7 12h4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <path
                            d="M7 2v3M13 2v3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                      <input
                        type="text"
                        value={resetForm.codigo}
                        maxLength={8}
                        onChange={(e) =>
                          setResetForm((f) => ({
                            ...f,
                            codigo: e.target.value,
                          }))
                        }
                        placeholder="Ej: 875077"
                        className={[styles.input, styles.codeInput].join(" ")}
                      />
                    </div>
                    <span className={styles.hint}>
                      Revisa tu correo electrónico
                    </span>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Nueva contraseña</label>
                    <div className={styles.inputBox}>
                      <span className={styles.inputPre}>
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          width="16"
                          height="16"
                        >
                          <rect
                            x="3"
                            y="9"
                            width="14"
                            height="10"
                            rx="2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M7 9V6a3 3 0 016 0v3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <circle cx="10" cy="14" r="1.5" fill="currentColor" />
                        </svg>
                      </span>
                      <input
                        type={showNew ? "text" : "password"}
                        value={resetForm.nuevaPassword}
                        onChange={(e) =>
                          setResetForm((f) => ({
                            ...f,
                            nuevaPassword: e.target.value,
                          }))
                        }
                        placeholder="Mínimo 8 caracteres"
                        className={styles.input}
                      />
                      <button
                        type="button"
                        className={styles.eyeBtn}
                        onClick={() => setShowNew((v) => !v)}
                      >
                        {showNew ? (
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            width="16"
                            height="16"
                          >
                            <path
                              d="M3 10s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <circle
                              cx="10"
                              cy="10"
                              r="2"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <path
                              d="M3 3l14 14"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        ) : (
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            width="16"
                            height="16"
                          >
                            <path
                              d="M3 10s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <circle
                              cx="10"
                              cy="10"
                              r="2"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={styles.primaryBtn}
                >
                  {loading && <span className={styles.spinner} />}
                  {loading ? "Actualizando..." : "Cambiar contraseña"}
                </button>

                <div className={styles.linksRow}>
                  <button
                    type="button"
                    className={styles.textLink}
                    onClick={() => goTo(VIEW.LOGIN)}
                  >
                    ← Acceder a tu cuenta
                  </button>
                </div>
              </form>
            )}

          </div>

          <p className={styles.cardFooter}>Diseño e Innovación - 2026 v1.1</p>
        </div>
      </div>

      {/* ── MODAL CENTRADO — éxito y error ── */}
      {modal.show && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            {/* Ícono según tipo */}
            <div
              className={[
                styles.modalIconWrap,
                modal.type === "success"
                  ? styles.modalIconSuccess
                  : styles.modalIconError,
              ].join(" ")}
            >
              {modal.type === "success" ? (
                <svg viewBox="0 0 40 40" fill="none" width="36" height="36">
                  <circle
                    cx="20"
                    cy="20"
                    r="19"
                    stroke="#22c55e"
                    strokeWidth="2"
                  />
                  <path
                    d="M11 20l6 7 12-14"
                    stroke="#22c55e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 40 40" fill="none" width="36" height="36">
                  <circle
                    cx="20"
                    cy="20"
                    r="19"
                    stroke="#ef4444"
                    strokeWidth="2"
                  />
                  <path
                    d="M13 13l14 14M27 13L13 27"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>

            <p className={styles.modalMsg}>{modal.msg}</p>

            <button
              className={[
                styles.modalBtn,
                modal.type === "error" ? styles.modalBtnError : "",
              ].join(" ")}
              onClick={closeModal}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente auxiliar: ícono ojo ────────────────────────────────────────────
function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
      <path
        d="M3 10s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 3l14 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
      <path
        d="M3 10s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
