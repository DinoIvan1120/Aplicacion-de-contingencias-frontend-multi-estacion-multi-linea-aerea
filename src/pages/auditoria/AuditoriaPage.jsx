import { useState } from "react";
import {
  Shield,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Filter,
  Download,
} from "lucide-react";
import {
  useAuditoria,
  useExportarExcelAuditoria,
} from "../../hooks/useAuditoria";
import { useUsuarios } from "../../hooks/useUsuarios";
import { useAuth } from "../../context/AuthContext";
import { formatearFecha } from "../../utils/formatters";
import styles from "./AuditoriaPage.module.css";

/* ── Constantes de filtros ── */
const MODULOS = [
  "ATENCIONES",
  "USUARIOS",
  "PROVEEDORES",
  "VUELOS",
  "REPORTES",
  "SERVICIOS",
];
const ACCIONES = [
  "CREAR_ATENCION",
  "ACTUALIZAR_ATENCION",
  "ANULAR_ATENCION",
  "CREAR_USUARIO",
  "ACTUALIZAR_USUARIO",
  "ELIMINAR_USUARIO",
  "CREAR_PROVEEDOR",
  "ACTUALIZAR_PROVEEDOR",
  "ELIMINAR_PROVEEDOR",
  "ASIGNAR_SERVICIOS",
  "REGENERAR_PDF",
];

const EMPTY = {
  buscar: "",
  usuarioId: "",
  modulo: "",
  accion: "",
  fechaDesde: "",
  fechaHasta: "",
};

/* ── Badge de acción coloreado ── */
const ACCION_COLORS = {
  CREAR: { bg: "#D1FAE5", color: "#065F46" },
  ACTUALIZAR: { bg: "#DBEAFE", color: "#1E40AF" },
  ELIMINAR: { bg: "#FEE2E2", color: "#991B1B" },
  ANULAR: { bg: "#FEF3C7", color: "#92400E" },
};

function AccionBadge({ accion }) {
  const key = Object.keys(ACCION_COLORS).find((k) =>
    accion?.toUpperCase().startsWith(k),
  );
  const style = ACCION_COLORS[key] ?? { bg: "#F3F4F6", color: "#374151" };
  return (
    <span
      className={styles.accionBadge}
      style={{ background: style.bg, color: style.color }}
    >
      {accion ?? "—"}
    </span>
  );
}

export default function AuditoriaPage() {
  // FIX: antes esta página no leía useAuth() en absoluto, por lo que no
  // se enteraba cuando el usuario cambiaba de estación/línea en el
  // selector del topbar (EstacionSwitcher). El backend sí filtra bien
  // por header X-Estacion-Id/X-Linea-Aerea-Id, el problema era 100%
  // frontend: sin esta suscripción, el componente no volvía a
  // renderizar tras el cambio, así que la query de React Query se
  // quedaba mostrando los datos de la estación anterior hasta que el
  // usuario cambiaba de vista y regresaba.
  const { estacionActiva, lineaAereaActiva } = useAuth();
  const [filtros, setFiltros] = useState(EMPTY);
  const [activos, setActivos] = useState(EMPTY);
  const [page, setPage] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [errorModal, setErrorModal] = useState(null);

  /* Construir params para la query */
  const params = {
    page,
    size: 20,
    ...(activos.buscar && { buscar: activos.buscar }),
    ...(activos.usuarioId && { usuarioId: Number(activos.usuarioId) }),
    ...(activos.modulo && { modulo: activos.modulo }),
    ...(activos.accion && { accion: activos.accion }),
    ...(activos.fechaDesde && { fechaDesde: activos.fechaDesde }),
    ...(activos.fechaHasta && { fechaHasta: activos.fechaHasta }),
  };

  const { data: pageData, isLoading } = useAuditoria(params, {
    estacionId: estacionActiva?.id,
    lineaAereaId: lineaAereaActiva?.lineaAereaId,
  });
  const registros = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 0;
  const totalElem = pageData?.totalElements ?? 0;

  const { data: usersPage } = useUsuarios({ page: 0, size: 200 });
  const usuarios = usersPage?.content ?? [];

  const exportar = useExportarExcelAuditoria();

  const setF = (k, v) => setFiltros((f) => ({ ...f, [k]: v }));

  const handleBuscar = () => {
    setActivos({ ...filtros });
    setPage(0);
  };
  const handleLimpiar = () => {
    setFiltros(EMPTY);
    setActivos(EMPTY);
    setPage(0);
  };

  const handleExportar = async () => {
    try {
      // Exporta con los filtros actualmente aplicados (activos)
      const filtrosExcel = {
        ...(activos.buscar && { buscar: activos.buscar }),
        ...(activos.usuarioId && { usuarioId: Number(activos.usuarioId) }),
        ...(activos.modulo && { modulo: activos.modulo }),
        ...(activos.accion && { accion: activos.accion }),
        ...(activos.fechaDesde && { fechaDesde: activos.fechaDesde }),
        ...(activos.fechaHasta && { fechaHasta: activos.fechaHasta }),
      };
      await exportar.mutateAsync(filtrosExcel);
    } catch {
      setErrorModal("No se pudo generar el archivo Excel de auditoría.");
    }
  };

  const filtrosActivosCount = Object.values(activos).filter(Boolean).length;
  //const filtrosActivos = Object.values(activos).filter(Boolean).length;

  return (
    <div className={styles.page}>
      {/* ── Encabezado ── */}
      <div className={styles.pageHeader}>
        <Shield size={24} color="var(--rol-aerea)" />
        <div>
          <h1 className={styles.title}>Log de Auditoría</h1>
          <p className={styles.sub}>
            {totalElem} registro{totalElem !== 1 ? "s" : ""} encontrado
            {totalElem !== 1 ? "s" : ""}
          </p>
        </div>

        <div className={styles.headerActions}>
          {/* Botón Filtros */}
          <button
            className={[
              styles.filtroToggle,
              panelOpen ? styles.filtroToggleActive : "",
            ].join(" ")}
            onClick={() => setPanelOpen((o) => !o)}
            aria-label="Mostrar filtros"
          >
            <Filter size={16} />
            Filtros
            {filtrosActivosCount > 0 && (
              <span className={styles.filtroCount}>{filtrosActivosCount}</span>
            )}
          </button>

          {/* Botón Exportar Excel */}
          <button
            className={styles.exportBtn}
            onClick={handleExportar}
            disabled={exportar.isPending}
            aria-label="Exportar Excel"
          >
            <Download size={16} />
            {exportar.isPending ? "Generando…" : "Exportar Excel"}
          </button>
        </div>
      </div>

      {/* ── Panel de filtros (estilo AdminUsuarios) ── */}

      <div
        className={[
          styles.filtrosCard,
          panelOpen ? styles.filtrosCardOpen : "",
        ].join(" ")}
      >
        <div className={styles.filtrosGrid}>
          {/* Buscar libre */}
          <div className={styles.filtroField}>
            <label className={styles.filtroLabel}>Buscar</label>
            <div className={styles.filtroInputWrap}>
              <Search size={14} className={styles.filtroIcon} />
              <input
                className={styles.filtroInput}
                placeholder="Correlativo, PNR, nombre..."
                value={filtros.buscar}
                onChange={(e) => setF("buscar", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
              />
            </div>
          </div>

          {/* Usuario */}
          <div className={styles.filtroField}>
            <label className={styles.filtroLabel}>Usuario</label>
            <select
              className={styles.filtroSelect}
              value={filtros.usuarioId}
              onChange={(e) => setF("usuarioId", e.target.value)}
            >
              <option value="">Todos los usuarios</option>
              <option value="0">Sistema</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.apellido}, {u.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Módulo */}
          <div className={styles.filtroField}>
            <label className={styles.filtroLabel}>Módulo</label>
            <select
              className={styles.filtroSelect}
              value={filtros.modulo}
              onChange={(e) => setF("modulo", e.target.value)}
            >
              <option value="">Todos los módulos</option>
              {MODULOS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Acción */}
          <div className={styles.filtroField}>
            <label className={styles.filtroLabel}>Acción</label>
            <select
              className={styles.filtroSelect}
              value={filtros.accion}
              onChange={(e) => setF("accion", e.target.value)}
            >
              <option value="">Todas las acciones</option>
              {ACCIONES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha desde */}
          <div className={styles.filtroField}>
            <label className={styles.filtroLabel}>Fecha desde</label>
            <input
              type="date"
              className={styles.filtroInputPlain}
              value={filtros.fechaDesde}
              onChange={(e) => setF("fechaDesde", e.target.value)}
            />
          </div>

          {/* Fecha hasta */}
          <div className={styles.filtroField}>
            <label className={styles.filtroLabel}>Fecha hasta</label>
            <input
              type="date"
              className={styles.filtroInputPlain}
              value={filtros.fechaHasta}
              onChange={(e) => setF("fechaHasta", e.target.value)}
            />
          </div>
        </div>

        <div className={styles.filtrosActions}>
          <button className={styles.btnLimpiar} onClick={handleLimpiar}>
            <X size={14} /> Limpiar
          </button>
          <button className={styles.btnBuscar} onClick={handleBuscar}>
            <Search size={14} /> Buscar
          </button>
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className={styles.tableWrap}>
        {isLoading ? (
          <div className={styles.loadingRow}>Cargando registros...</div>
        ) : registros.length === 0 ? (
          <div className={styles.emptyRow}>
            <Shield size={36} color="var(--text-200)" />
            <p>No hay registros de auditoría con los filtros aplicados.</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                {[
                  "#",
                  "Fecha",
                  "Usuario",
                  "Rol",
                  "Módulo",
                  "Acción",
                  "Entidad",
                  "Detalle",
                  "IP",
                ].map((h) => (
                  <th key={h} className={styles.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registros.map((r, i) => (
                <tr key={r.id ?? i} className={styles.tr}>
                  <td className={styles.td}>{page * 20 + i + 1}</td>
                  <td className={styles.td} style={{ whiteSpace: "nowrap" }}>
                    {formatearFecha(
                      r.creadoEn ?? r.fecha ?? r.timestamp ?? r.createdAt,
                    )}
                  </td>
                  <td className={styles.td}>
                    <span className={styles.usuarioNombre}>
                      {r.usuarioNombre ?? r.usuario?.nombre ?? "—"}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {r.usuarioRol ? (
                      <span className={styles.rolBadge}>
                        {r.usuarioRol.replace("ROLE_", "")}
                      </span>
                    ) : (
                      <span className={styles.dash}>—</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    {r.modulo ? (
                      <span className={styles.moduloBadge}>{r.modulo}</span>
                    ) : (
                      <span className={styles.dash}>—</span>
                    )}
                  </td>
                  <td className={styles.td}>
                    <AccionBadge accion={r.accion ?? r.action} />
                  </td>
                  <td className={styles.td}>
                    {r.entidadNombre ? (
                      <span className={styles.entidad}>
                        {r.entidadTipo && (
                          <span className={styles.entidadTipo}>
                            {r.entidadTipo}
                          </span>
                        )}
                        {r.entidadNombre}
                      </span>
                    ) : (
                      <span className={styles.dash}>—</span>
                    )}
                  </td>
                  <td className={styles.tdDetalle}>
                    <span className={styles.detalleTxt}>
                      {r.detalle ?? r.detail ?? "—"}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.ip}>
                      {r.ipOrigen ?? r.ip ?? "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Paginación ── */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft size={18} />
          </button>
          <span className={styles.pageInfo}>
            Página {page + 1} de {totalPages} · {totalElem} registros
          </span>
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
      {/* ── Error modal simple ── */}
      {errorModal && (
        <div
          className={styles.errorOverlay}
          onClick={() => setErrorModal(null)}
        >
          <div className={styles.errorBox} onClick={(e) => e.stopPropagation()}>
            <p>{errorModal}</p>
            <button onClick={() => setErrorModal(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
