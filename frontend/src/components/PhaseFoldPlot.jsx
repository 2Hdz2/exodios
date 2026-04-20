
export default function PhaseFoldPlot({ data, period, t0, planetIndex = 0 }) {
  if (!Array.isArray(data) || data.length < 10 || !period || !t0)
    return <p>Cannot phase-fold: missing data.</p>;

  // ── 1. Fold and center dip at phase = 0 ──────────────────────────────────
  const folded = data
    .map(d => {
      let phase = (((d.time - t0) % period) + period) % period / period;
      if (phase > 0.5) phase -= 1; // shift so dip is at 0, range [-0.5, 0.5]
      return { phase, flux: d.flux };
    })
    .filter(d => Number.isFinite(d.phase) && Number.isFinite(d.flux))
    .sort((a, b) => a.phase - b.phase);

  if (folded.length < 5) return <p>Not enough points after folding.</p>;

  // ── 2. SVG layout ──────────────────────────────────────────────────────────
  const width  = 900;
  const height = 300;
  const margin = { top: 36, right: 24, bottom: 52, left: 80 };
  const innerW = width  - margin.left - margin.right;
  const innerH = height - margin.top  - margin.bottom;

  // ── 3. Y range — tight around signal ─────────────────────────────────────
  const sortedF = [...folded.map(d => d.flux)].sort((a, b) => a - b);
  const p02  = sortedF[Math.floor(sortedF.length * 0.01)];
  const p98  = sortedF[Math.floor(sortedF.length * 0.99)];
  const pad  = (p98 - p02) * 0.2 || 0.002;
  const fMin = p02 - pad;
  const fMax = p98 + pad;

  // ── 4. Scales ─────────────────────────────────────────────────────────────
  const PHASE_MIN = -0.5;
  const PHASE_MAX =  0.5;
  const sx = p => margin.left + ((p - PHASE_MIN) / (PHASE_MAX - PHASE_MIN)) * innerW;
  const sy = f => margin.top  + innerH - ((f - fMin) / (fMax - fMin)) * innerH;

  // ── 5. Build line path (split at big phase jumps) ─────────────────────────
  const pathStr = folded
    .map((d, i) => `${i === 0 ? "M" : "L"}${sx(d.phase).toFixed(1)},${sy(d.flux).toFixed(1)}`)
    .join(" ");

  // ── 6. Binned line overlay for clarity ────────────────────────────────────
  const N_BINS = 100;
  const bins   = Array.from({ length: N_BINS }, () => ({ sum: 0, count: 0 }));
  folded.forEach(d => {
    const bi = Math.floor((d.phase - PHASE_MIN) / (PHASE_MAX - PHASE_MIN) * N_BINS);
    const idx = Math.max(0, Math.min(N_BINS - 1, bi));
    bins[idx].sum += d.flux;
    bins[idx].count++;
  });
  const binned = bins
    .map((b, i) => ({
      phase: PHASE_MIN + (i + 0.5) / N_BINS * (PHASE_MAX - PHASE_MIN),
      flux:  b.count > 0 ? b.sum / b.count : null,
    }))
    .filter(b => b.flux !== null);

  const binnedPath = binned
    .map((d, i) => `${i === 0 ? "M" : "L"}${sx(d.phase).toFixed(1)},${sy(d.flux).toFixed(1)}`)
    .join(" ");

  // ── 7. Find the dip minimum near phase=0 ─────────────────────────────────
  const nearCenter = binned.filter(d => Math.abs(d.phase) < 0.15);
  const dipPoint   = nearCenter.length
    ? nearCenter.reduce((a, b) => (a.flux < b.flux ? a : b))
    : null;

  // ── 8. Ticks ──────────────────────────────────────────────────────────────
  const xTicks = [-0.4, -0.2, 0, 0.2, 0.4];
  const yTicks = Array.from({ length: 5 }, (_, i) => fMin + (i / 4) * (fMax - fMin));

  const COLORS = ["#ff4444", "#44aaff", "#44ff88", "#ffaa00", "#cc44ff"];
  const color  = COLORS[planetIndex % COLORS.length];
  const median = sortedF[Math.floor(sortedF.length / 2)];

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        width={width}
        height={height}
        style={{ background: "#fff", display: "block", fontFamily: "sans-serif" }}
      >
        {/* ── Title ── */}
        <text x={width / 2} y={20} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#222">
          Phase-Folded Light Curve — Planet {planetIndex + 1}  (P = {period.toFixed(4)} d)
        </text>

        {/* ── Grid ── */}
        {yTicks.map((f, i) => (
          <line key={`yg${i}`}
            x1={margin.left} y1={sy(f)}
            x2={margin.left + innerW} y2={sy(f)}
            stroke="#ececec" strokeWidth="1"
          />
        ))}

        {/* ── Median reference ── */}
        <line
          x1={margin.left} y1={sy(median)}
          x2={margin.left + innerW} y2={sy(median)}
          stroke="#bbb" strokeWidth="0.8" strokeDasharray="5,4"
        />

        {/* ── Transit center line ── */}
        <line
          x1={sx(0)} y1={margin.top}
          x2={sx(0)} y2={margin.top + innerH}
          stroke={color} strokeWidth="1" strokeDasharray="5,3" opacity="0.5"
        />

        {/* ── Raw folded points (faint) ── */}
        <path d={pathStr} fill="none" stroke="#ccc" strokeWidth="0.5" opacity="0.4" />

        {/* ── Binned clean line ── */}
        <path
          d={binnedPath}
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        {/* ── Circle around transit dip ── */}
        {dipPoint && (
          <g>
            <circle
              cx={sx(dipPoint.phase)} cy={sy(dipPoint.flux)}
              r="18"
              fill="none"
              stroke={color}
              strokeWidth="2.2"
            />
            <circle
              cx={sx(dipPoint.phase)} cy={sy(dipPoint.flux)}
              r="3"
              fill={color}
            />
            <text
              x={sx(dipPoint.phase)} y={sy(dipPoint.flux) - 26}
              textAnchor="middle" fontSize="10" fontWeight="bold" fill={color}
            >
              Transit dip
            </text>
          </g>
        )}

        {/* ── Axes ── */}
        <line
          x1={margin.left} y1={margin.top + innerH}
          x2={margin.left + innerW} y2={margin.top + innerH}
          stroke="#333" strokeWidth="1.5"
        />
        <line
          x1={margin.left} y1={margin.top}
          x2={margin.left} y2={margin.top + innerH}
          stroke="#333" strokeWidth="1.5"
        />

        {/* ── X ticks ── */}
        {xTicks.map((p, i) => (
          <g key={`xt${i}`}>
            <line
              x1={sx(p)} y1={margin.top + innerH}
              x2={sx(p)} y2={margin.top + innerH + 5}
              stroke="#333"
            />
            <text x={sx(p)} y={margin.top + innerH + 18} textAnchor="middle" fontSize="11" fill="#333">
              {p.toFixed(1)}
            </text>
          </g>
        ))}

        {/* ── Y ticks ── */}
        {yTicks.map((f, i) => (
          <g key={`yt${i}`}>
            <line x1={margin.left - 5} y1={sy(f)} x2={margin.left} y2={sy(f)} stroke="#333" />
            <text x={margin.left - 8} y={sy(f) + 4} textAnchor="end" fontSize="11" fill="#333">
              {f.toFixed(4)}
            </text>
          </g>
        ))}

        {/* ── Axis labels ── */}
        <text x={width / 2} y={height - 8} textAnchor="middle" fontSize="13" fill="#333">
          Phase (period = {period.toFixed(4)} d)
        </text>
        <text
          x={16} y={height / 2}
          textAnchor="middle" fontSize="13" fill="#333"
          transform={`rotate(-90 16 ${height / 2})`}
        >
          Normalized Flux
        </text>
      </svg>
    </div>
  );
}
