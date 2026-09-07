import { useState } from "react";
import { Settings, X, Hotel, Bus, UtensilsCrossed } from "lucide-react";
import {
  useVuelos,
  useRecursos,
  useHabilitarRecurso,
  useDeshabilitarRecurso,
} from "../../hooks/useVuelos";
import { useProveedores } from "../../hooks/useProveedores";
import InfoModal from "../../components/ui/InfoModal.jsx";
import ConfirmModal from "../../components/ui/ConfirmModal.jsx";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import styles from "./LiderRecursosPage.module.css";

export default function LiderRecursosPage() {
  const { data: vuelosPage } = useVuelos({ page: 0, size: 50 });
  const vuelos = vuelosPage?.content ?? [];

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

  //const hoteles = hotelesPage?.content ?? []
  //const transportes = transportesPage?.content ?? []
  //const restaurantes = restaurantesPage?.content ?? []

  const hoteles = (hotelesPage?.content ?? []).filter((p) => p.estado === 1);
  const transportes = (transportesPage?.content ?? []).filter(
    (p) => p.estado === 1,
  );
  const restaurantes = (restaurantesPage?.content ?? []).filter(
    (p) => p.estado === 1,
  );

  const [vueloId, setVueloId] = useState("");
  const { data: recursos = [], isLoading: loadingRecursos } =
    useRecursos(vueloId);

  const habilitar = useHabilitarRecurso(vueloId);
  const deshabilitar = useDeshabilitarRecurso(vueloId);

  // Hotel form
  const [hotelId, setHotelId] = useState("");
  const [habitaciones, setHabitaciones] = useState({
    simples: 0,
    dobles: 0,
    matrimoniales: 0,
  });
  // Transporte / Restaurante
  const [transporteId, setTransporteId] = useState("");
  const [transCapacidad, setTransCapacidad] = useState("");
  const [restauranteId, setRestauranteId] = useState("");
  const [restCapacidad, setRestCapacidad] = useState("");

  const [modal, setModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
  });
  const [confirm, setConfirm] = useState({ open: false, recursoId: null });

  const showModal = (type, title, message) =>
    setModal({ open: true, type, title, message });

  const totalHab =
    habitaciones.simples + habitaciones.dobles + habitaciones.matrimoniales;

  const handleHotelGuardar = async () => {
    if (!vueloId || !hotelId)
      return showModal(
        "error",
        "Datos incompletos",
        "Seleccione un vuelo y un hotel.",
      );
    try {
      await habilitar.mutateAsync({
        proveedorId: Number(hotelId),
        habitacionesSimples: habitaciones.simples,
        habitacionesDobles: habitaciones.dobles,
        habitacionesMatrimoniales: habitaciones.matrimoniales,
      });
      showModal(
        "success",
        "Hotel habilitado",
        `Hotel asignado con ${totalHab} habitaciones.`,
      );
      setHotelId("");
      setHabitaciones({ simples: 0, dobles: 0, matrimoniales: 0 });
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "Error inesperado.",
      );
    }
  };

  const handleTransGuardar = async () => {
    if (!vueloId || !transporteId || !transCapacidad)
      return showModal(
        "error",
        "Datos incompletos",
        "Complete todos los campos.",
      );
    try {
      await habilitar.mutateAsync({
        proveedorId: Number(transporteId),
        capacidadTotal: Number(transCapacidad),
      });
      showModal(
        "success",
        "Transporte habilitado",
        `Capacidad: ${transCapacidad} pasajeros.`,
      );
      setTransporteId("");
      setTransCapacidad("");
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "Error inesperado.",
      );
    }
  };

  const handleRestGuardar = async () => {
    if (!vueloId || !restauranteId || !restCapacidad)
      return showModal(
        "error",
        "Datos incompletos",
        "Complete todos los campos.",
      );
    try {
      await habilitar.mutateAsync({
        proveedorId: Number(restauranteId),
        capacidadTotal: Number(restCapacidad),
      });
      showModal(
        "success",
        "Restaurante habilitado",
        `Capacidad: ${restCapacidad} cubiertos.`,
      );
      setRestauranteId("");
      setRestCapacidad("");
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "Error inesperado.",
      );
    }
  };

  const handleDeshabilitar = async () => {
    try {
      await deshabilitar.mutateAsync(confirm.recursoId);
      showModal(
        "success",
        "Recurso deshabilitado",
        "El recurso fue deshabilitado correctamente.",
      );
    } catch (err) {
      showModal("error", "Error", err.response?.data?.message ?? "Error.");
    } finally {
      setConfirm({ open: false, recursoId: null });
    }
  };

  const recursosActivos = recursos.filter(
    (r) => r.estado === 1 || r.estado === true,
  );

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <Settings size={24} color="var(--rol-lider)" />
        <div>
          <h1 className={styles.title}>Habilitar Recursos</h1>
          <p className={styles.sub}>
            Asigna hotel, transporte y restaurante al vuelo
          </p>
        </div>
      </div>

      {/* Selector de vuelo */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Seleccionar vuelo</h2>
        <select
          className={styles.select}
          value={vueloId}
          onChange={(e) => setVueloId(e.target.value)}
        >
          <option value="">✈️ Seleccione un vuelo...</option>
          {vuelos.map((v) => (
            <option key={v.id} value={v.id}>
              ✈️ {v.codigoVuelo} | {v.origen} → {v.destino} |{" "}
              {v.fechaVuelo?.slice(0, 10)} | {v.tipoContingencia}
            </option>
          ))}
        </select>
      </div>

      {vueloId && (
        <>
          {/* Recursos activos */}
          {loadingRecursos ? (
            <div className={styles.spinnerWrap}>
              <Spinner size="lg" />
            </div>
          ) : (
            recursosActivos.length > 0 && (
              <div className={styles.card}>
                <h2 className={styles.sectionTitle}>Recursos habilitados</h2>
                <div className={styles.recursosList}>
                  {recursosActivos.map((r) => (
                    <div key={r.id} className={styles.recursoItem}>
                      <div className={styles.recursoInfo}>
                        <strong>{r.tipoProveedor ?? r.tipo}</strong>
                        <span>{r.nombreProveedor ?? r.proveedor?.nombre}</span>
                        {r.totalHabitaciones && (
                          <span className={styles.resumen}>
                            {r.habitacionesSimples} Simples |{" "}
                            {r.habitacionesDobles} Dobles |{" "}
                            {r.habitacionesMatrimoniales} Matrimoniales
                          </span>
                        )}
                        {r.capacidadTotal && (
                          <span>Capacidad: {r.capacidadTotal}</span>
                        )}
                      </div>
                      <button
                        className={styles.removeBtn}
                        onClick={() =>
                          setConfirm({ open: true, recursoId: r.id })
                        }
                        aria-label="Deshabilitar"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {/* Hotel */}
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <Hotel size={20} color="var(--rol-lider)" />
              <h2 className={styles.sectionTitle}>Hotel</h2>
            </div>
            <select
              className={styles.select}
              value={hotelId}
              onChange={(e) => setHotelId(e.target.value)}
            >
              <option value="">Seleccione hotel...</option>
              {hoteles.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.nombre}
                </option>
              ))}
            </select>
            {hotelId && (
              <>
                <div className={styles.habGrid}>
                  {[
                    {
                      key: "simples",
                      label: "Hab. Simples",
                      desc: "1 persona",
                    },
                    { key: "dobles", label: "Hab. Dobles", desc: "2 camas" },
                    {
                      key: "matrimoniales",
                      label: "Hab. Matrimoniales",
                      desc: "1 cama matrimonial",
                    },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className={styles.habRow}>
                      <div>
                        <span className={styles.habLabel}>{label}</span>
                        <span className={styles.habDesc}>{desc}</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={habitaciones[key]}
                        onChange={(e) =>
                          setHabitaciones((h) => ({
                            ...h,
                            [key]: Math.max(0, Number(e.target.value)),
                          }))
                        }
                        className={styles.numInput}
                      />
                    </div>
                  ))}
                </div>
                <div className={styles.resumenBar}>
                  Total: {totalHab} habitaciones &mdash;
                  <span> {habitaciones.simples} Simples</span> |
                  <span> {habitaciones.dobles} Dobles</span> |
                  <span> {habitaciones.matrimoniales} Matrimoniales</span>
                </div>
                <Button
                  onClick={handleHotelGuardar}
                  loading={habilitar.isPending}
                  style={{ marginTop: "1rem" }}
                >
                  Guardar Hotel
                </Button>
              </>
            )}
          </div>

          {/* Transporte */}
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <Bus size={20} color="var(--rol-lider)" />
              <h2 className={styles.sectionTitle}>Transporte</h2>
            </div>
            <div className={styles.rowFields}>
              <select
                className={styles.select}
                value={transporteId}
                onChange={(e) => setTransporteId(e.target.value)}
              >
                <option value="">Seleccione transporte...</option>
                {transportes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={transCapacidad}
                onChange={(e) => setTransCapacidad(e.target.value)}
                placeholder="Capacidad total"
                className={styles.numInput}
              />
              <Button
                onClick={handleTransGuardar}
                loading={habilitar.isPending}
                size="sm"
              >
                Guardar
              </Button>
            </div>
          </div>

          {/* Restaurante */}
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <UtensilsCrossed size={20} color="var(--rol-lider)" />
              <h2 className={styles.sectionTitle}>Restaurante</h2>
            </div>
            <div className={styles.rowFields}>
              <select
                className={styles.select}
                value={restauranteId}
                onChange={(e) => setRestauranteId(e.target.value)}
              >
                <option value="">Seleccione restaurante...</option>
                {restaurantes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={restCapacidad}
                onChange={(e) => setRestCapacidad(e.target.value)}
                placeholder="Capacidad total"
                className={styles.numInput}
              />
              <Button
                onClick={handleRestGuardar}
                loading={habilitar.isPending}
                size="sm"
              >
                Guardar
              </Button>
            </div>
          </div>
        </>
      )}

      <InfoModal
        open={modal.open}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />
      <ConfirmModal
        open={confirm.open}
        title="¿Deshabilitar recurso?"
        message="Este recurso quedará inactivo para el vuelo seleccionado."
        onClose={() => setConfirm({ open: false, recursoId: null })}
        onConfirm={handleDeshabilitar}
        loading={deshabilitar.isPending}
      />
    </div>
  );
}
