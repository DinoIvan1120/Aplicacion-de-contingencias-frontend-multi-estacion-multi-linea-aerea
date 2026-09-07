import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import cargaMasivaApi from "../api/cargaMasivaApi";

const KEY_LOTE = (loteId) => ["carga-masiva-lote", loteId];

/** Descarga el archivo .xlsx modelo y dispara la descarga en el navegador. */
export function useDescargarPlantillaRestaurante() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await cargaMasivaApi.descargarPlantillaRestaurante();
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "plantilla-carga-masiva-restaurante.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  });
}

/**
 * Sube el Excel de pasajeros + restaurante.
 * onSuccess recibe { loteId, totalPasajeros, totalGrupos, erroresValidacion }.
 *
 * NUEVO — ccDestinos (correos CC de aerolínea/proveedores) y firmaPasajero
 * (firma de conformidad) vienen del modal de confirmación previo a la
 * carga (ver AgenteCargaMasivaPage.jsx) y se aplican a TODOS los vouchers
 * del lote — misma lógica que el modal individual del agente.
 */
export function useCargarRestauranteExcel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      archivo,
      registroVueloDiarioId,
      vueloRecursoId,
      ccDestinos,
      firmaPasajero,
      idempotencyKey,
    }) => {
      const formData = new FormData();
      formData.append("archivo", archivo);
      formData.append("registroVueloDiarioId", registroVueloDiarioId);
      formData.append("vueloRecursoId", vueloRecursoId);
      (ccDestinos ?? []).forEach((correo) =>
        formData.append("ccDestinos", correo),
      );
      if (firmaPasajero && firmaPasajero.trim()) {
        formData.append("firmaPasajero", firmaPasajero.trim());
      }
      if (idempotencyKey) {
        formData.append("idempotencyKey", idempotencyKey);
      }
      return cargaMasivaApi.cargarRestaurante(formData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["atenciones"] });
      qc.invalidateQueries({ queryKey: ["disponibilidad"] });
    },
  });
}

/**
 * Estados de EstadoLoteEnum (backend) que representan trabajo EN CURSO.
 * El lote ahora nace en CREANDO_ATENCIONES (fase 1, background) y recién
 * pasa a PROCESANDO (fase 2, envío de vouchers) cuando la fase 1 termina.
 * El polling debe seguir activo durante AMBAS fases.
 */
const ESTADOS_LOTE_EN_PROGRESO = ["CREANDO_ATENCIONES", "PROCESANDO"];

/**
 * Progreso de un lote (polling).
 * Se detiene automáticamente cuando el estado pasa a uno terminal
 * (COMPLETADO, COMPLETADO_CON_ERRORES, ERROR, ERROR_CREACION).
 */
export function useEstadoLoteCargaMasiva(loteId) {
  return useQuery({
    queryKey: KEY_LOTE(loteId),
    queryFn: async () => {
      const { data } = await cargaMasivaApi.consultarLote(loteId);
      return data.data;
    },
    enabled: !!loteId,
    refetchInterval: (query) =>
      ESTADOS_LOTE_EN_PROGRESO.includes(query.state.data?.estado)
        ? 2500
        : false,
  });
}

/**
 * NUEVO — previsualiza el Excel (parsea + agrupa por PNR) SIN crear nada.
 * onSuccess recibe { totalPasajeros, totalGrupos, grupos, erroresValidacion,
 * capacidadDisponible, totalPaxSolicitado, excedeCapacidad }. Se usa al
 * abrir el modal de confirmación, ANTES de que el agente firme, para que
 * pueda revisar a quién y con qué datos se va a crear el voucher.
 */
export function usePrevisualizarRestauranteExcel() {
  return useMutation({
    mutationFn: ({ archivo, registroVueloDiarioId, vueloRecursoId }) => {
      const formData = new FormData();
      formData.append("archivo", archivo);
      formData.append("registroVueloDiarioId", registroVueloDiarioId);
      formData.append("vueloRecursoId", vueloRecursoId);
      return cargaMasivaApi.previsualizarRestaurante(formData);
    },
  });
}
