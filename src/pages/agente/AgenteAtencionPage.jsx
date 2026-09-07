import { useState, useRef, useCallback, useEffect } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import { useAgenteAtencion } from "../../context/AgenteAtencionContext.jsx";
import {
  Users,
  Plane,
  Hotel,
  Bus,
  UtensilsCrossed,
  Camera,
  CameraOff,
  Upload,
  CheckSquare,
  Square,
  Plus,
  Minus,
  FileDown,
  Send,
  ChevronLeft,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  X,
  PenTool,
  Globe, // ← NUEVO — ícono selector de idioma del voucher
  CheckCircle2,
  Mail,
  Trash2,
} from "lucide-react";
import PhoneInput from "../../components/ui/PhoneInput.jsx"; // ← NUEVO — input con prefijo +51 fijo
import { useRegistrosHoy } from "../../hooks/useRegistrosDiarios";
import { useWebSocket } from "../../context/WebSocketContext"; // FIX #2
import { hoyEnLima } from "../../utils/dateUtils.js";
import { useAerolineasCorreo } from "../../hooks/useAerolineasCorreo"; // ← NUEVO
import {
  useAtencionesRegistro,
  useDisponibilidad,
  useEscanearBoardingPass,
  useEscanearBoardingPassImagen,
  useVerificarPnr,
  useCrearAtencion,
  useAsignarServicios,
  useGenerarPdf,
  useGenerarYEnviarVoucher,
  useGenerarPdfGrupal,
  useGenerarYEnviarVoucherGrupal,
  useObtenerUrlDescarga, // ← AGREGAR ESTA LÍNEA
} from "../../hooks/useAtenciones";
import InfoModal from "../../components/ui/InfoModal.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import styles from "./AgenteAtencionPage.module.css";

const BADGE_MAP = {
  CANCELACION: "danger",
  DEMORA: "warning",
  REPROGRAMADO: "warning",
  PROGRAMADO: "info",
};
const HOY = hoyEnLima();

const EMPTY_SV = {
  hotelRec: null,
  simples: 0,
  dobles: 0,
  matrim: 0,
  svHotel: { desayuno: false, almuerzo: false, snack: false, cena: false },
  transRec: null,
  cantTrans: 1,
  tipoTrans: { individual: false, grupal: false, ambos: false },
  restRec: null,
  cantRest: 1,
  svRest: { desayuno: false, almuerzo: false, cena: false },
  fechaIngreso: HOY, // ← AGREGAR
  fechaSalida: "", // ← AGREGAR
};
const EMPTY_PX = {
  nombre: "",
  apellido: "",
  pnr: "",
  correo: "",
  telefono: "",
  ...EMPTY_SV,
};

/* ══════════════════════
   Checkbox toggle
   ══════════════════════ */
function Chk({ checked, onChange, label, emoji, color }) {
  return (
    <button
      className={[styles.chkBtn, checked ? styles.chkBtnActive : ""].join(" ")}
      style={checked ? { borderColor: color, background: `${color}18` } : {}}
      onClick={() => onChange(!checked)}
    >
      {checked ? (
        <CheckSquare size={15} color={color} />
      ) : (
        <Square size={15} color="var(--text-400)" />
      )}
      {emoji && <span>{emoji}</span>}
      <span>{label}</span>
    </button>
  );
}

/* ══════════════════════
   Stepper −/+
   ══════════════════════ */
function Stepper({ label, disponibles = 0, value, onChange }) {
  return (
    <div className={styles.stepper}>
      <div className={styles.stepperLabel}>
        {label}{" "}
        <span className={styles.stepperDisp}>(Disponibles: {disponibles})</span>
      </div>
      <div className={styles.stepperCtrl}>
        <button
          className={styles.stepBtn}
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
        >
          <Minus size={13} />
        </button>
        <span className={styles.stepVal}>{value}</span>
        <button
          className={[styles.stepBtn, styles.stepBtnPlus].join(" ")}
          onClick={() => onChange(Math.min(disponibles, value + 1))}
          disabled={value >= disponibles}
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

function ResourceCombobox({
  recursos,
  selected,
  onSelect,
  getDisp,
  Icon,
  buildLabel,
  colorActive = "#16a34a",
  placeholder = "Seleccionar proveedor…", // ← AGREGAR
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Cierra al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedLabel = selected ? buildLabel(selected) : null;

  return (
    <div className={styles.combobox} ref={ref}>
      <button
        className={[
          styles.comboboxTrigger,
          selected ? styles.comboboxTriggerActive : styles.comboboxTriggerEmpty,
        ].join(" ")}
        style={
          selected
            ? { borderColor: colorActive, background: `${colorActive}10` }
            : {}
        }
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        {/* Ícono con badge de color */}
        <span
          className={styles.comboboxIconBadge}
          style={{
            background: selected ? `${colorActive}20` : "#f1f5f9",
            borderColor: selected ? `${colorActive}50` : "#d1d5db",
          }}
        >
          <Icon size={16} color={selected ? colorActive : "#9ca3af"} />
        </span>

        <span className={styles.comboboxTriggerText}>
          {selectedLabel ?? (
            <span className={styles.comboboxPlaceholder}>{placeholder}</span>
          )}
        </span>
        <ChevronDown
          size={14}
          className={[
            styles.comboboxChevron,
            open ? styles.comboboxChevronOpen : "",
          ].join(" ")}
          color="var(--text-400)"
        />
      </button>

      {open && (
        <div className={styles.comboboxDropdown}>
          {/* Opción "ninguno" */}
          <button
            className={[
              styles.comboboxOption,
              !selected ? styles.comboboxOptionActive : "",
            ].join(" ")}
            onClick={() => {
              onSelect(null);
              setOpen(false);
            }}
            type="button"
          >
            <span className={styles.comboboxOptionDot} />
            <span>Sin asignar</span>
          </button>

          {recursos.map((r) => {
            const rid = r.vueloRecursoId ?? r.id;
            const d = getDisp(r);
            const agotado =
              d?.agotado === true ||
              (d?.totalDisponibles !== undefined && d.totalDisponibles === 0);
            const isSel = selected?.vueloRecursoId === rid;
            const label = buildLabel(r);

            return (
              <button
                key={rid}
                className={[
                  styles.comboboxOption,
                  isSel ? styles.comboboxOptionActive : "",
                  agotado ? styles.comboboxOptionDisabled : "",
                ].join(" ")}
                disabled={agotado}
                onClick={() => {
                  onSelect(isSel ? null : r);
                  setOpen(false);
                }}
                type="button"
              >
                <span
                  className={styles.comboboxOptionDot}
                  style={isSel ? { background: colorActive } : {}}
                />
                <span className={styles.comboboxOptionLabel}>{label}</span>
                {agotado && (
                  <span className={styles.agotadoTag}>Sin disponibilidad</span>
                )}
                {isSel && <span className={styles.comboboxCheck}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SignatureCanvas({ value, onChange, disabled }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const hasDrawnRef = useRef(false);

  const getCtx = () => canvasRef.current?.getContext("2d");

  useEffect(() => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  }, []);

  useEffect(() => {
    if (!value) {
      const canvas = canvasRef.current;
      const ctx = getCtx();
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasDrawnRef.current = false;
    }
  }, [value]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e) => {
    if (disabled) return;
    e.preventDefault();
    canvasRef.current?.setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    const { x, y } = getPos(e);
    const ctx = getCtx();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerMove = (e) => {
    if (disabled || !drawingRef.current) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = getCtx();
    ctx.lineTo(x, y);
    ctx.stroke();
    hasDrawnRef.current = true;
  };

  const finishStroke = () => {
    if (disabled || !drawingRef.current) return;
    drawingRef.current = false;
    if (hasDrawnRef.current) {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  };

  const handleLimpiar = () => {
    //if (disabled) return;
    const canvas = canvasRef.current;
    const ctx = getCtx();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
    onChange("");
  };

  return (
    <div className={styles.confirmFirmaCanvasWrap}>
      <div className={styles.confirmFirmaCanvasHeader}>
        <span>Firme en el recuadro</span>
        <button
          type="button"
          className={styles.confirmFirmaLimpiarBtn}
          onClick={handleLimpiar}
          //disabled={disabled}
        >
          <Trash2 size={13} /> Limpiar
        </button>
      </div>
      <div className={styles.confirmFirmaCanvasBox}>
        <canvas
          ref={canvasRef}
          width={520}
          height={160}
          className={[
            styles.confirmFirmaCanvas,
            disabled ? styles.confirmFirmaCanvasDisabled : "",
          ].join(" ")}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerLeave={finishStroke}
        />
        {!value && (
          <span className={styles.confirmFirmaPlaceholder}>
            Firme aquí con el mouse, dedo o lápiz óptico
          </span>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════
   Vista 1 — Selección de vuelo
   ══════════════════════ */
function SeleccionVuelo({ registros, loading, onSeleccionar }) {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <Users size={24} color="var(--rol-agente)" />
        <div>
          <h1 className={styles.pageTitle}>Registro de Compensación</h1>
          <p className={styles.pageSub}>
            Atención al pasajero afectado — {HOY}
          </p>
        </div>
      </div>

      <div className={styles.secTitulo}>🛫 Vuelos registrados para hoy</div>
      <p className={styles.secNota}>
        Selecciona el vuelo del pasajero que vas a atender
      </p>

      {loading ? (
        <div className={styles.centered}>
          <Spinner size="lg" />
        </div>
      ) : registros.length === 0 ? (
        <div className={styles.emptyState}>
          <Plane size={48} color="var(--text-200)" />
          <p>El líder aún no ha registrado vuelos para hoy.</p>
        </div>
      ) : (
        <div className={styles.vuelosGrid}>
          {registros.map((r) => {
            const v = r.vueloItinerario;
            return (
              <div key={r.id} className={styles.vCard}>
                <div className={styles.vCardTop}>
                  <div className={styles.vCardInfo}>
                    <span className={styles.vCodigo}>{v?.codigoVuelo}</span>
                    <span className={styles.vRuta}>
                      {v?.origen} → {v?.destino}
                    </span>
                    {v?.horaVuelo && (
                      <span className={styles.vHora}>{v.horaVuelo}</span>
                    )}
                  </div>
                  <Badge
                    label={v?.tipoContingencia ?? "—"}
                    variant={BADGE_MAP[v?.tipoContingencia] ?? "neutral"}
                  />
                </div>
                <p className={styles.vAero}>{v?.aerolinea}</p>
                <p className={styles.vLider}>
                  👤 Líder: {r.registradoPorNombre}
                </p>
                <div className={styles.vRecursosCont}>
                  {r.totalHoteles > 0 && (
                    <span className={styles.vRecurso}>
                      <Hotel size={12} /> {r.totalHoteles}
                    </span>
                  )}
                  {r.totalTransportes > 0 && (
                    <span className={styles.vRecurso}>
                      <Bus size={12} /> {r.totalTransportes}
                    </span>
                  )}
                  {r.totalRestaurantes > 0 && (
                    <span className={styles.vRecurso}>
                      <UtensilsCrossed size={12} /> {r.totalRestaurantes}
                    </span>
                  )}
                </div>
                <button
                  className={styles.selBtn}
                  onClick={() => onSeleccionar(r)}
                >
                  Seleccionar este vuelo →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Vista 2 — Formulario completo (UNA SOLA VISTA)
   ══════════════════════════════════════════════════════════ */
function FormularioAtencion({ registro, onVolver }) {
  const v = registro.vueloItinerario;

  /* ── Disponibilidad en tiempo real ── */
  const { data: disp, refetch: refetchDisp } = useDisponibilidad(registro.id);

  // TEMPORAL — para ver qué estructura devuelve el backend
  console.log("📊 DISP DATA:", JSON.stringify(disp, null, 2));

  // FIX #2: suscribir al WebSocket de disponibilidad cuando el agente selecciona un vuelo
  const { subscribeDisponibilidad, unsubscribeDisponibilidad } =
    useWebSocket() ?? {};

  // En FormularioAtencion, reemplazar el useEffect existente del WebSocket:
  useEffect(() => {
    if (!registro?.id) return;
    subscribeDisponibilidad?.(registro.id);
    return () => unsubscribeDisponibilidad?.(registro.id);
  }, [registro?.id, subscribeDisponibilidad, unsubscribeDisponibilidad]);

  // AGREGAR este segundo useEffect como respaldo:
  // Si el WS de /topic/atenciones llega pero /topic/disponibilidad no,
  // forzamos un refetch de disponibilidad cada vez que se invalidan atenciones.
  const { data: _atencionesWatch } = useAtencionesRegistro(registro.id);
  useEffect(() => {
    // Cada vez que cambian las atenciones del registro, refrescar disponibilidad
    refetchDisp();
  }, [_atencionesWatch?.length, refetchDisp]);

  /*
   * FUENTE DE PROVEEDORES: registro.recursos (lo que el líder habilitó)
   * FUENTE DE DISPONIBILIDAD: disp (números en tiempo real)
   * Cruzamos por vueloRecursoId / proveedorId
   */
  const recursosHotel = (registro.recursos ?? []).filter(
    (r) => r.proveedorTipo === "HOTEL",
  );
  const recursosTransporte = (registro.recursos ?? []).filter(
    (r) => r.proveedorTipo === "TRANSPORTE",
  );
  const recursosRest = (registro.recursos ?? []).filter(
    (r) => r.proveedorTipo === "RESTAURANTE",
  );

  /* Enriquecer con disponibilidad real si ya llegó */
  const hotelesDip = disp?.hoteles ?? [];
  const transportesDip = disp?.transportes ?? [];
  const restaurantesDip = disp?.restaurantes ?? [];

  /* Helper: encuentra disponibilidad por vueloRecursoId del recurso */
  const getDispHotel = (r) =>
    hotelesDip.find((d) => d.vueloRecursoId === (r.vueloRecursoId ?? r.id));
  const getDispTrans = (r) =>
    transportesDip.find((d) => d.vueloRecursoId === (r.vueloRecursoId ?? r.id));
  const getDispRest = (r) =>
    restaurantesDip.find(
      (d) => d.vueloRecursoId === (r.vueloRecursoId ?? r.id),
    );

  /* ── Escáner ── */
  const videoRef = useRef(null);
  const scanningRef = useRef(false); // ← agregar junto a los otros refs
  // const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const inputImgRef = useRef(null);
  const [camOn, setCamOn] = useState(false);
  const [bpTexto, setBpTexto] = useState("");
  const [bpScanning, setBpScanning] = useState(false);

  const [modoManual, setModoManual] = useState(false);
  const [syncing, setSyncing] = useState(false); // estado del botón sincronizar

  const [omitirValidacionDoble, setOmitirValidacionDoble] = useState(false);
  const [omitirValidacionMatrim, setOmitirValidacionMatrim] = useState(false);

  /* ── Voucher grupal: PNR y correo compartidos por todo el grupo ──
   * En modo "un_correo" siempre se usan (Escenario 1). En modo
   * "servicios_independientes" son opcionales, vía el toggle
   * compartirDatosGrupo (Escenario 3: servicios distintos, PNR/correo
   * único). Evita repetir el mismo PNR/correo en cada fila de pasajero. */
  const [grupoPnr, setGrupoPnr] = useState("");
  const [grupoCorreo, setGrupoCorreo] = useState("");
  const [compartirDatosGrupo, setCompartirDatosGrupo] = useState(false);

  /*
   * "un_correo"               → mismos servicios, UN correo del modal (Caso 1/2 original)
   * "correo_individual"       → mismos servicios, correo de CADA pasajero (Caso 2 nuevo)
   * "servicios_independientes"→ servicios distintos por pasajero, correo de CADA uno (Caso 3)
   */
  const [modoEnvio, setModoEnvio] = useState("un_correo");

  /* ── Pasajeros ── */
  const [pasajeros, setPasajeros] = useState([{ ...EMPTY_PX }]);
  const [pxActivo, setPxActivo] = useState(0);

  /* ── Servicios seleccionados ── */
  const [hotelRec, setHotelRec] = useState(null); // RecursoDisponibleResponse
  const [simples, setSimples] = useState(0);
  const [dobles, setDobles] = useState(0);
  const [matrim, setMatrim] = useState(0);
  const [svHotel, setSvHotel] = useState({
    desayuno: false,
    almuerzo: false,
    snack: false,
    cena: false,
  });
  const [fechaIngreso, setFechaIngreso] = useState(HOY);
  const [fechaSalida, setFechaSalida] = useState("");

  const [transRec, setTransRec] = useState(null); // RecursoDisponibleResponse
  const [cantTrans, setCantTrans] = useState(1); // ← AGREGAR ESTA LÍNEA
  const [tipoTrans, setTipoTrans] = useState({
    individual: false,
    grupal: false,
    ambos: false,
  });

  const [restRec, setRestRec] = useState(null); // RecursoDisponibleResponse
  const [cantRest, setCantRest] = useState(1); // ← AGREGAR ESTA LÍNEA
  const [svRest, setSvRest] = useState({
    desayuno: false,
    almuerzo: false,
    cena: false,
  });

  /* ── Datos de emisión ── */
  const [fechaEmision, setFechaEmision] = useState(HOY);
  const [lugarEmision, setLugarEmision] = useState("LIM");

  /* ── Computed service state (Caso 3 = per-passenger, otros = global) ── */
  const isSvInd = modoEnvio === "servicios_independientes";

  /* ── Voucher grupal: ¿el PNR y el correo son compartidos por todo el
   * grupo? Siempre en "un_correo" (Escenario 1). En "servicios_independientes"
   * solo si el agente activó el toggle "compartirDatosGrupo" (Escenario 3).
   * En "correo_individual" NUNCA (cada pasajero mantiene su propio PNR y
   * correo — modo sin cambios). */
  const datosCompartidosGrupo =
    modoEnvio === "un_correo" || (isSvInd && compartirDatosGrupo);

  const setPxSvField = (key, val) =>
    setPasajeros((prev) => {
      const copy = [...prev];
      copy[pxActivo] = { ...copy[pxActivo], [key]: val };
      return copy;
    });

  const pxSv = pasajeros[pxActivo] ?? {};
  const _hotelRec = isSvInd ? (pxSv.hotelRec ?? null) : hotelRec;
  const _simples = isSvInd ? (pxSv.simples ?? 0) : simples;
  const _dobles = isSvInd ? (pxSv.dobles ?? 0) : dobles;
  const _matrim = isSvInd ? (pxSv.matrim ?? 0) : matrim;

  /* ── Avisos "habitación doble/matrimonial solo para 1 persona" ──
   * Los pasajeros se reparten EN ORDEN: primero cubren la(s) doble(s), y
   * con los que sobran se evalúa la(s) matrimonial(es). Esto evita que
   * activar/desactivar un tipo de habitación apague o encienda el aviso
   * del OTRO tipo sin motivo (antes ambos compartían un solo umbral
   * combinado y se apagaban/prendían juntos aunque solo cambiara uno).
   *
   * - Dobles se evalúa siempre contra su propio requisito, sin depender
   *   de matrimoniales.
   * - Matrimoniales se evalúa contra lo que "sobra" después de cubrir
   *   dobles — si liberas una doble, esos pasajeros quedan disponibles
   *   para la matrimonial (esto sí es un acoplamiento correcto/esperado).
   */
  const personasRequeridasDobles = _dobles * 2;
  const mostrarAvisoDoble =
    !isSvInd && _dobles > 0 && pasajeros.length < personasRequeridasDobles;

  const personasRestantesParaMatrim = Math.max(
    0,
    pasajeros.length - personasRequeridasDobles,
  );
  const personasRequeridasMatrim = _matrim * 2;
  const mostrarAvisoMatrim =
    !isSvInd &&
    _matrim > 0 &&
    personasRestantesParaMatrim < personasRequeridasMatrim;

  const _svHotel = isSvInd
    ? (pxSv.svHotel ?? {
        desayuno: false,
        almuerzo: false,
        snack: false,
        cena: false,
      })
    : svHotel;

  const _fechaIngreso = isSvInd ? (pxSv.fechaIngreso ?? HOY) : fechaIngreso;
  const _fechaSalida = isSvInd ? (pxSv.fechaSalida ?? "") : fechaSalida;
  const _setFechaIngreso = isSvInd
    ? (v) => setPxSvField("fechaIngreso", v)
    : setFechaIngreso;
  const _setFechaSalida = isSvInd
    ? (v) => setPxSvField("fechaSalida", v)
    : setFechaSalida;
  const _transRec = isSvInd ? (pxSv.transRec ?? null) : transRec;
  const _cantTrans = isSvInd ? (pxSv.cantTrans ?? 1) : cantTrans;
  const _tipoTrans = isSvInd
    ? (pxSv.tipoTrans ?? { individual: false, grupal: false, ambos: false })
    : tipoTrans;
  const _restRec = isSvInd ? (pxSv.restRec ?? null) : restRec;
  const _cantRest = isSvInd ? (pxSv.cantRest ?? 1) : cantRest;
  const _svRest = isSvInd
    ? (pxSv.svRest ?? { desayuno: false, almuerzo: false, cena: false })
    : svRest;

  const _setHotelRec = isSvInd
    ? (v) => setPxSvField("hotelRec", v)
    : setHotelRec;
  const _setSimples = isSvInd ? (v) => setPxSvField("simples", v) : setSimples;
  const _setDobles = isSvInd ? (v) => setPxSvField("dobles", v) : setDobles;
  const _setMatrim = isSvInd ? (v) => setPxSvField("matrim", v) : setMatrim;
  const _setSvHotel = isSvInd
    ? (v) => setPxSvField("svHotel", typeof v === "function" ? v(_svHotel) : v)
    : setSvHotel;
  const _setTransRec = isSvInd
    ? (v) => setPxSvField("transRec", v)
    : setTransRec;
  const _setCantTrans = isSvInd
    ? (v) => setPxSvField("cantTrans", v)
    : setCantTrans;
  const _setTipoTrans = isSvInd
    ? (v) =>
        setPxSvField("tipoTrans", typeof v === "function" ? v(_tipoTrans) : v)
    : setTipoTrans;
  const _setRestRec = isSvInd ? (v) => setPxSvField("restRec", v) : setRestRec;
  const _setCantRest = isSvInd
    ? (v) => setPxSvField("cantRest", v)
    : setCantRest;
  const _setSvRest = isSvInd
    ? (v) => setPxSvField("svRest", typeof v === "function" ? v(_svRest) : v)
    : setSvRest;

  /* ── Modales ── */
  const [modal, setModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
  });
  const showModal = (type, title, msg) =>
    setModal({ open: true, type, title, message: msg });

  /* ── Sincronizar disponibilidad manualmente ── */
  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await refetchDisp();
      const data = result?.data;
      const hoteles = data?.hoteles ?? [];
      const transportes = data?.transportes ?? [];
      const restaurantes = data?.restaurantes ?? [];
      const resumen = [
        hoteles.length > 0
          ? `🏨 ${hoteles[0].proveedorNombre}: ${hoteles[0].totalDisponibles}/${hoteles[0].totalHabitaciones} hab.`
          : null,
        transportes.length > 0
          ? `🚌 ${transportes[0].proveedorNombre}: ${transportes[0].capacidadDisponible}/${transportes[0].capacidadTotal} pax`
          : null,
        restaurantes.length > 0
          ? `🍽️ ${restaurantes[0].proveedorNombre}: ${restaurantes[0].capacidadDisponible}/${restaurantes[0].capacidadTotal} cubiertos`
          : null,
      ]
        .filter(Boolean)
        .join("\n");
      showModal(
        "success",
        "Sincronización exitosa",
        resumen || "Disponibilidad actualizada correctamente.",
      );
    } catch {
      showModal(
        "error",
        "Error de sincronización",
        "No se pudo obtener la disponibilidad. Verifica que el backend esté activo y vuelve a intentarlo.",
      );
    } finally {
      setSyncing(false);
    }
  };

  /* ── Modal de correo para "Generar y Enviar" ── */
  //const [emailModal, setEmailModal] = useState({
  //open: false,
  //correo: "",
  //atencionIds: [],
  //});
  const { data: aerolineasCorreoPage } = useAerolineasCorreo({
    estado: 1,
    page: 0,
    size: 200,
  });
  const aerolineasCorreoList = aerolineasCorreoPage?.content ?? [];

  const [confirmEnvio, setConfirmEnvio] = useState({ open: false, modo: null }); // "grupal" | "individual"
  const [correoDestinoGrupal, setCorreoDestinoGrupal] = useState("");
  const [correosCc, setCorreosCc] = useState([]); // [{ correo, origen, activo }]
  const [nuevoCorreoCc, setNuevoCorreoCc] = useState("");
  const [firmaImagen, setFirmaImagen] = useState(""); // ← firma dibujada (PNG base64/data URL)
  const [firmado, setFirmado] = useState(false);
  const [idiomaVoucher, setIdiomaVoucher] = useState("ES"); // ← NUEVO — Idioma del voucher a generar (default: Español)
  const [enviandoConfirm, setEnviandoConfirm] = useState(false);

  /* ── Modal de ingreso rápido de pasajeros (2do en adelante) ──
   * El Pasajero 1 siempre se edita en la tarjeta principal (fijo). Este
   * modal permite agregar/editar/eliminar TODOS los demás pasajeros de una
   * sola vez, en vez de repetir el flujo "llenar → agregar otro" uno por
   * uno (lento). Al reabrirlo, se precarga con lo que ya había. */
  const [pxModalOpen, setPxModalOpen] = useState(false);
  const [pxModalDraft, setPxModalDraft] = useState([]);

  /* ── Hooks de mutación ── */
  const escanear = useEscanearBoardingPass();
  // 2. Dentro de FormularioAtencion, junto a los demás hooks de mutación:
  const escanearImg = useEscanearBoardingPassImagen();
  const verificarPnr = useVerificarPnr();
  const crearAt = useCrearAtencion();
  const asignarSv = useAsignarServicios();
  const genPdf = useGenerarPdf();
  const genYEnviar = useGenerarYEnviarVoucher();
  const genPdfGrupal = useGenerarPdfGrupal();
  const genYEnviarGrupal = useGenerarYEnviarVoucherGrupal();
  const obtenerUrl = useObtenerUrlDescarga(); // ← AGREGAR ESTA LÍNEA
  const { data: atencionesPrev = [] } = useAtencionesRegistro(registro.id);

  /* ── Cámara con @zxing/browser (auto-scan PDF417) ── */
  const readerRef = useRef(null); // instancia de BrowserMultiFormatReader

  const detenerCamara = useCallback(() => {
    // Detener el stream de video
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    // Resetear el reader de ZXing
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch {
        /* ignorar */
      }
      readerRef.current = null;
    }
    setCamOn(false);
  }, []);

  const iniciarCamara = useCallback(async () => {
    scanningRef.current = false; // ← reset al iniciar
    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.PDF_417,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.CODE_128,
        BarcodeFormat.AZTEC,
        BarcodeFormat.DATA_MATRIX,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 300,
      });
      readerRef.current = reader;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      setCamOn(true);
      // ← decodeFromStream se llama en useEffect([camOn])
      //   cuando videoRef.current ya existe
    } catch (err) {
      const esPermisoDenegado =
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError";
      showModal(
        "error",
        esPermisoDenegado ? "Permiso denegado" : "Cámara no disponible",
        esPermisoDenegado
          ? "Activa el permiso de cámara en la configuración del navegador e intenta de nuevo."
          : `No se pudo acceder a la cámara. Usa "Subir Imagen" o ingresa el código manualmente. (${err?.name})`,
      );
    }
  }, [detenerCamara]);

  // useEffect inicia el scan DESPUÉS de que React renderiza el <video>
  useEffect(() => {
    if (!camOn) return;
    if (!videoRef.current) return;
    if (!streamRef.current) return;
    if (!readerRef.current) return;

    const video = videoRef.current;
    if (video.srcObject !== streamRef.current) {
      video.srcObject = streamRef.current;
      video.play().catch(() => {});
    }

    // Ahora sí: videoRef.current existe en el DOM
    readerRef.current.decodeFromStream(
      streamRef.current,
      videoRef.current,
      async (result) => {
        if (!result) return;
        if (scanningRef.current) return; // ← ya está procesando, ignorar
        scanningRef.current = true; // ← bloquear siguientes disparos

        const codigo = result.getText();
        detenerCamara();

        try {
          const res = await escanear.mutateAsync(codigo.trim());
          const bp = res.data.data;
          const partes = (bp.nombreCompleto ?? "").split("/");
          const apellido = partes[0]?.trim().toUpperCase() ?? "";
          const nombre = partes[1]?.trim().toUpperCase() ?? "";

          // ── Verificar PNR duplicado antes de mostrar éxito ──
          const vueloId = v?.id;
          if (bp.pnr && vueloId) {
            try {
              const verfRes = await verificarPnr.mutateAsync({
                pnr: bp.pnr,
                vueloId,
              });
              const verf = verfRes.data.data;
              // if (verf?.duplicado) {
              //   showModal(
              //     "warning",
              //     "Boarding pass duplicado",
              //     `El PNR ${bp.pnr} ya fue registrado en una atención anterior.\n\nPasajero: ${verf.nombrePasajero ?? bp.nombreCompleto}\nCorrelativo: ${verf.correlativo ?? "—"}\n\nNo se pueden registrar dos atenciones con el mismo PNR para este vuelo.`,
              //   );
              //   scanningRef.current = false;
              //   return;
              // }
            } catch {
              // Si la verificación falla, continuar con flujo normal (no bloqueante)
            }
          }
          // ── Fin verificación ──

          setPasajeros((prev) => {
            const copy = [...prev];
            copy[pxActivo] = {
              ...copy[pxActivo],
              nombre,
              apellido,
              pnr: datosCompartidosGrupo ? copy[pxActivo].pnr : (bp.pnr ?? ""),
              telefono: "", // ← El agente puede completarlo manualmente tras escanear
            };
            return copy;
          });

          if (datosCompartidosGrupo && bp.pnr) {
            setGrupoPnr(bp.pnr.toUpperCase());
          }

          showModal(
            "success",
            bp.nombreTruncado
              ? "Boarding pass leído (nombre incompleto)"
              : "Boarding pass leído",
            bp.nombreTruncado
              ? `${bp.nombreCompleto} · PNR: ${bp.pnr}\n\n⚠️ El código de barras IATA limita el nombre a 20 caracteres. El nombre del pasajero parece estar cortado; complétalo manualmente.`
              : `${bp.nombreCompleto} · PNR: ${bp.pnr}`,
            // "success",
            // "Boarding pass leído",
            // `${bp.nombreCompleto} · PNR: ${bp.pnr}`,
          );
        } catch (err) {
          showModal(
            "error",
            "Error de escaneo",
            err.response?.data?.message ?? "No se pudo decodificar el código.",
          );
        } finally {
          scanningRef.current = false; // ← liberar para el próximo escaneo
        }
      },
    );
  }, [camOn, detenerCamara]);

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => detenerCamara();
  }, [detenerCamara]);
  /* ── Subir imagen ── */
  // 3. Reemplazar handleSubirImagen completo:
  const handleSubirImagen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // permite re-seleccionar el mismo archivo
    setBpScanning(true);

    try {
      // Intento 2: Enviar imagen al backend (ZXing con múltiples estrategias)
      const formData = new FormData();
      formData.append("imagen", file);

      const res = await escanearImg.mutateAsync(formData);
      const bp = res.data.data;
      const partes = (bp.nombreCompleto ?? "").split("/");
      const apellido = partes[0]?.trim().toUpperCase() ?? "";
      const nombre = partes[1]?.trim().toUpperCase() ?? "";

      // ── Verificar PNR duplicado antes de mostrar éxito ──
      const vueloId = v?.id;
      if (bp.pnr && vueloId) {
        try {
          const verfRes = await verificarPnr.mutateAsync({
            pnr: bp.pnr,
            vueloId,
          });
          const verf = verfRes.data.data;
          // if (verf?.duplicado) {
          //   showModal(
          //     "warning",
          //     "Boarding pass duplicado",
          //     `El PNR ${bp.pnr} ya fue registrado en una atención anterior.\n\nPasajero: ${verf.nombrePasajero ?? bp.nombreCompleto}\nCorrelativo: ${verf.correlativo ?? "—"}\n\nNo se pueden registrar dos atenciones con el mismo PNR para este vuelo.`,
          //   );
          //   return;
          // }
        } catch {
          // Si la verificación falla, continuar con flujo normal (no bloqueante)
        }
      }
      // ── Fin verificación ──

      setPasajeros((prev) => {
        const copy = [...prev];
        copy[pxActivo] = {
          ...copy[pxActivo],
          nombre,
          apellido,
          pnr: datosCompartidosGrupo ? copy[pxActivo].pnr : (bp.pnr ?? ""),
        };
        return copy;
      });

      if (datosCompartidosGrupo && bp.pnr) {
        setGrupoPnr(bp.pnr.toUpperCase());
      }

      showModal(
        "success",
        bp.nombreTruncado
          ? "Boarding pass leído (nombre incompleto)"
          : "Boarding pass leído",
        bp.nombreTruncado
          ? `${bp.nombreCompleto} · PNR: ${bp.pnr}\n\n⚠️ El código de barras IATA limita el nombre a 20 caracteres. El nombre del pasajero parece estar cortado; complétalo manualmente.`
          : `${bp.nombreCompleto} · PNR: ${bp.pnr}`,
      );
    } catch (err) {
      showModal(
        "error",
        "No se pudo leer el código",
        err.response?.data?.message ??
          "La imagen no pudo ser procesada. Intenta con mejor iluminación o ingresa el código manualmente.",
      );
    } finally {
      setBpScanning(false);
    }
  };

  /* ── Agregar pasajero ── */
  const handleAgregarPx = () => {
    const px = pasajeros[pxActivo];
    const faltanDatos = datosCompartidosGrupo
      ? !px.nombre || !px.apellido
      : !px.nombre || !px.apellido || !px.pnr || !px.correo;
    if (faltanDatos) {
      showModal(
        "error",
        "Datos incompletos",
        datosCompartidosGrupo
          ? "Completa nombre y apellido antes de agregar otro pasajero."
          : "Completa nombre, apellido, PNR y correo antes de agregar otro pasajero.",
      );
      return;
    }
    setPasajeros((prev) => [...prev, { ...EMPTY_PX }]);
    setPxActivo(pasajeros.length);
    setBpTexto("");
  };

  /* ── Modal de pasajeros: abrir / editar filas / guardar ── */
  const abrirModalPasajeros = () => {
    const primero = pasajeros[0];
    const faltaPrimero = datosCompartidosGrupo
      ? !primero.nombre || !primero.apellido
      : !primero.nombre || !primero.apellido || !primero.pnr || !primero.correo;
    if (faltaPrimero) {
      showModal(
        "error",
        "Completa el Pasajero 1",
        datosCompartidosGrupo
          ? "Completa nombre y apellido del Pasajero 1 antes de agregar más."
          : "Completa nombre, apellido, PNR y correo del Pasajero 1 antes de agregar más.",
      );
      return;
    }
    const resto = pasajeros.slice(1);
    setPxModalDraft(resto.length ? resto : [{ ...EMPTY_PX }]);
    setPxModalOpen(true);
  };

  const handleModalCampoChange = (idx, key, val) => {
    setPxModalDraft((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [key]: val };
      return copy;
    });
  };

  const handleModalAgregarFila = () => {
    setPxModalDraft((prev) => [...prev, { ...EMPTY_PX }]);
  };

  const handleModalEliminarFila = (idx) => {
    setPxModalDraft((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleModalGuardar = () => {
    // Descarta filas totalmente vacías (sin nombre ni apellido); el resto
    // de la validación (PNR/correo completos, etc.) ya ocurre al registrar.
    const filas = pxModalDraft.filter(
      (p) => p.nombre?.trim() || p.apellido?.trim(),
    );
    setPasajeros([pasajeros[0], ...filas]);
    setPxActivo(0);
    setPxModalOpen(false);
  };

  /* Si el aviso de "habitación doble" se oculta (porque ya hay suficientes
   * pasajeros agregados), se limpia el checkbox para que la próxima vez que
   * vuelva a aparecer (p. ej. tras eliminar un pasajero) empiece sin marcar. */
  useEffect(() => {
    if (!mostrarAvisoDoble && omitirValidacionDoble) {
      setOmitirValidacionDoble(false);
    }
  }, [mostrarAvisoDoble, omitirValidacionDoble]);

  useEffect(() => {
    if (!mostrarAvisoMatrim && omitirValidacionMatrim) {
      setOmitirValidacionMatrim(false);
    }
  }, [mostrarAvisoMatrim, omitirValidacionMatrim]);

  /* ── Eliminar pasajero ── */
  const handleEliminarPx = (idx) => {
    setPasajeros((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
    setPxActivo((prev) => {
      if (idx < prev) return prev - 1;
      if (idx === prev) return Math.max(0, prev - 1);
      return prev;
    });
  };

  /* ── Construir lista de servicios con el nuevo formato del backend ── */
  const buildServicios = (pxIdx = null) => {
    let sv = {};
    if (isSvInd && pxIdx !== null) sv = pasajeros[pxIdx] ?? {};

    const hRec = isSvInd && pxIdx !== null ? (sv.hotelRec ?? null) : _hotelRec;
    const sims = isSvInd && pxIdx !== null ? (sv.simples ?? 0) : _simples;
    const dobs = isSvInd && pxIdx !== null ? (sv.dobles ?? 0) : _dobles;
    const mats = isSvInd && pxIdx !== null ? (sv.matrim ?? 0) : _matrim;
    const svH = isSvInd && pxIdx !== null ? (sv.svHotel ?? {}) : _svHotel;
    const tRec = isSvInd && pxIdx !== null ? (sv.transRec ?? null) : _transRec;
    const cTrans = isSvInd && pxIdx !== null ? (sv.cantTrans ?? 1) : _cantTrans;
    const tTrans =
      isSvInd && pxIdx !== null ? (sv.tipoTrans ?? {}) : _tipoTrans;
    const rRec = isSvInd && pxIdx !== null ? (sv.restRec ?? null) : _restRec;
    const cRest = isSvInd && pxIdx !== null ? (sv.cantRest ?? 1) : _cantRest;
    const svR = isSvInd && pxIdx !== null ? (sv.svRest ?? {}) : _svRest;

    const lista = [];
    if (hRec) {
      const tiposHabitacion = [
        { tipo: "SIMPLE", cantidad: sims },
        { tipo: "DOBLE", cantidad: dobs },
        { tipo: "MATRIMONIAL", cantidad: mats },
      ].filter(({ cantidad }) => cantidad > 0);

      tiposHabitacion.forEach(({ tipo, cantidad }) => {
        lista.push({
          vueloRecursoId: hRec.vueloRecursoId,
          tipoDetalle: "HOTEL",
          tipoHabitacion: tipo,
          desayuno: svH.desayuno,
          almuerzo: svH.almuerzo,
          cena: svH.cena,
          snack: svH.snack,
          cantidad,
          fechaIngreso: _fechaIngreso || null, // ← AGREGAR
          fechaSalida: _fechaSalida || null, // ← AGREGAR
        });
      });
    }
    if (tRec) {
      const tipoT = tTrans.individual
        ? "INDIVIDUAL"
        : tTrans.grupal
          ? "GRUPAL"
          : tTrans.ambos
            ? "AMBOS"
            : "INDIVIDUAL";
      lista.push({
        vueloRecursoId: tRec.vueloRecursoId,
        tipoDetalle: "TRANSPORTE",
        tipoTransporte: tipoT,
        cantidad: cTrans,
      });
    }
    if (rRec) {
      lista.push({
        vueloRecursoId: rRec.vueloRecursoId,
        tipoDetalle: "RESTAURANTE",
        desayuno: svR.desayuno,
        almuerzo: svR.almuerzo,
        cena: svR.cena,
        cantidad: cRest,
      });
    }
    return lista;
  };

  /* ── Registrar pasajeros y servicios (común a ambos botones) ── */
  const registrarPasajeros = async (firmaPasajero = null) => {
    const validosConIdx = pasajeros
      .map((p, i) => ({ p, i }))
      .filter(({ p }) =>
        datosCompartidosGrupo
          ? p.nombre && p.apellido
          : p.nombre && p.apellido && p.pnr && p.correo,
      );

    if (!validosConIdx.length) {
      showModal(
        "error",
        "Sin pasajeros",
        "Completa los datos de al menos un pasajero.",
      );
      return null;
    }

    if (datosCompartidosGrupo && (!grupoPnr || !grupoCorreo)) {
      showModal(
        "error",
        "Datos del grupo incompletos",
        "Ingresa el PNR y el correo compartidos por todo el grupo antes de registrar.",
      );
      return null;
    }

    /* ── Validación: habitaciones doble/matrimonial = 2 pasajeros por
     * habitación ── Los requisitos de doble y matrimonial se SUMAN porque
     * comparten el mismo grupo de pasajeros (validosConIdx): 1 doble + 1
     * matrimonial necesita 4 pasajeros en total, no 2. Comparar cada tipo
     * por separado contra el mismo contador (bug anterior) permitía que,
     * con solo 2 pasajeros, ambas validaciones se dieran por cumplidas al
     * mismo tiempo aunque en realidad faltaran 2 personas. */
    const requeridoDobles = omitirValidacionDoble ? 0 : _dobles * 2;
    const requeridoMatrim = omitirValidacionMatrim ? 0 : _matrim * 2;
    const personasRequeridasTotal = requeridoDobles + requeridoMatrim;

    if (
      !isSvInd &&
      personasRequeridasTotal > 0 &&
      validosConIdx.length < personasRequeridasTotal
    ) {
      const faltantes = personasRequeridasTotal - validosConIdx.length;
      const partes = [];
      if (requeridoDobles > 0) {
        partes.push(
          `${_dobles} habitación${_dobles > 1 ? "es" : ""} doble${_dobles > 1 ? "s" : ""}`,
        );
      }
      if (requeridoMatrim > 0) {
        partes.push(
          `${_matrim} habitación${_matrim > 1 ? "es" : ""} matrimonial${_matrim > 1 ? "es" : ""}`,
        );
      }
      const descripcionHabitaciones = partes.join(" y ");
      showModal(
        "warning",
        "Faltan pasajeros para las habitaciones seleccionadas",
        `Seleccionaste ${descripcionHabitaciones}, pensada(s) para 2 personas cada una (se necesitan ${personasRequeridasTotal} pasajeros en total entre ambas). Actualmente tienes ${validosConIdx.length} pasajero${validosConIdx.length !== 1 ? "s" : ""} completo${validosConIdx.length !== 1 ? "s" : ""}.\n\nAgrega ${faltantes} pasajero${faltantes > 1 ? "s" : ""} más, o marca la opción "solo para 1 persona" correspondiente si deseas continuar así.`,
      );
      return null;
    }

    const pnrsEnForm = validosConIdx.map(({ p }) => p.pnr.toUpperCase());
    const pnrsUnicos = new Set(pnrsEnForm);

    /* ── Revalidar disponibilidad en tiempo real justo antes de enviar ──
     * Evita la carrera entre dos agentes reservando el mismo hotel /
     * transporte / restaurante al mismo tiempo: se refresca la
     * disponibilidad contra el backend y se compara contra lo que el
     * agente tiene seleccionado en el formulario. Si algún recurso ya
     * no alcanza, se bloquea el envío antes de crear cualquier
     * atención. */
    const dispFresca = await refetchDisp();
    const hotelesFrescos = dispFresca?.data?.hoteles ?? [];
    const transportesFrescos = dispFresca?.data?.transportes ?? [];
    const restaurantesFrescos = dispFresca?.data?.restaurantes ?? [];

    const serviciosDemandados = isSvInd
      ? validosConIdx.flatMap(({ i }) => buildServicios(i))
      : buildServicios();

    const demandaHotel = {}; // key: `${vueloRecursoId}|${tipoHabitacion}`
    const demandaTrans = {}; // key: vueloRecursoId
    const demandaRest = {}; // key: vueloRecursoId

    serviciosDemandados.forEach((s) => {
      if (s.tipoDetalle === "HOTEL") {
        const key = `${s.vueloRecursoId}|${s.tipoHabitacion}`;
        demandaHotel[key] = (demandaHotel[key] ?? 0) + s.cantidad;
      } else if (s.tipoDetalle === "TRANSPORTE") {
        demandaTrans[s.vueloRecursoId] =
          (demandaTrans[s.vueloRecursoId] ?? 0) + s.cantidad;
      } else if (s.tipoDetalle === "RESTAURANTE") {
        demandaRest[s.vueloRecursoId] =
          (demandaRest[s.vueloRecursoId] ?? 0) + s.cantidad;
      }
    });

    const CAMPO_DISP_HAB = {
      SIMPLE: "habitacionesSimples_Disponibles",
      DOBLE: "habitacionesDobles_Disponibles",
      MATRIMONIAL: "habitacionesMatrimoniales_Disponibles",
    };

    const problemasDisponibilidad = [];

    Object.entries(demandaHotel).forEach(([key, cantidad]) => {
      const [vueloRecursoId, tipo] = key.split("|");
      const h = hotelesFrescos.find(
        (x) => String(x.vueloRecursoId) === vueloRecursoId,
      );
      const disponible = h?.[CAMPO_DISP_HAB[tipo]] ?? 0;
      if (cantidad > disponible) {
        problemasDisponibilidad.push(
          `🏨 Habitación ${tipo.toLowerCase()}: necesitas ${cantidad}, quedan ${disponible} disponible${disponible !== 1 ? "s" : ""}.`,
        );
      }
    });

    Object.entries(demandaTrans).forEach(([vueloRecursoId, cantidad]) => {
      const t = transportesFrescos.find(
        (x) => String(x.vueloRecursoId) === vueloRecursoId,
      );
      const disponible = t?.capacidadDisponible ?? 0;
      if (cantidad > disponible) {
        problemasDisponibilidad.push(
          `🚌 Transporte: necesitas ${cantidad} pax, quedan ${disponible} disponible${disponible !== 1 ? "s" : ""}.`,
        );
      }
    });

    Object.entries(demandaRest).forEach(([vueloRecursoId, cantidad]) => {
      const r = restaurantesFrescos.find(
        (x) => String(x.vueloRecursoId) === vueloRecursoId,
      );
      const disponible = r?.capacidadDisponible ?? 0;
      if (cantidad > disponible) {
        problemasDisponibilidad.push(
          `🍽️ Restaurante: necesitas ${cantidad} cubiertos, quedan ${disponible} disponible${disponible !== 1 ? "s" : ""}.`,
        );
      }
    });

    if (problemasDisponibilidad.length) {
      showModal(
        "warning",
        "La disponibilidad cambió",
        `Otro agente reservó parte de estos recursos mientras completabas el formulario:\n\n${problemasDisponibilidad.join("\n")}\n\nAjusta las cantidades seleccionadas y vuelve a intentar.`,
      );
      return null;
    }

    /* Voucher grupal: un mismo grupoId para todas las atenciones de esta
     * ejecución, solo cuando hay más de un pasajero compartiendo datos. */
    const grupoId =
      datosCompartidosGrupo && validosConIdx.length > 1
        ? crypto.randomUUID()
        : null;

    const atencionIds = [];
    for (let idx = 0; idx < validosConIdx.length; idx++) {
      const { p: px, i } = validosConIdx[idx];
      const pnrFinal = datosCompartidosGrupo ? grupoPnr : px.pnr;
      const correoFinal = datosCompartidosGrupo ? grupoCorreo : px.correo;

      const res = await crearAt.mutateAsync({
        nombre: px.nombre.toUpperCase(),
        apellido: px.apellido.toUpperCase(),
        pnr: pnrFinal.toUpperCase(),
        correo: correoFinal,
        telefono: px.telefono?.trim() || null, // ← TWILIO: opcional, null si está vacío
        codigoBarras:
          !bpTexto.startsWith("data:image") && bpTexto ? bpTexto : null,
        fechaEmision,
        lugarEmision,
        vueloId: v?.id,
        registroVueloDiarioId: registro.id,
        grupoId, // ← NUEVO: enlaza las atenciones del mismo grupo (voucher grupal)
        firmaPasajero: firmaPasajero || null,
      });
      const atId = res.data.data?.id;

      /* Fix disponibilidad: cuando los servicios son COMPARTIDOS (!isSvInd),
       * asignarlos una sola vez — a la primera atención del grupo
       * (idx===0, la "titular") — evita descontar el mismo recurso una vez
       * POR CADA pasajero que lo comparte. */
      const debeAsignarServicios = isSvInd || idx === 0;
      if (debeAsignarServicios) {
        const svList = isSvInd ? buildServicios(i) : buildServicios();
        if (svList.length && atId) {
          await asignarSv.mutateAsync({
            atencionId: atId,
            registroId: registro.id,
            servicios: svList,
          });
          await refetchDisp();
        }
      }
      if (atId) atencionIds.push({ id: atId, correo: correoFinal });
    }
    return { atencionIds, total: validosConIdx.length, grupoId };
  };

  /* ── NUEVO: recolecta automáticamente los correos de aerolínea y
   * proveedores (hotel/transporte/restaurante) asignados, para
   * precargarlos como destinatarios CC (editable) en el modal de
   * confirmación + firma. ── */
  const construirCorreosAutomaticos = () => {
    const mapa = new Map(); // correo(lower) -> { correo, origen }

    const aerolineaNombre = (v?.aerolinea || "").trim().toLowerCase();
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

    const agregarProveedor = (rec, etiqueta) => {
      if (rec?.proveedorCorreo) {
        mapa.set(rec.proveedorCorreo.trim().toLowerCase(), {
          correo: rec.proveedorCorreo.trim(),
          origen: `${etiqueta}${rec.proveedorNombre ? ` (${rec.proveedorNombre})` : ""}`,
        });
      }
    };

    if (isSvInd) {
      pasajeros.forEach((p) => {
        agregarProveedor(p.hotelRec, "Hotel");
        agregarProveedor(p.transRec, "Transporte");
        agregarProveedor(p.restRec, "Restaurante");
      });
    } else {
      agregarProveedor(hotelRec, "Hotel");
      agregarProveedor(transRec, "Transporte");
      agregarProveedor(restRec, "Restaurante");
    }

    return Array.from(mapa.values()).map((x) => ({ ...x, activo: true }));
  };

  /* ── NUEVO: resumen legible de servicios asignados (para el modal de
   * confirmación). pxIdx=null usa los datos compartidos/globales; con
   * pxIdx se usan los datos propios de ese pasajero (isSvInd). ── */
  const resumenServiciosPara = (pxIdx = null) => {
    let sv = {};
    if (isSvInd && pxIdx !== null) sv = pasajeros[pxIdx] ?? {};

    const hRec = isSvInd && pxIdx !== null ? (sv.hotelRec ?? null) : _hotelRec;
    const sims = isSvInd && pxIdx !== null ? (sv.simples ?? 0) : _simples;
    const dobs = isSvInd && pxIdx !== null ? (sv.dobles ?? 0) : _dobles;
    const mats = isSvInd && pxIdx !== null ? (sv.matrim ?? 0) : _matrim;
    const svH = isSvInd && pxIdx !== null ? (sv.svHotel ?? {}) : _svHotel;
    const tRec = isSvInd && pxIdx !== null ? (sv.transRec ?? null) : _transRec;
    const cTrans = isSvInd && pxIdx !== null ? (sv.cantTrans ?? 1) : _cantTrans;
    const tTrans =
      isSvInd && pxIdx !== null ? (sv.tipoTrans ?? {}) : _tipoTrans;
    const rRec = isSvInd && pxIdx !== null ? (sv.restRec ?? null) : _restRec;
    const cRest = isSvInd && pxIdx !== null ? (sv.cantRest ?? 1) : _cantRest;
    const svR = isSvInd && pxIdx !== null ? (sv.svRest ?? {}) : _svRest;

    const lineas = [];
    if (hRec) {
      const habs = [
        sims > 0 ? `${sims} simple${sims > 1 ? "s" : ""}` : null,
        dobs > 0 ? `${dobs} doble${dobs > 1 ? "s" : ""}` : null,
        mats > 0 ? `${mats} matrimonial${mats > 1 ? "es" : ""}` : null,
      ].filter(Boolean);
      const comidas = [
        svH.desayuno && "desayuno",
        svH.almuerzo && "almuerzo",
        svH.snack && "snack",
        svH.cena && "cena",
      ].filter(Boolean);
      lineas.push(
        `🏨 ${hRec.proveedorNombre ?? "Hotel"}${habs.length ? `: ${habs.join(", ")}` : ""}${comidas.length ? ` — ${comidas.join(", ")}` : ""}`,
      );
    }
    if (tRec) {
      const tipoT = tTrans.individual
        ? "Individual"
        : tTrans.grupal
          ? "Grupal"
          : tTrans.ambos
            ? "Ambos"
            : "Individual";
      lineas.push(
        `🚌 ${tRec.proveedorNombre ?? "Transporte"}: ${tipoT} x${cTrans}`,
      );
    }
    if (rRec) {
      const comidas = [
        svR.desayuno && "desayuno",
        svR.almuerzo && "almuerzo",
        svR.cena && "cena",
      ].filter(Boolean);
      lineas.push(
        `🍽️ ${rRec.proveedorNombre ?? "Restaurante"}${comidas.length ? `: ${comidas.join(", ")}` : ""} x${cRest}`,
      );
    }
    return lineas;
  };

  const handleFirmar = () => {
    if (!firmaImagen) return;
    setFirmado(true);
  };

  const handleCambiarFirmaImagen = (dataUrl) => {
    setFirmaImagen(dataUrl);
    if (firmado) setFirmado(false); // si vuelve a dibujar después de firmar, resetea el check
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

  // ✅ AHORA — limpia también todos los servicios
  const resetForm = () => {
    setPasajeros([{ ...EMPTY_PX }]);
    setPxActivo(0);
    setBpTexto("");
    setHotelRec(null);
    setSimples(0);
    setDobles(0);
    setMatrim(0);
    setSvHotel({ desayuno: false, almuerzo: false, snack: false, cena: false });
    setTransRec(null);
    setCantTrans(1);
    setTipoTrans({ individual: false, grupal: false });
    setRestRec(null);
    setCantRest(1);
    setSvRest({ desayuno: false, almuerzo: false, cena: false });
    setFechaIngreso(HOY);
    setFechaSalida("");
    setGrupoPnr("");
    setGrupoCorreo("");
    setCompartirDatosGrupo(false);
  };

  /* ── Botón "Generar PDF" — solo genera y sube a S3 ── */
  const handleSoloGenerarPDF = async () => {
    try {
      const result = await registrarPasajeros();
      if (!result) return;
      const { atencionIds, total, grupoId } = result;

      if (datosCompartidosGrupo && grupoId && atencionIds.length > 1) {
        // ── Voucher grupal: UN solo PDF para todo el grupo ──
        await genPdfGrupal.mutateAsync({
          atencionIds: atencionIds.map(({ id }) => id),
          serviciosCompartidos: !isSvInd,
        });
      } else {
        // Generar PDF para cada atención (comportamiento original)
        for (const { id } of atencionIds) {
          await genPdf.mutateAsync(id);
        }
      }
      await refetchDisp();
      showModal(
        "success",
        "PDF Generado",
        `${total} pasajero${total !== 1 ? "s" : ""} registrado${total !== 1 ? "s" : ""}. El PDF se generó correctamente.`,
      );
      resetForm();
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "Error al registrar.",
      );
    }
  };

  /* ── NUEVO: confirma la firma digital, registra a los pasajeros y envía
   * el/los voucher(s), incluyendo copia a los correos automáticos/CC ── */
  const handleConfirmarFirmaYEnviar = async () => {
    if (!firmado || !firmaImagen) return;
    const modo = confirmEnvio.modo;
    const ccDestinos = correosCc.filter((c) => c.activo).map((c) => c.correo);
    const firmaFinal = firmaImagen; // data URL PNG (image/png;base64,...)

    if (modo === "grupal") {
      const correo = correoDestinoGrupal.trim();
      if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        showModal(
          "error",
          "Correo inválido",
          "Ingresa un correo electrónico válido.",
        );
        return;
      }
    }

    setEnviandoConfirm(true);
    setConfirmEnvio({ open: false, modo: null });
    try {
      const result = await registrarPasajeros(firmaFinal);
      if (!result) return;
      const { atencionIds, total, grupoId } = result;

      if (modo === "grupal") {
        const correo = correoDestinoGrupal.trim();
        if (grupoId && atencionIds.length > 1) {
          // ── Voucher grupal: UN solo PDF, UN solo correo para todo el grupo ──
          const resp = await genYEnviarGrupal.mutateAsync({
            atencionIds: atencionIds.map(({ id }) => id),
            correoDestino: correo,
            serviciosCompartidos: !isSvInd,
            ccDestinos,
            firmaPasajero: firmaFinal,
            idiomaVoucher, // ← NUEVO — idioma elegido en el modal
          });
        } else {
          // Un solo pasajero: comportamiento original (voucher individual)
          for (const { id } of atencionIds) {
            await genYEnviar.mutateAsync({
              id,
              correoDestino: correo,
              ccDestinos,
              firmaPasajero: firmaFinal,
              idiomaVoucher, // ← NUEVO — idioma elegido en el modal
            });
          }
        }
        showModal(
          "success",
          "PDF Enviado",
          `${total} pasajero${total !== 1 ? "s" : ""} registrado${total !== 1 ? "s" : ""}. El voucher fue enviado a ${correo}${ccDestinos.length ? ` (con copia a ${ccDestinos.length} correo${ccDestinos.length !== 1 ? "s" : ""} adicional${ccDestinos.length !== 1 ? "es" : ""})` : ""}.`,
        );
      } else {
        // ── Caso 2 / Caso 3: correo individual por pasajero ──
        for (const { id, correo: correoPx } of atencionIds) {
          await genYEnviar.mutateAsync({
            id,
            correoDestino: correoPx,
            ccDestinos,
            firmaPasajero: firmaFinal,
            idiomaVoucher, // ← NUEVO — idioma elegido en el modal
          });
        }
        showModal(
          "success",
          "Vouchers enviados",
          `${total} pasajero${total !== 1 ? "s" : ""} registrado${total !== 1 ? "s" : ""}. Cada PDF fue enviado al correo individual${ccDestinos.length ? `, con copia a ${ccDestinos.length} correo${ccDestinos.length !== 1 ? "s" : ""} adicional${ccDestinos.length !== 1 ? "es" : ""}` : ""}.`,
        );
      }
      await refetchDisp();
      resetForm();
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "Error al registrar o enviar.",
      );
    } finally {
      setEnviandoConfirm(false);
    }
  };

  const handleAbrirModalEnvio = async () => {
    const validos = pasajeros.filter((p) =>
      datosCompartidosGrupo
        ? p.nombre && p.apellido
        : p.nombre && p.apellido && p.pnr && p.correo,
    );
    if (!validos.length) {
      showModal(
        "error",
        "Sin pasajeros",
        "Completa los datos de al menos un pasajero.",
      );
      return;
    }
    if (datosCompartidosGrupo && (!grupoPnr || !grupoCorreo)) {
      showModal(
        "error",
        "Datos del grupo incompletos",
        "Ingresa el PNR y el correo compartidos por todo el grupo antes de enviar.",
      );
      return;
    }

    setCorreoDestinoGrupal(grupoCorreo || "");
    setCorreosCc(construirCorreosAutomaticos());
    setNuevoCorreoCc("");
    setFirmaImagen("");
    setFirmado(false);
    setIdiomaVoucher("ES"); // ← NUEVO — el modal siempre abre por defecto en Español
    setConfirmEnvio({
      open: true,
      modo: datosCompartidosGrupo ? "grupal" : "individual",
    });
  };

  /* ── Descargar PDF desde S3 ── */
  const handleDescargarPDF = async (atencionId) => {
    try {
      const res = await obtenerUrl.mutateAsync(atencionId);
      const { downloadUrl } = res.data;

      if (downloadUrl) {
        // Abrir URL firmada en nueva pestaña
        window.open(downloadUrl, "_blank");
      } else {
        showModal("error", "Error", "No se pudo generar URL de descarga");
      }
    } catch (err) {
      showModal(
        "error",
        "Error de descarga",
        err.response?.data?.message ?? "No se pudo descargar el PDF",
      );
    }
  };

  const loading =
    crearAt.isPending ||
    asignarSv.isPending ||
    genPdf.isPending ||
    genYEnviar.isPending ||
    genPdfGrupal.isPending ||
    genYEnviarGrupal.isPending ||
    enviandoConfirm;
  const pxCompletos = pasajeros.filter((p) =>
    datosCompartidosGrupo
      ? p.nombre && p.apellido
      : p.nombre && p.apellido && p.pnr && p.correo,
  ).length;
  const px = pasajeros[pxActivo];
  const setPx = (k, val) =>
    setPasajeros((prev) => {
      const c = [...prev];
      c[pxActivo] = { ...c[pxActivo], [k]: val };
      return c;
    });

  /* ── Disponibilidad numérica del hotel seleccionado ── */

  return (
    <div className={styles.page}>
      {/* ─── Header verde ─── */}
      <div className={styles.headerVerde}>
        <button className={styles.backBtn} onClick={onVolver}>
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className={styles.headerTitulo}>Registro de compensación</h1>
          <p className={styles.headerSub}>
            {v?.aerolinea ?? "Plus Ultra Airlines"}
          </p>
        </div>
      </div>

      {/* ─── 1. Información del Vuelo ─── */}
      <div className={styles.infoVuelo}>
        <div className={styles.infoVueloTitulo}>
          <Plane size={16} /> Información del Vuelo
        </div>
        <div className={styles.infoVueloGrid}>
          <div>
            <span className={styles.ivLabel}>Vuelo:</span>{" "}
            <span className={styles.ivVal}>
              {v?.codigoVuelo} · {v?.aerolinea}
            </span>
          </div>
          <div>
            <span className={styles.ivLabel}>Ruta:</span>{" "}
            <span className={styles.ivVal}>
              {v?.origen} → {v?.destino}
            </span>
          </div>
          <div>
            <span className={styles.ivLabel}>Fecha/Hora:</span>
            <span className={styles.ivVal}>
              {v?.fechaVuelo}
              {v?.horaVuelo ? ` · ${v.horaVuelo}` : v?.fechaVuelo ? "" : "—"}
            </span>
          </div>
          <div>
            <span className={styles.ivLabel}>Estado:</span>{" "}
            <Badge
              label={v?.tipoContingencia ?? "—"}
              variant={BADGE_MAP[v?.tipoContingencia] ?? "neutral"}
            />
          </div>
          <div>
            <span className={styles.ivLabel}>Obs. Vuelo:</span>{" "}
            <span className={styles.ivVal}>
              {v?.observaciones ? v.observaciones : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 2. Recursos Disponibles ─── */}
      <div className={styles.seccionCard}>
        <div className={styles.rcTitulo}>
          <Hotel size={16} /> Recursos Disponibles para Hoy
          <button
            className={styles.refetchBtn}
            onClick={handleSync}
            title="Sincronizar disponibilidad"
            disabled={syncing}
          >
            <RefreshCw size={13} className={syncing ? styles.spinning : ""} />
          </button>
        </div>
        <div className={styles.rcGrid}>
          {/* Hoteles */}
          <div className={styles.rcItem} style={{ borderColor: "#22c55e" }}>
            <div className={styles.rcHeader}>
              <Hotel size={20} color="#22c55e" />
              <span>Hoteles</span>
            </div>
            <span className={styles.rcNum} style={{ color: "#22c55e" }}>
              {recursosHotel.length}
            </span>
            <span className={styles.rcSub}>
              de {registro.totalHoteles ?? recursosHotel.length} disponibles
            </span>
            {recursosHotel.length > 0 && (
              <div className={styles.rcDetalle}>
                <span className={styles.rcDetalleLabel}>
                  Habitaciones disponibles:
                </span>
                {recursosHotel.map((h) => {
                  const d = getDispHotel(h);
                  const nombre = h.nombreProveedor ?? h.proveedorNombre;
                  const habTotal =
                    (h.habitacionesSimples ?? 0) +
                    (h.habitacionesDobles ?? 0) +
                    (h.habitacionesMatrimoniales ?? 0);
                  const habDisp = d?.totalDisponibles ?? habTotal;
                  const simD =
                    d?.habitacionesSimples_Disponibles ??
                    h.habitacionesSimples ??
                    0;
                  const dobD =
                    d?.habitacionesDobles_Disponibles ??
                    h.habitacionesDobles ??
                    0;
                  const matD =
                    d?.habitacionesMatrimoniales_Disponibles ??
                    h.habitacionesMatrimoniales ??
                    0;
                  return (
                    <div key={h.vueloRecursoId ?? h.id}>
                      <span className={styles.rcDetalleVal}>
                        <strong>{nombre}:</strong>{" "}
                        <strong className={styles.rcGreen}>
                          {habDisp}/{habTotal} disponibles
                        </strong>
                      </span>
                      <span className={styles.rcDetalleVal}>
                        &nbsp;&nbsp;S:{simD} &nbsp;D:{dobD} &nbsp;M:{matD}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* Transportes */}
          <div className={styles.rcItem} style={{ borderColor: "#3b82f6" }}>
            <div className={styles.rcHeader}>
              <Bus size={20} color="#3b82f6" />
              <span>Transportes</span>
            </div>
            <span className={styles.rcNum} style={{ color: "#3b82f6" }}>
              {recursosTransporte.length}
            </span>
            <span className={styles.rcSub}>
              de {registro.totalTransportes ?? recursosTransporte.length}{" "}
              disponibles
            </span>
            {recursosTransporte.map((t) => {
              const d = getDispTrans(t);
              return (
                <div
                  key={t.vueloRecursoId ?? t.id}
                  className={styles.rcDetalle}
                >
                  <span className={styles.rcDetalleVal}>
                    {t.nombreProveedor ?? t.proveedorNombre}:{" "}
                    <strong className={styles.rcBlue}>
                      {d?.capacidadDisponible ?? t.capacidadTotal ?? "—"}/
                      {d?.capacidadTotal ?? t.capacidadTotal ?? "—"}
                    </strong>{" "}
                    pax
                  </span>
                </div>
              );
            })}
          </div>
          {/* Restaurantes */}
          <div className={styles.rcItem} style={{ borderColor: "#f97316" }}>
            <div className={styles.rcHeader}>
              <UtensilsCrossed size={20} color="#f97316" />
              <span>Restaurantes</span>
            </div>
            <span className={styles.rcNum} style={{ color: "#f97316" }}>
              {recursosRest.length}
            </span>
            <span className={styles.rcSub}>
              de {registro.totalRestaurantes ?? recursosRest.length} disponibles
            </span>
            {recursosRest.map((r) => {
              const d = getDispRest(r);
              return (
                <div
                  key={r.vueloRecursoId ?? r.id}
                  className={styles.rcDetalle}
                >
                  <span className={styles.rcDetalleVal}>
                    {r.nombreProveedor ?? r.proveedorNombre}:{" "}
                    <strong className={styles.rcOrange}>
                      {d?.capacidadDisponible ?? r.capacidadTotal ?? "—"}/
                      {d?.capacidadTotal ?? r.capacidadTotal ?? "—"}
                    </strong>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* ─── 3. Captura de Boarding Pass ─── */}
      <div className={styles.seccionCard}>
        <div className={styles.bpSectionHeader}>
          <span className={styles.bpTitulo}>Captura de Boarding Pass</span>
          <div className={styles.bpModeTabs}>
            <button
              className={[
                styles.bpModeTab,
                !modoManual ? styles.bpModeTabActive : "",
              ].join(" ")}
              onClick={() => {
                setModoManual(false);
              }}
            >
              <Camera size={14} /> Escáner
            </button>
            <button
              className={[
                styles.bpModeTab,
                modoManual ? styles.bpModeTabActiveManual : "",
              ].join(" ")}
              onClick={() => {
                setModoManual(true);
                detenerCamara();
              }}
            >
              ✏️ Ingreso Manual
            </button>
          </div>
        </div>

        {/* ── Modo Escáner ── */}
        {!modoManual && (
          <div className={styles.bpScannerMode}>
            <div className={styles.bpBtns}>
              <button
                className={styles.bpBtn}
                onClick={camOn ? detenerCamara : iniciarCamara}
              >
                {camOn ? (
                  <>
                    <CameraOff size={14} /> Detener cámara
                  </>
                ) : (
                  <>
                    <Camera size={14} /> Activar cámara
                  </>
                )}
              </button>
              <button
                className={styles.bpBtn}
                onClick={() => inputImgRef.current?.click()}
                disabled={bpScanning}
              >
                {bpScanning ? <Spinner size="sm" /> : <Upload size={14} />}{" "}
                Subir Imagen
              </button>
              <input
                ref={inputImgRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleSubirImagen}
              />
            </div>

            {camOn && (
              <div className={styles.camWrap}>
                <video
                  ref={videoRef}
                  className={styles.camVideo}
                  autoPlay
                  playsInline
                  muted
                />
                {/* Indicador de escaneo activo */}
                <div className={styles.camScanning}>
                  <span className={styles.camScanLine} />
                  <p className={styles.camScanTip}>
                    📷 Apunta al código de barras — se detectará automáticamente
                  </p>
                </div>
              </div>
            )}
            <p className={styles.bpHint}>
              💡 Usa la cámara o sube una imagen del boarding pass para
              autocompletar los datos del pasajero.
            </p>
          </div>
        )}

        {/* ── Modo Manual ── */}
        {modoManual && (
          <div className={styles.bpManualMode}>
            <div className={styles.bpManualCard}>
              <div className={styles.bpManualCardHeader}>
                <div className={styles.bpManualIconWrap}>
                  <Users size={16} color="#16a34a" />
                </div>
                <div>
                  <p className={styles.bpManualCardTitle}>
                    Datos del Pasajero {pxActivo + 1}
                  </p>
                  <p className={styles.bpManualCardSub}>
                    {pasajeros.length > 1
                      ? `${pasajeros.length} pasajeros en total`
                      : "El primer pasajero se llena aquí"}
                  </p>
                </div>
              </div>

              {/* ── Tabs para navegar entre pasajeros ya agregados ──
               * Misma lógica que en "Emisión y Servicios": cambiar de pestaña
               * cambia pxActivo globalmente, así que el resto del formulario
               * (incluida la asignación de servicios) queda sincronizado. */}
              {pasajeros.length > 1 && (
                <div className={styles.pxTabs}>
                  {pasajeros.map((p, i) => (
                    <span key={i} className={styles.pxTabWrap}>
                      <button
                        type="button"
                        className={[
                          styles.pxTab,
                          i === pxActivo ? styles.pxTabActive : "",
                        ].join(" ")}
                        onClick={() => setPxActivo(i)}
                      >
                        Pasajero {i + 1}
                      </button>
                      <button
                        type="button"
                        className={styles.pxTabDeleteBtn}
                        title="Eliminar pasajero"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEliminarPx(i);
                        }}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Selector rápido: Grupal vs Independiente */}
              <div className={styles.bpManualModoSelector}>
                <button
                  type="button"
                  className={[
                    styles.modoEnvioTab,
                    modoEnvio === "un_correo" ? styles.modoEnvioTabActive : "",
                  ].join(" ")}
                  onClick={() => setModoEnvio("un_correo")}
                >
                  <span className={styles.modoEnvioTabLabel}>Grupal</span>
                  <span className={styles.modoEnvioTabSub}>
                    PNR y correo compartidos por todos
                  </span>
                </button>
                <button
                  type="button"
                  className={[
                    styles.modoEnvioTab,
                    modoEnvio !== "un_correo" ? styles.modoEnvioTabActive : "",
                  ].join(" ")}
                  onClick={() =>
                    setModoEnvio((prev) =>
                      prev === "un_correo" ? "correo_individual" : prev,
                    )
                  }
                >
                  <span className={styles.modoEnvioTabLabel}>
                    Independiente
                  </span>
                  <span className={styles.modoEnvioTabSub}>
                    Cada pasajero con su propio PNR y correo
                  </span>
                </button>
              </div>

              <div className={styles.bpManualGrid}>
                {/* Nombre completo — fila completa */}
                <div
                  className={[styles.bpManualField, styles.bpManualSpan2].join(
                    " ",
                  )}
                >
                  <label className={styles.bpManualLabel}>
                    Nombre Completo
                    <span className={styles.bpManualFmt}>
                      {" "}
                      · formato APELLIDO/NOMBRE
                    </span>
                  </label>
                  <input
                    className={styles.bpManualInput}
                    value={
                      px.nombreCompletoRaw ??
                      ([px.apellido, px.nombre].filter(Boolean).join("/") || "")
                    }
                    placeholder="PÉREZ/JUAN CARLOS"
                    onChange={(e) => {
                      const raw = e.target.value;
                      const parts = raw.split("/");
                      setPx("nombreCompletoRaw", raw);
                      setPx("apellido", parts[0] ?? "");
                      setPx(
                        "nombre",
                        parts.length > 1 ? parts.slice(1).join("/") : "",
                      );
                    }}
                    onBlur={() => {
                      const apellido = (px.apellido ?? "").trim().toUpperCase();
                      const nombre = (px.nombre ?? "").trim().toUpperCase();
                      const teniaSlash = (px.nombreCompletoRaw ?? "").includes(
                        "/",
                      );
                      setPx("apellido", apellido);
                      setPx("nombre", nombre);
                      setPx(
                        "nombreCompletoRaw",
                        teniaSlash || nombre
                          ? [apellido, nombre].join("/")
                          : apellido,
                      );
                    }}
                  />
                </div>

                {/* PNR/correo del GRUPO — solo cuando son compartidos */}
                {datosCompartidosGrupo && (
                  <>
                    <div className={styles.bpManualField}>
                      <label className={styles.bpManualLabel}>
                        PNR (grupo) *
                      </label>
                      <input
                        className={styles.bpManualInput}
                        value={grupoPnr}
                        maxLength={6}
                        onChange={(e) =>
                          setGrupoPnr(e.target.value.toUpperCase())
                        }
                        placeholder="WSVFKR"
                      />
                    </div>
                    <div className={styles.bpManualField}>
                      <label className={styles.bpManualLabel}>
                        Correo (grupo) *
                      </label>
                      <input
                        type="email"
                        className={styles.bpManualInput}
                        value={grupoCorreo}
                        onChange={(e) => setGrupoCorreo(e.target.value)}
                        placeholder="pasajero@ejemplo.com"
                      />
                    </div>
                  </>
                )}

                {/* PNR/correo INDIVIDUALES — solo cuando NO son compartidos */}
                {!datosCompartidosGrupo && (
                  <>
                    <div className={styles.bpManualField}>
                      <label className={styles.bpManualLabel}>PNR *</label>
                      <input
                        className={styles.bpManualInput}
                        value={px.pnr}
                        maxLength={6}
                        onChange={(e) =>
                          setPx("pnr", e.target.value.toUpperCase())
                        }
                        placeholder="WSVFKR"
                      />
                    </div>
                    <div className={styles.bpManualField}>
                      <label className={styles.bpManualLabel}>
                        Correo Electrónico *
                      </label>
                      <input
                        type="email"
                        className={styles.bpManualInput}
                        value={px.correo}
                        onChange={(e) => setPx("correo", e.target.value)}
                        placeholder="pasajero@ejemplo.com"
                      />
                    </div>
                  </>
                )}

                {/* Teléfono WhatsApp */}
                <div className={styles.bpManualField}>
                  <PhoneInput
                    label={
                      <>
                        Teléfono (WhatsApp)
                        <span
                          style={{
                            color: "var(--text-400)",
                            fontWeight: 400,
                            marginLeft: 4,
                          }}
                        >
                          — Opcional
                        </span>
                      </>
                    }
                    value={px.telefono}
                    onChange={(v) => setPx("telefono", v)}
                    helperText="Solo el número, sin el +51"
                  />
                </div>
              </div>

              {/* Indicador de completitud */}
              <div className={styles.bpManualStatus}>
                {[
                  {
                    ok: !!(px.apellido && px.nombre),
                    label: "Nombre",
                  },
                  ...(datosCompartidosGrupo
                    ? [
                        { ok: !!grupoPnr, label: "PNR (grupo)" },
                        { ok: !!grupoCorreo, label: "Correo (grupo)" },
                      ]
                    : [
                        { ok: !!px.pnr, label: "PNR" },
                        { ok: !!px.correo, label: "Correo" },
                      ]),
                ].map((item) => (
                  <span
                    key={item.label}
                    className={[
                      styles.bpManualStatusChip,
                      item.ok ? styles.bpManualStatusOk : "",
                    ].join(" ")}
                  >
                    {item.ok ? "✓" : "○"} {item.label}
                  </span>
                ))}
              </div>

              <button
                className={styles.agregarPxBtn}
                onClick={
                  datosCompartidosGrupo ? abrirModalPasajeros : handleAgregarPx
                }
              >
                <Users size={15} />
                {datosCompartidosGrupo
                  ? pasajeros.length > 1
                    ? `Editar pasajeros del grupo (${pasajeros.length - 1})`
                    : "Agregar pasajeros del grupo"
                  : "Agregar Siguiente Pasajero"}
              </button>
              <p className={styles.agregarPxNota}>
                {datosCompartidosGrupo
                  ? "* PNR y correo ya son compartidos por el grupo. Aquí solo agregas nombre, apellido y teléfono (opcional) de cada pasajero adicional."
                  : "* Complete nombre, PNR y correo, luego haga clic para agregar al siguiente pasajero."}
              </p>
            </div>
          </div>
        )}
      </div>
      {/* ─── 4. Registro de Pasajero ─── */}
      <div className={styles.seccionCard}>
        {/* Resumen del pasajero activo (solo escáner, para confirmar/editar) */}
        {!modoManual && (
          <div className={styles.subseccion}>
            <div className={styles.bpManualCardHeader}>
              <div className={styles.bpManualIconWrap}>
                <Users size={16} color="#16a34a" />
              </div>
              <div>
                <p className={styles.bpManualCardTitle}>
                  Datos del Pasajero {pxActivo + 1}
                </p>
                <p className={styles.bpManualCardSub}>
                  {pasajeros.length > 1
                    ? `${pasajeros.length} pasajeros en total`
                    : "El primer pasajero se llena aquí"}
                </p>
              </div>
            </div>

            {pasajeros.length > 1 && (
              <div className={styles.pxTabs}>
                {pasajeros.map((p, i) => (
                  <span key={i} className={styles.pxTabWrap}>
                    <button
                      type="button"
                      className={[
                        styles.pxTab,
                        i === pxActivo ? styles.pxTabActive : "",
                      ].join(" ")}
                      onClick={() => setPxActivo(i)}
                    >
                      Pasajero {i + 1}
                    </button>
                    <button
                      type="button"
                      className={styles.pxTabDeleteBtn}
                      title="Eliminar pasajero"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEliminarPx(i);
                      }}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* ── Selector rápido: Grupal vs Independiente (modo escáner) ──
             * Misma lógica y mismo look que el selector del modo manual:
             * ambos leen/escriben el mismo estado modoEnvio, así que
             * cambiar el modo acá se refleja también si el usuario luego
             * pasa a modo manual (y viceversa). Se muestra siempre, sin
             * depender de tener 2+ pasajeros escaneados. */}
            <div className={styles.bpManualModoSelector}>
              <button
                type="button"
                className={[
                  styles.modoEnvioTab,
                  modoEnvio === "un_correo" ? styles.modoEnvioTabActive : "",
                ].join(" ")}
                onClick={() => setModoEnvio("un_correo")}
              >
                <span className={styles.modoEnvioTabLabel}>Grupal</span>
                <span className={styles.modoEnvioTabSub}>
                  PNR y correo compartidos por todos
                </span>
              </button>
              <button
                type="button"
                className={[
                  styles.modoEnvioTab,
                  modoEnvio !== "un_correo" ? styles.modoEnvioTabActive : "",
                ].join(" ")}
                onClick={() =>
                  setModoEnvio((prev) =>
                    prev === "un_correo" ? "correo_individual" : prev,
                  )
                }
              >
                <span className={styles.modoEnvioTabLabel}>Independiente</span>
                <span className={styles.modoEnvioTabSub}>
                  Cada pasajero con su propio PNR y correo
                </span>
              </button>
            </div>
            <div className={styles.pxGrid}>
              <div className={[styles.pxField, styles.span2].join(" ")}>
                <label className={styles.pxLabel}>Nombre Completo *</label>
                <input
                  className={styles.pxInput}
                  value={
                    px.nombreCompletoRaw ??
                    ([px.apellido, px.nombre].filter(Boolean).join("/") || "")
                  }
                  placeholder="Nombre del pasajero"
                  onChange={(e) => {
                    const raw = e.target.value;
                    const p = raw.split("/");
                    setPx("nombreCompletoRaw", raw);
                    setPx("apellido", p[0] ?? "");
                    setPx("nombre", p.length > 1 ? p.slice(1).join("/") : "");
                  }}
                  onBlur={() => {
                    const apellido = (px.apellido ?? "").trim().toUpperCase();
                    const nombre = (px.nombre ?? "").trim().toUpperCase();
                    const teniaSlash = (px.nombreCompletoRaw ?? "").includes(
                      "/",
                    );
                    setPx("apellido", apellido);
                    setPx("nombre", nombre);
                    setPx(
                      "nombreCompletoRaw",
                      teniaSlash || nombre
                        ? [apellido, nombre].join("/")
                        : apellido,
                    );
                  }}
                />
              </div>

              {/* ── CAMBIO 2: PNR/Correo GRUPAL (no existía antes) ── */}
              {datosCompartidosGrupo && (
                <>
                  <div className={styles.pxField}>
                    <label className={styles.pxLabel}>PNR (grupo) *</label>
                    <input
                      className={styles.pxInput}
                      value={grupoPnr}
                      maxLength={6}
                      onChange={(e) =>
                        setGrupoPnr(e.target.value.toUpperCase())
                      }
                      placeholder="WSVFKR"
                    />
                  </div>
                  <div className={styles.pxField}>
                    <label className={styles.pxLabel}>Correo (grupo) *</label>
                    <input
                      type="email"
                      className={styles.pxInput}
                      value={grupoCorreo}
                      onChange={(e) => setGrupoCorreo(e.target.value)}
                      placeholder="pasajero@ejemplo.com"
                    />
                  </div>
                </>
              )}

              {!datosCompartidosGrupo && (
                <>
                  <div className={styles.pxField}>
                    <label className={styles.pxLabel}>PNR *</label>
                    <input
                      className={styles.pxInput}
                      value={px.pnr}
                      maxLength={6}
                      onChange={(e) =>
                        setPx("pnr", e.target.value.toUpperCase())
                      }
                      placeholder="WSVFKR"
                    />
                  </div>
                  <div className={styles.pxField}>
                    <label className={styles.pxLabel}>
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      className={styles.pxInput}
                      value={px.correo}
                      onChange={(e) => setPx("correo", e.target.value)}
                      placeholder="pasajero@ejemplo.com"
                    />
                  </div>
                </>
              )}

              <PhoneInput
                label={
                  <>
                    Teléfono (WhatsApp)
                    <span
                      style={{
                        color: "var(--text-400)",
                        fontWeight: 400,
                        marginLeft: 4,
                      }}
                    >
                      — Opcional
                    </span>
                  </>
                }
                value={px.telefono}
                onChange={(v) => setPx("telefono", v)}
                helperText="Solo el número, sin el +51"
              />
            </div>
            <button
              className={styles.agregarPxBtn}
              onClick={
                datosCompartidosGrupo ? abrirModalPasajeros : handleAgregarPx
              }
            >
              <Users size={15} />
              {datosCompartidosGrupo
                ? pasajeros.length > 1
                  ? `Editar pasajeros del grupo (${pasajeros.length - 1})`
                  : "Agregar pasajeros del grupo"
                : "Agregar Siguiente Pasajero"}
            </button>
            <p className={styles.agregarPxNota}>
              {datosCompartidosGrupo
                ? "* PNR y correo ya son compartidos por el grupo. Aquí solo agregas nombre, apellido y teléfono (opcional) de cada pasajero adicional."
                : "* Complete nombre, PNR y email, luego escanee o ingrese al siguiente pasajero."}
            </p>
          </div>
        )}

        {/* Emisión */}
        <div className={styles.subseccion}>
          <h3 className={styles.subseccionTitulo}>Información de Emisión</h3>
          <div className={styles.emisionGrid}>
            <div className={styles.pxField}>
              <label className={styles.pxLabel}>Fecha de Emisión *</label>
              <input
                type="date"
                className={styles.pxInput}
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
              />
            </div>
            <div className={styles.pxField}>
              <label className={styles.pxLabel}>Lugar de Emisión *</label>
              <input
                className={styles.pxInput}
                value={lugarEmision}
                onChange={(e) => setLugarEmision(e.target.value.toUpperCase())}
                placeholder="LIM"
              />
            </div>
          </div>
        </div>

        {/* ─── Selector de modo (solo con 2+ pasajeros) ─── */}
        {pasajeros.length > 1 && (
          <div className={styles.modoEnvioCard}>
            <p className={styles.modoEnvioLabel}>Modo de asignación y envío:</p>
            <div className={styles.modoEnvioTabs}>
              {[
                {
                  id: "un_correo",
                  label: "Un correo",
                  sub: "Mismos servicios · un destino",
                },
                {
                  id: "correo_individual",
                  label: "Correo individual",
                  sub: "Mismos servicios · correo de cada pasajero",
                },
                {
                  id: "servicios_independientes",
                  label: "Servicios independientes",
                  sub: "Servicios distintos · correo de cada pasajero",
                },
              ].map((m) => (
                <button
                  key={m.id}
                  className={[
                    styles.modoEnvioTab,
                    modoEnvio === m.id ? styles.modoEnvioTabActive : "",
                  ].join(" ")}
                  onClick={() => setModoEnvio(m.id)}
                >
                  <span className={styles.modoEnvioTabLabel}>{m.label}</span>
                  <span className={styles.modoEnvioTabSub}>{m.sub}</span>
                </button>
              ))}
            </div>
            {modoEnvio === "servicios_independientes" && (
              <>
                <label className={styles.compartirGrupoToggle}>
                  <input
                    type="checkbox"
                    checked={compartirDatosGrupo}
                    onChange={(e) => setCompartirDatosGrupo(e.target.checked)}
                  />
                  PNR y correo compartidos para todo el grupo (cada pasajero
                  mantiene sus propios servicios)
                </label>
                <p className={styles.modoEnvioNota}>
                  📌 Asignando servicios para{" "}
                  <strong>
                    Pasajero {pxActivo + 1}
                    {!compartirDatosGrupo && pasajeros[pxActivo]?.pnr
                      ? ` · ${pasajeros[pxActivo].pnr}`
                      : ""}
                  </strong>
                  . Cambia de pestaña arriba para asignar servicios a otro
                  pasajero.
                </p>
              </>
            )}
          </div>
        )}
        {/* ─── Asignación de Servicios ─── */}
        <div className={styles.subseccion}>
          <h3 className={styles.subseccionTitulo}>
            Asignación de Servicios
            {isSvInd && pasajeros.length > 1 && (
              <span className={styles.svIndTag}>Pasajero {pxActivo + 1}</span>
            )}
          </h3>

          {/* HOTEL — fuente: recursosHotel (lo que el líder habilitó) */}
          <div className={styles.svBloque}>
            <label className={styles.svBloqueLabel}>Hotel</label>
            {recursosHotel.length === 0 ? (
              <div className={styles.svVacio}>
                <Hotel size={14} /> Sin hotel asignado para este vuelo
              </div>
            ) : (
              <ResourceCombobox
                recursos={recursosHotel}
                selected={_hotelRec}
                getDisp={getDispHotel}
                Icon={Hotel}
                colorActive="#22c55e"
                placeholder="Seleccione hotel..."
                buildLabel={(h) => {
                  const d = getDispHotel(h);
                  const nombre = h.nombreProveedor ?? h.proveedorNombre;
                  const habTotal =
                    (h.habitacionesSimples ?? 0) +
                    (h.habitacionesDobles ?? 0) +
                    (h.habitacionesMatrimoniales ?? 0);
                  const habDisp = d?.totalDisponibles ?? habTotal;
                  return `${nombre} (${habDisp}/${habTotal} habitaciones disponibles)`;
                }}
                onSelect={(h) => {
                  if (!h) {
                    _setHotelRec(null);
                    return;
                  }
                  const rid = h.vueloRecursoId ?? h.id;
                  const d = getDispHotel(h);
                  const simplesDisp =
                    d?.habitacionesSimples_Disponibles ??
                    h.habitacionesSimples ??
                    0;
                  _setHotelRec({
                    ...h,
                    vueloRecursoId: rid,
                    habitacionesSimples_Disponibles: simplesDisp,
                    habitacionesDobles_Disponibles:
                      d?.habitacionesDobles_Disponibles ??
                      h.habitacionesDobles ??
                      0,
                    habitacionesMatrimoniales_Disponibles:
                      d?.habitacionesMatrimoniales_Disponibles ??
                      h.habitacionesMatrimoniales ??
                      0,
                  });
                  _setSimples(Math.min(1, simplesDisp)); //Default 1 simple al seleccionar
                }}
              />
            )}

            {_hotelRec && (
              <div className={styles.hotelDetalle}>
                {/* ── FECHAS CHECK-IN / CHECK-OUT ── */}
                <p className={styles.hotelDetalleTitulo}>Fechas de estadía:</p>
                <div className={styles.emisionGrid}>
                  <div className={styles.pxField}>
                    <label className={styles.pxLabel}>📅 Check-in *</label>
                    <input
                      type="date"
                      className={styles.pxInput}
                      value={_fechaIngreso}
                      min={HOY}
                      onChange={(e) => _setFechaIngreso(e.target.value)}
                    />
                  </div>
                  <div className={styles.pxField}>
                    <label className={styles.pxLabel}>📅 Check-out *</label>
                    <input
                      type="date"
                      className={styles.pxInput}
                      value={_fechaSalida}
                      min={_fechaIngreso || HOY}
                      onChange={(e) => _setFechaSalida(e.target.value)}
                    />
                  </div>
                </div>
                <p className={styles.hotelDetalleTitulo}>
                  Seleccionar Tipo y Cantidad de Habitaciones
                </p>
                <div className={styles.stepperGrid}>
                  <Stepper
                    label="Simples"
                    disponibles={_hotelRec.habitacionesSimples_Disponibles ?? 0}
                    value={_simples}
                    onChange={_setSimples}
                  />
                  <Stepper
                    label="Dobles"
                    disponibles={_hotelRec.habitacionesDobles_Disponibles ?? 0}
                    value={_dobles}
                    onChange={_setDobles}
                  />
                  <Stepper
                    label="Matrimoniales"
                    disponibles={
                      _hotelRec.habitacionesMatrimoniales_Disponibles ?? 0
                    }
                    value={_matrim}
                    onChange={_setMatrim}
                  />
                </div>
                {mostrarAvisoDoble && (
                  <div className={styles.dobleAvisoBox}>
                    <input
                      type="checkbox"
                      id="omitirValidacionDoble"
                      checked={omitirValidacionDoble}
                      onChange={(e) =>
                        setOmitirValidacionDoble(e.target.checked)
                      }
                      className={styles.dobleAvisoCheckbox}
                    />
                    <label
                      htmlFor="omitirValidacionDoble"
                      className={styles.dobleAvisoLabel}
                    >
                      ⚠️ Habitación doble solo para 1 persona — omitir
                      validación de 2 pasajeros por habitación
                    </label>
                  </div>
                )}

                {mostrarAvisoMatrim && (
                  <div className={styles.dobleAvisoBox}>
                    <input
                      type="checkbox"
                      id="omitirValidacionMatrim"
                      checked={omitirValidacionMatrim}
                      onChange={(e) =>
                        setOmitirValidacionMatrim(e.target.checked)
                      }
                      className={styles.dobleAvisoCheckbox}
                    />
                    <label
                      htmlFor="omitirValidacionMatrim"
                      className={styles.dobleAvisoLabel}
                    >
                      ⚠️ Habitación matrimonial solo para 1 persona — omitir
                      validación de 2 pasajeros por habitación
                    </label>
                  </div>
                )}
                <p className={styles.hotelDetalleTitulo}>
                  Servicios del Hotel:
                </p>
                <div className={styles.chkGrid}>
                  <Chk
                    checked={_svHotel.desayuno}
                    onChange={(v) =>
                      _setSvHotel((s) => ({ ...s, desayuno: v }))
                    }
                    label="Desayuno"
                    color="#22c55e"
                  />
                  <Chk
                    checked={_svHotel.almuerzo}
                    onChange={(v) =>
                      _setSvHotel((s) => ({ ...s, almuerzo: v }))
                    }
                    label="Almuerzo / Comida"
                    color="#22c55e"
                  />
                  <Chk
                    checked={_svHotel.snack}
                    onChange={(v) => _setSvHotel((s) => ({ ...s, snack: v }))}
                    label="Snack"
                    color="#22c55e"
                  />
                  <Chk
                    checked={_svHotel.cena}
                    onChange={(v) => _setSvHotel((s) => ({ ...s, cena: v }))}
                    label="Cena"
                    color="#22c55e"
                  />
                </div>
              </div>
            )}
          </div>

          {/* TRANSPORTE */}
          <div className={styles.svBloque}>
            <label className={styles.svBloqueLabel}>Transporte</label>
            {recursosTransporte.length === 0 ? (
              <div className={styles.svVacio}>
                <Bus size={14} /> Sin transporte asignado para este vuelo
              </div>
            ) : (
              <ResourceCombobox
                recursos={recursosTransporte}
                selected={_transRec}
                getDisp={getDispTrans}
                Icon={Bus}
                colorActive="#3b82f6"
                placeholder="Seleccione transporte..."
                buildLabel={(t) => {
                  const d = getDispTrans(t);
                  const nombre = t.nombreProveedor ?? t.proveedorNombre;
                  const disp =
                    d?.capacidadDisponible ?? t.capacidadTotal ?? "—";
                  const total = d?.capacidadTotal ?? t.capacidadTotal ?? "—";
                  return `${nombre} (${disp}/${total} pax disponibles)`;
                }}
                onSelect={(t) =>
                  _setTransRec(
                    t
                      ? { ...t, vueloRecursoId: t.vueloRecursoId ?? t.id }
                      : null,
                  )
                }
              />
            )}

            {_transRec && (
              <div className={styles.transDetalle}>
                <p className={styles.hotelDetalleTitulo}>Tipo de Transporte:</p>
                <div className={styles.chkGrid3}>
                  <Chk
                    checked={_tipoTrans.individual}
                    onChange={(v) =>
                      _setTipoTrans(() => ({
                        individual: v,
                        grupal: v ? false : _tipoTrans.grupal,
                        ambos: v ? false : _tipoTrans.ambos,
                      }))
                    }
                    label="Aeropuerto - Domicilio"
                    color="#3b82f6"
                  />
                  <Chk
                    checked={_tipoTrans.grupal}
                    onChange={(v) =>
                      _setTipoTrans(() => ({
                        grupal: v,
                        individual: v ? false : _tipoTrans.individual,
                        ambos: v ? false : _tipoTrans.ambos,
                      }))
                    }
                    label="Domicilio - Aeropuerto"
                    color="#3b82f6"
                  />
                  <Chk
                    checked={_tipoTrans.ambos}
                    onChange={(v) =>
                      _setTipoTrans(() => ({
                        ambos: v,
                        individual: v ? false : _tipoTrans.individual,
                        grupal: v ? false : _tipoTrans.grupal,
                      }))
                    }
                    label="Ambos"
                    color="#3b82f6"
                  />
                </div>
                {/* FIX #3: Stepper de cantidad de pasajeros en transporte */}
                {(_tipoTrans.individual ||
                  _tipoTrans.grupal ||
                  _tipoTrans.ambos) &&
                  (() => {
                    const d = getDispTrans(_transRec);
                    const cap =
                      d?.capacidadDisponible ?? _transRec?.capacidadTotal ?? 0;
                    return (
                      <Stepper
                        label={
                          _tipoTrans.individual
                            ? "Pasajeros (Aeropuerto - Domicilio)"
                            : _tipoTrans.grupal
                              ? "Pasajeros (Domicilio - Aeropuerto)"
                              : "Pasajeros (ambos tramos)"
                        }
                        disponibles={cap}
                        value={_cantTrans}
                        onChange={_setCantTrans}
                      />
                    );
                  })()}
              </div>
            )}
          </div>

          {/* RESTAURANTE */}
          <div className={styles.svBloque}>
            <label className={styles.svBloqueLabel}>Restaurante</label>
            {recursosRest.length === 0 ? (
              <div className={styles.svVacio}>
                <UtensilsCrossed size={14} /> Sin restaurante asignado para este
                vuelo
              </div>
            ) : (
              <ResourceCombobox
                recursos={recursosRest}
                selected={_restRec}
                getDisp={getDispRest}
                Icon={UtensilsCrossed}
                colorActive="#f97316"
                placeholder="Seleccione restaurante"
                buildLabel={(r) => {
                  const d = getDispRest(r);
                  const nombre = r.nombreProveedor ?? r.proveedorNombre;
                  const disp =
                    d?.capacidadDisponible ?? r.capacidadTotal ?? "—";
                  const total = d?.capacidadTotal ?? r.capacidadTotal ?? "—";
                  return `${nombre} (${disp}/${total} cubiertos disponibles)`;
                }}
                onSelect={(r) =>
                  _setRestRec(
                    r
                      ? { ...r, vueloRecursoId: r.vueloRecursoId ?? r.id }
                      : null,
                  )
                }
              />
            )}

            {_restRec && (
              <div className={styles.restDetalle}>
                <p className={styles.hotelDetalleTitulo}>
                  Servicios del Restaurante:
                </p>
                {/* FIX #4: Stepper de cubiertos */}
                {(() => {
                  const d = getDispRest(_restRec);
                  const cap =
                    d?.capacidadDisponible ?? _restRec?.capacidadTotal ?? 0;
                  return (
                    <Stepper
                      label="Cantidad de pasajeros"
                      disponibles={cap}
                      value={_cantRest}
                      onChange={_setCantRest}
                    />
                  );
                })()}
                <div
                  className={styles.chkGrid}
                  // style={{ gridTemplateColumns: "repeat(3,1fr)" }}
                >
                  <Chk
                    checked={_svRest.desayuno}
                    onChange={(v) => _setSvRest((s) => ({ ...s, desayuno: v }))}
                    label="Desayuno"
                    emoji="🌅"
                    color="#f97316"
                  />
                  <Chk
                    checked={_svRest.almuerzo}
                    onChange={(v) => _setSvRest((s) => ({ ...s, almuerzo: v }))}
                    label="Almuerzo"
                    emoji="😋"
                    color="#f97316"
                  />
                  <Chk
                    checked={_svRest.cena}
                    onChange={(v) => _setSvRest((s) => ({ ...s, cena: v }))}
                    label="Cena"
                    emoji="🌙"
                    color="#f97316"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Botones finales (imagen 9: azul y verde) ─── */}
        <div className={styles.accionesGrid}>
          <button
            className={styles.btnPdf}
            onClick={handleSoloGenerarPDF}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : <FileDown size={16} />}
            Generar PDF ({pxCompletos} pasajero{pxCompletos !== 1 ? "s" : ""})
          </button>
          <button
            className={styles.btnEnviar}
            onClick={handleAbrirModalEnvio}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : <Send size={16} />}
            {datosCompartidosGrupo
              ? "Generar PDF y Enviar"
              : "Generar PDF y Enviar (individual)"}
          </button>
        </div>
      </div>

      {/* ─── Atenciones previas ─── */}
      {atencionesPrev.length > 0 && (
        <div className={styles.seccionCard}>
          <h3 className={styles.subseccionTitulo}>
            <Users size={15} /> Pasajeros ya atendidos ({atencionesPrev.length})
          </h3>
          <div className={styles.atencionesLista}>
            {atencionesPrev.map((a) => (
              <div key={a.id} className={styles.atencionItem}>
                <span>
                  <strong>
                    {a.apellido}, {a.nombre}
                  </strong>
                </span>
                <span className={styles.pnrTag}>PNR: {a.pnr}</span>
                <Badge
                  label={a.estado ?? "ATENDIDO"}
                  variant={a.estado === "ANULADO" ? "danger" : "success"}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <InfoModal
        open={modal.open}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />

      {/* ─── Modal: agregar/editar varios pasajeros de una vez ─── */}
      {pxModalOpen && (
        <div className={styles.emailModalOverlay}>
          <div className={styles.pxModalBox}>
            <h3 className={styles.emailModalTitle}>
              <Users size={17} /> Agregar / editar pasajeros
            </h3>
            <p className={styles.emailModalDesc}>
              El Pasajero 1 se edita en la tarjeta principal. Aquí agregas,
              editas o eliminas al resto — todos de una sola vez.
            </p>

            <div className={styles.pxModalRows}>
              {pxModalDraft.map((p, idx) => (
                <div key={idx} className={styles.pxModalRow}>
                  <span className={styles.pxModalRowNum}>{idx + 2}</span>

                  <div className={styles.pxModalRowFields}>
                    <input
                      className={styles.bpManualInput}
                      placeholder="Apellido"
                      value={p.apellido}
                      onChange={(e) =>
                        handleModalCampoChange(
                          idx,
                          "apellido",
                          e.target.value.toUpperCase(),
                        )
                      }
                    />
                    <input
                      className={styles.bpManualInput}
                      placeholder="Nombre"
                      value={p.nombre}
                      onChange={(e) =>
                        handleModalCampoChange(
                          idx,
                          "nombre",
                          e.target.value.toUpperCase(),
                        )
                      }
                    />

                    {!datosCompartidosGrupo && (
                      <>
                        <input
                          className={styles.bpManualInput}
                          placeholder="PNR"
                          maxLength={6}
                          value={p.pnr}
                          onChange={(e) =>
                            handleModalCampoChange(
                              idx,
                              "pnr",
                              e.target.value.toUpperCase(),
                            )
                          }
                        />
                        <input
                          className={styles.bpManualInput}
                          type="email"
                          placeholder="Correo"
                          value={p.correo}
                          onChange={(e) =>
                            handleModalCampoChange(
                              idx,
                              "correo",
                              e.target.value,
                            )
                          }
                        />
                      </>
                    )}

                    <PhoneInput
                      value={p.telefono}
                      onChange={(v) =>
                        handleModalCampoChange(idx, "telefono", v)
                      }
                      placeholder="987654321 (opcional)"
                    />
                  </div>

                  <button
                    type="button"
                    className={styles.pxModalRowDelete}
                    title="Eliminar esta fila"
                    onClick={() => handleModalEliminarFila(idx)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className={styles.pxModalAgregarFila}
              onClick={handleModalAgregarFila}
            >
              <Users size={14} /> Agregar otra fila
            </button>

            <div className={styles.emailModalActions}>
              <button
                className={styles.emailModalCancel}
                onClick={() => setPxModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                className={styles.emailModalConfirm}
                onClick={handleModalGuardar}
              >
                Guardar (
                {pxModalDraft.filter((p) => p.nombre || p.apellido).length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal correo destino para "Generar y Enviar" ─── */}
      {confirmEnvio.open && (
        <div className={styles.emailModalOverlay}>
          <div
            className={[styles.emailModalBox, styles.confirmEnvioBox].join(" ")}
          >
            <h3 className={styles.emailModalTitle}>
              <Send size={17} /> Confirmar y Enviar Voucher
            </h3>
            <p className={styles.emailModalDesc}>
              Revisa los datos antes de enviar. El pasajero debe firmar
              digitalmente confirmando que está de acuerdo con las asignaciones
              de servicios brindadas.
            </p>

            {/* Resumen de pasajeros y servicios asignados */}
            <div className={styles.confirmResumen}>
              {pasajeros
                .map((p, i) => ({ p, i }))
                .filter(({ p }) =>
                  datosCompartidosGrupo
                    ? p.nombre && p.apellido
                    : p.nombre && p.apellido && p.pnr && p.correo,
                )
                .map(({ p, i }) => (
                  <div key={i} className={styles.confirmResumenItem}>
                    <div className={styles.confirmResumenPx}>
                      <strong>
                        {p.apellido}, {p.nombre}
                      </strong>
                      <span className={styles.confirmResumenPnr}>
                        PNR: {datosCompartidosGrupo ? grupoPnr : p.pnr} ·
                        Correo: {datosCompartidosGrupo ? grupoCorreo : p.correo}
                      </span>
                    </div>
                    <div className={styles.confirmResumenSv}>
                      {resumenServiciosPara(isSvInd ? i : null).map(
                        (linea, idx) => (
                          <span key={idx}>{linea}</span>
                        ),
                      )}
                      {!resumenServiciosPara(isSvInd ? i : null).length && (
                        <span className={styles.confirmSinServicios}>
                          Sin servicios asignados
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* Correo destino principal (solo modo grupal / correo compartido) */}
            {confirmEnvio.modo === "grupal" && (
              <div className={styles.confirmSeccion}>
                <label className={styles.confirmLabel}>
                  Correo destinatario (pasajero)
                </label>
                <input
                  className={styles.emailModalInput}
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={correoDestinoGrupal}
                  onChange={(e) => setCorreoDestinoGrupal(e.target.value)}
                />
              </div>
            )}

            {/* Correos adicionales: aerolínea + proveedores (auto, editable) */}
            <div className={styles.confirmSeccion}>
              <label className={styles.confirmLabel}>
                <Mail size={14} /> Copia a aerolínea / proveedores
              </label>
              {!correosCc.length ? (
                <p className={styles.confirmCcVacio}>
                  No hay correos parametrizados para esta aerolínea o los
                  proveedores asignados. Puedes agregar uno manualmente, o
                  cárgalos en Administrador → Correos de Aerolíneas.
                </p>
              ) : (
                <div className={styles.confirmCcLista}>
                  {correosCc.map((c) => (
                    <label key={c.correo} className={styles.confirmCcItem}>
                      <input
                        type="checkbox"
                        checked={c.activo}
                        onChange={() => handleToggleCorreoCc(c.correo)}
                      />
                      <span className={styles.confirmCcCorreo}>{c.correo}</span>
                      <span className={styles.confirmCcOrigen}>{c.origen}</span>
                      <button
                        type="button"
                        className={styles.confirmCcEliminar}
                        onClick={() => handleEliminarCorreoCc(c.correo)}
                        title="Quitar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </label>
                  ))}
                </div>
              )}
              <div className={styles.confirmCcAgregar}>
                <input
                  className={styles.emailModalInput}
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
                  className={styles.confirmCcAddBtn}
                  onClick={handleAgregarCorreoCc}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* NUEVO — Idioma del voucher a generar (ES/EN) */}
            <div className={styles.confirmSeccion}>
              <label className={styles.confirmLabel}>
                <Globe size={14} /> Idioma del voucher
              </label>
              <div className={styles.radioGroup}>
                {["ES", "EN"].map((idi) => (
                  <label
                    key={idi}
                    className={[
                      styles.radioBtn,
                      idiomaVoucher === idi ? styles.radioBtnActive : "",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      value={idi}
                      checked={idiomaVoucher === idi}
                      onChange={() => setIdiomaVoucher(idi)}
                      disabled={enviandoConfirm}
                      style={{ display: "none" }}
                    />
                    {idi === "ES" ? "Español" : "English"}
                  </label>
                ))}
              </div>
            </div>

            {/* Firma digital de conformidad */}
            <div className={styles.confirmSeccion}>
              <label className={styles.confirmLabel}>
                <PenTool size={14} /> Firma digital de conformidad
              </label>

              <p className={styles.confirmFirmaDesc}>
                El pasajero debe dibujar su firma en el recuadro y presionar
                "Firmar" para confirmar que está de acuerdo con las asignaciones
                brindadas.
              </p>
              <SignatureCanvas
                value={firmaImagen}
                onChange={handleCambiarFirmaImagen}
                disabled={firmado}
              />
              <div className={styles.confirmFirmaAccionRow}>
                {!firmado ? (
                  <button
                    type="button"
                    className={styles.confirmFirmarBtn}
                    onClick={handleFirmar}
                    disabled={!firmaImagen}
                  >
                    Firmar
                  </button>
                ) : (
                  <span className={styles.confirmFirmadoCheck}>
                    <CheckCircle2 size={18} /> Firmado
                  </span>
                )}
              </div>
            </div>

            <div className={styles.emailModalActions}>
              <button
                className={styles.emailModalCancel}
                onClick={() => {
                  setConfirmEnvio({ open: false, modo: null });
                  setIdiomaVoucher("ES"); // ← NUEVO — resetear idioma al cancelar
                }}
                disabled={enviandoConfirm}
              >
                Cancelar
              </button>
              <button
                className={styles.emailModalConfirm}
                onClick={handleConfirmarFirmaYEnviar}
                disabled={
                  !firmado ||
                  enviandoConfirm ||
                  (confirmEnvio.modo === "grupal" &&
                    !correoDestinoGrupal.trim())
                }
              >
                <Send size={14} />{" "}
                {enviandoConfirm ? "Enviando..." : "Confirmar y Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════
   RAÍZ
   ════════════════════════════ */
export default function AgenteAtencionPage() {
  const { data: registros = [], isLoading } = useRegistrosHoy();
  const [registroSel, setRegistroSel] = useState(null);
  const { setVueloSeleccionado } = useAgenteAtencion();

  // Avisa al Sidebar si ya se seleccionó un vuelo (para mostrar/ocultar
  // el ítem "Carga masiva (Excel)"). Se limpia al desmontar la página.
  useEffect(() => {
    setVueloSeleccionado(!!registroSel);
    return () => setVueloSeleccionado(false);
  }, [registroSel, setVueloSeleccionado]);

  return registroSel ? (
    <FormularioAtencion
      registro={registroSel}
      onVolver={() => setRegistroSel(null)}
    />
  ) : (
    <SeleccionVuelo
      registros={registros}
      loading={isLoading}
      onSeleccionar={setRegistroSel}
    />
  );
}
