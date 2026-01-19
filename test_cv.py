import cv2
import numpy as np
import os

# This is a duplicate of the heuristic logic in backend/cv_service.py
# It is copied here to allow for standalone testing.

def detect_scale_bar(image_path):
    """
    Detects a scale bar in an image using classical computer vision techniques.

    Args:
        image_path (str): The path to the image file.

    Returns:
        A dictionary containing the coordinates of the detected scale bar
        of the form {'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2}, or None if not found.
    """
    try:
        image = cv2.imread(image_path)
        if image is None:
            print(f"Error: Image not found or could not be read at {image_path}")
            return None

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced_gray = clahe.apply(gray)

        # Use Canny edge detection
        edges = cv2.Canny(enhanced_gray, 50, 150, apertureSize=3)

        # Use Probabilistic Hough Line Transform
        lines = cv2.HoughLinesP(
            edges,
            1,
            np.pi / 180,
            threshold=100,
            minLineLength=int(image.shape[1] * 0.05),
            maxLineGap=10
        )

        if lines is None:
            print(f"No lines detected in {image_path}")
            return None

        best_line = None
        max_score = -1
        img_height, img_width = image.shape[:2]

        for line in lines:
            x1, y1, x2, y2 = line[0]

            # Calculate properties of the line
            length = np.sqrt((x2 - x1)**2 + (y2 - y1)**2)
            angle = np.abs(np.arctan2(y2 - y1, x2 - x1) * 180 / np.pi)

            # --- Scoring Heuristic ---
            score = 0

            # 1. Angle Score (strong preference for horizontal)
            if angle < 5 or abs(angle - 180) < 5:
                score += 50
            elif angle < 15 or abs(angle - 180) < 15:
                score += 20

            # 2. Length Score (preference for longer lines)
            relative_length = length / img_width
            if relative_length > 0.1: # >10% of image width
                score += 30 * (relative_length)

            # 3. Position Score (strong preference for bottom 25%)
            avg_y = (y1 + y2) / 2
            if avg_y > img_height * 0.75:
                score += 40
            elif avg_y > img_height * 0.6:
                score += 20

            # 4. Straightness Score (already handled by Hough) - but let's boost very straight lines
            if angle < 2 or abs(angle-180) < 2:
                score += 10

            # --- Update best line ---
            if score > max_score:
                max_score = score
                best_line = {'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2, 'score': score}


        if best_line:
            print(f"Detected scale bar in {image_path} with score {best_line['score']}: ({best_line['x1']}, {best_line['y1']}) to ({best_line['x2']}, {best_line['y2']})")
            # Draw the line on the image for visual verification
            output_image = image.copy()
            cv2.line(output_image, (best_line['x1'], best_line['y1']), (best_line['x2'], best_line['y2']), (0, 255, 0), 2)
            output_path = f"test_images/detected_{os.path.basename(image_path)}"
            cv2.imwrite(output_path, output_image)
            print(f"Saved visualization to {output_path}")

        else:
            print(f"No suitable scale bar found in {image_path} after filtering.")

        return best_line

    except Exception as e:
        print(f"An error occurred while processing {image_path}: {e}")
        return None

# --- Main execution ---
if __name__ == "__main__":
    test_image_dir = "test_images"
    image_files = [f for f in os.listdir(test_image_dir) if f.endswith(('.png', '.tif', '.tiff')) and not f.startswith('detected_')]

    if not image_files:
        print(f"No images found in {test_image_dir}")
    else:
        for image_file in image_files:
            image_path = os.path.join(test_image_dir, image_file)
            print(f"\n--- Processing {image_path} ---")
            detect_scale_bar(image_path)
