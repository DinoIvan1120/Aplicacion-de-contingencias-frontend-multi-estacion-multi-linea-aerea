import axiosClient from "./axiosClient";

const BASE = "/api/v1/estaciones";

const estacionesApi = {
  getAll: (params) => axiosClient.get(BASE, { params }),
  getById: (id) => axiosClient.get(`${BASE}/${id}`),
  create: (body) => axiosClient.post(BASE, body),
  update: (id, body) => axiosClient.put(`${BASE}/${id}`, body),
  cambiarEstado: (id, nuevoEstado) =>
    axiosClient.patch(`${BASE}/${id}/estado`, null, {
      params: { estado: nuevoEstado },
    }),

  // ── Foto del aeropuerto (mismo patrón que el logo de línea aérea) ──────
  getFotoUrl: (id) => axiosClient.get(`${BASE}/${id}/foto`),
  subirFoto: (id, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return axiosClient.post(`${BASE}/${id}/foto`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // ── Líneas aéreas habilitadas en la estación ────────────────────────────
  getLineasAereas: (estacionId, params) =>
    axiosClient.get(`${BASE}/${estacionId}/lineas-aereas`, { params }),
  asignarLineaAerea: (estacionId, lineaAereaId) =>
    axiosClient.post(`${BASE}/${estacionId}/lineas-aereas`, { lineaAereaId }),
  cambiarEstadoLineaAerea: (estacionId, lineaAereaId, nuevoEstado) =>
    axiosClient.patch(
      `${BASE}/${estacionId}/lineas-aereas/${lineaAereaId}/estado`,
      null,
      { params: { estado: nuevoEstado } },
    ),
};

export default estacionesApi;
