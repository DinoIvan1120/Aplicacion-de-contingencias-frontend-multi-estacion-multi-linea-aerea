import axiosClient from "./axiosClient";

const BASE = "/api/v1/config/iconos-modo";

// Íconos configurables de la pantalla "Seleccionar Modo" del Administrador
// Global (Gestionar Estaciones y Aerolíneas / Operar en una estación).
// Mismo patrón que la foto de estación / logo de línea aérea.
const configApi = {
  getIconoModoUrl: (clave) => axiosClient.get(`${BASE}/${clave}`),
  subirIconoModo: (clave, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return axiosClient.post(`${BASE}/${clave}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export default configApi;