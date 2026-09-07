import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import reportesApi from "../api/reportesApi";

export function useReportes(filtros, pageable) {
  return useQuery({
    queryKey: ["reportes", filtros, pageable],
    queryFn: async () => {
      const { data } = await reportesApi.getAll({ ...filtros, ...pageable });
      return data.data;
    },
  });
}

export function useExportarExcel() {
  return useMutation({
    mutationFn: async (filtros) => {
      const response = await reportesApi.exportarExcel(filtros);
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-atenciones-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

/**
 * FIX 2: staleTime:0 + gcTime:0
 *
 * El problema era que gcTime tenía el valor por defecto (5 min).
 * Con staleTime:0 React Query marca los datos como "stale" al instante,
 * PERO con gcTime>0 los mantiene en caché y los devuelve de inmediato
 * mientras hace el re-fetch en background → el usuario ve datos viejos.
 *
 * Con gcTime:0 el caché se destruye al desmontar el componente,
 * así cada vez que se abre un detalle hace un fetch limpio.
 *
 * El id recibido es el CORRELATIVO (ej: "SGC-000001001") porque la lista
 * no expone atencionId. Se usa getDetalleByCorr que llama al endpoint correcto.
 */

// export function useReporteDetalle(id) {
//   return useQuery({
//     queryKey: ["reporte-detalle", id],
//     queryFn: async () => {
//       const { data } = await reportesApi.getDetalle(id);
//       return data.data;
//     },
//     enabled: !!id,
//     staleTime: 0,
//   });
// }

export function useReporteDetalle(correlativo) {
  return useQuery({
    queryKey: ["reporte-detalle", correlativo],
    queryFn: async () => {
      const { data } = await reportesApi.getDetalleByCorr(correlativo);
      return data.data;
    },
    enabled: !!correlativo,
    staleTime: 0,
    gcTime: 0, // no conservar caché al desmontar -> fetch limpio siempre
  });
}

export function useActualizarServicios() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => reportesApi.actualizarServicios(id, body),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["reporte-detalle"] }),
  });
}

export const useRegenerarPdf = () =>
  useMutation({
    mutationFn: ({ id, correoDestino, telefono, idiomaVoucher }) =>
      // ✅ FIX: llama a POST /api/v1/reportes/{id}/regenerar-pdf
      //    que regenera el PDF con servicios ACTUALES de BD y envía por email + WhatsApp
      //    (antes llamaba a atencionesApi.reenviarPdf → endpoint incorrecto)
      reportesApi.regenerarPdf(id, {
        correoDestino,
        telefono: telefono || null,
        idiomaVoucher: idiomaVoucher || "ES",
      }),
  });

// Edición de datos del pasajero (nombre, correo, WhatsApp, PNR) — solo Administrador y Líder SAASA
export function useActualizarPasajero() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => reportesApi.actualizarPasajero(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reporte-detalle"] }),
  });
}
export function useDescargarActualizado() {
  return useMutation({
    mutationFn: (id) => reportesApi.descargarActualizado(id),
  });
}

/**
 * Hook para obtener los KPIs y datos de gráficos del módulo de reportes.
 * @param {Object} rango - { fechaDesde, fechaHasta } en formato "yyyy-MM-dd"
 */
export function useResumenReportes(rango, contexto) {
  return useQuery({
    queryKey: ["reportes-resumen", rango, contexto],
    queryFn: async () => {
      const params = {};
      if (rango?.fechaDesde) params.fechaDesde = rango.fechaDesde;
      if (rango?.fechaHasta) params.fechaHasta = rango.fechaHasta;
      const { data } = await reportesApi.getResumen(params);
      return data.data;
    },
    staleTime: 30_000, // 30 s de caché — datos de resumen cambian poco
  });
}

export function useAnularReporte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (correlativo) => reportesApi.anular(correlativo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reportes"] }),
  });
}

export function useRestaurarReporte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (correlativo) => reportesApi.restaurar(correlativo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reportes"] }),
  });
}

export function useVerificarAnulados() {
  return useMutation({
    mutationFn: async (filtros) => {
      const { data } = await reportesApi.getAll({
        ...filtros,
        estado: "ANULADO",
        page: 0,
        size: 1,
      });
      return (data?.data?.totalElements ?? 0) > 0;
    },
  });
}
