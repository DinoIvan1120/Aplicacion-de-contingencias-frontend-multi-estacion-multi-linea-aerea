import { useState, useEffect, useRef, useMemo } from "react";
import {
  Plane,
  Hotel,
  Bus,
  UtensilsCrossed,
  Save,
  Edit2,
  Trash2,
  CheckCircle,
  Calendar,
  User,
  Package,
  AlertCircle,
  Plus,
  X,
  ChevronDown,
  Search,
  Check,
} from "lucide-react";
import { useItinerarioHoy, useActualizarVuelo } from "../../hooks/useVuelos";
import { useProveedores } from "../../hooks/useProveedores";
import {
  useRegistrosHoy,
  useMisRegistros,
  useRegistrarVueloDiario,
  useActualizarRegistro,
  useEliminarRegistro,
  useCapacidadComprometidaHoy,
} from "../../hooks/useRegistrosDiarios";
import { hoyEnLima } from "../../utils/dateUtils.js";
import { TIPOS_CONTINGENCIA } from "../../utils/constants";
import { formatearMonto } from "../../utils/formatters";
import InfoModal from "../../components/ui/InfoModal.jsx";
import ConfirmModal from "../../components/ui/ConfirmModal.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import styles from "./LiderVueloPage.module.css";

/* ── Helpers ── */
const BADGE_MAP = {
  CANCELACION: "danger",
  DEMORA: "warning",
  REPROGRAMADO: "warning",
  PROGRAMADO: "info",
};

const BADGE_COLORS = {
  CANCELACION: "#dc2626",
  DEMORA: "#d97706",
  REPROGRAMADO: "#7c3aed",
  PROGRAMADO: "#2563eb",
};

/* ── CAMBIO 1: plantillas vacías por tipo ── */
const EMPTY_HOTEL = { hotelId: "", simples: 0, dobles: 0, matrimoniales: 0 };
const EMPTY_TRANS = { transporteId: "", transCapacidad: 0 };
const EMPTY_REST = { restauranteId: "", restCapacidad: 0 };

/* EMPTY_REC ahora contiene arrays en vez de un único proveedor por tipo */
const EMPTY_REC = {
  hoteles: [{ ...EMPTY_HOTEL }],
  transportes: [{ ...EMPTY_TRANS }],
  restaurantes: [{ ...EMPTY_REST }],
};

/* ════════════════════════════════════════════════════════
   COMPONENTE: VueloCombobox
   Selector moderno para vuelos con búsqueda y tarjetas
   ════════════════════════════════════════════════════════ */
function VueloCombobox({ vuelos, value, onChange, error }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  const selected = vuelos.find((v) => String(v.id) === String(value));

  const filtered = vuelos.filter((v) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      v.codigoVuelo?.toLowerCase().includes(q) ||
      v.aerolinea?.toLowerCase().includes(q) ||
      v.origen?.toLowerCase().includes(q) ||
      v.destino?.toLowerCase().includes(q) ||
      v.tipoContingencia?.toLowerCase().includes(q)
    );
  });

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Foco en search al abrir
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const handleSelect = (v) => {
    onChange(String(v.id));
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setOpen(false);
    setQuery("");
  };

  return (
    <div className={styles.comboboxWrap} ref={ref}>
      {/* Backdrop semitransparente */}
      {open && (
        <div
          className={styles.comboboxBackdrop}
          onClick={() => {
            setOpen(false);
            setQuery("");
          }}
          aria-hidden="true"
        />
      )}
      {/* Trigger */}
      <button
        type="button"
        className={[
          styles.comboboxTrigger,
          error ? styles.comboboxError : "",
          open ? styles.comboboxOpen : "",
        ].join(" ")}
        onClick={() => setOpen((o) => !o)}
      >
        {selected ? (
          <div className={styles.comboboxSelected}>
            <span className={styles.comboboxFlightBadge}>
              <Plane size={12} />
              {selected.codigoVuelo}
            </span>
            <span className={styles.comboboxFlightAero}>
              {selected.aerolinea}
            </span>
            <span className={styles.comboboxFlightRoute}>
              {selected.origen} → {selected.destino}
            </span>
            <span
              className={styles.comboboxContBadge}
              style={{
                background: BADGE_COLORS[selected.tipoContingencia] + "18",
                color: BADGE_COLORS[selected.tipoContingencia],
              }}
            >
              {selected.tipoContingencia}
            </span>
          </div>
        ) : (
          <span className={styles.comboboxPlaceholder}>
            <Plane size={15} />
            Selecciona un vuelo del itinerario
          </span>
        )}
        <div className={styles.comboboxActions}>
          {selected && (
            <span
              className={styles.comboboxClear}
              onClick={handleClear}
              title="Limpiar"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={15}
            className={[
              styles.comboboxChevron,
              open ? styles.comboboxChevronUp : "",
            ].join(" ")}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className={styles.comboboxDropdown}>
          {/* Search */}
          <div className={styles.comboboxSearch}>
            <Search size={14} />
            <input
              ref={inputRef}
              className={styles.comboboxSearchInput}
              placeholder="Buscar por código, aerolínea, ruta..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                className={styles.comboboxSearchClear}
                onClick={() => setQuery("")}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Contador */}
          <div className={styles.comboboxCount}>
            {filtered.length} vuelo{filtered.length !== 1 ? "s" : ""}
            {query ? ` para "${query}"` : " disponibles"}
          </div>

          {/* Lista */}
          <div className={styles.comboboxList}>
            {filtered.length === 0 ? (
              <div className={styles.comboboxEmpty}>
                <Plane size={28} />
                <span>Sin resultados</span>
              </div>
            ) : (
              filtered.map((v) => {
                const isSel = String(v.id) === String(value);
                const color = BADGE_COLORS[v.tipoContingencia] ?? "#6b7280";
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={[
                      styles.comboboxOption,
                      isSel ? styles.comboboxOptionSel : "",
                    ].join(" ")}
                    onClick={() => handleSelect(v)}
                  >
                    <div className={styles.comboboxOptLeft}>
                      <div className={styles.comboboxOptCode}>
                        <Plane size={11} />
                        {v.codigoVuelo}
                      </div>
                      <div className={styles.comboboxOptMeta}>
                        <span className={styles.comboboxOptAero}>
                          {v.aerolinea}
                        </span>
                        <span className={styles.comboboxOptRoute}>
                          {v.origen} → {v.destino}
                        </span>
                        <span className={styles.comboboxOptDate}>
                          <Calendar size={10} /> {v.fechaVuelo?.slice(0, 10)}
                        </span>
                      </div>
                    </div>
                    <div className={styles.comboboxOptRight}>
                      <span
                        className={styles.comboboxOptBadge}
                        style={{
                          background: color + "18",
                          color,
                          border: `1px solid ${color}40`,
                        }}
                      >
                        {v.tipoContingencia}
                      </span>
                      {isSel && (
                        <Check size={14} className={styles.comboboxCheck} />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && (
        <p className={styles.fieldErr}>
          <AlertCircle size={13} /> {error}
        </p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   COMPONENTE: ProveedorCombobox
   Selector para hotel / transporte / restaurante
   ════════════════════════════════════════════════════════ */
function ProveedorCombobox({
  opciones,
  value,
  onChange,
  placeholder,
  icon: Icon,
  accentColor,
  comprometidoHoy = new Map(), // ← agregar esto
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  const selected = opciones.find((o) => String(o.id) === String(value));
  const filtered = opciones.filter(
    (o) => !query || o.nombre?.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const handleSelect = (o) => {
    onChange(String(o.id));
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setOpen(false);
    setQuery("");
  };

  return (
    <div className={styles.comboboxWrap} ref={ref}>
      {/* Backdrop semitransparente */}
      {open && (
        <div
          className={styles.comboboxBackdrop}
          onClick={() => {
            setOpen(false);
            setQuery("");
          }}
          aria-hidden="true"
        />
      )}
      <button
        type="button"
        className={[
          styles.proveedorTrigger,
          open ? styles.comboboxOpen : "",
        ].join(" ")}
        style={open || selected ? { borderColor: accentColor + "60" } : {}}
        onClick={() => setOpen((o) => !o)}
      >
        {selected ? (
          <div className={styles.proveedorSelected}>
            <span
              className={styles.proveedorIcon}
              style={{ background: accentColor + "14", color: accentColor }}
            >
              <Icon size={14} />
            </span>
            <span className={styles.proveedorNombre}>{selected.nombre}</span>
          </div>
        ) : (
          <span className={styles.comboboxPlaceholder}>
            <Icon size={14} />
            {placeholder}
          </span>
        )}
        <div className={styles.comboboxActions}>
          {selected && (
            <span
              className={styles.comboboxClear}
              onClick={handleClear}
              title="Quitar selección"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={[
              styles.comboboxChevron,
              open ? styles.comboboxChevronUp : "",
            ].join(" ")}
          />
        </div>
      </button>

      {open && (
        <div className={styles.comboboxDropdown}>
          <div className={styles.comboboxSearch}>
            <Search size={13} />
            <input
              ref={inputRef}
              className={styles.comboboxSearchInput}
              placeholder="Buscar proveedor..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                className={styles.comboboxSearchClear}
                onClick={() => setQuery("")}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Opción ninguno */}
          <button
            type="button"
            className={[
              styles.proveedorOption,
              !value ? styles.comboboxOptionSel : "",
            ].join(" ")}
            onClick={() => {
              onChange("");
              setOpen(false);
              setQuery("");
            }}
          >
            <span className={styles.proveedorOptNone}>Sin asignar</span>
            {!value && <Check size={13} className={styles.comboboxCheck} />}
          </button>

          <div className={styles.comboboxList}>
            {filtered.length === 0 ? (
              <div className={styles.comboboxEmpty}>
                <Icon size={22} />
                <span>Sin resultados</span>
              </div>
            ) : (
              filtered.map((o) => {
                const isSel = String(o.id) === String(value);
                return (
                  <button
                    key={o.id}
                    type="button"
                    className={[
                      styles.proveedorOption,
                      isSel ? styles.comboboxOptionSel : "",
                    ].join(" ")}
                    onClick={() => handleSelect(o)}
                    style={
                      isSel ? { borderLeft: `3px solid ${accentColor}` } : {}
                    }
                  >
                    <span
                      className={styles.proveedorOptIcon}
                      style={{ color: accentColor }}
                    >
                      <Icon size={13} />
                    </span>
                    <span className={styles.proveedorOptNombre}>
                      {o.nombre}
                    </span>
                    {/* Tag de cuanto ya esta comprometido hoy para esta opcion */}
                    {(() => {
                      const comp = comprometidoHoy.get(Number(o.id));
                      if (!comp) return null;
                      const txt =
                        comp.proveedorTipo === "HOTEL"
                          ? `${comp.simplesComprometidos ?? 0}S · ${comp.doblesComprometidos ?? 0}D · ${comp.matrimonialesComprometidos ?? 0}M hoy`
                          : `${comp.capacidadTotalComprometida ?? 0} hoy`;
                      return (
                        <span className={styles.comprometidoOptTag}>{txt}</span>
                      );
                    })()}
                    {isSel && (
                      <Check size={13} className={styles.comboboxCheck} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── CAMBIO 2: buildRecursos itera sobre los arrays ── */
function buildRecursos(rec) {
  const list = [];

  rec.hoteles.forEach((h) => {
    if (h.hotelId)
      list.push({
        proveedorId: Number(h.hotelId),
        habitacionesSimples: Number(h.simples) || 0,
        habitacionesDobles: Number(h.dobles) || 0,
        habitacionesMatrimoniales: Number(h.matrimoniales) || 0,
      });
  });

  rec.transportes.forEach((t) => {
    if (t.transporteId)
      list.push({
        proveedorId: Number(t.transporteId),
        capacidadTotal: Number(t.transCapacidad) || 0,
      });
  });

  rec.restaurantes.forEach((rt) => {
    if (rt.restauranteId)
      list.push({
        proveedorId: Number(rt.restauranteId),
        capacidadTotal: Number(rt.restCapacidad) || 0,
      });
  });

  return list;
}

/* ── CAMBIO 3: recFromRegistro usa .filter() para preservar todos los recursos ── */
function recFromRegistro(r) {
  if (!r?.recursos?.length) return EMPTY_REC;

  const hoteles = r.recursos
    .filter((x) => x.proveedorTipo === "HOTEL")
    .map((h) => ({
      hotelId: String(h.proveedorId),
      simples: h.habitacionesSimples ?? 0,
      dobles: h.habitacionesDobles ?? 0,
      matrimoniales: h.habitacionesMatrimoniales ?? 0,
    }));

  const transportes = r.recursos
    .filter((x) => x.proveedorTipo === "TRANSPORTE")
    .map((t) => ({
      transporteId: String(t.proveedorId),
      transCapacidad: t.capacidadTotal ?? 0,
    }));

  const restaurantes = r.recursos
    .filter((x) => x.proveedorTipo === "RESTAURANTE")
    .map((rt) => ({
      restauranteId: String(rt.proveedorId),
      restCapacidad: rt.capacidadTotal ?? 0,
    }));

  return {
    hoteles: hoteles.length ? hoteles : [{ ...EMPTY_HOTEL }],
    transportes: transportes.length ? transportes : [{ ...EMPTY_TRANS }],
    restaurantes: restaurantes.length ? restaurantes : [{ ...EMPTY_REST }],
  };
}

const CONTINGENCIA_OPTIONS = [
  { value: "PROGRAMADO", color: "#2563eb", label: "Programado" },
  { value: "CANCELACION", color: "#dc2626", label: "Cancelación" },
  { value: "DEMORA", color: "#d97706", label: "Demora" },
  { value: "REPROGRAMADO", color: "#7c3aed", label: "Reprogramado" },
];

function ContingenciaSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = CONTINGENCIA_OPTIONS.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={styles.comboboxWrap} ref={ref}>
      {open && (
        <div
          className={styles.comboboxBackdrop}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <button
        type="button"
        className={[
          styles.proveedorTrigger,
          open ? styles.comboboxOpen : "",
        ].join(" ")}
        style={selected ? { borderColor: selected.color + "50" } : {}}
        onClick={() => setOpen((o) => !o)}
      >
        {selected ? (
          <div className={styles.proveedorSelected}>
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: selected.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: selected.color,
              }}
            >
              {selected.label}
            </span>
          </div>
        ) : (
          <span className={styles.comboboxPlaceholder}>Selecciona estado</span>
        )}
        <ChevronDown
          size={14}
          className={[
            styles.comboboxChevron,
            open ? styles.comboboxChevronUp : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <div className={styles.comboboxDropdown}>
          <div className={styles.comboboxList}>
            {CONTINGENCIA_OPTIONS.map((op) => {
              const isSel = op.value === value;
              return (
                <button
                  key={op.value}
                  type="button"
                  className={[
                    styles.proveedorOption,
                    isSel ? styles.comboboxOptionSel : "",
                  ].join(" ")}
                  style={isSel ? { borderLeft: `3px solid ${op.color}` } : {}}
                  onClick={() => {
                    onChange(op.value);
                    setOpen(false);
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: op.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: isSel ? 700 : 500,
                      color: op.color,
                      flex: 1,
                    }}
                  >
                    {op.label}
                  </span>
                  {isSel && (
                    <Check
                      size={14}
                      style={{ color: op.color, flexShrink: 0 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-componente: Modal de edición rápida del vuelo del itinerario ── */
function EditarVueloModal({ open, vuelo, onClose, onGuardado, onSuccess }) {
  const actualizarVuelo = useActualizarVuelo();
  const [form, setForm] = useState({
    tipoContingencia: vuelo?.tipoContingencia ?? "PROGRAMADO",
    observaciones: vuelo?.observaciones ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [evError, setEvError] = useState("");

  useEffect(() => {
    if (open && vuelo) {
      setForm({
        tipoContingencia: vuelo.tipoContingencia ?? "PROGRAMADO",
        observaciones: vuelo.observaciones ?? "",
      });
      setEvError("");
    }
  }, [open, vuelo]);

  if (!open || !vuelo) return null;

  const handleGuardar = async () => {
    setSaving(true);
    setEvError("");
    try {
      const payload = {
        aerolinea: vuelo.aerolinea,
        codigoVuelo: vuelo.codigoVuelo,
        origen: vuelo.origen,
        destino: vuelo.destino,
        fechaVuelo: vuelo.fechaVuelo?.slice(0, 10),
        tipoContingencia: form.tipoContingencia,
        observaciones: form.observaciones || "",
      };
      await actualizarVuelo.mutateAsync({ id: vuelo.id, ...payload });
      onGuardado({ ...vuelo, ...form });
      onSuccess?.(`Vuelo ${vuelo.codigoVuelo} actualizado correctamente.`);
      onClose();
    } catch (err) {
      setEvError(
        err.response?.data?.message ?? "Error al actualizar el vuelo.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.evOverlay} onClick={onClose}>
      <div className={styles.evModal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.evHeader}>
          <div className={styles.evHeaderLeft}>
            <Plane size={16} color="var(--rol-lider)" />
            <span className={styles.evTitle}>Editar datos del vuelo</span>
          </div>
          <button
            className={styles.evClose}
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Vuelo info readonly */}
        <div className={styles.evVueloInfo}>
          <span className={styles.evCodigo}>
            <Plane size={12} /> {vuelo.codigoVuelo}
          </span>
          <span className={styles.evRuta}>
            {vuelo.origen} → {vuelo.destino}
          </span>
          <span className={styles.evAero}>{vuelo.aerolinea}</span>
        </div>

        {/* Campos editables */}
        <div className={styles.evBody}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              Estado / Contingencia <span className={styles.req}>*</span>
            </label>
            <ContingenciaSelect
              value={form.tipoContingencia}
              onChange={(val) =>
                setForm((f) => ({ ...f, tipoContingencia: val }))
              }
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Observaciones del vuelo</label>
            <textarea
              className={styles.textarea}
              rows={3}
              placeholder="Ingresa una observación sobre el vuelo..."
              value={form.observaciones}
              onChange={(e) =>
                setForm((f) => ({ ...f, observaciones: e.target.value }))
              }
            />
          </div>

          {evError && (
            <p className={styles.evErrorMsg}>
              <AlertCircle size={13} /> {evError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className={styles.evFooter}>
          <button
            className={styles.cancelarBtn}
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            className={styles.guardarBtn}
            onClick={handleGuardar}
            disabled={saving}
          >
            {saving ? (
              <span className={styles.spinnerInline} />
            ) : (
              <Save size={15} />
            )}
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-componente: Card de un registro diario ── */
function RegistroCard({ r, onEditar, onEliminar, hoy: HOY }) {
  const v = r.vueloItinerario;
  const hoy = r.fechaRegistro === HOY;

  return (
    <div className={[styles.rCard, hoy ? styles.rCardHoy : ""].join(" ")}>
      {/* Encabezado */}
      <div className={styles.rCardTop}>
        <div className={styles.rCardInfo}>
          <span className={styles.rCodigo}>{v?.codigoVuelo ?? "—"}</span>
          <span className={styles.rRuta}>
            {v?.origen} → {v?.destino}
          </span>
          <Badge
            label={v?.tipoContingencia ?? "N/A"}
            variant={BADGE_MAP[v?.tipoContingencia] ?? "neutral"}
          />
        </div>
        <div className={styles.rCardMeta}>
          <span className={styles.rFecha}>
            <Calendar size={12} /> {r.fechaRegistro}
          </span>
          {hoy && <span className={styles.rHoyTag}>Hoy</span>}
        </div>
      </div>

      {/* Aerolínea + hora */}
      <p className={styles.rAero}>
        {v?.aerolinea} {v?.horaVuelo ? `· ${v.horaVuelo}` : ""}
      </p>

      {/* Contadores de recursos */}
      {r.recursos?.length > 0 && (
        <div className={styles.rContadores}>
          {r.totalHoteles > 0 && (
            <span className={styles.rContador}>
              <Hotel size={13} /> {r.totalHoteles} hotel
              {r.totalHoteles !== 1 ? "es" : ""}
            </span>
          )}
          {r.totalTransportes > 0 && (
            <span className={styles.rContador}>
              <Bus size={13} /> {r.totalTransportes} transporte
              {r.totalTransportes !== 1 ? "s" : ""}
            </span>
          )}
          {r.totalRestaurantes > 0 && (
            <span className={styles.rContador}>
              <UtensilsCrossed size={13} /> {r.totalRestaurantes} restaurante
              {r.totalRestaurantes !== 1 ? "s" : ""}
            </span>
          )}
          {r.totalHabitaciones > 0 && (
            <span className={styles.rContador}>
              <Package size={13} /> {r.totalHabitaciones} hab.
            </span>
          )}
        </div>
      )}

      {/* Observaciones */}
      {r.observaciones && <p className={styles.rObs}>{r.observaciones}</p>}

      {/* Líder que registró */}
      <p className={styles.rLider}>
        <User size={11} /> {r.registradoPorNombre ?? "—"}
      </p>

      {/* Acciones */}
      <div className={styles.rActions}>
        <button className={styles.rEditBtn} onClick={() => onEditar(r)}>
          <Edit2 size={13} /> Editar
        </button>
        <button className={styles.rDelBtn} onClick={() => onEliminar(r.id)}>
          <Trash2 size={13} /> Eliminar
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   PÁGINA PRINCIPAL
   ══════════════════════════════════════════════════ */
export default function LiderVueloPage() {
  /* ── Datos base ─────────────────────────────────── */
  // const { data: pageData } = useVuelos({ page: 0, size: 200 });
  // const vuelos = pageData?.content ?? [];

  const { data: vuelosHoy } = useItinerarioHoy();
  const vuelos = vuelosHoy ?? [];

  // const HOY = new Date().toISOString().slice(0, 10);
  const HOY = hoyEnLima();

  /* Proveedores — se cargan INDEPENDIENTEMENTE del vuelo */
  const { data: hotelesPage } = useProveedores({
    tipo: "HOTEL",
    page: 0,
    size: 50,
  });
  const { data: transportesPage } = useProveedores({
    tipo: "TRANSPORTE",
    page: 0,
    size: 50,
  });
  const { data: restaurantesPage } = useProveedores({
    tipo: "RESTAURANTE",
    page: 0,
    size: 50,
  });

  const hoteles = (hotelesPage?.content ?? []).filter((p) => p.estado === 1);
  const transportes = (transportesPage?.content ?? []).filter(
    (p) => p.estado === 1,
  );
  const restaurantes = (restaurantesPage?.content ?? []).filter(
    (p) => p.estado === 1,
  );

  /* Registros del día y del historial */
   const {
    data: registrosHoy = [],
    isLoading: loadingHoy,
    isError: errorHoy,
    error: errorHoyDetalle,
  } = useRegistrosHoy();
  const {
    data: misRegistrosPage,
    isLoading: loadingHist,
    isError: errorHist,
    error: errorHistDetalle,
  } = useMisRegistros({
    size: 30,
  });

  const misRegistros = misRegistrosPage?.content ?? [];

  /* Mutaciones */
  const registrar = useRegistrarVueloDiario();
  const actualizar = useActualizarRegistro();
  const eliminar = useEliminarRegistro();
  const loading = registrar.isPending || actualizar.isPending;

  /* ── Estado del formulario ──────────────────────── */
  const [vueloSelId, setVueloSelId] = useState(""); // combo itinerario
  const [vueloSel, setVueloSel] = useState(null); // objeto vuelo seleccionado
  const [fechaReg, setFechaReg] = useState(HOY);
  const [obs, setObs] = useState("");
  const [rec, setRec] = useState(EMPTY_REC);
  const [editId, setEditId] = useState(null); // id del
  // registro en edición

  // registro en edición
  const [editVueloModal, setEditVueloModal] = useState(false); // modal editar vuelo itinerario

  // Bandera para indicar que vueloSelId fue cambiado PROGRAMÁTICAMENTE (desde handleEditar)
  // y no por el usuario tocando el combobox → el useEffect NO debe resetear rec/obs/editId
  const isEditingRef = useRef(false);
  const [errors, setErrors] = useState({});

  const [modal, setModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
  });
  const [confirm, setConfirm] = useState({ open: false, id: null });

  // Camino B: mapa de capacidad comprometida hoy por proveedor.
  // En edicion se excluye el propio registro para evitar doble conteo.
  const { data: comprometidoHoy = new Map() } = useCapacidadComprometidaHoy(
    editId ?? null,
  );

  /*
   ***Proveedores ya asignados en registros de HOY.
   ***Si estamos editando un registro, sus propios proveedores no se excluyen
   ***(El Líder debe poder verlos y modificarlos)
   */

  // Camino B: todos los proveedores activos son visibles.
  // El combo muestra cuanto ya esta comprometido hoy via comprometidoHoy.
  const hotelesDisponibles = hoteles;
  const transportesDisponibles = transportes;
  const restaurantesDisponibles = restaurantes;

  // IDs de vuelos que ya tienen registro guardado hoy
  const vuelosYaRegistrados = useMemo(() => {
    const ids = new Set();
    registrosHoy.forEach((r) => {
      // Si estamos editando ese mismo registro, no lo excluimos
      if (editId && r.id === editId) return;
      if (r.vueloItinerario?.id) ids.add(Number(r.vueloItinerario.id));
    });
    return ids;
  }, [registrosHoy, editId]);

  // Lista filtrada de vuelos disponibles para el combobox
  const vuelosDisponibles = vuelos.filter(
    (v) => !vuelosYaRegistrados.has(Number(v.id)),
  );

  const showModal = (type, title, message) =>
    setModal({ open: true, type, title, message });

  /* Al seleccionar un vuelo del combo, autocompletar y resetear recursos 
  SOLO si el cambio vino del usuario (no de handleEditar*/
  useEffect(() => {
    if (isEditingRef.current) {
      //El cambio vino del handleEditar -> no resetear, solo limpiar la bandera
      isEditingRef.current = false;
      return;
    }
    if (!vueloSelId) {
      setVueloSel(null);
      return;
    }
    const v = vuelos.find((x) => String(x.id) === String(vueloSelId));
    setVueloSel(v ?? null);
    setRec(EMPTY_REC);
    setObs("");
    setEditId(null);
    setErrors({});
  }, [vueloSelId]);

  /* Actualiza un campo de un item dentro de hoteles/transportes/restaurantes */
  const setHotel = (idx, field, val) =>
    setRec((prev) => {
      const copy = [...prev.hoteles];
      copy[idx] = { ...copy[idx], [field]: val };
      return { ...prev, hoteles: copy };
    });

  const setTrans = (idx, field, val) =>
    setRec((prev) => {
      const copy = [...prev.transportes];
      copy[idx] = { ...copy[idx], [field]: val };
      return { ...prev, transportes: copy };
    });

  const setRest = (idx, field, val) =>
    setRec((prev) => {
      const copy = [...prev.restaurantes];
      copy[idx] = { ...copy[idx], [field]: val };
      return { ...prev, restaurantes: copy };
    });

  /* Agrega un nuevo item vacío */
  const addHotel = () =>
    setRec((p) => ({ ...p, hoteles: [...p.hoteles, { ...EMPTY_HOTEL }] }));
  const addTrans = () =>
    setRec((p) => ({
      ...p,
      transportes: [...p.transportes, { ...EMPTY_TRANS }],
    }));
  const addRest = () =>
    setRec((p) => ({
      ...p,
      restaurantes: [...p.restaurantes, { ...EMPTY_REST }],
    }));

  /* Quita un item por índice (mínimo siempre queda 1) */
  const removeHotel = (idx) =>
    setRec((p) => ({
      ...p,
      hoteles:
        p.hoteles.length > 1
          ? p.hoteles.filter((_, i) => i !== idx)
          : [{ ...EMPTY_HOTEL }],
    }));
  const removeTrans = (idx) =>
    setRec((p) => ({
      ...p,
      transportes:
        p.transportes.length > 1
          ? p.transportes.filter((_, i) => i !== idx)
          : [{ ...EMPTY_TRANS }],
    }));
  const removeRest = (idx) =>
    setRec((p) => ({
      ...p,
      restaurantes:
        p.restaurantes.length > 1
          ? p.restaurantes.filter((_, i) => i !== idx)
          : [{ ...EMPTY_REST }],
    }));

  //const totalHab = rec.simples + rec.dobles + rec.matrimoniales;

  /* ── Validación ── */
  const validate = () => {
    const e = {};
    if (!vueloSelId) e.vuelo = "Selecciona un vuelo del itinerario";
    if (!fechaReg) e.fechaReg = "La fecha es requerida";
    setErrors(e);
    return !Object.keys(e).length;
  };

  /* ── Guardar (crear o actualizar) ── */
  const handleGuardar = async () => {
    if (!validate()) return;
    const payload = {
      vueloItinerarioId: Number(vueloSelId),
      fechaRegistro: fechaReg,
      observaciones: obs || "",
      recursos: buildRecursos(rec),
    };
    try {
      if (editId) {
        const res = await actualizar.mutateAsync({ id: editId, ...payload });
        const d = res.data.data;
        showModal(
          "success",
          "Registro actualizado",
          `${d.vueloItinerario?.codigoVuelo} actualizado con ${d.recursos?.length ?? 0} recurso(s).`,
        );
      } else {
        const res = await registrar.mutateAsync(payload);
        const d = res.data.data;
        showModal(
          "success",
          "Vuelo registrado",
          `${d.vueloItinerario?.codigoVuelo} registrado para ${d.fechaRegistro} con ${d.recursos?.length ?? 0} recurso(s).`,
        );
      }
      /* Reset formulario */
      setVueloSelId("");
      setVueloSel(null);
      setRec(EMPTY_REC);
      setObs("");
      setEditId(null);
      setErrors({});
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "Error inesperado.",
      );
    }
  };

  /* ── Editar un registro existente ── */
  const handleEditar = (r) => {
    isEditingRef.current = true;
    setVueloSelId(String(r.vueloItinerario?.id ?? ""));
    setVueloSel(r.vueloItinerario);
    setFechaReg(r.fechaRegistro ?? HOY);
    setObs(r.observaciones ?? "");
    setRec(recFromRegistro(r));
    setEditId(r.id);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ── Eliminar ── */
  const handleEliminar = async () => {
    try {
      await eliminar.mutateAsync(confirm.id);
      showModal(
        "success",
        "Registro eliminado",
        "El registro fue eliminado correctamente.",
      );
    } catch (err) {
      showModal("error", "Error", err.response?.data?.message ?? "Error.");
    } finally {
      setConfirm({ open: false, id: null });
    }
  };

  /* ── Agrupar historial por fecha ── */
  const historialPorFecha = misRegistros.reduce((acc, r) => {
    const fecha = r.fechaRegistro;
    if (!acc[fecha]) acc[fecha] = [];
    acc[fecha].push(r);
    return acc;
  }, {});

  /* ── Registros del día que NO se muestran en el formulario (los recién guardados) ── */
  const registrosDelDia = registrosHoy;

  return (
    <div className={styles.page}>
      {/* ══════════════════════════════════════
          ENCABEZADO
          ══════════════════════════════════════ */}
      <div className={styles.pageHeader}>
        <Plane size={24} color="var(--rol-lider)" />
        <div>
          <h1 className={styles.pageTitle}>Registro de Vuelo</h1>
          <p className={styles.pageSub}>
            Selecciona un vuelo del itinerario y habilita los recursos del día
          </p>
        </div>
        {editId && (
          <div className={styles.editBadge}>
            <Edit2 size={14} /> Editando registro
          </div>
        )}
      </div>

      {/* 1 — SELECTOR DE VUELO */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>✈ Itinerario de vuelos</h2>
        <p className={styles.cardNote}>
          Selecciona el vuelo del itinerario cargado por el administrador. Los
          campos se autocompletan automáticamente.
        </p>

        <VueloCombobox
          vuelos={vuelosDisponibles}
          value={vueloSelId}
          onChange={setVueloSelId}
          error={errors.vuelo}
        />

        {vueloSel && (
          <div className={styles.vueloPreview}>
            <div className={styles.vpGrid}>
              <div className={styles.vpItem}>
                <span className={styles.vpLabel}>Aerolínea</span>
                <span className={styles.vpVal}>{vueloSel.aerolinea}</span>
              </div>
              <div className={styles.vpItem}>
                <span className={styles.vpLabel}>Código</span>
                <span className={styles.vpVal}>
                  <strong>{vueloSel.codigoVuelo}</strong>
                </span>
              </div>
              <div className={styles.vpItem}>
                <span className={styles.vpLabel}>Ruta</span>
                <span className={styles.vpVal}>
                  {vueloSel.origen} → {vueloSel.destino}
                </span>
              </div>
              <div className={styles.vpItem}>
                <span className={styles.vpLabel}>Fecha vuelo</span>
                <span className={styles.vpVal}>
                  {vueloSel.fechaVuelo?.slice(0, 10)}
                </span>
              </div>
              <div className={styles.vpItem}>
                <span className={styles.vpLabel}>Contingencia</span>
                <Badge
                  label={vueloSel.tipoContingencia}
                  variant={BADGE_MAP[vueloSel.tipoContingencia] ?? "neutral"}
                />
              </div>
              {vueloSel.observaciones && (
                <div className={styles.vpItem} style={{ gridColumn: "1/-1" }}>
                  <span className={styles.vpLabel}>Obs. vuelo</span>
                  <span className={styles.vpVal}>{vueloSel.observaciones}</span>
                </div>
              )}
            </div>
            {/* Botón editar vuelo */}
            <div className={styles.vpEditarWrap}>
              <button
                className={styles.vpEditarBtn}
                onClick={() => setEditVueloModal(true)}
                title="Editar estado y observación del vuelo"
              >
                <Edit2 size={13} /> Editar vuelo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2 — DATOS DEL REGISTRO */}
      {vueloSel && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>📋 Datos del Registro</h2>
          <div className={styles.regGrid}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>
                Fecha de registro <span className={styles.req}>*</span>
              </label>
              <input
                type="date"
                value={fechaReg}
                onChange={(e) => {
                  setFechaReg(e.target.value);
                  setErrors((er) => ({ ...er, fechaReg: "" }));
                }}
                className={[
                  styles.inputDate,
                  errors.fechaReg ? styles.inputError : "",
                ].join(" ")}
              />
              {errors.fechaReg && (
                <p className={styles.fieldErr}>
                  <AlertCircle size={13} /> {errors.fechaReg}
                </p>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>
                Observaciones del registro
              </label>
              <textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                rows={2}
                placeholder="Notas adicionales del líder para este registro..."
                className={styles.textarea}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          3 — HABILITAR RECURSOS
          (se muestran SIEMPRE, independiente del vuelo)
          ══════════════════════════════════════ */}
      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span className={styles.dividerLabel}>
          🛠 Habilitar Recursos del Día
        </span>
        <span className={styles.dividerLine} />
      </div>

      <div className={styles.recursosGrid}>
        {/* HOTEL */}
        <div className={styles.card}>
          <div className={styles.recursoSeccionHeader}>
            <div className={styles.resourceHeader}>
              <Hotel size={18} color="#16a34a" />
              <h3 className={styles.cardTitle}>Hotel</h3>
            </div>
            <button className={styles.addResourceBtn} onClick={addHotel}>
              <Plus size={14} /> Agregar
            </button>
          </div>
          <div className={styles.recursosList}>
            {rec.hoteles.map((h, idx) => {
              const totalHab = h.simples + h.dobles + h.matrimoniales;
              return (
                <div key={idx} className={styles.recursoItem}>
                  {rec.hoteles.length > 1 && (
                    <div className={styles.recursoItemHeader}>
                      <span className={styles.recursoItemLabel}>
                        Hotel {idx + 1}
                      </span>
                      <button
                        className={styles.removeResourceBtn}
                        onClick={() => removeHotel(idx)}
                      >
                        <X size={13} /> Quitar
                      </button>
                    </div>
                  )}
                  <ProveedorCombobox
                    opciones={hotelesDisponibles}
                    value={h.hotelId}
                    onChange={(v) => setHotel(idx, "hotelId", v)}
                    placeholder="Sin hotel asignado"
                    icon={Hotel}
                    accentColor="#16a34a"
                    comprometidoHoy={comprometidoHoy} // ← agregar
                  />
                  {h.hotelId && (
                    <div className={styles.habGrid}>
                      {[
                        { k: "simples", l: "Hab. Simples", d: "1 persona" },
                        { k: "dobles", l: "Hab. Dobles", d: "2 camas" },
                        {
                          k: "matrimoniales",
                          l: "Matrimoniales",
                          d: "1 cama doble",
                        },
                      ].map(({ k, l, d }) => (
                        <div key={k} className={styles.habRow}>
                          <div>
                            <span className={styles.habLabel}>{l}</span>
                            <span className={styles.habDesc}>{d}</span>
                          </div>
                          <input
                            type="number"
                            min="0"
                            onFocus={(e) => e.target.select()}
                            value={h[k]}
                            onChange={(e) =>
                              setHotel(
                                idx,
                                k,
                                Math.max(0, Number(e.target.value)),
                              )
                            }
                            className={styles.numInput}
                          />
                        </div>
                      ))}
                      {totalHab > 0 && (
                        <p className={styles.resumenBar}>
                          Total: {totalHab} hab. — {h.simples}S · {h.dobles}D ·{" "}
                          {h.matrimoniales}M
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* TRANSPORTE */}
        <div className={styles.card}>
          <div className={styles.recursoSeccionHeader}>
            <div className={styles.resourceHeader}>
              <Bus size={18} color="#3b82f6" />
              <h3 className={styles.cardTitle}>Transporte</h3>
            </div>
            <button className={styles.addResourceBtn} onClick={addTrans}>
              <Plus size={14} /> Agregar
            </button>
          </div>
          <div className={styles.recursosList}>
            {rec.transportes.map((t, idx) => (
              <div key={idx} className={styles.recursoItem}>
                {rec.transportes.length > 1 && (
                  <div className={styles.recursoItemHeader}>
                    <span className={styles.recursoItemLabel}>
                      Transporte {idx + 1}
                    </span>
                    <button
                      className={styles.removeResourceBtn}
                      onClick={() => removeTrans(idx)}
                    >
                      <X size={13} /> Quitar
                    </button>
                  </div>
                )}
                <ProveedorCombobox
                  opciones={transportesDisponibles}
                  value={t.transporteId}
                  onChange={(v) => setTrans(idx, "transporteId", v)}
                  placeholder="Sin transporte asignado"
                  icon={Bus}
                  accentColor="#3b82f6"
                  comprometidoHoy={comprometidoHoy} // ← agregar
                />
                {t.transporteId && (
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>
                      Capacidad total (pax)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={t.transCapacidad}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) =>
                        setTrans(
                          idx,
                          "transCapacidad",
                          Math.max(0, Number(e.target.value)),
                        )
                      }
                      placeholder="Ej: 45"
                      className={styles.numInput}
                      style={{ width: "100%", textAlign: "left" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RESTAURANTE */}
        <div className={styles.card}>
          <div className={styles.recursoSeccionHeader}>
            <div className={styles.resourceHeader}>
              <UtensilsCrossed size={18} color="#f97316" />
              <h3 className={styles.cardTitle}>Restaurante</h3>
            </div>
            <button className={styles.addResourceBtn} onClick={addRest}>
              <Plus size={14} /> Agregar
            </button>
          </div>
          <div className={styles.recursosList}>
            {rec.restaurantes.map((rt, idx) => (
              <div key={idx} className={styles.recursoItem}>
                {rec.restaurantes.length > 1 && (
                  <div className={styles.recursoItemHeader}>
                    <span className={styles.recursoItemLabel}>
                      Restaurante {idx + 1}
                    </span>
                    <button
                      className={styles.removeResourceBtn}
                      onClick={() => removeRest(idx)}
                    >
                      <X size={13} /> Quitar
                    </button>
                  </div>
                )}
                <ProveedorCombobox
                  opciones={restaurantesDisponibles}
                  value={rt.restauranteId}
                  onChange={(v) => setRest(idx, "restauranteId", v)}
                  placeholder="Sin restaurante asignado"
                  icon={UtensilsCrossed}
                  accentColor="#f97316"
                  comprometidoHoy={comprometidoHoy} // ← agregar
                />
                {rt.restauranteId && (
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>
                      Capacidad total (pax)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={rt.restCapacidad}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) =>
                        setRest(
                          idx,
                          "restCapacidad",
                          Math.max(0, Number(e.target.value)),
                        )
                      }
                      placeholder="Ej: 80"
                      className={styles.numInput}
                      style={{ width: "100%", textAlign: "left" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          BOTÓN GUARDAR
          ══════════════════════════════════════ */}
      <div className={styles.guardadoBar}>
        {editId && (
          <button
            className={styles.cancelarBtn}
            onClick={() => {
              setVueloSelId("");
              setVueloSel(null);
              setRec(EMPTY_REC);
              setObs("");
              setEditId(null);
              setErrors({});
            }}
          >
            Cancelar edición
          </button>
        )}
        <button
          className={styles.guardarBtn}
          onClick={handleGuardar}
          disabled={loading}
        >
          {loading ? (
            <span className={styles.spinnerInline} />
          ) : (
            <Save size={18} />
          )}
          {loading
            ? "Guardando..."
            : editId
              ? "Guardar cambios"
              : "Guardar información de vuelo"}
        </button>
      </div>

      {/* ══════════════════════════════════════
          4 — REGISTROS DEL DÍA (cards)
          ══════════════════════════════════════ */}
      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span className={styles.dividerLabel}>
          <CheckCircle size={14} /> Registros del Día — {HOY}
        </span>
        <span className={styles.dividerLine} />
      </div>

      {loadingHoy ? (
        <div className={styles.spinnerWrap}>
          <Spinner size="lg" />
        </div>
      ) : errorHoy ? (
        <div className={styles.emptyState}>
          <AlertCircle size={32} color="var(--danger-500, #e05252)" />
          <p>
            No se pudieron cargar los registros del día:{" "}
            {errorHoyDetalle?.response?.data?.message ??
              "intenta de nuevo o revisa el selector de estación/línea."}
          </p>
        </div>
      ) : registrosDelDia.length === 0 ? (
        <div className={styles.emptyState}>
          <Plane size={32} color="var(--text-300)" />
          <p>No hay vuelos registrados para hoy todavía.</p>
        </div>
      ) : (
        <div className={styles.registrosGrid}>
          {registrosDelDia.map((r) => (
            <RegistroCard
              key={r.id}
              r={r}
              hoy={HOY} // ← agregar esta línea en los 3 lugares
              onEditar={handleEditar}
              onEliminar={(id) => setConfirm({ open: true, id })}
            />
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════
          5 — HISTORIAL AGRUPADO POR FECHA
          ══════════════════════════════════════ */}
       {(misRegistros.length > 0 || loadingHist || errorHist) && (
        <>
          <div className={styles.divider}>
            <span className={styles.dividerLine} />
            <span className={styles.dividerLabel}>
              📅 Historial de registros
            </span>
            <span className={styles.dividerLine} />
          </div>

          {loadingHist ? (
            <div className={styles.spinnerWrap}>
              <Spinner size="lg" />
            </div>
          ) : errorHist ? (
            <div className={styles.emptyState}>
              <AlertCircle size={32} color="var(--danger-500, #e05252)" />
              <p>
                No se pudo cargar el historial:{" "}
                {errorHistDetalle?.response?.data?.message ??
                  "intenta de nuevo o revisa el selector de estación/línea."}
              </p>
            </div>
          ) : (
            <div className={styles.historial}>
              {Object.entries(historialPorFecha)
                .sort(([a], [b]) => b.localeCompare(a))
                .filter(([fecha]) => fecha !== HOY) // el día de hoy ya se muestra arriba
                .map(([fecha, registros]) => (
                  <div key={fecha} className={styles.historialGrupo}>
                    <h3 className={styles.historialFecha}>
                      <Calendar size={14} /> {fecha}
                    </h3>
                    <div className={styles.registrosGrid}>
                      {registros.map((r) => (
                        <RegistroCard
                          key={r.id}
                          r={r}
                          hoy={HOY} // ← agregar esta línea en los 3 lugares
                          onEditar={handleEditar}
                          onEliminar={(id) => setConfirm({ open: true, id })}
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      <EditarVueloModal
        open={editVueloModal}
        vuelo={vueloSel}
        onClose={() => setEditVueloModal(false)}
        onGuardado={(updated) => setVueloSel(updated)}
        onSuccess={(msg) => showModal("success", "Actualización exitosa", msg)}
      />

      <InfoModal
        open={modal.open}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />
      <ConfirmModal
        open={confirm.open}
        title="¿Eliminar registro?"
        message="El registro y sus recursos quedarán inactivos."
        onClose={() => setConfirm({ open: false, id: null })}
        onConfirm={handleEliminar}
        loading={eliminar.isPending}
      />
    </div>
  );
}
