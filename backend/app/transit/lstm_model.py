import numpy as np
import os
import json


SEQUENCE_LENGTH = 256   # number of flux points fed to LSTM
MODEL_PATH = os.path.join(os.path.dirname(__file__), "lstm_weights.npz")


def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -50, 50)))


def tanh(x):
    return np.tanh(np.clip(x, -50, 50))


class LSTMTransitDetector:
    """
    Lightweight single-layer LSTM for transit detection.
    Input:  (seq_len, 1) normalized flux window
    Output: transit_probability (0–1), estimated period, depth, duration
    """

    def __init__(self, hidden=32):
        self.hidden = hidden
        self.trained = False
        self._init_weights()

    def _init_weights(self):
        h = self.hidden
        # LSTM gates: input, forget, cell, output — shape (input+hidden, hidden)
        scale = 0.1
        self.Wf = np.random.randn(1 + h, h) * scale
        self.Wi = np.random.randn(1 + h, h) * scale
        self.Wc = np.random.randn(1 + h, h) * scale
        self.Wo = np.random.randn(1 + h, h) * scale
        self.bf = np.ones(h) * 1.0   # forget gate bias=1 helps gradient flow
        self.bi = np.zeros(h)
        self.bc = np.zeros(h)
        self.bo = np.zeros(h)
        # Dense head: hidden -> [transit_prob, period_norm, depth_norm, duration_norm]
        self.Wd = np.random.randn(h, 4) * scale
        self.bd = np.zeros(4)

    def _lstm_forward(self, x_seq):
        """x_seq: (T, 1) array"""
        h = np.zeros(self.hidden)
        c = np.zeros(self.hidden)
        for t in range(len(x_seq)):
            xh = np.concatenate([x_seq[t], h])
            f  = sigmoid(xh @ self.Wf + self.bf)
            i  = sigmoid(xh @ self.Wi + self.bi)
            c_ = tanh(xh @ self.Wc + self.bc)
            o  = sigmoid(xh @ self.Wo + self.bo)
            c  = f * c + i * c_
            h  = o * tanh(c)
        return h

    def predict(self, flux_window):
        """
        flux_window: 1D numpy array of normalized flux values
        Returns dict with transit_prob, period_hint, depth_hint, duration_hint
        """
        # Resample to SEQUENCE_LENGTH
        x = np.interp(
            np.linspace(0, len(flux_window) - 1, SEQUENCE_LENGTH),
            np.arange(len(flux_window)),
            flux_window
        ).reshape(-1, 1).astype(np.float32)

        h = self._lstm_forward(x)
        out = h @ self.Wd + self.bd

        transit_prob   = float(sigmoid(out[0]))
        period_hint    = float(np.abs(out[1]) * 15 + 0.5)   # 0.5–15.5 days
        depth_hint     = float(np.abs(out[2]) * 0.02)        # 0–2%
        duration_hint  = float(np.abs(out[3]) * 0.1 + 0.01) # 0.01–0.11 days

        return {
            "transit_prob":  transit_prob,
            "period_hint":   period_hint,
            "depth_hint":    depth_hint,
            "duration_hint": duration_hint,
        }

    def train_on_lightcurve(self, time, flux, bls_results, epochs=40, lr=0.005):
        """
        Quick unsupervised fine-tuning on the uploaded light curve.
        Uses BLS detections as pseudo-labels to push transit_prob higher
        at known transit windows, lower elsewhere.
        """
        from scipy.signal import savgol_filter

        # Denoised flux for training
        if len(flux) > 101:
            flux_smooth = savgol_filter(flux, 101, 3)
        else:
            flux_smooth = flux.copy()

        flux_norm = flux_smooth / np.nanmedian(flux_smooth)

        losses = []
        for epoch in range(epochs):
            epoch_loss = 0.0
            np.random.seed(epoch)

            for result in bls_results:
                period = result["period"]
                t0     = result["t0"]
                dur    = result["duration"]

                # Extract in-transit window
                phase = ((time - t0) % period) / period
                phase[phase > 0.5] -= 1.0
                in_transit = np.abs(phase) < (dur / period * 2)

                if in_transit.sum() < 10:
                    continue

                # Positive window: in-transit flux
                win_idx = np.where(in_transit)[0]
                start   = max(0, win_idx[0] - 50)
                end     = min(len(flux_norm), win_idx[-1] + 50)
                window  = flux_norm[start:end]

                if len(window) < 20:
                    continue

                pred = self.predict(window)
                # Binary cross-entropy gradient for transit_prob -> 1
                prob = pred["transit_prob"]
                grad = prob - 1.0  # dL/d(logit) for target=1
                epoch_loss += -np.log(prob + 1e-9)

                # Simple gradient step on output layer
                x = np.interp(
                    np.linspace(0, len(window) - 1, SEQUENCE_LENGTH),
                    np.arange(len(window)), window
                ).reshape(-1, 1).astype(np.float32)
                h = self._lstm_forward(x)
                self.Wd[:, 0] -= lr * grad * h
                self.bd[0]    -= lr * grad

                # Negative window: out-of-transit flux
                out_idx  = np.where(~in_transit)[0]
                if len(out_idx) > 100:
                    sample = out_idx[np.random.choice(len(out_idx), 64, replace=False)]
                    neg_win = flux_norm[sample[0]:sample[0]+64]
                    if len(neg_win) > 20:
                        pred_neg = self.predict(neg_win)
                        prob_neg = pred_neg["transit_prob"]
                        grad_neg = prob_neg - 0.0
                        epoch_loss += -np.log(1 - prob_neg + 1e-9)
                        x_neg = np.interp(
                            np.linspace(0, len(neg_win)-1, SEQUENCE_LENGTH),
                            np.arange(len(neg_win)), neg_win
                        ).reshape(-1, 1).astype(np.float32)
                        h_neg = self._lstm_forward(x_neg)
                        self.Wd[:, 0] -= lr * grad_neg * h_neg
                        self.bd[0]    -= lr * grad_neg

            losses.append(epoch_loss)

        self.trained = True
        return losses

    def save(self, path=None):
        p = path or MODEL_PATH
        np.savez(p,
                 Wf=self.Wf, Wi=self.Wi, Wc=self.Wc, Wo=self.Wo,
                 bf=self.bf, bi=self.bi, bc=self.bc, bo=self.bo,
                 Wd=self.Wd, bd=self.bd)

    def load(self, path=None):
        p = path or MODEL_PATH
        if not os.path.exists(p):
            return False
        d = np.load(p)
        self.Wf = d["Wf"]; self.Wi = d["Wi"]
        self.Wc = d["Wc"]; self.Wo = d["Wo"]
        self.bf = d["bf"]; self.bi = d["bi"]
        self.bc = d["bc"]; self.bo = d["bo"]
        self.Wd = d["Wd"]; self.bd = d["bd"]
        self.trained = True
        return True


# Global singleton
_detector = None

def get_detector():
    global _detector
    if _detector is None:
        _detector = LSTMTransitDetector(hidden=32)
        _detector.load()
    return _detector