import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import usuariosApi from "../api/usuariosApi";

export const USUARIOS_KEY = ["usuarios"];

export function useBuscarUsuarios(filtros, pageable, contexto) {
  return useQuery({
    queryKey: [...USUARIOS_KEY, "buscar", filtros, pageable, contexto],
    queryFn: async () => {
      const params = {};
      Object.entries({ ...filtros, ...pageable }).forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined) params[k] = v;
      });
      const { data } = await usuariosApi.buscar(params);
      return data.data;
    },
    // Mantiene los datos anteriores visibles mientras llega la nueva respuesta.
    // Elimina el parpadeo "Cargando..." en cada nueva búsqueda.
    placeholderData: keepPreviousData,
  });
}

export function useUsuarios(params) {
  return useQuery({
    queryKey: [...USUARIOS_KEY, params],
    queryFn: async () => {
      const { data } = await usuariosApi.getAll(params);
      return data.data;
    },
  });
}

export function useCrearUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => usuariosApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: USUARIOS_KEY }),
  });
}

export function useActualizarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => usuariosApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: USUARIOS_KEY }),
  });
}

export function useCambiarEstadoUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estadoActual }) => {
      const nuevoEstado = estadoActual === 1 || estadoActual === true ? 0 : 1;
      return usuariosApi.cambiarEstado(id, nuevoEstado);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: USUARIOS_KEY }),
  });
}

// ── Estaciones asignadas al usuario (Fase 2/5 — multi-estación) ────────────

export function useEstacionesDeUsuario(usuarioId) {
  return useQuery({
    queryKey: [...USUARIOS_KEY, usuarioId, "estaciones"],
    queryFn: async () => {
      const { data } = await usuariosApi.getEstaciones(usuarioId);
      return data.data;
    },
    enabled: !!usuarioId,
  });
}

export function useAsignarEstacionAUsuario(usuarioId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ estacionId, lineaAereaId }) =>
  usuariosApi.asignarEstacion(usuarioId, { estacionId, lineaAereaId }),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...USUARIOS_KEY, usuarioId, "estaciones"],
      }),
  });
}

export function useQuitarEstacionDeUsuario(usuarioId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (estacionId) =>
      usuariosApi.quitarEstacion(usuarioId, estacionId),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...USUARIOS_KEY, usuarioId, "estaciones"],
      }),
  });
}
