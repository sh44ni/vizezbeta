# services/photo_cropper.py
import cv2
import numpy as np
import logging

logger = logging.getLogger("vizez.photo_cropper")

class PhotoCropper:
    def __init__(self):
        # Load the pre-trained Haar cascade for face detection
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        
        # Target aspect ratio based on ROP photos ready PDF (1.940 / 2.263 = ~0.857)
        self.target_aspect_ratio = 1.940 / 2.263
        
        if self.face_cascade.empty():
            logger.error(f"Failed to load cascade classifier from {cascade_path}")

    def crop(self, image: np.ndarray) -> np.ndarray:
        """
        Detects the largest face in the image and crops it to a standard
        passport size with proper headroom and shoulders, matching the
        requested 1.940 x 2.263 inch aspect ratio.
        """
        img_h, img_w = image.shape[:2]
        
        # Scale down for face detection if image is very large
        max_det_width = 800
        scale = 1.0
        if img_w > max_det_width:
            scale = max_det_width / img_w
            det_w = max_det_width
            det_h = int(img_h * scale)
            det_img = cv2.resize(image, (det_w, det_h), interpolation=cv2.INTER_AREA)
        else:
            det_img = image.copy()
            
        gray = cv2.cvtColor(det_img, cv2.COLOR_BGR2GRAY)
        
        # Equalize histogram to improve contrast for face detection
        gray = cv2.equalizeHist(gray)
        
        # Detect faces with more sensitive parameters
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.05,
            minNeighbors=4,
            minSize=(int(30 * scale) if scale < 1.0 else 30, int(30 * scale) if scale < 1.0 else 30),
            flags=cv2.CASCADE_SCALE_IMAGE
        )
        
        if len(faces) == 0:
            logger.warning("No face detected. Returning center crop.")
            return self._center_crop(image)
            
        # Get the largest face by area
        faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        x_det, y_det, w_det, h_det = faces[0]
        
        # Scale back to original coordinates
        x = int(x_det / scale)
        y = int(y_det / scale)
        w = int(w_det / scale)
        h = int(h_det / scale)
        
        # Face usually occupies ~55% of the total photo height for passports
        # Total height needed = face_height / 0.55
        target_h = int(h / 0.55)
        target_w = int(target_h * self.target_aspect_ratio)
        
        # If the calculated width is too small to fit the face horizontally with some padding, adjust it
        if target_w < w * 1.4:
            target_w = int(w * 1.4)
            target_h = int(target_w / self.target_aspect_ratio)
            
        # Center of the face
        face_center_x = x + w // 2
        
        # Headroom: top of crop should be ~15% of total height above the face
        # top_y = face_y - 0.15 * target_h
        headroom = int(target_h * 0.15)
        crop_y1 = y - headroom
        crop_y2 = crop_y1 + target_h
        
        crop_x1 = face_center_x - target_w // 2
        crop_x2 = crop_x1 + target_w
        
        # Adjust if crop goes outside image boundaries
        if crop_x1 < 0:
            crop_x2 -= crop_x1
            crop_x1 = 0
        if crop_y1 < 0:
            crop_y2 -= crop_y1
            crop_y1 = 0
            
        if crop_x2 > img_w:
            crop_x1 -= (crop_x2 - img_w)
            crop_x2 = img_w
        if crop_y2 > img_h:
            crop_y1 -= (crop_y2 - img_h)
            crop_y2 = img_h
            
        # Final boundary safety checks (in case image is smaller than target bounds)
        crop_x1 = max(0, crop_x1)
        crop_y1 = max(0, crop_y1)
        crop_x2 = min(img_w, crop_x2)
        crop_y2 = min(img_h, crop_y2)
        
        # Perform the crop
        cropped = image[crop_y1:crop_y2, crop_x1:crop_x2]
        
        # Sometimes due to bounds the aspect ratio gets distorted. We enforce aspect ratio one last time by resizing
        # Actually it's better to center crop the resulting box to exactly match the aspect ratio
        return self._exact_ratio_crop(cropped, self.target_aspect_ratio)

    def _center_crop(self, image: np.ndarray) -> np.ndarray:
        """Fallback: just center crop to the target aspect ratio."""
        return self._exact_ratio_crop(image, self.target_aspect_ratio)
        
    def _exact_ratio_crop(self, image: np.ndarray, target_ratio: float) -> np.ndarray:
        img_h, img_w = image.shape[:2]
        current_ratio = img_w / img_h
        
        if current_ratio > target_ratio:
            # Image is too wide, crop width
            new_w = int(img_h * target_ratio)
            offset_x = (img_w - new_w) // 2
            return image[:, offset_x:offset_x + new_w]
        elif current_ratio < target_ratio:
            # Image is too tall, crop height
            new_h = int(img_w / target_ratio)
            offset_y = (img_h - new_h) // 2
            return image[offset_y:offset_y + new_h, :]
        
        return image
