import { useQuery, useMutation } from "@tanstack/react-query";
import auditoriaApi from "../api/auditoriaApi";

// FIX: recibe también el contexto activo (estación + línea aérea) y lo
// mete en la queryKey. Antes la key era solo ["auditoria", params] y la
// página nunca leía useAuth(), así que al cambiar de estación en el
// topbar (AuthContext -> queryClient.clear()) el observer de esta query
// seguía "colgado" del Query ya destruido y no volvía a pedir datos: solo
// se refrescaba si el usuario cambiaba de vista y volvía (remount). Al
// incluir el contexto acá, el componente se suscribe a AuthContext y
// vuelve a renderizar en cada cambio de estación/línea, lo que hace que
// el observer note que la query fue removida del caché y dispare un
// fetch nuevo de inmediato (mismo patrón que ya usa Proveedores).
export function useAuditoria(params, contexto) {
  return useQuery({
    queryKey: ["auditoria", params, contexto],
    queryFn: async () => {
      const { data } = await auditoriaApi.getAll(params);
      return data.data;
    },
    staleTime: 0,
  });
}

export function useExportarExcelAuditoria() {
  return useMutation({
    mutationFn: async (filtros) => {
      const response = await auditoriaApi.exportarExcel(filtros);
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `auditoria-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}
