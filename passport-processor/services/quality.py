# services/quality.py
"""
Image quality scoring for passport images.

Metrics computed:
  • blur_score      – Laplacian variance (higher = sharper)
  • brightness      – mean V channel in HSV (0–255)
  • contrast_score  – standard deviation of grayscale pixel values
  • mrz_confidence  – likelihood that a valid MRZ strip exists (0–1)
  • resolution_ok   – True if the long edge is >= 800 px
  • passable         – True when all primary metrics are within acceptable ranges

Thresholds are tuned for typical passport / travel-document scans.
"""

from __future__ import annotations

import cv2
import numpy as np


class QualityScorer:
    # --- Threshold constants ---
    BLUR_MIN: float = 80.0       # Laplacian variance; below = too blurry
    BRIGHTNESS_MIN: float = 60.0  # too dark
    BRIGHTNESS_MAX: float = 220.0  # too bright / washed-out
    CONTRAST_MIN: float = 30.0   # std-dev of grayscale
    MRZ_MIN: float = 0.25        # mrz_confidence floor
    MIN_LONG_EDGE: int = 800     # pixels

    def score(self, image: np.ndarray) -> dict:
        """
        Compute quality metrics for *image* (BGR, uint8).

        Returns
        -------
        dict
            Keys: ``blur_score``, ``brightness``, ``contrast_score``,
            ``mrz_confidence``, ``resolution_ok``, ``passable``,
            ``issues`` (list[str] – human-readable problems found).
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        hsv  = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

        blur       = self._blur_score(gray)
        brightness = self._brightness(hsv)
        contrast   = self._contrast_score(gray)
        mrz_conf   = self._mrz_confidence(gray)
        res_ok     = self._resolution_ok(image)

        issues: list[str] = []
        if blur < self.BLUR_MIN:
            issues.append(f"Image is too blurry (score={blur:.1f}, min={self.BLUR_MIN})")
        if brightness < self.BRIGHTNESS_MIN:
            issues.append(f"Image is too dark (brightness={brightness:.1f})")
        if brightness > self.BRIGHTNESS_MAX:
            issues.append(f"Image is overexposed (brightness={brightness:.1f})")
        if contrast < self.CONTRAST_MIN:
            issues.append(f"Low contrast (score={contrast:.1f}, min={self.CONTRAST_MIN})")
        if mrz_conf < self.MRZ_MIN:
            issues.append(f"MRZ zone not clearly detected (confidence={mrz_conf:.2f})")
        if not res_ok:
            h, w = image.shape[:2]
            issues.append(f"Resolution too low ({w}×{h}px, need ≥{self.MIN_LONG_EDGE}px on long edge)")

        passable = len(issues) == 0

        return {
            "blur_score":      round(blur, 2),
            "brightness":      round(brightness, 2),
            "contrast_score":  round(contrast, 2),
            "mrz_confidence":  round(mrz_conf, 3),
            "resolution_ok":   res_ok,
            "passable":        passable,
            "issues":          issues,
        }

    # ------------------------------------------------------------------ #
    #  Individual metrics                                                  #
    # ------------------------------------------------------------------ #

    def _blur_score(self, gray: np.ndarray) -> float:
        """Laplacian variance – a reliable no-reference blur estimator."""
        return float(cv2.Laplacian(gray, cv2.CV_64F).var())

    def _brightness(self, hsv: np.ndarray) -> float:
        """Mean of the Value channel in HSV (0–255)."""
        return float(hsv[:, :, 2].mean())

    def _contrast_score(self, gray: np.ndarray) -> float:
        """Standard deviation of grayscale pixel intensities."""
        return float(gray.std())

    def _mrz_confidence(self, gray: np.ndarray) -> float:
        """
        Estimate the probability that the bottom quarter of the image
        contains an MRZ zone.

        Approach:
          1. Isolate the bottom 25 % (typical MRZ location).
          2. Morphological closing with a wide horizontal kernel reveals
             long horizontal text runs.
          3. Measure the ratio of foreground pixels in that zone.
          4. Additionally check horizontal gradient energy – MRZ characters
             produce strong left-right edges.
        """
        h, w = gray.shape
        mrz_strip = gray[int(h * 0.72):, :]

        # Binarise
        _, binary = cv2.threshold(
            mrz_strip, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
        )

        # Horizontal morphological closing
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (w // 8, 3))
        closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

        # Foreground ratio in closed image
        fg_ratio = float(closed.sum()) / (closed.size * 255)

        # Horizontal gradient energy
        sobelx = cv2.Sobel(mrz_strip, cv2.CV_64F, 1, 0, ksize=3)
        grad_energy = float(np.abs(sobelx).mean()) / 255.0

        # Combine: weight fg_ratio and gradient energy
        confidence = min(1.0, fg_ratio * 3.0 + grad_energy * 2.0)
        return confidence

    def _resolution_ok(self, image: np.ndarray) -> bool:
        h, w = image.shape[:2]
        return max(h, w) >= self.MIN_LONG_EDGE
