# services/format_detector.py
"""
Magic-byte format detection — no system C library required.

Uses the pure-Python ``filetype`` package which inspects the first few bytes
of the file (magic bytes) to identify the format.  Works identically on
Windows, macOS, and Linux without any native DLL dependency.

Supports: PDF, JPEG, PNG, WEBP, TIFF, BMP
"""

from __future__ import annotations

import filetype


class FormatDetector:
    # Maps filetype MIME strings → our internal category
    SUPPORTED: dict[str, str] = {
        "application/pdf": "pdf",
        "image/jpeg":      "image",
        "image/png":       "image",
        "image/webp":      "image",
        "image/tiff":      "image",
        "image/bmp":       "image",
    }

    def detect(self, data: bytes) -> str:
        """
        Detect the format of raw file bytes.

        Parameters
        ----------
        data:
            Raw bytes of the uploaded file (at least the first 261 bytes
            are enough for reliable magic-byte detection).

        Returns
        -------
        str
            ``"pdf"`` or ``"image"``

        Raises
        ------
        ValueError
            If the format is not recognised or not in SUPPORTED.
        """
        kind = filetype.guess(data)

        if kind is None:
            raise ValueError(
                "Could not detect file format. "
                "Please upload a PDF, JPEG, PNG, WEBP, TIFF, or BMP file."
            )

        mime = kind.mime
        fmt  = self.SUPPORTED.get(mime)

        if fmt is None:
            raise ValueError(
                f"Unsupported file format: {mime}. "
                "Please upload a PDF, JPEG, PNG, WEBP, TIFF, or BMP file."
            )

        return fmt
