import { useState } from "react";
import LightCurvePlot from "./components/LightCurvePlot";
import PhaseFoldPlot from "./components/PhaseFoldPlot";
import UploadCSV from "./components/UploadCSV";

const BACKEND_URL = "http://localhost:8000";

// const BACKEND_URL = "https://exo-hybrid-detection-backend.onrender.com";


// ── Error Dialog ──────────────────────────────────────────────────────────────
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
        <p style={{ color: "#ccc", fontSize: 14, lineHeight: 1.7, margin: "0 0 24px 0" }}>{error.message}</p>
        <div style={{ background: "#111", borderRadius: 8, padding: 12, marginBottom: 24, borderLeft: "3px solid #e67e22" }}>
          <p style={{ color: "#e67e22", fontSize: 12, margin: "0 0 6px 0", fontWeight: "bold" }}>💡 What to try:</p>
          <ul style={{ color: "#aaa", fontSize: 12, margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
            <li>Use a TESS .tbl, .fits, or .csv light curve file</li>
            <li>Make sure the file has TIME and PDCSAP_FLUX columns</li>
            <li>Try downloading fresh data from the Colab notebook</li>
            <li>Ensure uvicorn is running on port 8000</li>
          </ul>
        </div>
        <button onClick={onClose}
          style={{ width: "100%", padding: "10px 0", background: "#c0392b", color: "#fff",
                   border: "none", borderRadius: 6, fontWeight: "bold", fontSize: 14, cursor: "pointer" }}>
          DISMISS
        </button>
      </div>
    </div>
  );
}

// ── Confidence Badge ──────────────────────────────────────────────────────────
function ConfidenceBadge({ score }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "#4aff7f" : pct >= 40 ? "#f39c12" : "#e74c3c";
  const label = pct >= 70 ? "High Confidence" : pct >= 40 ? "Moderate" : "Low Confidence";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8,
                  background: "#1a1a1a", border: `1px solid ${color}`,
                  borderRadius: 20, padding: "4px 14px" }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
      <span style={{ color, fontWeight: "bold", fontSize: 13 }}>{pct}% — {label}</span>
    </div>
  );
}

// ── LSTM Score Bar ────────────────────────────────────────────────────────────
function LSTMScoreBar({ score }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "#4aff7f" : pct >= 40 ? "#f39c12" : "#e74c3c";
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#aaa" }}>LSTM Transit Probability</span>
        <span style={{ fontSize: 12, color, fontWeight: "bold" }}>{pct}%</span>
      </div>
      <div style={{ background: "#222", borderRadius: 4, height: 8, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color,
                      borderRadius: 4, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ── Loading Overlay ───────────────────────────────────────────────────────────
function LoadingOverlay({ step }) {
  return (
    <div style={{ background: "#111", border: "1px solid #333", borderRadius: 10,
                  padding: "20px 24px", marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 20, display: "inline-block", animation: "spin 1.2s linear infinite" }}>⚙️</span>
        <span style={{ color: "#4a9eff", fontWeight: "bold", fontSize: 14 }}>Analysing light curve...</span>
      </div>
      <p style={{ color: "#aaa", fontSize: 13, fontStyle: "italic", margin: 0,
                  fontFamily: "monospace", borderLeft: "2px solid #4a9eff", paddingLeft: 10 }}>
        {step || "Initialising pipeline..."}
      </p>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

// ── Planet Card ───────────────────────────────────────────────────────────────
function PlanetCard({ planet, index, lightCurve }) {
  const bls    = planet.bls_power > 0;
  const source = bls ? "BLS" : "Periodic Dip";
  const conf   = planet.detection_confidence ?? 0;
  const confPct = Math.round(conf * 100);
  const confColor = confPct >= 60 ? "#4aff7f" : confPct >= 35 ? "#f39c12" : "#e74c3c";
  const confLabel = confPct >= 60 ? "High Confidence" : confPct >= 35 ? "Moderate" : "Low Confidence";

  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a",
                  borderLeft: `3px solid ${confColor}`, borderRadius: 8,
                  padding: 16, marginBottom: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h4 style={{ margin: 0, color: "#4a9eff", fontSize: 15 }}>
          🪐 Planet Candidate #{index + 1}
          <span style={{ fontSize: 11, color: "#555", fontWeight: "normal", marginLeft: 10 }}>
            via {source}
          </span>
        </h4>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8,
                      background: "#111", border: `1px solid ${confColor}`,
                      borderRadius: 20, padding: "3px 12px" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: confColor }} />
          <span style={{ color: confColor, fontWeight: "bold", fontSize: 12 }}>
            {confPct}% — {confLabel}
          </span>
        </div>
      </div>

      {/* Key stats only */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
        {[
          ["Orbital Period",  planet.period?.toFixed(4),   "days"],
          ["Transit Depth",   planet.depth?.toExponential(2), ""],
          ["Duration",        planet.duration?.toFixed(4), "days"],
          ["# Transits",      planet.n_transits ?? (bls ? "—" : "—"), ""],
          ["Method",          bls ? `BLS (power ${planet.bls_power?.toFixed(1)})` : "Dip Search", ""],
          ["LSTM Score",      `${Math.round((planet.lstm_transit_prob ?? 0) * 100)}%`, ""],
        ].map(([label, val, unit]) => (
          <div key={label} style={{ background: "#111", borderRadius: 6, padding: "8px 10px" }}>
            <div style={{ fontSize: 10, color: "#555", marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 13, color: "#ddd", fontFamily: "monospace" }}>
              {val ?? "—"} <span style={{ fontSize: 11, color: "#666" }}>{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* LSTM score bar */}
      {planet.lstm_transit_prob !== undefined && (() => {
        const pct = Math.round(planet.lstm_transit_prob * 100);
        const c   = pct >= 60 ? "#4aff7f" : pct >= 35 ? "#f39c12" : "#e74c3c";
        return (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: "#666" }}>LSTM Transit Probability</span>
              <span style={{ fontSize: 11, color: c, fontWeight: "bold" }}>{pct}%</span>
            </div>
            <div style={{ background: "#222", borderRadius: 4, height: 6 }}>
              <div style={{ height: "100%", width: `${pct}%`, background: c,
                            borderRadius: 4, transition: "width 0.5s" }} />
            </div>
          </div>
        );
      })()}

      {/* Phase fold */}
      {lightCurve && typeof planet.period === "number" && typeof planet.t0 === "number" && (
        <div style={{ marginTop: 12 }}>
          <p style={{ color: "#666", fontSize: 11, margin: "0 0 6px 0" }}>Phase-Folded Light Curve</p>
          <PhaseFoldPlot data={lightCurve} period={planet.period} t0={planet.t0} planetIndex={index} />
        </div>
      )}
    </div>
  );
}

// ── Main TransitView ──────────────────────────────────────────────────────────
export default function TransitView() {
  const [results, setResults]           = useState(null);
  const [lightCurve, setLightCurve]     = useState(null);
  const [modelResults, setModelResults] = useState(null);
  const [loading, setLoading]           = useState(false);
  const [loadStep, setLoadStep]         = useState("");
  const [error, setError]               = useState(null);
  const [showCircles, setShowCircles] = useState(true);
  const [dipSigma, setDipSigma] = useState(2.5);
  const [minPeriod, setMinPeriod] = useState(0.3);

  const STEPS = [
    "Parsing light curve file...",
    "Removing outliers (4σ clip)...",
    "Denoising flux (Savitzky-Golay)...",
    "Normalising flux...",
    "Running BLS transit search...",
    "Fine-tuning LSTM on this light curve...",
    "Computing LSTM transit probability...",
    "Scoring detection confidence...",
    "Preparing plots...",
  ];

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setLightCurve(null);

    // Cycle through steps while waiting (real steps come from pipeline timing)
    let stepIdx = 0;
    setLoadStep(STEPS[0]);
    const stepTimer = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, STEPS.length - 1);
      setLoadStep(STEPS[stepIdx]);
    }, 1400);

    try {
      const form = new FormData();
      form.append("file", file);

      const res  = await fetch(`${BACKEND_URL}/api/transit/detect`, { method: "POST", body: form });
      const json = await res.json();

      clearInterval(stepTimer);

      if (json.error) {
        setError({ title: "Detection Error", message: json.error });
        return;
      }
      if (!json.light_curve) {
        setError({ title: "Unexpected Response", message: "Backend returned no light curve data. Check that your file has TIME and PDCSAP_FLUX columns." });
        return;
      }

      setResults(json);
      setLightCurve(json.light_curve);
    } catch (err) {
      clearInterval(stepTimer);
      setError({
        title: "Connection Error",
        message: "Could not reach the backend. Make sure uvicorn is running on import.meta.env.VITE_API_URL.",
      });
    } finally {
      setLoading(false);
    }
  };

  const s = {
    page:  { padding: 24, fontFamily: "sans-serif", background: "#111", color: "#eee", minHeight: "100vh" },
    card:  { background: "#1e1e1e", borderRadius: 8, padding: 16, marginBottom: 16 },
    btn:   { padding: "6px 14px", borderRadius: 4, border: "none", cursor: "pointer", fontWeight: "bold", fontSize: 13 },
    row:   { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
    hr:    { border: "none", borderTop: "1px solid #333", margin: "20px 0" },
  };

  return (
    <div style={s.page}>
      <ErrorDialog error={error} onClose={() => setError(null)} />

      <h1 style={{ marginBottom: 6, fontSize: 22 }}>🌟 Transit Photometry — Exoplanet Detection</h1>
      <p style={{ color: "#666", fontSize: 13, marginBottom: 20 }}>
        Upload a TESS or Kepler light curve (.fits / .tbl / .csv). BLS detects transit signals; LSTM scores confidence.
      </p>

      {/* Detection Parameters
      <div style={{ ...s.card, marginBottom: 12 }}>
        <div style={{ ...s.row, alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <span style={{ fontSize: 13, color: "#aaa", fontWeight: "bold" }}>⚙️ Detection Parameters</span>
          <label style={{ fontSize: 12, color: "#888", display: "flex", alignItems: "center", gap: 8 }}>
            Dip Threshold (σ)
            <input type="range" min="1.5" max="4.0" step="0.1"
              value={dipSigma}
              onChange={e => setDipSigma(parseFloat(e.target.value))}
              style={{ width: 100 }} />
            <span style={{ color: "#4a9eff", fontFamily: "monospace", minWidth: 28 }}>{dipSigma.toFixed(1)}</span>
            <span style={{ color: "#555", fontSize: 11 }}>
              {dipSigma <= 2.0 ? "Very sensitive (more circles)" :
               dipSigma <= 2.8 ? "Balanced" : "Conservative (fewer circles)"}
            </span>
          </label>
          <label style={{ fontSize: 12, color: "#888", display: "flex", alignItems: "center", gap: 8 }}>
            Min Period (days)
            <input type="range" min="0.1" max="10" step="0.1"
              value={minPeriod}
              onChange={e => setMinPeriod(parseFloat(e.target.value))}
              style={{ width: 100 }} />
            <span style={{ color: "#4a9eff", fontFamily: "monospace", minWidth: 32 }}>{minPeriod.toFixed(1)}d</span>
          </label>
          <button onClick={() => { setDipSigma(2.5); setMinPeriod(0.3); }}
            style={{ ...s.btn, background: "#333", color: "#aaa", fontSize: 11 }}>
            Reset
          </button>
        </div>
      </div> */}

      {/* Upload */}
      <div style={s.card}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Upload Light Curve</h3>
        <p style={{ fontSize: 12, color: "#666", margin: "0 0 10px 0" }}>
          Accepted: TESS .tbl, Kepler/TESS .fits, or .csv with TIME + PDCSAP_FLUX columns
        </p>
        <label className="file-upload-button">
          Choose File
          <input type="file" accept=".fits,.fit,.tbl,.csv" onChange={handleUpload} style={{ display: 'none' }} />
        </label>
        {loading && <LoadingOverlay step={loadStep} />}
      </div>

      {/* Results */}
      {results && (
        <>
          {/* Summary banner */}
          <div style={{
            ...s.card,
            borderLeft: `4px solid ${results.num_planets > 0 ? "#4aff7f" : results.lstm_score > 0.4 ? "#f39c12" : "#555"}`
          }}>
            <div style={{ ...s.row, justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: "0 0 6px 0", fontSize: 16 }}>
                  {results.num_planets > 0
                    ? `✅ ${results.num_planets} Planet Candidate${results.num_planets > 1 ? "s" : ""} Detected`
                    : "🔍 No Backend Detection — Periodic Dips Shown on Chart"}
                </h3>
                <p style={{ margin: "0 0 4px 0", fontSize: 13, color: "#aaa" }}>
                  LSTM transit probability:{" "}
                  <b style={{ color: (results.lstm_score ?? 0) > 0.6 ? "#4aff7f" : (results.lstm_score ?? 0) > 0.35 ? "#f39c12" : "#aaa" }}>
                    {Math.round((results.lstm_score ?? 0) * 100)}%
                  </b>
                </p>
                {results.num_planets === 0 && (
                  <p style={{ margin: 0, fontSize: 12, color: "#666" }}>
                    The chart detects periodic dips using a 2-condition algorithm. Circles mark confirmed candidates.
                  </p>
                )}
              </div>
              <div style={{ fontSize: 12, color: "#555", textAlign: "right", lineHeight: 1.8 }}>
                {results.denoised && <div>✓ Savitzky-Golay denoised</div>}
                {results.outliers_removed && <div>✓ 4σ outliers removed</div>}
              </div>
            </div>
          </div>

          {/* Planet cards */}
          {results.planets?.length > 0 && results.planets.map((p, i) => (
            <PlanetCard key={i} planet={p} index={i} lightCurve={lightCurve} />
          ))}

          {/* Light curve */}
          <div style={s.card}>
            <div style={{ ...s.row, marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <h3 style={{ margin: 0 }}>Light Curve</h3>
              <button
                style={{ ...s.btn, background: showCircles ? "#4a9eff" : "#555", color: "#fff", fontSize: 12 }}
                onClick={() => setShowCircles(v => !v)}>
                {showCircles ? "Show Original" : "Show Detected"}
              </button>
            </div>
            <LightCurvePlot
              data={lightCurve}
              planets={results.planets ?? []}
              showCircles={showCircles}
              dipSigma={dipSigma}
              minPeriod={minPeriod}
            />
          </div>
        </>
      )}

      <div style={s.hr} />

      {/* ML Section */}
      <div style={s.card}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Generate ML Model from CSV</h3>
        <p style={{ fontSize: 12, color: "#666", margin: "0 0 10px 0" }}>
          Upload a Kepler KOI catalogue CSV with PC/FP labels to train the Random Forest classifier.
        </p>
        <UploadCSV setModelResults={setModelResults} />
      </div>

      {/* ML results */}
      {modelResults?.type === "unified" && (
        <div style={s.card}>
          <h3 style={{ marginTop: 0 }}>ML Model Results</h3>
          <p><strong>Message:</strong> {modelResults.message}</p>
          <p><strong>Accuracy:</strong> {modelResults.accuracy !== undefined
            ? (modelResults.accuracy * 100).toFixed(2) + "%" : "N/A"}</p>
          <p><strong>Features:</strong> {modelResults.features_used?.join(", ") ?? "N/A"}</p>

          {modelResults.confusion_matrix && (
            <table style={{ borderCollapse: "collapse", marginBottom: 12 }}>
              <thead>
                <tr>
                  <th style={{ padding: "6px 12px", background: "#333" }}></th>
                  <th style={{ padding: "6px 12px", background: "#333", color: "#e74c3c" }}>Pred: No Planet</th>
                  <th style={{ padding: "6px 12px", background: "#333", color: "#4aff7f" }}>Pred: Planet</th>
                </tr>
              </thead>
              <tbody>
                {modelResults.confusion_matrix.map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: "6px 12px", background: "#222", color: "#aaa", fontSize: 12 }}>
                      {i === 0 ? "Actual: No Planet" : "Actual: Planet"}
                    </td>
                    {row.map((val, j) => (
                      <td key={j} style={{ padding: "6px 12px", background: "#1a1a1a",
                                           textAlign: "center", fontFamily: "monospace",
                                           color: i === j ? "#4aff7f" : "#e74c3c" }}>{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <details>
            <summary style={{ cursor: "pointer", color: "#aaa", fontSize: 12 }}>Classification Report</summary>
            <pre style={{ fontSize: 11, color: "#aaa", background: "#111", padding: 12, borderRadius: 6, overflowX: "auto" }}>
              {modelResults.classification_report}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}