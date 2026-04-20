import numpy as np
from scipy.signal import fftconvolve
from scipy.ndimage import median_filter
from scipy.optimize import linear_sum_assignment, minimize

from .models import Tracklet


def gaussian_psf(size=9, sigma=2.0):
    ax = np.linspace(-(size // 2), size // 2, size)
    xx, yy = np.meshgrid(ax, ax)
    psf = np.exp(-(xx**2 + yy**2) / (2 * sigma**2))
    return psf / psf.sum()


def background_subtract(image, filter_size=101):
    bkg = median_filter(image, size=filter_size)
    return image - bkg, bkg


def matched_filter_snr(image, psf):
    mf = fftconvolve(image, psf[::-1, ::-1], mode="same")
    background_mask = mf < np.percentile(mf, 90)
    sigma = np.std(mf[background_mask]) + 1e-6
    return mf / sigma


def likelihood_ratio(snr_map):
    mu = np.mean(snr_map)
    sigma = np.std(snr_map) + 1e-6
    lr = np.exp((snr_map - mu) / sigma)
    return lr / lr.max()


def mask_artifacts(clean):
    col_means = np.mean(clean, axis=0)
    row_means = np.mean(clean, axis=1)
    col_thresh = np.mean(col_means) + 3 * np.std(col_means)
    row_thresh = np.mean(row_means) + 3 * np.std(row_means)
    for col in np.where(col_means > col_thresh)[0]:
        clean[:, max(0, col - 3):col + 4] = 0
    for row in np.where(row_means > row_thresh)[0]:
        clean[max(0, row - 3):row + 4, :] = 0
    return clean


def detect_candidates(snr_map, xc, yc, pixscale=1.0,
                      snr_threshold=3.0, thresh_fraction=0.2,
                      min_sep_pix=45, circle_radius=30, edge_crop=10, top_n=5):
    h, w = snr_map.shape
    yy_g, xx_g = np.mgrid[0:h, 0:w]
    rho_map = np.hypot(xx_g - xc, yy_g - yc)
    thresh  = max(snr_threshold, thresh_fraction * float(np.max(snr_map)))
    cands   = np.argwhere(snr_map > thresh)
    margin  = edge_crop + 40

    raw = []
    for (y, x) in cands:
        rho = float(rho_map[y, x])
        if rho > min_sep_pix and x > margin and x < w - margin and y > margin and y < h - margin:
            raw.append({'x': int(x), 'y': int(y),
                        'snr': float(snr_map[y, x]),
                        'sep_pix': rho, 'sep_mas': rho * pixscale})

    raw = sorted(raw, key=lambda d: d['snr'], reverse=True)
    kept = []
    for c in raw:
        if not any(np.hypot(c['x'] - k['x'], c['y'] - k['y']) < circle_radius for k in kept):
            kept.append(c)
        if top_n > 0 and len(kept) >= top_n:
            break
    return kept


def extract_patch(image, cx, cy, size=64):
    h, w  = image.shape
    half  = size // 2
    patch = np.zeros((size, size), dtype=np.float32)
    y1, y2 = cy - half, cy + half
    x1, x2 = cx - half, cx + half
    iy1, iy2 = max(0, y1), min(h, y2)
    ix1, ix2 = max(0, x1), min(w, x2)
    py1 = iy1 - y1; py2 = py1 + (iy2 - iy1)
    px1 = ix1 - x1; px2 = px1 + (ix2 - ix1)
    patch[py1:py2, px1:px2] = image[iy1:iy2, ix1:ix2]
    mn, mx = patch.min(), patch.max()
    if mx - mn > 1e-8:
        patch = (patch - mn) / (mx - mn)
    return patch


# ═══════════════════════════════════════════════════════════════
# Synthetic patch generation v2  (Colab Cell 10)
# ═══════════════════════════════════════════════════════════════

def inject_elliptical_blob(patch, cx, cy, amp_min=3.0, amp_max=15.0):
    """Inject a rotated elliptical Gaussian into patch."""
    sz = patch.shape[0]
    yy, xx = np.mgrid[0:sz, 0:sz]

    a     = np.random.uniform(1.5, 4.0)
    b     = np.random.uniform(0.8, a)
    angle = np.random.uniform(0, np.pi)
    amp   = np.random.uniform(amp_min, amp_max)

    cos_a, sin_a = np.cos(angle), np.sin(angle)
    dx = (xx - cx) * cos_a + (yy - cy) * sin_a
    dy = -(xx - cx) * sin_a + (yy - cy) * cos_a

    blob = amp * np.exp(-0.5 * ((dx / a) ** 2 + (dy / b) ** 2))
    return (patch + blob.astype(np.float32)), a, b, angle


def generate_synthetic_patches_v2(snr_map, n_pos=1200, n_neg=1200,
                                  patch_size=64, min_sep=45, margin=80):
    """
    Generate labelled training patches from the SNR map.

    Returns
    -------
    X       : float32 (N, 1, P, P)
    y_conf  : float32 (N,)
    y_pos   : float32 (N, 2)
    y_ell   : float32 (N, 3)
    y_snr   : float32 (N,)
    """
    h, w   = snr_map.shape
    xc, yc = w // 2, h // 2
    yy_g, xx_g = np.mgrid[0:h, 0:w]

    pos_X, pos_pos, pos_ell, pos_snr = [], [], [], []
    neg_X = []
    half = patch_size // 2

    # ── Positives ────────────────────────────────────────────
    for _ in range(n_pos):
        attempts = 0
        while True:
            px = np.random.randint(margin, w - margin)
            py = np.random.randint(margin, h - margin)
            if np.hypot(px - xc, py - yc) > min_sep:
                break
            attempts += 1
            if attempts > 2000:
                px = np.random.randint(margin, w - margin)
                py = np.random.randint(margin, h - margin)
                break

        off_x = np.random.randint(-4, 5)
        off_y = np.random.randint(-4, 5)
        patch = extract_patch(snr_map, px, py, patch_size).copy()

        patch, a, b, angle = inject_elliptical_blob(patch, half + off_x, half + off_y)
        mn, mx = patch.min(), patch.max()
        if mx - mn > 1e-8:
            patch = (patch - mn) / (mx - mn)

        peak_snr = float(np.max(
            a * np.exp(-0.5 * ((off_x / a) ** 2 + (off_y / b) ** 2))
        ))

        pos_X.append(patch)
        pos_pos.append([float(off_x), float(off_y)])
        pos_ell.append([float(np.log(a + 1e-6)),
                        float(np.log(b + 1e-6)),
                        float(angle)])
        pos_snr.append(peak_snr)

    # ── Negatives: pure background ───────────────────────────
    bg_candidates = np.argwhere(
        (snr_map < np.percentile(snr_map, 40)) &
        (np.hypot(xx_g - xc, yy_g - yc) > min_sep)
    )
    np.random.shuffle(bg_candidates)

    for (py, px) in bg_candidates:
        if margin < px < w - margin and margin < py < h - margin:
            patch = extract_patch(snr_map, int(px), int(py), patch_size)
            neg_X.append(patch)
        if len(neg_X) >= n_neg // 3:
            break

    # ── Negatives: linear streak artifacts ───────────────────
    for _ in range(n_neg // 3):
        patch = np.zeros((patch_size, patch_size), dtype=np.float32)
        col   = np.random.randint(patch_size // 4, 3 * patch_size // 4)
        width = np.random.randint(1, 5)
        strength = np.random.uniform(0.2, 1.0)
        noise = np.random.normal(0, 0.05, patch.shape).astype(np.float32)
        patch[:, max(0, col - width):col + width + 1] = strength
        patch = np.clip(patch + noise, 0, None)
        mn, mx = patch.min(), patch.max()
        if mx - mn > 1e-8:
            patch = (patch - mn) / (mx - mn)
        neg_X.append(patch)

    # ── Negatives: hot pixels / cosmic rays ──────────────────
    for _ in range(n_neg // 3):
        patch = np.zeros((patch_size, patch_size), dtype=np.float32)
        for _ in range(np.random.randint(1, 5)):
            rx = np.random.randint(5, patch_size - 5)
            ry = np.random.randint(5, patch_size - 5)
            patch[ry, rx] = np.random.uniform(0.5, 1.0)
        noise = np.random.normal(0, 0.02, patch.shape).astype(np.float32)
        patch = np.clip(patch + noise, 0, None)
        mn, mx = patch.min(), patch.max()
        if mx - mn > 1e-8:
            patch = (patch - mn) / (mx - mn)
        neg_X.append(patch)

    # ── Combine ──────────────────────────────────────────────
    n_p = len(pos_X)
    n_n = len(neg_X)

    all_X  = np.array(pos_X + neg_X, dtype=np.float32)[:, None]
    y_conf = np.array([1.0] * n_p + [0.0] * n_n, dtype=np.float32)
    y_pos  = np.array(pos_pos + [[0.0, 0.0]] * n_n, dtype=np.float32)
    y_ell  = np.array(pos_ell + [[0.0, 0.0, 0.0]] * n_n, dtype=np.float32)
    y_snr  = np.array(pos_snr + [0.0] * n_n, dtype=np.float32)

    return all_X, y_conf, y_pos, y_ell, y_snr


# ═══════════════════════════════════════════════════════════════
# Hungarian Multi-Frame Tracker  (Colab Cell 15)
# ═══════════════════════════════════════════════════════════════

MAX_MATCH_DIST = 35
MAX_MISSED     = 6
MIN_CONF_INIT  = 0.35
MIN_TRACK_LEN  = 5
KALMAN_PROC    = 1.5
KALMAN_MEAS    = 2.5


def build_tracklets(all_frame_detections,
                    max_dist=MAX_MATCH_DIST,
                    max_missed=MAX_MISSED,
                    min_conf_init=MIN_CONF_INIT):
    """Hungarian algorithm multi-object tracker over all frames."""
    Tracklet._next_id = 0
    active   = []
    finished = []

    for frame_idx, detections in enumerate(all_frame_detections):
        for t in active:
            t.predict()

        if not detections:
            for t in active:
                t.mark_missed()
            finished += [t for t in active if t.missed > max_missed]
            active    = [t for t in active if t.missed <= max_missed]
            continue

        if not active:
            for d in detections:
                if d['confidence'] >= min_conf_init:
                    active.append(Tracklet(frame_idx, d, KALMAN_PROC, KALMAN_MEAS))
            continue

        n_tr  = len(active)
        n_det = len(detections)
        cost  = np.full((n_tr, n_det), fill_value=1e6)

        for i, t in enumerate(active):
            px, py = t._last_pred
            for j, d in enumerate(detections):
                dist = float(np.hypot(px - d['refined_x'], py - d['refined_y']))
                if dist < max_dist:
                    cost[i, j] = dist

        row_idx, col_idx = linear_sum_assignment(cost)
        assigned_tr  = set()
        assigned_det = set()

        for r, c in zip(row_idx, col_idx):
            if cost[r, c] < max_dist:
                active[r].update(frame_idx, detections[c])
                assigned_tr.add(r)
                assigned_det.add(c)

        for i, t in enumerate(active):
            if i not in assigned_tr:
                t.mark_missed()

        for j, d in enumerate(detections):
            if j not in assigned_det and d['confidence'] >= min_conf_init:
                active.append(Tracklet(frame_idx, d, KALMAN_PROC, KALMAN_MEAS))

        finished += [t for t in active if t.missed > max_missed]
        active    = [t for t in active if t.missed <= max_missed]

    finished += active
    return finished


# ═══════════════════════════════════════════════════════════════
# Keplerian Arc Fitter  (Colab Cell 16)
# ═══════════════════════════════════════════════════════════════

MIN_ARC_FRAMES   = 5
ARC_SCORE_THRESH = 0.45
W_RESID   = 0.35
W_PERSIST = 0.25
W_CNN     = 0.20
W_RSTAB   = 0.20


def _null_arc_result(tracklet):
    return {
        'r': 0.0, 'theta0': 0.0, 'omega': 0.0,
        'period_frames': float('inf'), 'residual_rms': float('inf'),
        'r_stability': 0.0, 'resid_score': 0.0,
        'persistence_score': 0.0, 'arc_score': 0.0
    }


def fit_keplerian_arc(tracklet, xc, yc, frame_times=None):
    """Fit a circular Keplerian orbit to a tracklet's positions."""
    positions = tracklet.positions
    frames    = np.array(tracklet.frames, dtype=float)

    if len(frames) < 2:
        return _null_arc_result(tracklet)

    t = (np.array([frame_times[int(f)] for f in frames])
         if frame_times is not None else frames)
    t = t - t[0]

    xs = positions[:, 0] - xc
    ys = positions[:, 1] - yc

    rs     = np.hypot(xs, ys)
    thetas = np.unwrap(np.arctan2(ys, xs))
    r0     = float(np.mean(rs))

    if len(t) >= 2:
        coeffs   = np.polyfit(t, thetas, 1)
        omega0   = float(coeffs[0])
        theta0_0 = float(coeffs[1])
    else:
        omega0   = 0.01
        theta0_0 = float(thetas[0])

    def loss(params):
        r_f, th0, om = params
        if r_f < 1e-3:
            return 1e9
        xp = r_f * np.cos(th0 + om * t)
        yp = r_f * np.sin(th0 + om * t)
        return float(np.sum((xs - xp) ** 2 + (ys - yp) ** 2))

    result = minimize(
        loss, x0=[r0, theta0_0, omega0],
        method='Nelder-Mead',
        options={'xatol': 0.05, 'fatol': 0.05, 'maxiter': 20000}
    )
    r_fit, theta0_fit, omega_fit = result.x

    xp = r_fit * np.cos(theta0_fit + omega_fit * t)
    yp = r_fit * np.sin(theta0_fit + omega_fit * t)
    residual_rms = float(np.sqrt(np.mean((xs - xp) ** 2 + (ys - yp) ** 2)))

    r_stability   = float(np.exp(-np.std(rs) / (r0 + 1e-6)))
    resid_score   = float(np.exp(-residual_rms / 6.0))
    persist_score = float(min(1.0, tracklet.duration / 15.0))
    conf_score    = float(tracklet.mean_confidence)

    arc_score = (W_RESID * resid_score + W_PERSIST * persist_score +
                 W_CNN * conf_score + W_RSTAB * r_stability)

    period = abs(2 * np.pi / omega_fit) if abs(omega_fit) > 1e-9 else float('inf')

    return {
        'r':                abs(r_fit),
        'theta0':           theta0_fit,
        'omega':            omega_fit,
        'period_frames':    period,
        'residual_rms':     residual_rms,
        'r_stability':      r_stability,
        'resid_score':      resid_score,
        'persistence_score': persist_score,
        'arc_score':        arc_score
    }


def merge_nearby_tracks(track_arcs, merge_radius=30):
    """Merge tracklets whose mean positions are within merge_radius pixels."""
    confirmed = [ta for ta in track_arcs if ta['arc_score'] >= ARC_SCORE_THRESH]
    merged = []
    used = set()

    for i, ta1 in enumerate(confirmed):
        if i in used:
            continue
        group = [ta1]
        pos1 = ta1['tracklet'].positions.mean(axis=0)

        for j, ta2 in enumerate(confirmed):
            if j <= i or j in used:
                continue
            pos2 = ta2['tracklet'].positions.mean(axis=0)
            if np.hypot(pos1[0] - pos2[0], pos1[1] - pos2[1]) < merge_radius:
                group.append(ta2)
                used.add(j)

        best = max(group, key=lambda x: x['arc_score'])
        merged.append(best)
        used.add(i)

    return merged


# ═══════════════════════════════════════════════════════════════
# Legacy helpers kept for backward compatibility
# ═══════════════════════════════════════════════════════════════

def to_polar(x, y, xc, yc):
    dx, dy = x - xc, y - yc
    return np.hypot(dx, dy), np.arctan2(dy, dx)