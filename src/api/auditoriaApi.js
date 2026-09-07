import axiosClient from "./axiosClient";

const BASE = "/api/v1/auditoria";

const auditoriaApi = {
  getAll: (params) => axiosClient.get(BASE, { params }),
  exportarExcel: (params) =>
    axiosClient.get(`${BASE}/excel`, { params, responseType: "blob" }),
};

export default auditoriaApi;
