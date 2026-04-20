import LightCurvePlot from "./LightCurvePlot";
import PhaseFoldPlot from "./PhaseFoldPlot";

export default function Results({ results, lightCurve, modelResults }) {
  const planets = Array.isArray(results?.planets) ? results.planets : [];

  return (
    <div style={{ marginTop: 20 }}>
      {/* ---------- Transit Detection ---------- */}
      {lightCurve && lightCurve.length >= 10 ? (
        <>
          {planets.length === 0 && results && (
            <p style={{ color: "gray" }}>
              No statistically significant transit detected.
            </p>
          )}

          {planets.map((p, i) => (
            <div key={i}>
              Period: {typeof p.period === "number" ? p.period.toFixed(3) : "—"} d |{" "}
              Depth: {typeof p.depth === "number" ? p.depth.toExponential(2) : "—"} |{" "}
              BLS Power: {typeof p.bls_power === "number" ? p.bls_power.toFixed(2) : "—"}
            </div>
          ))}

          <h3>Raw Light Curve</h3>
          <LightCurvePlot data={lightCurve} />

          {planets.length > 0 &&
            typeof planets[0].period === "number" &&
            typeof planets[0].t0 === "number" && (
              <>
                <h3>Phase-Folded Light Curve</h3>
                <PhaseFoldPlot
                  data={lightCurve}
                  period={planets[0].period}
                  t0={planets[0].t0}
                />
              </>
            )}

          {results?.transit_detected !== undefined && (
            <div style={{ marginTop: 20 }}>
              <h3>Transit Detection</h3>
              {results.transit_detected
                ? <p>Exoplanet detected! Period: {results.period} days</p>
                : <p>No exoplanet detected in this light curve.</p>
              }
            </div>
          )}
        </>
      ) : (
        <p>Waiting for valid light curve data…</p>
      )}

      {/* ---------- ML Model ---------- */}
      {modelResults?.type === "unified" && (
        <div style={{ marginTop: 20 }} className="ml-results">
          <h3>ML Model Training & Prediction</h3>
          <p><strong>Training Message:</strong> {modelResults?.message ?? "No message yet"}</p>
          <p><strong>Accuracy:</strong> {modelResults?.accuracy !== undefined ? (modelResults.accuracy*100).toFixed(2) + "%" : "N/A"}</p>
          <p><strong>Features Used:</strong> {modelResults?.features_used?.join(", ") ?? "N/A"}</p>
<p><strong>Confusion Matrix:</strong></p>
{modelResults?.confusion_matrix ? (
  <table className="confusion-matrix">
    <thead>
      <tr>
        <th></th>
        <th>Predicted No Planet</th>
        <th>Predicted Planet</th>
      </tr>
    </thead>
    <tbody>
      {modelResults.confusion_matrix.map((row, i) => (
        <tr key={i}>
          <th>{i === 0 ? "Actual No Planet" : "Actual Planet"}</th>
          {row.map((value, j) => (
            <td key={j}>{value}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
) : (
  <p>N/A</p>
)}

         {/* <pre>{JSON.stringify(modelResults?.confusion_matrix ?? {}, null, 2)}</pre> */}
          <p><strong>Classification Report:</strong></p>
          <pre>{modelResults?.classification_report ?? "N/A"}</pre>
          {/* <p>Total Samples: {modelResults?.total_samples ?? "N/A"}</p>
          <p>Planet Candidates: {modelResults?.planet_candidates ?? "N/A"}</p>
          <p>False Positives: {modelResults?.false_positives ?? "N/A"}</p> */}
          {/* <p>Predictions: [{modelResults?.predictions?.join(", ") ?? ""}]</p> */}
        </div>
      )}
    </div>
  );
}

