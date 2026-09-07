import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import registrosDiariosApi from "../api/registrosDiariosApi";
import { useAuth } from "../context/AuthContext";

const KEY_HOY = ["registros-diarios", "hoy"];
const KEY_MIS = ["registros-diarios", "mis-registros"];
const KEY_TODOS = ["registros-diarios", "todos"];

/**
 * Segunda capa de protección de caché (ver mismo patrón en useVuelos.js):
 * el contexto activo (estación + aerolínea) forma parte de la queryKey.
 */
function useContextoKey() {
  const { estacionActiva, lineaAereaActiva } = useAuth();
  return [estacionActiva?.id ?? null, lineaAereaActiva?.lineaAereaId ?? null];
}

/** Registros del día actual (agente y líder) */
export function useRegistrosHoy() {
  const contextoKey = useContextoKey();
  return useQuery({
    queryKey: [...KEY_HOY, contextoKey],
    queryFn: async () => {
      const { data } = await registrosDiariosApi.getHoy();
      return data.data ?? [];
    },
    staleTime: 0,
  });
}

/** Historial del líder con filtros opcionales de fecha */
export function useMisRegistros(params = {}) {
  const contextoKey = useContextoKey();
  return useQuery({
    queryKey: [...KEY_MIS, contextoKey, params],
    queryFn: async () => {
      const { data } = await registrosDiariosApi.getMisRegistros(params);
      return data.data;
    },
    staleTime: 0,
  });
}

/** Verificar si ya existe un registro para ese vuelo+fecha */
export function useExisteRegistro(vueloItinerarioId, fecha) {
  return useQuery({
    queryKey: ["registros-diarios", "existe", vueloItinerarioId, fecha],
    queryFn: async () => {
      const { data } = await registrosDiariosApi.existe(
        vueloItinerarioId,
        fecha,
      );
      return data.data;
    },
    enabled: !!vueloItinerarioId && !!fecha,
  });
}

/** Registrar vuelo del itinerario para el día (POST) */
export function useRegistrarVueloDiario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => registrosDiariosApi.registrar(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY_HOY });
      qc.invalidateQueries({ queryKey: KEY_MIS });
    },
  });
}

/** Actualizar recursos de un registro existente (PUT) */
export function useActualizarRegistro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      registrosDiariosApi.actualizar(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY_HOY });
      qc.invalidateQueries({ queryKey: KEY_MIS });
    },
  });
}

/** Eliminar (soft-delete) un registro */
export function useEliminarRegistro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => registrosDiariosApi.eliminar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY_HOY });
      qc.invalidateQueries({ queryKey: KEY_MIS });
    },
  });
}

/**
 * Trae el mapa de capacidad comprometida hoy: { proveedorId -> info }.
 *
 * Se usa para decorar el ProveedorCombobox con la info de "ya asignado hoy".
 * Un proveedor que no aparece en el mapa no tiene nada comprometido = libre.
 *
 * excludeRegistroId: cuando el lider edita un registro existente, se pasa
 * su id para que sus propios recursos no se cuenten como "ya comprometidos".
 *
 * staleTime = 0 para que siempre refleje el estado mas reciente del dia.
 * Se invalida automaticamente cuando se guarda/actualiza/elimina un registro.
 */
export function useCapacidadComprometidaHoy(excludeRegistroId = null) {
  const contextoKey = useContextoKey();
  return useQuery({
    queryKey: [
      "registros-diarios",
      "comprometido-hoy",
      contextoKey,
      excludeRegistroId,
    ],
    queryFn: async () => {
      const { data } =
        await registrosDiariosApi.comprometidoHoy(excludeRegistroId);
      const raw = data.data ?? {};
      const map = new Map();
      Object.entries(raw).forEach(([k, v]) => map.set(Number(k), v));
      return map;
    },
    staleTime: 0,
  });
}
