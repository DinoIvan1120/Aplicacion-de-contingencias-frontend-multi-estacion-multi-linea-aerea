import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import aerolineasApi from "../api/aerolineasApi";

export const AEROLINEAS_CORREO_KEY = ["aerolineas-correo"];

/**
 * NUEVO — Lista de correos de aerolíneas parametrizados.
 * @param {{estado?: number}} params estado: 1=activos, 0=inactivos (opcional)
 */
export function useAerolineasCorreo(params) {
  return useQuery({
    queryKey: [...AEROLINEAS_CORREO_KEY, params],
    queryFn: async () => {
      const { data } = await aerolineasApi.getAll(params);
      return data.data;
    },
  });
}

export function useCrearAerolineaCorreo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => aerolineasApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: AEROLINEAS_CORREO_KEY }),
  });
}

export function useActualizarAerolineaCorreo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => aerolineasApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: AEROLINEAS_CORREO_KEY }),
  });
}

export function useCambiarEstadoAerolineaCorreo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estadoActual }) => {
      const nuevoEstado = estadoActual === 1 || estadoActual === true ? 0 : 1;
      return aerolineasApi.cambiarEstado(id, nuevoEstado);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: AEROLINEAS_CORREO_KEY }),
  });
}
