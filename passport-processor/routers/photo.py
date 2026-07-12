# routers/photo.py
import base64
import uuid
import time
import logging

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

logger = logging.getLogger("vizez.photo_processor")
router = APIRouter()

# Lazy-load to save memory on boot
_photo_cropper = None

def _get_photo_cropper():
    global _photo_cropper
    if _photo_cropper is None:
        from services.photo_cropper import PhotoCropper
        _photo_cropper = PhotoCropper()
    return _photo_cropper


@router.post(
    "/crop-photo",
    summary="Crop photo intelligently to passport aspect ratio",
    response_description="Base64 JPEG of the cropped photo",
)
async def crop_photo(file: UploadFile = File(...)) -> JSONResponse:
    request_id = str(uuid.uuid4())[:8]
    start_time = time.perf_counter()

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Convert raw bytes to cv2 image
    import cv2
    import numpy as np
    
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image file.")

    # Crop the image using the PhotoCropper service
    try:
        cropped = _get_photo_cropper().crop(image)
    except Exception as exc:
        logger.error(f"[{request_id}] Photo cropping error: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal processing error: {exc}",
        ) from exc

    # Encode enhanced image to JPEG base64
    encode_params = [cv2.IMWRITE_JPEG_QUALITY, 95]
    success, buffer = cv2.imencode(".jpg", cropped, encode_params)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to encode cropped image.")

    b64_image = base64.b64encode(buffer).decode("utf-8")

    elapsed_ms = round((time.perf_counter() - start_time) * 1000)
    logger.info(f"[{request_id}] Photo crop done in {elapsed_ms}ms")

    return JSONResponse(
        content={
            "cropped_image": b64_image,
            "_request_id": request_id,
            "_processing_time_ms": elapsed_ms,
        },
        headers={
            "X-Request-ID": request_id,
            "X-Processing-Time-Ms": str(elapsed_ms),
        },
    )
