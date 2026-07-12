# main.py
"""
Vizez Document Expert – FastAPI application entry point.

Production-grade intelligent document processing engine.
Handles passport scans, work permits, visa pages, and ID cards
with automatic cropping, classification, and adaptive enhancement.

Start locally:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000

Interactive docs:
    http://localhost:8000/docs
"""

import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers.enhance import router as enhance_router
from routers.photo import router as photo_router

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

app = FastAPI(
    title="Vizez Document Expert",
    description=(
        "Production-grade intelligent document processing engine. "
        "Accepts passport scans, work permits, visa pages, and ID cards "
        "in PDF, JPEG, PNG, WEBP, TIFF, or BMP format. "
        "Automatically detects the document type, crops to the document "
        "boundary with perspective correction, and applies an adaptive "
        "enhancement pipeline (white balance → deskew → denoise → "
        "brightness → CLAHE contrast → sharpening → upscale guard). "
        "Returns the enhanced image alongside document classification, "
        "crop metadata, and before/after quality metrics."
    ),
    version="2.0.0",
)

# Allow all origins in development; tighten in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(enhance_router, prefix="/api/v1", tags=["Document Expert"])
app.include_router(photo_router, prefix="/api/v1", tags=["Photo Processor"])

# ── Processor Secret Authentication ──
PROCESSOR_SECRET = os.environ.get("PROCESSOR_SECRET", "")

@app.middleware("http")
async def verify_processor_key(request: Request, call_next):
    """Reject unauthenticated requests to /api/v1/* endpoints."""
    if request.url.path.startswith("/api/v1"):
        if not PROCESSOR_SECRET:
            # No secret configured — allow (dev mode)
            return await call_next(request)
        token = request.headers.get("X-Processor-Key", "")
        if token != PROCESSOR_SECRET:
            return JSONResponse(
                status_code=401,
                content={"error": "Invalid or missing processor key"},
            )
    return await call_next(request)


@app.get("/", tags=["Root"])
async def root() -> dict:
    return {
        "service": "Vizez Document Expert",
        "version": "2.0.0",
        "docs":    "/docs",
        "capabilities": [
            "document_classification",
            "intelligent_cropping",
            "perspective_correction",
            "adaptive_enhancement",
            "quality_scoring",
        ],
    }


@app.get("/health", tags=["Health"])
async def health() -> dict:
    """Ultra-lightweight health probe — no heavy imports."""
    return {"status": "ok"}
