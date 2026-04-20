
import { useRef, useEffect, useState, useCallback, useMemo } from "react";

const CW = 750;
const CH = 750;
const COL_PLANET = "#4aff7f";
const COL_NOISE  = "#ff4444";
const COL_STAR   = "#c0392b";
const COL_ARC    = "rgba(74,255,127,0.55)";
const COL_LABEL  = "#aaffcc";

export default function TrajectoryViewer({
  tracks      = [],
  snrImageUrl = null,
  imageWidth  = null,
  imageHeight = null,
  starX       = null,
  starY       = null,
}) {
  const canvasRef             = useRef(null);
  const bgImgRef              = useRef(null);
  const bgLoadedRef           = useRef(false);
  const [bgReady, setBgReady] = useState(false);
  const [scale, setScale]     = useState(1);
  const [offset, setOffset]   = useState({ x: 0, y: 0 });
  const [hoverId, setHoverId] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  // For JSX rendering only
  const confirmedTracks = useMemo(() => tracks.filter(t =>  t.confirmed), [tracks]);
  const noiseTracks     = useMemo(() => tracks.filter(t => !t.confirmed), [tracks]);

  const { sX, sY } = useMemo(() => {
    const allX = tracks.flatMap(t => t.positions.map(p => p.x));
    const allY = tracks.flatMap(t => t.positions.map(p => p.y));
    const maxX = allX.length ? Math.max(...allX) : CW;
    const maxY = allY.length ? Math.max(...allY) : CH;
    return {
      sX: starX  ?? (imageWidth  ? imageWidth  / 2 : maxX / 2),
      sY: starY  ?? (imageHeight ? imageHeight / 2 : maxY / 2),
    };
  }, [tracks, imageWidth, imageHeight, starX, starY]);

  const { scaleX, scaleY } = useMemo(() => {
    const allX = tracks.flatMap(t => t.positions.map(p => p.x));
    const allY = tracks.flatMap(t => t.positions.map(p => p.y));
    const maxX = allX.length ? Math.max(...allX) : CW;
    const maxY = allY.length ? Math.max(...allY) : CH;
    const iW = imageWidth  ?? Math.ceil(maxX * 1.15);
    const iH = imageHeight ?? Math.ceil(maxY * 1.15);
    return { scaleX: CW / (iW || 1), scaleY: CH / (iH || 1) };
  }, [tracks, imageWidth, imageHeight]);

  const toCanvas = useCallback((fx, fy) => [
    fx * scaleX * scale + offset.x,
    fy * scaleY * scale + offset.y,
  ], [scaleX, scaleY, scale, offset]);

  // ── load SNR background ───────────────────────────────────────────────────
  useEffect(() => {
    bgLoadedRef.current = false;
    setBgReady(false);
    if (!snrImageUrl) return;
    const img = new Image();
    img.onload  = () => { bgImgRef.current = img; bgLoadedRef.current = true; setBgReady(true); };
    img.onerror = () => { bgImgRef.current = null; bgLoadedRef.current = false; };
    img.crossOrigin = "anonymous";
    img.src = snrImageUrl;
  }, [snrImageUrl]);

  // ── draw ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, CW, CH);

    // Compute inside effect — zero risk of init order issues
    const cfm  = tracks.filter(t =>  t.confirmed);
    const nois = tracks.filter(t => !t.confirmed);

    // Background
    if (bgLoadedRef.current && bgImgRef.current) {
      ctx.globalAlpha = 0.85;
      ctx.drawImage(bgImgRef.current, 0, 0, CW, CH);
      ctx.globalAlpha = 1.0;
    } else {
      const bg = ctx.createRadialGradient(CW/2, CH/2, 0, CW/2, CH/2, CW * 0.72);
      bg.addColorStop(0, "#140b00"); bg.addColorStop(0.4, "#0a0505"); bg.addColorStop(1, "#040404");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, CW, CH);
    }

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 8; i++) {
      const x = (CW / 8) * i, y = (CH / 8) * i;
      ctx.beginPath(); ctx.moveTo(x, 0);  ctx.lineTo(x, CH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y);  ctx.lineTo(CW, y); ctx.stroke();
    }

    // Star cross
    const [sx, sy] = toCanvas(sX, sY);
    ctx.strokeStyle = COL_STAR; ctx.lineWidth = 2.5;
    [[sx-14,sy,sx+14,sy],[sx,sy-14,sx,sy+14]].forEach(([x1,y1,x2,y2]) => {
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });

    // Tracks: noise first, confirmed on top
    [...nois, ...cfm].forEach((track) => {
      const isConf = track.confirmed;
      const isHov  = hoverId === track.track_id;
      const color  = isConf ? COL_PLANET : COL_NOISE;

      ctx.globalAlpha = isConf ? (isHov ? 1.0 : 0.88) : (isHov ? 0.65 : 0.28);
      ctx.setLineDash(isConf ? [] : [7, 5]);

      if (track.positions.length > 1) {
        ctx.beginPath();
        track.positions.forEach((p, i) => {
          const [cx, cy] = toCanvas(p.x, p.y);
          i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth   = isConf ? (isHov ? 2.8 : 1.8) : (isHov ? 1.6 : 0.9);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      track.positions.forEach((p) => {
        const [cx, cy] = toCanvas(p.x, p.y);
        ctx.beginPath();
        ctx.arc(cx, cy, isConf ? (isHov ? 5 : 3.5) : (isHov ? 3.5 : 2.2), 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
      });

      // Keplerian arc
      if (isConf && track.r_px > 0 && Math.abs(track.omega ?? 0) > 1e-6) {
        const theta0 = track.theta0 ?? 0;
        const omega  = track.omega  ?? 0;
        const tMax   = Math.min(track.duration, 25);
        ctx.beginPath();
        for (let ti = 0; ti <= 120; ti++) {
          const t = (ti / 120) * tMax;
          const [cx, cy] = toCanvas(
            sX + track.r_px * Math.cos(theta0 + omega * t),
            sY + track.r_px * Math.sin(theta0 + omega * t),
          );
          ti === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
        }
        ctx.strokeStyle = COL_ARC; ctx.lineWidth = isHov ? 2 : 1.2;
        ctx.setLineDash([5, 4]); ctx.globalAlpha = isHov ? 0.85 : 0.5;
        ctx.stroke(); ctx.setLineDash([]);
      }

      // Labels
      ctx.globalAlpha = 1;
      if (isConf || isHov) {
        const [lx, ly] = toCanvas(track.positions[0].x, track.positions[0].y);
        const rank = isConf ? cfm.indexOf(track) + 1 : null;

        ctx.font = `bold ${isHov ? 13 : 11}px 'Courier New', monospace`;
        ctx.fillStyle = color;
        ctx.fillText(`T${track.track_id}`, lx + 7, ly - 6);

        if (isConf && track.arc_score > 0) {
          ctx.font = "9px 'Courier New', monospace"; ctx.fillStyle = COL_LABEL;
          ctx.fillText(`sc=${track.arc_score.toFixed(3)}`, lx + 7, ly + 6);
        }
        if (rank) {
          ctx.font = "bold 10px 'Courier New', monospace"; ctx.fillStyle = "#ffe066";
          ctx.fillText(`#${rank}`, lx + 7, ly + 17);
        }
      }
      ctx.globalAlpha = 1;
    });

    // Legend
    ctx.globalAlpha = 0.9; ctx.font = "11px 'Courier New', monospace";
    ctx.fillStyle = COL_PLANET; ctx.fillRect(14, CH-44, 12, 10);
    ctx.fillStyle = "#ccc";     ctx.fillText("Confirmed planet", 30, CH-35);
    ctx.fillStyle = COL_NOISE;  ctx.fillRect(14, CH-26, 12, 10);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#888";     ctx.fillText("Noise / unconfirmed", 30, CH-17);
    ctx.globalAlpha = 1;

  }, [tracks, scale, offset, hoverId, toCanvas, sX, sY, bgReady]);

  // ── hit test ─────────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx   = (e.clientX - rect.left) * (CW / rect.width);
    const my   = (e.clientY - rect.top)  * (CH / rect.height);
    let hit = null;
    outer: for (const track of [...tracks].reverse()) {
      for (const p of track.positions) {
        const [cx, cy] = toCanvas(p.x, p.y);
        if (Math.hypot(mx - cx, my - cy) < 11) { hit = track; break outer; }
      }
    }
    setHoverId(hit ? hit.track_id : null);
    setTooltip(hit ? { clientX: e.clientX, clientY: e.clientY, track: hit } : null);
    if (e.buttons === 1) setOffset(o => ({ x: o.x + e.movementX, y: o.y + e.movementY }));
  }, [tracks, toCanvas]);

  // ── empty state ──────────────────────────────────────────────────────────
  if (!tracks.length) {
    return (
      <div style={{ background: "#0c0c0c", borderRadius: 8, padding: "48px 24px",
                    textAlign: "center", border: "1px solid #222" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🛤</div>
        <p style={{ color: "#444", fontSize: 13, margin: 0 }}>
          No trajectory data yet.<br/>Upload multiple FITS frames to generate tracklets.
        </p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Courier New', monospace" }}>

      {/* Stats */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          { label: "Confirmed",    val: confirmedTracks.length, color: COL_PLANET, bg: "#0e1e0e", border: "#1e3e1e" },
          { label: "Noise",        val: noiseTracks.length,     color: COL_NOISE,  bg: "#1e0e0e", border: "#3e1e1e" },
          { label: "Total tracks", val: tracks.length,          color: "#888",     bg: "#111",    border: "#2a2a2a" },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 6, padding: "6px 16px" }}>
            <span style={{ fontSize: 20, fontWeight: "bold", color: s.color }}>{s.val}</span>
            <span style={{ fontSize: 11, color: "#444", marginLeft: 8 }}>{s.label}</span>
          </div>
        ))}
        <div style={{ background: "#111", border: "1px solid #222", borderRadius: 6,
                      padding: "6px 12px", fontSize: 11, color: "#333", alignSelf: "center" }}>
          Hover · scroll-zoom · drag-pan · dbl-click reset
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* Canvas */}
        <canvas
          ref={canvasRef} width={CW} height={CH}
          style={{ border: "1px solid #2a2a2a", borderRadius: 6, background: "#050505",
                   maxWidth: "100%", cursor: hoverId !== null ? "crosshair" : "grab", display: "block" }}
          onWheel={(e) => {
            e.preventDefault();
            setScale(s => Math.max(0.15, Math.min(14, s * (e.deltaY < 0 ? 1.12 : 0.90))));
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { setHoverId(null); setTooltip(null); }}
          onDoubleClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
        />

        {/* Track table */}
        <div style={{ flex: 1, minWidth: 240, maxHeight: CH, overflowY: "auto" }}>
          <p style={{ fontSize: 10, color: "#333", textTransform: "uppercase",
                      letterSpacing: "0.08em", margin: "0 0 8px 0" }}>
            All Tracks — sorted by arc score ↓
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {[...tracks].sort((a, b) => b.arc_score - a.arc_score).map((t) => {
              const isConf = t.confirmed;
              const isHov  = hoverId === t.track_id;
              const rank   = isConf ? confirmedTracks.indexOf(t) + 1 : null;
              return (
                <div key={t.track_id}
                  onMouseEnter={() => setHoverId(t.track_id)}
                  onMouseLeave={() => setHoverId(null)}
                  style={{
                    background: isHov ? "#1e1e1e" : "#141414",
                    border:     `1px solid ${isConf ? "#1e3e1e" : "#2e1414"}`,
                    borderLeft: `3px solid ${isConf ? COL_PLANET : COL_NOISE}`,
                    borderRadius: 5, padding: "6px 10px", cursor: "default",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: "bold", fontSize: 12, color: isConf ? COL_PLANET : COL_NOISE }}>
                        T{t.track_id}
                      </span>
                      {rank && (
                        <span style={{ fontSize: 9, background: "#1e1e00", color: "#ffe066",
                                       padding: "1px 5px", borderRadius: 3 }}>#{rank}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: "bold", padding: "1px 6px", borderRadius: 3,
                                   background: isConf ? "#0e1e0e" : "#2e0e0e",
                                   color: isConf ? COL_PLANET : COL_NOISE }}>
                      {isConf ? "✅ PLANET" : "❌ noise"}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: "#444", display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 3 }}>
                    <span>dur: <b style={{ color: "#999" }}>{t.duration}</b></span>
                    <span>score: <b style={{ color: "#999" }}>{t.arc_score.toFixed(3)}</b></span>
                    <span>conf: <b style={{ color: "#999" }}>{t.mean_conf.toFixed(2)}</b></span>
                    <span>r: <b style={{ color: "#999" }}>{t.r_px}</b>px</span>
                    <span>RMS: <b style={{ color: "#999" }}>{t.residual_rms}</b></span>
                  </div>
                  <div style={{ fontSize: 9, color: "#2e2e2e", maxHeight: 30, overflowY: "auto", lineHeight: 1.6 }}>
                    {t.frames.map((f, fi) => (
                      <span key={fi} style={{ marginRight: 7, color: isHov ? "#444" : "#2e2e2e" }}>
                        f{f}({t.positions[fi]?.x},{t.positions[fi]?.y})
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip?.track && (
        <div style={{
          position: "fixed", left: tooltip.clientX + 16, top: tooltip.clientY - 14,
          background: "#141414",
          border: `1px solid ${tooltip.track.confirmed ? COL_PLANET : COL_NOISE}`,
          borderRadius: 7, padding: "10px 14px", fontSize: 11, color: "#ccc",
          zIndex: 9999, pointerEvents: "none", boxShadow: "0 6px 28px rgba(0,0,0,0.7)", minWidth: 190,
        }}>
          <div style={{ fontWeight: "bold", fontSize: 13, marginBottom: 8,
                        color: tooltip.track.confirmed ? COL_PLANET : COL_NOISE }}>
            T{tooltip.track.track_id}{tooltip.track.confirmed ? "  ✅ PLANET" : "  ❌ noise"}
          </div>
          {[
            ["Duration",   `${tooltip.track.duration} frames`],
            ["Arc Score",  tooltip.track.arc_score.toFixed(4)],
            ["Orbital r",  `${tooltip.track.r_px} px`],
            ["Resid RMS",  `${tooltip.track.residual_rms} px`],
            ["r-stability",tooltip.track.r_stability?.toFixed(3) ?? "—"],
            ["Mean Conf",  tooltip.track.mean_conf?.toFixed(3)   ?? "—"],
            ["Mean SNR",   tooltip.track.mean_snr?.toFixed(2)    ?? "—"],
            ["ω (rad/fr)", tooltip.track.omega?.toFixed(5)       ?? "—"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 18, marginBottom: 2 }}>
              <span style={{ color: "#444" }}>{k}</span>
              <span style={{ color: "#eee" }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}