import { useState } from "react";
import { Plane, Plus, Edit, Power, Mail } from "lucide-react";
import {
  useAerolineasCorreo,
  useCrearAerolineaCorreo,
  useActualizarAerolineaCorreo,
  useCambiarEstadoAerolineaCorreo,
} from "../../hooks/useAerolineasCorreo";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Modal from "../../components/ui/Modal.jsx";
import InfoModal from "../../components/ui/InfoModal.jsx";
import ConfirmModal from "../../components/ui/ConfirmModal.jsx";
import Input from "../../components/ui/Input.jsx";
import styles from "./AdminAerolineasPage.module.css";

const EMPTY_FORM = { correo: "", observaciones: "" };

/**
 * NUEVO — Administración de correos de aerolíneas.
 *
 * El administrador registra aquí, por cada aerolínea, el correo al que se
 * debe enviar copia del voucher de servicios cuando el agente atiende a un
 * pasajero de esa aerolínea. Una vez guardado, el correo aparece de forma
 * automática (como destinatario CC, editable) en el modal de confirmación
 * y firma digital que el agente ve al enviar el voucher.
 */
export default function AdminAerolineasPage() {
  const { estacionActiva, lineaAereaActiva } = useAuth();
  const { data: pageData, isLoading } = useAerolineasCorreo({ page: 0, size: 100 });
  const correos = pageData?.content ?? [];

  const crear = useCrearAerolineaCorreo();
  const actualizar = useActualizarAerolineaCorreo();
  const cambiarEstado = useCambiarEstadoAerolineaCorreo();

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
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
    setForm({ ...EMPTY_FORM });
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (a) => {
    setEditId(a.id);
  setForm({
    correo: a.correo ?? "",
    observaciones: a.observaciones ?? "",
  });
    setErrors({});
    setFormOpen(true);
  };

  const validar = () => {
  const errs = {};
  if (!lineaAereaActiva?.lineaAereaId)
    errs.contexto = "Selecciona una línea aérea en el selector del topbar antes de continuar";
  if (!form.correo.trim()) errs.correo = "El correo es obligatorio";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim()))
    errs.correo = "Correo inválido";
  setErrors(errs);
  return Object.keys(errs).length === 0;
};

  const handleGuardar = async () => {
    if (!validar()) return;
  const payload = {
    // La aerolínea y la estación ya NO se escriben a mano: siempre son
    // las del contexto de trabajo activo (selector del topbar), igual
    // que "Nuevo proveedor" y "Nuevo vuelo".
    estacionId: estacionActiva?.id,
    lineaAereaId: lineaAereaActiva?.lineaAereaId,
    correo: form.correo.trim(),
    observaciones: form.observaciones.trim() || null,
  };
    try {
      if (editId) {
        await actualizar.mutateAsync({ id: editId, ...payload });
        showModal(
          "success",
          "Actualizado",
          "El correo de la aerolínea fue actualizado.",
        );
      } else {
        await crear.mutateAsync(payload);
        showModal(
          "success",
          "Creado",
          "El correo de la aerolínea fue registrado.",
        );
      }
      setFormOpen(false);
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "No se pudo guardar el registro.",
      );
    }
  };

  const handleToggleEstado = async () => {
    try {
      await cambiarEstado.mutateAsync(confirm);
      setConfirm({ open: false, id: null, estadoActual: null });
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "No se pudo cambiar el estado.",
      );
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}>
            <Plane size={20} /> Correos de Aerolíneas
          </h1>
          <p className={styles.subtitulo}>
            Parametriza el correo de notificación de cada aerolínea. Al enviar
            un voucher, el agente verá este correo agregado automáticamente como
            destinatario.
          </p>
        </div>
        <Button onClick={openCreate} disabled={!lineaAereaActiva?.lineaAereaId}>
          <Plus size={16} /> Nueva aerolínea
        </Button>
      </div>

      {isLoading ? (
        <p className={styles.msg}>Cargando...</p>
      ) : !correos.length ? (
        <p className={styles.msg}>
          Aún no hay correos de aerolíneas parametrizados.
        </p>
      ) : (
        <div className={styles.grid}>
          {correos.map((a) => {
            const activo = a.estado === 1 || a.estado === true;
            return (
              <div
                key={a.id}
                className={[
                  styles.card,
                  !activo ? styles.cardInactivo : "",
                ].join(" ")}
              >
                <div className={styles.cardTop}>
                  <span className={styles.aerolinea}>{a.aerolinea}</span>
                  <Badge
                    label={activo ? "ACTIVO" : "INACTIVO"}
                    variant={activo ? "success" : "danger"}
                  />
                </div>
                <div className={styles.correo}>
                  <Mail size={14} /> {a.correo}
                </div>
                {a.observaciones && (
                  <p className={styles.obs}>{a.observaciones}</p>
                )}
                <div className={styles.cardActions}>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                    <Edit size={14} /> Editar
                  </Button>
                  <Button
                    variant={activo ? "danger" : "secondary"}
                    size="sm"
                    onClick={() =>
                      setConfirm({
                        open: true,
                        id: a.id,
                        estadoActual: a.estado,
                      })
                    }
                  >
                    <Power size={14} /> {activo ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? "Editar aerolínea" : "Nueva aerolínea"}
        size="sm"
      >
        <div className={styles.form}>
        <Input
          label="Aerolínea"
          name="aerolinea"
          value={lineaAereaActiva?.lineaAereaNombre ?? ""}
          disabled
        />
        <p className={styles.contextoInfo}>
          Este correo se registrará en:{" "}
          <strong>
            {estacionActiva?.nombre ?? "—"}
            {lineaAereaActiva?.lineaAereaNombre ? ` · ${lineaAereaActiva.lineaAereaNombre}` : ""}
          </strong>
        </p>
          {errors.contexto && <p className={styles.errorContexto}>{errors.contexto}</p>}
          <Input
            label="Correo de notificación"
            name="correo"
            type="email"
            value={form.correo}
            onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
            placeholder="contacto@aerolinea.com"
            error={errors.correo}
            required
          />
          <Input
            label="Observaciones (opcional)"
            name="observaciones"
            value={form.observaciones}
            onChange={(e) =>
              setForm((f) => ({ ...f, observaciones: e.target.value }))
            }
            placeholder="Ej: Área de contingencias"
          />
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleGuardar}
              loading={crear.isPending || actualizar.isPending}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={confirm.open}
        title={
          confirm.estadoActual === 1 || confirm.estadoActual === true
            ? "¿Desactivar aerolínea?"
            : "¿Activar aerolínea?"
        }
        message="Este correo dejará de aparecer automáticamente en el modal de envío del agente."
        loading={cambiarEstado.isPending}
        onConfirm={handleToggleEstado}
        onClose={() =>
          setConfirm({ open: false, id: null, estadoActual: null })
        }
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
