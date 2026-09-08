import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/ui/Spinner.jsx";

// Rutas del propio flujo de selección — nunca redirigir hacia ellas
// estando ya en ellas, o se generaría un loop.
const RUTAS_SELECCION = [
  "/seleccionar-modo",
  "/seleccionar-estacion",
  "/seleccionar-aerolinea",
];

const RUTAS_CATALOGO_GLOBAL = ["/admin/estaciones", "/admin/usuarios"];

export default function PrivateRoute() {
  const { token, isLoading, user, estacionActiva, esAdministradorGlobal } =
    useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;

  // Salvaguarda (Fase 5 — rediseño): un usuario sin contexto fijo
  // (Administrador Global o multi-estación) que todavía no eligió
  // estación/aerolínea — p. ej. recargó la página a mitad del flujo, o
  // pegó directamente la URL de /dashboard — se manda al selector en
  // vez de dejarlo entrar sin contexto de trabajo.
  const necesitaSeleccion =
    !!user &&
    !user.lineaAereaFija &&
    !estacionActiva &&
    !(
      esAdministradorGlobal &&
      RUTAS_CATALOGO_GLOBAL.some((ruta) => location.pathname.startsWith(ruta))
    );

 if (necesitaSeleccion && !RUTAS_SELECCION.includes(location.pathname)) {
    return (
      <Navigate
        to={esAdministradorGlobal ? "/seleccionar-modo" : "/seleccionar-estacion"}
        replace
      />
    );
  }

  return <Outlet />;
}
