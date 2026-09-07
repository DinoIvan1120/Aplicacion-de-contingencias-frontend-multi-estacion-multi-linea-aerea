import { useState } from "react";
import { FileText, Mail, Download } from "lucide-react";
import {
  useAtencion,
  useGenerarPdf,
  useReenviarPDF,
} from "../../hooks/useAtenciones";
// import { useAtencion } from "../../hooks/useAtenciones.js";
import Button from "../../components/ui/Button.jsx";
import InfoModal from "../../components/ui/InfoModal.jsx";
import Badge from "../../components/ui/Badge.jsx";
import styles from "./AgentePDFPage.module.css";

export default function AgentePDFPage() {
  const { data: pageData, isLoading } = useAtencion({ page: 0, size: 20 });
  const atenciones = pageData?.content ?? [];

  const generarPDF = useGenerarPdf();
  const reenviarPDF = useReenviarPDF();

  const [selectedId, setSelectedId] = useState(null);
  const [correoEnvio, setCorreoEnvio] = useState("");
  const [modal, setModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
  });
  const showModal = (type, title, message) =>
    setModal({ open: true, type, title, message });

  const handleGenerar = async (id) => {
    try {
      await generarPDF.mutateAsync(id);
      showModal(
        "success",
        "PDF generado",
        "El voucher fue generado y enviado al correo del pasajero.",
      );
    } catch (err) {
      showModal(
        "error",
        "Error al generar PDF",
        err.response?.data?.message ?? "Error inesperado.",
      );
    }
  };

  const handleReenviar = async (id) => {
    if (!correoEnvio)
      return showModal(
        "error",
        "Correo requerido",
        "Ingresa el correo de destino.",
      );
    try {
      await reenviarPDF.mutateAsync({
        atencionId: id,
        correoDestino: correoEnvio,
      });
      showModal(
        "success",
        "PDF reenviado",
        `El voucher fue enviado a ${correoEnvio}.`,
      );
      setCorreoEnvio("");
      setSelectedId(null);
    } catch (err) {
      showModal(
        "error",
        "Error al reenviar",
        err.response?.data?.message ?? "Error inesperado.",
      );
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <FileText size={24} color="var(--rol-agente)" />
        <div>
          <h1 className={styles.title}>Generar PDF / Enviar Email</h1>
          <p className={styles.sub}>
            Genera vouchers y gestiona el envío por correo
          </p>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Atenciones registradas</h2>
        {isLoading ? (
          <p className={styles.loading}>Cargando atenciones...</p>
        ) : atenciones.length === 0 ? (
          <p className={styles.empty}>No hay atenciones registradas.</p>
        ) : (
          <div className={styles.list}>
            {atenciones.map((a) => (
              <div key={a.id} className={styles.item}>
                <div className={styles.itemInfo}>
                  <span className={styles.correlativo}>
                    {a.numeroCorrelativo ?? a.correlativo}
                  </span>
                  <span className={styles.pasajero}>
                    {a.apellido}/{a.nombre}
                  </span>
                  <span className={styles.pnr}>{a.pnr}</span>
                  <Badge
                    label={a.estado ?? "ACTIVO"}
                    variant={a.estado === "ANULADO" ? "danger" : "success"}
                  />
                </div>
                <div className={styles.itemActions}>
                  <Button
                    size="sm"
                    onClick={() => handleGenerar(a.id)}
                    loading={generarPDF.isPending}
                    style={{ background: "var(--rol-agente)" }}
                  >
                    <Download size={14} /> Generar PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setSelectedId(selectedId === a.id ? null : a.id)
                    }
                  >
                    <Mail size={14} /> Reenviar
                  </Button>
                </div>
                {selectedId === a.id && (
                  <div className={styles.reenviarRow}>
                    <input
                      type="email"
                      value={correoEnvio}
                      onChange={(e) => setCorreoEnvio(e.target.value)}
                      placeholder="correo@destino.com"
                      className={styles.emailInput}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleReenviar(a.id)}
                      loading={reenviarPDF.isPending}
                    >
                      Enviar
                    </Button>
                  </div>
                )}
              </div>
            ))}
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
    </div>
  );
}
