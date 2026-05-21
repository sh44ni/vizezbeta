# services/document_cropper.py
"""
Vizez Document Expert — Intelligent Document Cropper.

Detects document boundary within a raw scan/photo and applies a
four-point perspective transform to produce a flat, rectangular crop.

Handles:
  • Passport scans on scanner glass (white/black borders)
  • Phone photos on tables (angled perspective)
  • Already-cropped scans (no-op — returned as-is)
"""

from __future__ import annotations

import cv2
import numpy as np
from dataclasses import dataclass


@dataclass
class CropResult:
    """Result of document cropping."""
    image: np.ndarray
    was_cropped: bool
    crop_method: str          # "perspective" | "auto_trim" | "none"
    confidence: float         # 0.0–1.0
    original_corners: list | None


class DocumentCropper:
    MIN_AREA_RATIO: float = 0.15
    MAX_AREA_RATIO: float = 0.98
    MIN_ASPECT: float = 0.35
    MAX_ASPECT: float = 2.5
    APPROX_EPSILON_FACTOR: float = 0.02

    CANNY_PARAMS: list[tuple[int, int]] = [
        (30, 120), (50, 150), (75, 200), (20, 80),
    ]

    def crop(self, image: np.ndarray) -> CropResult:
        h, w = image.shape[:2]
        total_area = h * w

        best_quad = None
        best_score = -1.0

        for canny_lo, canny_hi in self.CANNY_PARAMS:
            quad, score = self._find_document_quad(
                image, canny_lo, canny_hi, total_area
            )
            if quad is not None and score > best_score:
                best_quad = quad
                best_score = score

        if best_quad is not None and best_score > 0.3:
            warped = self._four_point_transform(image, best_quad)
            warped = self._trim_thin_borders(warped)
            return CropResult(
                image=warped, was_cropped=True,
                crop_method="perspective",
                confidence=round(min(best_score, 1.0), 3),
                original_corners=best_quad.tolist(),
            )

        trimmed, did_trim = self._auto_trim(image)
        if did_trim:
            return CropResult(
                image=trimmed, was_cropped=True,
                crop_method="auto_trim", confidence=0.6,
                original_corners=None,
            )

        return CropResult(
            image=image, was_cropped=False,
            crop_method="none", confidence=1.0,
            original_corners=None,
        )

    # ── Quad detection ─────────────────────────────────────────────── #

    def _find_document_quad(
        self, image: np.ndarray, canny_lo: int, canny_hi: int,
        total_area: int,
    ) -> tuple[np.ndarray | None, float]:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, canny_lo, canny_hi)

        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        edges = cv2.dilate(edges, kernel, iterations=2)

        contours, _ = cv2.findContours(
            edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        if not contours:
            return None, 0.0

        contours = sorted(contours, key=cv2.contourArea, reverse=True)

        for contour in contours[:5]:
            area = cv2.contourArea(contour)
            area_ratio = area / total_area
            if area_ratio < self.MIN_AREA_RATIO or area_ratio > self.MAX_AREA_RATIO:
                continue

            perimeter = cv2.arcLength(contour, True)
            epsilon = self.APPROX_EPSILON_FACTOR * perimeter
            approx = cv2.approxPolyDP(contour, epsilon, True)

            if len(approx) != 4:
                approx = cv2.approxPolyDP(contour, epsilon * 1.5, True)
                if len(approx) != 4:
                    continue

            corners = approx.reshape(4, 2).astype(np.float32)
            if not self._is_valid_quad(corners, total_area):
                continue

            rect_score = self._rectangularity_score(corners)
            confidence = 0.4 * area_ratio + 0.6 * rect_score
            return corners, confidence

        return None, 0.0

    def _is_valid_quad(self, corners: np.ndarray, total_area: int) -> bool:
        quad_area = cv2.contourArea(corners)
        if quad_area < total_area * self.MIN_AREA_RATIO:
            return False

        ordered = self._order_corners(corners)
        w_top = np.linalg.norm(ordered[1] - ordered[0])
        w_bot = np.linalg.norm(ordered[2] - ordered[3])
        h_left = np.linalg.norm(ordered[3] - ordered[0])
        h_right = np.linalg.norm(ordered[2] - ordered[1])

        avg_w = (w_top + w_bot) / 2
        avg_h = (h_left + h_right) / 2
        if avg_h < 1 or avg_w < 1:
            return False

        aspect = avg_w / avg_h
        if aspect < self.MIN_ASPECT or aspect > self.MAX_ASPECT:
            return False

        w_ratio = min(w_top, w_bot) / max(w_top, w_bot) if max(w_top, w_bot) > 0 else 0
        h_ratio = min(h_left, h_right) / max(h_left, h_right) if max(h_left, h_right) > 0 else 0
        if w_ratio < 0.5 or h_ratio < 0.5:
            return False

        for i in range(4):
            p1 = ordered[i]
            p2 = ordered[(i + 1) % 4]
            p3 = ordered[(i + 2) % 4]
            v1, v2 = p1 - p2, p3 - p2
            cos_a = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-8)
            angle = np.degrees(np.arccos(np.clip(cos_a, -1, 1)))
            if angle < 50 or angle > 140:
                return False
        return True

    def _rectangularity_score(self, corners: np.ndarray) -> float:
        ordered = self._order_corners(corners)
        angles = []
        for i in range(4):
            p1 = ordered[i]
            p2 = ordered[(i + 1) % 4]
            p3 = ordered[(i + 2) % 4]
            v1, v2 = p1 - p2, p3 - p2
            cos_a = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-8)
            angles.append(np.degrees(np.arccos(np.clip(cos_a, -1, 1))))

        avg_dev = sum(abs(a - 90.0) for a in angles) / 4
        return max(0.0, 1.0 - avg_dev / 30.0)

    # ── Perspective transform ──────────────────────────────────────── #

    def _order_corners(self, pts: np.ndarray) -> np.ndarray:
        rect = np.zeros((4, 2), dtype=np.float32)
        s = pts.sum(axis=1)
        d = np.diff(pts, axis=1).ravel()
        rect[0] = pts[np.argmin(s)]   # top-left
        rect[2] = pts[np.argmax(s)]   # bottom-right
        rect[1] = pts[np.argmin(d)]   # top-right
        rect[3] = pts[np.argmax(d)]   # bottom-left
        return rect

    def _four_point_transform(self, image: np.ndarray, pts: np.ndarray) -> np.ndarray:
        rect = self._order_corners(pts)
        tl, tr, br, bl = rect

        max_width = int(max(np.linalg.norm(tr - tl), np.linalg.norm(br - bl)))
        max_height = int(max(np.linalg.norm(bl - tl), np.linalg.norm(br - tr)))
        max_width = max(100, min(max_width, 6000))
        max_height = max(100, min(max_height, 6000))

        dst = np.array([
            [0, 0], [max_width - 1, 0],
            [max_width - 1, max_height - 1], [0, max_height - 1],
        ], dtype=np.float32)

        M = cv2.getPerspectiveTransform(rect, dst)
        return cv2.warpPerspective(
            image, M, (max_width, max_height),
            flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE,
        )

    # ── Auto-trim fallback ─────────────────────────────────────────── #

    def _auto_trim(self, image: np.ndarray) -> tuple[np.ndarray, bool]:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        total_area = h * w

        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        coords = cv2.findNonZero(binary)
        if coords is None:
            coords = cv2.findNonZero(255 - binary)
            if coords is None:
                return image, False

        x, y, bw, bh = cv2.boundingRect(coords)
        margin = max(h, w) * 0.02
        if x < margin and y < margin and bw > w - 2 * margin and bh > h - 2 * margin:
            return image, False

        pad = int(max(h, w) * 0.005)
        x1, y1 = max(0, x - pad), max(0, y - pad)
        x2, y2 = min(w, x + bw + pad), min(h, y + bh + pad)
        trimmed = image[y1:y2, x1:x2]

        if trimmed.shape[0] * trimmed.shape[1] < total_area * 0.5:
            return image, False
        return trimmed, True

    def _trim_thin_borders(self, image: np.ndarray, max_border_px: int = 8) -> np.ndarray:
        h, w = image.shape[:2]
        if h < 50 or w < 50:
            return image

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        top = bottom = left = right = 0

        for row in range(min(max_border_px, h // 4)):
            if gray[row, :].std() < 15:
                top = row + 1
            else:
                break

        for row in range(min(max_border_px, h // 4)):
            if gray[h - 1 - row, :].std() < 15:
                bottom = row + 1
            else:
                break

        for col in range(min(max_border_px, w // 4)):
            if gray[:, col].std() < 15:
                left = col + 1
            else:
                break

        for col in range(min(max_border_px, w // 4)):
            if gray[:, w - 1 - col].std() < 15:
                right = col + 1
            else:
                break

        if top + bottom + left + right == 0:
            return image

        y1, y2 = top, h - bottom
        x1, x2 = left, w - right
        if y2 - y1 < 50 or x2 - x1 < 50:
            return image
        return image[y1:y2, x1:x2]
