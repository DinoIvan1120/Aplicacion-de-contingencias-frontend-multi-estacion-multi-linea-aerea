import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { REDIRECT_POR_ROL } from "../utils/constants";

export default function RolRoute({ roles = [], soloAdministradorGlobal = false }) {
  const { rol, esAdministradorGlobal } = useAuth();

  if (!roles.includes(rol)) {
    const redirect = REDIRECT_POR_ROL[rol] ?? "/login";
    return <Navigate to={redirect} replace />;
  }

   if (soloAdministradorGlobal && !esAdministradorGlobal) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
