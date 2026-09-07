import axiosClient from "./axiosClient";

const BASE = "/api/v1/auth";

const authApi = {
  login: (body) => axiosClient.post(`${BASE}/login`, body),
  register: (body) => axiosClient.post(`${BASE}/register`, body),
  forgotPassword: (body) => axiosClient.post(`${BASE}/forgot-password`, body),
  resetPassword: (body) => axiosClient.post(`${BASE}/reset-password`, body),
  refreshToken: () => axiosClient.post(`${BASE}/refresh`),
  // ── Nuevos ───────────────────────────────────────────────────────────────

  /**
   * Login por DNI para AGENTE_SAASA.
   * Envía { dni, password } al mismo endpoint POST /login.
   * El backend lo resuelve por documento en vez de por correo.
   */
  loginDni: ({ dni, password }) =>
    axiosClient.post(`${BASE}/login`, { dni, password }),

  /**
   * Recuperación por DNI (Flujo B).
   * Envía { dni } al endpoint POST /forgot-password.
   * Si el agente tiene correo registrado, el backend envía el código.
   */
  forgotPasswordDni: ({ dni }) =>
    axiosClient.post(`${BASE}/forgot-password`, { dni }),

  /**
   * Consulta auxiliar: indica si el agente con ese DNI tiene correo registrado.
   * GET /forgot-password/tiene-correo?dni=...
   * Respuesta: { success: true, data: true|false }
   *
   * Se usa DESPUÉS de llamar a forgotPasswordDni para mostrar el mensaje correcto:
   *   true  → "Revisa tu correo, te enviamos el código de verificación"
   *   false → "Contacta a tu administrador para restablecer tu contraseña"
   */
  agentetieneCorreo: (dni) =>
    axiosClient.get(`${BASE}/forgot-password/tiene-correo`, {
      params: { dni },
    }),
};

export default authApi;
