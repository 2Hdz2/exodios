
import numpy as np
from scipy.signal import savgol_filter
from .preprocess import normalize_flux
from .bls import run_bls
from .lstm_model import get_detector


def detect_periodic_dips(time, flux):
    """
    Pure-numpy periodic dip detection — mirrors the JS frontend logic exactly.
    Condition 1: flux drops below median - 2.5σ
    Condition 2: at least 2 dips share consistent spacing (= period candidate)
    """
    median = np.nanmedian(flux)
    std    = np.nanstd(flux)
    threshold = median - 2.5 * std

    local_dips = []
    for i in range(2, len(flux) - 2):
        f = flux[i]
        if (f < threshold and
                f <= flux[i-1] and f <= flux[i-2] and
                f <= flux[i+1] and f <= flux[i+2]):
            if not local_dips or i - local_dips[-1]["idx"] > 10:
                local_dips.append({"idx": i, "time": float(time[i]), "flux": float(f)})

    if len(local_dips) < 2:
        return []

    results, used = [], set()
    for a in range(len(local_dips)):
        if a in used: continue
        for b in range(a + 1, len(local_dips)):
            if b in used: continue
            candidate_period = local_dips[b]["time"] - local_dips[a]["time"]
            if candidate_period < 0.3: continue
            group = [local_dips[a], local_dips[b]]
            for c in range(b + 1, len(local_dips)):
                spacing = local_dips[c]["time"] - group[-1]["time"]
                if abs(spacing - candidate_period) / candidate_period < 0.12:
                    group.append(local_dips[c])
            if len(group) >= 2:
                avg_depth = float(np.mean([median - d["flux"] for d in group]))
                results.append({
                    "period":     candidate_period,
                    "t0":         group[0]["time"],
                    "depth":      avg_depth,
                    "duration":   candidate_period * 0.05,
                    "n_transits": len(group),
                    "source":     "periodic_dip",
                    "bls_power":  0.0,
                })
                for item in group:
                    used.add(local_dips.index(item))
                break
    return results


def denoise_flux(flux):
    if len(flux) < 101:
        return flux.copy()
    return savgol_filter(flux, window_length=101, polyorder=3)


def remove_outliers(time, flux, sigma=4.0):
    median = np.nanmedian(flux)
    std    = np.nanstd(flux)
    mask   = np.abs(flux - median) < sigma * std
    return time[mask], flux[mask]


def run_transit_pipeline(df, max_planets=3):
    # 1. Extract & clean
    time     = df["TIME"].values.astype(float)
    raw_flux = df["PDCSAP_FLUX"].values.astype(float)
    mask     = np.isfinite(time) & np.isfinite(raw_flux)
    time     = time[mask]
    raw_flux = raw_flux[mask]

    if len(time) < 50:
        return {
            "num_planets": 0, "planets": [], "lstm_score": 0.0,
            "denoised": False, "outliers_removed": False,
            "light_curve": [], "denoised_curve": [],
            "message": f"Only {len(time)} valid points — need at least 50."
        }

    # 2. Outlier removal
    time, raw_flux = remove_outliers(time, raw_flux)

    # 3. Denoise + normalize
    flux_denoised = denoise_flux(raw_flux)
    flux_norm     = normalize_flux(flux_denoised)

    # 4a. BLS detection — threshold lowered from 8 → 5
    bls_detections = []
    residual_flux  = flux_norm.copy()
    for _ in range(max_planets):
        result = run_bls(time, residual_flux)
        if result["bls_power"] < 5.0:
            break
        result["source"] = "bls"
        bls_detections.append(result)
        phase      = ((time - result["t0"]) % result["period"]) / result["period"]
        in_transit = phase < (result["duration"] / result["period"])
        residual_flux[in_transit] = np.median(residual_flux)

    # 4b. Periodic dip detection (same 2-condition logic as JS frontend)
    dip_detections = detect_periodic_dips(time, flux_norm)

    # 4c. Merge: keep BLS first, add non-overlapping dip detections
    detections = list(bls_detections)
    for dip in dip_detections:
        if len(detections) >= max_planets:
            break
        overlap = any(
            abs(dip["period"] - b["period"]) / max(b["period"], 0.001) < 0.20
            for b in bls_detections
        )
        if not overlap:
            detections.append(dip)

    # 5. LSTM scoring
    detector = get_detector()
    if detections:
        detector.train_on_lightcurve(time, flux_norm, detections, epochs=30)

    for det in detections:
        period = det["period"]
        t0     = det["t0"]
        dur    = det.get("duration", period * 0.05)
        phase  = ((time - t0) % period) / period
        phase[phase > 0.5] -= 1.0
        in_transit = np.abs(phase) < (dur / period * 3)
        win_idx    = np.where(in_transit)[0]

        if len(win_idx) > 10:
            start  = max(0, win_idx[0] - 30)
            end    = min(len(flux_norm), win_idx[-1] + 30)
            lstm_pred = detector.predict(flux_norm[start:end])
        else:
            lstm_pred = detector.predict(flux_norm[:256])

        det["lstm_transit_prob"]    = lstm_pred["transit_prob"]
        det["lstm_period_hint"]     = lstm_pred["period_hint"]
        det["lstm_depth_hint"]      = lstm_pred["depth_hint"]
        det["lstm_duration_hint"]   = lstm_pred["duration_hint"]
        bls_pwr = det.get("bls_power") or 0.0
        det["detection_confidence"] = round(
            0.5 * min(bls_pwr / 20.0, 1.0) + 0.5 * lstm_pred["transit_prob"], 4
        )

    lstm_score = (
        detections[0]["lstm_transit_prob"] if detections
        else float(detector.predict(flux_norm[:512] if len(flux_norm) > 512 else flux_norm)["transit_prob"])
    )

    # Denoised curve — safe alignment
    n = len(time)
    fd_aligned = flux_denoised[:n] if len(flux_denoised) >= n else flux_denoised
    denoised_curve = [
        {"time": float(time[i]), "flux": float(fd_aligned[i])}
        for i in range(min(n, len(fd_aligned)))
    ]

    return {
        "num_planets":      len(detections),
        "planets":          detections,
        "lstm_score":       lstm_score,
        "denoised":         True,
        "outliers_removed": True,
        "light_curve":  [{"time": float(t), "flux": float(f)} for t, f in zip(time, raw_flux)],
        "denoised_curve": denoised_curve,
    }