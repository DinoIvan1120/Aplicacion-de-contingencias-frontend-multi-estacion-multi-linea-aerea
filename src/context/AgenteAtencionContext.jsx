import { createContext, useContext, useState } from "react";

/**
 * Contexto para comunicar al Sidebar si el agente ya seleccionó un vuelo
 * dentro de "Atención al Pasajero". Se usa para mostrar/ocultar el ítem
 * "Carga masiva (Excel)" del menú lateral:
 *  - Lista de vuelos (aún no se eligió ninguno) -> NO se muestra
 *  - Ventana del vuelo seleccionado -> SÍ se muestra
 */
const AgenteAtencionContext = createContext(null);

export function AgenteAtencionProvider({ children }) {
  const [vueloSeleccionado, setVueloSeleccionado] = useState(false);

  return (
    <AgenteAtencionContext.Provider
      value={{ vueloSeleccionado, setVueloSeleccionado }}
    >
      {children}
    </AgenteAtencionContext.Provider>
  );
}

export function useAgenteAtencion() {
  const ctx = useContext(AgenteAtencionContext);
  if (!ctx) {
    return { vueloSeleccionado: false, setVueloSeleccionado: () => {} };
  }
  return ctx;
}
