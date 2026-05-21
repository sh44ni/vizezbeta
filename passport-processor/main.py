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

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.enhance import router as enhance_router

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
