# [ROI Management] - Directive

## Obiettivo
Allow users to draw, confirm, and save polygonal Regions of Interest (ROIs) on an image. For each confirmed ROI, calculate its area and persist the data to an Excel file and as a visual overlay image.

## API Contract (Localhost)
- **Endpoint:** `POST /api/images/{filename}/roi`
- **Request:** A JSON body containing the details of the confirmed ROI.
  ```json
  {
    "selection_number": 1,
    "scale_px_per_um": 4.51,
    "area_um2": 1234.56,
    "area_px2": 25000.0,
    "points": [
      { "x": 100, "y": 150 },
      { "x": 200, "y": 150 },
      { "x": 200, "y": 250 },
      { "x": 100, "y": 250 }
    ]
  }
  ```
- **Response:** A JSON confirmation message.
  ```json
  {
    "message": "ROI saved successfully.",
    "overlay_file": "my_image_1.png"
  }
  ```
- **Filesystem Side-effects:**
  1.  Creates a subfolder named `_roi_overlays` inside the user-selected folder if it does not exist.
  2.  Saves a new PNG image (`<original_name>_<selection_number>.png`) in the `_roi_overlays` folder, showing the original image with the ROI polygon drawn on it.
  3.  Creates or appends a row to `roi_measurements.xlsx` in the user-selected folder.

## UI/UX Behavior
- **Component:** `ImageViewer.tsx` (Canvas) and its toolbar.
- **Interaction:**
  - The user clicks a `+ Add ROI` button to enter "drawing mode".
  - In drawing mode, each click on the canvas adds a vertex to the current polygon.
  - The in-progress polygon is drawn with a lime green border.
  - The toolbar shows "Confirm" and "Cancel" buttons.
  - A live readout displays the current polygon's area in both px² and µm².
  - Clicking "Confirm" sends the ROI data to the backend. The ROI is then rendered as a semi-transparent red polygon.
  - Clicking "Cancel" (or `Esc`) exits drawing mode and clears the current polygon.
- **Shortcuts:**
  - `+`: Enter ROI drawing mode.
  - `Esc`: Cancel the current ROI drawing.
  - `Enter`: (Future enhancement) Could be used to close the polygon or confirm the ROI.

## Algorithm / Logic (Area Calculation)
- **Polygon Area:** The area of the polygon in pixels is calculated using the **Shoelace (or Surveyor's) formula**, which works for any non-self-intersecting polygon.
  - Formula: `Area = 0.5 * |Σ(x_i * y_{i+1} - x_{i+1} * y_i)|`
- **Unit Conversion:** The area in square micrometers (µm²) is calculated from the pixel area.
  - Formula: `Area_µm² = Area_px² / (scale_px_per_µm)²`

## Test Plan
- **Verification:** Use a test image and a confirmed scale.
- **Procedure:**
  1. Draw a simple rectangular ROI (e.g., 100x100 pixels).
  2. Confirm the area readout shows 10000 px².
  3. Confirm the µm² area is calculated correctly based on the current scale.
  4. Click "Confirm".
  5. **Verify Filesystem:** Check that a new row has been added to `roi_measurements.xlsx` and that the corresponding overlay PNG has been created in the `_roi_overlays` folder.
  6. **Verify UI:** The image list item should turn green.
