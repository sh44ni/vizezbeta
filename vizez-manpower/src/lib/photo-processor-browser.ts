/**
 * VizEz Manpower — Intelligent browser-side photo crop.
 *
 * Uses Google MediaPipe BlazeFace (same quality as the Python pipeline).
 * Model loads once from CDN (~1 MB) and is cached for the session.
 *
 * Supports two source types automatically:
 *   "portrait"      — standalone headshot / portrait photo
 *   "passport_scan" — full passport scan with an embedded photo stamp
 *
 * NO image filters or enhancement are applied. Pure geometric crop only.
 */

import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

/* ─── Types ──────────────────────────────────────────────────────── */

export type SourceMode = 'portrait' | 'passport_scan';

interface Box { x: number; y: number; w: number; h: number }

/* ─── MediaPipe singleton ────────────────────────────────────────── */

let _detector: FaceDetector | null = null;
let _initPromise: Promise<FaceDetector> | null = null;

/**
 * Lazy-initialises the MediaPipe BlazeFace detector.
 * Loads the WASM runtime + ~300 KB TFLite model once; subsequent calls
 * return the cached instance immediately.
 */
async function getDetector(): Promise<FaceDetector> {
  if (_detector) return _detector;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
    );

    _detector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_detector/' +
          'blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
        delegate: 'GPU',
      },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.4,
      minSuppressionThreshold: 0.3,
    });

    console.log('[photo-processor] MediaPipe FaceDetector ready');
    return _detector;
  })();

  return _initPromise;
}

/* ─── Image loader ───────────────────────────────────────────────── */

function loadImg(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

/* ─── Source classification ──────────────────────────────────────── */

/**
 * Decide whether the input image is a standalone portrait or a document scan
 * that contains a small embedded passport photo.
 *
 * Primary signal:  face bounding box area ÷ total image area.
 *   < 8%  → passport/document scan
 *   ≥ 8%  → standalone portrait
 *
 * Secondary:  face centre is in a corner quadrant → leans toward scan.
 */
function classifySource(face: Box | null, imgW: number, imgH: number): SourceMode {
  if (!face) {
    // No face detected — assume landscape = document scan, portrait = headshot
    return imgW > imgH * 1.15 ? 'passport_scan' : 'portrait';
  }

  const ratio = (face.w * face.h) / (imgW * imgH);
  if (ratio < 0.08) return 'passport_scan';

  // Secondary: face centred in a corner quadrant and relatively small
  const cx = face.x + face.w / 2;
  const cy = face.y + face.h / 2;
  const inCorner =
    (cx < imgW * 0.35 || cx > imgW * 0.65) && cy < imgH * 0.55;
  if (inCorner && ratio < 0.20) return 'passport_scan';

  return 'portrait';
}

/* ─── Crop box construction ──────────────────────────────────────── */

/**
 * Expand the tight MediaPipe face bounding box to a passport-photo-style crop.
 *
 * ICAO standard: head height (chin → top of hair) = 70-80 % of photo height.
 * MediaPipe BlazeFace returns a box that includes the face but NOT hair.
 *
 * Padding fractions of face_height:
 *
 *   Portrait mode:
 *     top    = 0.50  (hair above forehead — moderate)
 *     bottom = 0.15  (chin to photo bottom edge)
 *
 *   Passport scan mode (face is small in a large document):
 *     top    = 0.90  (larger proportion needed to capture the full embedded photo)
 *     bottom = 0.50  (proportionally more space needed when face is tiny)
 */
function buildCropBox(
  face: Box,
  mode: SourceMode,
  imgW: number,
  imgH: number,
): Box {
  const { x, y, w: fw, h: fh } = face;

  const padTop = mode === 'passport_scan' ? fh * 0.90 : fh * 0.50;
  const padBot = mode === 'passport_scan' ? fh * 0.50 : fh * 0.15;

  // Horizontal: centre the face, expand outward symmetrically for aspect ratio
  // (width is set later when we enforce the 35:45 aspect ratio)
  const topY  = y - padTop;
  const botY  = y + fh + padBot;
  const cropH = botY - topY;

  // Target width from the 35:45 ratio
  const ASPECT = 35 / 45;
  const cropW  = cropH * ASPECT;

  // Centre crop horizontally on the face midpoint
  const faceMidX = x + fw / 2;
  const cropX    = faceMidX - cropW / 2;

  // Clamp to image bounds
  const cx = Math.max(0, Math.min(cropX, imgW - 1));
  const cy = Math.max(0, Math.min(topY,  imgH - 1));
  const cw = Math.min(cropW,  imgW - cx);
  const ch = Math.min(cropH, imgH - cy);

  return { x: cx, y: cy, w: cw, h: ch };
}

/* ─── Heuristic fallback (no face found) ─────────────────────────── */

function heuristicBox(imgW: number, imgH: number, mode: SourceMode): Box {
  const ASPECT = 35 / 45;

  if (mode === 'passport_scan') {
    // ICAO-standard passport photo position: upper-left ~22 % × 62 %
    const h = imgH * 0.62;
    const w = h * ASPECT;
    return { x: imgW * 0.035, y: imgH * 0.04, w, h };
  }

  // Portrait: full-height centre crop at passport aspect ratio
  const h = imgH * 0.90;
  const w = h * ASPECT;
  const x = (imgW - w) / 2;
  return { x: Math.max(0, x), y: imgH * 0.02, w, h };
}

/* ─── Crop render ────────────────────────────────────────────────── */

/** Target output dimensions: 35 mm × 45 mm at 300 dpi */
const OUT_W = 413;
const OUT_H = 531;

/**
 * Render the crop box region of `img` onto a 413 × 531 canvas.
 * NO colour adjustments, NO sharpening — clean pixel copy only.
 */
function renderCrop(img: HTMLImageElement, box: Box): string {
  const canvas = document.createElement('canvas');
  canvas.width  = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d')!;

  // White background for images with transparency
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, OUT_W, OUT_H);

  ctx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, OUT_W, OUT_H);

  return canvas.toDataURL('image/jpeg', 0.95);
}

/* ─── Public API ─────────────────────────────────────────────────── */

/**
 * Crop an applicant photo to passport size (35 × 45 mm @ 300 dpi).
 *
 * Accepts both:
 *   • Standalone portrait / headshot
 *   • Full passport / ID document scan (automatically extracts the embedded photo)
 *
 * No colour enhancement is applied — the output is a clean geometric crop.
 *
 * @param file   Image file selected by the user (JPEG, PNG, WebP …)
 * @returns      JPEG data URL at 413 × 531 px (35 × 45 mm @ 300 dpi)
 */
export async function processApplicantPhoto(file: File): Promise<{
  dataUrl: string;
  wasCropped: boolean;
  mode: SourceMode | 'unknown';
}> {
  try {
    const img = await loadImg(file);
    const { naturalWidth: iw, naturalHeight: ih } = img;

    // 1. Run MediaPipe face detection
    const detector = await getDetector();
    const result   = detector.detect(img);
    const detections = result.detections ?? [];

    // Pick the detection with the highest confidence
    const best = detections
      .filter(d => d.boundingBox)
      .sort((a, b) => (b.categories[0]?.score ?? 0) - (a.categories[0]?.score ?? 0))[0];

    let faceBox: Box | null = null;
    if (best?.boundingBox) {
      const bb = best.boundingBox;
      faceBox = { x: bb.originX, y: bb.originY, w: bb.width, h: bb.height };
      console.log(`[photo-processor] Face detected (score=${(best.categories[0]?.score ?? 0).toFixed(2)}) at x=${Math.round(faceBox.x)},y=${Math.round(faceBox.y)} size=${Math.round(faceBox.w)}×${Math.round(faceBox.h)}`);
    } else {
      console.warn('[photo-processor] No face detected — falling back to heuristic');
    }

    // 2. Classify source
    const mode = classifySource(faceBox, iw, ih);
    console.log(`[photo-processor] Mode: ${mode} | image: ${iw}×${ih}`);

    // 3. Build crop box
    const box = faceBox
      ? buildCropBox(faceBox, mode, iw, ih)
      : heuristicBox(iw, ih, mode);

    // 4. Render clean crop (no filters)
    const dataUrl = renderCrop(img, box);

    return { dataUrl, wasCropped: !!faceBox, mode };

  } catch (err) {
    console.warn('[photo-processor] Failed, returning raw object URL:', err);
    return {
      dataUrl: URL.createObjectURL(file),
      wasCropped: false,
      mode: 'unknown',
    };
  }
}
