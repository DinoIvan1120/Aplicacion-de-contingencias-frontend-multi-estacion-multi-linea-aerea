import axiosClient from "./axiosClient";

const BASE = "/api/v1/atenciones";

const atencionesApi = {
  getAll: (params) => axiosClient.get(BASE, { params }),
  getById: (id) => axiosClient.get(`${BASE}/${id}`),

  /**
   * GET /atenciones/verificar-pnr?pnr=XXX&vueloId=YYY
   * Verifica si el PNR ya está registrado para el vuelo antes de mostrar el modal de éxito.
   */
  verificarPnr: (pnr, vueloId) =>
    axiosClient.get(`${BASE}/verificar-pnr`, { params: { pnr, vueloId } }),

  /** POST /atenciones/escanear-boarding-pass */
  escanearBoardingPass: (codigoBarras) =>
    axiosClient.post(`${BASE}/escanear-boarding-pass`, { codigoBarras }),

  /** POST /atenciones — registrar pasajero con registroVueloDiarioId */
  create: (body) => axiosClient.post(BASE, body),

  /** POST /atenciones/batch */
  createBatch: (body) => axiosClient.post(`${BASE}/batch`, body),
  batch: (body) => axiosClient.post(`${BASE}/batch`, body),
  update: (id, body) => axiosClient.put(`${BASE}/${id}`, body),
  anular: (id) => axiosClient.patch(`${BASE}/${id}/anular`),

  /** POST /atenciones/{id}/servicios */
  asignarServicios: (id, servicios) =>
    axiosClient.post(`${BASE}/${id}/servicios`, servicios),

  /** POST /atenciones/{id}/pdf */
  generarPdf: (id) => axiosClient.post(`${BASE}/${id}/pdf`),
  descargarPdf: (id) =>
    axiosClient.get(`${BASE}/${id}/pdf`, { responseType: "blob" }),
  reenviarPdf: (id, body) => axiosClient.post(`${BASE}/${id}/enviar`, body),

  /**
   * POST /atenciones/{id}/voucher/generar
   * Genera el PDF y lo sube a S3. Devuelve { numeroVoucher, pdfUrl, emailEnviado, correoDestino }.
   */
  generarVoucher: (id) => axiosClient.post(`${BASE}/${id}/voucher/generar`),

  // ✅ Después (lo que tienes ahora)
  /**
   * POST /atenciones/{id}/voucher/generar-y-enviar
   * Genera el PDF, lo sube a S3 y lo envía al correo indicado.
   * @param {number} id
   * @param {string} correoDestino
   * @param {string[]} [ccDestinos] NUEVO — correos adicionales (aerolínea/proveedores) en copia
   * @param {string} [firmaPasajero] NUEVO — firma digital de conformidad del pasajero
   * * @param {string} [idiomaVoucher] NUEVO — idioma del voucher de servicio a generar ("ES" | "EN")
   */
  generarYEnviarVoucher: (
    id,
    correoDestino,
    ccDestinos,
    firmaPasajero,
    idiomaVoucher,
  ) =>
    axiosClient.post(`${BASE}/${id}/voucher/generar-y-enviar`, {
      correoDestino,
      ccDestinos,
      firmaPasajero,
      idiomaVoucher,
    }),

  /**
   * NUEVO — Voucher grupal: POST /atenciones/voucher-grupal/generar
   * @param {{ atencionIds: number[], serviciosCompartidos: boolean }} body
   */
  generarVoucherGrupal: (body) =>
    axiosClient.post(`${BASE}/voucher-grupal/generar`, body),

  /**
   * NUEVO — Voucher grupal: POST /atenciones/voucher-grupal/generar-y-enviar
   * @param {{ atencionIds: number[], correoDestino: string, serviciosCompartidos: boolean }} body
   */
  generarYEnviarVoucherGrupal: (body) =>
    axiosClient.post(`${BASE}/voucher-grupal/generar-y-enviar`, body),

  // Añadir dentro del objeto atencionesApi:
  escanearImagen: (formData) =>
    axiosClient.post(`${BASE}/escanear-imagen`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  /**
   * ✅ NUEVO: GET /atenciones/{id}/voucher/descargar
   * Obtiene URL firmada temporal para descargar el PDF desde S3
   */
  obtenerUrlDescarga: (id) =>
    axiosClient.get(`${BASE}/${id}/voucher/descargar`),

  // Agregar al final del objeto atencionesApi, antes del cierre };

  /** GET /registros-diarios/{id}/atenciones */
  getAtenciones: (registroId) =>
    axiosClient.get(`/api/v1/registros-diarios/${registroId}/atenciones`),

  /** GET /registros-diarios/{id}/disponibilidad */
  getDisponibilidad: (registroId) =>
    axiosClient.get(`/api/v1/registros-diarios/${registroId}/disponibilidad`),
};

export default atencionesApi;
