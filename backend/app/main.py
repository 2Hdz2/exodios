
import os
from pathlib import Path
from uuid import uuid4
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import json
from app.api.hybrid_router import router as hybrid_router
from app.api.transit import router as transit_router
from .pipeline import run_pipeline, generate_raw_preview
from .jobs import JOBS

BASE_DIR   = Path(__file__).resolve().parent.parent
DATA_DIR   = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
OUTPUT_DIR = DATA_DIR / "outputs"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Exoplanet Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # "https://exoplanet-detection-sp06.onrender.com",
        "https://exodios.onrender.com/",
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transit_router, prefix="/api/transit")
app.include_router(hybrid_router, prefix="/api/hybrid")
app.mount("/outputs", StaticFiles(directory=str(OUTPUT_DIR)), name="outputs")


@app.get("/status/{job_id}")
def status(job_id: str):
    return JOBS.get(job_id, {})


@app.get("/download/{filename}")
def download(filename: str):
    path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(path):
        return {"error": "File not found"}
    return FileResponse(path, media_type="application/octet-stream", filename=filename)


@app.post("/show-raw")
async def show_raw(file: UploadFile = File(...)):
    path = os.path.join(UPLOAD_DIR, file.filename)
    with open(path, "wb") as out:
        out.write(await file.read())
    raw_png = generate_raw_preview(path)
    return {"raw_image": f"/outputs/{os.path.basename(raw_png)}"}


@app.post("/upload")
async def upload(
    files: list[UploadFile] = File(...),
    params: str = Form(default="{}")
):
    job_id = str(uuid4())
    parsed_params = json.loads(params)

    ALLOWED_EXTENSIONS = {".fits", ".fit", ".png", ".jpg", ".jpeg", ".tif", ".tiff"}

    paths = []
    for f in files:
        ext = Path(f.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            continue
        path = os.path.join(UPLOAD_DIR, f.filename)
        with open(path, "wb") as out:
            out.write(await f.read())
        paths.append(path)

    # # outputs, anim = run_pipeline(paths, parsed_params, job_id=job_id, JOBS=JOBS)
    # outputs, anim, all_tracks_summary = run_pipeline(paths, parsed_params, job_id=job_id, JOBS=JOBS)
    # # Keep only confirmed planets per frame
#     outputs, anim, all_tracks_summary, trajectory_png = run_pipeline(
#     files, params, job_id, JOBS
# )

    outputs, anim, all_tracks_summary, trajectory_png = run_pipeline(
        paths,
        parsed_params,
        job_id=job_id,
        JOBS=JOBS
    )

    for frame in outputs:
        frame["detections"] = frame.get("confirmed_detections", [])
        frame["cnn_results"] = frame.get("confirmed_detections", [])

    for d in outputs:
        d["raw_image"]      = f"/outputs/{d['raw_png']}"
        d["enhanced_image"] = f"/outputs/{d['enhanced_png']}"
        d["snr_image"]      = f"/outputs/{d['snr_png']}"
        d["lr_image"]       = f"/outputs/{d['lr_png']}"

    return {
        "job_id":      job_id,
        "detections":  outputs,
        "output_type": anim,
        "all_tracks_summary": all_tracks_summary,
        # "trajectory_image": f"/outputs/{trajectory_png}",
        "trajectory_image": trajectory_png,
        "image_width":  outputs[0].get("image_width", None),
        "image_height": outputs[0].get("image_height", None),
        "star_x":       outputs[0].get("xc", None),
        "star_y":       outputs[0].get("yc", None),
        "animations": {
            "raw":      f"/outputs/exoplanet_raw.{anim}",
            "enhanced": f"/outputs/exoplanet_enhanced.{anim}",
            "snr":      f"/outputs/exoplanet_snr.{anim}",
            "lr":       f"/outputs/exoplanet_lr.{anim}",
        },
        "zips": {
            "raw":      "/outputs/exoplanet_raw.zip",
            "enhanced": "/outputs/exoplanet_enhanced.zip",
            "snr":      "/outputs/exoplanet_snr.zip",
            "lr":       "/outputs/exoplanet_lr.zip",
        }
    }


@app.delete("/model")
def delete_model():
    from app.direct.trainer import MODEL_PATH
    if MODEL_PATH.exists():
        MODEL_PATH.unlink()
        return {"message": "Model deleted — will retrain on next upload"}
    return {"message": "No saved model found"}