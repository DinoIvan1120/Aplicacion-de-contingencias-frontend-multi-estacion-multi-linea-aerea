import { useState } from "react";
import {
  ClipboardList,
  Plus,
  Edit,
  Power,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import proveedoresApi from "../../api/proveedoresApi.js";
import {
  useProveedores,
  useProveedorConServicios,
  useCrearProveedorConServicios,
  useActualizarProveedorConServicios,
  useCambiarEstadoProveedor,
} from "../../hooks/useProveedores";
import { useLineasDeEstacion } from "../../hooks/useEstaciones";
import { useAuth } from "../../context/AuthContext";
import { TIPOS_PROVEEDOR } from "../../utils/constants";
import { formatearMonto } from "../../utils/formatters";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Modal from "../../components/ui/Modal.jsx";
import InfoModal from "../../components/ui/InfoModal.jsx";
import ConfirmModal from "../../components/ui/ConfirmModal.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import styles from "./AdminProveedoresPage.module.css";

/* ── Etiquetas amigables ── */
const SERVICIO_LABELS = {
  HABITACION_SIMPLE: "Hab. Simple",
  HABITACION_DOBLE: "Hab. Doble",
  HABITACION_MATRIMONIAL: "Hab. Matrimonial",
  HOTEL_DESAYUNO: "Desayuno",
  HOTEL_ALMUERZO: "Almuerzo",
  HOTEL_SNACK: "Snack",
  HOTEL_CENA: "Cena",
  TRANSPORTE_INDIVIDUAL: "Aeropuerto - Domicilio",
  TRANSPORTE_GRUPAL: "Domicilio - Aeropuerto",
  RESTAURANTE_DESAYUNO: "Desayuno",
  RESTAURANTE_ALMUERZO: "Almuerzo",
  RESTAURANTE_CENA: "Cena",
};

/* ── Panel lazy de servicios ── */
function ServiciosPanel({ proveedorId }) {
  const { data, isLoading } = useProveedorConServicios(proveedorId);
  const servicios = data?.servicios ?? [];

  if (isLoading) return <p className={styles.svMsg}>Cargando...</p>;
  if (!servicios.length)
    return <p className={styles.svMsg}>Sin servicios configurados</p>;

  return (
    <div className={styles.svGrid}>
      {servicios.map((sv) => (
        <div key={sv.id} className={styles.svItem}>
          <span className={styles.svLabel}>
            {SERVICIO_LABELS[sv.tipoServicio] ?? sv.tipoServicio}
          </span>
          <span className={styles.svMonto}>{formatearMonto(sv.monto)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Card del proveedor ── */
function ProveedorCard({ p, onEdit, onToggleEstado }) {
  const [expanded, setExpanded] = useState(false);
  const activo = p.estado === 1 || p.estado === true;

  return (
    <div
      className={[styles.card, !activo ? styles.cardInactivo : ""].join(" ")}
    >
      {/* Cabecera tipo + badge */}
      <div className={styles.cardTop}>
        <span className={styles.tipo}>{p.tipo}</span>
        <Badge
          label={activo ? "ACTIVO" : "INACTIVO"}
          variant={activo ? "success" : "danger"}
        />
      </div>

      {/* Nombre */}
      <h3 className={styles.nombre}>{p.nombre}</h3>
      {p.ruc && <span className={styles.ruc}>RUC: {p.ruc}</span>}

      {/* Contacto */}
      <div className={styles.contacto}>
        {p.correo && <span>✉ {p.correo}</span>}
        {p.telefono && <span>📞 {p.telefono}</span>}
        {p.direccion && <span>📍 {p.direccion}</span>}
      </div>

      {/* Toggle servicios */}
      <button
        className={[styles.svToggle, expanded ? styles.svToggleOpen : ""].join(
          " ",
        )}
        onClick={() => setExpanded((v) => !v)}
      >
        <span>Ver servicios y precios</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className={styles.svPanel}>
          <ServiciosPanel proveedorId={p.id} />
        </div>
      )}

      {/* Acciones */}
      <div className={styles.cardActions}>
        <Button variant="ghost" size="sm" onClick={() => onEdit(p)}>
          <Edit size={14} /> Editar
        </Button>
        <Button
          variant={activo ? "danger" : "secondary"}
          size="sm"
          onClick={() => onToggleEstado(p)}
        >
          <Power size={14} /> {activo ? "Desactivar" : "Activar"}
        </Button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Configuración de campos de precio por tipo
   ══════════════════════════════════════════════════ */
const CAMPOS_HOTEL = [
  { key: "hs", label: "Hab. Simple", apiKey: "precioHabitacionSimple" },
  { key: "hd", label: "Hab. Doble", apiKey: "precioHabitacionDoble" },
  {
    key: "hm",
    label: "Hab. Matrimonial",
    apiKey: "precioHabitacionMatrimonial",
  },
  { key: "hde", label: "Desayuno", apiKey: "precioDesayuno" },
  { key: "hal", label: "Almuerzo", apiKey: "precioAlmuerzo" },
  { key: "hsn", label: "Snack", apiKey: "precioSnack" },
  { key: "hce", label: "Cena", apiKey: "precioCena" },
];
const CAMPOS_TRANSPORTE = [
  {
    key: "ti",
    label: "Aeropuerto - Domicilio",
    apiKey: "precioTrasladoIndividual",
  },
  {
    key: "tg",
    label: "Domicilio - Aeropuerto",
    apiKey: "precioTransporteGrupal",
  },
];
const CAMPOS_RESTAURANTE = [
  { key: "rde", label: "Desayuno", apiKey: "precioDesayuno" },
  { key: "ral", label: "Almuerzo", apiKey: "precioAlmuerzo" },
  { key: "rce", label: "Cena", apiKey: "precioCena" },
];

const CAMPOS_POR_TIPO = {
  HOTEL: CAMPOS_HOTEL,
  TRANSPORTE: CAMPOS_TRANSPORTE,
  RESTAURANTE: CAMPOS_RESTAURANTE,
};
const SECTION_TITLE = {
  HOTEL: "🏨 Habitaciones y alimentación",
  TRANSPORTE: "🚌 Servicios de traslado",
  RESTAURANTE: "🍽️ Servicios de comida",
};

/* Convierte los campos del form al payload del endpoint */
function buildPayload(form, campos, estacionActivaId, lineaAereaActivaId) {
  const base = {
    nombre: form.nombre,
    ruc: form.ruc, // ← añadir
    direccion: form.direccion,
    telefono: form.telefono,
    correo: form.correo,
    // RN-802 (Fase 3): el proveedor se crea siempre dentro del contexto
    // de trabajo activo (estación + línea aérea). lineaAereaId es
    // @NotNull en el backend (ProveedorConServiciosRequest), así que
    // debe viajar explícito en el body — no basta con los headers.
    estacionId: estacionActivaId ?? null,
    lineaAereaId: lineaAereaActivaId ?? null,
  };
  if (!campos.length) return base;

  const servicios = {};
  campos.forEach(({ key, apiKey }) => {
    const v = form[key];
    if (v !== "" && v !== undefined && v !== null)
      servicios[apiKey] = parseFloat(v) || 0;
  });

  if (form.tipo === "HOTEL") return { ...base, serviciosHotel: servicios };
  if (form.tipo === "TRANSPORTE")
    return { ...base, serviciosTransporte: servicios };
  if (form.tipo === "RESTAURANTE")
    return { ...base, serviciosRestaurante: servicios };
  return base;
}

/* Carga valores de servicios actuales en el form al editar */
function serviciosToForm(servicios = [], campos = []) {
  const MAP = {
    HABITACION_SIMPLE: "hs",
    HABITACION_DOBLE: "hd",
    HABITACION_MATRIMONIAL: "hm",
    HOTEL_DESAYUNO: "hde",
    HOTEL_ALMUERZO: "hal",
    HOTEL_SNACK: "hsn",
    HOTEL_CENA: "hce",
    TRANSPORTE_INDIVIDUAL: "ti",
    TRANSPORTE_GRUPAL: "tg",
    RESTAURANTE_DESAYUNO: "rde",
    RESTAURANTE_ALMUERZO: "ral",
    RESTAURANTE_CENA: "rce",
  };
  const out = {};
  campos.forEach(({ key }) => {
    out[key] = "";
  });
  servicios.forEach((sv) => {
    const k = MAP[sv.tipoServicio];
    if (k) out[k] = String(sv.monto ?? "");
  });
  return out;
}

const EMPTY_BASE = {
  tipo: "",
  nombre: "",
  ruc: "",
  direccion: "",
  telefono: "",
  correo: "",
  lineaAereaId: "",
};
const EMPTY_PRECIOS = Object.fromEntries(
  [...CAMPOS_HOTEL, ...CAMPOS_TRANSPORTE, ...CAMPOS_RESTAURANTE].map((c) => [
    c.key,
    "",
  ]),
);

/* ══════════════════════════════════════════════════
   Página principal
   ══════════════════════════════════════════════════ */
export default function AdminProveedoresPage() {
  const { estacionActiva, lineaAereaActiva } = useAuth();
  const [tipoFiltro, setTipoFiltro] = useState("");
  const { data: pageData, isLoading } = useProveedores({
    tipo: tipoFiltro || undefined,
    page: 0,
    size: 50,
  });
  const proveedores = pageData?.content ?? [];

  // RN-802 (Fase 3): catálogo de líneas aéreas habilitadas en la estación
  // activa — el proveedor que se cree/edite debe quedar en una de ellas.
  const { data: lineasEstacion } = useLineasDeEstacion(estacionActiva?.id, {
    estado: 1,
  });
  const opcionesLineaAerea = (lineasEstacion ?? []).map((l) => ({
    value: String(l.lineaAereaId),
    label: `${l.lineaAereaNombre} (${l.lineaAereaCodigoIata})`,
  }));

  const crear = useCrearProveedorConServicios();
  const actualizar = useActualizarProveedorConServicios();
  const cambiarEstado = useCambiarEstadoProveedor();

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_BASE, ...EMPTY_PRECIOS });
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState({
    open: false,
    id: null,
    estadoActual: null,
  });
  const [modal, setModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
  });

  const showModal = (type, title, msg) =>
    setModal({ open: true, type, title, message: msg });

  const openCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY_BASE, ...EMPTY_PRECIOS });
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = async (p) => {
    setEditId(p.id);
    const campos = CAMPOS_POR_TIPO[p.tipo] ?? [];
    // Obtener servicios actuales via API
    let preciosForm = Object.fromEntries(campos.map((c) => [c.key, ""]));
    try {
      const res = await proveedoresApi.getConServicios(p.id);
      if (res?.data?.data?.servicios) {
        preciosForm = serviciosToForm(res.data.data.servicios, campos);
      }
    } catch {
      /* sin servicios previos */
    }

    setForm({
      ...EMPTY_PRECIOS,
      tipo: p.tipo,
      nombre: p.nombre,
      ruc: p.ruc ?? "",
      direccion: p.direccion ?? "",
      telefono: p.telefono ?? "",
      correo: p.correo ?? "",
      ...preciosForm,
    });
    setErrors({});
    setFormOpen(true);
  };

    const validate = () => {
    const e = {};
    if (!form.nombre) e.nombre = "Requerido";
    if (!lineaAereaActiva?.lineaAereaId)
      e.contexto = "Selecciona una línea aérea en el selector del topbar antes de continuar";
    if (!editId) {
      if (!form.tipo) e.tipo = "Requerido";
      if (!form.ruc || form.ruc.length !== 11)
        e.ruc = "El RUC debe tener 11 dígitos";
      const campos = CAMPOS_POR_TIPO[form.tipo] ?? [];
      if (
        campos.length > 0 &&
        !campos.some(({ key }) => parseFloat(form[key]) > 0)
      )
        e.servicios = "Ingresa al menos un precio mayor a 0";
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const campos = CAMPOS_POR_TIPO[form.tipo] ?? [];
    try {
      if (editId) {
        // updateConServicios (PUT) no acepta estacionId/lineaAereaId: la
        // línea aérea/estación de un proveedor es inmutable tras crearlo,
        // así que aquí NO se incluyen esos campos.
        const { estacionId, lineaAereaId, ...payload } = buildPayload(
          form,
          campos,
          estacionActiva?.id,
          lineaAereaActiva?.lineaAereaId,
        );
        const res = await actualizar.mutateAsync({ id: editId, ...payload });
        const count = res?.data?.data?.servicios?.length ?? 0;
        showModal(
          "success",
          "Proveedor actualizado",
          `${form.nombre} actualizado con ${count} servicio${count !== 1 ? "s" : ""} activo${count !== 1 ? "s" : ""}.`,
        );
     } else {
        const payload = {
          tipo: form.tipo,
          nombre: form.nombre,
          ruc: form.ruc,
          direccion: form.direccion,
          telefono: form.telefono,
          correo: form.correo,
          ...buildPayload(
            form,
            campos,
            estacionActiva?.id,
            lineaAereaActiva?.lineaAereaId,
          ),
        };
        const res = await crear.mutateAsync(payload);
        const count = res?.data?.data?.servicios?.length ?? 0;
        showModal(
          "success",
          "Proveedor creado",
          `${form.nombre} creado con ${count} servicio${count !== 1 ? "s" : ""}.`,
        );
      }
      setFormOpen(false);
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "Error inesperado.",
      );
    }
  };

  const handleCambiarEstado = async () => {
    try {
      await cambiarEstado.mutateAsync({
        id: confirm.id,
        estadoActual: confirm.estadoActual,
      });
      showModal(
        "success",
        "Estado actualizado",
        "Estado del proveedor cambiado.",
      );
    } catch (err) {
      showModal("error", "Error", err.response?.data?.message ?? "Error.");
    } finally {
      setConfirm({ open: false, id: null, estadoActual: null });
    }
  };

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: "", servicios: "" }));
  };

  const campos = CAMPOS_POR_TIPO[form.tipo] ?? [];

  return (
    <div className={styles.page}>
      {/* Encabezado */}
      <div className={styles.pageHeader}>
        <ClipboardList size={24} color="var(--rol-admin)" />
        <div>
          <h1 className={styles.title}>Gestión de Proveedores</h1>
          <p className={styles.sub}>
            {proveedores.length} proveedor{proveedores.length !== 1 ? "es" : ""}
          </p>
        </div>
        <div className={styles.headerActions}>
          <select
            className={styles.filterSelect}
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            {TIPOS_PROVEEDOR.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <Button onClick={openCreate} size="sm">
            <Plus size={16} /> Nuevo proveedor
          </Button>
        </div>
      </div>

      {/* Grid de cards */}
      <div className={styles.grid}>
        {isLoading ? (
          <p className={styles.loadingMsg}>Cargando proveedores...</p>
        ) : !proveedores.length ? (
          <p className={styles.loadingMsg}>No hay proveedores registrados.</p>
        ) : (
          proveedores.map((p) => (
            <ProveedorCard
              key={p.id}
              p={p}
              onEdit={openEdit}
              onToggleEstado={(p) =>
                setConfirm({ open: true, id: p.id, estadoActual: p.estado })
              }
            />
          ))
        )}
      </div>

      {/* Modal formulario */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? `Editar proveedor — ${form.tipo}` : "Nuevo proveedor"}
        size="md"
      >
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {/* Tipo — deshabilitado al editar */}
          <Select
            label="Tipo"
            name="tipo"
            value={form.tipo}
            onChange={handleChange}
            options={TIPOS_PROVEEDOR}
            error={errors.tipo}
            required
            disabled={!!editId}
            placeholder="Seleccione..."
          />

          <Input
            label="Nombre"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            error={errors.nombre}
            placeholder="Nombre del proveedor"
            required
          />

          <div className={styles.formGrid}>
            <Input
              label="RUC"
              name="ruc"
              value={form.ruc}
              onChange={handleChange}
              error={errors.ruc}
              placeholder="20XXXXXXXXX"
              maxLength={11}
              // disabled={!!editId}
            />
            <Input
              label="Teléfono"
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              placeholder="+51 ..."
            />
          </div>

          <Input
            label="Dirección"
            name="direccion"
            value={form.direccion}
            onChange={handleChange}
            placeholder="Av. ..."
          />
          <Input
            label="Correo"
            name="correo"
            type="email"
            value={form.correo}
            onChange={handleChange}
            placeholder="contacto@proveedor.com"
          />

          {/* RN-802 (Fase 3): línea aérea a la que atiende este proveedor —
              obligatoria tanto al crear como al editar. Las opciones son las
              líneas habilitadas en la estación activa (Fase 5). */}
          <div className={styles.contextoActivoBox}>
            Este proveedor se registrará en:{" "}
            <strong>
              {estacionActiva?.nombre ?? "—"}
              {lineaAereaActiva?.lineaAereaNombre ? ` · ${lineaAereaActiva.lineaAereaNombre}` : ""}
            </strong>
          </div>
          {errors.contexto && <p className={styles.fieldError}>{errors.contexto}</p>}
          {editId && (
            <p className={styles.fieldHint}>
              Por una limitación actual, el sistema no puede mostrar la línea
              aérea que el proveedor ya tenía asignada — vuelve a
              seleccionarla antes de guardar.
            </p>
          )}
          {opcionesLineaAerea.length === 0 && (
            <p className={styles.fieldHint}>
              La estación activa ({estacionActiva?.nombre ?? "sin definir"})
              no tiene líneas aéreas habilitadas todavía. Habilítalas desde
              Administración → Estaciones.
            </p>
          )}

          {/* Sección de precios por tipo */}
          {campos.length > 0 && (
            <div className={styles.serviciosSection}>
              <div className={styles.serviciosSectionHeader}>
                <span className={styles.serviciosSectionTitle}>
                  {SECTION_TITLE[form.tipo]}
                </span>
                {!editId && (
                  <span className={styles.serviciosSectionNote}>
                    Solo se crean precios &gt; 0
                  </span>
                )}
                {editId && (
                  <span className={styles.serviciosSectionNote}>
                    0 = desactiva el servicio · vacío = no cambia
                  </span>
                )}
              </div>

              <div className={styles.preciosGrid}>
                {campos.map(({ key, label }) => (
                  <div key={key} className={styles.precioItem}>
                    <span className={styles.precioLabel}>{label}</span>
                    <div className={styles.precioInputWrap}>
                      <span className={styles.currency}>S/</span>
                      <input
                        type="number"
                        name={key}
                        value={form[key]}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        placeholder={editId ? "—" : "0.00"}
                        className={styles.precioInput}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {errors.servicios && (
                <p className={styles.serviciosError}>{errors.servicios}</p>
              )}
            </div>
          )}

          <div className={styles.formActions}>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setFormOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={crear.isPending || actualizar.isPending}
            >
              {editId ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={confirm.open}
        title={
          confirm.estadoActual === 1 || confirm.estadoActual === true
            ? "Desactivar proveedor"
            : "Activar proveedor"
        }
        message="¿Confirmas el cambio de estado del proveedor?"
        onClose={() =>
          setConfirm({ open: false, id: null, estadoActual: null })
        }
        onConfirm={handleCambiarEstado}
        loading={cambiarEstado.isPending}
      />

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
