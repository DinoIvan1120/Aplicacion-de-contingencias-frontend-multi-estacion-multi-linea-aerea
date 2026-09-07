import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import lineasAereasApi from "../api/lineasAereasApi";

export const LINEAS_AEREAS_KEY = ["lineas-aereas"];

export function useLineasAereas(params) {
  return useQuery({
    queryKey: [...LINEAS_AEREAS_KEY, params],
    queryFn: async () => {
      const { data } = await lineasAereasApi.getAll(params);
      return data.data;
    },
  });
}

export function useLogoLineaAerea(id, { enabled = true } = {}) {
  return useQuery({
    queryKey: [...LINEAS_AEREAS_KEY, id, "logo"],
    queryFn: async () => {
      const { data } = await lineasAereasApi.getLogoUrl(id);
      return data.data;
    },
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000, // 10 min — un poco menos que la expiración real (15 min)
  });
}

export function useSubirLogoLineaAerea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }) => lineasAereasApi.subirLogo(id, file),
    // Invalida todo lo que empiece con LINEAS_AEREAS_KEY: el listado (para
    // que se entere del nuevo logoKey) y la query de logo de esta línea
    // específica (para forzar a pedir una URL firmada nueva).
    onSuccess: () => qc.invalidateQueries({ queryKey: LINEAS_AEREAS_KEY }),
  });
}

export function useCrearLineaAerea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => lineasAereasApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: LINEAS_AEREAS_KEY }),
  });
}

export function useActualizarLineaAerea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => lineasAereasApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: LINEAS_AEREAS_KEY }),
  });
}

export function useCambiarEstadoLineaAerea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estadoActual }) => {
      const nuevoEstado = estadoActual === 1 || estadoActual === true ? 0 : 1;
      return lineasAereasApi.cambiarEstado(id, nuevoEstado);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LINEAS_AEREAS_KEY }),
  });
}
