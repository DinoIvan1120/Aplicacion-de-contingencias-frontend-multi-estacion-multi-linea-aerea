import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import vuelosApi from "../api/vuelosApi";
import recursosApi from "../api/recursosApi";
import { useAuth } from "../context/AuthContext";

export const VUELOS_KEY = ["vuelos"];
export const RECURSOS_KEY = (vueloId) => ["recursos", vueloId];

/**
 * Segunda capa de protección de caché (además de queryClient.clear() en
 * AuthContext al hacer login/logout/cambiar de estación): incluir el
 * contexto activo dentro de la queryKey hace que cada combinación de
 * estación + aerolínea tenga su propia entrada de caché, aunque por algún
 * motivo (StrictMode, un componente que no se desmontó, una query en vuelo)
 * la invalidación global no alcance a limpiar todo a tiempo.
 */
function useContextoKey() {
  const { estacionActiva, lineaAereaActiva } = useAuth();
  return [estacionActiva?.id ?? null, lineaAereaActiva?.lineaAereaId ?? null];
}

export function useVuelos(params) {
  const contextoKey = useContextoKey();
  return useQuery({
    queryKey: [...VUELOS_KEY, contextoKey, params],
    queryFn: async () => {
      const { data } = await vuelosApi.getAll(params);
      return data.data;
    },
    staleTime: Number(import.meta.env.VITE_QUERY_STALE_TIME) || 0,
  });
}

export function useVuelo(id) {
  return useQuery({
    queryKey: ["vuelo", id],
    queryFn: async () => {
      const { data } = await vuelosApi.getById(id);
      return data.data;
    },
    enabled: !!id,
  });
}

/**
 * Búsqueda dinámica de vuelos con filtros opcionales.
 * Mantiene datos anteriores mientras carga (sin parpadeo).
 * Igual al patrón de useBuscarUsuarios.
 */
export function useBuscarVuelos(filtros, pageable = { page: 0, size: 50 }) {
  const contextoKey = useContextoKey();
  return useQuery({
    queryKey: [...VUELOS_KEY, "buscar", contextoKey, filtros, pageable],
    queryFn: async () => {
      const params = {};
      Object.entries({ ...filtros, ...pageable }).forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined) params[k] = v;
      });
      const { data } = await vuelosApi.buscar(params);
      return data.data;
    },
    placeholderData: keepPreviousData,
    staleTime: Number(import.meta.env.VITE_QUERY_STALE_TIME) || 0,
  });
}

export function useRecursos(vueloId) {
  return useQuery({
    queryKey: RECURSOS_KEY(vueloId),
    queryFn: async () => {
      const { data } = await vuelosApi.getRecursos(vueloId);
      return data.data;
    },
    enabled: !!vueloId,
  });
}

export function useRegistrarVuelo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => vuelosApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: VUELOS_KEY }),
  });
}

export function useActualizarVuelo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => vuelosApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: VUELOS_KEY }),
  });
}

export function useAnularVuelo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => vuelosApi.anular(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: VUELOS_KEY }),
  });
}

/** Reactiva un vuelo ANULADO → ACTIVO */
export function useHabilitarVuelo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => vuelosApi.habilitar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: VUELOS_KEY }),
  });
}

/**
 * Carga masiva desde Excel.
 *
 * El backend ahora retorna { registrados: [...], errores: [...] }.
 * El hook expone el resultado completo para que la página pueda
 * mostrar el modal de errores cuando corresponda.
 *
 * Firma de respuesta esperada:
 *   data.data = { registrados: VueloResponse[], errores: string[] }
 */
export function useCargaMasiva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData) => vuelosApi.cargaMasiva(formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: VUELOS_KEY }),
  });
}

/**
 * Trae los vuelos ACTIVOS cuya fechaVuelo = hoy en Lima (UTC-5).
 * Alimenta el combo del itinerario del líder.
 *
 * staleTime: 5 min — el itinerario del día no cambia con frecuencia;
 * si el admin carga nuevos vuelos, el líder puede refrescar manualmente
 * o esperar el próximo ciclo de invalidación.
 * refetchOnWindowFocus: true — si el líder cambia de tab y vuelve,
 * se refresca para capturar nuevos vuelos cargados por el admin.
 */
export function useItinerarioHoy() {
  const contextoKey = useContextoKey();
  return useQuery({
    queryKey: ["vuelos", "itinerario-hoy", contextoKey],
    queryFn: async () => {
      const { data } = await vuelosApi.itinerarioHoy();
      return data.data; // List<VueloResponse>
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true,
  });
}

export function useHabilitarRecurso(vueloId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => recursosApi.habilitar(vueloId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: RECURSOS_KEY(vueloId) }),
  });
}

export function useDeshabilitarRecurso(vueloId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recursoId) => recursosApi.deshabilitar(vueloId, recursoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: RECURSOS_KEY(vueloId) }),
  });
}

// ── Hooks para los 3 endpoints unificados de la Vista Líder ──────────────

/** Carga vuelo + recursos completos para mostrar en la vista del Líder */
export function useRegistroVuelo(id) {
  return useQuery({
    queryKey: ["registro-vuelo", id],
    queryFn: async () => {
      const { data } = await vuelosApi.getRegistro(id);
      return data.data;
    },
    enabled: !!id,
    staleTime: 0,
  });
}

/** POST /vuelos/registro — primera vez que el Líder presiona "Guardar" */
export function useCrearRegistroCompleto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => vuelosApi.crearRegistro(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: VUELOS_KEY }),
  });
}

/** PUT /vuelos/{id}/registro — Líder presiona "Guardar" en modo edición */
export function useActualizarRegistroCompleto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      vuelosApi.actualizarRegistro(id, payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: VUELOS_KEY });
      qc.invalidateQueries({ queryKey: ["registro-vuelo", vars.id] });
    },
  });
}
