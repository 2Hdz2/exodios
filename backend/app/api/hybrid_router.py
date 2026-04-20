# # """
# # hybrid.py
# # =========
# # FastAPI router that exposes POST /api/hybrid/detect

# # Accepts:
# #   - fits_files  : one or more .fits files  (optional — direct imaging arm)
# #   - lc_file     : one light curve file     (optional — transit arm)
# #   - params      : JSON string of detection parameters

# # At least one of fits_files or lc_file must be supplied.

# # Returns the unified hybrid result from run_hybrid_pipeline().
# # """

# # import os
# # import json
# # import tempfile
# # from pathlib import Path
# # from uuid import uuid4

# # from fastapi import APIRouter, UploadFile, File, Form, HTTPException

# # # Direct imaging arm
# # from app.api.pipeline import run_pipeline          # returns (outputs, anim_type)

# # # Transit arm
# # from app.transit.pipeline   import run_transit_pipeline
# # from app.transit.preprocess import parse_uploaded_file

# # # Fusion
# # from app.hybrid_pipeline import run_hybrid_pipeline

# # from app.jobs import JOBS   # shared job-state dict

# # router = APIRouter(tags=["Hybrid Detection"])

# # BASE_DIR   = Path(__file__).resolve().parent.parent.parent
# # UPLOAD_DIR = BASE_DIR / "data" / "uploads"
# # UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# # @router.post("/detect")
# # async def hybrid_detect(
# #     fits_files: list[UploadFile] = File(default=[]),
# #     lc_file:    UploadFile        = File(default=None),
# #     params:     str               = Form(default="{}"),
# # ):
# #     """
# #     Run the ExoSynergy hybrid detection framework.

# #     - Supply FITS files to run the direct imaging arm.
# #     - Supply a light curve file (.tbl / .fits / .csv) to run the transit arm.
# #     - Supply both to get cross-validated, fused candidates.
# #     """
# #     if not fits_files and lc_file is None:
# #         raise HTTPException(status_code=400, detail="Supply at least one FITS file or a light curve file.")

# #     parsed_params = json.loads(params)
# #     job_id        = str(uuid4())
# #     JOBS[job_id]  = {"step": "Starting hybrid pipeline…", "done": 0, "total": 0}

# #     direct_result  = None
# #     transit_result = None

# #     # ── Arm 1: Direct imaging ─────────────────────────────────────────────────
# #     if fits_files:
# #         JOBS[job_id]["step"] = "Running direct imaging arm…"
# #         saved_fits = []
# #         for uf in fits_files:
# #             dest = UPLOAD_DIR / uf.filename
# #             dest.write_bytes(await uf.read())
# #             saved_fits.append(str(dest))

# #         outputs, anim = run_pipeline(
# #             saved_fits, parsed_params, job_id=job_id, JOBS=JOBS
# #         )

# #         # Attach URL paths for the UI
# #         for d in outputs:
# #             d["raw_image"]      = f"/outputs/{d['raw_png']}"
# #             d["enhanced_image"] = f"/outputs/{d['enhanced_png']}"
# #             d["snr_image"]      = f"/outputs/{d['snr_png']}"
# #             d["lr_image"]       = f"/outputs/{d['lr_png']}"

# #         direct_result = {
# #             "detections":  outputs,
# #             "output_type": anim,
# #             "animations": {
# #                 k: f"/outputs/exoplanet_{k}.{anim}"
# #                 for k in ("raw", "enhanced", "snr", "lr")
# #             },
# #         }

# #     # ── Arm 2: Transit photometry ─────────────────────────────────────────────
# #     if lc_file is not None:
# #         JOBS[job_id]["step"] = "Running transit photometry arm…"
# #         suffix = Path(lc_file.filename).suffix.lower()
# #         with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
# #             tmp.write(await lc_file.read())
# #             tmp_path = tmp.name
# #         try:
# #             df             = parse_uploaded_file(tmp_path)
# #             transit_result = run_transit_pipeline(df)
# #         except ValueError as e:
# #             raise HTTPException(status_code=400, detail=f"Light curve parsing failed: {e}")
# #         finally:
# #             os.unlink(tmp_path)

# #     # ── Fusion ────────────────────────────────────────────────────────────────
# #     JOBS[job_id]["step"] = "Fusing results…"
# #     hybrid = run_hybrid_pipeline(direct_result, transit_result)

# #     JOBS[job_id]["step"] = "Done!"

# #     return {
# #         "job_id":         job_id,
# #         "hybrid":         hybrid,
# #         "direct_result":  direct_result,
# #         "transit_result": transit_result,
# #     }

# """
# hybrid_router.py
# ================
# FastAPI router that exposes POST /api/hybrid/detect

# Accepts:
#   - fits_files  : one or more .fits files  (optional — direct imaging arm)
#   - lc_file     : one light curve file     (optional — transit arm)
#   - params      : JSON string of detection parameters

# At least one of fits_files or lc_file must be supplied.
# """

# import os
# import json
# import tempfile
# from pathlib import Path
# from uuid import uuid4

# from fastapi import APIRouter, UploadFile, File, Form, HTTPException

# # Direct imaging arm — lives at app/pipeline.py (not app/api/pipeline.py)
# from app.pipeline import run_pipeline

# # Transit arm
# from app.transit.pipeline   import run_transit_pipeline
# from app.transit.preprocess import parse_uploaded_file

# # Fusion engine
# from app.hybrid_pipeline import run_hybrid_pipeline

# # Job state — lazy import to avoid circular imports with main.py
# def _get_jobs():
#     from app.main import JOBS
#     return JOBS

# router = APIRouter(tags=["Hybrid Detection"])

# BASE_DIR   = Path(__file__).resolve().parent.parent.parent
# UPLOAD_DIR = BASE_DIR / "data" / "uploads"
# UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# @router.post("/detect")
# async def hybrid_detect(
#     fits_files: list[UploadFile] = File(default=[]),
#     lc_file:    UploadFile        = File(default=None),
#     params:     str               = Form(default="{}"),
# ):
#     if not fits_files and lc_file is None:
#         raise HTTPException(
#             status_code=400,
#             detail="Supply at least one FITS file or a light curve file."
#         )

#     JOBS = _get_jobs()

#     parsed_params = json.loads(params)
#     job_id        = str(uuid4())
#     JOBS[job_id]  = {"step": "Starting hybrid pipeline…", "done": 0, "total": 0}

#     direct_result  = None
#     transit_result = None

#     # ── Arm 1: Direct imaging ─────────────────────────────────────────────────
#     if fits_files:
#         JOBS[job_id]["step"] = "Running direct imaging arm…"
#         saved_fits = []
#         for uf in fits_files:
#             dest = UPLOAD_DIR / uf.filename
#             dest.write_bytes(await uf.read())
#             saved_fits.append(str(dest))

#         outputs, anim = run_pipeline(
#             saved_fits, parsed_params, job_id=job_id, JOBS=JOBS
#         )

#         for d in outputs:
#             d["raw_image"]      = f"/outputs/{d['raw_png']}"
#             d["enhanced_image"] = f"/outputs/{d['enhanced_png']}"
#             d["snr_image"]      = f"/outputs/{d['snr_png']}"
#             d["lr_image"]       = f"/outputs/{d['lr_png']}"

#         direct_result = {
#             "detections":  outputs,
#             "output_type": anim,
#             "animations": {
#                 k: f"/outputs/exoplanet_{k}.{anim}"
#                 for k in ("raw", "enhanced", "snr", "lr")
#             },
#         }

#     # ── Arm 2: Transit photometry ─────────────────────────────────────────────
#     if lc_file is not None:
#         JOBS[job_id]["step"] = "Running transit photometry arm…"
#         suffix = Path(lc_file.filename).suffix.lower()
#         with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
#             tmp.write(await lc_file.read())
#             tmp_path = tmp.name
#         try:
#             df             = parse_uploaded_file(tmp_path)
#             transit_result = run_transit_pipeline(df)
#         except ValueError as e:
#             raise HTTPException(
#                 status_code=400,
#                 detail=f"Light curve parsing failed: {e}"
#             )
#         finally:
#             os.unlink(tmp_path)

#     # ── Fusion ────────────────────────────────────────────────────────────────
#     JOBS[job_id]["step"] = "Fusing results…"
#     hybrid = run_hybrid_pipeline(direct_result, transit_result)
#     JOBS[job_id]["step"] = "Done!"

#     return {
#         "job_id":         job_id,
#         "hybrid":         hybrid,
#         "direct_result":  direct_result,
#         "transit_result": transit_result,
#     }

"""
hybrid_router.py
================
FastAPI router that exposes POST /api/hybrid/detect

Accepts:
  - fits_files  : one or more .fits files  (optional — direct imaging arm)
  - lc_file     : one light curve file     (optional — transit arm)
  - params      : JSON string of detection parameters

At least one of fits_files or lc_file must be supplied.
"""

import os
import json
import tempfile
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

# Direct imaging arm — lives at app/pipeline.py (not app/api/pipeline.py)
from app.pipeline import run_pipeline

# Transit arm
from app.transit.pipeline   import run_transit_pipeline
from app.transit.preprocess import parse_uploaded_file

# Fusion engine
from app.hybrid_pipeline import run_hybrid_pipeline

# Job state — lazy import to avoid circular imports with main.py
def _get_jobs():
    from app.main import JOBS
    return JOBS

router = APIRouter(tags=["Hybrid Detection"])

BASE_DIR   = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/detect")
async def hybrid_detect(
    fits_files: list[UploadFile] = File(default=[]),
    lc_file:    UploadFile        = File(default=None),
    params:     str               = Form(default="{}"),
):
    if not fits_files and lc_file is None:
        raise HTTPException(
            status_code=400,
            detail="Supply at least one FITS file or a light curve file."
        )

    JOBS = _get_jobs()

    parsed_params = json.loads(params)
    job_id        = str(uuid4())
    JOBS[job_id]  = {"step": "Starting hybrid pipeline…", "done": 0, "total": 0}

    direct_result  = None
    transit_result = None

    # ── Arm 1: Direct imaging ─────────────────────────────────────────────────
    if fits_files:
        JOBS[job_id]["step"] = "Running direct imaging arm…"
        saved_fits = []
        for uf in fits_files:
            dest = UPLOAD_DIR / uf.filename
            dest.write_bytes(await uf.read())
            saved_fits.append(str(dest))

        outputs, anim = run_pipeline(
            saved_fits, parsed_params, job_id=job_id, JOBS=JOBS
        )

        for d in outputs:
            d["raw_image"]      = f"/outputs/{d['raw_png']}"
            d["enhanced_image"] = f"/outputs/{d['enhanced_png']}"
            d["snr_image"]      = f"/outputs/{d['snr_png']}"
            d["lr_image"]       = f"/outputs/{d['lr_png']}"

        direct_result = {
            "detections":  outputs,
            "output_type": anim,
            "animations": {
                k: f"/outputs/exoplanet_{k}.{anim}"
                for k in ("raw", "enhanced", "snr", "lr")
            },
        }

    # ── Arm 2: Transit photometry ─────────────────────────────────────────────
    if lc_file is not None:
        JOBS[job_id]["step"] = "Running transit photometry arm…"
        suffix = Path(lc_file.filename).suffix.lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await lc_file.read())
            tmp_path = tmp.name
        try:
            df             = parse_uploaded_file(tmp_path)
            transit_result = run_transit_pipeline(df)
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Light curve parsing failed: {e}"
            )
        finally:
            os.unlink(tmp_path)

    # ── Fusion ────────────────────────────────────────────────────────────────
    JOBS[job_id]["step"] = "Fusing results…"
    hybrid = run_hybrid_pipeline(direct_result, transit_result)
    JOBS[job_id]["step"] = "Done!"

    return {
        "job_id":         job_id,
        "hybrid":         hybrid,
        "direct_result":  direct_result,
        "transit_result": transit_result,
    }