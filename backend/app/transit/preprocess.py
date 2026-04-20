import numpy as np
import pandas as pd
from scipy.signal import savgol_filter

def parse_uploaded_file(path: str) -> pd.DataFrame:
    """
    Auto-detect .csv or .tbl and return a DataFrame with TIME and PDCSAP_FLUX columns.
    """
    ext = path.lower().split(".")[-1]

    if ext == "tbl":
        # IPAC .tbl format — pipe-delimited header, whitespace-separated data
        rows = []
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("\\") or line.startswith("|"):
                    continue
                parts = line.split()
                if len(parts) >= 3:
                    try:
                        rows.append({"TIME": float(parts[1]), "PDCSAP_FLUX": float(parts[2])})
                    except ValueError:
                        continue
        df = pd.DataFrame(rows)

    elif ext == "csv":
        df = pd.read_csv(path, comment="#", on_bad_lines="skip")
        df.columns = df.columns.str.strip()

        # Map time column: prefer TIME, fall back to cadenceno, then index
        if "TIME" in df.columns:
            df = df.rename(columns={"TIME": "TIME"})
        elif "cadenceno" in df.columns:
            df = df.rename(columns={"cadenceno": "TIME"})
        else:
            df["TIME"] = np.arange(len(df))

        # Map flux column
        if "PDCSAP_FLUX" in df.columns:
            pass
        elif "flux" in df.columns:
            df = df.rename(columns={"flux": "PDCSAP_FLUX"})
        else:
            raise ValueError("No flux column found. Expected 'PDCSAP_FLUX' or 'flux'.")

    else:
        raise ValueError(f"Unsupported file type: .{ext}")

    df = df[["TIME", "PDCSAP_FLUX"]].dropna()
    df = df[np.isfinite(df["TIME"]) & np.isfinite(df["PDCSAP_FLUX"])]
    return df.reset_index(drop=True)


def normalize_flux(flux):
    return flux / np.nanmedian(flux)

def denoise_flux(flux):
    return savgol_filter(flux, window_length=101, polyorder=2)

def detrend_flux(time, flux):
    """Remove long-term stellar trend using Savitzky-Golay filter."""
    window = min(len(flux) - 1 if len(flux) % 2 == 0 else len(flux), 401)
    if window < 5:
        return flux
    if window % 2 == 0:
        window -= 1
    trend = savgol_filter(flux, window_length=window, polyorder=2)
    return flux / trend