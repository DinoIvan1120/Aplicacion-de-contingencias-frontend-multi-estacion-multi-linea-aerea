import axiosClient from "./axiosClient";

const BASE = "/api/v1/registros-diarios";

const registrosDiariosApi = {
  /** POST /registros-diarios — Líder registra vuelo del itinerario para el día */
  registrar: (body) => axiosClient.post(BASE, body),

  /** GET /registros-diarios/hoy — registros del día actual */
  getHoy: () => axiosClient.get(`${BASE}/hoy`),

  /** GET /registros-diarios/mis-registros — historial del líder */
  getMisRegistros: (params) =>
    axiosClient.get(`${BASE}/mis-registros`, { params }),

  /** GET /registros-diarios/{id} */
  getById: (id) => axiosClient.get(`${BASE}/${id}`),

  /** GET /registros-diarios — admin: todos */
  getTodos: (params) => axiosClient.get(BASE, { params }),

  /** GET /registros-diarios/rango — admin: por rango */
  getRango: (params) => axiosClient.get(`${BASE}/rango`, { params }),

  /** PUT /registros-diarios/{id} — actualizar recursos */
  actualizar: (id, body) => axiosClient.put(`${BASE}/${id}`, body),

  /** DELETE /registros-diarios/{id} — soft delete */
  eliminar: (id) => axiosClient.delete(`${BASE}/${id}`),

  /** GET /registros-diarios/existe — verificar duplicado */
  existe: (vueloItinerarioId, fecha) =>
    axiosClient.get(`${BASE}/existe`, { params: { vueloItinerarioId, fecha } }),
  /** GET /registros-diarios/{id}/disponibilidad */
  getDisponibilidad: (id) => axiosClient.get(`${BASE}/${id}/disponibilidad`),
  /** GET /registros-diarios/{id}/atenciones */
  getAtenciones: (id) => axiosClient.get(`${BASE}/${id}/atenciones`),

  /**
   * GET /registros-diarios/comprometido-hoy
   * Mapa { proveedorId: CapacidadComprometidaResponse } con la capacidad
   * ya asignada hoy por proveedor. excludeRegistroId (opcional) se pasa
   * en modo edicion para no contar los recursos del propio registro.
   */
  comprometidoHoy: (excludeRegistroId = null) =>
    axiosClient.get(`${BASE}/comprometido-hoy`, {
      params: excludeRegistroId ? { excludeRegistroId } : {},
    }),
};

export default registrosDiariosApi;
