# [Scale Detection] - Directive

## Obiettivo
Automatically detect the horizontal scale bar in a microscopy image to establish a pixels-per-micrometer ratio, which is essential for accurate measurements.

## API Contract (Localhost)
- **Endpoint:** `GET /api/images/{filename}/scale-bar`
- **Request:** The `filename` is passed as a URL parameter. No request body.
- **Response:** A JSON object containing the coordinates of the detected scale bar's endpoints.
  ```json
  {
    "x1": 500,
    "y1": 950,
    "x2": 650,
    "y2": 950
  }
  ```
- **Filesystem Side-effects:** Reads the specified image file from the user-selected folder. Does not write any files.

## UI/UX Behavior
- **Component:** `ImageViewer.tsx` (Canvas) and the associated toolbar.
- **Interaction:**
  - When an image is selected, this API is called automatically.
  - A yellow line with draggable circular handles at its endpoints is drawn on the canvas over the detected coordinates.
  - The user can drag the handles horizontally to correct the detection.
  - The user enters the scale bar's length in micrometers (µm) into a dedicated input field in the toolbar.
- **Shortcuts:** None directly associated with this feature.

## Algorithm / Logic (Computer Vision)
The detection uses a classical computer vision heuristic, avoiding heavy machine learning models.

1.  **Preprocessing:**
    - The image is loaded in grayscale.
    - **CLAHE (Contrast Limited Adaptive Histogram Equalization)** is applied to enhance local contrast, making the scale bar stand out more, especially in images with uneven lighting.
2.  **Edge Detection:**
    - **Canny Edge Detection** is used to find sharp changes in intensity, which outlines the borders of the scale bar.
3.  **Line Detection:**
    - A **Probabilistic Hough Transform (`HoughLinesP`)** is applied to the edge map. This is efficient for detecting straight line segments.
4.  **Filtering & Selection:**
    - The detected line segments are filtered based on the following criteria:
        - **Angle:** Only lines that are nearly horizontal (angle ≤ 5°) are considered.
        - **Position:** Preference is given to lines in the bottom 20% of the image, as this is a common location for scale bars.
        - **Length:** Lines must have a minimum length (e.g., >5% of the total image width) to be considered.
    - The **longest line** that meets these criteria is selected as the best candidate for the scale bar.

## Test Plan
- **Verification:** Use a test image (`test.tif`) with a clearly visible, horizontal scale bar in the bottom part of the image.
- **Procedure:**
  1. Select the folder containing `test.tif`.
  2. Select `test.tif` from the image list.
  3. Verify that a yellow line is drawn over the scale bar.
  4. Test edge cases: an image with no scale bar (should gracefully fail without crashing), an image with a slightly tilted bar, and an image where the bar is in a different location.
