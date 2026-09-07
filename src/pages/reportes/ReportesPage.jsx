import { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  BarChart2,
  Download,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Info,
  Search,
  X,
} from "lucide-react";
import {
  useReportes,
  useExportarExcel,
  useAnularReporte,
  useRestaurarReporte,
  useVerificarAnulados,
} from "../../hooks/useReportes";
import { useNavigate } from "react-router-dom";
import { useVuelos } from "../../hooks/useVuelos";
import { useProveedores } from "../../hooks/useProveedores";
import { formatearFecha, formatearMonto } from "../../utils/formatters";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import InfoModal from "../../components/ui/InfoModal.jsx";
import Modal from "../../components/ui/Modal.jsx";
import styles from "./ReportesPage.module.css";

const EMPTY_FILTROS = {
  correlativo: "",
  pnr: "",
  nombrePasajero: "",
  vueloId: "",
  hotelId: "",
  transporteId: "",
  restauranteId: "",
  agenteId: "",
  fechaDesde: "",
  fechaHasta: "",
};

export default function ReportesPage() {
  const { rol } = useAuth();
  const esProveedor = rol === "PROVEEDOR";
  const [filtros, setFiltros] = useState(EMPTY_FILTROS);
  const [filtrosActivos, setFiltrosActivos] = useState(EMPTY_FILTROS);
  const [filtrosOpen, setFiltrosOpen] = useState(false); // cerrado al entrar
  const [page, setPage] = useState(0);
  const [detalleAtencion, setDetalleAtencion] = useState(null);
  const [confirmAccion, setConfirmAccion] = useState(null);

  const [exportModal, setExportModal] = useState(false);
  const [exportAccion, setExportAccion] = useState(null); // "todos" | "sinAnulados" | null
  const [modal, setModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
  });
  const navigate = useNavigate();

  const { data: pageData, isLoading } = useReportes(filtrosActivos, {
    page,
    size: 10,
  });
  const atenciones = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 0;
  const totalElements = pageData?.totalElements ?? 0;

  // Detectar tipo de proveedor desde los propios datos (sin campo extra en backend)
  const tipoProveedor = useMemo(() => {
    if (!esProveedor || atenciones.length === 0) return null;
    const a = atenciones.find(
      (x) =>
        (x.hotelTotal ?? 0) > 0 ||
        (x.transporteTotal ?? 0) > 0 ||
        (x.restauranteTotal ?? 0) > 0,
    );
    if (!a) return null;
    if ((a.hotelTotal ?? 0) > 0) return "HOTEL";
    if ((a.transporteTotal ?? 0) > 0) return "TRANSPORTE";
    if ((a.restauranteTotal ?? 0) > 0) return "RESTAURANTE";
    return null;
  }, [esProveedor, atenciones]);

  // Visibilidad de columnas por tipo de servicio
  const mostrarHotel = !esProveedor || tipoProveedor === "HOTEL";
  const mostrarTransporte = !esProveedor || tipoProveedor === "TRANSPORTE";
  const mostrarRestaurante = !esProveedor || tipoProveedor === "RESTAURANTE";

  const { data: vuelosPage } = useVuelos({ page: 0, size: 100 });
  const vuelos = vuelosPage?.content ?? [];
  const { data: hotelesPage } = useProveedores({
    tipo: "HOTEL",
    page: 0,
    size: 50,
  });
  const { data: transPage } = useProveedores({
    tipo: "TRANSPORTE",
    page: 0,
    size: 50,
  });
  const { data: restPage } = useProveedores({
    tipo: "RESTAURANTE",
    page: 0,
    size: 50,
  });
  const hoteles = hotelesPage?.content ?? [];
  const transportes = transPage?.content ?? [];
  const restaurantes = restPage?.content ?? [];

  const exportar = useExportarExcel();
  const verificarAnulados = useVerificarAnulados();

  //Anular y restaurar
  const anular = useAnularReporte();
  const restaurar = useRestaurarReporte();
  const puedeAnular =
    rol === "ADMINISTRADOR" || rol === "LIDER_SAASA" || rol === "AGENTE_SAASA";

  const abrirConfirmacion = (a) => {
    setConfirmAccion({ atencion: a, esAnular: a.estado !== "ANULADO" });
  };

  const ejecutarAnularRestaurar = async () => {
    if (!confirmAccion) return;
    const { atencion: a, esAnular } = confirmAccion;
    try {
      if (esAnular) await anular.mutateAsync(a.correlativo);
      else await restaurar.mutateAsync(a.correlativo);
      setConfirmAccion(null);
      setModal({
        open: true,
        type: "success",
        title: esAnular ? "Reporte anulado" : "Reporte restaurado",
        message: `El reporte ${a.correlativo} fue ${esAnular ? "anulado" : "restaurado"} correctamente.`,
      });
    } catch (err) {
      setConfirmAccion(null);
      setModal({
        open: true,
        type: "error",
        title: "No se pudo completar la acción",
        message:
          err.response?.data?.message ??
          "Ocurrió un error al procesar la solicitud.",
      });
    }
  };

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((f) => ({ ...f, [name]: value }));
  };

  const handleBuscar = () => {
    setFiltrosActivos({ ...filtros });
    setPage(0);
  };
  const handleLimpiar = () => {
    setFiltros(EMPTY_FILTROS);
    setFiltrosActivos(EMPTY_FILTROS);
    setPage(0);
  };

  // Badge: cuenta filtros activos (excluyendo los vacíos)
  const filtrosActivosCount = Object.values(filtrosActivos).filter(
    (v) => v !== "",
  ).length;

  /*
  const handleExportar = async () => {
    try {
      await exportar.mutateAsync(filtrosActivos);
    } catch {
      setModal({
        open: true,
        type: "error",
        title: "Error al exportar",
        message: "No se pudo generar el archivo Excel.",
      });
    }
  };
  */

  const handleExportar = async () => {
    try {
      const hayAnulados = await verificarAnulados.mutateAsync(filtrosActivos);
      if (hayAnulados) {
        setExportModal(true);
      } else {
        await ejecutarExportar(true);
      }
    } catch {
      setModal({
        open: true,
        type: "error",
        title: "Error al exportar",
        message: "No se pudo generar el archivo Excel.",
      });
    }
  };

  const ejecutarExportar = async (incluirAnulados) => {
    setExportAccion(incluirAnulados ? "todos" : "sinAnulados");
    try {
      await exportar.mutateAsync({ ...filtrosActivos, incluirAnulados });
      setExportModal(false);
    } catch {
      setExportModal(false);
      setModal({
        open: true,
        type: "error",
        title: "Error al exportar",
        message: "No se pudo generar el archivo Excel.",
      });
    } finally {
      setExportAccion(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <BarChart2 size={24} color="var(--primary)" />
        <div>
          <h1 className={styles.title}>
            {esProveedor
              ? "Mis Servicios Registrados"
              : "Reportes de Atenciones"}
          </h1>
          <p className={styles.sub}>
            {totalElements} registro{totalElements !== 1 ? "s" : ""} encontrado
            {totalElements !== 1 ? "s" : ""}
          </p>
        </div>
        <div className={styles.headerActions}>
          {/* NUEVO: botón Filtro con badge de filtros activos */}
          <button
            className={[
              styles.filterToggleBtn,
              filtrosOpen ? styles.filterToggleActive : "",
            ].join(" ")}
            onClick={() => setFiltrosOpen((v) => !v)}
            aria-label="Mostrar filtros"
          >
            <SlidersHorizontal size={16} />
            <span>Filtro</span>
            {filtrosActivosCount > 0 && (
              <span className={styles.filterBadge}>{filtrosActivosCount}</span>
            )}
          </button>
          {/* Exportar Excel: solo para roles internos */}
          {!esProveedor && (
            <Button
              onClick={handleExportar}
              loading={verificarAnulados.isPending || exportar.isPending}
              variant="ghost"
              size="sm"
            >
              <Download size={16} /> Exportar Excel
            </Button>
          )}
        </div>
      </div>

      {/* Banner informativo para proveedor */}
      {esProveedor && (
        <div className={styles.proveedorBanner}>
          <Info size={16} />
          <span>
            Solo estás viendo los registros correspondientes a tus servicios.
            Los datos de otros proveedores no son visibles.
          </span>
        </div>
      )}

      {/* ── Panel de filtros colapsable ── */}
      <div
        className={[
          styles.filterPanel,
          filtrosOpen ? styles.filterPanelOpen : "",
        ].join(" ")}
      >
        <div className={styles.filterGrid}>
          {/* Correlativo */}
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Correlativo</label>
            <div className={styles.filterInputWrap}>
              <Search size={14} className={styles.filterInputIcon} />
              <input
                name="correlativo"
                value={filtros.correlativo}
                onChange={handleFiltroChange}
                placeholder="SGC-000001001"
                className={styles.filterInput}
              />
            </div>
          </div>

          {/* PNR */}
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>PNR</label>
            <div className={styles.filterInputWrap}>
              <Search size={14} className={styles.filterInputIcon} />
              <input
                name="pnr"
                value={filtros.pnr}
                onChange={handleFiltroChange}
                placeholder="ABC123"
                className={styles.filterInput}
              />
            </div>
          </div>

          {/* Pasajero */}
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Pasajero</label>
            <div className={styles.filterInputWrap}>
              <Search size={14} className={styles.filterInputIcon} />
              <input
                name="nombrePasajero"
                value={filtros.nombrePasajero}
                onChange={handleFiltroChange}
                placeholder="Nombre del pasajero"
                className={styles.filterInput}
              />
            </div>
          </div>

          {/* Vuelo */}
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Vuelo</label>
            <select
              name="vueloId"
              value={filtros.vueloId}
              onChange={handleFiltroChange}
              className={styles.filterSelect}
            >
              <option value="">Todos</option>
              {vuelos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.codigoVuelo} | {v.origen}→{v.destino}
                </option>
              ))}
            </select>
          </div>

          {/* Hotel / Transporte / Restaurante: solo roles internos */}
          {!esProveedor && (
            <>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>Hotel</label>
                <select
                  name="hotelId"
                  value={filtros.hotelId}
                  onChange={handleFiltroChange}
                  className={styles.filterSelect}
                >
                  <option value="">Todos</option>
                  {hoteles.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>Transporte</label>
                <select
                  name="transporteId"
                  value={filtros.transporteId}
                  onChange={handleFiltroChange}
                  className={styles.filterSelect}
                >
                  <option value="">Todos</option>
                  {transportes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>Restaurante</label>
                <select
                  name="restauranteId"
                  value={filtros.restauranteId}
                  onChange={handleFiltroChange}
                  className={styles.filterSelect}
                >
                  <option value="">Todos</option>
                  {restaurantes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Fecha desde */}
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Fecha desde</label>
            <input
              type="date"
              name="fechaDesde"
              value={filtros.fechaDesde}
              onChange={handleFiltroChange}
              className={styles.filterInputPlain}
            />
          </div>

          {/* Fecha hasta */}
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Fecha hasta</label>
            <input
              type="date"
              name="fechaHasta"
              value={filtros.fechaHasta}
              onChange={handleFiltroChange}
              className={styles.filterInputPlain}
            />
          </div>
        </div>

        {/* Acciones del filtro */}
        <div className={styles.filterActions}>
          <button className={styles.filterClearBtn} onClick={handleLimpiar}>
            <X size={14} /> Limpiar
          </button>
          <button className={styles.filterSearchBtn} onClick={handleBuscar}>
            <Search size={14} /> Buscar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className={styles.tableWrap}>
        {isLoading ? (
          <div className={styles.loadingRow}>Cargando...</div>
        ) : atenciones.length === 0 ? (
          <div className={styles.emptyRow}>
            No se encontraron registros con los filtros aplicados.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>#</th>
                <th className={styles.th}>Correlativo</th>
                <th className={styles.th}>PNR</th>
                <th className={styles.th}>F. Creación</th>
                {!esProveedor && (
                  <th className={styles.th}>F. Actualización</th>
                )}
                {!esProveedor && <th className={styles.th}>Generado por</th>}
                {!esProveedor && <th className={styles.th}>Rol</th>}
                <th className={styles.th}>Fecha Vuelo</th>
                <th className={styles.th}>Pasajero</th>
                <th className={styles.th}>Vuelo</th>
                {mostrarHotel && <th className={styles.th}>Hotel</th>}
                {mostrarHotel && <th className={styles.th}>Hotel S/</th>}
                {mostrarTransporte && <th className={styles.th}>Transporte</th>}
                {mostrarTransporte && (
                  <th className={styles.th}>Transporte S/</th>
                )}
                {mostrarRestaurante && (
                  <th className={styles.th}>Restaurante</th>
                )}
                {mostrarRestaurante && (
                  <th className={styles.th}>Restaurante S/</th>
                )}
                <th className={styles.th}>
                  {esProveedor ? "TOTAL MIS SERVICIOS S/" : "TOTAL S/"}
                </th>
                <th className={styles.th}>Estado</th>
                <th className={styles.th}>Detalle</th>
                {puedeAnular && <th className={styles.th}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {atenciones.map((a, i) => (
                <tr key={a.correlativo ?? i} className={styles.tr}>
                  <td className={styles.td}>{page * 10 + i + 1}</td>
                  <td className={styles.td}>
                    <span className={styles.correlativo}>
                      {a.correlativo ?? "—"}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.pnrBadge}>{a.pnr}</span>
                  </td>
                  <td className={styles.td}>
                    {a.createdAt ? formatearFecha(a.createdAt) : "—"}
                  </td>
                  {!esProveedor && (
                    <td className={styles.td}>
                      {a.updatedAt ? formatearFecha(a.updatedAt) : "—"}
                    </td>
                  )}
                  {!esProveedor && (
                    <td className={styles.td}>{a.generadoPor ?? "—"}</td>
                  )}
                  {!esProveedor && (
                    <td className={styles.td}>
                      {a.rolGenerador && (
                        <span className={styles.rolBadge}>
                          {a.rolGenerador === "ADMINISTRADOR"
                            ? "Admin"
                            : a.rolGenerador === "LIDER_SAASA"
                              ? "Líder"
                              : a.rolGenerador === "AGENTE_SAASA"
                                ? "Agente"
                                : a.rolGenerador === "LINEA_AEREA"
                                  ? "Línea Aérea"
                                  : a.rolGenerador === "PROVEEDOR"
                                    ? "Proveedor"
                                    : a.rolGenerador}
                        </span>
                      )}
                    </td>
                  )}
                  <td className={styles.td}>
                    {a.fechaVuelo?.slice(0, 10) ?? "—"}
                  </td>
                  <td className={styles.td}>
                    {a.pasajero ?? "—"}
                    {a.grupoId && (
                      <span
                        className={[
                          styles.grupalBadge,
                          a.esTitularGrupo ? styles.grupalBadgeTitular : "",
                        ].join(" ")}
                        title={
                          a.esTitularGrupo
                            ? "Titular: generó el voucher para todo el grupo"
                            : `Grupo de ${a.nombreTitularGrupo ?? "—"}`
                        }
                      >
                        GRUPAL
                        {a.esTitularGrupo
                          ? " · TITULAR"
                          : ` · ${a.nombreTitularGrupo ?? ""}`}
                      </span>
                    )}
                  </td>
                  <td className={styles.td}>{a.vuelo ?? "—"}</td>
                  {mostrarHotel && (
                    <td className={styles.td}>{a.hotel ?? "—"}</td>
                  )}
                  {mostrarHotel && (
                    <td className={styles.td}>
                      {formatearMonto(a.hotelTotal)}
                    </td>
                  )}
                  {mostrarTransporte && (
                    <td className={styles.td}>{a.transporte ?? "—"}</td>
                  )}
                  {mostrarTransporte && (
                    <td className={styles.td}>
                      {formatearMonto(a.transporteTotal)}
                    </td>
                  )}
                  {mostrarRestaurante && (
                    <td className={styles.td}>{a.restaurante ?? "—"}</td>
                  )}
                  {mostrarRestaurante && (
                    <td className={styles.td}>
                      {formatearMonto(a.restauranteTotal)}
                    </td>
                  )}
                  <td className={styles.td}>
                    <strong
                      className={
                        esProveedor ? styles.totalProveedor : undefined
                      }
                    >
                      {formatearMonto(a.total)}
                    </strong>
                  </td>
                  <td className={styles.td}>
                    <Badge
                      label={a.estado ?? "ACTIVO"}
                      variant={a.estado === "ANULADO" ? "danger" : "success"}
                    />
                  </td>

                  <td className={styles.td}>
                    <button
                      className={styles.detailBtn}
                      onClick={() =>
                        navigate(`/reportes/detalle/${a.correlativo}`)
                      }
                      aria-label="Ver detalle"
                      disabled={a.estado === "ANULADO"}
                      title={
                        a.estado === "ANULADO"
                          ? "No disponible: el reporte está anulado"
                          : "Ver detalle"
                      }
                    >
                      detalle
                    </button>
                  </td>
                  {puedeAnular && (
                    <td className={styles.td}>
                      {a.grupoId && !a.esTitularGrupo ? (
                        <button
                          className={styles.anularBtn}
                          disabled
                          title={`Este pasajero comparte el voucher grupal — anula/restaura desde el titular (${a.nombreTitularGrupo ?? "titular del grupo"})`}
                        >
                          {a.estado === "ANULADO" ? "restaurar" : "anular"}
                        </button>
                      ) : (
                        <button
                          className={
                            a.estado === "ANULADO"
                              ? styles.restaurarBtn
                              : styles.anularBtn
                          }
                          onClick={() => abrirConfirmacion(a)}
                          aria-label={
                            a.estado === "ANULADO" ? "Restaurar" : "Anular"
                          }
                        >
                          {a.estado === "ANULADO" ? "restaurar" : "anular"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
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
            Página {page + 1} de {totalPages}
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

      {/* Modal detalle */}
      <Modal
        open={!!detalleAtencion}
        onClose={() => setDetalleAtencion(null)}
        title="Detalle de atención"
        size="lg"
      >
        {detalleAtencion && (
          <div className={styles.detalle}>
            <div className={styles.detalleGrid}>
              <div>
                <strong>Correlativo:</strong>{" "}
                {detalleAtencion.numeroCorrelativo ??
                  detalleAtencion.correlativo}
              </div>
              <div>
                <strong>PNR:</strong> {detalleAtencion.pnr}
              </div>
              <div>
                <strong>Pasajero:</strong> {detalleAtencion.apellido}/
                {detalleAtencion.nombre}
              </div>
              <div>
                <strong>Correo:</strong> {detalleAtencion.correo ?? "—"}
              </div>
              <div>
                <strong>Vuelo:</strong> {detalleAtencion.codigoVuelo ?? "—"}
              </div>
              <div>
                <strong>Estado:</strong>{" "}
                <Badge
                  label={detalleAtencion.estado ?? "ACTIVO"}
                  variant={
                    detalleAtencion.estado === "ANULADO" ? "danger" : "success"
                  }
                />
              </div>
            </div>
            <h4 className={styles.desgloseTitle}>Desglose de costos</h4>
            <table className={styles.desgloseTable}>
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Hotel</td>
                  <td>{formatearMonto(detalleAtencion.montoHotel)}</td>
                </tr>
                <tr>
                  <td>Transporte</td>
                  <td>{formatearMonto(detalleAtencion.montoTransporte)}</td>
                </tr>
                <tr>
                  <td>Restaurante</td>
                  <td>{formatearMonto(detalleAtencion.montoRestaurante)}</td>
                </tr>
                <tr className={styles.totalRow}>
                  <td>
                    <strong>TOTAL</strong>
                  </td>
                  <td>
                    <strong>
                      {formatearMonto(detalleAtencion.montoTotal)}
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <Modal
        open={!!confirmAccion}
        onClose={() => {
          if (!anular.isPending && !restaurar.isPending) setConfirmAccion(null);
        }}
        title={confirmAccion?.esAnular ? "Anular reporte" : "Restaurar reporte"}
        size="sm"
      >
        {confirmAccion && (
          <div className={styles.confirmBody}>
            <p className={styles.confirmMessage}>
              ¿Seguro que deseas{" "}
              {confirmAccion.esAnular ? "anular" : "restaurar"} el reporte{" "}
              <strong>{confirmAccion.atencion.correlativo}</strong>?
            </p>
            <div className={styles.confirmActions}>
              <Button
                variant="ghost"
                onClick={() => setConfirmAccion(null)}
                disabled={anular.isPending || restaurar.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant={confirmAccion.esAnular ? "danger" : "primary"}
                onClick={ejecutarAnularRestaurar}
                loading={anular.isPending || restaurar.isPending}
              >
                {anular.isPending || restaurar.isPending
                  ? ""
                  : confirmAccion.esAnular
                    ? "Sí, anular"
                    : "Sí, restaurar"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={exportModal}
        onClose={() => {
          if (!exportar.isPending) setExportModal(false);
        }}
        title="Exportar reporte a Excel"
        size="sm"
      >
        <div className={styles.confirmBody}>
          <p className={styles.confirmMessage}>
            Este reporte contiene registros <strong>anulados</strong>. ¿Deseas
            descargar el reporte con todos los registros o prefieres descargarlo
            sin los registros anulados?
          </p>
          <div className={styles.confirmActions}>
            <Button
              variant="ghost"
              onClick={() => ejecutarExportar(false)}
              disabled={exportar.isPending}
              loading={exportAccion === "sinAnulados" && exportar.isPending}
            >
              {exportAccion === "sinAnulados" && exportar.isPending
                ? ""
                : "Sin anulados"}
            </Button>
            <Button
              variant="primary"
              onClick={() => ejecutarExportar(true)}
              disabled={exportar.isPending}
              loading={exportAccion === "todos" && exportar.isPending}
            >
              {exportAccion === "todos" && exportar.isPending
                ? ""
                : "Todos los registros"}
            </Button>
          </div>
        </div>
      </Modal>

      <InfoModal
        open={modal.open}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />
    </div>
  );
}
