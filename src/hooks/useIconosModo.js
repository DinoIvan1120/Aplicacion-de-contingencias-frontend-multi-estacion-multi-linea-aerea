import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import configApi from "../api/configApi";

export const ICONOS_MODO_KEY = ["iconos-modo"];

export function useIconoModo(clave) {
  return useQuery({
    queryKey: [...ICONOS_MODO_KEY, clave],
    queryFn: async () => {
      const { data } = await configApi.getIconoModoUrl(clave);
      return data.data;
    },
    enabled: !!clave,
    staleTime: 10 * 60 * 1000, // 10 min — un poco menos que la expiración real (15 min)
  });
}

export function useSubirIconoModo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clave, file }) => configApi.subirIconoModo(clave, file),
    onSuccess: (_data, { clave }) =>
      qc.invalidateQueries({ queryKey: [...ICONOS_MODO_KEY, clave] }),
  });
}