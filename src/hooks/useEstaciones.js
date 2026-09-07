import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import estacionesApi from "../api/estacionesApi";

export const ESTACIONES_KEY = ["estaciones"];

/**
 * Lista de estaciones. Se usa tanto en el módulo de administración como en
 * el selector de login (ahí se llama con el token recién obtenido, antes de
 * que el resto de la app "sepa" que el usuario está autenticado).
 */
export function useEstaciones(params) {
  return useQuery({
    queryKey: [...ESTACIONES_KEY, params],
    queryFn: async () => {
      const { data } = await estacionesApi.getAll(params);
      return data.data;
    },
  });
}

export function useEstacion(id) {
  return useQuery({
    queryKey: [...ESTACIONES_KEY, id],
    queryFn: async () => {
      const { data } = await estacionesApi.getById(id);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCrearEstacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => estacionesApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ESTACIONES_KEY }),
  });
}

export function useActualizarEstacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => estacionesApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ESTACIONES_KEY }),
  });
}

export function useCambiarEstadoEstacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estadoActual }) => {
      const nuevoEstado = estadoActual === 1 || estadoActual === true ? 0 : 1;
      return estacionesApi.cambiarEstado(id, nuevoEstado);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ESTACIONES_KEY }),
  });
}

// ── Foto del aeropuerto (mismo patrón que el logo de línea aérea) ─────────

export function useFotoEstacion(id, { enabled = true } = {}) {
  return useQuery({
    queryKey: [...ESTACIONES_KEY, id, "foto"],
    queryFn: async () => {
      const { data } = await estacionesApi.getFotoUrl(id);
      return data.data;
    },
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000, // 10 min — un poco menos que la expiración real (15 min)
  });
}

export function useSubirFotoEstacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }) => estacionesApi.subirFoto(id, file),
    // Invalida todo lo que empiece con ESTACIONES_KEY: el listado (para que
    // se entere del nuevo fotoKey) y la query de foto de esta estación
    // específica (para forzar a pedir una URL firmada nueva).
    onSuccess: () => qc.invalidateQueries({ queryKey: ESTACIONES_KEY }),
  });
}

// ── Líneas aéreas habilitadas en una estación ─────────────────────────────

export function useLineasDeEstacion(estacionId, params) {
  return useQuery({
    queryKey: [...ESTACIONES_KEY, estacionId, "lineas-aereas", params],
    queryFn: async () => {
      const { data } = await estacionesApi.getLineasAereas(estacionId, params);
      return data.data;
    },
    enabled: !!estacionId,
  });
}

export function useAsignarLineaAerea(estacionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lineaAereaId) =>
      estacionesApi.asignarLineaAerea(estacionId, lineaAereaId),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...ESTACIONES_KEY, estacionId, "lineas-aereas"],
      }),
  });
}

export function useCambiarEstadoLineaDeEstacion(estacionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lineaAereaId, estadoActual }) => {
      const nuevoEstado = estadoActual === 1 || estadoActual === true ? 0 : 1;
      return estacionesApi.cambiarEstadoLineaAerea(
        estacionId,
        lineaAereaId,
        nuevoEstado,
      );
    },
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...ESTACIONES_KEY, estacionId, "lineas-aereas"],
      }),
  });
}
