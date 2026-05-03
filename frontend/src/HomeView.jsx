
import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "./api";
import TrajectoryViewer from "./components/Trajectoryviewer";

// const BACKEND_URL = "https://exo-hybrid-detection-backend.onrender.com";
const BACKEND_URL = "http://localhost:8000";

const DEFAULT_PARAMS = {
  // Detection
  edge_crop: 10,
  bkg_filter_size: 101,
  psf_sigma: 2.0,
  psf_size: 9,
  snr_threshold: 3.0,
  thresh_fraction: 0.2,
  min_sep_pix: 45,
  circle_radius: 30,
  top_n: 5,
  // CNN / Tracking
  patch_size: 64,
  min_conf_init: 0.35,
  min_track_len: 5,
  min_arc_frames: 5,
  arc_score_thresh: 0.45,
  kalman_proc: 1.5,
  kalman_meas: 2.5,
  // Arc score weights
  w_resid: 0.35,
  w_persist: 0.25,
  w_cnn: 0.20,
  w_rstab: 0.20,
  // Display
  circle_color: "lime",
  snr_cmap: "inferno",
};

const CIRCLE_COLORS = ["lime", "red", "white", "orange", "yellow", "cyan", "magenta"];
const SNR_CMAPS     = ["inferno", "viridis", "plasma", "magma", "coolwarm", "RdYlBu_r", "seismic", "gray"];
const VIEW_MODES    = ["raw", "enhanced", "snr", "lr", "trajectories"];
const VIEW_LABELS   = {
  raw: "Raw Image", enhanced: "Enhanced Image",
  snr: "SNR Map",  lr: "LR Map",
  trajectories: "🛤 Trajectories",
};

function parseError(err) {
  const status = err?.response?.status;
  const detail = err?.response?.data?.detail || err?.response?.data || err?.message || "";
  if (status === 422) return { title: "Invalid Parameters", message: "One or more parameters are out of range or the wrong type." };
  if (status === 413 || String(detail).toLowerCase().includes("size")) return { title: "File Too Large", message: "One or more files exceed the upload size limit." };
  if (String(detail).toLowerCase().includes("fits") || String(detail).toLowerCase().includes("hdu")) return { title: "Invalid FITS File", message: "One of the uploaded files could not be read as a valid FITS image." };
  if (String(detail).toLowerCase().includes("crop") || String(detail).toLowerCase().includes("edge")) return { title: "Edge Crop Too Large", message: "The Edge Crop value is too large for the image size. Try reducing it." };
  if (status === 500) return { title: "Processing Error", message: `Server error while processing.\n\nDetail: ${String(detail).slice(0, 200)}` };
  if (!navigator.onLine) return { title: "Connection Error", message: "Could not reach the backend server." };
  return { title: "Something Went Wrong", message: detail ? `The server returned: "${String(detail).slice(0, 300)}"` : "An unexpected error occurred." };
}

function ErrorDialog({ error, onClose }) {
  if (!error) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex",
                  alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#1a1a1a", border: "1px solid #c0392b", borderRadius: 12,
                    padding: 32, maxWidth: 480, width: "90%", boxShadow: "0 0 40px rgba(192,57,43,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 28 }}>⚠️</span>
          <h2 style={{ margin: 0, color: "#e74c3c", fontSize: 18, fontFamily: "monospace" }}>{error.title}</h2>
        </div>
        <p style={{ color: "#ccc", fontSize: 14, lineHeight: 1.7, margin: "0 0 24px 0", whiteSpace: "pre-line" }}>{error.message}</p>
        <div style={{ background: "#111", borderRadius: 8, padding: 12, marginBottom: 24, borderLeft: "3px solid #e67e22" }}>
          <p style={{ color: "#e67e22", fontSize: 12, margin: "0 0 6px 0", fontWeight: "bold" }}>💡 What to try:</p>
          <ul style={{ color: "#aaa", fontSize: 12, margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
            <li>Confirm your files are valid FITS or image files</li>
            <li>Try resetting parameters to defaults</li>
            <li>Reduce Edge Crop if images are small</li>
            <li>Make sure uvicorn is running on port 8000</li>
          </ul>
        </div>
        <button onClick={onClose}
          style={{ width: "100%", padding: "10px 0", background: "#c0392b", color: "#fff",
                   border: "none", borderRadius: 6, fontWeight: "bold", fontSize: 14, cursor: "pointer", letterSpacing: 1 }}>
          DISMISS
        </button>
      </div>
    </div>
  );
}

function LoadingOverlay({ fileCount, currentStep, done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : null;
  return (
    <div style={{ background: "#111", border: "1px solid #333", borderRadius: 10, padding: "20px 24px", marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 20, display: "inline-block", animation: "spin 1.2s linear infinite" }}>⚙️</span>
        <span style={{ color: "#4a9eff", fontWeight: "bold", fontSize: 14 }}>
          Processing {fileCount} file{fileCount !== 1 ? "s" : ""}
          {total > 0 && ` — ${done} / ${total} done`}
        </span>
      </div>
      <p style={{ color: "#aaa", fontSize: 13, fontStyle: "italic", margin: "0 0 14px 0",
                  fontFamily: "monospace", borderLeft: "2px solid #4a9eff", paddingLeft: 10, minHeight: 20 }}>
        {currentStep || "Initialising..."}
      </p>
      {pct !== null && (
        <>
          <div style={{ background: "#222", borderRadius: 4, height: 6, overflow: "hidden", marginBottom: 6 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #4a9eff, #7b61ff)",
                          borderRadius: 4, transition: "width 0.4s ease" }} />
          </div>
          <p style={{ color: "#555", fontSize: 11, margin: 0, textAlign: "right" }}>{pct}%</p>
        </>
      )}
      <style>{`@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>
    </div>
  );
}

function ImageViewer({ src }) {
  return (
    <img src={src} alt="Detection Result"
      style={{ width: "100%", borderRadius: 4, border: "1px solid #444", background: "#000", display: "block" }} />
  );
}

// ── Accordion Section ─────────────────────────────────────────────────────────
function AccordionSection({ title, icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: "1px solid #2a2a2a", borderRadius: 7, overflow: "hidden", background: "#1a1a1a" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                 padding: "9px 12px", background: open ? "#202020" : "transparent",
                 border: "none", cursor: "pointer", color: open ? "#eee" : "#888",
                 transition: "background 0.15s, color 0.15s" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11,
                        fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          <span style={{ fontSize: 13 }}>{icon}</span>{title}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div style={{ maxHeight: open ? "600px" : "0px", overflow: "hidden", transition: "max-height 0.25s ease" }}>
        <div style={{ padding: "10px 12px 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Stats Summary Bar ─────────────────────────────────────────────────────────
function StatsSummary({ results }) {
  if (!results?.detections?.length) return null;
  const totalFrames   = results.detections.length;
  const totalCNNCands = results.detections.reduce(
    (s, d) => s + (d.cnn_results?.length ?? d.detections?.length ?? 0), 0
  );
  const trk        = results.detections[0]?.tracking_summary ?? {};
  const minTrackLen = 5;

  const stats = [
    { label: "FITS Frames",          value: totalFrames,                color: "#4a9eff" },
    { label: "Total CNN Candidates", value: totalCNNCands,              color: "#aaa"    },
    { label: "Tracklets Formed",     value: trk.total_tracklets ?? "—", color: "#e67e22" },
    { label: `Valid (≥${minTrackLen} fr)`, value: trk.valid_tracklets ?? "—", color: "#9b59b6" },
    { label: "Confirmed Planets",    value: trk.confirmed_planets ?? "—", color: "#4aff7f" },
  ];

  return (
    <div style={{ display: "flex", gap: 0, marginBottom: 16, background: "#161616",
                  borderRadius: 8, border: "1px solid #2a2a2a", overflow: "hidden" }}>
      {stats.map((st, i) => (
        <div key={i} style={{ flex: "1 1 0", textAlign: "center", padding: "10px 8px",
                               borderRight: i < stats.length - 1 ? "1px solid #2a2a2a" : "none" }}>
          <div style={{ fontSize: 22, fontWeight: "bold", color: st.color,
                        fontFamily: "monospace", lineHeight: 1.1 }}>{st.value}</div>
          <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase",
                        letterSpacing: "0.05em", marginTop: 3, lineHeight: 1.3 }}>{st.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HomeView({ results, setResults }) {
  const [files, setFiles]                 = useState([]);
  const [jobId, setJobId]                 = useState(null);
  const [viewMode, setViewMode]           = useState("snr");
  const [params, setParams]               = useState(DEFAULT_PARAMS);
  const [pendingParams, setPendingParams] = useState(DEFAULT_PARAMS);
  const [paramsChanged, setParamsChanged] = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [currentStep, setCurrentStep]     = useState("");
  const [done, setDone]                   = useState(0);
  const [total, setTotal]                 = useState(0);
  const [hasUploaded, setHasUploaded]     = useState(false);

  const setParam = (key, val) => {
    setPendingParams(p => ({ ...p, [key]: val }));
    setParamsChanged(true);
  };

  useEffect(() => {
    if (!jobId || !loading) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`${BACKEND_URL}/status/${jobId}`);
        if (res.data.step)  setCurrentStep(res.data.step);
        if (res.data.done  !== undefined) setDone(res.data.done);
        if (res.data.total !== undefined) setTotal(res.data.total);
      } catch {}
    }, 600);
    return () => clearInterval(interval);
  }, [jobId, loading]);

  const runPipeline = async (fileList, currentParams) => {
    setLoading(true);
    setCurrentStep("Uploading files...");
    setDone(0); setTotal(0);
    setError(null);
    setResults(null);
    const data = new FormData();
    for (let f of fileList) data.append("files", f);
    data.append("params", JSON.stringify(currentParams));
    try {
      const res = await api.post(`${BACKEND_URL}/upload`, data);
      setResults(res.data);
      setJobId(res.data.job_id);
      setParams(currentParams);
      setParamsChanged(false);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
      setCurrentStep("");
    }
  };

  const handleUpload = async (e) => {
    const fileList = e.target.files;
    if (!fileList.length) return;
    setFiles([...fileList]);
    setHasUploaded(true);
    setPendingParams(DEFAULT_PARAMS);
    setParamsChanged(false);
    await runPipeline([...fileList], DEFAULT_PARAMS);
  };

  const handleUpdate = async () => {
    if (!files.length) return;
    await runPipeline(files, pendingParams);
  };

  const imageKey     = { raw: "raw_image", enhanced: "enhanced_image", snr: "snr_image", lr: "lr_image" };
  const downloadFile = (url, name) => { const a = document.createElement("a"); a.href = url; a.download = name; a.click(); };

  const s = {
    page:     { display: "flex", fontFamily: "sans-serif", background: "#111", color: "#eee", minHeight: "100vh" },
    leftCol:  { flex: 1, padding: 24, overflowY: "auto" },
    rightCol: { width: 300, minWidth: 260, background: "#161616", borderLeft: "1px solid #2a2a2a",
                padding: 20, overflowY: "auto", display: hasUploaded ? "flex" : "none",
                flexDirection: "column", gap: 8 },
    card:     { background: "#1e1e1e", borderRadius: 8, padding: 16, marginBottom: 16 },
    label:    { fontSize: 11, color: "#ffffff", marginBottom: 3, display: "block",
                textTransform: "uppercase", letterSpacing: "0.04em" },
    input:    { background: "#2a2a2a", color: "#eee", border: "1px solid #444", borderRadius: 4,
                padding: "5px 8px", width: "100%", boxSizing: "border-box", fontSize: 13 },
    select:   { background: "#2a2a2a", color: "#eee", border: "1px solid #444", borderRadius: 4,
                padding: "5px 8px", width: "100%", fontSize: 13 },
    btn:         { padding: "6px 14px", borderRadius: 4, border: "none", cursor: "pointer", fontWeight: "bold", fontSize: 13 },
    tabActive:   { background: "#4a9eff", color: "#fff" },
    tabInactive: { background: "#333", color: "#bbb" },
    tabTrajA:    { background: "#2a5a2a", color: "#4aff7f", border: "1px solid #4aff7f" },
    tabTrajI:    { background: "#1a2a1a", color: "#4aff7f", border: "1px solid #2a4a2a" },
    dlBtn:    { background: "#2a6e2a", color: "#fff", fontSize: 11, padding: "3px 8px",
                borderRadius: 3, border: "none", cursor: "pointer", marginLeft: 4 },
    grid:     { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 16 },
    imgCard:  { background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: 8, padding: 16, transition: "all 0.2s" },
    row:      { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
    divider:  { border: "none", borderTop: "1px solid #2a2a2a", margin: "4px 0" },
    updateBtn:{ width: "100%", padding: "10px 0", borderRadius: 6, border: "none", cursor: "pointer",
                fontWeight: "bold", fontSize: 13, letterSpacing: "0.05em",
                background: paramsChanged ? "#4a9eff" : "#2a2a2a",
                color: paramsChanged ? "#fff" : "#555", transition: "all 0.2s",
                boxShadow: paramsChanged ? "0 0 12px rgba(74,158,255,0.4)" : "none" },
    resetBtn: { width: "100%", padding: "7px 0", borderRadius: 6, border: "1px solid #333",
                cursor: "pointer", fontWeight: "bold", fontSize: 12,
                background: "transparent", color: "#666" },
  };

  const ParamRow = ({ label, paramKey, step = 1, min = 0 }) => (
    <div>
      <label style={s.label}>{label}</label>
      <input type="number" step={step} min={min} value={pendingParams[paramKey]} style={s.input}
        onChange={(e) => setParam(paramKey, parseFloat(e.target.value))} />
    </div>
  );

  return (
    <div style={s.page}>
      <ErrorDialog error={error} onClose={() => setError(null)} />

      {/* ── Left ── */}
      <div style={s.leftCol}>
        <h1 style={{ marginBottom: 20, fontSize: 22 }}>🔭 Exoplanet Direct Imaging Detection</h1>

        {/* Upload */}
        <div style={s.card}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Upload FITS / Image Files</h3>
          <label className="file-upload-button">
            Choose Files
            <input type="file" multiple accept=".fits,.fit,.fts,.png,.jpg,.jpeg,.tif,.tiff"
              onChange={handleUpload} style={{ display: 'none' }} />
          </label>
          {hasUploaded && files.length > 0 && (
            <p style={{ fontSize: 12, color: "#666", margin: "8px 0 0 0" }}>
              {files.length} file{files.length !== 1 ? "s" : ""} loaded — adjust parameters and click{" "}
              <b style={{ color: "#4a9eff" }}>Apply Parameters</b> to reprocess.
            </p>
          )}
          {loading && <LoadingOverlay fileCount={files.length} currentStep={currentStep} done={done} total={total} />}
        </div>

        {/* Results */}
        {results && !loading && (
          <div>
            {/* Stats bar */}
            <StatsSummary results={results} />

            {/* Tabs */}
            <div style={{ ...s.row, marginBottom: 16 }}>
              {VIEW_MODES.map((mode) => {
                const isTraj   = mode === "trajectories";
                const isActive = viewMode === mode;
                let btnStyle   = { ...s.btn };
                if (isTraj)  btnStyle = { ...btnStyle, ...(isActive ? s.tabTrajA : s.tabTrajI) };
                else         btnStyle = { ...btnStyle, ...(isActive ? s.tabActive : s.tabInactive) };
                return (
                  <button key={mode} style={btnStyle} onClick={() => setViewMode(mode)}>
                    {VIEW_LABELS[mode]}
                  </button>
                );
              })}
            </div>

            {/* Trajectory panel */}
            {viewMode === "trajectories" ? (
              <div style={s.card}>
                <h3 style={{ marginTop: 0, marginBottom: 6, color: "#4aff7f" }}>
                  🛤 Tracklet Trajectories
                </h3>

                <p style={{ fontSize: 11, color: "#555", margin: "0 0 14px 0" }}>
                  Green = confirmed planets · Red = noise (Colab-style static output)
                </p>

                {results?.trajectory_image ? (
  
                  <img
                    // src={`${BACKEND_URL}/${results.trajectory_image}?t=${Date.now()}`}
                    
                    src={`${BACKEND_URL}/outputs/${results.trajectory_image}?t=${Date.now()}`}
                    // alt="Trajectory Result"
                      // src={`${BACKEND_URL}${results.trajectory_image}?t=${Date.now()}`}
                      alt="Trajectory Result"
                    style={{
                      width: "100%",
                      borderRadius: 6,
                      border: "1px solid #2a2a2a"
                    }}
                  />
                ) : (
                  <p style={{ color: "#888" }}>No trajectory image available</p>
                )}
              </div>
            ) : (
              <>
                {/* Downloads */}
                <div style={{ ...s.card, ...s.row }}>
                  <span style={{ fontWeight: "bold", marginRight: 8 }}>{VIEW_LABELS[viewMode]} Downloads:</span>
                  <button style={{ ...s.btn, background: "#2a5c8a", color: "#fff" }}
                    onClick={() => downloadFile(
                      `${BACKEND_URL}/download/exoplanet_${viewMode}.${results.output_type}`,
                      `exoplanet_${viewMode}.${results.output_type}`)}>
                    ⬇ {results.output_type.toUpperCase()} ({VIEW_LABELS[viewMode]})
                  </button>
                  <button style={{ ...s.btn, background: "#2a6e2a", color: "#fff" }}
                    onClick={() => downloadFile(
                      `${BACKEND_URL}/download/exoplanet_${viewMode}.zip`,
                      `exoplanet_${viewMode}.zip`)}>
                    ⬇ ZIP ({VIEW_LABELS[viewMode]})
                  </button>
                </div>

                {results.output_type === "gif" && results.animations?.[viewMode] && (
                  <div style={{ ...s.card, textAlign: "center" }}>
                    <p style={{ marginBottom: 8, fontWeight: "bold" }}>{VIEW_LABELS[viewMode]} — Animation Preview</p>
                    <img src={`${BACKEND_URL}${results.animations[viewMode]}?t=${Date.now()}`}
                      style={{ maxWidth: "100%", borderRadius: 4 }} alt={`${viewMode} animation`} />
                  </div>
                )}

                <div style={s.grid}>
                  {results.detections.map((d, i) => {
                    const imgSrc = `${BACKEND_URL}${d[imageKey[viewMode]]}`;
                    return (
                      <div key={i} style={s.imgCard}>
                        <div style={{ ...s.row, marginBottom: 6 }}>
                          <span style={{ fontWeight: "bold", flex: 1, fontSize: 13 }}>{d.frame}</span>
                          <button style={s.dlBtn}
                            onClick={() => downloadFile(
                              `${BACKEND_URL}/download/${d[imageKey[viewMode].replace("_image", "_png")]}`,
                              d[imageKey[viewMode].replace("_image", "_png")])}>⬇ PNG</button>
                        </div>
                        <p style={{ fontSize: 12, color: "#aaa", margin: "4px 0" }}>
                          Peak SNR: <b style={{ color: "#fff" }}>{d.snr.toFixed(2)}</b>
                          {" · "}Candidates: <b style={{ color: "#4aff7f" }}>{d.detections.length}</b>
                        </p>
                        {d.detections.length > 0 && (
                          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>
                            {d.detections.map((det, j) => (
                              <div key={j}>
                                #{j + 1} x={det.x} y={det.y} SNR={det.snr.toFixed(1)} sep={det.sep_pix.toFixed(1)}px
                              </div>
                            ))}
                          </div>
                        )}
                        {d.confirmed_detections?.length > 0 && (
                          <div style={{ fontSize: 11, marginBottom: 6, paddingTop: 4,
                                         borderTop: "1px solid #2a2a2a" }}>
                            {d.confirmed_detections.map((cd, j) => (
                              <div key={j} style={{ color: "#4aff7f" }}>
                                ✅ T{cd.track_id} x={cd.refined_x ?? cd.x} y={cd.refined_y ?? cd.y}
                                {cd.arc_score !== undefined && ` · sc=${cd.arc_score.toFixed(2)}`}
                                {cd.r_px > 0 && ` · r=${cd.r_px.toFixed(1)}px`}
                              </div>
                            ))}
                          </div>
                        )}
                        <ImageViewer src={imgSrc} />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>


      {/* ── Right: Parameters ── */}
      <div style={s.rightCol}>
        <div>
          <p style={{ margin: "0 0 2px 0", fontWeight: "bold", fontSize: 14, color: "#eee" }}>Parameters</p>
          <p style={{ margin: "0 0 8px 0", fontSize: 11, color: "#555" }}>
            Click a section to expand. Apply to reprocess.
          </p>
        </div>

        <AccordionSection title="Background & PSF" icon="🌌" defaultOpen={true}>
          <ParamRow label="BKG Filter Size" paramKey="bkg_filter_size" />
          <ParamRow label="PSF Sigma"       paramKey="psf_sigma"       step={0.1} />
          <ParamRow label="PSF Size"        paramKey="psf_size" />
        </AccordionSection>

        <AccordionSection title="Detection" icon="🔍" defaultOpen={true}>
          <ParamRow label="SNR Threshold"   paramKey="snr_threshold"   step={0.5} />
          <ParamRow label="Thresh Fraction" paramKey="thresh_fraction" step={0.05} />
          <ParamRow label="Min Sep (px)"    paramKey="min_sep_pix" />
          <ParamRow label="Circle Radius"   paramKey="circle_radius" />
          <ParamRow label="Edge Crop"       paramKey="edge_crop" />
          <ParamRow label="Top N"           paramKey="top_n" />
        </AccordionSection>

        <AccordionSection title="CNN / Tracking" icon="🤖" defaultOpen={false}>
          <ParamRow label="Patch Size"       paramKey="patch_size" />
          <ParamRow label="Min Conf Init"    paramKey="min_conf_init"    step={0.05} />
          <ParamRow label="Min Track Len"    paramKey="min_track_len" />
          <ParamRow label="Min Arc Frames"   paramKey="min_arc_frames" />
          <ParamRow label="Arc Score Thresh" paramKey="arc_score_thresh" step={0.05} />
          <ParamRow label="Kalman Process"   paramKey="kalman_proc"      step={0.1} />
          <ParamRow label="Kalman Measure"   paramKey="kalman_meas"      step={0.1} />
        </AccordionSection>

        <AccordionSection title="Arc Score Weights" icon="⚖️" defaultOpen={false}>
          <ParamRow label="W Residual"    paramKey="w_resid"   step={0.05} />
          <ParamRow label="W Persistence" paramKey="w_persist" step={0.05} />
          <ParamRow label="W CNN Conf"    paramKey="w_cnn"     step={0.05} />
          <ParamRow label="W Radial Stab" paramKey="w_rstab"   step={0.05} />
        </AccordionSection>

        <AccordionSection title="Display" icon="🎨" defaultOpen={false}>
          <div>
            <label style={s.label}>Circle Colour</label>
            <select style={s.select} value={pendingParams.circle_color}
              onChange={(e) => setParam("circle_color", e.target.value)}>
              {CIRCLE_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>SNR Colormap</label>
            <select style={s.select} value={pendingParams.snr_cmap}
              onChange={(e) => setParam("snr_cmap", e.target.value)}>
              {SNR_CMAPS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </AccordionSection>

        <hr style={s.divider} />

        <button style={s.updateBtn} onClick={handleUpdate} disabled={loading}>
          {loading ? "⚙️ Processing..." : paramsChanged ? "⚡ Apply Parameters" : "✓ Up to Date"}
        </button>

        <button style={s.resetBtn}
          onClick={() => { setPendingParams(DEFAULT_PARAMS); setParamsChanged(true); }}>
          Reset to Defaults
        </button>

        {paramsChanged && !loading && (
          <p style={{ fontSize: 11, color: "#4a9eff", textAlign: "center", margin: "4px 0 0 0" }}>
            Unsaved changes — click Apply to reprocess
          </p>
        )}
      </div>
    </div>
  );
}