

import numpy as np
import torch
import torch.nn as nn


# ResBlock + EllipseDetectorCNN  


class _ResBlock(nn.Module):
    """Two-conv residual block with BatchNorm."""
    def __init__(self, ch):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(ch, ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(ch), nn.ReLU(inplace=True),
            nn.Conv2d(ch, ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(ch)
        )
        self.act = nn.ReLU(inplace=True)

    def forward(self, x):
        return self.act(x + self.net(x))


class EllipseDetectorCNN(nn.Module):
    """
    Lightweight ResNet-style CNN for circular/elliptical blob detection.

    Input : (B, 1, 64, 64)  — normalised SNR patch
    Outputs:
        conf    (B, 1)  — P(planet | patch)           sigmoid
        pos     (B, 2)  — (dx, dy) sub-pixel offset   tanh * patch_size/4
        ellipse (B, 3)  — (log_a, log_b, angle_rad)
        snr_est (B, 1)  — estimated peak SNR           relu
    """
    def __init__(self, patch_size=64, base_ch=32):
        super().__init__()
        self.patch_size = patch_size

        def stage(in_ch, out_ch):
            return nn.Sequential(
                nn.Conv2d(in_ch, out_ch, 3, padding=1, bias=False),
                nn.BatchNorm2d(out_ch), nn.ReLU(inplace=True),
                _ResBlock(out_ch),
                nn.MaxPool2d(2)
            )

        self.enc1 = stage(1,       base_ch)         # → B,32,32,32
        self.enc2 = stage(base_ch, base_ch * 2)     # → B,64,16,16
        self.enc3 = stage(base_ch * 2, base_ch * 4) # → B,128,8,8
        self.enc4 = stage(base_ch * 4, base_ch * 8) # → B,256,4,4

        feat = base_ch * 8  # 256

        self.gap = nn.AdaptiveAvgPool2d(1)  # → B,256,1,1

        self.shared = nn.Sequential(
            nn.Linear(feat, 256), nn.ReLU(inplace=True), nn.Dropout(0.3),
            nn.Linear(256, 128), nn.ReLU(inplace=True)
        )

        self.head_conf    = nn.Linear(128, 1)
        self.head_pos     = nn.Linear(128, 2)
        self.head_ellipse = nn.Linear(128, 3)   # log_a, log_b, angle
        self.head_snr     = nn.Linear(128, 1)

    def forward(self, x):
        x = self.enc1(x)
        x = self.enc2(x)
        x = self.enc3(x)
        x = self.enc4(x)
        x = self.gap(x).flatten(1)

        f = self.shared(x)

        conf    = torch.sigmoid(self.head_conf(f))
        pos     = torch.tanh(self.head_pos(f)) * (self.patch_size / 4)
        ellipse = self.head_ellipse(f)
        snr_est = torch.relu(self.head_snr(f))

        return conf, pos, ellipse, snr_est



# KalmanTracker  (Colab Cell 14)


class KalmanTracker:
    """2-D constant-velocity Kalman filter.  State: [x, y, vx, vy]."""
    def __init__(self, x, y, dt=1.0, process_noise=1.5, meas_noise=2.5):
        self.state = np.array([x, y, 0.0, 0.0], dtype=float)
        self.P     = np.eye(4) * 10.0
        self.F = np.array([[1, 0, dt, 0],
                           [0, 1, 0, dt],
                           [0, 0, 1,  0],
                           [0, 0, 0,  1]], dtype=float)
        self.H = np.array([[1, 0, 0, 0],
                           [0, 1, 0, 0]], dtype=float)
        self.Q = np.eye(4) * process_noise
        self.R = np.eye(2) * meas_noise

    def predict(self):
        self.state = self.F @ self.state
        self.P     = self.F @ self.P @ self.F.T + self.Q
        return self.state[:2].copy()

    def update(self, xy):
        z = np.asarray(xy, dtype=float)
        y = z - self.H @ self.state
        S = self.H @ self.P @ self.H.T + self.R
        K = self.P @ self.H.T @ np.linalg.inv(S)
        self.state = self.state + K @ y
        self.P     = (np.eye(4) - K @ self.H) @ self.P
        return self.state[:2].copy()



# Tracklet  (Colab Cell 14)


class Tracklet:
    """A candidate trajectory across multiple frames."""
    _next_id = 0

    def __init__(self, frame_idx, detection,
                 kalman_process=1.5, kalman_meas=2.5):
        self.id          = Tracklet._next_id;  Tracklet._next_id += 1
        self.frames      = [frame_idx]
        self.detections  = [detection]
        self.kalman      = KalmanTracker(
            detection['refined_x'], detection['refined_y'],
            process_noise=kalman_process, meas_noise=kalman_meas
        )
        self.missed      = 0
        self.active      = True
        self._last_pred  = np.array([detection['refined_x'],
                                     detection['refined_y']])

    @property
    def positions(self):
        return np.array([[d['refined_x'], d['refined_y']]
                         for d in self.detections])

    @property
    def duration(self):
        return len(self.frames)

    @property
    def mean_confidence(self):
        return float(np.mean([d['confidence'] for d in self.detections]))

    @property
    def mean_snr(self):
        return float(np.mean([d['snr'] for d in self.detections]))

    def predict(self):
        self._last_pred = self.kalman.predict()
        return self._last_pred

    def update(self, frame_idx, detection):
        self.frames.append(frame_idx)
        self.detections.append(detection)
        self.kalman.update([detection['refined_x'], detection['refined_y']])
        self.missed = 0

    def mark_missed(self):
        self.missed += 1

    def __repr__(self):
        return (f'Tracklet(id={self.id}, dur={self.duration}, '
                f'missed={self.missed}, conf={self.mean_confidence:.2f})')
    

    #changed made 