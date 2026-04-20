from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd
import numpy as np
import io
import os
import joblib

from app.transit.pipeline import run_transit_pipeline
from app.transit.preprocess import parse_uploaded_file

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report

router = APIRouter(tags=["Transit Detection"])

MODEL_PATH = "app/transit/transit_model.pkl"
model = None
FEATURE_COLS = None


@router.post("/detect")
async def detect_transit(file: UploadFile = File(...)):
    import tempfile
    from pathlib import Path

    contents = await file.read()
    suffix = Path(file.filename).suffix.lower()

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        df = parse_uploaded_file(tmp_path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        os.unlink(tmp_path)

    return run_transit_pipeline(df)


@router.post("/generate-model")
async def generate_model(file: UploadFile = File(...)):
    global model, FEATURE_COLS

    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents), comment="#", on_bad_lines="skip")

    for col in df.select_dtypes(include="object").columns:
        df[col] = df[col].astype(str).str.replace(r"<.*?>", "", regex=True)

    label_col = None
    for col in df.columns:
        if df[col].astype(str).str.contains("PC|FP").any():
            label_col = col
            break

    if label_col is None:
        return {"error": "No column containing PC / FP labels found"}

    df["label"] = df[label_col].map({"PC": 1, "FP": 0})
    df = df.dropna(subset=["label"])
    df["label"] = df["label"].astype(int)

    def parse_plusminus(val):
        if pd.isna(val): return np.nan
        val = str(val)
        if "±" in val: return float(val.split("±")[0])
        if "&plusmn;" in val: return float(val.split("&plusmn;")[0])
        try: return float(val)
        except: return np.nan

    for col in df.columns:
        if col != "label":
            df[col] = df[col].apply(parse_plusminus)

    df = df.fillna(df.mean(numeric_only=True))

    possible_features = ["pl_orbper", "pl_trandurh", "pl_trandep", "pl_rade", "st_rad"]
    FEATURE_COLS = [c for c in possible_features if c in df.columns]
    if not FEATURE_COLS:
        FEATURE_COLS = df.select_dtypes(include=np.number).columns[:5].tolist()

    X, y = df[FEATURE_COLS], df["label"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    os.makedirs("app/transit", exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    return {
        "message": "Model trained successfully",
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "features_used": FEATURE_COLS,
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        "classification_report": classification_report(y_test, y_pred),
    }


@router.post("/predict")
async def predict(file: UploadFile = File(...)):
    global model, FEATURE_COLS

    if model is None:
        if not os.path.exists(MODEL_PATH):
            return {"error": "Model not trained yet"}
        model = joblib.load(MODEL_PATH)

    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents), comment="#", on_bad_lines="skip")

    def parse_plusminus(val):
        if pd.isna(val): return np.nan
        val = str(val)
        if "±" in val: return float(val.split("±")[0])
        try: return float(val)
        except: return np.nan

    for col in df.columns:
        df[col] = df[col].apply(parse_plusminus)

    df = df.fillna(df.mean(numeric_only=True))

    if not FEATURE_COLS:
        return {"error": "Feature list missing. Train model first."}

    preds = model.predict(df[FEATURE_COLS])
    return {
        "total_samples": len(preds),
        "planet_candidates": int(np.sum(preds)),
        "false_positives": int(len(preds) - np.sum(preds)),
    }