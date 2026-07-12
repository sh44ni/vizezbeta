/**
 * Vizez Document Expert — Client Library.
 *
 * Sends raw image/PDF bytes to the Document Expert service for intelligent
 * processing (crop → classify → enhance) and returns the enhanced JPEG
 * as a base64 data URL suitable for OpenAI vision.
 *
 * Falls back gracefully to the original image if the processor is unreachable.
 */

const PROCESSOR_URL = process.env.PASSPORT_PROCESSOR_URL || 'http://localhost:8000';
const ENHANCE_ENDPOINT = `${PROCESSOR_URL}/api/v1/enhance`;
const TIMEOUT_MS = 30_000; // 30s — image processing can be slow

export interface EnhancementResult {
  /** Enhanced image as a base64 data URL (data:image/jpeg;base64,...) */
  dataUrl: string;
  /** True if the image was enhanced by the processor */
  wasEnhanced: boolean;
  /** Quality metrics from the processor (null if fallback) */
  metrics: {
    sourceFormat: string;
    documentType: string;
    classification: {
      type: string;
      confidence: number;
      signals: Record<string, unknown>;
    };
    cropApplied: boolean;
    cropMetadata: {
      was_cropped: boolean;
      crop_method: string;
      crop_confidence: number;
    };
    originalQuality: Record<string, unknown>;
    enhancedQuality: Record<string, unknown>;
    enhancementMetadata: Record<string, unknown>;
    readyForExtraction: boolean;
    processingTimeMs: number;
  } | null;
}

/**
 * Enhance a document image through the Vizez Document Expert pipeline.
 *
 * @param fileBuffer  Raw file bytes (image or PDF)
 * @param fileName    Original filename (used for multipart form)
 * @param mimeType    MIME type of the file
 * @returns           Enhanced image data URL + metrics, or fallback to original
 */
export async function enhancePassportImage(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<EnhancementResult> {
  // Build the original data URL as fallback
  const originalB64 = fileBuffer.toString('base64');
  const fallbackDataUrl = `data:${mimeType};base64,${originalB64}`;

  try {
    // Build multipart form with the file
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, fileName);

    // Call the Document Expert with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(ENHANCE_ENDPOINT, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown error');
      console.warn(
        `[vizez-doc-expert] Processor returned ${response.status}: ${errText}. Falling back to original image.`,
      );
      return { dataUrl: fallbackDataUrl, wasEnhanced: false, metrics: null };
    }

    const data = await response.json();

    // The processor returns enhanced_image as a raw base64 JPEG string
    const enhancedDataUrl = `data:image/jpeg;base64,${data.enhanced_image}`;

    console.log(
      `[vizez-doc-expert] ✓ Enhanced "${fileName}" | ` +
        `type=${data.document_type} | ` +
        `cropped=${data.crop_applied} (${data.crop_metadata?.crop_method}) | ` +
        `blur: ${data.original_quality?.blur_score?.toFixed(0)} → ${data.enhanced_quality?.blur_score?.toFixed(0)} | ` +
        `brightness: ${data.original_quality?.brightness?.toFixed(0)} → ${data.enhanced_quality?.brightness?.toFixed(0)} | ` +
        `ready=${data.ready_for_extraction} | ` +
        `${data._processing_time_ms}ms`,
    );

    return {
      dataUrl: enhancedDataUrl,
      wasEnhanced: true,
      metrics: {
        sourceFormat: data.source_format,
        documentType: data.document_type,
        classification: data.classification,
        cropApplied: data.crop_applied,
        cropMetadata: data.crop_metadata,
        originalQuality: data.original_quality,
        enhancedQuality: data.enhanced_quality,
        enhancementMetadata: data.enhancement_metadata,
        readyForExtraction: data.ready_for_extraction,
        processingTimeMs: data._processing_time_ms || 0,
      },
    };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.warn(`[vizez-doc-expert] Processor timed out after ${TIMEOUT_MS}ms. Falling back to original image.`);
    } else {
      console.warn(`[vizez-doc-expert] Processor unreachable (${(error as Error).message}). Falling back to original image.`);
    }
    return { dataUrl: fallbackDataUrl, wasEnhanced: false, metrics: null };
  }
}

/**
 * Intelligently crop a photo to a standard passport aspect ratio centered on the face.
 *
 * @param fileBuffer  Raw file bytes
 * @param fileName    Original filename
 * @param mimeType    MIME type
 * @returns           Cropped image data URL + metrics, or fallback
 */
export async function cropApplicantPhoto(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<{ dataUrl: string; wasCropped: boolean; metrics: any }> {
  const originalB64 = fileBuffer.toString('base64');
  const fallbackDataUrl = `data:${mimeType};base64,${originalB64}`;

  try {
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, fileName);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${PROCESSOR_URL}/api/v1/crop-photo`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown error');
      console.warn(`[photo-cropper] Processor returned ${response.status}: ${errText}. Falling back.`);
      return { dataUrl: fallbackDataUrl, wasCropped: false, metrics: null };
    }

    const data = await response.json();
    const croppedDataUrl = `data:image/jpeg;base64,${data.cropped_image}`;

    console.log(`[photo-cropper] ✓ Cropped photo "${fileName}" in ${data._processing_time_ms}ms`);

    return {
      dataUrl: croppedDataUrl,
      wasCropped: true,
      metrics: {
        processingTimeMs: data._processing_time_ms || 0,
      },
    };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.warn(`[photo-cropper] Processor timed out after ${TIMEOUT_MS}ms. Falling back.`);
    } else {
      console.warn(`[photo-cropper] Processor unreachable (${(error as Error).message}). Falling back.`);
    }
    return { dataUrl: fallbackDataUrl, wasCropped: false, metrics: null };
  }
}
