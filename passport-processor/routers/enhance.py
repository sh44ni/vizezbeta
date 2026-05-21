# routers/enhance.py
"""
Vizez Document Expert — FastAPI router for document enhancement.

POST /enhance
  • Accepts any supported file type (PDF / JPG / PNG / WEBP / TIFF / BMP)
  • Returns the enhanced image as a base64-encoded JPEG alongside:
    - Document type classification
    - Crop metadata (was it cropped, method, confidence)
    - Before/after quality metrics
    - Enhancement step metadata
"""

from __future__ import annotations

import base64
import uuid
import time
import logging

import cv2
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from services.processor import PassportProcessor

logger = logging.getLogger("vizez.document_expert")
router = APIRouter()
processor = PassportProcessor()


@router.post(
    "/enhance",
    summary="Enhance a document image",
    response_description="Enhanced image (base64 JPEG) + quality metrics + classification",
)
async def enhance_passport(file: UploadFile = File(...)) -> JSONResponse:
    """
    Upload a document scan (PDF, JPEG, PNG, WEBP, TIFF, or BMP).

    The Vizez Document Expert will:
    1. Detect the format automatically.
    2. Convert to a normalised image (PDF pages rendered at 300 DPI).
    3. Classify the document type (passport, work permit, visa, etc.).
    4. Crop to document boundary with perspective correction.
    5. Score the original quality.
    6. Run the adaptive enhancement pipeline.
    7. Score the enhanced image.
    8. Return everything as a structured JSON response.
    """
    request_id = str(uuid.uuid4())[:8]
    start_time = time.perf_counter()

    # Read upload
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Enforce a generous but safe size limit (20 MB)
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="File too large. Maximum upload size is 20 MB.",
        )

    filename = file.filename or "unknown"
    logger.info(f"[{request_id}] Processing '{filename}' ({len(contents)} bytes)")

    # Run pipeline
    try:
        result = processor.process(contents)
    except ValueError as exc:
        logger.warning(f"[{request_id}] Validation error: {exc}")
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error(f"[{request_id}] Processing error: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal processing error: {exc}",
        ) from exc

    # Encode enhanced image to JPEG base64
    encode_params = [cv2.IMWRITE_JPEG_QUALITY, 95]
    success, buffer = cv2.imencode(".jpg", result["image"], encode_params)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to encode enhanced image.")

    b64_image = base64.b64encode(buffer).decode("utf-8")

    elapsed_ms = round((time.perf_counter() - start_time) * 1000)
    logger.info(
        f"[{request_id}] Done in {elapsed_ms}ms | "
        f"type={result['document_type']} | "
        f"cropped={result['crop_applied']} | "
        f"ready={result['ready_for_extraction']}"
    )

    # Sanitise numpy types → native Python types for JSON serialisation
    def _sanitise(obj):
        import numpy as np
        if isinstance(obj, dict):
            return {k: _sanitise(v) for k, v in obj.items()}
        if isinstance(obj, (list, tuple)):
            return [_sanitise(v) for v in obj]
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return obj

    response_content = _sanitise({
        "enhanced_image":        b64_image,
        "source_format":         result["source_format"],
        "document_type":         result["document_type"],
        "classification":        result["classification"],
        "crop_applied":          result["crop_applied"],
        "crop_metadata":         result["crop_metadata"],
        "original_quality":      result["original_quality"],
        "enhanced_quality":      result["enhanced_quality"],
        "enhancement_metadata":  result["metadata"],
        "ready_for_extraction":  result["ready_for_extraction"],
        "_request_id":           request_id,
        "_processing_time_ms":   elapsed_ms,
    })

    return JSONResponse(
        content=response_content,
        headers={
            "X-Request-ID": request_id,
            "X-Processing-Time-Ms": str(elapsed_ms),
        },
    )


@router.get("/health", summary="Health check")
async def health() -> dict:
    """Simple liveness probe."""
    return {
        "status": "ok",
        "service": "Vizez Document Expert",
        "version": "2.0.0",
    }
