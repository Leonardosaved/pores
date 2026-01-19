import cv2
import numpy as np

def detect_scale_bar(image_path: str):
    """
    Detects the scale bar in a microscopy image using a heuristic approach.

    Returns:
        A tuple (x1, y1, x2, y2) of the detected bar's endpoints, or None if not found.
    """
    try:
        # 1. Preprocessing
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return None

        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        img_clahe = clahe.apply(img)

        # 2. Edge Detection
        edges = cv2.Canny(img_clahe, 50, 150, apertureSize=3)

        # 3. Hough Line Transform
        lines = cv2.HoughLinesP(
            edges,
            1,
            np.pi / 180,
            threshold=100,
            minLineLength=int(img.shape[1] * 0.05), # min length is 5% of image width
            maxLineGap=10
        )

        if lines is None:
            return None

        # 4. Filtering and Selection
        best_line = None
        best_score = -1
        img_height, img_width = img.shape

        for line in lines:
            x1, y1, x2, y2 = line[0]

            # Filter for horizontal lines (angle close to 0)
            angle = np.abs(np.arctan2(y2 - y1, x2 - x1) * 180 / np.pi)
            if angle > 5: # Allow up to 5 degrees of slant
                continue

            length = np.sqrt((x2 - x1)**2 + (y2 - y1)**2)

            # Scoring system: combines length and vertical position
            # Higher score for longer lines and lines closer to the bottom
            vertical_pos_score = (y1 + y2) / (2 * img_height) # Normalized position (0=top, 1=bottom)

            # Give a heavy weight to length, but a bonus for being in the lower part of the image
            score = length + (vertical_pos_score * length * 0.5)

            if score > best_score:
                best_score = score
                best_line = (x1, y1, x2, y2)

        return best_line

    except Exception as e:
        print(f"Error in scale bar detection: {e}")
        return None
