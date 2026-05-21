# services/processor.py
"""
Vizez Document Expert — Top-level Pipeline Orchestrator.

Production pipeline:
  1. Detect format (PDF vs image)
  2. Normalise to single BGR numpy array
  3. ★ Classify document type
  4. ★ Crop to document boundary (perspective correction)
  5. Score original quality (on cropped image)
  6. Enhance (adaptive parameters based on classification + quality)
  7. Score enhanced quality
  8. Return structured result dict with full metadata
"""

from __future__ import annotations

import cv2
import numpy as np

from services.format_detector     import FormatDetector
from services.pdf_converter       import PDFConverter
from services.document_cropper    import DocumentCropper
from services.document_classifier import DocumentClassifier
from services.enhancer            import PassportEnhancer
from services.quality             import QualityScorer


class PassportProcessor:
    def __init__(self) -> None:
        self.detector   = FormatDetector()
        self.converter  = PDFConverter()
        self.cropper    = DocumentCropper()
        self.classifier = DocumentClassifier()
        self.enhancer   = PassportEnhancer()
        self.scorer     = QualityScorer()

    def process(self, data: bytes) -> dict:
        """
        Process raw file bytes (PDF or image) through the full pipeline.

        Parameters
        ----------
        data:
            Raw bytes of the uploaded file.

        Returns
        -------
        dict
            ``image``              – enhanced BGR numpy array
            ``source_format``      – ``"pdf"`` or ``"image"``
            ``document_type``      – classified document type string
            ``classification``     – full classification metadata
            ``crop_applied``       – True if document was cropped/warped
            ``crop_metadata``      – cropping details
            ``original_quality``   – quality metrics before enhancement
            ``enhanced_quality``   – quality metrics after enhancement
            ``metadata``           – enhancement step metadata
            ``ready_for_extraction`` – True when enhanced image is passable

        Raises
        ------
        ValueError
            Propagated from FormatDetector (unsupported MIME) or
            PDFConverter (encrypted / corrupt PDF).
        """
        # ── 1. Detect format ──────────────────────────────────────────── #
        fmt = self.detector.detect(data)

        # ── 2. Normalise to BGR numpy array ───────────────────────────── #
        if fmt == "pdf":
            pages  = self.converter.to_images(data)
            if not pages:
                raise ValueError("PDF contained no renderable pages.")
            image  = self.converter.find_passport_page(pages)
            source = "pdf"
        else:
            arr   = np.frombuffer(data, dtype=np.uint8)
            image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if image is None:
                raise ValueError("Could not decode image data.")
            source = "image"

        # ── 3. Classify document type ─────────────────────────────────── #
        classification = self.classifier.classify(image)
        doc_type = classification.document_type.value

        # ── 4. Crop to document boundary ──────────────────────────────── #
        crop_result = self.cropper.crop(image)
        cropped_image = crop_result.image

        crop_metadata = {
            "was_cropped":    crop_result.was_cropped,
            "crop_method":    crop_result.crop_method,
            "crop_confidence": crop_result.confidence,
        }

        # ── 5. Score original (on cropped image) ─────────────────────── #
        original_quality = self.scorer.score(cropped_image)

        # ── 6. Enhance (adaptive based on doc type + quality) ─────────── #
        result   = self.enhancer.enhance(cropped_image, document_type=doc_type)
        enhanced = result["image"]

        # ── 7. Score enhanced ─────────────────────────────────────────── #
        enhanced_quality = self.scorer.score(enhanced)

        return {
            "image":                 enhanced,
            "source_format":         source,
            "document_type":         doc_type,
            "classification":        {
                "type":       doc_type,
                "confidence": classification.confidence,
                "signals":    classification.signals,
            },
            "crop_applied":          crop_result.was_cropped,
            "crop_metadata":         crop_metadata,
            "original_quality":      original_quality,
            "enhanced_quality":      enhanced_quality,
            "metadata":              result["metadata"],
            "ready_for_extraction":  enhanced_quality["passable"],
        }
