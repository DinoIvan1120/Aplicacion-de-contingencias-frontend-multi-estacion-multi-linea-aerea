import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Upload,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send, // ← NUEVO — botón "Confirmar y Cargar" del modal
  Mail, // ← NUEVO — sección de correos CC
  Plus, // ← NUEVO — agregar correo CC manual
  Trash2, // ← NUEVO — quitar correo CC
  PenTool, // ← NUEVO — firma digital de conformidad
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRegistrosHoy } from "../../hooks/useRegistrosDiarios";
import { useDisponibilidad } from "../../hooks/useAtenciones";
import { useAerolineasCorreo } from "../../hooks/useAerolineasCorreo"; // ← NUEVO
import {
  useDescargarPlantillaRestaurante,
  useCargarRestauranteExcel,
  useEstadoLoteCargaMasiva,
  usePrevisualizarRestauranteExcel,
} from "../../hooks/useCargaMasivaAtenciones";
import Button from "../../components/ui/Button.jsx";
import Select from "../../components/ui/Select.jsx";
import Badge from "../../components/ui/Badge.jsx";
import InfoModal from "../../components/ui/InfoModal.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import Modal from "../../components/ui/Modal.jsx";
import styles from "./AgenteCargaMasivaPage.module.css";
// ← NUEVO — reutilizamos el CSS del modal "Confirmar y Enviar Voucher" de
// la vista individual del agente (correos CC + firma) para no duplicar
// ~200 líneas de estilos; misma lógica, mismo look & feel.
import atencionStyles from "../agente/AgenteAtencionPage.module.css";

const BADGE_DETALLE = {
  PENDIENTE: "warning",
  ENVIADO: "success",
  ERROR: "danger",
};

const BADGE_LOTE = {
  CREANDO_ATENCIONES: "warning",
  ERROR_CREACION: "danger",
  PROCESANDO: "warning",
  COMPLETADO: "success",
  COMPLETADO_CON_ERRORES: "warning",
  ERROR: "danger",
};

// Estados en los que el lote sigue trabajando en background (fase 1 o
// fase 2) — se usa para el spinner y para el título dinámico de la
// sección de progreso.
const ESTADOS_LOTE_EN_PROGRESO = ["CREANDO_ATENCIONES", "PROCESANDO"];

export default function AgenteCargaMasivaPage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const idempotencyKeyRef = useRef(null);

  const [registroId, setRegistroId] = useState("");
  const [vueloRecursoId, setVueloRecursoId] = useState("");
  const [loteId, setLoteId] = useState(null);
  const [resultadoModal, setResultadoModal] = useState({ open: false });
  // NUEVO — modal de "procesando" que se abre apenas se confirma la carga
  // (en vez de que el agente tenga que bajar a buscar la barra de
  // progreso). Se cierra solo cuando el lote llega a un estado terminal.
  const [modalProgresoAbierto, setModalProgresoAbierto] = useState(false);
  // NUEVO — errores de validación de fase 0 (filas del Excel que ni
  // siquiera se intentaron procesar). Se guardan acá porque el polling de
  // LoteEstadoResponse no los trae, y los necesitamos para el modal final.
  const [erroresValidacionCarga, setErroresValidacionCarga] = useState([]);

  // ── NUEVO: modal de confirmación (correos CC + firma de conformidad)
  // previo a la carga masiva — misma lógica que handleConfirmarFirmaYEnviar
  // en la vista individual del agente, aplicada a TODO el lote. ──
  const [confirmCarga, setConfirmCarga] = useState({
    open: false,
    archivo: null,
  });
  const [correosCc, setCorreosCc] = useState([]); // [{ correo, origen, activo }]
  const [nuevoCorreoCc, setNuevoCorreoCc] = useState("");
  const [firmaTexto, setFirmaTexto] = useState("");
  const [firmado, setFirmado] = useState(false);

  // ── NUEVO: previsualización (Opción B) — lo que el backend PARSEÓ Y
  // AGRUPÓ realmente del Excel, para mostrarlo en el modal antes de que
  // el agente firme. null = aún no se pidió / se está pidiendo de nuevo.
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState(null);

  const { data: registros = [], isLoading: cargandoRegistros } =
    useRegistrosHoy();
  const { data: disp } = useDisponibilidad(registroId || null);
  const { data: aerolineasCorreoPage } = useAerolineasCorreo({
    estado: 1,
    page: 0,
    size: 200,
  });
  const aerolineasCorreoList = aerolineasCorreoPage?.content ?? [];

  const descargarPlantilla = useDescargarPlantillaRestaurante();
  const cargarExcel = useCargarRestauranteExcel();
  const previsualizar = usePrevisualizarRestauranteExcel(); // ← NUEVO
  const { data: lote } = useEstadoLoteCargaMasiva(loteId);

  // NUEVO — apenas el lote sale de un estado EN PROGRESO (terminó bien o
  // mal, en cualquiera de las dos fases), cerramos el modal de "procesando"
  // y mostramos el resultado REAL (no el mensaje optimista que antes se
  // armaba al momento de subir el archivo, antes de saber si algo iba a
  // fallar en el camino).
  useEffect(() => {
    if (!lote || ESTADOS_LOTE_EN_PROGRESO.includes(lote.estado)) return;

    setModalProgresoAbierto(false);

    const sufijoValidacion =
      erroresValidacionCarga.length > 0
        ? ` Además, se omitieron ${erroresValidacionCarga.length} fila(s) del Excel por errores de validación — revisa el detalle abajo.`
        : "";

    if (lote.estado === "COMPLETADO") {
      setResultadoModal({
        open: true,
        type: "success",
        title: "Carga completada",
        message: `${lote.exitosos} de ${lote.totalPasajeros} pasajero(s) fueron registrados y sus vouchers enviados correctamente.${sufijoValidacion}`,
        erroresValidacion: erroresValidacionCarga,
      });
    } else if (lote.estado === "COMPLETADO_CON_ERRORES") {
      setResultadoModal({
        open: true,
        type: "warning",
        title: "Carga completada con observaciones",
        message: `${lote.exitosos} de ${lote.totalPasajeros} pasajero(s) se procesaron correctamente. ${lote.fallidos} tuvieron un error — revisa el detalle abajo.${sufijoValidacion}`,
        erroresValidacion: erroresValidacionCarga,
      });
    } else if (lote.estado === "ERROR_CREACION") {
      setResultadoModal({
        open: true,
        type: "error",
        title: "No se pudo registrar ningún pasajero",
        message: `Ninguno de los ${lote.totalPasajeros} pasajero(s) pudo registrarse. Revisa el detalle abajo o inténtalo de nuevo.${sufijoValidacion}`,
        erroresValidacion: erroresValidacionCarga,
      });
    } else if (lote.estado === "ERROR") {
      setResultadoModal({
        open: true,
        type: "error",
        title: "La carga terminó con errores",
        message: `Ningún voucher pudo enviarse correctamente. Revisa el detalle abajo o inténtalo de nuevo.${sufijoValidacion}`,
        erroresValidacion: erroresValidacionCarga,
      });
    }
    // Solo debe reaccionar a un CAMBIO de estado (la transición a terminal),
    // no a cada refetch del polling con el mismo estado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lote?.estado]);

  const opcionesRegistro = useMemo(
    () =>
      registros.map((r) => ({
        value: String(r.id),
        label: `${r.vueloItinerario?.aerolinea ?? ""} ${r.vueloItinerario?.codigoVuelo ?? ""} — ${r.vueloItinerario?.origen ?? ""}/${r.vueloItinerario?.destino ?? ""}`,
      })),
    [registros],
  );

  const restaurantesDisponibles = disp?.restaurantes ?? [];
  const opcionesRestaurante = useMemo(
    () =>
      restaurantesDisponibles.map((r) => ({
        value: String(r.vueloRecursoId),
        label: `${r.proveedorNombre} — ${r.capacidadDisponible}/${r.capacidadTotal} disponibles`,
      })),
    [restaurantesDisponibles],
  );

  // ── NUEVO: recolecta automáticamente el correo de la aerolínea del
  // vuelo seleccionado y del proveedor del restaurante elegido, igual
  // que construirCorreosAutomaticos() en la vista individual del agente,
  // para precargarlos como CC (editable) en el modal de confirmación. ──
  const construirCorreosAutomaticosCarga = () => {
    const mapa = new Map(); // correo(lower) -> { correo, origen }

    const registro = registros.find((r) => String(r.id) === String(registroId));
    const aerolineaNombre = (registro?.vueloItinerario?.aerolinea || "")
      .trim()
      .toLowerCase();
    if (aerolineaNombre) {
      const match = aerolineasCorreoList.find(
        (a) => (a.aerolinea || "").trim().toLowerCase() === aerolineaNombre,
      );
      if (match?.correo) {
        mapa.set(match.correo.trim().toLowerCase(), {
          correo: match.correo.trim(),
          origen: `Aerolínea (${match.aerolinea})`,
        });
      }
    }

    const restaurante = restaurantesDisponibles.find(
      (r) => String(r.vueloRecursoId) === String(vueloRecursoId),
    );
    if (restaurante?.proveedorCorreo) {
      mapa.set(restaurante.proveedorCorreo.trim().toLowerCase(), {
        correo: restaurante.proveedorCorreo.trim(),
        origen: `Restaurante${restaurante.proveedorNombre ? ` (${restaurante.proveedorNombre})` : ""}`,
      });
    }

    return Array.from(mapa.values()).map((x) => ({ ...x, activo: true }));
  };

  const handleFirmar = () => {
    if (!firmaTexto.trim()) return;
    setFirmado(true);
  };

  const handleCambiarFirmaTexto = (valor) => {
    setFirmaTexto(valor);
    if (firmado) setFirmado(false); // si edita después de firmar, resetea el check
  };

  const handleToggleCorreoCc = (correo) => {
    setCorreosCc((prev) =>
      prev.map((c) => (c.correo === correo ? { ...c, activo: !c.activo } : c)),
    );
  };

  const handleEliminarCorreoCc = (correo) => {
    setCorreosCc((prev) => prev.filter((c) => c.correo !== correo));
  };

  const handleAgregarCorreoCc = () => {
    const correo = nuevoCorreoCc.trim();
    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return;
    setCorreosCc((prev) => {
      if (prev.some((c) => c.correo.toLowerCase() === correo.toLowerCase()))
        return prev;
      return [
        ...prev,
        { correo, origen: "Agregado manualmente", activo: true },
      ];
    });
    setNuevoCorreoCc("");
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setResultadoModal({
        open: true,
        type: "error",
        title: "Formato inválido",
        message: "Solo se aceptan archivos .xlsx",
      });
      return;
    }
    if (!registroId || !vueloRecursoId) {
      setResultadoModal({
        open: true,
        type: "warning",
        title: "Faltan datos",
        message:
          "Selecciona primero el vuelo y el restaurante antes de subir el archivo.",
      });
      return;
    }

    // ── NUEVO: en vez de subir directo, abre el modal de confirmación
    // (correos CC + firma de conformidad) — misma lógica que
    // handleAbrirModalEnvio en la vista individual del agente. La carga
    // real ocurre en handleConfirmarYCargar. ──
    idempotencyKeyRef.current = crypto.randomUUID();
    setCorreosCc(construirCorreosAutomaticosCarga());
    setNuevoCorreoCc("");
    setFirmaTexto("");
    setFirmado(false);
    setConfirmCarga({ open: true, archivo: file });
    if (fileRef.current) fileRef.current.value = "";

    // ── NUEVO (Opción B): pide al backend que PARSEE y AGRUPE el Excel de
    // verdad (sin crear nada) para poder mostrar en el modal a quién y con
    // qué datos se va a crear el voucher, antes de que el agente firme. ──
    setPreview(null);
    setPreviewError(null);
    previsualizar.mutate(
      { archivo: file, registroVueloDiarioId: registroId, vueloRecursoId },
      {
        onSuccess: ({ data }) => setPreview(data.data),
        onError: (err) =>
          setPreviewError(
            err?.response?.data?.message ||
              "No se pudo leer el archivo para previsualizarlo.",
          ),
      },
    );
  };

  const handleConfirmarYCargar = () => {
    if (!firmado || !firmaTexto.trim() || !confirmCarga.archivo) return;
    // ── NUEVO: no permitir confirmar mientras el preview sigue cargando,
    // falló, o no hay ningún grupo válido para procesar. ──
    if (previsualizar.isPending || previewError) return;
    if (preview && preview.totalGrupos === 0) return;
    const archivo = confirmCarga.archivo;
    const ccDestinos = correosCc.filter((c) => c.activo).map((c) => c.correo);
    const firmaPasajero = firmaTexto.trim();

    setConfirmCarga({ open: false, archivo: null });
    setPreview(null);
    setPreviewError(null);

    cargarExcel.mutate(
      {
        archivo,
        registroVueloDiarioId: registroId,
        vueloRecursoId,
        ccDestinos,
        firmaPasajero,
        idempotencyKey: idempotencyKeyRef.current,
      },
      {
        onSuccess: ({ data }) => {
          const r = data.data;
          setLoteId(r.loteId);
          setErroresValidacionCarga(r.erroresValidacion ?? []);
          // NUEVO — abre el modal de "procesando" de inmediato; el
          // useEffect de arriba lo cierra y muestra el resultado final
          // solo cuando el lote realmente termina (ambas fases).
          setModalProgresoAbierto(true);
        },
        onError: (err) => {
          setResultadoModal({
            open: true,
            type: "error",
            title: "No se pudo procesar el archivo",
            message:
              err?.response?.data?.message ||
              "Ocurrió un error al procesar la carga masiva. Revisa el archivo e inténtalo de nuevo.",
          });
        },
      },
    );
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const progresoPct = lote?.totalPasajeros
    ? Math.round((lote.procesados / lote.totalPasajeros) * 100)
    : 0;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ChevronLeft size={18} /> Volver
        </button>
        <h1 className={styles.title}>Carga masiva — Restaurante</h1>
      </div>
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>
          1. Selecciona el vuelo y el restaurante
        </h2>
        <div className={styles.selectRow}>
          <Select
            label="Vuelo (registro de hoy)"
            name="registro"
            value={registroId}
            onChange={(e) => {
              setRegistroId(e.target.value);
              setVueloRecursoId("");
            }}
            options={opcionesRegistro}
            placeholder={
              cargandoRegistros ? "Cargando..." : "Seleccione un vuelo"
            }
            required
          />
          <Select
            label="Restaurante habilitado"
            name="restaurante"
            value={vueloRecursoId}
            onChange={(e) => setVueloRecursoId(e.target.value)}
            options={opcionesRestaurante}
            placeholder={
              !registroId
                ? "Seleccione primero un vuelo"
                : opcionesRestaurante.length === 0
                  ? "Sin restaurantes habilitados para este vuelo"
                  : "Seleccione un restaurante"
            }
            disabled={!registroId}
            required
          />
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionTitle}>
            2. Descarga la plantilla y súbela llena
          </h2>
          <Button
            variant="secondary"
            onClick={() => descargarPlantilla.mutate()}
            loading={descargarPlantilla.isPending}
          >
            <Download size={16} /> Descargar plantilla
          </Button>
        </div>

        <div
          className={[styles.dropZone, dragging ? styles.dragOver : ""].join(
            " ",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <FileSpreadsheet
            size={44}
            color={dragging ? "var(--success)" : "var(--primary)"}
          />
          <p className={styles.dropTitle}>Arrastra el archivo Excel aquí</p>
          <p className={styles.dropSub}>o haz clic para seleccionar</p>
          <span className={styles.dropFormat}>
            Formato: .xlsx — Nombres, Apellidos, PNR, Correo, Celular
            (opcional), Cant. Pax Restaurante, Desayuno, Almuerzo, Cena
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
        {cargarExcel.isPending && (
          <div className={styles.uploadingBar}>
            <Upload size={16} /> Procesando archivo y registrando pasajeros...
          </div>
        )}
      </div>
      {lote && (
        <div className={styles.card}>
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.sectionTitle}>
              {lote.estado === "CREANDO_ATENCIONES"
                ? "3. Progreso del registro de pasajeros"
                : "3. Progreso del envío de vouchers"}
            </h2>
            <Badge
              label={lote.estado.replaceAll("_", " ")}
              variant={BADGE_LOTE[lote.estado] ?? "neutral"}
            />
          </div>

          <div className={styles.progressWrap}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progresoPct}%` }}
              />
            </div>
            <span className={styles.progressLabel}>
              {lote.procesados} / {lote.totalPasajeros} procesados
              {ESTADOS_LOTE_EN_PROGRESO.includes(lote.estado) && (
                <RefreshCw size={13} className={styles.spinIcon} />
              )}
            </span>
          </div>

          <div className={styles.statsRow}>
            <span className={styles.statOk}>
              <CheckCircle2 size={15} /> {lote.exitosos} enviados
            </span>
            <span className={styles.statErr}>
              <AlertCircle size={15} /> {lote.fallidos} con error
            </span>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {[
                    "Correlativo",
                    "PNR",
                    "Pasajero",
                    "Titular",
                    "Estado",
                    "Detalle",
                  ].map((h) => (
                    <th key={h} className={styles.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lote.detalle.map((d) => (
                  <tr key={d.correlativo}>
                    <td className={styles.td}>{d.correlativo}</td>
                    <td className={styles.td}>{d.pnr}</td>
                    <td className={styles.td}>{d.nombreCompleto}</td>
                    <td className={styles.td}>{d.titular ? "Sí" : "—"}</td>
                    <td className={styles.td}>
                      <Badge
                        label={d.estado}
                        variant={BADGE_DETALLE[d.estado] ?? "neutral"}
                      />
                    </td>
                    <td
                      className={[styles.td, styles.tdClamp].join(" ")}
                      title={d.mensajeError ?? ""}
                    >
                      {d.mensajeError ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vista de tarjetas para móvil — mismo contenido que la tabla
              de arriba, sin scroll horizontal (ver CSS @680px). */}
          <div className={styles.cardList}>
            {lote.detalle.map((d) => (
              <div className={styles.cardItem} key={d.correlativo}>
                <div className={styles.cardItemHeader}>
                  <span className={styles.cardItemTitle}>
                    #{d.correlativo} — {d.pnr}
                  </span>
                  <Badge
                    label={d.estado}
                    variant={BADGE_DETALLE[d.estado] ?? "neutral"}
                  />
                </div>
                <div className={styles.cardRow}>
                  <span className={styles.cardRowLabel}>Pasajero</span>
                  <span className={styles.cardRowValue}>
                    {d.nombreCompleto}
                  </span>
                </div>
                <div className={styles.cardRow}>
                  <span className={styles.cardRowLabel}>Titular</span>
                  <span className={styles.cardRowValue}>
                    {d.titular ? "Sí" : "—"}
                  </span>
                </div>
                {d.mensajeError && (
                  <div className={styles.cardIntegrantes}>{d.mensajeError}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── NUEVO: Modal de confirmación previo a la carga masiva
          (correos CC + firma de conformidad) — misma lógica y estilos
          que "Confirmar y Enviar Voucher" en la vista individual del
          agente, aplicada a TODO el lote. ─── */}
      {confirmCarga.open && (
        <div className={atencionStyles.emailModalOverlay}>
          <div
            className={[
              atencionStyles.emailModalBox,
              atencionStyles.confirmEnvioBox,
            ].join(" ")}
          >
            <h3 className={atencionStyles.emailModalTitle}>
              <Send size={17} /> Confirmar y Cargar
            </h3>
            <p className={atencionStyles.emailModalDesc}>
              Revisa los datos antes de cargar el archivo{" "}
              <strong>{confirmCarga.archivo?.name}</strong>. Esta firma de
              conformidad y estos correos en copia se aplicarán a{" "}
              <strong>todos los pasajeros</strong> del Excel.
            </p>

            {/* ── NUEVO: previsualización real de lo que el backend leyó
                del Excel (parseo + agrupación por PNR), para verificar los
                pasajeros ANTES de firmar. ── */}
            <div className={atencionStyles.confirmSeccion}>
              <label className={atencionStyles.confirmLabel}>
                <FileSpreadsheet size={14} /> Pasajeros detectados en el archivo
              </label>

              {previsualizar.isPending && (
                <p className={atencionStyles.confirmCcVacio}>
                  <RefreshCw size={13} className={styles.spinIcon} /> Leyendo el
                  archivo...
                </p>
              )}

              {!previsualizar.isPending && previewError && (
                <div className={styles.errorList}>
                  <p className={styles.errorListTitle}>
                    No se pudo previsualizar el archivo
                  </p>
                  <p>{previewError}</p>
                </div>
              )}

              {!previsualizar.isPending && !previewError && preview && (
                <>
                  <div className={styles.statsRow}>
                    <span className={styles.statOk}>
                      <CheckCircle2 size={14} /> {preview.totalPasajeros}{" "}
                      pasajero(s) en {preview.totalGrupos} grupo(s)
                    </span>
                    {preview.excedeCapacidad && (
                      <span className={styles.statErr}>
                        <AlertCircle size={14} /> Excede la capacidad disponible
                        ({preview.totalPaxSolicitado} pax solicitados /{" "}
                        {preview.capacidadDisponible} disponibles)
                      </span>
                    )}
                  </div>

                  {preview.totalGrupos > 0 && (
                    <>
                      {/* Tabla — desktop/tablet. Contenida (alto máximo +
                          scroll propio + encabezado sticky) y con la
                          columna "Integrantes" recortada con "…" (el
                          nombre completo aparece al pasar el mouse) para
                          que un grupo grande no desarme el ancho de las
                          demás columnas. */}
                      <div className={styles.tableWrap}>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th className={styles.th}>PNR</th>
                              <th className={styles.th}>Titular</th>
                              <th className={styles.th}>Correo</th>
                              <th className={styles.th}>Integrantes</th>
                              <th className={styles.th}>Pax rest.</th>
                              <th className={styles.th}>D / A / C</th>
                            </tr>
                          </thead>
                          <tbody>
                            {preview.grupos.map((g) => {
                              const listaIntegrantes =
                                g.integrantes > 1
                                  ? g.nombresIntegrantes.join(", ")
                                  : "1 (individual)";
                              return (
                                <tr key={g.pnr}>
                                  <td className={styles.td}>{g.pnr}</td>
                                  <td
                                    className={[styles.td, styles.tdClamp].join(
                                      " ",
                                    )}
                                    title={g.nombreTitular}
                                  >
                                    {g.nombreTitular}
                                  </td>
                                  <td
                                    className={[styles.td, styles.tdClamp].join(
                                      " ",
                                    )}
                                    title={g.correoTitular}
                                  >
                                    {g.correoTitular}
                                  </td>
                                  <td
                                    className={[styles.td, styles.tdClamp].join(
                                      " ",
                                    )}
                                    title={listaIntegrantes}
                                  >
                                    {listaIntegrantes}
                                  </td>
                                  <td className={styles.td}>
                                    {g.paxRestaurante}
                                  </td>
                                  <td className={styles.td}>
                                    {g.desayuno ? "D" : "—"}
                                    {g.almuerzo ? " A" : ""}
                                    {g.cena ? " C" : ""}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Tarjetas — móvil. Evita el scroll horizontal:
                          cada grupo/PNR es una tarjeta con sus datos
                          apilados verticalmente. */}
                      <div className={styles.cardList}>
                        {preview.grupos.map((g) => (
                          <div className={styles.cardItem} key={g.pnr}>
                            <div className={styles.cardItemHeader}>
                              <span className={styles.cardItemTitle}>
                                {g.pnr}
                              </span>
                              <span className={styles.cardRowValue}>
                                {g.paxRestaurante} pax rest.
                              </span>
                            </div>
                            <div className={styles.cardRow}>
                              <span className={styles.cardRowLabel}>
                                Titular
                              </span>
                              <span className={styles.cardRowValue}>
                                {g.nombreTitular}
                              </span>
                            </div>
                            <div className={styles.cardRow}>
                              <span className={styles.cardRowLabel}>
                                Correo
                              </span>
                              <span className={styles.cardRowValue}>
                                {g.correoTitular}
                              </span>
                            </div>
                            <div className={styles.cardRow}>
                              <span className={styles.cardRowLabel}>
                                Desayuno / Almuerzo / Cena
                              </span>
                              <span className={styles.cardRowValue}>
                                {g.desayuno ? "D" : "—"}
                                {g.almuerzo ? " A" : ""}
                                {g.cena ? " C" : ""}
                              </span>
                            </div>
                            {g.integrantes > 1 && (
                              <div className={styles.cardIntegrantes}>
                                <strong>{g.integrantes} integrantes:</strong>{" "}
                                {g.nombresIntegrantes.join(", ")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {preview.erroresValidacion.length > 0 && (
                    <div className={styles.errorList}>
                      <p className={styles.errorListTitle}>
                        {preview.totalGrupos === 0
                          ? "Ningún pasajero/grupo es válido — revisa estos errores:"
                          : `${preview.erroresValidacion.length} fila(s)/grupo(s) serán omitidos:`}
                      </p>
                      <ul>
                        {preview.erroresValidacion.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Correos adicionales: aerolínea + proveedor (auto, editable) */}
            <div className={atencionStyles.confirmSeccion}>
              <label className={atencionStyles.confirmLabel}>
                <Mail size={14} /> Copia a aerolínea / proveedor
              </label>
              {!correosCc.length ? (
                <p className={atencionStyles.confirmCcVacio}>
                  No hay correos parametrizados para esta aerolínea o el
                  restaurante seleccionado. Puedes agregar uno manualmente, o
                  cárgalos en Administrador → Correos de Aerolíneas.
                </p>
              ) : (
                <div className={atencionStyles.confirmCcLista}>
                  {correosCc.map((c) => (
                    <label
                      key={c.correo}
                      className={atencionStyles.confirmCcItem}
                    >
                      <input
                        type="checkbox"
                        checked={c.activo}
                        onChange={() => handleToggleCorreoCc(c.correo)}
                      />
                      <span className={atencionStyles.confirmCcCorreo}>
                        {c.correo}
                      </span>
                      <span className={atencionStyles.confirmCcOrigen}>
                        {c.origen}
                      </span>
                      <button
                        type="button"
                        className={atencionStyles.confirmCcEliminar}
                        onClick={() => handleEliminarCorreoCc(c.correo)}
                        title="Quitar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </label>
                  ))}
                </div>
              )}
              <div className={atencionStyles.confirmCcAgregar}>
                <input
                  className={atencionStyles.emailModalInput}
                  type="email"
                  placeholder="Agregar otro correo..."
                  value={nuevoCorreoCc}
                  onChange={(e) => setNuevoCorreoCc(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleAgregarCorreoCc()
                  }
                />
                <button
                  type="button"
                  className={atencionStyles.confirmCcAddBtn}
                  onClick={handleAgregarCorreoCc}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Firma digital de conformidad (aplica a todo el lote) */}
            <div className={atencionStyles.confirmSeccion}>
              <label className={atencionStyles.confirmLabel}>
                <PenTool size={14} /> Firma digital de conformidad
              </label>
              <p className={atencionStyles.confirmFirmaDesc}>
                Escribe el nombre completo de quien autoriza esta carga masiva y
                presiona "Firmar" para confirmar que está de acuerdo con las
                asignaciones que trae el Excel.
              </p>
              <div className={styles.confirmFirmaRow}>
                <input
                  className={[
                    atencionStyles.emailModalInput,
                    styles.confirmFirmaInput,
                    firmado ? styles.confirmFirmaInputOk : "",
                  ].join(" ")}
                  type="text"
                  placeholder="Nombre completo"
                  value={firmaTexto}
                  onChange={(e) => handleCambiarFirmaTexto(e.target.value)}
                  disabled={firmado}
                />
                {!firmado ? (
                  <button
                    className={[
                      atencionStyles.confirmFirmarBtn,
                      styles.confirmFirmaBtn,
                    ].join(" ")}
                    onClick={handleFirmar}
                    disabled={!firmaTexto.trim()}
                  >
                    Firmar
                  </button>
                ) : (
                  <span className={atencionStyles.confirmFirmadoCheck}>
                    <CheckCircle2 size={18} /> Firmado
                  </span>
                )}
              </div>
            </div>

            <div className={atencionStyles.emailModalActions}>
              <button
                className={atencionStyles.emailModalCancel}
                onClick={() => {
                  setConfirmCarga({ open: false, archivo: null });
                  setPreview(null);
                  setPreviewError(null);
                }}
                disabled={cargarExcel.isPending}
              >
                Cancelar
              </button>
              <button
                className={atencionStyles.emailModalConfirm}
                onClick={handleConfirmarYCargar}
                disabled={
                  !firmado ||
                  cargarExcel.isPending ||
                  previsualizar.isPending ||
                  !!previewError ||
                  (preview && preview.totalGrupos === 0)
                }
              >
                <Send size={14} />{" "}
                {cargarExcel.isPending ? "Cargando..." : "Confirmar y Cargar"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* NUEVO — modal de "procesando" con spinner, visible desde el
          instante en que se confirma la carga (no hace falta bajar a
          buscar la barra de progreso). No se puede cerrar manualmente
          mientras el lote sigue en curso — se cierra solo cuando termina,
          ver el useEffect de arriba. */}
      <Modal open={modalProgresoAbierto} onClose={() => {}} size="sm">
        <div className={styles.progresoModalContent}>
          <Spinner size="lg" />
          <h3 className={styles.progresoModalTitle}>
            {!lote || lote.estado === "CREANDO_ATENCIONES"
              ? "Registrando pasajeros..."
              : "Enviando vouchers..."}
          </h3>
          {lote && (
            <div className={styles.progressWrap}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${progresoPct}%` }}
                />
              </div>
              <span className={styles.progressLabel}>
                {lote.procesados} / {lote.totalPasajeros} procesados
              </span>
            </div>
          )}
          <p className={styles.progresoModalHint}>
            No cierres esta ventana — con archivos grandes (300-500 pasajeros)
            puede tardar unos minutos. Te avisamos apenas termine.
          </p>
        </div>
      </Modal>
      <InfoModal
        open={resultadoModal.open}
        onClose={() => setResultadoModal({ open: false })}
        type={resultadoModal.type}
        title={resultadoModal.title}
        message={resultadoModal.message}
      />
      {resultadoModal.erroresValidacion?.length > 0 && (
        <div className={styles.errorList}>
          <h3 className={styles.errorListTitle}>
            Filas omitidas por errores de validación
          </h3>
          <ul>
            {resultadoModal.erroresValidacion.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
