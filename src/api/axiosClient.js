import axios from "axios";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Request: inyecta JWT automáticamente
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // El backend usa X-Estacion-Id / X-Linea-Aerea-Id como fallback
  // (ContextoActivoHolder) en toda petición cuando el body no trae
  // estacionId/lineaAereaId explícitos. Sin esto, cualquier usuario con
  // más de una estación/línea (o Administrador Global) pierde el contexto
  // de trabajo activo en cada request.
  try {
    const estacion = JSON.parse(localStorage.getItem("estacionActiva") || "null");
    const lineaAerea = JSON.parse(localStorage.getItem("lineaAereaActiva") || "null");
    if (estacion?.id) config.headers["X-Estacion-Id"] = estacion.id;
    if (lineaAerea?.lineaAereaId) config.headers["X-Linea-Aerea-Id"] = lineaAerea.lineaAereaId;
  } catch {
    /* localStorage corrupto o vacío: se ignora, el backend exigirá contexto si lo necesita */
  }

  return config;
});

// Response: limpia sesión si el servidor responde 401
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Evento personalizado: AuthContext lo escucha y hace navigate() suave
      window.dispatchEvent(new CustomEvent("auth:session-expired"));
    }
    return Promise.reject(error);
  },
);
export default axiosClient;
