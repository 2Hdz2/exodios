import os
import cv2
import imageio
import zipfile
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Circle
from astropy.io import fits
from pathlib import Path

from .utils import (
    gaussian_psf,
    background_subtract,
    matched_filter_snr,
    likelihood_ratio,
    mask_artifacts,
    detect_candidates,
    extract_patch,
    build_tracklets,
    fit_keplerian_arc,
    merge_nearby_tracks,
    _null_arc_result,
    ARC_SCORE_THRESH,
    MIN_ARC_FRAMES,
    MIN_TRACK_LEN,
)
from .trainer import get_or_train_model, classify_candidates

BASE_DIR   = Path(__file__).resolve().parent.parent
DATA_DIR   = BASE_DIR / "data"
OUTPUT_DIR = DATA_DIR / "outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def _set_step(JOBS, job_id, step):
    if JOBS is not None and job_id is not None:
        JOBS[job_id]["step"] = step


def _load_fits(fits_file):
    ext = Path(fits_file).suffix.lower()
    if ext in (".png", ".jpg", ".jpeg", ".tif", ".tiff"):
        import cv2 as _cv2
        img = _cv2.imread(str(fits_file), _cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise ValueError(f"Could not read image file: {fits_file}")
        return img.astype(float), {}
    with fits.open(fits_file) as hdul:
        data   = hdul[0].data if hdul[0].data is not None else hdul[1].data
        header = hdul[0].header if hdul[0].data is not None else hdul[1].header
    data = data.astype(float)
    if data.ndim == 3:
        data = data[0]
    elif data.ndim > 3:
        data = data[0, 0]
    return data, header


def generate_raw_preview(fits_file):
    data, _ = _load_fits(fits_file)
    raw_png = OUTPUT_DIR / os.path.basename(fits_file).replace(".fits", "_raw.png")
    fig, ax = plt.subplots(figsize=(5, 5))
    v1, v2 = np.percentile(data, [1, 99])
    ax.imshow(data, cmap="gray", origin="lower", vmin=v1, vmax=v2)
    ax.set_title(os.path.basename(fits_file), fontsize=8)
    ax.axis("off")
    plt.tight_layout()
    plt.savefig(raw_png, dpi=120)
    plt.close()
    return str(raw_png)

#generating trajectory png for frontend viewer

def generate_trajectory_png(track_arcs, valid_tracks, snr0, xc_ref, yc_ref, output_path):
    import numpy as np
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(10, 10))
    ax.set_facecolor('black')

    # Normalize SNR for display
    snr_disp = np.clip(snr0, -3, np.percentile(snr0, 99.5))
    snr_disp = (snr_disp - snr_disp.min()) / (snr_disp.max() - snr_disp.min() + 1e-9)

    ax.imshow(snr_disp, cmap='inferno', origin='lower', alpha=0.6)
    ax.plot(xc_ref, yc_ref, 'r+', ms=18, mew=2)

    for ta in track_arcs:
        t = ta['tracklet']
        pos = t.positions

        is_planet = ta['arc_score'] >= ARC_SCORE_THRESH

        color = 'lime' if is_planet else '#ff4444'
        alpha = 0.9 if is_planet else 0.35
        lw    = 2.0 if is_planet else 0.8

        ax.plot(pos[:, 0], pos[:, 1], '-o',
                color=color, lw=lw, ms=3, alpha=alpha)

        if is_planet:
        #     ax.text(pos[0, 0] + 5, pos[0, 1] + 5,
        #             f'T{t.id}', color='lime', fontsize=9, fontweight='bold')
            ax.text(
                pos[0, 0] + 6,
                pos[0, 1] + 6,
                f"T{t.id}",
                color="lime",
                fontsize=11,
                fontweight="bold",
                bbox=dict(
                    facecolor="black",
                    edgecolor="none",
                    alpha=0.6,
                    pad=2
                )
             )

    ax.set_title(
        'Tracklet Trajectories\n(green = confirmed planet, red = noise)',
        fontsize=13, fontweight='bold', color='white'
    )

    ax.axis('off')
    plt.tight_layout()

    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print("Saving trajectory to:", output_path)
    print("Track count:", len(track_arcs))

    return str(output_path)


# Per-frame detection + CNN classification  (Colab Cell 17 body)


def detect_exoplanets_from_snr(fits_file, params, cnn_model, JOBS=None, job_id=None):
    BKG_FILTER_SIZE = int(params.get("bkg_filter_size", 101))
    PSF_SIGMA       = float(params.get("psf_sigma", 2.0))
    PSF_SIZE        = int(params.get("psf_size", 9))
    SNR_THRESHOLD   = float(params.get("snr_threshold", 3.0))
    THRESH_FRACTION = float(params.get("thresh_fraction", 0.2))
    MIN_SEP_PIX     = int(params.get("min_sep_pix", 45))
    CIRCLE_RADIUS   = int(params.get("circle_radius", 30))
    CIRCLE_COLOR    = str(params.get("circle_color", "lime"))
    SNR_CMAP        = str(params.get("snr_cmap", "inferno"))
    EDGE_CROP       = int(params.get("edge_crop", 10))
    TOP_N           = int(params.get("top_n", 5))

    base = Path(fits_file).stem

    _set_step(JOBS, job_id, f"[{base}] Reading file...")
    data, hdr = _load_fits(fits_file)

    _set_step(JOBS, job_id, f"[{base}] Cropping border artifacts...")
    c    = EDGE_CROP
    data = data[c:-c, c:-c]
    xc   = data.shape[1] // 2
    yc   = data.shape[0] // 2
    pixscale = float(hdr.get("PIXSCALE", 1.0)) if hasattr(hdr, "get") else 1.0

    _set_step(JOBS, job_id, f"[{base}] Subtracting background noise...")
    clean, _ = background_subtract(data, filter_size=BKG_FILTER_SIZE)

    _set_step(JOBS, job_id, f"[{base}] Masking artifact columns & rows...")
    clean = mask_artifacts(clean)

    # Keep unmasked copy for enhanced display
    clean_display = clean.copy()

    _set_step(JOBS, job_id, f"[{base}] Masking coronagraph center...")
    yy_g, xx_g = np.mgrid[0:clean.shape[0], 0:clean.shape[1]]
    clean[np.hypot(xx_g - xc, yy_g - yc) < MIN_SEP_PIX] = 0

    _set_step(JOBS, job_id, f"[{base}] Enhancing image contrast...")
    vmin     = np.percentile(clean_display, 90)
    vmax     = np.percentile(clean_display, 99.9)
    enhanced = np.clip(clean_display, vmin, vmax)
    enhanced = (enhanced - vmin) / (vmax - vmin + 1e-12)

    _set_step(JOBS, job_id, f"[{base}] Building PSF kernel & running matched filter...")
    psf     = gaussian_psf(size=PSF_SIZE, sigma=PSF_SIGMA)
    snr_map = matched_filter_snr(clean, psf)

    _set_step(JOBS, job_id, f"[{base}] Computing likelihood ratio map...")
    lr_map = likelihood_ratio(snr_map)

    _set_step(JOBS, job_id, f"[{base}] Detecting planet candidates...")
    detections = detect_candidates(
        snr_map, xc, yc, pixscale=pixscale,
        snr_threshold=SNR_THRESHOLD,
        thresh_fraction=THRESH_FRACTION,
        min_sep_pix=MIN_SEP_PIX,
        circle_radius=CIRCLE_RADIUS,
        edge_crop=EDGE_CROP,
        top_n=TOP_N,
    )

    # ── CNN classification (exact Colab Cell 17 per-frame) ────
    _set_step(JOBS, job_id, f"[{base}] Classifying candidates with CNN...")
    cnn_results = classify_candidates(cnn_model, snr_map, detections)

    _set_step(JOBS, job_id, f"[{base}] Rendering output images...")

    # ── Raw PNG ───────────────────────────────────────────────
    raw_png = OUTPUT_DIR / f"{base}_raw.png"
    raw_data, _ = _load_fits(fits_file)
    fig, ax = plt.subplots(figsize=(5, 5))
    v1, v2 = np.percentile(raw_data, [1, 99])
    ax.imshow(raw_data, cmap="gray", origin="lower", vmin=v1, vmax=v2)
    ax.set_title(f"Raw — {base}", fontsize=8)
    ax.axis("off")
    plt.tight_layout()
    plt.savefig(raw_png, dpi=120, bbox_inches="tight")
    plt.close()

    # ── Enhanced PNG ──────────────────────────────────────────
    enhanced_png = OUTPUT_DIR / f"{base}_enhanced.png"
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.imshow(enhanced, cmap="gray", origin="lower")
    ax.set_title(f"Enhanced — {base}", fontsize=8)
    ax.axis("off")
    plt.tight_layout()
    plt.savefig(enhanced_png, dpi=120, bbox_inches="tight")
    plt.close()

    # ── SNR PNG — yellow dashed = raw, colored = CNN result ───
    snr_png = OUTPUT_DIR / f"{base}_snr.png"
    fig, ax = plt.subplots(figsize=(5, 5))
    snr_vmax = np.percentile(snr_map, 99.5)
    im = ax.imshow(snr_map, cmap=SNR_CMAP, origin="lower", vmin=-3, vmax=snr_vmax)
    ax.plot(xc, yc, "r+", markersize=10, markeredgewidth=2)
    for d in detections:
        ax.add_patch(Circle((d["x"], d["y"]), radius=CIRCLE_RADIUS,
                             edgecolor="yellow", facecolor="none",
                             lw=1.5, linestyle="--"))
    for r in cnn_results:
        color = CIRCLE_COLOR if r["confidence"] > 0.5 else "red"
        ax.add_patch(Circle((r["refined_x"], r["refined_y"]), radius=CIRCLE_RADIUS,
                             edgecolor=color, facecolor="none", lw=2))
        ax.text(r["refined_x"] + CIRCLE_RADIUS + 2, r["refined_y"],
                f"{r['confidence']:.2f} {r['label']}",
                color=color, fontsize=7, fontweight="bold")
    plt.colorbar(im, ax=ax, label="SNR")
    ax.set_title(f"SNR Map — {base}", fontsize=8)
    ax.axis("off")
    plt.tight_layout()
    plt.savefig(snr_png, dpi=120, bbox_inches="tight")
    plt.close()

    # ── LR PNG ───────────────────────────────────────────────
    lr_png = OUTPUT_DIR / f"{base}_lr.png"
    fig, ax = plt.subplots(figsize=(5, 5))
    im2 = ax.imshow(lr_map, cmap="viridis", origin="lower")
    for r in cnn_results:
        color = CIRCLE_COLOR if r["confidence"] > 0.5 else "red"
        ax.add_patch(Circle((r["refined_x"], r["refined_y"]), radius=CIRCLE_RADIUS,
                             edgecolor=color, facecolor="none", lw=1.5))
    plt.colorbar(im2, ax=ax, label="LR")
    ax.set_title(f"LR Map — {base}", fontsize=8)
    ax.axis("off")
    plt.tight_layout()
    plt.savefig(lr_png, dpi=120, bbox_inches="tight")
    plt.close()

    # ── FIX: image_width/height added here ───────────────────
    return {
        "raw_png":      str(raw_png),
        "enhanced_png": str(enhanced_png),
        "snr_png":      str(snr_png),
        "lr_png":       str(lr_png),
        "snr_map":      snr_map,
        "detections":   detections,
        "cnn_results":  cnn_results,
        "xc":           xc,
        "yc":           yc,
        "image_width":  data.shape[1],   # ← FIX 1
        "image_height": data.shape[0],   # ← FIX 1
    }


# ═══════════════════════════════════════════════════════════════
# Animation + ZIP helpers
# ═══════════════════════════════════════════════════════════════

def _make_gif_mp4(png_list, out_path, fps=3):
    frames_raw = [imageio.imread(p) for p in png_list if os.path.exists(p)]
    if not frames_raw:
        return
    h, w = frames_raw[0].shape[:2]
    frames = [cv2.resize(f, (w, h)) for f in frames_raw]
    imageio.mimsave(str(out_path), frames, fps=fps)


def _make_zip(png_list, zip_path):
    with zipfile.ZipFile(zip_path, "w") as zf:
        for p in png_list:
            if os.path.exists(p):
                zf.write(p, os.path.basename(p))


# ═══════════════════════════════════════════════════════════════
# Main entry point  
# ═══════════════════════════════════════════════════════════════

def run_pipeline(fits_files, params=None, job_id=None, JOBS=None):
    if params is None:
        params = {}

    fps  = int(params.get("animation_fps", 3))
    anim = "gif" if len(fits_files) <= 50 else "mp4"

    if JOBS is not None and job_id is not None:
        JOBS[job_id] = {"done": 0, "total": len(fits_files), "step": "Starting..."}

    # ── Step 0: Load or train CNN once, reuse for all frames ──
    _set_step(JOBS, job_id, "Loading or training CNN model...")
    first_data, first_hdr = _load_fits(fits_files[0])
    edge_crop   = int(params.get("edge_crop", 10))
    min_sep_pix = int(params.get("min_sep_pix", 45))
    c = edge_crop
    first_data = first_data[c:-c, c:-c]
    first_clean, _ = background_subtract(first_data)
    first_clean    = mask_artifacts(first_clean)
    yy_g, xx_g = np.mgrid[0:first_clean.shape[0], 0:first_clean.shape[1]]
    xc0 = first_clean.shape[1] // 2
    yc0 = first_clean.shape[0] // 2
    first_clean[np.hypot(xx_g - xc0, yy_g - yc0) < min_sep_pix] = 0
    first_psf     = gaussian_psf()
    first_snr_map = matched_filter_snr(first_clean, first_psf)

    force_retrain = bool(params.get("force_retrain", False))
    cnn_model, history = get_or_train_model(
        first_snr_map,
        min_sep_pix=min_sep_pix,
        edge_crop=edge_crop,
        force_retrain=force_retrain,
    )

    if history:
        final_val_acc = round(history["val_acc"][-1], 2)
        _set_step(JOBS, job_id, f"CNN trained — val acc: {final_val_acc:.1f}%")
    else:
        _set_step(JOBS, job_id, "CNN loaded from saved model")

    # ── Step 1: CNN inference on every frame  (Colab Cell 17) ─
    _set_step(JOBS, job_id, "STEP 1 — CNN inference on every frame")

    outputs              = []
    raw_pngs             = []
    enhanced_pngs        = []
    snr_pngs             = []
    lr_pngs              = []
    all_frame_detections = []
    all_snr_maps         = []
    all_frame_meta       = []

    for f in fits_files:
        result = detect_exoplanets_from_snr(
            f, params, cnn_model, JOBS=JOBS, job_id=job_id
        )
        raw_pngs.append(result["raw_png"])
        enhanced_pngs.append(result["enhanced_png"])
        snr_pngs.append(result["snr_png"])
        lr_pngs.append(result["lr_png"])

        all_frame_detections.append(result["cnn_results"])
        all_snr_maps.append(result["snr_map"])
        all_frame_meta.append({"xc": result["xc"], "yc": result["yc"]})

        outputs.append({
            "frame":        os.path.basename(f),
            "snr":          float(np.max(result["snr_map"])),
            "detections":   result["detections"],
            "cnn_results":  result["cnn_results"],
            "raw_png":      os.path.basename(result["raw_png"]),
            "enhanced_png": os.path.basename(result["enhanced_png"]),
            "snr_png":      os.path.basename(result["snr_png"]),
            "lr_png":       os.path.basename(result["lr_png"]),
            "image_width":  result["image_width"],   # ← FIX 1 (propagated)
            "image_height": result["image_height"],  # ← FIX 1 (propagated)
        })

        if JOBS is not None and job_id is not None:
            JOBS[job_id]["done"] += 1

    # ── Step 2: Build tracklets (Kalman + Hungarian) ──────────
    _set_step(JOBS, job_id, "STEP 2 — Building tracklets (Kalman + Hungarian)")
    all_tracks   = build_tracklets(all_frame_detections)
    valid_tracks = [t for t in all_tracks if t.duration >= MIN_TRACK_LEN]

    # ── Step 3: Keplerian arc fitting ─────────────────────────
    _set_step(JOBS, job_id, "STEP 3 — Keplerian arc fitting")
    xc_ref = all_frame_meta[0]["xc"]
    yc_ref = all_frame_meta[0]["yc"]

    track_arcs = []
    for t in valid_tracks:
        if t.duration < MIN_ARC_FRAMES:
            arc = _null_arc_result(t)
        else:
            arc = fit_keplerian_arc(t, xc_ref, yc_ref)
        track_arcs.append({"tracklet": t, **arc})

    circle_radius = int(params.get("circle_radius", 30))
    confirmed = merge_nearby_tracks(track_arcs, merge_radius=circle_radius)
    rejected  = [ta for ta in track_arcs if ta["arc_score"] < ARC_SCORE_THRESH]

    # ── Generate trajectory PNG (Colab-style) ───────────────────
    _set_step(JOBS, job_id, "Rendering trajectory image...")

    trajectory_png_path = OUTPUT_DIR / "exoplanet_trajectories.png"

    trajectory_png = generate_trajectory_png(
        track_arcs,
        valid_tracks,
        all_snr_maps[0],
        xc_ref,
        yc_ref,
        trajectory_png_path
    )

    # ── Attach confirmed detections per frame to outputs ──────
    for i, out in enumerate(outputs):
        frame_confirmed = []
        for ta in confirmed:
            t = ta["tracklet"]
            if i in t.frames:
                idx_f = t.frames.index(i)
                det   = t.detections[idx_f]
                frame_confirmed.append({
                    **det,
                    "track_id":  t.id,
                    "arc_score": ta["arc_score"],
                    "r_px":      ta["r"],
                })
        out["confirmed_detections"] = frame_confirmed
        out["tracking_summary"] = {
            "total_tracklets":   len(all_tracks),
            "valid_tracklets":   len(valid_tracks),
            "confirmed_planets": len(confirmed),
            "rejected_noise":    len(rejected),
        }

    # ── Build all_tracks_summary for frontend trajectory viewer ──
    all_tracks_summary = []
    for ta in track_arcs:
        t         = ta["tracklet"]
        positions = t.positions   # numpy (N, 2)
        all_tracks_summary.append({
            "track_id":     t.id,
            "duration":     t.duration,
            "confirmed":    ta["arc_score"] >= ARC_SCORE_THRESH,
            "arc_score":    round(float(ta["arc_score"]), 4),
            "r_px":         round(float(ta["r"]), 2),
            "residual_rms": round(float(ta["residual_rms"]), 3),
            "r_stability":  round(float(ta["r_stability"]), 3),
            "mean_conf":    round(float(t.mean_confidence), 3),
            "mean_snr":     round(float(t.mean_snr), 3),
            "omega":        round(float(ta["omega"]), 6),
            "theta0":       round(float(ta["theta0"]), 4),
            "frames":       t.frames,
            "positions":    [
                {"x": round(float(pos[0]), 1), "y": round(float(pos[1]), 1)}
                for pos in positions
            ],
        })

    # Sort: confirmed first, then by arc_score desc (matches Colab Cell 19)
    all_tracks_summary.sort(
        key=lambda x: (-int(x["confirmed"]), -x["arc_score"])
    )

    # ── GIF/MP4 + ZIP ─────────────────────────────────────────
    # ← FIX 2: orphaned lines removed from here
    _set_step(JOBS, job_id, "Building animations...")
    for label, pngs in [("raw", raw_pngs), ("enhanced", enhanced_pngs),
                         ("snr", snr_pngs), ("lr", lr_pngs)]:
        _make_gif_mp4(pngs, OUTPUT_DIR / f"exoplanet_{label}.{anim}", fps=fps)

    _set_step(JOBS, job_id, "Packaging ZIP downloads...")
    for label, pngs in [("raw", raw_pngs), ("enhanced", enhanced_pngs),
                         ("snr", snr_pngs), ("lr", lr_pngs)]:
        _make_zip(pngs, str(OUTPUT_DIR / f"exoplanet_{label}.zip"))

    _set_step(JOBS, job_id, "Done!")
    # return outputs, anim, all_tracks_summary
    return outputs, anim, all_tracks_summary, os.path.basename(trajectory_png)
    print("Trajectory PNG saved at:", trajectory_png)