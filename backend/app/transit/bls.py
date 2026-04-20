import numpy as np
from astropy.timeseries import BoxLeastSquares

def run_bls(time, flux):
    """
    Run Box Least Squares transit search.
    Returns None if not enough data.
    """
    if len(time) < 50:
        return None  

    bls = BoxLeastSquares(time, flux)

    periods = np.linspace(0.5, 30.0, 3000)
    durations = np.linspace(0.01, 0.15, 20)

    result = bls.power(periods, durations)
    idx = np.argmax(result.power)

    return {
        "period":    float(result.period[idx]),
        "depth":     float(result.depth[idx]),
        "bls_power": float(result.power[idx]),
        "t0":        float(result.transit_time[idx]),
        "duration":  float(result.duration[idx])
    }
