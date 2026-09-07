import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import atencionesApi from "../api/atencionesApi";

const KEY_ATENCIONES = ["atenciones"];
const KEY_DISP = (id) => ["disponibilidad", id];

/** Lista atenciones de un registro diario específico */
export function useAtencionesRegistro(registroId) {
  return useQuery({
    queryKey: [...KEY_ATENCIONES, "registro", registroId],
    queryFn: async () => {
      const { data } = await atencionesApi.getAtenciones(registroId);
      return data.data ?? [];
    },
    enabled: !!registroId,
    staleTime: 0,
  });
}

/** Disponibilidad en tiempo real de un registro diario */
export function useDisponibilidad(registroId) {
  return useQuery({
    queryKey: KEY_DISP(registroId),
    queryFn: async () => {
      const { data } = await atencionesApi.getDisponibilidad(registroId);
      return data.data;
    },
    enabled: !!registroId,
    refetchInterval: 15000, // refresca cada 15s como complemento al WS
    staleTime: 0,
  });
}

/** GET /atenciones/verificar-pnr?pnr=XXX&vueloId=YYY */
export function useVerificarPnr() {
  return useMutation({
    mutationFn: ({ pnr, vueloId }) => atencionesApi.verificarPnr(pnr, vueloId),
  });
}

/** POST /atenciones/escanear-boarding-pass */
export function useEscanearBoardingPass() {
  return useMutation({
    mutationFn: (codigoBarras) =>
      atencionesApi.escanearBoardingPass(codigoBarras),
  });
}

export const useEscanearBoardingPassImagen = () => {
  return useMutation({
    mutationFn: (formData) => atencionesApi.escanearImagen(formData), // ✅
  });
};

/** POST /atenciones — registrar pasajero */
export function useCrearAtencion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => atencionesApi.create(payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: [...KEY_ATENCIONES, "registro", vars.registroVueloDiarioId],
      });
      qc.invalidateQueries({ queryKey: KEY_DISP(vars.registroVueloDiarioId) });
    },
  });
}

/** POST /atenciones/{id}/servicios */
export function useAsignarServicios() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ atencionId, registroId, servicios }) =>
      atencionesApi
        .asignarServicios(atencionId, servicios)
        .then((res) => ({ res, registroId })),
    onSuccess: ({ registroId }) => {
      qc.invalidateQueries({ queryKey: KEY_DISP(registroId) });
    },
  });
}

export function useAtencion(id) {
  return useQuery({
    queryKey: ["atencion", id],
    queryFn: async () => {
      const { data } = await atencionesApi.getById(id);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useRegistrarAtencion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => atencionesApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ATENCIONES_KEY }),
  });
}

export function useRegistrarBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => atencionesApi.batch(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ATENCIONES_KEY }),
  });
}

export function useActualizarAtencion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => atencionesApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ATENCIONES_KEY }),
  });
}

export function useAnularAtencion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => atencionesApi.anular(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ATENCIONES_KEY }),
  });
}

/** POST /atenciones/{id}/voucher/generar — solo genera PDF y sube a S3 */
export function useGenerarPdf() {
  return useMutation({
    mutationFn: (id) => atencionesApi.generarVoucher(id),
  });
}

// ✅ Después
export function useGenerarYEnviarVoucher() {
  return useMutation({
    mutationFn: ({
      id,
      correoDestino,
      ccDestinos,
      firmaPasajero,
      idiomaVoucher,
    }) =>
      atencionesApi.generarYEnviarVoucher(
        id,
        correoDestino,
        ccDestinos,
        firmaPasajero,
        idiomaVoucher, // ← NUEVO — idioma elegido en el modal "Confirmar y Enviar Voucher"
      ),
  });
}

/**
 * NUEVO — Voucher grupal: POST /atenciones/voucher-grupal/generar
 * Genera UN solo PDF para varios pasajeros que comparten PNR/correo (sin enviar).
 */
export function useGenerarPdfGrupal() {
  return useMutation({
    mutationFn: ({ atencionIds, serviciosCompartidos }) =>
      atencionesApi.generarVoucherGrupal({ atencionIds, serviciosCompartidos }),
  });
}

// ✅ Después
export function useGenerarYEnviarVoucherGrupal() {
  return useMutation({
    mutationFn: ({
      atencionIds,
      correoDestino,
      serviciosCompartidos,
      ccDestinos,
      firmaPasajero,
      idiomaVoucher,
    }) =>
      atencionesApi.generarYEnviarVoucherGrupal({
        atencionIds,
        correoDestino,
        serviciosCompartidos,
        ccDestinos,
        firmaPasajero,
        idiomaVoucher, // ← NUEVO — idioma elegido en el modal "Confirmar y Enviar Voucher"
      }),
  });
}

// ✅ Después
export function useReenviarPDF() {
  return useMutation({
    mutationFn: ({ atencionId, correoDestino, ccDestinos }) =>
      atencionesApi.reenviarPdf(atencionId, { correoDestino, ccDestinos }),
  });
}

/** GET /atenciones/{id}/voucher/descargar — obtiene URL firmada para descarga */
export function useObtenerUrlDescarga() {
  return useMutation({
    mutationFn: (id) => atencionesApi.obtenerUrlDescarga(id),
  });
}
