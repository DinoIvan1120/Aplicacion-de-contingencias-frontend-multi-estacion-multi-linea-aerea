import { Routes, Route, Navigate, useParams } from "react-router-dom";
import PrivateRoute from "./PrivateRoute.jsx";
import RolRoute from "./RolRoute.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";

import LoginPage from "../pages/auth/LoginPage.jsx";
import SeleccionarEstacionPage from "../pages/auth/SeleccionarEstacionPage.jsx";
import SeleccionarAerolineaPage from "../pages/auth/SeleccionarAerolineaPage.jsx";
import SeleccionarModoAdminPage from "../pages/auth/SeleccionarModoAdminPage.jsx";
import DashboardPage from "../pages/dashboard/DashboardPage.jsx";

import LiderVueloPage from "../pages/lider/LiderVueloPage.jsx";
import LiderRecursosPage from "../pages/lider/LiderRecursosPage.jsx";

import AgenteAtencionPage from "../pages/agente/AgenteAtencionPage.jsx";
import AgentePDFPage from "../pages/agente/AgentePDFPage.jsx";
import AgenteCargaMasivaPage from "../pages/agente/AgenteCargaMasivaPage.jsx";

import ReportesPage from "../pages/reportes/ReportesPage.jsx";

import ResumenPage from "../pages/resumen/ResumenPage.jsx";

import AdminDashboardPage from "../pages/admin/AdminDashboardPage.jsx";
import AdminProveedoresPage from "../pages/admin/AdminProveedoresPage.jsx";
import AdminAerolineasPage from "../pages/admin/AdminAerolineasPage.jsx";
import AdminUsuariosPage from "../pages/admin/AdminUsuariosPage.jsx";
import AdminVuelosPage from "../pages/admin/AdminVuelosPage.jsx";
import AdminEstacionesPage from "../pages/admin/AdminEstacionesPage.jsx";

import AuditoriaPage from "../pages/auditoria/AuditoriaPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import ReporteDetallePage from "../pages/reportes/ReporteDetallePage.jsx";

/**
 * Matriz de acceso — Roles_y_módulos_v1.1.xlsx
 *
 *  Módulo                  Admin  Líder  Agente  Aerolínea  Proveedor
 *  ─────────────────────────────────────────────────────────────────
 *  Registro de Vuelo       ✓      ✓      —       —          —
 *  Registro de Comp.       ✓      ✓      ✓       —          —
 *  Gestión de Reportes     ✓      ✓      ✓       ✓          ✓
 *  Gestión de Proveedores  ✓      ✓      —       —          —
 *  Gestión de Usuarios     ✓      —      —       —          —
 *  Auditoría               ✓      ✓      —       —          —
 */

/**
 * FIX 3: DetalleWrapper con key={id}
 *
 * Cuando React Router re-usa el mismo componente para rutas con el mismo
 * path pattern (/reportes/detalle/:id), el componente NO se desmonta al
 * cambiar el :id → el estado local (editMode, modal, etc.) queda del registro anterior.
 *
 * Solucionar poniendo key={id} fuerza a React a desmontar y remontar el
 * componente completo cada vez que cambia el correlativo → estado limpio siempre.
 */

function DetalleWrapper() {
  const { id } = useParams();
  return <ReporteDetallePage key={id} />;
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/recovery" element={<Navigate to="/login" replace />} />
      <Route
        path="/reset-password"
        element={<Navigate to="/login" replace />}
      />

      {/* Privadas */}
      <Route element={<PrivateRoute />}>
        {/* Selección de estación/aerolínea post-login (Fase 5 — rediseño) y
            Dashboard de módulos — sin AppLayout (pantallas completas propias) */}
        <Route path="/seleccionar-modo" element={<SeleccionarModoAdminPage />} />
        <Route path="/seleccionar-estacion" element={<SeleccionarEstacionPage />} />
        <Route path="/seleccionar-aerolinea" element={<SeleccionarAerolineaPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Páginas con AppLayout (sidebar + topbar) */}
        <Route element={<AppLayout />}>
          <Route
            element={<RolRoute roles={["LIDER_SAASA", "ADMINISTRADOR"]} />}
          >
            <Route path="/lider/vuelo" element={<LiderVueloPage />} />
            {/* <Route path="/lider/recursos" element={<LiderRecursosPage />} /> */}
          </Route>
          <Route
            element={
              <RolRoute
                roles={["AGENTE_SAASA", "LIDER_SAASA", "ADMINISTRADOR"]}
              />
            }
          >
            <Route path="/agente/atencion" element={<AgenteAtencionPage />} />
            <Route
              path="/agente/carga-masiva"
              element={<AgenteCargaMasivaPage />}
            />
            <Route path="/agente/pdf" element={<AgentePDFPage />} />
          </Route>
          <Route
            element={
              <RolRoute
                roles={[
                  "LINEA_AEREA",
                  "LIDER_SAASA",
                  "ADMINISTRADOR",
                  "PROVEEDOR",
                  "AGENTE_SAASA",
                ]}
              />
            }
          >
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/reportes/detalle/:id" element={<DetalleWrapper />} />
          </Route>
          {/* <Route element={<RolRoute roles={["ADMINISTRADOR"]} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route
              path="/admin/proveedores"
              element={<AdminProveedoresPage />}
            />
            <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
            <Route path="/admin/vuelos" element={<AdminVuelosPage />} />
            <Route path="/auditoria" element={<AuditoriaPage />} />
          </Route> */}
          {/* ✅ CORRECCIÓN — separar /admin/proveedores con su propio RolRoute */}
          <Route
            element={<RolRoute roles={["ADMINISTRADOR", "LIDER_SAASA"]} />}
          >
            <Route
              path="/admin/proveedores"
              element={<AdminProveedoresPage />}
            />
          </Route>
          <Route element={<RolRoute roles={["ADMINISTRADOR"]} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
            <Route path="/admin/vuelos" element={<AdminVuelosPage />} />
            <Route path="/admin/aerolineas" element={<AdminAerolineasPage />} />
            <Route path="/auditoria" element={<AuditoriaPage />} />
            <Route path="/resumen" element={<ResumenPage />} />
          </Route>
          {/* FIX: /admin/estaciones es una vista de alcance general (catálogo
              de estaciones/líneas aéreas del sistema), no depende del
              contexto de trabajo activo — por eso queda reservada al
              Administrador Global; un Administrador de estación específica
              es redirigido a /admin si intenta entrar por URL directa. */}
          <Route
            element={
              <RolRoute roles={["ADMINISTRADOR"]} soloAdministradorGlobal />
            }
          >
            <Route path="/admin/estaciones" element={<AdminEstacionesPage />} />
          </Route>

        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
