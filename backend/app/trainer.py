import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from pathlib import Path

from .models import EllipseDetectorCNN
from .utils import extract_patch, generate_synthetic_patches_v2

PATCH_SIZE = 64
EPOCHS_CNN = 90
MODEL_PATH = Path(__file__).resolve().parent / "cnn_model.pt"
device     = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# ═══════════════════════════════════════════════════════════════
# Dataset  
# ═══════════════════════════════════════════════════════════════

class EllipsePatchDataset(Dataset):
    def __init__(self, X, y_conf, y_pos, y_ell, y_snr, augment=True):
        self.X      = torch.tensor(X)
        self.y_conf = torch.tensor(y_conf)
        self.y_pos  = torch.tensor(y_pos)
        self.y_ell  = torch.tensor(y_ell)
        self.y_snr  = torch.tensor(y_snr)
        self.augment = augment

    def __len__(self):
        return len(self.y_conf)

    def __getitem__(self, i):
        x = self.X[i].clone()
        if self.augment:
            if torch.rand(1) > 0.5:
                x = torch.flip(x, dims=[2])
            if torch.rand(1) > 0.5:
                x = torch.flip(x, dims=[1])
            k = torch.randint(0, 4, (1,)).item()
            x = torch.rot90(x, k, dims=[1, 2])
            x = x + torch.randn_like(x) * 0.02
            x = torch.clamp(x, 0.0, 1.0)
        return x, self.y_conf[i], self.y_pos[i], self.y_ell[i], self.y_snr[i]


# ═══════════════════════════════════════════════════════════════
# Training loop  
# ═══════════════════════════════════════════════════════════════

# Loss weights (same as Colab)
W_POS = 0.05
W_ELL = 0.03
W_SNR = 0.02


def _train(snr_map, min_sep_pix, edge_crop, epochs):
    """Train EllipseDetectorCNN on synthetic patches from the given SNR map."""
    print("Generating synthetic training patches …")
    all_X, y_conf, y_pos, y_ell, y_snr = generate_synthetic_patches_v2(
        snr_map,
        n_pos=1200, n_neg=1200,
        patch_size=PATCH_SIZE,
        min_sep=min_sep_pix,
        margin=edge_crop + PATCH_SIZE // 2 + 10
    )
    print(f"Total patches: {len(y_conf)}")

    idx   = np.random.permutation(len(all_X))
    split = int(0.8 * len(idx))
    tr_idx, val_idx = idx[:split], idx[split:]

    tr_ds  = EllipsePatchDataset(all_X[tr_idx], y_conf[tr_idx], y_pos[tr_idx],
                                  y_ell[tr_idx], y_snr[tr_idx], augment=True)
    val_ds = EllipsePatchDataset(all_X[val_idx], y_conf[val_idx], y_pos[val_idx],
                                  y_ell[val_idx], y_snr[val_idx], augment=False)

    tr_dl  = DataLoader(tr_ds,  batch_size=32, shuffle=True,  num_workers=0)
    val_dl = DataLoader(val_ds, batch_size=32, shuffle=False, num_workers=0)
    print(f"Train: {len(tr_ds)}  |  Val: {len(val_ds)}")

    model     = EllipseDetectorCNN(patch_size=PATCH_SIZE).to(device)
    optimizer = optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-5)

    bce = nn.BCELoss()
    mse = nn.MSELoss()

    history = {"loss": [], "acc": [], "val_loss": [], "val_acc": []}

    for epoch in range(epochs):
        # ── Train ──────────────────────────────────────────────
        model.train()
        tl, tc, tt = 0.0, 0, 0

        for xb, yb_conf, yb_pos, yb_ell, yb_snr in tr_dl:
            xb      = xb.to(device)
            yb_conf = yb_conf.to(device)
            yb_pos  = yb_pos.to(device)
            yb_ell  = yb_ell.to(device)
            yb_snr  = yb_snr.to(device)

            conf_pred, pos_pred, ell_pred, snr_pred = model(xb)

            loss_conf = bce(conf_pred.squeeze(), yb_conf)
            pos_mask  = (yb_conf == 1)
            loss_pos  = (mse(pos_pred[pos_mask], yb_pos[pos_mask])
                         if pos_mask.any() else torch.tensor(0.0, device=device))
            loss_ell  = (mse(ell_pred[pos_mask], yb_ell[pos_mask])
                         if pos_mask.any() else torch.tensor(0.0, device=device))
            loss_snr  = (mse(snr_pred.squeeze()[pos_mask], yb_snr[pos_mask])
                         if pos_mask.any() else torch.tensor(0.0, device=device))

            loss = loss_conf + W_POS * loss_pos + W_ELL * loss_ell + W_SNR * loss_snr

            optimizer.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            tl += loss.item()
            tc += ((conf_pred.squeeze() > 0.5).float() == yb_conf).sum().item()
            tt += len(yb_conf)

        # ── Validate ───────────────────────────────────────────
        model.eval()
        vl, vc, vt = 0.0, 0, 0

        with torch.no_grad():
            for xb, yb_conf, yb_pos, yb_ell, yb_snr in val_dl:
                xb      = xb.to(device)
                yb_conf = yb_conf.to(device)
                yb_pos  = yb_pos.to(device)
                yb_ell  = yb_ell.to(device)
                yb_snr  = yb_snr.to(device)

                conf_pred, pos_pred, ell_pred, snr_pred = model(xb)

                loss_conf = bce(conf_pred.squeeze(), yb_conf)
                pos_mask  = (yb_conf == 1)
                loss_pos  = (mse(pos_pred[pos_mask], yb_pos[pos_mask])
                             if pos_mask.any() else torch.tensor(0.0, device=device))
                loss_ell  = (mse(ell_pred[pos_mask], yb_ell[pos_mask])
                             if pos_mask.any() else torch.tensor(0.0, device=device))
                loss_snr  = (mse(snr_pred.squeeze()[pos_mask], yb_snr[pos_mask])
                             if pos_mask.any() else torch.tensor(0.0, device=device))

                loss = loss_conf + W_POS * loss_pos + W_ELL * loss_ell + W_SNR * loss_snr

                vl += loss.item()
                vc += ((conf_pred.squeeze() > 0.5).float() == yb_conf).sum().item()
                vt += len(yb_conf)

        train_loss = tl / len(tr_dl)
        val_loss   = vl / len(val_dl)
        train_acc  = 100 * tc / tt
        val_acc    = 100 * vc / vt

        history["loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        history["acc"].append(train_acc)
        history["val_acc"].append(val_acc)

        scheduler.step()

        if (epoch + 1) % 10 == 0:
            lr = scheduler.get_last_lr()[0]
            print(f"Epoch {epoch+1:3d}/{epochs}  "
                  f"Loss:{train_loss:.4f}  Acc:{train_acc:.1f}%  "
                  f"Val Loss:{val_loss:.4f}  Val Acc:{val_acc:.1f}%  "
                  f"LR:{lr:.2e}")

    return model, history


# ═══════════════════════════════════════════════════════════════
# Model persistence 
# ═══════════════════════════════════════════════════════════════

def get_or_train_model(snr_map, min_sep_pix=45, edge_crop=10,
                       epochs=EPOCHS_CNN, force_retrain=False):
    """
    Load saved model if cnn_model.pt exists, otherwise train and save.
    Set force_retrain=True to always retrain.
    """
    if MODEL_PATH.exists() and not force_retrain:
        print(f"Loading saved CNN model from {MODEL_PATH}")
        model = EllipseDetectorCNN(patch_size=PATCH_SIZE).to(device)
        try:
            model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
            model.eval()
            return model, None  # no history when loading
        except RuntimeError as e:
            print(f"⚠ Saved model is incompatible (architecture changed): {e}")
            print("  Deleting stale cnn_model.pt and retraining …")
            MODEL_PATH.unlink()
            # fall through to training below

    print("Training new EllipseDetectorCNN …")
    model, history = _train(snr_map, min_sep_pix, edge_crop, epochs)
    torch.save(model.state_dict(), str(MODEL_PATH))
    print(f"Model saved to {MODEL_PATH}")
    return model, history


# ═══════════════════════════════════════════════════════════════
# CNN inference  
# ═══════════════════════════════════════════════════════════════

def classify_candidates(model, snr_map, detections, patch_size=PATCH_SIZE):
    """
    Classify each SNR candidate with the EllipseDetectorCNN.
    Returns list with confidence, label, refined position, and ellipse params.
    """
    model.eval()
    cnn_results = []

    with torch.no_grad():
        for d in detections:
            patch  = extract_patch(snr_map, d["x"], d["y"], patch_size)
            tensor = torch.tensor(patch[None, None], dtype=torch.float32).to(device)

            conf_p, pos_p, ell_p, snr_p = model(tensor)

            conf_val = float(conf_p.item())
            dx, dy   = pos_p.cpu().numpy()[0]
            log_a, log_b, angle = ell_p.cpu().numpy()[0]
            snr_est  = float(snr_p.item())

            a_est = float(np.exp(np.clip(log_a, -2, 3)))
            b_est = float(np.exp(np.clip(log_b, -2, 3)))

            refined_x = d["x"] + int(round(dx))
            refined_y = d["y"] + int(round(dy))
            label     = "PLANET" if conf_val > 0.5 else "NOISE"

            cnn_results.append({
                **d,
                "confidence": round(conf_val, 4),
                "label":      label,
                "refined_x":  refined_x,
                "refined_y":  refined_y,
                "a_est":      a_est,
                "b_est":      b_est,
                "angle_est":  float(angle),
                "snr_est":    snr_est,
            })

    return cnn_results