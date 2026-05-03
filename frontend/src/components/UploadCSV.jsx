

import { useState } from "react";

export default function UploadCSV({ setModelResults }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

    // const res = await fetch("http://localhost:8000/api/transit/generate-model", {
    //   method: "POST",
    //   body: formData,
    // });

      const res = await fetch("https://exodios-backend.onrender.com/api/transit/generate-model", {
      method: "POST",
      body: formData,
    });

    //   const res = await fetch("https://exo-hybrid-detection-backend.onrender.com/api/transit/generate-model", {
    //   method: "POST",
    //   body: formData,
    // });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.detail || json.error || "Model training failed.");
      }

      setModelResults({
        type: "unified",
        message:                json.message              ?? "",
        accuracy:               Number(json.accuracy      ?? 0),
        features_used:          Array.isArray(json.features_used)      ? json.features_used      : [],
        confusion_matrix:       Array.isArray(json.confusion_matrix)   ? json.confusion_matrix   : [],
        classification_report:  json.classification_report             ?? "",
      });

    } catch (err) {
      setError(err.message || "CSV upload failed. Please check your file.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {/* ---------- FILE INPUT ---------- */}
      <label style={{
        display: "inline-block",
        padding: "10px 20px",
        background: loading ? "#aaa" : "#0d6efd",
        color: "#fff",
        borderRadius: 8,
        cursor: loading ? "not-allowed" : "pointer",
        fontWeight: 600,
        fontSize: 14,
        transition: "background 0.2s"
      }}>
        {loading ? "Training model…" : "Upload Labelled CSV (PC/FP)"}
        <input
          type="file"
          accept=".csv"
          onChange={handleUpload}
          disabled={loading}
          style={{ display: "none" }}
        />
      </label>

      {/* ---------- SPINNER ---------- */}
      {loading && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          marginTop: 14, color: "#555", fontSize: 14
        }}>
          <div style={{
            width: 20, height: 20, border: "3px solid #ddd",
            borderTop: "3px solid #0d6efd", borderRadius: "50%",
            animation: "spin 0.8s linear infinite"
          }} />
          Training Random Forest classifier…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ---------- ERROR POPUP ---------- */}
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
            <strong style={{ color: "#dc3545", fontSize: 15 }}>Training Error</strong>
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