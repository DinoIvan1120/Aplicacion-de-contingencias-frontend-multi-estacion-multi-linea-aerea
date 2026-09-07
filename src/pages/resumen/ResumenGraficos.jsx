import { useState, useEffect } from "react";
import {
  BarChart2,
  TrendingUp,
  Users,
  DollarSign,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Maximize2,
  X,
} from "lucide-react";
import { useResumenReportes } from "../../hooks/useReportes";
import { useAuth } from "../../context/AuthContext";
import { formatearMonto } from "../../utils/formatters";
// ✅ Correcto (sube dos niveles: resumen → pages → src, luego baja a components/)
import { DatePicker } from "../../components/DatePicker/DatePicker";
import styles from "./ResumenGraficos.module.css";

// ─── Paleta de colores por tipo de servicio ───────────────────────────────────
const TIPO_CONFIG = {
  HOTEL: { label: "Hotel", color: "#4F46E5" },
  TRANSPORTE: { label: "Transporte", color: "#16A34A" },
  RESTAURANTE: { label: "Restaurante", color: "#DC2626" },
};

// ─── Fecha por defecto: último mes ───────────────────────────────────────────
function hoy() {
  return new Date().toISOString().split("T")[0];
}
function haceMes() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split("T")[0];
}

// ═════════════════════════════════════════════════════════════════════════════
// Modal de expansión de gráfico
// ═════════════════════════════════════════════════════════════════════════════
function ChartModal({ title, onClose, children }) {
  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", fn);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{title}</span>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Wrapper de bloque expandible
// ═════════════════════════════════════════════════════════════════════════════
function ExpandableChartBlock({ title, children }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className={styles.chartBlock}>
        <div className={styles.chartBlockHeader}>
          <p className={styles.chartTitle}>{title}</p>
          <button
            className={styles.expandBtn}
            onClick={() => setExpanded(true)}
            aria-label={`Expandir ${title}`}
            title="Ver en pantalla completa"
          >
            <Maximize2 size={13} />
          </button>
        </div>
        {children}
      </div>

      {expanded && (
        <ChartModal title={title} onClose={() => setExpanded(false)}>
          {children}
        </ChartModal>
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Gráfico de barras — atenciones por fecha
// ═════════════════════════════════════════════════════════════════════════════
function BarChart({ data }) {
  if (!data || data.length === 0)
    return (
      <p className={styles.noData}>Sin datos en el período seleccionado.</p>
    );

  const W = 560,
    H = 200,
    PAD = { top: 12, right: 12, bottom: 40, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const maxVal = Math.max(...data.map((d) => d.cantidad), 1);
  const barW = Math.max(4, Math.min(32, innerW / data.length - 4));
  const yTicks = 4;
  const xStep = innerW / data.length;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={styles.svgChart}
      aria-label="Atenciones por día"
    >
      <line
        x1={PAD.left}
        y1={PAD.top}
        x2={PAD.left}
        y2={PAD.top + innerH}
        stroke="var(--border)"
        strokeWidth="1"
      />
      <line
        x1={PAD.left}
        y1={PAD.top + innerH}
        x2={PAD.left + innerW}
        y2={PAD.top + innerH}
        stroke="var(--border)"
        strokeWidth="1"
      />

      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const val = Math.round((maxVal / yTicks) * (yTicks - i));
        const y = PAD.top + (innerH / yTicks) * i;
        return (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={y}
              x2={PAD.left + innerW}
              y2={y}
              stroke="var(--border)"
              strokeWidth="0.5"
              strokeDasharray="4 3"
            />
            <text
              x={PAD.left - 4}
              y={y + 4}
              textAnchor="end"
              fontSize="9"
              fill="var(--text-500)"
            >
              {val}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const barH = (d.cantidad / maxVal) * innerH;
        const x = PAD.left + xStep * i + (xStep - barW) / 2;
        const y = PAD.top + innerH - barH;
        const showLabel =
          data.length <= 14 || i % Math.ceil(data.length / 10) === 0;
        return (
          <g key={d.fecha}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx="3"
              fill="#4F46E5"
              fillOpacity="0.85"
              className={styles.bar}
            />
            <title>{`${d.fecha}: ${d.cantidad} atenciones`}</title>
            {barH > 18 && (
              <text
                x={x + barW / 2}
                y={y + 12}
                textAnchor="middle"
                fontSize="8"
                fill="white"
                fontWeight="600"
              >
                {d.cantidad}
              </text>
            )}
            {showLabel && (
              <text
                x={x + barW / 2}
                y={PAD.top + innerH + 14}
                textAnchor="middle"
                fontSize="8"
                fill="var(--text-500)"
              >
                {d.fecha.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Gráfico de área — importe por fecha
// ═════════════════════════════════════════════════════════════════════════════
function AreaChart({ data }) {
  if (!data || data.length === 0)
    return (
      <p className={styles.noData}>Sin datos en el período seleccionado.</p>
    );

  const W = 560,
    H = 160,
    PAD = { top: 12, right: 12, bottom: 32, left: 52 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const importes = data.map((d) => parseFloat(d.importe));
  const maxVal = Math.max(...importes, 1);
  const xStep = innerW / Math.max(data.length - 1, 1);
  const points = data.map((d, i) => ({
    x: PAD.left + xStep * i,
    y: PAD.top + innerH - (parseFloat(d.importe) / maxVal) * innerH,
    label: d.fecha.slice(5),
    importe: parseFloat(d.importe),
  }));
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = `M${points[0].x},${PAD.top + innerH} ${points.map((p) => `L${p.x},${p.y}`).join(" ")} L${points[points.length - 1].x},${PAD.top + innerH} Z`;
  const yTicks = 3;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={styles.svgChart}
      aria-label="Importe por día"
    >
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16A34A" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#16A34A" stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const val = (maxVal / yTicks) * (yTicks - i);
        const y = PAD.top + (innerH / yTicks) * i;
        return (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={y}
              x2={PAD.left + innerW}
              y2={y}
              stroke="var(--border)"
              strokeWidth="0.5"
              strokeDasharray="4 3"
            />
            <text
              x={PAD.left - 4}
              y={y + 4}
              textAnchor="end"
              fontSize="8"
              fill="var(--text-500)"
            >
              {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
            </text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#areaGrad)" />
      <polyline
        points={polyline}
        fill="none"
        stroke="#16A34A"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r="3.5"
            fill="#16A34A"
            stroke="white"
            strokeWidth="1.5"
          />
          <title>{`${data[i].fecha}: S/ ${p.importe.toFixed(2)}`}</title>
        </g>
      ))}
      {points
        .filter(
          (_, i) => data.length <= 14 || i % Math.ceil(data.length / 8) === 0,
        )
        .map((p) => (
          <text
            key={p.label}
            x={p.x}
            y={PAD.top + innerH + 14}
            textAnchor="middle"
            fontSize="8"
            fill="var(--text-500)"
          >
            {p.label}
          </text>
        ))}
      <line
        x1={PAD.left}
        y1={PAD.top}
        x2={PAD.left}
        y2={PAD.top + innerH}
        stroke="var(--border)"
        strokeWidth="1"
      />
      <line
        x1={PAD.left}
        y1={PAD.top + innerH}
        x2={PAD.left + innerW}
        y2={PAD.top + innerH}
        stroke="var(--border)"
        strokeWidth="1"
      />
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Gráfico de dona — distribución por tipo de servicio
// ═════════════════════════════════════════════════════════════════════════════
function DonutChart({ data }) {
  if (!data || data.length === 0)
    return <p className={styles.noData}>Sin servicios en el período.</p>;

  const R = 70,
    r = 44,
    CX = 90,
    CY = 90,
    SIZE = 180;
  const total = data.reduce((acc, d) => acc + Number(d.importe), 0);
  let startAngle = -Math.PI / 2;

  const slices = data.map((d) => {
    const value = Number(d.importe);
    const pct = total > 0 ? value / total : 0;
    const angle = pct * 2 * Math.PI;
    const end = startAngle + angle;
    const x1 = CX + R * Math.cos(startAngle),
      y1 = CY + R * Math.sin(startAngle);
    const x2 = CX + R * Math.cos(end),
      y2 = CY + R * Math.sin(end);
    const xi1 = CX + r * Math.cos(startAngle),
      yi1 = CY + r * Math.sin(startAngle);
    const xi2 = CX + r * Math.cos(end),
      yi2 = CY + r * Math.sin(end);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${r},${r} 0 ${large},0 ${xi1},${yi1} Z`;
    const config = TIPO_CONFIG[d.tipo] ?? { label: d.tipo, color: "#94A3B8" };
    const result = {
      path,
      color: config.color,
      label: config.label,
      pct,
      value,
      tipo: d.tipo,
    };
    startAngle = end;
    return result;
  });

  return (
    <div className={styles.donutWrap}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={styles.svgDonut}
        aria-label="Distribución por tipo"
      >
        {slices.map((s) => (
          <g key={s.tipo}>
            <path
              d={s.path}
              fill={s.color}
              fillOpacity="0.9"
              className={styles.slice}
            >
              <title>{`${s.label}: S/ ${s.value.toFixed(2)} (${(s.pct * 100).toFixed(1)}%)`}</title>
            </path>
          </g>
        ))}
        <text
          x={CX}
          y={CY - 6}
          textAnchor="middle"
          fontSize="10"
          fill="var(--text-500)"
          fontWeight="500"
        >
          Total
        </text>
        <text
          x={CX}
          y={CY + 8}
          textAnchor="middle"
          fontSize="11"
          fill="var(--text-900)"
          fontWeight="700"
        >
          {total >= 1000
            ? `S/${(total / 1000).toFixed(1)}k`
            : `S/${total.toFixed(0)}`}
        </text>
      </svg>
      <div className={styles.legend}>
        {slices.map((s) => (
          <div key={s.tipo} className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ background: s.color }}
            />
            <span className={styles.legendLabel}>{s.label}</span>
            <span className={styles.legendPct}>
              {(s.pct * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Tabla de estadística por proveedor individual
// ═════════════════════════════════════════════════════════════════════════════
function TablaProveedores({ data }) {
  const grupos = Object.entries(
    data.reduce((acc, row) => {
      const tipo = row.tipo ?? "OTRO";
      if (!acc[tipo]) acc[tipo] = [];
      acc[tipo].push(row);
      return acc;
    }, {}),
  );

  return (
    <div className={styles.proveedorSection}>
      <p className={styles.proveedorSectionTitle}>
        Estadística por proveedor individual
      </p>
      <div className={styles.proveedorGrid}>
        {grupos.map(([tipo, rows]) => {
          const cfg = TIPO_CONFIG[tipo] ?? { label: tipo, color: "#94A3B8" };
          const totalImporte = rows.reduce((s, r) => s + Number(r.importe), 0);
          const totalCantidad = rows.reduce(
            (s, r) => s + Number(r.cantidad),
            0,
          );

          const blockTitle = (
            <span className={styles.proveedorBlockTitle}>
              <span
                className={styles.proveedorDot}
                style={{ background: cfg.color }}
              />
              <span className={styles.proveedorCardTipo}>{cfg.label}</span>
              <span className={styles.proveedorCardTotal}>
                {formatearMonto(totalImporte)}
              </span>
            </span>
          );

          return (
            <div key={tipo} className={styles.proveedorCard}>
              <ExpandableChartBlock title={blockTitle}>
                <table className={styles.proveedorTable}>
                  <thead>
                    <tr>
                      <th>Proveedor</th>
                      <th>Atenc.</th>
                      <th>Importe</th>
                      <th>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const pct =
                        totalImporte > 0
                          ? ((Number(r.importe) / totalImporte) * 100).toFixed(
                              1,
                            )
                          : "0.0";
                      return (
                        <tr key={r.proveedorNombre}>
                          <td className={styles.proveedorNombre}>
                            {r.proveedorNombre}
                          </td>
                          <td>{r.cantidad}</td>
                          <td>{formatearMonto(r.importe)}</td>
                          <td>
                            <div className={styles.pctBar}>
                              <div
                                className={styles.pctFill}
                                style={{
                                  width: `${pct}%`,
                                  background: cfg.color,
                                }}
                              />
                              <span>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className={styles.proveedorFooter}>
                      <td>Total</td>
                      <td>{totalCantidad}</td>
                      <td>{formatearMonto(totalImporte)}</td>
                      <td>100%</td>
                    </tr>
                  </tfoot>
                </table>
              </ExpandableChartBlock>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Componente principal — ResumenGraficos
// ═════════════════════════════════════════════════════════════════════════════
export default function ResumenGraficos() {
  const { estacionActiva, lineaAereaActiva } = useAuth();
  const [open, setOpen] = useState(true);
  const [rango, setRango] = useState({
    fechaDesde: haceMes(),
    fechaHasta: hoy(),
  });
  const [rangoActivo, setRangoActivo] = useState({ ...rango });

  const {
    data: resumen,
    isLoading,
    isFetching,
  } = useResumenReportes(rangoActivo, {
    estacionId: estacionActiva?.id,
    lineaAereaId: lineaAereaActiva?.lineaAereaId,
  });

  const handleAplicar = () => setRangoActivo({ ...rango });

  return (
    <div className={styles.panel}>
      {/* Header del panel */}
      <button
        className={styles.panelHeader}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className={styles.panelTitle}>
          <BarChart2 size={17} color="var(--primary)" />
          <span>Resumen de atenciones</span>
        </div>
        {open ? (
          <ChevronUp size={16} color="var(--text-500)" />
        ) : (
          <ChevronDown size={16} color="var(--text-500)" />
        )}
      </button>

      {open && (
        <div className={styles.panelBody}>
          {/* ── Selector de rango con DatePicker moderno ─────────────────── */}
          <div className={styles.rangoBar}>
            <div className={styles.rangoInputRow}>
              <DatePicker
                label="Desde"
                value={rango.fechaDesde}
                max={rango.fechaHasta}
                rangeStart={rango.fechaDesde}
                rangeEnd={rango.fechaHasta}
                onChange={(v) => setRango((r) => ({ ...r, fechaDesde: v }))}
              />

              <span className={styles.rangoDivider}>→</span>

              <DatePicker
                label="Hasta"
                value={rango.fechaHasta}
                min={rango.fechaDesde}
                rangeStart={rango.fechaDesde}
                rangeEnd={rango.fechaHasta}
                onChange={(v) => setRango((r) => ({ ...r, fechaHasta: v }))}
              />
            </div>

            <button
              className={styles.applyBtn}
              onClick={handleAplicar}
              disabled={isFetching}
            >
              {isFetching ? (
                <RefreshCw size={13} className={styles.spin} />
              ) : (
                <RefreshCw size={13} />
              )}
              Actualizar
            </button>
          </div>

          {isLoading ? (
            <div className={styles.loading}>Cargando resumen...</div>
          ) : !resumen ? (
            <div className={styles.loading}>No se pudo cargar el resumen.</div>
          ) : (
            <>
              {/* ── KPI Cards ─────────────────────────────────────────────── */}
              <div className={styles.kpiRow}>
                <div className={styles.kpiCard}>
                  <Users size={20} color="#4F46E5" />
                  <div>
                    <p className={styles.kpiValue}>{resumen.totalAtenciones}</p>
                    <p className={styles.kpiLabel}>Atenciones</p>
                  </div>
                </div>
                <div className={styles.kpiCard}>
                  <DollarSign size={20} color="#16A34A" />
                  <div>
                    <p className={styles.kpiValue}>
                      {formatearMonto(resumen.importeTotal)}
                    </p>
                    <p className={styles.kpiLabel}>Importe total</p>
                  </div>
                </div>
                <div className={styles.kpiCard}>
                  <TrendingUp size={20} color="#DC2626" />
                  <div>
                    <p className={styles.kpiValue}>
                      {formatearMonto(resumen.promedioImporte)}
                    </p>
                    <p className={styles.kpiLabel}>Promedio / atención</p>
                  </div>
                </div>
              </div>

              {/* ── Gráficos ──────────────────────────────────────────────── */}
              <div className={styles.chartsRow}>
                <div className={styles.chartMain}>
                  <ExpandableChartBlock title="Cantidad de atenciones por día">
                    <BarChart data={resumen.atencionPorFecha} />
                  </ExpandableChartBlock>
                  <ExpandableChartBlock title="Importe total asignado por día (S/)">
                    <AreaChart data={resumen.importePorFecha} />
                  </ExpandableChartBlock>
                </div>

                <div className={styles.chartSide}>
                  <ExpandableChartBlock title="Distribución por tipo de servicio">
                    <DonutChart data={resumen.distribucionPorTipo} />
                    <table className={styles.tipoTable}>
                      <thead>
                        <tr>
                          <th>Servicio</th>
                          <th>Atenciones</th>
                          <th>Importe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumen.distribucionPorTipo.map((d) => (
                          <tr key={d.tipo}>
                            <td>
                              <span
                                className={styles.tipoDot}
                                style={{
                                  background:
                                    TIPO_CONFIG[d.tipo]?.color ?? "#94A3B8",
                                }}
                              />
                              {TIPO_CONFIG[d.tipo]?.label ?? d.tipo}
                            </td>
                            <td>{d.cantidad}</td>
                            <td>{formatearMonto(d.importe)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ExpandableChartBlock>
                </div>
              </div>
              {/* ── Tabla por proveedor individual ────────────────────────── */}
              {resumen.distribucionPorProveedor?.length > 0 && (
                <TablaProveedores data={resumen.distribucionPorProveedor} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
