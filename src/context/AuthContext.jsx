import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import authApi from "../api/authApi";
import SessionExpiryModal, {
  WARNING_SECONDS, // ← FALTABA #3
} from "../components/ui/SessionExpiryModal";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Estado del modal de expiración
  const [showExpiry, setShowExpiry] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_SECONDS);

  // ── Estación/línea aérea activa (Fase 5 — selector del login) ─────────────
  // No es un límite de seguridad (eso ya lo resuelve el backend con
  // `estacionIds` del JWT) — es solo el "contexto de trabajo" por defecto
  // que se manda al crear registros nuevos (Vuelo, Proveedor, etc.), para
  // que el formulario no tenga que preguntar la estación en cada pantalla.
  const [estacionActiva, setEstacionActivaState] = useState(null);
  const [lineaAereaActiva, setLineaAereaActivaState] = useState(null);

  // expiresAt en ms (timestamp absoluto)
  const expiresAtRef = useRef(null);
  // referencia al interval del timer
  const timerRef = useRef(null);

  // ─── helpers de persistencia

  const persist = useCallback((tokenVal, userData, expiresAt) => {
    localStorage.setItem("token", tokenVal);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("expiresAt", String(expiresAt));
  }, []);

  const clearStorage = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("expiresAt");
    localStorage.removeItem("estacionActiva");
    localStorage.removeItem("lineaAereaActiva");
  }, []);

  // ── Estación/línea aérea activa ────────────────────────────────────────
// Invalidación global (capa 1): al cambiar de estación/aerolínea activa,
// TODO el caché de React Query queda obsoleto (vuelos, registros,
// capacidad comprometida, etc. filtran implícitamente por el contexto
// activo en el backend). Sin esto, un admin que entra a Cusco y luego
// cambia a Lima seguiría viendo datos de Cusco servidos desde caché
// hasta que expire el staleTime de cada query.
const seleccionarEstacion = useCallback((estacion, lineaAerea = null) => {
  setEstacionActivaState(estacion ?? null);
  setLineaAereaActivaState(lineaAerea ?? null);
  if (estacion) localStorage.setItem("estacionActiva", JSON.stringify(estacion));
  else localStorage.removeItem("estacionActiva");
  if (lineaAerea) localStorage.setItem("lineaAereaActiva", JSON.stringify(lineaAerea));
  else localStorage.removeItem("lineaAereaActiva");
  queryClient.clear();
}, [queryClient]);

//login
  const logout = useCallback(() => {
  clearInterval(timerRef.current);
  setShowExpiry(false);
  setToken(null);
  setUser(null);
  setEstacionActivaState(null);
  setLineaAereaActivaState(null);
  expiresAtRef.current = null;
  clearStorage();
  // Invalidación global (capa 1): nunca dejar en caché datos de la sesión
  // que se cierra, para que el próximo usuario que entre en esta misma
  // pestaña no herede vuelos/registros de otra estación u otro rol.
  queryClient.clear();
  navigate("/login", { replace: true });
}, [navigate, clearStorage, queryClient]);

  // ─── arrancar el timer de expiración ──────────────────────────────────────
  const startExpiryTimer = useCallback(
    (expiresAt) => {
      clearInterval(timerRef.current);
      expiresAtRef.current = expiresAt;

      timerRef.current = setInterval(() => {
        const now = Date.now();
        const diff = Math.floor((expiresAtRef.current - now) / 1000); // segundos restantes

        if (diff <= 0) {
          // Token ya expiró → logout inmediato
          clearInterval(timerRef.current);
          logout();
          return;
        }

        if (diff <= WARNING_SECONDS) {
          // Dentro de la ventana de advertencia → mostrar modal con cuenta regresiva
          setSecondsLeft(diff);
          setShowExpiry(true);
        } else {
          // Todavía hay tiempo → asegurar que el modal esté cerrado
          setShowExpiry(false);
        }
      }, 1000);
    },
    [logout],
  );

  // ─── login ─────────────────────────────────────────────────────────────────
  /**
   * data es el objeto "data" de la respuesta del backend:
   * { token, rol, nombre, apellido, expiresIn }
   * expiresIn viene en milisegundos (ej: 86400000 = 24h)
   */
  const login = useCallback(
      (data) => {
        const { token: t, expiresIn, ...userData } = data;
        const expiresAt = Date.now() + (expiresIn ?? 86_400_000);

        setToken(t);
        setUser(userData);
        persist(t, userData, expiresAt);
        startExpiryTimer(expiresAt);
        // Invalidación global (capa 1): limpia cualquier caché residual de
        // una sesión anterior en esta misma pestaña antes de que las
        // páginas empiecen a pedir datos con el nuevo token/contexto.
        queryClient.clear();
      },
      [persist, startExpiryTimer, queryClient],
    );

  // ─── extender sesión con /auth/refresh ────────────────────────────────────
  const extendSession = useCallback(async () => {
    try {
      const res = await authApi.refreshToken();
      const data = res.data?.data; // { token, rol, nombre, apellido, expiresIn }
      if (!data?.token) throw new Error("Sin token en respuesta");

      const { token: newToken, expiresIn, ...userData } = data;
      const expiresAt = Date.now() + (expiresIn ?? 86_400_000);

      setToken(newToken);
      setUser(userData);
      persist(newToken, userData, expiresAt);
      startExpiryTimer(expiresAt);
      setShowExpiry(false);
    } catch {
      // Si el refresh falla → cerrar sesión
      logout();
    }
  }, [persist, startExpiryTimer, logout]);

  // ─── restaurar sesión desde localStorage ──────────────────────────────────
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      const storedExpiry = localStorage.getItem("expiresAt");

      if (storedToken && storedUser && storedExpiry) {
        const expiresAt = Number(storedExpiry);

        if (Date.now() >= expiresAt) {
          // Token ya expirado → limpiar sin redirigir (estamos en la pantalla inicial)
          clearStorage();
        } else {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          startExpiryTimer(expiresAt);

          const storedEstacion = localStorage.getItem("estacionActiva");
          const storedLinea = localStorage.getItem("lineaAereaActiva");
          if (storedEstacion) setEstacionActivaState(JSON.parse(storedEstacion));
          if (storedLinea) setLineaAereaActivaState(JSON.parse(storedLinea));
        }
      }
    } catch {
      clearStorage();
    } finally {
      setIsLoading(false);
    }
  }, [startExpiryTimer, clearStorage]);

  // ─── escuchar evento 401 de axiosClient ──────────────────────────────────
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener("auth:session-expired", handler);
    return () => window.removeEventListener("auth:session-expired", handler);
  }, [logout]);

  // ─── limpiar timer al desmontar ───────────────────────────────────────────
  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const rol = user?.rol ?? null;
  const isAdmin = rol === "ADMINISTRADOR";
  const isLider = rol === "LIDER_SAASA";
  const isAgente = rol === "AGENTE_SAASA";

  // ── Multi-estación (Fase 5) ─────────────────────────────────────────────
  const estacionIds = user?.estacionIds ?? [];
  // Administrador Global (sección 9.3 del documento funcional): el JWT trae
  // la lista de estaciones vacía. No confundir con "no autenticado".
  const esAdministradorGlobal = !!user && estacionIds.length === 0;
  // Si tiene 0 (global) o más de 1 estación, el login debe mostrarle el
  // selector; con exactamente 1, se resuelve sola sin preguntar nada.
  const necesitaSeleccionEstacion = estacionIds.length !== 1;

  const lineaAereaFija = !!user?.lineaAereaFija;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        rol,
        isAdmin,
        isLider,
        isAgente,
        isLoading,
        login,
        logout,
        extendSession,
        estacionIds,
        esAdministradorGlobal,
        necesitaSeleccionEstacion,
        lineaAereaFija,
        estacionActiva,
        lineaAereaActiva,
        seleccionarEstacion,
      }}
    >
      {children}

      {/* Modal de expiración — siempre montado aquí para funcionar en cualquier ruta */}
      <SessionExpiryModal // ← FALTABA #4
        open={showExpiry}
        secondsLeft={secondsLeft}
        onExtend={extendSession}
        onLogout={logout}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
