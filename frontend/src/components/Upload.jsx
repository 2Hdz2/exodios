
import { useState } from "react";

export default function Upload({ setResults, setLightCurve, setRawLightCurve }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);

    const res = await fetch("http://localhost:8000/api/transit/detect", {
      method: "POST",
      body: form,
    });

    //   const res = await fetch("https://exo-hybrid-detection-backend.onrender.com/api/transit/detect", {
    //     method: "POST",
    //     body: form,
    // });

      const json = await res.json();

      if (!res.ok || !json.light_curve) {
        throw new Error(json.detail || json.error || "Backend returned an unexpected response.");
      }

      setResults(json);
      setLightCurve(json.light_curve);
      if (setRawLightCurve) setRawLightCurve(json.raw_light_curve ?? json.light_curve);

    } catch (err) {
      setError(err.message || "Upload failed. Please check your file and try again.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <label style={{
        display: "inline-block",
        padding: "10px 20px",
        background: loading ? "#aaa" : "#1a73e8",
        color: "#fff",
        borderRadius: 8,
        cursor: loading ? "not-allowed" : "pointer",
        fontWeight: 600,
        fontSize: 14,
      }}>
        {loading ? "Analysing…" : "Upload Light Curve (.csv / .tbl)"}
        <input
          type="file"
          accept=".csv,.tbl,.txt"
          onChange={upload}
          disabled={loading}
          style={{ display: "none" }}
        />
      </label>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, color: "#555", fontSize: 14 }}>
          <div style={{
            width: 20, height: 20, border: "3px solid #ddd",
            borderTop: "3px solid #1a73e8", borderRadius: "50%",
            animation: "spin 0.8s linear infinite"
          }} />
          Running BLS transit detection…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {error && (
        <div style={{
          position: "fixed", top: 30, left: "50%", transform: "translateX(-50%)",
          background: "#fff", border: "1px solid #f5c2c7",
          borderLeft: "5px solid #dc3545",
          borderRadius: 10, padding: "18px 24px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
          zIndex: 9999, maxWidth: 420, width: "90%",
          display: "flex", flexDirection: "column", gap: 10
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>⚠️</span>
            <strong style={{ color: "#dc3545", fontSize: 15 }}>Upload Error</strong>
          </div>
          <p style={{ margin: 0, color: "#444", fontSize: 14, lineHeight: 1.5 }}>{error}</p>
          <button
            onClick={() => setError(null)}
            style={{
              alignSelf: "flex-end", background: "#dc3545", color: "#fff",
              border: "none", borderRadius: 6, padding: "6px 16px",
              cursor: "pointer", fontSize: 13, fontWeight: 600
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
