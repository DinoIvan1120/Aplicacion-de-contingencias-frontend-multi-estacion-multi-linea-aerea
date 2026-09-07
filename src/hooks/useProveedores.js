import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import proveedoresApi from "../api/proveedoresApi";

export const PROVEEDORES_KEY = ["proveedores"];

export function useProveedores(params) {
  return useQuery({
    queryKey: [...PROVEEDORES_KEY, params],
    queryFn: async () => {
      const { data } = await proveedoresApi.getAll(params);
      return data.data;
    },
  });
}

export function useServiciosProveedor(id) {
  return useQuery({
    queryKey: ["proveedor-servicios", id],
    queryFn: async () => {
      const { data } = await proveedoresApi.getServicios(id);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useProveedorConServicios(id) {
  return useQuery({
    queryKey: ["proveedor-con-servicios", id],
    queryFn: async () => {
      const { data } = await proveedoresApi.getConServicios(id);
      return data.data;
    },
    enabled: !!id,
    staleTime: 30000,
  });
}

export function useCrearProveedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => proveedoresApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROVEEDORES_KEY }),
  });
}

export function useCrearProveedorConServicios() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => proveedoresApi.createConServicios(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROVEEDORES_KEY }),
  });
}

export function useActualizarProveedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => proveedoresApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROVEEDORES_KEY }),
  });
}

export function useActualizarProveedorConServicios() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      proveedoresApi.updateConServicios(id, payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: PROVEEDORES_KEY });
      qc.invalidateQueries({
        queryKey: ["proveedor-con-servicios", variables.id],
      });
    },
  });
}

export function useCambiarEstadoProveedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estadoActual }) => {
      const nuevoEstado = estadoActual === 1 || estadoActual === true ? 0 : 1;
      return proveedoresApi.cambiarEstado(id, nuevoEstado);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PROVEEDORES_KEY }),
  });
}

export function useAddServicioProveedor(proveedorId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => proveedoresApi.addServicio(proveedorId, body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["proveedor-servicios", proveedorId] }),
  });
}
