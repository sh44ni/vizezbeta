# services/document_classifier.py
"""
Vizez Document Expert — Heuristic Document Type Classifier.

Classifies document images using pure OpenCV heuristics (no ML model):
  • PASSPORT_BIO  — MRZ zone + photo region + ID-3 aspect ratio
  • WORK_PERMIT   — No MRZ, typical A4 aspect, structured form layout
  • VISA_PAGE     — Stamps/stickers, different text layout
  • UNKNOWN       — fallback

Returns a DocumentType enum + confidence score so downstream
processing can apply document-specific enhancement parameters.
"""

from __future__ import annotations

import cv2
import numpy as np
from enum import Enum
from dataclasses import dataclass


class DocumentType(str, Enum):
    PASSPORT_BIO = "passport_bio"
    WORK_PERMIT = "work_permit"
    VISA_PAGE = "visa_page"
    ID_CARD = "id_card"
    UNKNOWN = "unknown"


@dataclass
class ClassificationResult:
    document_type: DocumentType
    confidence: float           # 0.0–1.0
    signals: dict               # debug info: what heuristics fired


class DocumentClassifier:
    """
    Classify a document image by type using computer vision heuristics.
    """

    def classify(self, image: np.ndarray) -> ClassificationResult:
        """
        Classify the document in *image* (BGR uint8).

        Returns ClassificationResult with type, confidence, and debug signals.
        """
        h, w = image.shape[:2]
        aspect = w / h if h > 0 else 1.0

        signals: dict = {}

        # ── Signal 1: MRZ detection ──────────────────────────────────── #
        mrz_score = self._mrz_score(image)
        signals["mrz_score"] = round(mrz_score, 3)

        # ── Signal 2: Aspect ratio category ──────────────────────────── #
        signals["aspect_ratio"] = round(aspect, 3)
        is_passport_aspect = (0.60 <= aspect <= 0.85) or (1.30 <= aspect <= 1.55)
        is_a4_aspect = (0.65 <= aspect <= 0.78) or (1.28 <= aspect <= 1.50)
        is_id_card_aspect = (1.40 <= aspect <= 1.75)
        signals["is_passport_aspect"] = is_passport_aspect
        signals["is_a4_aspect"] = is_a4_aspect

        # ── Signal 3: Photo region detection ─────────────────────────── #
        has_photo = self._detect_photo_region(image)
        signals["has_photo_region"] = has_photo

        # ── Signal 4: Text density analysis ──────────────────────────── #
        text_density = self._text_density(image)
        signals["text_density"] = round(text_density, 3)

        # ── Signal 5: Horizontal line density (forms) ────────────────── #
        hline_score = self._horizontal_line_score(image)
        signals["hline_score"] = round(hline_score, 3)

        # ── Signal 6: Color variety (stamps/visa stickers are colourful) #
        color_variety = self._color_variety(image)
        signals["color_variety"] = round(color_variety, 3)

        # ── Decision logic ───────────────────────────────────────────── #
        scores: dict[DocumentType, float] = {
            DocumentType.PASSPORT_BIO: 0.0,
            DocumentType.WORK_PERMIT: 0.0,
            DocumentType.VISA_PAGE: 0.0,
            DocumentType.ID_CARD: 0.0,
            DocumentType.UNKNOWN: 0.2,  # base score for fallback
        }

        # Passport bio page: strong MRZ + passport aspect + photo
        if mrz_score > 0.4:
            scores[DocumentType.PASSPORT_BIO] += 0.45
        if mrz_score > 0.2:
            scores[DocumentType.PASSPORT_BIO] += 0.15
        if is_passport_aspect:
            scores[DocumentType.PASSPORT_BIO] += 0.15
        if has_photo:
            scores[DocumentType.PASSPORT_BIO] += 0.15

        # Work permit: no MRZ, A4 aspect, high text density, form lines
        if mrz_score < 0.15:
            scores[DocumentType.WORK_PERMIT] += 0.10
        if is_a4_aspect:
            scores[DocumentType.WORK_PERMIT] += 0.15
        if text_density > 0.15:
            scores[DocumentType.WORK_PERMIT] += 0.20
        if hline_score > 0.3:
            scores[DocumentType.WORK_PERMIT] += 0.25

        # Visa page: moderate color variety, some stamps
        if color_variety > 0.4:
            scores[DocumentType.VISA_PAGE] += 0.25
        if mrz_score < 0.2 and color_variety > 0.3:
            scores[DocumentType.VISA_PAGE] += 0.15
        if not has_photo and color_variety > 0.3:
            scores[DocumentType.VISA_PAGE] += 0.10

        # ID card: small format with photo, possibly MRZ
        if is_id_card_aspect and has_photo:
            scores[DocumentType.ID_CARD] += 0.30
        if mrz_score > 0.2 and is_id_card_aspect:
            scores[DocumentType.ID_CARD] += 0.20

        # Pick the winner
        best_type = max(scores, key=scores.get)  # type: ignore
        best_score = scores[best_type]

        # Normalize confidence to 0–1
        confidence = min(1.0, best_score)

        signals["all_scores"] = {k.value: round(v, 3) for k, v in scores.items()}

        return ClassificationResult(
            document_type=best_type,
            confidence=round(confidence, 3),
            signals=signals,
        )

    # ── Heuristic helpers ──────────────────────────────────────────── #

    def _mrz_score(self, image: np.ndarray) -> float:
        """Detect MRZ-like zone in bottom 30% of the image."""
        h, w = image.shape[:2]
        mrz_strip = image[int(h * 0.70):, :]
        gray = cv2.cvtColor(mrz_strip, cv2.COLOR_BGR2GRAY)

        _, binary = cv2.threshold(
            gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
        )

        # Horizontal morphological closing to find long text runs
        kern_w = max(w // 8, 10)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kern_w, 3))
        closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

        fg_ratio = float(closed.sum()) / (closed.size * 255)

        # Horizontal gradient energy
        sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        grad_energy = float(np.abs(sobelx).mean()) / 255.0

        return min(1.0, fg_ratio * 3.0 + grad_energy * 2.0)

    def _detect_photo_region(self, image: np.ndarray) -> bool:
        """Check if there's a face-sized rectangular region in upper-left."""
        h, w = image.shape[:2]
        # Photo is typically in upper-left quadrant for passports
        roi = image[int(h * 0.05):int(h * 0.65), int(w * 0.02):int(w * 0.45)]

        if roi.size == 0:
            return False

        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = float(edges.sum()) / (edges.size * 255)

        # Photos have moderate edge density (more than blank, less than text)
        # Also check for skin-like color in HSV
        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        # Skin tone range (approximate)
        lower_skin = np.array([0, 20, 70], dtype=np.uint8)
        upper_skin = np.array([25, 255, 255], dtype=np.uint8)
        skin_mask = cv2.inRange(hsv, lower_skin, upper_skin)
        skin_ratio = float(skin_mask.sum()) / (skin_mask.size * 255)

        return edge_density > 0.03 and skin_ratio > 0.05

    def _text_density(self, image: np.ndarray) -> float:
        """Estimate the fraction of the image covered by text-like features."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(
            gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
        )

        # Small morphological opening to remove noise
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

        return float(cleaned.sum()) / (cleaned.size * 255)

    def _horizontal_line_score(self, image: np.ndarray) -> float:
        """Detect horizontal lines (common in form-based documents)."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)

        lines = cv2.HoughLinesP(
            edges, 1, np.pi / 180, threshold=80,
            minLineLength=image.shape[1] // 3, maxLineGap=20
        )

        if lines is None:
            return 0.0

        horizontal = 0
        for line in lines:
            x1, y1, x2, y2 = line[0]
            angle = abs(np.degrees(np.arctan2(y2 - y1, x2 - x1)))
            if angle < 10 or angle > 170:
                horizontal += 1

        # Normalize by image height (more lines per unit height = more form-like)
        return min(1.0, horizontal / max(image.shape[0] / 50, 1))

    def _color_variety(self, image: np.ndarray) -> float:
        """
        Measure color variety using HSV hue histogram.
        Stamps and visa stickers tend to be more colourful.
        """
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        # Only count pixels with decent saturation (ignore gray/white/black)
        mask = hsv[:, :, 1] > 40

        if mask.sum() < 100:
            return 0.0

        hue_values = hsv[:, :, 0][mask]
        hist, _ = np.histogram(hue_values, bins=18, range=(0, 180))
        hist_norm = hist / hist.sum()

        # Entropy-like measure: more spread = more colourful
        nonzero = hist_norm[hist_norm > 0]
        entropy = -np.sum(nonzero * np.log2(nonzero))

        # Normalize: max entropy for 18 bins = log2(18) ≈ 4.17
        return min(1.0, entropy / 4.17)
