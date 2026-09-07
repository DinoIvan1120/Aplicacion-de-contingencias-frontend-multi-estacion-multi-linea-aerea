import { useState } from "react";
import {
  UserCog,
  Plus,
  Edit,
  Power,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Search,
  X,
  Plane,
  Building2,
  BadgeCheck,
} from "lucide-react";
import {
  useBuscarUsuarios,
  useCrearUsuario,
  useActualizarUsuario,
  useCambiarEstadoUsuario,
  useEstacionesDeUsuario,
  useAsignarEstacionAUsuario,
  useQuitarEstacionDeUsuario,
} from "../../hooks/useUsuarios";
import { useEstaciones, useLineasDeEstacion } from "../../hooks/useEstaciones";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/constants";
import { getRolLabel } from "../../utils/roleUtils";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Modal from "../../components/ui/Modal.jsx";
import InfoModal from "../../components/ui/InfoModal.jsx";
import ConfirmModal from "../../components/ui/ConfirmModal.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import styles from "./AdminUsuariosPage.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// NUEVO: Configuración dinámica del campo "codigoEmpleado" según el rol.
// Cada rol tiene su propio label, placeholder, hint, ícono y validación.
// ─────────────────────────────────────────────────────────────────────────────
const CAMPO_POR_ROL = {
  LINEA_AEREA: {
    label: "Nombre de la aerolínea",
    placeholder: "Ej: Plus Ultra Airlines",
    // hint: "Debe coincidir exactamente con el nombre de la aerolínea en el sistema de vuelos.",
    icon: <Plane size={14} />,
    // NUEVO: validar que tenga al menos 3 caracteres y no sea solo números
    validate: (val) => {
      if (!val || val.trim().length < 3)
        return "Ingrese el nombre completo de la aerolínea (mín. 3 caracteres)";
      return null;
    },
  },
  PROVEEDOR: {
    label: "RUC del proveedor",
    placeholder: "Ej: 20512345672",
    // hint: "RUC de 11 dígitos del proveedor asociado a este usuario.",
    icon: <Building2 size={14} />,
    // NUEVO: validar que sea exactamente 11 dígitos numéricos (formato RUC Perú)
    validate: (val) => {
      if (!val) return "El RUC es obligatorio para usuarios Proveedor";
      if (!/^\d{11}$/.test(val))
        return "El RUC debe tener exactamente 11 dígitos numéricos";
      return null;
    },
  },
  // Roles operativos → campo estándar de código de empleado
  default: {
    label: "Código de empleado",
    placeholder: "Ej: EMP-001",
    hint: null,
    icon: <BadgeCheck size={14} />,
    validate: (val) => {
      if (!val || val.trim().length === 0)
        return "El código de empleado es requerido";
      return null;
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────

const ROL_OPTIONS = Object.values(ROLES).map((r) => ({
  value: r,
  label: getRolLabel(r),
}));

const EMPTY_FORM = {
  nombre: "",
  apellido: "",
  correo: "",
  documento: "",
  codigoEmpleado: "",
  password: "",
  rol: "",
};

const EMPTY_FILTROS = {
  nombre: "",
  correo: "",
  documento: "",
  codigoEmpleado: "",
  rol: "",
  estado: "",
};

const ESTADO_OPTIONS = [
  { value: "1", label: "Activo" },
  { value: "0", label: "Inactivo" },
];

export default function AdminUsuariosPage() {
  const { estacionActiva, lineaAereaActiva } = useAuth();
  // ── Estado del filtro ──────────────────────────────────────────
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [filtros, setFiltros] = useState(EMPTY_FILTROS);
  const [filtrosActivos, setFiltrosActivos] = useState(EMPTY_FILTROS);
  const [page] = useState(0);

  // ── Query con búsqueda dinámica ────────────────────────────────
 const { data: pageData, isLoading } = useBuscarUsuarios(
    filtrosActivos,
    { page, size: 50 },
    { estacionId: estacionActiva?.id, lineaAereaId: lineaAereaActiva?.lineaAereaId },
  );
  const usuarios = pageData?.content ?? [];
  const total = pageData?.totalElements ?? 0;

  // ── Estado del formulario CRUD ─────────────────────────────────
  const crear = useCrearUsuario();
  const actualizar = useActualizarUsuario();
  const cambiarEstado = useCambiarEstadoUsuario();

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const [confirm, setConfirm] = useState({
    open: false,
    id: null,
    estadoActual: null,
  });
  // Fase 5 — usuario cuyas estaciones se están gestionando en el modal
  const [estacionesUsuario, setEstacionesUsuario] = useState(null);
  const [modal, setModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
  });

  const showModal = (type, title, message) =>
    setModal({ open: true, type, title, message });

  // ─────────────────────────────────────────────────────────────────────────
  // NUEVO: obtener la configuración del campo según el rol actual del formulario
  // ─────────────────────────────────────────────────────────────────────────
  const campoConfig = CAMPO_POR_ROL[form.rol] ?? CAMPO_POR_ROL.default;

  // ── Handlers de filtro ─────────────────────────────────────────
  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((f) => ({ ...f, [name]: value }));
  };
  const handleBuscar = () => setFiltrosActivos({ ...filtros });
  const handleLimpiar = () => {
    setFiltros(EMPTY_FILTROS);
    setFiltrosActivos(EMPTY_FILTROS);
  };

  // Contar filtros activos para el badge
  const filtrosActivosCount = Object.values(filtrosActivos).filter(
    (v) => v !== "",
  ).length;

  // ── Handlers del formulario CRUD ───────────────────────────────
  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setShowPass(false);
    setFormOpen(true);
  };
  const openEdit = (u) => {
    setEditId(u.id);
    setForm({
      nombre: u.nombre ?? "",
      apellido: u.apellido ?? "",
      correo: u.correo ?? "",
      documento: u.documento ?? "",
      codigoEmpleado: u.codigoEmpleado ?? "",
      password: "",
      rol: u.rol ?? "",
    });
    setErrors({});
    setShowPass(false);
    setFormOpen(true);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // NUEVO: handleRolChange — al cambiar el rol, limpiar codigoEmpleado
  // para evitar que quede un valor incompatible del rol anterior.
  // ─────────────────────────────────────────────────────────────────────────
  const handleRolChange = (e) => {
    setForm((f) => ({ ...f, rol: e.target.value, codigoEmpleado: "" }));
    setErrors((er) => ({ ...er, rol: "", codigoEmpleado: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.nombre) e.nombre = "Requerido";
    if (!form.apellido) e.apellido = "Requerido";
    // if (!form.correo) e.correo = "Requerido";
    if (!form.correo && form.rol !== "AGENTE_SAASA") e.correo = "Requerido";
    if (!form.documento) e.documento = "Requerido";
    //if (!form.codigoEmpleado) e.codigoEmpleado = "Requerido";

    if (!form.rol) e.rol = "Requerido";

    // ── NUEVO: validación condicional según el rol ──────────────
    // Cada rol tiene su propia función de validación en CAMPO_POR_ROL.
    const errorCampo = campoConfig.validate(form.codigoEmpleado);
    if (errorCampo) e.codigoEmpleado = errorCampo;
    // ───────────────────────────────────────────────────────────

    if (!editId && !form.password) e.password = "Requerido al crear";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      // ✅ Para AGENTE_SAASA: si correo está vacío, enviarlo como null
      // Para otros roles: el correo es obligatorio (validate() ya lo garantiza)
      if (payload.rol === "AGENTE_SAASA" && !payload.correo?.trim()) {
        payload.correo = null;
      }
      if (editId) {
        await actualizar.mutateAsync({ id: editId, ...payload });
        showModal(
          "success",
          "Usuario actualizado",
          `${form.nombre} ${form.apellido} actualizado correctamente.`,
        );
      } else {
        await crear.mutateAsync(payload);
        showModal(
          "success",
          "Usuario creado",
          `${form.nombre} ${form.apellido} creado con rol ${getRolLabel(form.rol)}.`,
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
        "Estado del usuario cambiado correctamente.",
      );
    } catch (err) {
      showModal("error", "Error", err.response?.data?.message ?? "Error.");
    } finally {
      setConfirm({ open: false, id: null, estadoActual: null });
    }
  };

  const handleFormChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: "" }));
  };

  return (
    <div className={styles.page}>
      {/* ── Encabezado ── */}
      <div className={styles.pageHeader}>
        <UserCog size={24} color="var(--rol-admin)" />
        <div>
          <h1 className={styles.title}>Gestión de Usuarios</h1>
          <p className={styles.sub}>
            {total} usuario{total !== 1 ? "s" : ""} encontrado
            {total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className={styles.headerActions}>
          {/* Botón de filtro con badge contador */}
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
          <Button onClick={openCreate} size="sm">
            <Plus size={16} /> Nuevo usuario
          </Button>
        </div>
      </div>

      {/* ── Panel de filtros colapsable ── */}
      <div
        className={[
          styles.filterPanel,
          filtrosOpen ? styles.filterPanelOpen : "",
        ].join(" ")}
      >
        <div className={styles.filterGrid}>
          {/* Nombre / Apellido */}
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Nombre o Apellido</label>
            <div className={styles.filterInputWrap}>
              <Search size={14} className={styles.filterInputIcon} />
              <input
                name="nombre"
                value={filtros.nombre}
                onChange={handleFiltroChange}
                placeholder="Buscar por nombre..."
                className={styles.filterInput}
              />
            </div>
          </div>

          {/* Correo */}
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Correo electrónico</label>
            <div className={styles.filterInputWrap}>
              <Search size={14} className={styles.filterInputIcon} />
              <input
                name="correo"
                value={filtros.correo}
                onChange={handleFiltroChange}
                placeholder="Buscar por correo..."
                className={styles.filterInput}
              />
            </div>
          </div>

          {/* Documento */}
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>N° de Documento</label>
            <div className={styles.filterInputWrap}>
              <Search size={14} className={styles.filterInputIcon} />
              <input
                name="documento"
                value={filtros.documento}
                onChange={handleFiltroChange}
                placeholder="Buscar por documento..."
                className={styles.filterInput}
              />
            </div>
          </div>

          {/* Código de empleado */}
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Código de Empleado</label>
            <div className={styles.filterInputWrap}>
              <Search size={14} className={styles.filterInputIcon} />
              <input
                name="codigoEmpleado"
                value={filtros.codigoEmpleado}
                onChange={handleFiltroChange}
                placeholder="Buscar por código..."
                className={styles.filterInput}
              />
            </div>
          </div>

          {/* Rol */}
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Rol</label>
            <select
              name="rol"
              value={filtros.rol}
              onChange={handleFiltroChange}
              className={styles.filterSelect}
            >
              <option value="">Todos los roles</option>
              {ROL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Estado</label>
            <select
              name="estado"
              value={filtros.estado}
              onChange={handleFiltroChange}
              className={styles.filterSelect}
            >
              <option value="">Todos</option>
              {ESTADO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
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

      {/* ── Tabla de usuarios ── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {[
                "#",
                "Nombre",
                "Correo",
                "Documento",
                "Cód. Empleado",
                "Rol",
                "Estado",
                "Estaciones",
                "Acciones",
              ].map((h) => (
                <th key={h} className={styles.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className={styles.tdCenter}>
                  Cargando...
                </td>
              </tr>
            ) : usuarios.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.tdCenter}>
                  No se encontraron usuarios con los filtros aplicados.
                </td>
              </tr>
            ) : (
              usuarios.map((u, i) => (
                <tr key={u.id} className={styles.tr}>
                  <td className={styles.td}>{i + 1}</td>
                  <td className={styles.td}>
                    <strong>
                      {u.apellido}, {u.nombre}
                    </strong>
                  </td>
                  <td className={styles.td}>{u.correo}</td>
                  <td className={styles.td}>{u.documento ?? "—"}</td>
                  <td className={styles.td}>{u.codigoEmpleado ?? "—"}</td>
                  <td className={styles.td}>
                    <span className={styles.rolTag}>{getRolLabel(u.rol)}</span>
                  </td>
                  <td className={styles.td}>
                    <Badge
                      label={
                        u.estado === 1 || u.estado === true
                          ? "ACTIVO"
                          : "INACTIVO"
                      }
                      variant={
                        u.estado === 1 || u.estado === true
                          ? "success"
                          : "danger"
                      }
                    />
                  </td>
                  <td className={styles.td}>
                    <button
                      type="button"
                      className={styles.stationsLinkBtn}
                      onClick={() => setEstacionesUsuario(u)}
                      title="Gestionar estaciones asignadas"
                    >
                      <Building2 size={13} /> Gestionar
                    </button>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.rowActions}>
                      <button
                        className={styles.actionBtn}
                        onClick={() => openEdit(u)}
                        aria-label="Editar"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        className={[
                          styles.actionBtn,
                          u.estado === 1 || u.estado === true
                            ? styles.dangerBtn
                            : styles.successBtn,
                        ].join(" ")}
                        onClick={() =>
                          setConfirm({
                            open: true,
                            id: u.id,
                            estadoActual: u.estado,
                          })
                        }
                        aria-label="Cambiar estado"
                      >
                        <Power size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal de formulario ── */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? "Editar usuario" : "Nuevo usuario"}
        size="md"
      >
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.formGrid}>
            <Input
              label="Nombre"
              name="nombre"
              value={form.nombre}
              onChange={handleFormChange}
              error={errors.nombre}
              placeholder="Ej: Roberto"
              required
            />
            <Input
              label="Apellido"
              name="apellido"
              value={form.apellido}
              onChange={handleFormChange}
              error={errors.apellido}
              placeholder="Ej: Vargas"
              required
            />
          </div>

          {/* <Input
            label="Correo electrónico"
            name="correo"
            type="email"
            value={form.correo}
            onChange={handleFormChange}
            error={errors.correo}
            placeholder="usuario@saasa.com"
            required
          /> */}
          <Input
            label={
              form.rol === "AGENTE_SAASA"
                ? "Correo electrónico (opcional)"
                : "Correo electrónico"
            }
            name="correo"
            type="email"
            value={form.correo}
            onChange={handleFormChange}
            error={errors.correo}
            placeholder={
              form.rol === "AGENTE_SAASA"
                ? "Sin correo — login por DNI"
                : "usuario@saasa.com"
            }
            required={form.rol !== "AGENTE_SAASA"}
          />

          <div className={styles.formGrid}>
            <Input
              label="N° de documento"
              name="documento"
              value={form.documento}
              onChange={handleFormChange}
              error={errors.documento}
              placeholder="Ej: 12345678"
              required
            />

            {/* <Select
              label="Rol"
              name="rol"
              value={form.rol}
              onChange={handleRolChange} // ← NUEVO handler que limpia codigoEmpleado
              options={ROL_OPTIONS}
              error={errors.rol}
              required
              placeholder="Seleccione rol..."
            /> */}

            <div>
              <Input
                label={campoConfig.label}
                name="codigoEmpleado"
                value={form.codigoEmpleado}
                onChange={handleFormChange}
                error={errors.codigoEmpleado}
                placeholder={campoConfig.placeholder}
                required
              />
              {/* FIX #4: Hint azul — solo aparece para LINEA_AEREA y PROVEEDOR */}
              {campoConfig.hint && (
                <div className={styles.fieldHint}>
                  <span className={styles.hintIcon}>{campoConfig.icon}</span>
                  <span>{campoConfig.hint}</span>
                </div>
              )}
            </div>

            {/* <Input
              label="Código de empleado"
              name="codigoEmpleado"
              value={form.codigoEmpleado}
              onChange={handleFormChange}
              error={errors.codigoEmpleado}
              placeholder="Ej: EMP-001"
              required
            /> */}
          </div>

          {/* Contraseña con ojo */}
          <div className={styles.passField}>
            <label className={styles.passLabel}>
              Contraseña {!editId && <span className={styles.req}>*</span>}
              {editId && (
                <span className={styles.optional}>(vacío = sin cambios)</span>
              )}
            </label>
            <div className={styles.passWrap}>
              <input
                name="password"
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={handleFormChange}
                placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número"
                className={[
                  styles.passInput,
                  errors.password ? styles.passError : "",
                ].join(" ")}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? "Ocultar" : "Mostrar"}
              >
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {errors.password && (
              <span className={styles.fieldError}>{errors.password}</span>
            )}
          </div>

          <Select
            label="Rol"
            name="rol"
            value={form.rol}
            onChange={handleFormChange}
            options={ROL_OPTIONS}
            error={errors.rol}
            required
            placeholder="Seleccione rol..."
          />

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
        title="Cambiar estado de usuario"
        message="¿Confirmas el cambio de estado del usuario?"
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

      {estacionesUsuario && (
        <EstacionesDeUsuarioModal
          usuario={estacionesUsuario}
          onClose={() => setEstacionesUsuario(null)}
          showModal={(type, title, message) =>
            setModal({ open: true, type, title, message })
          }
        />
      )}
    </div>
  );
}

/**
 * Modal para asignar/quitar las estaciones de un usuario (Fase 2/5 —
 * multi-estación). Un usuario sin ninguna estación asignada aquí queda
 * como Administrador Global (sección 9.3 del documento funcional) — se
 * muestra una advertencia explícita para que quede claro que es
 * intencional y no un olvido.
 */
function EstacionesDeUsuarioModal({ usuario, onClose, showModal }) {
  const { data: asignadas, isLoading } = useEstacionesDeUsuario(usuario.id);
  const { data: todasLasEstaciones } = useEstaciones({ estado: 1 });
  const asignar = useAsignarEstacionAUsuario(usuario.id);
  const quitar = useQuitarEstacionDeUsuario(usuario.id);

  // Selección en dos pasos: primero estación, luego (opcional) línea aérea
  // habilitada en ESA estación — mismo patrón en cascada que AdminProveedoresPage.
  const [estacionSel, setEstacionSel] = useState("");
  const [lineaSel, setLineaSel] = useState("");

  const { data: lineasEstacion } = useLineasDeEstacion(
    estacionSel ? Number(estacionSel) : undefined,
    { estado: 1 },
  );

  const activas = (asignadas ?? []).filter((a) => a.estado === 1);

  // Ya NO se filtran las estaciones ya asignadas: un usuario puede tener la
  // misma estación varias veces con líneas aéreas distintas (el backend
  // reactiva/upsertea por estación+línea, no por estación sola).
  const opcionesEstacion = (todasLasEstaciones ?? []).map((e) => ({
    value: String(e.id),
    label: `${e.nombre} (${e.codigoIata})`,
  }));

  const opcionesLinea = (lineasEstacion ?? []).map((l) => ({
    value: String(l.lineaAereaId),
    label: `${l.lineaAereaNombre} (${l.lineaAereaCodigoIata})`,
  }));

  const handleEstacionChange = (e) => {
    setEstacionSel(e.target.value);
    setLineaSel(""); // reset al cambiar de estación
  };

  const handleAsignar = async () => {
    if (!estacionSel) return;
    try {
      await asignar.mutateAsync({
        estacionId: parseInt(estacionSel, 10),
        lineaAereaId: lineaSel ? parseInt(lineaSel, 10) : null,
      });
      setEstacionSel("");
      setLineaSel("");
    } catch (err) {
      showModal("error", "Error", err.response?.data?.message ?? "No se pudo asignar.");
    }
  };

  // Ahora recibe el id de la RELACIÓN (UsuarioEstacion.id), no el estacionId,
  // porque puede haber varias filas para la misma estación (ver backend).
  const handleQuitar = async (relacionId) => {
    try {
      await quitar.mutateAsync(relacionId);
    } catch (err) {
      showModal("error", "Error", err.response?.data?.message ?? "No se pudo quitar.");
    }
  };

  return (
    <Modal open onClose={onClose} title={`Estaciones — ${usuario.nombre} ${usuario.apellido}`} size="sm">
      <div className={styles.stationsModalBody}>
        <div className={styles.addLineaRow}>
          <Select
            value={estacionSel}
            onChange={handleEstacionChange}
            options={opcionesEstacion}
            placeholder="Seleccione estación..."
          />
          <Select
            value={lineaSel}
            onChange={(e) => setLineaSel(e.target.value)}
            options={opcionesLinea}
            placeholder={estacionSel ? "Todas las líneas" : "Elija estación primero"}
            disabled={!estacionSel}
          />
          <Button size="sm" onClick={handleAsignar} disabled={!estacionSel || asignar.isPending}>
            <Plus size={15} />
          </Button>
        </div>
        <p className={styles.stationsHint}>
          Deja "Todas las líneas" para que el usuario vea toda la estación, o
          elige una línea aérea específica para restringir su acceso a solo
          esa aerolínea dentro de la estación.
        </p>

        {isLoading ? (
          <p className={styles.stationsHint}>Cargando...</p>
        ) : activas.length === 0 ? (
          <p className={styles.stationsWarning}>
            <Building2 size={14} /> Este usuario no tiene ninguna estación
            asignada — es <strong>Administrador Global</strong>: puede ver y
            administrar todas las estaciones sin restricción.
          </p>
        ) : (
          <div className={styles.stationsList}>
            {activas.map((a) => (
              <div key={a.id} className={styles.stationRow}>
                <span className={styles.lineaCode}>{a.estacionCodigoIata}</span>
                <span className={styles.lineaNombre}>
                  {a.estacionNombre}
                  {a.lineaAereaNombre ? ` · ${a.lineaAereaNombre}` : " · Todas las líneas"}
                </span>
                <button
                  type="button"
                  className={styles.removeBtn}
                  title="Quitar acceso a esta estación"
                  onClick={() => handleQuitar(a.id)}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
