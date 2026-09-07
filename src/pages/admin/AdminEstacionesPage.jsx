import { useState,useRef } from "react";
import { Building2, Plus, Edit, Power, Plane, X, Camera } from "lucide-react";
import {
  useEstaciones,
  useCrearEstacion,
  useActualizarEstacion,
  useCambiarEstadoEstacion,
  useLineasDeEstacion,
  useAsignarLineaAerea,
  useCambiarEstadoLineaDeEstacion,
  useFotoEstacion,
  useSubirFotoEstacion,
} from "../../hooks/useEstaciones";
import {
  useLineasAereas,
  useCrearLineaAerea,
  useLogoLineaAerea,
  useSubirLogoLineaAerea
} from "../../hooks/useLineasAereas";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Modal from "../../components/ui/Modal.jsx";
import InfoModal from "../../components/ui/InfoModal.jsx";
import ConfirmModal from "../../components/ui/ConfirmModal.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import styles from "./AdminEstacionesPage.module.css";

const TABS = { ESTACIONES: "estaciones", LINEAS: "lineas" };

const EMPTY_ESTACION = { codigoIata: "", nombre: "", zonaHoraria: "America/Lima" };
const EMPTY_LINEA = { codigoIata: "", nombre: "" };

export default function AdminEstacionesPage() {
  const [tab, setTab] = useState(TABS.ESTACIONES);

  const [modal, setModal] = useState({ open: false, type: "success", title: "", msg: "" });
  const showModal = (type, title, msg) => setModal({ open: true, type, title, msg });

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <span className={styles.pageHeaderIcon}>
          <Building2 color="var(--rol-admin)" />
        </span>
        <div>
          <h1 className={styles.title}>Estaciones y Líneas Aéreas</h1>
          <p className={styles.sub}>
            Administración multi-estación — qué aeropuertos operan, y qué
            líneas aéreas atienden en cada uno.
          </p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          type="button"
          className={[styles.tabBtn, tab === TABS.ESTACIONES ? styles.tabBtnActive : ""].join(" ")}
          onClick={() => setTab(TABS.ESTACIONES)}
        >
          Estaciones
        </button>
        <button
          type="button"
          className={[styles.tabBtn, tab === TABS.LINEAS ? styles.tabBtnActive : ""].join(" ")}
          onClick={() => setTab(TABS.LINEAS)}
        >
          Catálogo
        </button>
      </div>

      {tab === TABS.ESTACIONES ? (
        <EstacionesTab showModal={showModal} />
      ) : (
        <LineasAereasTab showModal={showModal} />
      )}

      <InfoModal
        open={modal.open}
        type={modal.type}
        title={modal.title}
        message={modal.msg}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />
    </div>
  );
}

/* ════════════════════════ TAB: ESTACIONES ════════════════════════ */

function FotoEstacion({ estacion, showModal }) {
  const tieneFoto = !!estacion.fotoKey;
  const { data: fotoUrl, isLoading, isError } = useFotoEstacion(estacion.id, {
    enabled: tieneFoto,
  });
  const subirFoto = useSubirFotoEstacion();
  const inputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await subirFoto.mutateAsync({ id: estacion.id, file });
    } catch (err) {
      showModal("error", "Error", err.response?.data?.message ?? "No se pudo subir la foto.");
    }
  };

  const mostrarImagen = tieneFoto && !isLoading && !isError && fotoUrl;

  return (
    <div className={styles.fotoWrapper}>
      <button
        type="button"
        className={styles.fotoButton}
        onClick={() => inputRef.current?.click()}
        disabled={subirFoto.isPending}
        title={mostrarImagen ? "Cambiar foto" : "Subir foto del aeropuerto"}
      >
        {mostrarImagen ? (
          <img src={fotoUrl} alt={`Foto ${estacion.nombre}`} className={styles.fotoImg} />
        ) : (
          <div className={styles.fotoPlaceholder}>
            <Building2 size={28} />
            <span>Subir foto</span>
          </div>
        )}
        <span className={styles.fotoOverlay}>
          <Camera size={16} />
          {mostrarImagen ? "Cambiar foto" : "Subir foto"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className={styles.hiddenFileInput}
        onChange={handleFileChange}
      />
    </div>
  );
}

function EstacionesTab({ showModal }) {
  const { data: estaciones, isLoading } = useEstaciones();
  const crear = useCrearEstacion();
  const actualizar = useActualizarEstacion();
  const cambiarEstado = useCambiarEstadoEstacion();

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_ESTACION);
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState({ open: false, id: null, estadoActual: null });
  const [lineasModalEstacion, setLineasModalEstacion] = useState(null);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_ESTACION);
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (estacion) => {
    setEditId(estacion.id);
    setForm({
      codigoIata: estacion.codigoIata,
      nombre: estacion.nombre,
      zonaHoraria: estacion.zonaHoraria ?? "America/Lima",
    });
    setErrors({});
    setFormOpen(true);
  };

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.codigoIata || form.codigoIata.length !== 3)
      e.codigoIata = "Debe tener 3 letras (p. ej. LIM)";
    if (!form.nombre) e.nombre = "Requerido";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = { ...form, codigoIata: form.codigoIata.toUpperCase() };
    try {
      if (editId) {
        await actualizar.mutateAsync({ id: editId, ...payload });
        showModal("success", "Estación actualizada", `${form.nombre} actualizada.`);
      } else {
        await crear.mutateAsync(payload);
        showModal("success", "Estación creada", `${form.nombre} creada correctamente.`);
      }
      setFormOpen(false);
    } catch (err) {
      showModal("error", "Error", err.response?.data?.message ?? "Error inesperado.");
    }
  };

  const handleConfirmEstado = async () => {
    try {
      await cambiarEstado.mutateAsync({ id: confirm.id, estadoActual: confirm.estadoActual });
      showModal("success", "Estado actualizado", "Estado de la estación cambiado.");
    } catch (err) {
      showModal("error", "Error", err.response?.data?.message ?? "Error.");
    } finally {
      setConfirm({ open: false, id: null, estadoActual: null });
    }
  };

  return (
    <>
      <div className={styles.sectionHeader}>
        <p className={styles.sectionCount}>
          {estaciones?.length ?? 0} estación{(estaciones?.length ?? 0) !== 1 ? "es" : ""}
        </p>
        <Button onClick={openCreate} size="sm" className={styles.sectionBtn}>
          <Plus size={16} /> Nueva estación
        </Button>
      </div>

      <div className={styles.grid}>
        {isLoading ? (
          <p className={styles.loadingMsg}>Cargando estaciones...</p>
        ) : !estaciones?.length ? (
          <p className={styles.loadingMsg}>No hay estaciones registradas.</p>
        ) : (
          estaciones.map((es) => (
            <div key={es.id} className={styles.card}>
              <FotoEstacion estacion={es} showModal={showModal} />
              <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                  <span className={styles.cardCode}>{es.codigoIata}</span>
                  <Badge
                    label={es.estado === 1 ? "ACTIVA" : "INACTIVA"}
                    variant={es.estado === 1 ? "success" : "neutral"}
                  />
                </div>
                <h3 className={styles.cardName}>{es.nombre}</h3>
                <p className={styles.cardSub}>{es.zonaHoraria}</p>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => setLineasModalEstacion(es)}
                    title="Gestionar líneas aéreas"
                  >
                    <Plane size={15} /> Líneas aéreas
                  </button>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => openEdit(es)}
                    title="Editar"
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() =>
                      setConfirm({ open: true, id: es.id, estadoActual: es.estado })
                    }
                    title={es.estado === 1 ? "Desactivar" : "Activar"}
                  >
                    <Power size={15} />
                </button>
              </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal crear/editar estación */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? "Editar estación" : "Nueva estación"}
        size="sm"
      >
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Input
            label="Código IATA"
            name="codigoIata"
            value={form.codigoIata}
            onChange={handleChange}
            error={errors.codigoIata}
            placeholder="LIM"
            maxLength={3}
            required
            style={{ textTransform: "uppercase" }}
          />
          <Input
            label="Nombre"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            error={errors.nombre}
            placeholder="Lima"
            required
          />
          <Input
            label="Zona horaria"
            name="zonaHoraria"
            value={form.zonaHoraria}
            onChange={handleChange}
            placeholder="America/Lima"
          />
          <Button type="submit" disabled={crear.isPending || actualizar.isPending}>
            {editId ? "Guardar cambios" : "Crear estación"}
          </Button>
        </form>
      </Modal>

      <ConfirmModal
        open={confirm.open}
        title={confirm.estadoActual === 1 ? "Desactivar estación" : "Activar estación"}
        message={
          confirm.estadoActual === 1
            ? "La estación dejará de estar disponible para nuevas operaciones. El histórico no se pierde."
            : "La estación volverá a estar disponible."
        }
        onConfirm={handleConfirmEstado}
        onClose={() => setConfirm({ open: false, id: null, estadoActual: null })}
      />

      {lineasModalEstacion && (
        <LineasDeEstacionModal
          estacion={lineasModalEstacion}
          onClose={() => setLineasModalEstacion(null)}
          showModal={showModal}
        />
      )}
    </>
  );
}

/* ── Modal: qué líneas aéreas operan en una estación ── */
function LineasDeEstacionModal({ estacion, onClose, showModal }) {
  const { data: lineasEstacion, isLoading } = useLineasDeEstacion(estacion.id);
  const { data: catalogoGlobal } = useLineasAereas({ estado: 1 });
  const asignar = useAsignarLineaAerea(estacion.id);
  const cambiarEstado = useCambiarEstadoLineaDeEstacion(estacion.id);
  const [seleccion, setSeleccion] = useState("");

  const idsYaAsignados = new Set((lineasEstacion ?? []).map((l) => l.lineaAereaId));
  const opcionesDisponibles = (catalogoGlobal ?? [])
    .filter((l) => !idsYaAsignados.has(l.id))
    .map((l) => ({ value: String(l.id), label: `${l.nombre} (${l.codigoIata})` }));

  const handleAsignar = async () => {
    if (!seleccion) return;
    try {
      await asignar.mutateAsync(parseInt(seleccion, 10));
      setSeleccion("");
    } catch (err) {
      showModal("error", "Error", err.response?.data?.message ?? "No se pudo asignar.");
    }
  };

  const handleToggle = async (lineaAereaId, estadoActual) => {
    try {
      await cambiarEstado.mutateAsync({ lineaAereaId, estadoActual });
    } catch (err) {
      showModal("error", "Error", err.response?.data?.message ?? "Error.");
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Líneas aéreas — ${estacion.nombre}`}
      size="sm"
    >
      <div className={styles.lineasModalBody}>
        <div className={styles.addLineaRow}>
          <Select
            value={seleccion}
            onChange={(e) => setSeleccion(e.target.value)}
            options={opcionesDisponibles}
            placeholder={
              opcionesDisponibles.length
                ? "Agregar línea aérea..."
                : "No hay líneas disponibles para agregar"
            }
            disabled={!opcionesDisponibles.length}
          />
          <Button
            size="sm"
            onClick={handleAsignar}
            disabled={!seleccion || asignar.isPending}
          >
            <Plus size={15} />
          </Button>
        </div>

        {isLoading ? (
          <p className={styles.loadingMsg}>Cargando...</p>
        ) : !lineasEstacion?.length ? (
          <p className={styles.loadingMsg}>
            Esta estación no tiene líneas aéreas habilitadas todavía.
          </p>
        ) : (
          <div className={styles.lineasList}>
            {lineasEstacion.map((l) => (
              <div key={l.id} className={styles.lineaRow}>
                <span className={styles.lineaCode}>{l.lineaAereaCodigoIata}</span>
                <span className={styles.lineaNombre}>{l.lineaAereaNombre}</span>
                <Badge
                  label={l.estado === 1 ? "ACTIVA" : "INACTIVA"}
                  variant={l.estado === 1 ? "success" : "neutral"}
                />
                <button
                  type="button"
                  className={styles.iconBtnSmall}
                  title={l.estado === 1 ? "Desactivar en esta estación" : "Activar en esta estación"}
                  onClick={() => handleToggle(l.lineaAereaId, l.estado)}
                >
                  <Power size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ════════════════════════ TAB: CATÁLOGO DE LÍNEAS AÉREAS ════════════════════════ */

function LogoAerolinea({ lineaAerea, showModal }) {
  const tieneLogo = !!lineaAerea.logoKey;
  const { data: logoUrl, isLoading, isError } = useLogoLineaAerea(lineaAerea.id, {
    enabled: tieneLogo,
  });
  const subirLogo = useSubirLogoLineaAerea();
  const inputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await subirLogo.mutateAsync({ id: lineaAerea.id, file });
    } catch (err) {
      showModal("error", "Error", err.response?.data?.message ?? "No se pudo subir el logo.");
    }
  };

  const mostrarImagen = tieneLogo && !isLoading && !isError && logoUrl;

  return (
    <div className={styles.logoWrapper}>
      <button
        type="button"
        className={styles.logoButton}
        onClick={() => inputRef.current?.click()}
        disabled={subirLogo.isPending}
        title={mostrarImagen ? "Cambiar logo" : "Subir logo"}
      >
        {mostrarImagen ? (
          <img src={logoUrl} alt={`Logo ${lineaAerea.nombre}`} className={styles.logoThumb} />
        ) : (
          <div className={styles.logoPlaceholder}>
            <Plane size={22} />
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className={styles.hiddenFileInput}
        onChange={handleFileChange}
      />
    </div>
  );
}

/* ════════════════════════ TAB: CATÁLOGO DE LÍNEAS AÉREAS ════════════════════════ */

function LineasAereasTab({ showModal }) {
  const { data: lineas, isLoading } = useLineasAereas();
  const crear = useCrearLineaAerea();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_LINEA);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.codigoIata || form.codigoIata.length < 2 || form.codigoIata.length > 3)
      e.codigoIata = "2 o 3 letras (p. ej. LA)";
    if (!form.nombre) e.nombre = "Requerido";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await crear.mutateAsync({ ...form, codigoIata: form.codigoIata.toUpperCase() });
      showModal("success", "Línea aérea creada", `${form.nombre} agregada al catálogo.`);
      setForm(EMPTY_LINEA);
      setFormOpen(false);
    } catch (err) {
      showModal("error", "Error", err.response?.data?.message ?? "Error inesperado.");
    }
  };

  return (
    <>
      <div className={styles.sectionHeader}>
        <p className={styles.sectionCount}>
          {lineas?.length ?? 0} línea{(lineas?.length ?? 0) !== 1 ? "s" : ""} aérea
          {(lineas?.length ?? 0) !== 1 ? "s" : ""} en el catálogo
        </p>
        <Button onClick={() => setFormOpen(true)} size="sm" className={styles.sectionBtn}>
          <Plus size={16} /> Nueva línea aérea
        </Button>
      </div>

      <p className={styles.hintBlock}>
        Este es el catálogo global. Para que una línea aérea opere en una
        estación específica, ve a la pestaña <strong>Estaciones</strong> y
        habilítala desde "Líneas aéreas" en la tarjeta correspondiente.
      </p>

      <div className={styles.catalogoGrid}>
        {isLoading ? (
          <p className={styles.loadingMsg}>Cargando...</p>
        ) : !lineas?.length ? (
          <p className={styles.loadingMsg}>Aún no hay líneas aéreas en el catálogo.</p>
        ) : (
        lineas.map((l) => (
            <div key={l.id} className={styles.catalogoCard}>
              <LogoAerolinea lineaAerea={l} showModal={showModal} />
              <span className={styles.catalogoCode}>{l.codigoIata}</span>
              <span className={styles.catalogoName}>{l.nombre}</span>
              <Badge
                label={l.estado === 1 ? "ACTIVA" : "INACTIVA"}
                variant={l.estado === 1 ? "success" : "neutral"}
              />
            </div>
          ))
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Nueva línea aérea"
        size="sm"
      >
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Input
            label="Código IATA"
            name="codigoIata"
            value={form.codigoIata}
            onChange={handleChange}
            error={errors.codigoIata}
            placeholder="LA"
            maxLength={3}
            required
          />
          <Input
            label="Nombre"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            error={errors.nombre}
            placeholder="LATAM"
            required
          />
          <Button type="submit" disabled={crear.isPending}>
            Crear línea aérea
          </Button>
        </form>
      </Modal>
    </>
  );
}
