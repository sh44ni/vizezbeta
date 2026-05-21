# services/enhancer.py
"""
Vizez Document Expert — Adaptive Enhancement Pipeline.

Steps (applied in order):
  1. White balance    – Gray World algorithm for colour neutrality
  2. Deskew           – correct rotational tilt using Hough lines
  3. Denoise          – adaptive NLM / bilateral (strength from noise estimate)
  4. Auto-brightness  – stretch histogram to fix washed-out / dark images
  5. Contrast         – CLAHE with adaptive clip limit
  6. Sharpen          – unsharp mask with strength based on blur score
  7. Upscale guard    – ensure minimum resolution for OCR / MRZ extraction

Enhancement parameters auto-tune based on measured image quality rather
than using fixed values, producing better results across scan quality tiers.
"""

from __future__ import annotations

import cv2
import numpy as np


class PassportEnhancer:
    # Minimum long-edge resolution for reliable MRZ reading
    MIN_LONG_EDGE: int = 1200

    def enhance(
        self,
        image: np.ndarray,
        document_type: str = "passport_bio",
    ) -> dict:
        """
        Run the full adaptive enhancement pipeline on a BGR image.

        Parameters
        ----------
        image:
            Input BGR numpy array (H × W × 3, uint8).
        document_type:
            Classification hint from DocumentClassifier. Adjusts
            sharpening and contrast aggressiveness.

        Returns
        -------
        dict with keys:
            ``"image"``    – enhanced BGR numpy array
            ``"metadata"`` – dict of applied steps and measured values
        """
        meta: dict = {}
        img = image.copy()

        # Measure noise level upfront to calibrate denoise strength
        noise_sigma = self._estimate_noise(img)
        meta["noise_sigma"] = round(noise_sigma, 2)

        # Measure initial blur to calibrate sharpen strength
        initial_blur = self._blur_score(img)
        meta["initial_blur_score"] = round(initial_blur, 2)

        # Measure initial contrast to calibrate CLAHE
        initial_contrast = self._contrast_score(img)
        meta["initial_contrast"] = round(initial_contrast, 2)

        # 1. White balance (Gray World)
        img = self._white_balance(img)
        meta["white_balance"] = "gray_world"

        # 2. Deskew
        img, angle = self._deskew(img)
        meta["deskew_angle_deg"] = round(angle, 2)

        # 3. Adaptive denoise
        denoise_h = self._calc_denoise_strength(noise_sigma)
        img = self._denoise(img, denoise_h)
        meta["denoise"] = f"nlm_h={denoise_h}"

        # 4. Auto-brightness / exposure correction
        img, brightness_delta = self._auto_brightness(img)
        meta["brightness_delta"] = round(brightness_delta, 2)

        # 5. Adaptive CLAHE contrast enhancement
        clip_limit = self._calc_clahe_clip(initial_contrast)
        img = self._clahe(img, clip_limit)
        meta["contrast"] = f"clahe_clip={clip_limit:.1f}"

        # 6. Adaptive unsharp mask sharpening
        sharpen_strength = self._calc_sharpen_strength(initial_blur, document_type)
        img = self._unsharp_mask(img, strength=sharpen_strength)
        meta["sharpen"] = f"unsharp_strength={sharpen_strength:.2f}"

        # 7. Upscale if too small
        img, upscaled = self._upscale_guard(img)
        meta["upscaled"] = upscaled

        return {"image": img, "metadata": meta}

    # ------------------------------------------------------------------ #
    #  Measurement helpers                                                  #
    # ------------------------------------------------------------------ #

    def _estimate_noise(self, img: np.ndarray) -> float:
        """
        Estimate noise sigma using the Laplacian method.
        Higher values = noisier image.
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Median Absolute Deviation of Laplacian (robust noise estimator)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        sigma = float(np.median(np.abs(laplacian))) * 1.4826
        return sigma

    def _blur_score(self, img: np.ndarray) -> float:
        """Laplacian variance — higher = sharper."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        return float(cv2.Laplacian(gray, cv2.CV_64F).var())

    def _contrast_score(self, img: np.ndarray) -> float:
        """Standard deviation of grayscale — higher = more contrast."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        return float(gray.std())

    # ------------------------------------------------------------------ #
    #  Adaptive parameter calculators                                       #
    # ------------------------------------------------------------------ #

    def _calc_denoise_strength(self, noise_sigma: float) -> int:
        """
        Map noise_sigma to NLM filter strength (h parameter).
        Low noise → gentle filter. High noise → aggressive filter.
        """
        if noise_sigma < 3:
            return 3     # very clean, minimal filtering
        elif noise_sigma < 8:
            return 5     # light noise
        elif noise_sigma < 15:
            return 7     # moderate noise
        elif noise_sigma < 25:
            return 10    # noisy scan
        else:
            return 13    # very noisy — aggressive

    def _calc_clahe_clip(self, contrast: float) -> float:
        """
        Map initial contrast score to CLAHE clip limit.
        Low contrast → higher clip limit. Already good → gentle.
        """
        if contrast > 55:
            return 1.5   # already good contrast
        elif contrast > 40:
            return 2.0   # standard
        elif contrast > 25:
            return 2.5   # needs help
        else:
            return 3.0   # very low contrast — be aggressive

    def _calc_sharpen_strength(self, blur_score: float, doc_type: str) -> float:
        """
        Map blur score to unsharp mask strength.
        Blurry images get more sharpening. Passport MRZ needs crisp edges.
        """
        # Passport bio pages need crisper text for MRZ
        bonus = 0.3 if doc_type == "passport_bio" else 0.0

        if blur_score > 500:
            return 0.8 + bonus    # already sharp
        elif blur_score > 200:
            return 1.2 + bonus    # decent
        elif blur_score > 80:
            return 1.5 + bonus    # moderately blurry
        else:
            return 2.0 + bonus    # very blurry — max sharpening

    # ------------------------------------------------------------------ #
    #  Pipeline steps                                                       #
    # ------------------------------------------------------------------ #

    def _white_balance(self, img: np.ndarray) -> np.ndarray:
        """
        Gray World white balance: scale each channel so its mean
        equals the overall mean brightness. Corrects colour casts
        from scanner lamps or phone cameras.
        """
        result = img.astype(np.float32)
        avg_b = result[:, :, 0].mean()
        avg_g = result[:, :, 1].mean()
        avg_r = result[:, :, 2].mean()
        avg_all = (avg_b + avg_g + avg_r) / 3.0

        if avg_b > 0:
            result[:, :, 0] *= avg_all / avg_b
        if avg_g > 0:
            result[:, :, 1] *= avg_all / avg_g
        if avg_r > 0:
            result[:, :, 2] *= avg_all / avg_r

        return np.clip(result, 0, 255).astype(np.uint8)

    def _deskew(self, img: np.ndarray) -> tuple[np.ndarray, float]:
        """
        Detect rotation angle via Hough line transform and correct it.
        If no dominant angle is found the image is returned unchanged.
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLinesP(
            edges, 1, np.pi / 180, threshold=80,
            minLineLength=img.shape[1] // 4, maxLineGap=20
        )

        if lines is None:
            return img, 0.0

        angles = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            if x2 - x1 != 0:
                angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
                angles.append(angle)

        if not angles:
            return img, 0.0

        median_angle = float(np.median(angles))
        # Only correct small skews (avoid flipping portrait ↔ landscape)
        if abs(median_angle) > 45:
            return img, 0.0

        h, w = img.shape[:2]
        center = (w / 2, h / 2)
        M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
        rotated = cv2.warpAffine(
            img, M, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE
        )
        return rotated, median_angle

    def _denoise(self, img: np.ndarray, h: int = 7) -> np.ndarray:
        """
        Non-local Means denoising (colour-aware) with adaptive strength.
        Falls back to bilateral filter if image is too small for NLM.
        """
        ih, iw = img.shape[:2]
        if ih < 64 or iw < 64:
            return cv2.bilateralFilter(img, d=9, sigmaColor=75, sigmaSpace=75)
        return cv2.fastNlMeansDenoisingColored(
            img, None, h=h, hColor=h,
            templateWindowSize=7, searchWindowSize=21
        )

    def _auto_brightness(
        self, img: np.ndarray
    ) -> tuple[np.ndarray, float]:
        """
        Stretch the V channel of HSV so the image uses the full 0–255 range.
        Returns the corrected image and the gamma / brightness delta applied.
        """
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
        v = hsv[:, :, 2]

        v_min, v_max = float(v.min()), float(v.max())
        delta = v_max - v_min

        if delta < 10:          # essentially uniform – nothing to stretch
            return img, 0.0

        v_stretched = (v - v_min) / delta * 255.0
        hsv[:, :, 2] = np.clip(v_stretched, 0, 255)

        corrected = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
        return corrected, float(128.0 - (v_min + v_max) / 2)

    def _clahe(self, img: np.ndarray, clip_limit: float = 2.0) -> np.ndarray:
        """
        Apply CLAHE (Contrast Limited Adaptive Histogram Equalisation) to the
        L channel in LAB colour space to enhance local contrast without
        over-saturating colours.
        """
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l_ch, a_ch, b_ch = cv2.split(lab)

        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
        l_eq = clahe.apply(l_ch)

        lab_eq = cv2.merge([l_eq, a_ch, b_ch])
        return cv2.cvtColor(lab_eq, cv2.COLOR_LAB2BGR)

    def _unsharp_mask(
        self,
        img: np.ndarray,
        sigma: float = 1.0,
        strength: float = 1.5,
    ) -> np.ndarray:
        """
        Unsharp mask: blurred subtracted from original, result blended back.
        """
        blurred = cv2.GaussianBlur(img, (0, 0), sigma)
        sharpened = cv2.addWeighted(img, 1 + strength, blurred, -strength, 0)
        return sharpened

    def _upscale_guard(
        self, img: np.ndarray
    ) -> tuple[np.ndarray, bool]:
        """
        If the longest edge is shorter than MIN_LONG_EDGE, upscale
        proportionally using Lanczos interpolation.
        """
        h, w = img.shape[:2]
        long_edge = max(h, w)
        if long_edge >= self.MIN_LONG_EDGE:
            return img, False

        scale = self.MIN_LONG_EDGE / long_edge
        new_w = int(round(w * scale))
        new_h = int(round(h * scale))
        upscaled = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
        return upscaled, True
