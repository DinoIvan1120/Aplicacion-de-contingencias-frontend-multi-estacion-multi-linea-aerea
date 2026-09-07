import axiosClient from "./axiosClient";

const BASE = "/api/v1/aerolineas-correo";

/**
 * NUEVO — Correos de aerolíneas parametrizados por el administrador.
 * Se usan para autocompletar el destinatario "aerolínea" en el modal de
 * confirmación/firma del agente al enviar un voucher.
 */
const aerolineasApi = {
  getAll: (params) => axiosClient.get(BASE, { params }),
  getById: (id) => axiosClient.get(`${BASE}/${id}`),
  create: (body) => axiosClient.post(BASE, body),
  update: (id, body) => axiosClient.put(`${BASE}/${id}`, body),
  cambiarEstado: (id, nuevoEstado) =>
    axiosClient.patch(`${BASE}/${id}/estado`, null, {
      params: { estado: nuevoEstado },
    }),
};

export default aerolineasApi;
