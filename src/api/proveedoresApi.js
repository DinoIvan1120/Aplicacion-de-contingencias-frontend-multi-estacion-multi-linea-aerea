import axiosClient from "./axiosClient";

const BASE = "/api/v1/proveedores";

const proveedoresApi = {
  getAll: (params) => axiosClient.get(BASE, { params }),
  getById: (id) => axiosClient.get(`${BASE}/${id}`),
  create: (body) => axiosClient.post(BASE, body),
  createConServicios: (body) => axiosClient.post(`${BASE}/con-servicios`, body),
  update: (id, body) => axiosClient.put(`${BASE}/${id}`, body),
  cambiarEstado: (id, nuevoEstado) =>
    axiosClient.patch(`${BASE}/${id}/estado`, null, {
      params: { estado: nuevoEstado },
    }),
  getServicios: (id) => axiosClient.get(`${BASE}/${id}/servicios`),
  getConServicios: (id) => axiosClient.get(`${BASE}/${id}/con-servicios`),
  updateConServicios: (id, body) =>
    axiosClient.put(`${BASE}/${id}/con-servicios`, body),
  addServicio: (id, body) => axiosClient.post(`${BASE}/${id}/servicios`, body),
};

export default proveedoresApi;
