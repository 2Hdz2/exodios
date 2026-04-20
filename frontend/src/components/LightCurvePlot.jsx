
export default function LightCurvePlot({ data, planets = [], showCircles = true, dipSigma = 2.5, minPeriod = 0.3 }) {
  if (!Array.isArray(data) || data.length < 10) return <p>No data to plot.</p>;

  // ── 1. Downsample ──────────────────────────────────────────────────────────
  const MAX_POINTS = 8000;
  const stride = data.length > MAX_POINTS ? Math.ceil(data.length / MAX_POINTS) : 1;
  const raw = data
    .filter((_, i) => i % stride === 0)
    .filter(d => Number.isFinite(d.time) && Number.isFinite(d.flux));

  if (raw.length < 2) return <p>Not enough valid points.</p>;

  // ── 2. Normalise + detrend ─────────────────────────────────────────────────
  const rawFluxes = raw.map(d => d.flux);
  const sorted0   = [...rawFluxes].sort((a, b) => a - b);
  const fluxMedian = sorted0[Math.floor(sorted0.length / 2)];

  let plotData = raw.map(d => ({ time: d.time, flux: d.flux / fluxMedian }));

  const tAll  = plotData.map(d => d.time);
  const tMin0 = Math.min(...tAll);
  const tMax0 = Math.max(...tAll);
  const N_BINS = 20;
  const bins  = Array.from({ length: N_BINS }, () => ({ sum: 0, n: 0 }));
  plotData.forEach(d => {
    const bi = Math.min(N_BINS - 1, Math.floor((d.time - tMin0) / (tMax0 - tMin0 + 1e-9) * N_BINS));
    bins[bi].sum += d.flux; bins[bi].n++;
  });
  const binMeds = bins.map((b, i) => ({
    t: tMin0 + (i + 0.5) / N_BINS * (tMax0 - tMin0),
    f: b.n > 0 ? b.sum / b.n : 1.0,
  }));
  const bx = binMeds.map(b => b.t), by = binMeds.map(b => b.f);
  const bxm = bx.reduce((a,v)=>a+v,0)/bx.length, bym = by.reduce((a,v)=>a+v,0)/by.length;
  const slope = bx.reduce((a,v,i)=>a+(v-bxm)*(by[i]-bym),0) /
                bx.reduce((a,v)=>a+(v-bxm)**2,0);
  const intercept = bym - slope * bxm;
  plotData = plotData.map(d => ({
    time: d.time,
    flux: d.flux / (slope * d.time + intercept),
  }));

  // ── 3. SVG layout ──────────────────────────────────────────────────────────
  const width  = 1000;
  const height = 420;
  const margin = { top: 40, right: 24, bottom: 62, left: 80 };
  const innerW = width  - margin.left - margin.right;
  const innerH = height - margin.top  - margin.bottom;
  const CLIP_ID = "lc-plot-clip";

  const times  = plotData.map(d => d.time);
  const fluxes = plotData.map(d => d.flux);
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);

  const sortedF = [...fluxes].sort((a, b) => a - b);
  const p01  = sortedF[Math.floor(sortedF.length * 0.01)];
  const p99  = sortedF[Math.floor(sortedF.length * 0.99)];
  const pad  = (p99 - p01) * 0.15 || 0.002;
  const fMin = p01 - pad;
  const fMax = p99 + pad;

  const sx = t => margin.left + ((t - tMin) / (tMax - tMin)) * innerW;
  const sy = f => margin.top  + innerH - ((f - fMin) / (fMax - fMin)) * innerH;

  // ── 4. Line path with gap-breaking ─────────────────────────────────────────
  const medianDt = (() => {
    const dts = [];
    for (let i = 1; i < Math.min(plotData.length, 500); i++)
      dts.push(plotData[i].time - plotData[i-1].time);
    dts.sort((a,b) => a-b);
    return dts[Math.floor(dts.length/2)] || 1;
  })();

  let solidPath = "";
  let gapBridges = [];
  let lastSolidEnd = null;

  for (let i = 0; i < plotData.length; i++) {
    const dt = i === 0 ? 0 : plotData[i].time - plotData[i-1].time;
    const isLargeGap = dt > medianDt * 50;

    if (i === 0 || isLargeGap) {
      solidPath += `M${sx(plotData[i].time).toFixed(1)},${sy(plotData[i].flux).toFixed(1)} `;
      if (isLargeGap && lastSolidEnd) {
        gapBridges.push({
          x1: lastSolidEnd.x, y1: lastSolidEnd.y,
          x2: sx(plotData[i].time), y2: sy(plotData[i].flux)
        });
      }
    } else {
      solidPath += `L${sx(plotData[i].time).toFixed(1)},${sy(plotData[i].flux).toFixed(1)} `;
    }
    lastSolidEnd = { x: sx(plotData[i].time), y: sy(plotData[i].flux) };
  }

  // ── 5. Dip detection ───────────────────────────────────────────────────────
  const median = sortedF[Math.floor(sortedF.length / 2)];
  const std    = Math.sqrt(fluxes.reduce((a,f) => a + (f-median)**2, 0) / fluxes.length);
  const DIP_THRESHOLD = median - dipSigma * std;

  let periodicGroups = [];

  if (showCircles) {
    const dtMedian = (() => {
      const dts = [];
      for (let i = 1; i < Math.min(plotData.length, 200); i++)
        dts.push(plotData[i].time - plotData[i-1].time);
      dts.sort((a, b) => a - b);
      return dts[Math.floor(dts.length / 2)] || 0.02;
    })();
    const MIN_DIP_TIME_SEP = Math.max(minPeriod * 0.25, dtMedian * 10);

    const localDips = [];
    for (let i = 3; i < plotData.length - 3; i++) {
      const f = plotData[i].flux;
      if (f < DIP_THRESHOLD &&
          f <= plotData[i-1].flux && f <= plotData[i-2].flux && f <= plotData[i-3].flux &&
          f <= plotData[i+1].flux && f <= plotData[i+2].flux && f <= plotData[i+3].flux) {
        const lastTime = localDips.length ? localDips[localDips.length-1].time : -Infinity;
        if (plotData[i].time - lastTime > MIN_DIP_TIME_SEP)
          localDips.push({ idx: i, time: plotData[i].time, flux: plotData[i].flux });
      }
    }

    const adjSpacings = [];
    for (let i = 1; i < localDips.length; i++) {
      const dt = localDips[i].time - localDips[i-1].time;
      if (dt >= minPeriod && dt < (tMax - tMin) * 0.25)
        adjSpacings.push({ period: dt, anchor: localDips[i-1] });
    }

    const clusters = [];
    for (const sp of adjSpacings) {
      const existing = clusters.find(c => Math.abs(c.period - sp.period) / c.period < 0.15);
      if (existing) {
        existing.periods.push(sp.period);
        existing.period = existing.periods.reduce((a,b) => a+b) / existing.periods.length;
        existing.count++;
      } else {
        clusters.push({ period: sp.period, periods: [sp.period], count: 1, anchor: sp.anchor });
      }
    }
    clusters.sort((a, b) => b.count - a.count);

    const candidates = [];
    for (const cl of clusters.slice(0, 5)) {
      const P = cl.period;
      const anchor = cl.anchor;
      const explained = localDips.filter(d => {
        const phase = ((d.time - anchor.time) % P + P) % P;
        return phase < P * 0.12 || phase > P * 0.88;
      });
      if (explained.length >= 3)
        candidates.push({ period: P, anchor, dips: explained, count: cl.count });
    }
    candidates.sort((a, b) => b.dips.length - a.dips.length || a.period - b.period);

    const deduped = [];
    for (const cand of candidates) {
      if (!deduped.some(d => Math.abs(d.period - cand.period) / d.period < 0.10))
        deduped.push(cand);
    }

    const usedDips = new Set();
    for (const cand of deduped) {
      const newDips = cand.dips.filter(d => !usedDips.has(d.idx));
      if (newDips.length < 3) continue;
      const isHarmonic = periodicGroups.some(g => {
        const r = cand.period / g.period, n = Math.round(r);
        const r2 = g.period / cand.period, n2 = Math.round(r2);
        return (n >= 1 && Math.abs(r-n) < 0.12) || (n2 >= 2 && Math.abs(r2-n2) < 0.12);
      });
      if (isHarmonic) continue;
      periodicGroups.push({ period: cand.period, dips: newDips });
      newDips.forEach(d => usedDips.add(d.idx));
      if (periodicGroups.length >= 2) break;
    }
  }

  // ── 6. Backend transit markers ─────────────────────────────────────────────
  const backendTransits = [];
  if (showCircles) {
    planets.forEach((p, pi) => {
      if (!p?.period || !p?.t0) return;
      let t = p.t0;
      while (t <= tMax) {
        if (t >= tMin) backendTransits.push({ time: t, planetIdx: pi });
        t += p.period;
      }
    });
  }

  // ── 7. Ticks ───────────────────────────────────────────────────────────────
  const xTicks = Array.from({ length: 7 }, (_, i) => tMin + (i/6)*(tMax-tMin));
  const yTicks = Array.from({ length: 6 }, (_, i) => fMin + (i/5)*(fMax-fMin));
  const COLORS = ["#ff4444", "#44aaff", "#44ff88", "#ffaa00", "#cc44ff"];

  // ── 8. Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ overflowX: "auto", width: "100%" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", maxWidth: width, display: "block", fontFamily: "sans-serif", background: "#fff" }}
      >
        {/* ── CLIP PATH — keeps everything inside the plot area ── */}
        <defs>
          <clipPath id={CLIP_ID}>
            <rect x={margin.left} y={margin.top} width={innerW} height={innerH} />
          </clipPath>
        </defs>

        {/* Grid — drawn inside clip */}
        <g clipPath={`url(#${CLIP_ID})`}>
          {yTicks.map((f, i) => (
            <line key={`yg${i}`} x1={margin.left} y1={sy(f)}
              x2={margin.left+innerW} y2={sy(f)} stroke="#ebebeb" strokeWidth="1" />
          ))}
          {xTicks.map((t, i) => (
            <line key={`xg${i}`} x1={sx(t)} y1={margin.top}
              x2={sx(t)} y2={margin.top+innerH} stroke="#ebebeb" strokeWidth="1" />
          ))}

          {/* Median reference */}
          <line x1={margin.left} y1={sy(median)} x2={margin.left+innerW} y2={sy(median)}
            stroke="#bbb" strokeWidth="0.8" strokeDasharray="6,4" />

          {/* Dip threshold */}
          {showCircles && DIP_THRESHOLD > fMin && (
            <line x1={margin.left} y1={sy(DIP_THRESHOLD)}
              x2={margin.left+innerW} y2={sy(DIP_THRESHOLD)}
              stroke="#ffaaaa" strokeWidth="0.8" strokeDasharray="4,3" />
          )}

          {/* Gap bridges */}
          {gapBridges.map((b, i) => (
            <line key={`gap${i}`} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2}
              stroke="#bbb" strokeWidth="0.7" strokeDasharray="4,4" />
          ))}

          {/* Main light curve line */}
          <path d={solidPath} fill="none" stroke="#1a1a1a" strokeWidth="0.9" strokeLinejoin="round" />

          {/* Periodic dip circles */}
          {periodicGroups.map((grp, gi) =>
            grp.dips.map((dip, di) => (
              <g key={`dip-${gi}-${di}`}>
                <circle cx={sx(dip.time)} cy={sy(dip.flux)} r="14"
                  fill="none" stroke={COLORS[gi % COLORS.length]} strokeWidth="2" />
                <circle cx={sx(dip.time)} cy={sy(dip.flux)} r="2.5"
                  fill={COLORS[gi % COLORS.length]} />
                {di === 0 && (
                  <text x={sx(dip.time)} y={sy(dip.flux)-20}
                    textAnchor="middle" fontSize="10" fontWeight="bold"
                    fill={COLORS[gi % COLORS.length]}>
                    P≈{grp.period.toFixed(2)}d
                  </text>
                )}
              </g>
            ))
          )}

          {/* Backend transit lines — clipped so they don't poke out */}
          {backendTransits.map((bt, i) => (
            <line key={`bt-${i}`} x1={sx(bt.time)} y1={margin.top}
              x2={sx(bt.time)} y2={margin.top+innerH}
              stroke={COLORS[(bt.planetIdx + periodicGroups.length) % COLORS.length]}
              strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />
          ))}
        </g>

        {/* ── Axes (drawn OUTSIDE clip so borders are fully visible) ── */}
        <line x1={margin.left} y1={margin.top+innerH}
          x2={margin.left+innerW} y2={margin.top+innerH} stroke="#333" strokeWidth="1.5" />
        <line x1={margin.left} y1={margin.top}
          x2={margin.left} y2={margin.top+innerH} stroke="#333" strokeWidth="1.5" />

        {/* X ticks */}
        {xTicks.map((t, i) => (
          <g key={`xt${i}`}>
            <line x1={sx(t)} y1={margin.top+innerH} x2={sx(t)} y2={margin.top+innerH+5} stroke="#333" />
            <text x={sx(t)} y={margin.top+innerH+18} textAnchor="middle" fontSize="11" fill="#333">
              {t.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Y ticks */}
        {yTicks.map((f, i) => (
          <g key={`yt${i}`}>
            <line x1={margin.left-5} y1={sy(f)} x2={margin.left} y2={sy(f)} stroke="#333" />
            <text x={margin.left-8} y={sy(f)+4} textAnchor="end" fontSize="11" fill="#333">
              {f.toFixed(4)}
            </text>
          </g>
        ))}

        {/* Axis labels */}
        <text x={width/2} y={height-10} textAnchor="middle" fontSize="13" fill="#333">
          Time (BJD)
        </text>
        <text x={16} y={height/2} textAnchor="middle" fontSize="13" fill="#333"
          transform={`rotate(-90 16 ${height/2})`}>
          Normalized Flux
        </text>

        {/* Legend */}
        {showCircles && periodicGroups.length > 0 && (
          <g>
            {periodicGroups.map((grp, gi) => (
              <g key={`leg${gi}`}>
                <circle cx={margin.left + 16 + gi*190} cy={margin.top-18} r="6"
                  fill="none" stroke={COLORS[gi % COLORS.length]} strokeWidth="1.8" />
                <text x={margin.left + 28 + gi*190} y={margin.top-14}
                  fontSize="11" fill={COLORS[gi % COLORS.length]} fontWeight="bold">
                  Candidate {gi+1} — P={grp.period.toFixed(3)} d ({grp.dips.length} transits)
                </text>
              </g>
            ))}
          </g>
        )}

        {showCircles && periodicGroups.length === 0 && (
          <text x={width/2} y={margin.top-16} textAnchor="middle" fontSize="11" fill="#aaa">
            No periodic transit signal detected above threshold
          </text>
        )}
      </svg>
    </div>
  );
}