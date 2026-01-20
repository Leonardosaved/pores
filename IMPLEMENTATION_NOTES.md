# Persistent Data Storage with Version Tracking - Implementation Notes

## Overview
This implementation adds persistent data storage with versioning to the Pore ROI Analyzer. When a user analyzes an image and creates ROIs, the data is saved to an Excel file with comprehensive metadata. When the user revisits an image, previously saved ROIs are automatically loaded and displayed.

## Changes Made

### Backend (FastAPI)

#### 1. Updated `app.py`
- **Modified `RoiData` model**: Added new fields to support scale bar tracking and versioning
  - `version: int = 1` - ROI version number
  - `scale_um: float = 0` - Scale bar value in micrometers
  - `scale_bar: Dict = None` - Scale bar endpoint coordinates

- **New Endpoint: `GET /api/images/{filename}/analysis`**
  - Loads previously saved analysis for an image
  - Returns JSON with saved ROIs and scale bar data
  - Returns empty analysis if file has no data yet
  - No error if analysis file doesn't exist (graceful fallback)

- **Updated Endpoint: `POST /api/images/{filename}/roi`**
  - Now receives and stores scale bar data
  - Receives version number from frontend
  - Passes all data to file_service for Excel storage

#### 2. Enhanced `file_service.py`
- **Updated Excel Schema**: 
  - Columns: image_name, selection_number, version, scale_px_per_um, scale_um, scale_bar_x1, scale_bar_y1, scale_bar_x2, scale_bar_y2, area_um2, area_px2, points_json, overlay_file
  - Version column enables tracking of ROI modifications
  - Scale bar coordinates stored for exact reproduction

- **Modified `save_roi_to_excel()` function**:
  - Changed from "replace" logic to "append" logic
  - Creates new row for each ROI version instead of deleting old rows
  - Stores polygon points as JSON string for easy serialization/deserialization
  - Preserves complete history of ROI modifications

- **New function: `load_roi_data(folder_path, image_name)`**:
  - Reads Excel file and extracts all ROI data for a specific image
  - Returns only the latest version of each ROI
  - Parses JSON points back into Python objects
  - Returns both ROIs and scale bar metadata
  - Gracefully handles corrupt/missing Excel files

### Frontend (React + Zustand)

#### 1. Updated `useStore.ts` (Zustand Store)
- **New state fields**:
  - `modifyingRoiId: number | null` - Tracks which ROI is being edited

- **Enhanced `ROI` interface**:
  - Added `version: number` field to track ROI versions
  - Optional `isModifying` flag for UI state

- **Updated `loadSavedAnalysis()` method**:
  - Calls new `GET /api/images/{filename}/analysis` endpoint
  - Sets `completedRois` with saved ROI data
  - Restores scale bar position and value
  - Automatically called when selecting an image

- **Enhanced `confirmCurrentRoi()` method**:
  - Detects if user is creating new ROI or modifying existing one
  - Calculates correct version number (1 for new, existing+1 for modified)
  - Includes scale bar coordinates in POST request
  - Updates or appends to completedRois based on operation type
  - Always includes `selection_number`, `version`, `scale_um`, and `scale_bar` in payload

- **New methods**:
  - `startModifyingRoi(roiId)`: Loads existing ROI for editing
  - `cancelModifyingRoi()`: Cancels edit without saving

#### 2. Updated `ImageViewer.tsx` Component
- **Added ROI Sidebar**:
  - Displays all completed ROIs for current image
  - Shows ROI number, version, and area (µm²)
  - Active ROI is highlighted in cyan
  - Edit button for each ROI (disabled if another ROI is being edited)

- **Enhanced Stage Rendering**:
  - Modified ROIs are highlighted in cyan with thicker stroke
  - Existing ROIs displayed in red
  - Current drawing in lime green (as before)
  - Stage width adjusts when sidebar is visible (250px)

- **Import Store Methods**:
  - Added `startModifyingRoi` and `cancelModifyingRoi` to component imports
  - Added `modifyingRoiId` state for tracking

- **Updated Cancel Logic**:
  - Cancel button shows "Cancel Edit" when modifying
  - Cancel button shows "Cancel" when creating new ROI

#### 3. New Styles in `ImageViewer.css`
- **Container Layout**: Changed from single column to flexible layout with sidebar
  - `.viewer-content` - Flexbox container for canvas + sidebar
  - Sidebar width: 250px, positioned on right side

- **ROI Sidebar Styling**:
  - `.roi-sidebar` - Dark background (#2a2a2a), scrollable list
  - `.roi-list` - Flex column with gap for spacing
  - `.roi-item` - Individual ROI card with hover effects
  - `.roi-item.active` - Cyan highlight for modified ROI
  - `.modify-btn` - Blue button to start editing
  - `.roi-version` - Small version indicator badge
  - `.roi-area` - Area display in gray

## Workflow

### Creating a New ROI (First Time)
1. User selects folder and image
2. Store calls `loadSavedAnalysis()` → gets empty result (no prior analysis)
3. User clicks "+ Add ROI" → enters drawing mode
4. User clicks to add points, forms polygon
5. User clicks "✓ Confirm"
6. `confirmCurrentRoi()` creates ROI with:
   - `selection_number`: 1 (first ROI)
   - `version`: 1
   - Scale bar data included
7. POST to `/api/images/{filename}/roi` → file_service saves to Excel
8. ROI appears in sidebar on left

### Saving an Image and Returning Later
1. User selects same image again
2. Store calls `loadSavedAnalysis()` → retrieves saved ROI from Excel
3. Saved ROIs automatically appear on canvas in red
4. Scale bar is restored to previous position
5. User can see ROI in sidebar

### Modifying an Existing ROI
1. User clicks "✎ Edit" button on ROI in sidebar
2. `startModifyingRoi()` loads ROI points into editing mode
3. ROI highlights in cyan, node handles appear
4. User drags nodes to modify polygon
5. User clicks "✓ Confirm"
6. `confirmCurrentRoi()` detects existing ROI:
   - Keeps same `selection_number` (e.g., 1)
   - Increments `version` (e.g., 1 → 2)
7. POST to `/api/images/{filename}/roi` → file_service appends new row
8. Excel now has two rows for same ROI with different versions
9. Frontend displays latest version (v2)

## Excel File Structure
Each row represents a single ROI analysis:

| image_name | selection_number | version | scale_px_per_um | scale_um | scale_bar_x1 | ... | points_json | overlay_file |
|---|---|---|---|---|---|---|---|---|
| image1.tif | 1 | 1 | 2.5 | 100 | 150 | ... | [{"x":10,"y":20},...] | image1_1.png |
| image1.tif | 1 | 2 | 2.5 | 100 | 150 | ... | [{"x":12,"y":22},...] | image1_1.png |
| image2.tif | 1 | 1 | 2.5 | 100 | 160 | ... | [{"x":50,"y":60},...] | image2_1.png |

The system always returns the highest version for each image/selection_number combination.

## Data Persistence Features
✅ ROI points saved as JSON in Excel
✅ Scale bar coordinates persisted
✅ Version number incremented on modifications
✅ Complete history preserved (no rows deleted)
✅ Automatic loading when opening image
✅ Visual indicators for modified ROIs
✅ Easy reverting to older versions (via Excel)

## Error Handling
- Missing Excel file: Creates new file on first save
- Corrupt points JSON: Falls back to empty points array
- Missing scale bar data: Gracefully handles null values
- Excel file locked: Returns PermissionError with friendly message
- No saved analysis: Returns empty ROI list (doesn't error)

## Next Steps (Optional Enhancements)
- [ ] Add UI to display version history for each ROI
- [ ] Implement version comparison (show old vs new ROI overlay)
- [ ] Add ability to revert to specific version
- [ ] Export analysis results to PDF with all versions
- [ ] Add comments/notes field to ROIs
- [ ] Implement team collaboration (shared Excel file)
