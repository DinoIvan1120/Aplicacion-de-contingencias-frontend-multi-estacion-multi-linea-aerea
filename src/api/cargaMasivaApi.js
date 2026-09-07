import axiosClient from "./axiosClient";

const BASE = "/api/v1/atenciones/carga-masiva";

/**
 * API de carga masiva de pasajeros + servicio de restaurante desde Excel.
 * Ver AgenteCargaMasivaPage.jsx para el flujo completo.
 */
const cargaMasivaApi = {
  /** GET /atenciones/carga-masiva/restaurante/plantilla — descarga el .xlsx modelo */
  descargarPlantillaRestaurante: () =>
    axiosClient.get(`${BASE}/restaurante/plantilla`, { responseType: "blob" }),

  /**
   * NUEVO — POST /atenciones/carga-masiva/restaurante/preview (multipart)
   * Parsea y agrupa el Excel por PNR SIN crear nada — devuelve
   * { totalPasajeros, totalGrupos, grupos, erroresValidacion,
   *   capacidadDisponible, totalPaxSolicitado, excedeCapacidad } para que
   * el modal de confirmación muestre a los pasajeros/grupos reales antes
   * de que el agente firme.
   */
  previsualizarRestaurante: (formData) =>
    axiosClient.post(`${BASE}/restaurante/preview`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  /**
   * POST /atenciones/carga-masiva/restaurante (multipart)
   * Crea las atenciones + servicio de restaurante de forma síncrona y
   * devuelve { loteId, totalPasajeros, totalGrupos, erroresValidacion }.
   * El envío de vouchers ocurre en background — usar consultarLote() para
   * hacer polling del progreso con el loteId devuelto aquí.
   */
  cargarRestaurante: (formData) =>
    axiosClient.post(`${BASE}/restaurante`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  /** GET /atenciones/carga-masiva/lotes/{loteId} — progreso de envío de vouchers */
  consultarLote: (loteId) => axiosClient.get(`${BASE}/lotes/${loteId}`),
};

export default cargaMasivaApi;
