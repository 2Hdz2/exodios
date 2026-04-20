"""
train_lstm.py
=============
Train the LSTMTransitDetector on synthetic Kepler/TESS-style light curves.

Run once from backend/app/transit/:
    python train_lstm.py

Outputs:
    lstm_weights.npz       — loaded automatically by get_detector()
    lstm_training_log.json — epoch loss/accuracy curve
"""

import os, json, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from lstm_model import LSTMTransitDetector, SEQUENCE_LENGTH, sigmoid

np.random.seed(42)

N_POS      = 1200
N_NEG      = 1200
EPOCHS     = 80
LR         = 0.002
HIDDEN     = 32
T_BPTT     = 48
GRAD_CLIP  = 1.0
SAVE_PATH  = os.path.join(os.path.dirname(__file__), "lstm_weights.npz")
LOG_PATH   = os.path.join(os.path.dirname(__file__), "lstm_training_log.json")


# ── Synthetic data ────────────────────────────────────────────────────────────

def _ar1(n, sigma=0.001, tau=20):
    a = np.exp(-1.0 / tau)
    noise = np.zeros(n)
    eps   = np.random.randn(n) * sigma * np.sqrt(1 - a**2)
    for i in range(1, n):
        noise[i] = a * noise[i-1] + eps[i]
    return noise

def make_positive():
    t        = np.arange(SEQUENCE_LENGTH) * 0.02
    period   = np.random.uniform(0.5, 15.0)
    depth    = np.random.uniform(0.001, 0.02)
    duration = np.random.uniform(0.01, min(0.08, period * 0.08))
    t0       = np.random.uniform(0, period)
    flux     = np.ones(SEQUENCE_LENGTH)
    phase    = ((t - t0) % period) / period
    phase[phase > 0.5] -= 1.0
    flux[np.abs(phase) < (duration / period / 2)] -= depth
    flux += _ar1(SEQUENCE_LENGTH, sigma=np.random.uniform(3e-4, 2e-3))
    flux += np.random.randn(SEQUENCE_LENGTH) * 3e-4
    return (flux / np.nanmedian(flux)).astype(np.float32)

def make_negative():
    flux = np.ones(SEQUENCE_LENGTH)
    flux += _ar1(SEQUENCE_LENGTH, sigma=np.random.uniform(3e-4, 3e-3))
    if np.random.rand() < 0.6:
        t   = np.arange(SEQUENCE_LENGTH) * 0.02
        per = np.random.uniform(1.0, 25.0)
        flux += np.random.uniform(1e-3, 6e-3) * np.sin(2*np.pi*t/per)
    flux += np.random.randn(SEQUENCE_LENGTH) * 3e-4
    return (flux / np.nanmedian(flux)).astype(np.float32)

def build_dataset():
    X = [make_positive() for _ in range(N_POS)] + [make_negative() for _ in range(N_NEG)]
    y = [1]*N_POS + [0]*N_NEG
    idx = np.random.permutation(len(X))
    return [X[i] for i in idx], [y[i] for i in idx]


# ── BPTT forward ──────────────────────────────────────────────────────────────

def fwd(model, x_seq):
    h, c, states = np.zeros(model.hidden), np.zeros(model.hidden), []
    for t in range(len(x_seq)):
        xh = np.concatenate([x_seq[t], h])
        f  = sigmoid(xh @ model.Wf + model.bf)
        i  = sigmoid(xh @ model.Wi + model.bi)
        g  = np.tanh(np.clip(xh @ model.Wc + model.bc, -50, 50))
        o  = sigmoid(xh @ model.Wo + model.bo)
        c  = f*c + i*g;  h = o*np.tanh(np.clip(c,-50,50))
        states.append((xh, f, i, g, o, c.copy(), h.copy()))
    return h, states

def step(model, flux, label, lr):
    x = flux.reshape(-1, 1)
    h_final, states = fwd(model, x)
    out   = h_final @ model.Wd + model.bd
    prob  = float(sigmoid(out[0]))
    loss  = -(label*np.log(prob+1e-7) + (1-label)*np.log(1-prob+1e-7))
    dl    = prob - label
    model.Wd[:,0] -= lr * np.clip(dl * h_final, -GRAD_CLIP, GRAD_CLIP)
    model.bd[0]   -= lr * np.clip(dl, -GRAD_CLIP, GRAD_CLIP)
    d_h = dl * model.Wd[:,0];  d_c = np.zeros(model.hidden)
    for t in reversed(range(max(0, len(states)-T_BPTT), len(states))):
        xh,f,i,g,o,c,h = states[t]
        cp   = states[t-1][5] if t>0 else np.zeros(model.hidden)
        tc   = np.tanh(np.clip(c,-50,50))
        d_o  = d_h * tc * o*(1-o)
        d_c += d_h * o  * (1-tc**2)
        d_f  = d_c * cp * f*(1-f)
        d_i  = d_c * g  * i*(1-i)
        d_g  = d_c * i  * (1-g**2)
        for dg, W, b in [(d_f,model.Wf,model.bf),(d_i,model.Wi,model.bi),
                          (d_g,model.Wc,model.bc),(d_o,model.Wo,model.bo)]:
            W -= lr * np.clip(np.outer(xh,dg), -GRAD_CLIP, GRAD_CLIP)
            b -= lr * np.clip(dg, -GRAD_CLIP, GRAD_CLIP)
        d_h = np.clip(model.Wf[1:].T@d_f + model.Wi[1:].T@d_i +
                      model.Wc[1:].T@d_g + model.Wo[1:].T@d_o, -GRAD_CLIP, GRAD_CLIP)
        d_c = d_c * f
    return loss, prob


# ── Train ─────────────────────────────────────────────────────────────────────

def train():
    print("ExoSynergy LSTM Training")
    print(f"  {N_POS} positive + {N_NEG} negative synthetic light curves")
    X, y = build_dataset()
    n    = len(X)
    model = LSTMTransitDetector(hidden=HIDDEN)
    if model.load(SAVE_PATH): print("  Fine-tuning existing weights.")
    else:                      print("  Training from scratch.")
    log = {"epochs":[], "loss":[], "acc":[]}
    for epoch in range(EPOCHS):
        idx  = np.random.permutation(n)
        tloss, correct = 0.0, 0
        lr_t = LR * min(1.0, (epoch+1)/5) * (0.97**epoch)
        for j in idx:
            l, p = step(model, X[j], y[j], lr_t)
            tloss += l;  correct += int((p>=0.5)==y[j])
        al = tloss/n;  acc = correct/n*100
        log["epochs"].append(epoch+1)
        log["loss"].append(round(float(al),5))
        log["acc"].append(round(float(acc),2))
        if (epoch+1)%10==0 or epoch==0:
            print(f"  Epoch {epoch+1:3d}/{EPOCHS}  loss={al:.4f}  acc={acc:.1f}%")
    model.trained = True
    model.save(SAVE_PATH)
    with open(LOG_PATH,"w") as f: json.dump(log, f, indent=2)
    print(f"\n✓ Weights -> {SAVE_PATH}")
    print(f"✓ Log     -> {LOG_PATH}")
    print(f"✓ Final accuracy: {log['acc'][-1]:.1f}%")

if __name__ == "__main__":
    train()