import cv2
import numpy as np

def detect_scale_bar(image_path: str):
    """
    Detects the scale bar in a microscopy image using multiple detection strategies.
    Handles graduated scale bars with markings and text (e.g., "100um").

    Returns:
        A tuple (x1, y1, x2, y2) of the detected bar's endpoints, or None if not found.
    """
    try:
        # 1. Load and preprocess
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            print(f"Error: Could not read image at {image_path}")
            return None

        img_height, img_width = img.shape
        
        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        img_clahe = clahe.apply(img)

        # 2. Edge Detection with multiple strategies
        edges = cv2.Canny(img_clahe, 50, 150, apertureSize=3)
        
        # Also try morphological operations to enhance scale bar markings
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=1)

        # 3. Hough Line Transform - detect all lines
        lines = cv2.HoughLinesP(
            edges,
            1,
            np.pi / 180,
            threshold=80,  # Lowered threshold for better detection
            minLineLength=int(img_width * 0.03),  # min length is 3% of image width
            maxLineGap=15
        )

        if lines is None:
            print("No lines detected via Hough transform")
            return None

        print(f"Detected {len(lines)} lines")

        # 4. Filtering and Selection
        best_line = None
        best_score = -1
        
        # Group horizontal lines (potential scale bars)
        horizontal_lines = []

        for line in lines:
            x1, y1, x2, y2 = line[0]

            # Filter for horizontal lines (angle close to 0 or 180)
            angle = np.abs(np.arctan2(y2 - y1, x2 - x1) * 180 / np.pi)
            # Accept angles close to 0 or 180 degrees
            if angle > 15 and angle < 165:
                continue

            length = np.sqrt((x2 - x1)**2 + (y2 - y1)**2)
            
            # Scale bar should be reasonably long (at least 3% of image width)
            if length < img_width * 0.03:
                continue
            
            horizontal_lines.append({
                'line': (x1, y1, x2, y2),
                'length': length,
                'y_pos': (y1 + y2) / 2,
                'x_min': min(x1, x2),
                'x_max': max(x1, x2)
            })

        if not horizontal_lines:
            print("No suitable horizontal lines found")
            return None

        print(f"Found {len(horizontal_lines)} horizontal line candidates")

        # Prefer lines in the bottom part of image (where scale bars typically are)
        # but also accept lines in corners or edges
        for hline in horizontal_lines:
            x1, y1, x2, y2 = hline['line']
            length = hline['length']
            y_pos = hline['y_pos']
            
            # Scoring: prioritize lines in lower region and longer lines
            vertical_pos_score = 0
            
            # Bonus for being in bottom 40% of image
            if y_pos > img_height * 0.6:
                vertical_pos_score = 1.5
            # Bonus for being near top (sometimes scale bars are there)
            elif y_pos < img_height * 0.2:
                vertical_pos_score = 1.2
            # Penalty for middle region
            else:
                vertical_pos_score = 0.5
            
            # Combined score: length with position bonus
            score = length * vertical_pos_score
            
            if score > best_score:
                best_score = score
                best_line = hline['line']

        if best_line is None:
            print("No suitable scale bar found")
            return None

        print(f"Selected scale bar with score {best_score}: {best_line}")
        return best_line

    except Exception as e:
        print(f"Error in scale bar detection: {e}")
        import traceback
        traceback.print_exc()
        return None
