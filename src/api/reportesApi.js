import axiosClient from "./axiosClient";

const BASE = "/api/v1/reportes";

const reportesApi = {
  getAll: (params) => axiosClient.get(BASE, { params }),
  exportarExcel: (params) =>
    axiosClient.get(`${BASE}/excel`, { params, responseType: "blob" }),
  getDetalle: (id) => axiosClient.get(`${BASE}/${id}`),
  getDetalleByCorr: (correlativo) =>
    axiosClient.get(`${BASE}/correlativo/${correlativo}`),
  actualizarServicios: (id, body) =>
    axiosClient.put(`${BASE}/${id}/servicios`, body),
  // ✅ FIX: ahora recibe body { correoDestino, telefono } para enviar al correo
  // Edición de datos del pasajero (nombre, correo, WhatsApp, PNR) — solo Administrador y Líder SAASA
  actualizarPasajero: (id, body) =>
    axiosClient.patch(`${BASE}/${id}/pasajero`, body),
  //    y WhatsApp indicados por el agente en el modal
  regenerarPdf: (id, body) =>
    axiosClient.post(`${BASE}/${id}/regenerar-pdf`, body),
  descargarActualizado: (
    id, // ← AGREGAR
  ) => axiosClient.post(`${BASE}/${id}/descargar-actualizado`),
  getResumen: (params) => axiosClient.get(`${BASE}/resumen`, { params }),
  anular: (correlativo) =>
    axiosClient.patch(`${BASE}/correlativo/${correlativo}/anular`),
  restaurar: (correlativo) =>
    axiosClient.patch(`${BASE}/correlativo/${correlativo}/restaurar`),
};

export default reportesApi;
