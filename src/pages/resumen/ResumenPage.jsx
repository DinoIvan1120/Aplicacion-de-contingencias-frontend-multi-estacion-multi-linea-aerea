import styles from "./ResumenPage.module.css";
import ResumenGraficos from "./ResumenGraficos";

export default function ResumenPage() {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Resumen de Atenciones</h1>
      </div>
      <ResumenGraficos />
    </div>
  );
}
