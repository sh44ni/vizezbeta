# services/pdf_converter.py
"""
Vizez Document Expert — PDF → numpy image conversion using PyMuPDF (fitz).

Handles:
  • Native/digital PDFs   – rendered at 300 DPI via PyMuPDF
  • Scanned PDFs          – embedded images extracted then returned
  • Multi-page documents  – auto-selects the page most likely to hold a passport
  • Multi-image pages     – picks the largest embedded image per page
  • Encrypted PDFs        – rejected with a clear error message
  • Oversized documents   – capped at MAX_PAGES for safety
"""

from __future__ import annotations

import numpy as np
import cv2
import fitz  # pymupdf


class PDFConverter:
    DPI: int = 300        # rendering resolution
    MAX_PAGES: int = 10   # safety cap

    # ------------------------------------------------------------------ #
    #  Public API                                                          #
    # ------------------------------------------------------------------ #

    def to_images(self, data: bytes) -> list[np.ndarray]:
        """
        Render every page (up to MAX_PAGES) of *data* as a BGR numpy array.

        Parameters
        ----------
        data:
            Raw PDF bytes.

        Returns
        -------
        list[np.ndarray]
            One BGR image per rendered page.

        Raises
        ------
        ValueError
            For encrypted PDFs or corrupt data.
        """
        try:
            doc = fitz.open(stream=data, filetype="pdf")
        except Exception as exc:
            raise ValueError(f"Could not open PDF: {exc}") from exc

        if doc.is_encrypted:
            raise ValueError(
                "Password-protected PDF is not supported. "
                "Please unlock the document before uploading."
            )

        page_count = min(len(doc), self.MAX_PAGES)
        images: list[np.ndarray] = []

        scale = self.DPI / 72.0          # 72 pt/inch → target DPI
        mat = fitz.Matrix(scale, scale)

        for i in range(page_count):
            page = doc[i]

            # Try to extract an embedded raster image first (scanned PDF)
            embedded = self._extract_embedded_image(page)
            if embedded is not None:
                images.append(embedded)
                continue

            # Fall back: render the whole page as a raster
            pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
            arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
                pix.height, pix.width, 3
            )
            images.append(cv2.cvtColor(arr, cv2.COLOR_RGB2BGR))

        return images

    def find_passport_page(self, images: list[np.ndarray]) -> np.ndarray:
        """
        Return the page from *images* most likely to contain a passport.

        Scores each image by how strongly the bottom quarter (MRZ zone)
        resembles the high-contrast horizontal stripe pattern typical of
        machine-readable zones.
        """
        if len(images) == 1:
            return images[0]

        best_score = -1.0
        best_image = images[0]

        for img in images:
            score = self._passport_likelihood(img)
            if score > best_score:
                best_score = score
                best_image = img

        return best_image

    # ------------------------------------------------------------------ #
    #  Private helpers                                                     #
    # ------------------------------------------------------------------ #

    def _extract_embedded_image(self, page: fitz.Page) -> np.ndarray | None:
        """
        If the page contains embedded raster image(s) (scanned page),
        decode and return the largest one as a BGR array.
        Returns *None* if no suitable images found.
        """
        img_list = page.get_images(full=True)
        if not img_list:
            return None

        doc = page.parent

        # If multiple images, pick the largest by pixel area
        best_img = None
        best_area = 0

        for img_info in img_list:
            xref = img_info[0]
            try:
                base_image = doc.extract_image(xref)
                img_bytes = base_image["image"]
                w = base_image.get("width", 0)
                h = base_image.get("height", 0)
                area = w * h

                # Skip tiny images (logos, icons, etc.)
                if area < 10000:  # less than 100x100
                    continue

                arr = np.frombuffer(img_bytes, dtype=np.uint8)
                decoded = cv2.imdecode(arr, cv2.IMREAD_COLOR)

                if decoded is not None and area > best_area:
                    best_img = decoded
                    best_area = area

            except Exception:
                continue

        return best_img

    def _passport_likelihood(self, img: np.ndarray) -> float:
        """
        Heuristic score: MRZ zones sit in the bottom ~25 % of a passport and
        exhibit high-contrast horizontal text.  We measure the stddev of the
        Otsu-binarised MRZ strip – higher stddev means more text-like texture.
        We also reward pages whose aspect ratio resembles a passport booklet
        (roughly 0.7 – 1.0 width/height) or an open spread (≈ 1.4).
        """
        h, w = img.shape[:2]

        # --- MRZ strip score ---
        mrz_zone = img[int(h * 0.75):, :]
        gray = cv2.cvtColor(mrz_zone, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(
            gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )
        mrz_score = float(binary.std())

        # --- Aspect-ratio bonus ---
        aspect = w / h if h > 0 else 1.0
        # Passport ID-3 booklet open: ≈1.42; single page: ≈0.71
        aspect_bonus = 0.0
        if 0.60 <= aspect <= 0.85 or 1.30 <= aspect <= 1.55:
            aspect_bonus = 10.0

        return mrz_score + aspect_bonus
