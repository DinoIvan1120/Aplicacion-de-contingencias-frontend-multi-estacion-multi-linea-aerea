import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  ArrowLeft,
  Edit2,
  Download,
  Send,
  Save,
  X,
  Hotel,
  Bus,
  UtensilsCrossed,
  FileText,
  CheckSquare,
  Square,
  Plus,
  Minus,
} from "lucide-react";
import {
  useReporteDetalle,
  useActualizarServicios,
  useActualizarPasajero,
  useRegenerarPdf,
  useDescargarActualizado, // ← AGREGAR
} from "../../hooks/useReportes";
import {
  useObtenerUrlDescarga,
  useDisponibilidad,
} from "../../hooks/useAtenciones"; // ← AGREGAR
import { useProveedores } from "../../hooks/useProveedores";
import { formatearMonto, formatearFecha } from "../../utils/formatters";
import Badge from "../../components/ui/Badge.jsx";
import { getRolLabel } from "../../utils/roleUtils";
import InfoModal from "../../components/ui/InfoModal.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import styles from "./ReporteDetallePage.module.css";

const fmt = (v) => formatearMonto(v ?? 0);

/* ── NUEVO: traduce el rol real (origenFirmaRol) de quien autorizó una
   carga masiva al texto mostrado en la tarjeta de firma. Si el backend
   aún no envía el rol (registros previos a este cambio), cae a
   "agente" como antes. ── */
function etiquetaRolFirma(rol) {
  switch (rol) {
    case "ADMINISTRADOR":
      return "administrador";
    case "LIDER_SAASA":
      return "líder";
    case "AGENTE_SAASA":
      return "agente";
    default:
      return "agente";
  }
}

/* ── Checkbox toggle ── */
function Chk({ checked, onChange, label, color = "#7C3AED" }) {
  return (
    <button
      className={[styles.chkBtn, checked ? styles.chkBtnActive : ""].join(" ")}
      style={checked ? { borderColor: color, background: `${color}12` } : {}}
      onClick={() => onChange(!checked)}
    >
      {checked ? (
        <CheckSquare size={15} color={color} />
      ) : (
        <Square size={15} color="var(--text-400)" />
      )}
      <span>{label}</span>
    </button>
  );
}

/* ── Stepper ── */
function Stepper({ label, value, onChange, min = 0 }) {
  return (
    <div className={styles.stepper}>
      <span className={styles.stepLabel}>{label}</span>
      <div className={styles.stepCtrl}>
        <button
          className={styles.stepMinus}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
        >
          <Minus size={13} />
        </button>
        <span className={styles.stepVal}>{value}</span>
        <button className={styles.stepPlus} onClick={() => onChange(value + 1)}>
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

/* ── Panel de desglose (modo vista) ── */
function Desglose({ d }) {
  return (
    <div className={styles.desglose}>
      <div className={styles.desgloseHeader}>
        <FileText size={22} color="#7C3AED" />
        <span>Desglose de Costos del Servicio</span>
      </div>

      {/* Hotel */}
      {d.hotel && (
        <div className={styles.svBloque}>
          <div className={styles.svBloqueHeader}>
            <Hotel size={17} color="#22c55e" />
            <span>Hotel: {d.hotel.proveedorNombre}</span>
            <span className={styles.svSubtotal} style={{ color: "#22c55e" }}>
              {fmt(d.hotel.subtotal)}
            </span>
          </div>

          {/* ── AGREGAR ESTO — fechas de estadía ── */}
          {(d.hotel.fechaIngreso || d.hotel.fechaSalida) && (
            <div className={styles.svDetalle}>
              <p className={styles.svSubHead}>Fechas de estadía:</p>
              <div className={styles.svLinea}>
                <span>📅 Check-in</span>
                <span>{d.hotel.fechaIngreso ?? "—"}</span>
              </div>
              <div className={styles.svLinea}>
                <span>📅 Check-out</span>
                <span>{d.hotel.fechaSalida ?? "—"}</span>
              </div>
            </div>
          )}
          {/* ── FIN ── */}
          {d.hotel.cantidadHabitaciones > 0 && (
            <div className={styles.svDetalle}>
              <p className={styles.svSubHead}>Habitaciones:</p>
              <div className={styles.svLinea}>
                <span>
                  {d.hotel.cantidadHabitaciones} × {d.hotel.tipoHabitacion} (
                  {fmt(d.hotel.precioHabitacion)})
                </span>
                <span>
                  {fmt(
                    (d.hotel.precioHabitacion ?? 0) *
                      (d.hotel.cantidadHabitaciones ?? 1),
                  )}
                </span>
              </div>
            </div>
          )}
          {(d.hotel.desayuno ||
            d.hotel.almuerzo ||
            d.hotel.cena ||
            d.hotel.snack) && (
            <div className={styles.svDetalle}>
              <p className={styles.svSubHead}>Servicios de Alimentación:</p>
              {d.hotel.desayuno && (
                <div className={styles.svLinea}>
                  <span>{d.hotel.cantidadHabitaciones ?? 1} × Desayuno</span>
                  <span>
                    {fmt(
                      (d.hotel.precioDesayuno ?? 0) *
                        (d.hotel.cantidadHabitaciones ?? 1),
                    )}
                  </span>
                </div>
              )}
              {d.hotel.almuerzo && (
                <div className={styles.svLinea}>
                  <span>{d.hotel.cantidadHabitaciones ?? 1} × Almuerzo</span>
                  <span>
                    {fmt(
                      (d.hotel.precioAlmuerzo ?? 0) *
                        (d.hotel.cantidadHabitaciones ?? 1),
                    )}
                  </span>
                </div>
              )}
              {d.hotel.cena && (
                <div className={styles.svLinea}>
                  <span>{d.hotel.cantidadHabitaciones ?? 1} × Cena</span>
                  <span>
                    {fmt(
                      (d.hotel.precioCena ?? 0) *
                        (d.hotel.cantidadHabitaciones ?? 1),
                    )}
                  </span>
                </div>
              )}
              {d.hotel.snack && (
                <div className={styles.svLinea}>
                  <span>{d.hotel.cantidadHabitaciones ?? 1} × Snack</span>
                  <span>
                    {fmt(
                      (d.hotel.precioSnack ?? 0) *
                        (d.hotel.cantidadHabitaciones ?? 1),
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Transporte */}
      {d.transporte && (
        <div className={styles.svBloque}>
          <div className={styles.svBloqueHeader}>
            <Bus size={17} color="#3b82f6" />
            <span>Transporte: {d.transporte.proveedorNombre}</span>
            <span className={styles.svSubtotal} style={{ color: "#3b82f6" }}>
              {fmt(d.transporte.subtotal)}
            </span>
          </div>
          <div className={styles.svDetalle}>
            <div className={styles.svLinea}>
              <span>
                Traslado{" "}
                {d.transporte.tipoTransporte === "INDIVIDUAL"
                  ? "Aeropuerto - Domicilio"
                  : d.transporte.tipoTransporte === "GRUPAL"
                    ? "Domicilio - Aeropuerto"
                    : "Aeropuerto - Domicilio y Domicilio - Aeropuerto"}
              </span>
              {/* ── AGREGAR cantidad ── */}
              {d.transporte.cantidadPasajeros > 0 && (
                <span>{d.transporte.cantidadPasajeros} pax</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Restaurante */}
      {d.restaurante && (
        <div className={styles.svBloque}>
          <div className={styles.svBloqueHeader}>
            <UtensilsCrossed size={17} color="#f97316" />
            <span>Restaurante: {d.restaurante.proveedorNombre}</span>
            <span className={styles.svSubtotal} style={{ color: "#f97316" }}>
              {fmt(d.restaurante.subtotal)}
            </span>
          </div>
          <div className={styles.svDetalle}>
            {/* ── AGREGAR cantidad de pasajeros ── */}
            {(d.restaurante.cantidadPasajeros ?? 0) > 0 && (
              <div className={styles.svLinea}>
                <span>Cantidad de pasajeros</span>
                <span>{d.restaurante.cantidadPasajeros}</span>
              </div>
            )}
            {d.restaurante.desayuno && (
              <div className={styles.svLinea}>
                <span>
                  🌅 {d.restaurante.cantidadPasajeros ?? 1} × Desayuno
                </span>
                <span>
                  {fmt(
                    (d.restaurante.precioDesayuno ?? 0) *
                      (d.restaurante.cantidadPasajeros ?? 1),
                  )}
                </span>
              </div>
            )}
            {d.restaurante.almuerzo && (
              <div className={styles.svLinea}>
                <span>
                  😋 {d.restaurante.cantidadPasajeros ?? 1} × Almuerzo
                </span>
                <span>
                  {fmt(
                    (d.restaurante.precioAlmuerzo ?? 0) *
                      (d.restaurante.cantidadPasajeros ?? 1),
                  )}
                </span>
              </div>
            )}
            {d.restaurante.cena && (
              <div className={styles.svLinea}>
                <span>🌙 {d.restaurante.cantidadPasajeros ?? 1} × Cena</span>
                <span>
                  {fmt(
                    (d.restaurante.precioCena ?? 0) *
                      (d.restaurante.cantidadPasajeros ?? 1),
                  )}
                </span>
              </div>
            )}
            {d.restaurante.snack && (
              <div className={styles.svLinea}>
                <span>{d.restaurante.cantidadPasajeros ?? 1} × Snack</span>
                <span>
                  {fmt(
                    (d.restaurante.precioSnack ?? 0) *
                      (d.restaurante.cantidadPasajeros ?? 1),
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Total */}
      <div className={styles.totalBar}>
        <span>TOTAL GENERAL</span>
        <span>{fmt(d.totalGeneral)}</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   PANEL DE EDICIÓN
   ══════════════════════════════════════ */
function PanelEdicion({ d, recursos, disp, onGuardar, onCancelar, saving }) {
  // Separar recursos por tipo (vienen del registro diario completo)
  const hoteles = (recursos ?? []).filter((r) => r.proveedorTipo === "HOTEL");
  const transportes = (recursos ?? []).filter(
    (r) => r.proveedorTipo === "TRANSPORTE",
  );
  const restaurantes = (recursos ?? []).filter(
    (r) => r.proveedorTipo === "RESTAURANTE",
  );

  // Helpers de disponibilidad en tiempo real
  const getDispHotel = (r) =>
    (disp?.hoteles ?? []).find(
      (d) => d.vueloRecursoId === (r.vueloRecursoId ?? r.id),
    );
  const getDispTrans = (r) =>
    (disp?.transportes ?? []).find(
      (d) => d.vueloRecursoId === (r.vueloRecursoId ?? r.id),
    );
  const getDispRest = (r) =>
    (disp?.restaurantes ?? []).find(
      (d) => d.vueloRecursoId === (r.vueloRecursoId ?? r.id),
    );

  // Texto del label con disponibilidad
  const labelHotel = (h) => {
    const dd = getDispHotel(h);
    const nombre = h.proveedorNombre ?? h.nombreProveedor ?? h.nombre;
    const habTotal =
      (h.habitacionesSimples ?? 0) +
      (h.habitacionesDobles ?? 0) +
      (h.habitacionesMatrimoniales ?? 0);
    const habDisp = dd?.totalDisponibles ?? habTotal;
    return habTotal > 0
      ? `${nombre} (${habDisp}/${habTotal} hab. disp.)`
      : nombre;
  };
  const labelTrans = (t) => {
    const dd = getDispTrans(t);
    const nombre = t.proveedorNombre ?? t.nombreProveedor ?? t.nombre;
    if (dd)
      return `${nombre} (${dd.capacidadDisponible}/${dd.capacidadTotal} pax disp.)`;
    return nombre;
  };
  const labelRest = (r) => {
    const dd = getDispRest(r);
    const nombre = r.proveedorNombre ?? r.nombreProveedor ?? r.nombre;
    if (dd)
      return `${nombre} (${dd.capacidadDisponible}/${dd.capacidadTotal} cubiertos disp.)`;
    return nombre;
  };

  /* Estado del formulario: inicializado con los valores actuales */
  const [hotelRid, setHotelRid] = useState(
    String(d.hotel?.vueloRecursoId ?? ""), // ← forzar string
  );
  const [tipoHab, setTipoHab] = useState(d.hotel?.tipoHabitacion ?? "SIMPLE");
  const [cantHab, setCantHab] = useState(d.hotel?.cantidadHabitaciones ?? 1);
  const [hDes, setHDes] = useState(d.hotel?.desayuno ?? false);
  const [hAlm, setHAlm] = useState(d.hotel?.almuerzo ?? false);
  const [hCena, setHCena] = useState(d.hotel?.cena ?? false);
  const [hSnack, setHSnack] = useState(d.hotel?.snack ?? false);

  const [transRid, setTransRid] = useState(
    String(d.transporte?.vueloRecursoId ?? ""),
  );

  const [tipoTrans, setTipoTrans] = useState(
    d.transporte?.tipoTransporte ?? "INDIVIDUAL",
  );
  const [cantPax, setCantPax] = useState(d.transporte?.cantidadPasajeros ?? 1);

  const [restRid, setRestRid] = useState(
    String(d.restaurante?.vueloRecursoId ?? ""),
  );

  const [cantRest, setCantRest] = useState(
    d.restaurante?.cantidadPasajeros ?? 1, // ← ahora cantidadPasajeros viene del backend
  );
  const [rDes, setRDes] = useState(d.restaurante?.desayuno ?? false);
  const [rAlm, setRAlm] = useState(d.restaurante?.almuerzo ?? false);
  const [rCena, setRCena] = useState(d.restaurante?.cena ?? false);

  // Helper para normalizar LocalDate de Java (puede llegar como array o string)
  const toIsoDate = (v) => {
    if (!v) return null;
    if (Array.isArray(v)) {
      const [y, m, d] = v;
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    return v;
  };

  // Fechas editables — se inicializan con los valores actuales del hotel
  const [fechaIngreso, setFechaIngreso] = useState(
    () => toIsoDate(d.hotel?.fechaIngreso) ?? "",
  );
  const [fechaSalida, setFechaSalida] = useState(
    () => toIsoDate(d.hotel?.fechaSalida) ?? "",
  );

  const handleGuardar = () => {
    const body = {};
    if (hotelRid) {
      body.hotelVueloRecursoId = Number(hotelRid);
      body.tipoHabitacion = tipoHab;
      body.cantidadHabitaciones = cantHab;
      body.hotelDesayuno = hDes;
      body.hotelAlmuerzo = hAlm;
      body.hotelCena = hCena;
      body.hotelSnack = hSnack;
      // Después:
      body.fechaIngreso = fechaIngreso || null;
      body.fechaSalida = fechaSalida || null;
    }
    if (transRid) {
      body.transporteVueloRecursoId = Number(transRid);
      body.tipoTransporte = tipoTrans;
      body.cantidadPasajeros = cantPax;
    }
    if (restRid) {
      body.restauranteVueloRecursoId = Number(restRid);
      body.restauranteDesayuno = rDes;
      body.restauranteAlmuerzo = rAlm;
      body.restauranteCena = rCena;
      body.cantidadCubiertos = cantRest; // ← AGREGAR
    }
    onGuardar(body);
  };

  return (
    <div className={styles.editPanel}>
      {/* HOTEL */}
      <div className={styles.editBloque} style={{ borderColor: "#22c55e22" }}>
        <div className={styles.editBloqueHeader} style={{ color: "#16A34A" }}>
          <Hotel size={16} /> Hotel
        </div>
        <div className={styles.editField}>
          <label className={styles.editLabel}>Proveedor</label>
          <select
            className={styles.editSelect}
            value={hotelRid}
            onChange={(e) => setHotelRid(e.target.value)}
          >
            <option value="">Sin hotel</option>
            {hoteles.map((h) => {
              const rid = String(h.vueloRecursoId ?? h.id);
              const dd = getDispHotel(h);
              const agotado =
                dd?.agotado === true || dd?.totalDisponibles === 0;
              return (
                <option
                  key={rid}
                  value={rid}
                  disabled={agotado && hotelRid !== rid}
                >
                  {labelHotel(h)}
                  {agotado ? " — Sin disponibilidad" : ""}
                </option>
              );
            })}
          </select>
        </div>
        {hotelRid && (
          <>
            <div className={styles.editField}>
              <label className={styles.editLabel}>📅 Check-in</label>
              <input
                type="date"
                className={styles.editSelect}
                value={fechaIngreso}
                onChange={(e) => setFechaIngreso(e.target.value)}
              />
            </div>
            <div className={styles.editField}>
              <label className={styles.editLabel}>📅 Check-out</label>
              <input
                type="date"
                className={styles.editSelect}
                value={fechaSalida}
                min={fechaIngreso}
                onChange={(e) => setFechaSalida(e.target.value)}
              />
            </div>
            <div className={styles.editField}>
              <label className={styles.editLabel}>Tipo de Habitación</label>
              <div className={styles.radioGroup}>
                {["SIMPLE", "DOBLE", "MATRIMONIAL"].map((t) => (
                  <label
                    key={t}
                    className={[
                      styles.radioBtn,
                      tipoHab === t ? styles.radioBtnActive : "",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      value={t}
                      checked={tipoHab === t}
                      onChange={() => setTipoHab(t)}
                      style={{ display: "none" }}
                    />
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.stepperRow}>
              <Stepper
                label="Cantidad de Habitaciones"
                value={cantHab}
                onChange={setCantHab}
                min={1}
              />
            </div>
            <div className={styles.editField}>
              <label className={styles.editLabel}>Servicios del Hotel</label>
              <div className={styles.chkRow}>
                <Chk
                  checked={hDes}
                  onChange={setHDes}
                  label="Desayuno"
                  color="#22c55e"
                />
                <Chk
                  checked={hAlm}
                  onChange={setHAlm}
                  label="Almuerzo"
                  color="#22c55e"
                />
                <Chk
                  checked={hSnack}
                  onChange={setHSnack}
                  label="Snack"
                  color="#22c55e"
                />
                <Chk
                  checked={hCena}
                  onChange={setHCena}
                  label="Cena"
                  color="#22c55e"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* TRANSPORTE */}
      <div className={styles.editBloque} style={{ borderColor: "#3b82f622" }}>
        <div className={styles.editBloqueHeader} style={{ color: "#3b82f6" }}>
          <Bus size={16} /> Transporte
        </div>
        <div className={styles.editField}>
          <label className={styles.editLabel}>Proveedor</label>
          <select
            className={styles.editSelect}
            value={transRid}
            onChange={(e) => setTransRid(e.target.value)}
          >
            <option value="">Sin transporte</option>
            {transportes.map((t) => {
              const rid = String(t.vueloRecursoId ?? t.id);
              const dd = getDispTrans(t);
              const agotado =
                dd?.agotado === true || dd?.capacidadDisponible === 0;
              return (
                <option
                  key={rid}
                  value={rid}
                  disabled={agotado && transRid !== rid}
                >
                  {labelTrans(t)}
                  {agotado ? " — Sin disponibilidad" : ""}
                </option>
              );
            })}
          </select>
        </div>
        {transRid && (
          <>
            <div className={styles.editField}>
              <label className={styles.editLabel}>Tipo de Transporte</label>
              <div className={styles.radioGroup}>
                {["INDIVIDUAL", "GRUPAL", "AMBOS"].map((t) => (
                  <label
                    key={t}
                    className={[
                      styles.radioBtn,
                      tipoTrans === t ? styles.radioBtnActive : "",
                    ].join(" ")}
                    style={{
                      borderColor:
                        tipoTrans === t ? "#3b82f6" : "var(--border)",
                      background: tipoTrans === t ? "#EFF6FF" : "",
                    }}
                  >
                    <input
                      type="radio"
                      value={t}
                      checked={tipoTrans === t}
                      onChange={() => setTipoTrans(t)}
                      style={{ display: "none" }}
                    />
                    {
                      {
                        INDIVIDUAL: "Aeropuerto - Domicilio",
                        GRUPAL: "Domicilio - Aeropuerto",
                        AMBOS: "Ambos tramos",
                      }[t]
                    }
                  </label>
                ))}
              </div>
            </div>
            <Stepper
              label="Cantidad de Pasajeros"
              value={cantPax}
              onChange={setCantPax}
              min={1}
            />
          </>
        )}
      </div>

      {/* RESTAURANTE */}
      <div className={styles.editBloque} style={{ borderColor: "#f9731622" }}>
        <div className={styles.editBloqueHeader} style={{ color: "#f97316" }}>
          <UtensilsCrossed size={16} /> Restaurante
        </div>
        <div className={styles.editField}>
          <label className={styles.editLabel}>Proveedor</label>
          <select
            className={styles.editSelect}
            value={restRid}
            onChange={(e) => setRestRid(e.target.value)}
          >
            <option value="">Sin restaurante</option>
            {restaurantes.map((r) => {
              const rid = String(r.vueloRecursoId ?? r.id);
              const dd = getDispRest(r);
              const agotado =
                dd?.agotado === true || dd?.capacidadDisponible === 0;
              return (
                <option
                  key={rid}
                  value={rid}
                  disabled={agotado && restRid !== rid}
                >
                  {labelRest(r)}
                  {agotado ? " — Sin disponibilidad" : ""}
                </option>
              );
            })}
          </select>
        </div>
        {restRid && (
          <div className={styles.editField}>
            <label className={styles.editLabel}>
              Servicios del Restaurante
            </label>
            {/* ── AGREGAR stepper de cubiertos ── */}
            <Stepper
              label="Cantidad de pasajeros"
              value={cantRest}
              onChange={setCantRest}
              min={1}
            />
            <div className={styles.chkRow}>
              <Chk
                checked={rDes}
                onChange={setRDes}
                label="🌅 Desayuno"
                color="#f97316"
              />
              <Chk
                checked={rAlm}
                onChange={setRAlm}
                label="😋 Almuerzo"
                color="#f97316"
              />
              <Chk
                checked={rCena}
                onChange={setRCena}
                label="🌙 Cena"
                color="#f97316"
              />
            </div>
          </div>
        )}
      </div>

      {/* Botones */}
      <div className={styles.editActions}>
        <button className={styles.btnCancelar} onClick={onCancelar}>
          <X size={15} /> Cancelar
        </button>
        <button
          className={styles.btnGuardar}
          onClick={handleGuardar}
          disabled={saving}
        >
          {saving ? <Spinner size="sm" /> : <Save size={15} />}
          {saving ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   PÁGINA PRINCIPAL
   ══════════════════════════════════════ */
export default function ReporteDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { rol, isAdmin, isLider, isAgente } = useAuth();
  const esProveedor = rol === "PROVEEDOR";
  const esLineaAerea = rol === "LINEA_AEREA";
  const puedeGestionar = !esProveedor && !esLineaAerea; // Admin, Líder, Agente
  // Edición de datos del pasajero (nombre, correo, WhatsApp, PNR): solo Administrador y Líder SAASA
  const puedeEditarPasajero = isAdmin || isLider || isAgente;

  const { data: d, isLoading, error } = useReporteDetalle(id);
  const actualizar = useActualizarServicios();
  const actualizarPasajero = useActualizarPasajero();
  const regenerar = useRegenerarPdf();
  // Dentro del componente, junto a los otros hooks:
  const descargar = useObtenerUrlDescarga();

  // Dentro del componente, junto a los otros hooks:
  const descargarActualizado = useDescargarActualizado();

  // Disponibilidad en tiempo real del registro diario del vuelo
  // d?.registroVueloDiarioId viene del backend (nuevo campo agregado)
  const { data: disp, refetch: refetchDisp } = useDisponibilidad(
    d?.registroVueloDiarioId,
  );

  const recursosDelVuelo = [
    ...(disp?.hoteles ?? []).map((r) => ({ ...r, proveedorTipo: "HOTEL" })),
    ...(disp?.transportes ?? []).map((r) => ({
      ...r,
      proveedorTipo: "TRANSPORTE",
    })),
    ...(disp?.restaurantes ?? []).map((r) => ({
      ...r,
      proveedorTipo: "RESTAURANTE",
    })),
  ];

  const [editMode, setEditMode] = useState(false);
  // ── Edición de datos del pasajero (Administrador / Líder SAASA) ──
  const [editPasajero, setEditPasajero] = useState(false);
  const [pasajeroForm, setPasajeroForm] = useState({
    nombrePasajero: "",
    apellidoPasajero: "",
    correoPasajero: "",
    telefonoPasajero: "",
    pnr: "",
  });
  const [modal, setModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
  });

  const [emailModal, setEmailModal] = useState({
    open: false,
    correo: "",
    telefono: "",
    idioma: "ES", // ← NUEVO — Idioma del voucher a enviar (default: Español)
  });

  // Handler de descarga:
  const handleDescargarPdf = async () => {
    try {
      const res = await descargar.mutateAsync(d.atencionId);
      const url = res.data?.downloadUrl;
      if (url) window.open(url, "_blank");
      else
        showModal("error", "Error", "No se pudo obtener la URL de descarga.");
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "Error al descargar PDF.",
      );
    }
  };

  // Agregar handler:
  const handleDescargarActualizado = async () => {
    try {
      const res = await descargarActualizado.mutateAsync(d.atencionId);
      const url = res.data?.data?.downloadUrl;
      if (url) window.open(url, "_blank");
      else
        showModal("error", "Error", "No se pudo generar la URL de descarga.");
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "Error al generar PDF actualizado.",
      );
    }
  };

  const showModal = (type, title, msg) =>
    setModal({ open: true, type, title, message: msg });

  // ── Handlers de edición de pasajero ──
  const handleAbrirEditPasajero = () => {
    setPasajeroForm({
      nombrePasajero: d.nombrePasajero ?? "",
      apellidoPasajero: d.apellidoPasajero ?? "",
      correoPasajero: d.correoPasajero ?? "",
      telefonoPasajero: d.telefonoPasajero ?? "",
      pnr: d.pnr ?? "",
    });
    setEditPasajero(true);
  };

  const handleCancelarEditPasajero = () => setEditPasajero(false);

  const handleGuardarPasajero = async () => {
    if (
      pasajeroForm.correoPasajero &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pasajeroForm.correoPasajero.trim())
    ) {
      showModal(
        "error",
        "Correo inválido",
        "Ingresa un correo electrónico válido.",
      );
      return;
    }
    try {
      await actualizarPasajero.mutateAsync({
        id: d.atencionId,
        ...pasajeroForm,
      });
      setEditPasajero(false);
      showModal(
        "success",
        "Actualizado",
        "Los datos del pasajero fueron actualizados correctamente.",
      );
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ??
          "Error al actualizar los datos del pasajero.",
      );
    }
  };

  const handleGuardar = async (body) => {
    try {
      await actualizar.mutateAsync({ id: d.atencionId, ...body });
      setEditMode(false);
      refetchDisp?.();
      showModal(
        "success",
        "Actualizado",
        "Los servicios del voucher fueron actualizados correctamente.",
      );
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "Error al actualizar.",
      );
    }
  };

  // Reemplazar handleRegenerarPdf:
  const handleAbrirModalEmail = () => {
    setEmailModal({
      open: true,
      correo: d.correoPasajero ?? "",
      telefono: d.telefonoPasajero ?? "", // ← TWILIO: pre-llenar si existe
      idioma: "ES", // ← NUEVO — el modal siempre abre por defecto en Español
    });
  };

  const handleConfirmarEnvioEmail = async () => {
    const correo = emailModal.correo.trim();
    const telefono = emailModal.telefono.trim();
    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      showModal(
        "error",
        "Correo inválido",
        "Ingresa un correo electrónico válido.",
      );
      return;
    }

    try {
      await regenerar.mutateAsync({
        id: d.atencionId,
        correoDestino: correo,
        telefono: telefono || null,
        idiomaVoucher: emailModal.idioma, // ← NUEVO — idioma elegido en el modal
      });
      setEmailModal({ open: false, correo: "", telefono: "" });
      const msg = telefono
        ? `El PDF fue enviado a ${correo} y por WhatsApp al ${telefono}.`
        : `El PDF fue regenerado y enviado a ${correo}.`;
      showModal("success", "PDF enviado", msg);
    } catch (err) {
      setEmailModal({ open: false, correo: "", telefono: "" });
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "Error al enviar PDF.",
      );
    }
  };
  if (isLoading)
    return (
      <div className={styles.centered}>
        <Spinner size="lg" />
      </div>
    );
  if (error || !d)
    return (
      <div className={styles.centered}>
        <p className={styles.errMsg}>No se encontró el voucher solicitado.</p>
        <button className={styles.btnVolver} onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Volver
        </button>
      </div>
    );

    // El número visible del ticket debe coincidir con el correlativo del
  // grupo (estación + línea aérea), NO con el atencionId global de la BD.
  // Ej: correlativo "SGC-CUZ-LA-000003" → número mostrado: 3
  const numeroTicket = (() => {
    const match = d.correlativo?.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : d.atencionId;
  })();

  const tipoProveedorPropio = esProveedor
    ? d.hotel
      ? "HOTEL"
      : d.transporte
        ? "TRANSPORTE"
        : d.restaurante
          ? "RESTAURANTE"
          : null
    : null;

  // ← AQUÍ va dParaDesglose
  const dParaDesglose = esProveedor
    ? {
        ...d,
        hotel: tipoProveedorPropio === "HOTEL" ? d.hotel : null,
        transporte: tipoProveedorPropio === "TRANSPORTE" ? d.transporte : null,
        restaurante:
          tipoProveedorPropio === "RESTAURANTE" ? d.restaurante : null,
        totalGeneral:
          (tipoProveedorPropio === "HOTEL" && d.hotel?.subtotal) ||
          (tipoProveedorPropio === "TRANSPORTE" && d.transporte?.subtotal) ||
          (tipoProveedorPropio === "RESTAURANTE" && d.restaurante?.subtotal) ||
          0,
      }
    : d;

  return (
    <div className={styles.page}>
      {/* ─── Header morado (como la imagen) ─── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.headerTitulo}>
            {editMode
              ? `Editar Servicios — Ticket #${numeroTicket}`
              : `Información General — Ticket #${numeroTicket}`}
          </h1>
          <p className={styles.headerSub}>
            {d.aerolinea ?? "Plus Ultra Airlines"}
          </p>
        </div>
        <button className={styles.btnVolver} onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Volver
        </button>
      </div>

      {/* ─── Card de información general ─── */}
      <div className={styles.card}>
        <div className={styles.cardTituloRow}>
          <h2 className={styles.cardTitulo}>
            Información general — Ticket #{numeroTicket}
          </h2>
        </div>
        {(d.generadoPor || d.actualizadoPor) && (
          <div className={styles.metaPersonasRow}>
            {d.generadoPor && (
              <div className={styles.generadoPor}>
                Generado por: <span>{d.generadoPor}</span>
                {d.rolGenerador && (
                  <span className={styles.rolTag}>
                    ({getRolLabel(d.rolGenerador)})
                  </span>
                )}
              </div>
            )}
            {d.actualizadoPor && (
              <div className={styles.actualizadoPor}>
                Actualizado por: <span>{d.actualizadoPor}</span>
                {d.rolActualizador && (
                  <span className={styles.rolTag}>
                    ({getRolLabel(d.rolActualizador)})
                  </span>
                )}
              </div>
            )}
          </div>
        )}
        <div className={styles.metaGrid}>
          <div>
            <strong>Fecha de creación:</strong> {formatearFecha(d.createdAt)}
          </div>
          <div>
            <strong>Fecha de actualización:</strong>{" "}
            {formatearFecha(d.updatedAt)}
          </div>
          <div>
            <strong>Correlativo:</strong> {d.correlativo}
          </div>
          <div>
            <strong>Estado:</strong>{" "}
            <Badge
              label={d.estado ?? "ACTIVO"}
              variant={d.estado === "ANULADO" ? "danger" : "success"}
            />
          </div>
        </div>

        {d.grupoId && d.pasajerosGrupo?.length > 1 && (
          <div className={styles.grupalNotice}>
            <strong>Voucher grupal:</strong> este comprobante también incluye a:
            <ul>
              {d.pasajerosGrupo
                .filter(
                  (nombre) =>
                    nombre !== `${d.nombrePasajero} ${d.apellidoPasajero}`,
                )
                .map((nombre) => (
                  <li key={nombre}>{nombre}</li>
                ))}
            </ul>
            {!d.puedeEditarServicios && (
              <p style={{ margin: "0.5rem 0 0" }}>
                Los servicios de este voucher son compartidos con el titular del
                grupo — para modificarlos, edítalos desde su detalle.
              </p>
            )}
          </div>
        )}

        <div className={styles.infoGrid}>
          <div className={styles.infoField}>
            <label>Nombre comercial (Empresa)</label>
            <div className={styles.infoVal}>{d.aerolinea ?? "—"}</div>
          </div>
          {editPasajero ? (
            <>
              <div className={styles.infoField}>
                <label>Nombres</label>
                <input
                  className={styles.pasajeroInput}
                  type="text"
                  placeholder="Nombre"
                  value={pasajeroForm.nombrePasajero}
                  onChange={(e) =>
                    setPasajeroForm((f) => ({
                      ...f,
                      nombrePasajero: e.target.value,
                    }))
                  }
                />
              </div>
              <div className={styles.infoField}>
                <label>Apellidos</label>
                <input
                  className={styles.pasajeroInput}
                  type="text"
                  placeholder="Apellido"
                  value={pasajeroForm.apellidoPasajero}
                  onChange={(e) =>
                    setPasajeroForm((f) => ({
                      ...f,
                      apellidoPasajero: e.target.value,
                    }))
                  }
                />
              </div>
            </>
          ) : (
            <div className={styles.infoField}>
              <label>Pasajero</label>
              <div className={styles.infoVal}>
                {d.apellidoPasajero}/{d.nombrePasajero}
              </div>
            </div>
          )}

          {!esProveedor &&
            (editPasajero ? (
              <div className={styles.infoField}>
                <label>Correo electrónico</label>
                <input
                  className={styles.pasajeroInput}
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={pasajeroForm.correoPasajero}
                  onChange={(e) =>
                    setPasajeroForm((f) => ({
                      ...f,
                      correoPasajero: e.target.value,
                    }))
                  }
                />
              </div>
            ) : (
              <div className={styles.infoField}>
                <label>Correo electrónico</label>
                <div className={styles.infoVal}>{d.correoPasajero ?? "—"}</div>
              </div>
            ))}

          {!esProveedor &&
            (editPasajero ? (
              <div className={styles.infoField}>
                <label>Teléfono (WhatsApp)</label>
                <input
                  className={styles.pasajeroInput}
                  type="tel"
                  placeholder="+51 987 654 321"
                  value={pasajeroForm.telefonoPasajero}
                  onChange={(e) =>
                    setPasajeroForm((f) => ({
                      ...f,
                      telefonoPasajero: e.target.value,
                    }))
                  }
                />
              </div>
            ) : (
              <div className={styles.infoField}>
                <label>Teléfono (WhatsApp)</label>
                <div className={styles.infoVal}>
                  {d.telefonoPasajero ? (
                    <span style={{ color: "var(--success)", fontWeight: 500 }}>
                      {d.telefonoPasajero}
                    </span>
                  ) : (
                    <span
                      style={{ color: "var(--text-400)", fontStyle: "italic" }}
                    >
                      No registrado
                    </span>
                  )}
                </div>
              </div>
            ))}

          {editPasajero ? (
            <div className={styles.infoField}>
              <label>PNR</label>
              <input
                className={styles.pasajeroInput}
                type="text"
                maxLength={6}
                placeholder="PNR"
                value={pasajeroForm.pnr}
                onChange={(e) =>
                  setPasajeroForm((f) => ({
                    ...f,
                    pnr: e.target.value.toUpperCase(),
                  }))
                }
              />
            </div>
          ) : (
            <div className={styles.infoField}>
              <label>PNR</label>
              <div className={styles.infoVal}>{d.pnr}</div>
            </div>
          )}

          {esProveedor ? (
            <>
              {tipoProveedorPropio === "HOTEL" && (
                <div className={styles.infoField}>
                  <label>Hotel</label>
                  <div className={styles.infoVal}>
                    {d.hotel?.proveedorNombre ?? "—"}
                  </div>
                </div>
              )}
              {tipoProveedorPropio === "TRANSPORTE" && (
                <div className={styles.infoField}>
                  <label>Transporte</label>
                  <div className={styles.infoVal}>
                    {d.transporte?.proveedorNombre ?? "—"}
                  </div>
                </div>
              )}
              {tipoProveedorPropio === "RESTAURANTE" && (
                <div className={styles.infoField}>
                  <label>Restaurante</label>
                  <div className={styles.infoVal}>
                    {d.restaurante?.proveedorNombre ?? "—"}
                  </div>
                </div>
              )}
              {tipoProveedorPropio === "HOTEL" && d.hotel && (
                <>
                  <div className={styles.infoField}>
                    <label>Check-in</label>
                    <div className={styles.infoVal}>
                      {d.hotel.fechaIngreso ?? "—"}
                    </div>
                  </div>
                  <div className={styles.infoField}>
                    <label>Check-out</label>
                    <div className={styles.infoVal}>
                      {d.hotel.fechaSalida ?? "—"}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : editMode ? (
            <>
              <div className={styles.infoField}>
                <label>Hotel</label>
                <div className={styles.infoVal}>
                  {d.hotel?.proveedorNombre ?? "—"}
                </div>
              </div>
              <div className={styles.infoField}>
                <label>Transporte</label>
                <div className={styles.infoVal}>
                  {d.transporte?.proveedorNombre ?? "—"}
                </div>
              </div>
              <div className={styles.infoField}>
                <label>Restaurante</label>
                <div className={styles.infoVal}>
                  {d.restaurante?.proveedorNombre ?? "—"}
                </div>
              </div>
              {/* ── AGREGAR ── */}
              {d.hotel && (
                <>
                  <div className={styles.infoField}>
                    <label>Check-in</label>
                    <div className={styles.infoVal}>
                      {d.hotel.fechaIngreso ?? "—"}
                    </div>
                  </div>
                  <div className={styles.infoField}>
                    <label>Check-out</label>
                    <div className={styles.infoVal}>
                      {d.hotel.fechaSalida ?? "—"}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className={styles.infoField}>
                <label>Hotel</label>
                <div className={styles.infoVal}>
                  {d.hotel?.proveedorNombre ?? "—"}
                </div>
              </div>
              <div className={styles.infoField}>
                <label>Transporte</label>
                <div className={styles.infoVal}>
                  {d.transporte?.proveedorNombre ?? "—"}
                </div>
              </div>
              <div className={styles.infoField}>
                <label>Restaurante</label>
                <div className={styles.infoVal}>
                  {d.restaurante?.proveedorNombre ?? "—"}
                </div>
              </div>
              {/* ── Check-in / Check-out — visibles siempre ── */}
              {d.hotel && (
                <>
                  <div className={styles.infoField}>
                    <label>Check-in</label>
                    <div className={styles.infoVal}>
                      {d.hotel.fechaIngreso ?? "—"}
                    </div>
                  </div>
                  <div className={styles.infoField}>
                    <label>Check-out</label>
                    <div className={styles.infoVal}>
                      {d.hotel.fechaSalida ?? "—"}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <div className={[styles.infoField, styles.span3].join(" ")}>
            <label>Lugar de Emisión</label>
            <div className={styles.infoVal}>{d.lugarEmision ?? "—"}</div>
          </div>
        </div>

        {/* Acciones de edición de datos del pasajero */}
        {editPasajero && (
          <div className={styles.editActions}>
            <button
              className={styles.btnCancelar}
              onClick={handleCancelarEditPasajero}
              disabled={actualizarPasajero.isPending}
            >
              <X size={15} /> Cancelar
            </button>
            <button
              className={styles.btnGuardar}
              onClick={handleGuardarPasajero}
              disabled={actualizarPasajero.isPending}
            >
              {actualizarPasajero.isPending ? (
                <Spinner size="sm" />
              ) : (
                <Save size={15} />
              )}
              {actualizarPasajero.isPending
                ? "Guardando..."
                : "Guardar Datos del Pasajero"}
            </button>
          </div>
        )}

        {/* Firma digital de conformidad del pasajero, o autorización de carga
    masiva — el rol (admin/líder/agente) se muestra dinámicamente
    según quién haya cargado el Excel realmente. */}
        {d.firmaPasajero && (
          <div className={styles.firmaCard}>
            <p className={styles.firmaLabel}>
              {d.origenFirma === "AGENTE_LOTE"
                ? `Autorización del ${etiquetaRolFirma(d.origenFirmaRol)} (carga masiva)`
                : "Firma digital de conformidad"}
              {d.origenFirma !== "AGENTE_LOTE" &&
                d.grupoId &&
                d.pasajerosGrupo?.length > 1 && (
                  <span className={styles.firmaGrupalTag}>
                    {" "}
                    — firma del titular del grupo
                  </span>
                )}
            </p>
            <div className={styles.firmaBox}>
              {d.firmaPasajero.startsWith("data:image") ? (
                <>
                  <p className={styles.firmaNombrePasajero}>
                    {d.origenFirma !== "AGENTE_LOTE" &&
                    d.grupoId &&
                    d.pasajerosGrupo?.length > 1
                      ? `${d.nombreTitularGrupo ?? ""} ${d.apellidoTitularGrupo ?? ""}`.trim()
                      : `${d.nombrePasajero ?? ""} ${d.apellidoPasajero ?? ""}`.trim()}
                  </p>

                  <img
                    src={d.firmaPasajero}
                    alt="Firma digital del pasajero"
                    className={styles.firmaImagen}
                  />
                </>
              ) : (
                d.firmaPasajero
              )}
            </div>
            {d.firmaFecha && (
              <p className={styles.firmaFecha}>
                Firmado el {formatearFecha(d.firmaFecha)}
              </p>
            )}
          </div>
        )}

        {/* Panel de edición (se muestra debajo del formulario al activar) */}
        {editMode && (
          <PanelEdicion
            d={d}
            recursos={recursosDelVuelo}
            disp={disp}
            onGuardar={handleGuardar}
            onCancelar={() => setEditMode(false)}
            saving={actualizar.isPending}
          />
        )}

        {/* Desglose */}
        <Desglose d={dParaDesglose} />

        {/* Botones de acción */}
        {!editMode && !editPasajero && puedeGestionar && (
          <div className={styles.acciones}>
            {d.puedeEditarServicios ? (
              <button
                className={styles.btnEditar}
                onClick={() => setEditMode(true)}
              >
                <Edit2 size={15} /> Editar servicios
              </button>
            ) : (
              <button
                className={styles.btnEditar}
                onClick={() =>
                  navigate(`/reportes/detalle/${d.correlativoTitularGrupo}`)
                }
                title="Este voucher comparte servicios con el titular del grupo"
              >
                <Edit2 size={15} /> Editar serviciio desde titular
              </button>
            )}

            {/* Descarga el PDF que está en S3 — el último generado */}
            {/* Regenera con cambios actuales y descarga — SIN email */}
            {/* Grupal sin servicios propios: la descarga también debe
            hacerse desde el detalle del titular, igual que la edición,
            porque el PDF actualizado se genera de forma conjunta. */}
            {d.puedeEditarServicios ? (
              <button
                className={styles.btnDescargarActualizado}
                onClick={handleDescargarActualizado}
                disabled={descargarActualizado.isPending}
              >
                {descargarActualizado.isPending ? (
                  <Spinner size="sm" />
                ) : (
                  <Download size={15} />
                )}
                {descargarActualizado.isPending
                  ? "Generando..."
                  : "Descargar PDF"}
              </button>
            ) : (
              <button
                className={styles.btnDescargarActualizado}
                onClick={() =>
                  navigate(`/reportes/detalle/${d.correlativoTitularGrupo}`)
                }
                title="Este voucher comparte servicios con el titular del grupo"
              >
                <Download size={15} /> Descargar PDF desde titular
              </button>
            )}

            {d.puedeEditarServicios ? (
              <button
                className={styles.btnEnviar}
                onClick={handleAbrirModalEmail}
              >
                <Send size={15} />
                Reenviar PDF
              </button>
            ) : (
              <button
                className={styles.btnEnviar}
                onClick={() =>
                  navigate(`/reportes/detalle/${d.correlativoTitularGrupo}`)
                }
                title="Este voucher comparte servicios con el titular del grupo"
              >
                <Send size={15} /> Resalizar envio PDF desde titular
              </button>
            )}

            {puedeEditarPasajero && (
              <button
                className={styles.btnEditarPasajero}
                onClick={handleAbrirEditPasajero}
                title="Editar datos del pasajero"
              >
                <Edit2 size={15} /> Editar datos del pasajero
              </button>
            )}
          </div>
        )}
      </div>

      <InfoModal
        open={modal.open}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />
      {/* ─── Modal correo para enviar PDF ─── */}
      {emailModal.open && (
        <div className={styles.emailModalOverlay}>
          <div className={styles.emailModalBox}>
            <h3 className={styles.emailModalTitle}>
              <Send size={17} /> Enviar PDF al Pasajero
            </h3>
            <p className={styles.emailModalDesc}>
              Confirma el correo al que se enviará el voucher PDF actualizado.
            </p>
            <input
              className={styles.emailModalInput}
              type="email"
              placeholder="correo@ejemplo.com"
              value={emailModal.correo}
              onChange={(e) =>
                setEmailModal((m) => ({ ...m, correo: e.target.value }))
              }
              onKeyDown={(e) =>
                e.key === "Enter" &&
                !regenerar.isPending &&
                handleConfirmarEnvioEmail()
              }
              disabled={regenerar.isPending}
              autoFocus
            />
            {/* TWILIO — Campo teléfono opcional */}
            <label
              style={{
                fontSize: "0.8rem",
                color: "var(--text-400)",
                marginTop: "0.75rem",
                display: "block",
              }}
            >
              Teléfono WhatsApp{" "}
              <span style={{ fontWeight: 400 }}>— Opcional</span>
            </label>
            <input
              className={styles.emailModalInput}
              type="tel"
              placeholder="+51 987 654 321"
              value={emailModal.telefono}
              onChange={(e) =>
                setEmailModal((m) => ({ ...m, telefono: e.target.value }))
              }
              disabled={regenerar.isPending}
            />
            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--text-400)",
                marginTop: 2,
                marginBottom: "0.75rem",
              }}
            >
              Si se ingresa un número, el voucher se enviará también por
              WhatsApp. Incluye código de país. Ej: +51 para Perú
            </p>

            {/* NUEVO — Idioma del voucher a enviar (ES/EN) */}
            <label
              style={{
                fontSize: "0.8rem",
                color: "var(--text-400)",
                marginTop: "0.75rem",
                display: "block",
              }}
            >
              Idioma del voucher
            </label>
            <div
              className={styles.radioGroup}
              style={{ marginBottom: "0.75rem" }}
            >
              {["ES", "EN"].map((idi) => (
                <label
                  key={idi}
                  className={[
                    styles.radioBtn,
                    emailModal.idioma === idi ? styles.radioBtnActive : "",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    value={idi}
                    checked={emailModal.idioma === idi}
                    onChange={() =>
                      setEmailModal((m) => ({ ...m, idioma: idi }))
                    }
                    disabled={regenerar.isPending}
                    style={{ display: "none" }}
                  />
                  {idi === "ES" ? "Español" : "English"}
                </label>
              ))}
            </div>

            <div className={styles.emailModalActions}>
              <button
                className={styles.emailModalCancel}
                onClick={() =>
                  setEmailModal({
                    open: false,
                    correo: "",
                    telefono: "",
                    idioma: "ES",
                  })
                }
                disabled={regenerar.isPending}
              >
                Cancelar
              </button>
              <button
                className={styles.emailModalConfirm}
                onClick={handleConfirmarEnvioEmail}
                disabled={!emailModal.correo.trim() || regenerar.isPending}
              >
                {regenerar.isPending ? (
                  <Spinner size="sm" />
                ) : (
                  <Send size={14} />
                )}
                {regenerar.isPending ? "Enviando..." : "Confirmar y Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
