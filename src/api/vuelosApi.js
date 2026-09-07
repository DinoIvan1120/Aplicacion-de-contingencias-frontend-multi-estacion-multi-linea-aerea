import axiosClient from "./axiosClient";

const BASE = "/api/v1/vuelos";

const vuelosApi = {
  getAll: (params) => axiosClient.get(BASE, { params }),
  /**
   * GET /vuelos/itinerario-hoy
   * Devuelve solo los vuelos ACTIVOS con fechaVuelo = hoy (Lima UTC-5).
   * Usado por la vista del líder para mostrar el itinerario del día.
   * "Hoy" lo calcula el servidor — no hay que enviar ningún parámetro.
   */
  itinerarioHoy: () => axiosClient.get(`${BASE}/itinerario-hoy`),
  getById: (id) => axiosClient.get(`${BASE}/${id}`),
  /** GET /vuelos/buscar — búsqueda dinámica con filtros opcionales */
  buscar: (params) => axiosClient.get(`${BASE}/buscar`, { params }),
  create: (body) => axiosClient.post(BASE, body),
  update: (id, body) => axiosClient.put(`${BASE}/${id}`, body),
  anular: (id) => axiosClient.patch(`${BASE}/${id}/anular`),
  /** PATCH /vuelos/{id}/habilitar — reactiva un vuelo ANULADO */
  habilitar: (id) => axiosClient.patch(`${BASE}/${id}/habilitar`),
  cargaMasiva: (formData) =>
    axiosClient.post(`${BASE}/carga-masiva`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // ── Endpoints unificados de la Vista Líder ────────────────────
  /** POST /vuelos/registro — crea vuelo + recursos en una transacción */
  crearRegistro: (body) => axiosClient.post(`${BASE}/registro`, body),
  /** GET /vuelos/{id}/registro — carga vuelo + recursos completos */
  getRegistro: (id) => axiosClient.get(`${BASE}/${id}/registro`),
  /** PUT /vuelos/{id}/registro — actualiza vuelo + sincroniza recursos */
  actualizarRegistro: (id, body) =>
    axiosClient.put(`${BASE}/${id}/registro`, body),

  getRecursos: (vueloId) => axiosClient.get(`${BASE}/${vueloId}/recursos`),
  habilitarRecurso: (vueloId, body) =>
    axiosClient.post(`${BASE}/${vueloId}/recursos`, body),
  deshabilitarRecurso: (vueloId, recursoId) =>
    axiosClient.patch(`${BASE}/${vueloId}/recursos/${recursoId}/deshabilitar`),
};

export default vuelosApi;
