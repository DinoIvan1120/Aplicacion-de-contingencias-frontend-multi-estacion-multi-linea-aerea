import axiosClient from "./axiosClient";

const BASE = "/api/v1/lineas-aereas";

const lineasAereasApi = {
  getAll: (params) => axiosClient.get(BASE, { params }),
  getById: (id) => axiosClient.get(`${BASE}/${id}`),
  create: (body) => axiosClient.post(BASE, body),
  update: (id, body) => axiosClient.put(`${BASE}/${id}`, body),
  cambiarEstado: (id, nuevoEstado) =>
    axiosClient.patch(`${BASE}/${id}/estado`, null, {
      params: { estado: nuevoEstado },
    }),
  getLogoUrl: (id) => axiosClient.get(`${BASE}/${id}/logo`),
  subirLogo: (id, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return axiosClient.post(`${BASE}/${id}/logo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
 },
};

export default lineasAereasApi;
