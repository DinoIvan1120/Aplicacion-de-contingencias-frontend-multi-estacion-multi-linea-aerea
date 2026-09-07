import axiosClient from "./axiosClient";

const BASE = "/api/v1/usuarios";

const usuariosApi = {
  getAll: (params) => axiosClient.get(BASE, { params }),
  buscar: (params) => axiosClient.get(`${BASE}/buscar`, { params }),
  getById: (id) => axiosClient.get(`${BASE}/${id}`),
  create: (body) => axiosClient.post(BASE, body),
  update: (id, body) => axiosClient.put(`${BASE}/${id}`, body),
  cambiarEstado: (id, nuevoEstado) =>
    axiosClient.patch(`${BASE}/${id}/estado`, null, {
      params: { estado: nuevoEstado },
    }),

  // ── Estaciones asignadas al usuario (Fase 2/5 — multi-estación) ─────────
  getEstaciones: (usuarioId) =>
    axiosClient.get(`${BASE}/${usuarioId}/estaciones`),
  asignarEstacion: (usuarioId, { estacionId, lineaAereaId }) =>
  axiosClient.post(`${BASE}/${usuarioId}/estaciones`, { estacionId, lineaAereaId }),
  quitarEstacion: (usuarioId, estacionId) =>
    axiosClient.delete(`${BASE}/${usuarioId}/estaciones/${estacionId}`),
};

export default usuariosApi;
