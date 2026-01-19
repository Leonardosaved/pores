# Image Analysis Application - Comprehensive Test Plan

## Overview
This test plan validates all critical bug fixes implemented in this session:
1. ROI visibility and editing
2. Scale bar persistence and auto-detection
3. Notes auto-save with version management
4. State restoration when navigating between images
5. Visual feedback for user actions

---

## Test 1: ROI Creation and Node Visibility

### Objective
Verify that ROI nodes (white circles) are visible and draggable when creating new ROIs.

### Steps
1. Open the application and select a test folder with TIFF images
2. Click "+ Add ROI" button
3. Click 3-4 points on the image to create a polygon
4. **Verify:** White circles with lime green stroke appear at each point
5. **Verify:** Circles are larger (radius 6px) and clearly visible
6. **Verify:** Can drag each circle to adjust the polygon
7. Click "✓ Confirm" to save the ROI
8. **Verify:** Area is calculated in both px² and µm²
9. **Verify:** ROI appears in the sidebar list

### Expected Results
- Nodes are clearly visible as white circles with lime stroke
- Nodes are interactive and draggable
- Polygon updates in real-time as nodes are dragged
- Area calculations are correct

### Pass/Fail Criteria
✓ Nodes visible during drawing
✓ Nodes draggable
✓ Area calculated correctly

---

## Test 2: ROI Editing and Node Visibility

### Objective
Verify that existing ROIs can be edited and nodes remain visible.

### Steps
1. From previous test, ROI should exist in sidebar
2. Click the edit icon (pencil) next to an ROI in the sidebar
3. **Verify:** ROI outline changes from red to cyan
4. **Verify:** White circles with cyan stroke appear at each polygon vertex
5. Drag one circle to a new position
6. **Verify:** Polygon updates in real-time
7. Click "✓ Confirm" to save changes
8. **Verify:** ROI list shows updated area

### Expected Results
- Nodes visible when editing existing ROI
- Nodes have cyan stroke (distinguishing them from new ROI nodes)
- Polygon updates in real-time during node drag
- Changes are saved correctly

### Pass/Fail Criteria
✓ Edit mode nodes visible
✓ Nodes have cyan stroke
✓ Changes saved correctly

---

## Test 3: Image Navigation Cycle (Critical)

### Objective
Verify that ROIs and scale bars persist when navigating between images.

### Steps
1. Open Image A
2. Create 2-3 ROIs on Image A with notes
3. Set custom scale bar (if not auto-detected) or confirm auto-detected scale
4. Click Next to go to Image B
5. **Verify:** Canvas clears (no ROIs from Image A visible)
6. **Verify:** Scale bar resets
7. Create 1 ROI on Image B
8. Click Previous to return to Image A
9. **Verify:** All 2-3 ROIs from Image A reappear
10. **Verify:** Nodes are visible on each ROI
11. **Verify:** Notes are preserved
12. **Verify:** Scale bar is restored to previous value
13. **Verify:** Click on each ROI to view notes - they should be intact
14. Click Next again to go to Image B
15. **Verify:** Your ROI on Image B is still there with correct properties

### Expected Results
- State completely restores when returning to previous image
- ROIs, scale bars, and notes persist across navigation
- No data loss when switching images
- Nodes are visible on restored ROIs

### Pass/Fail Criteria
✓ ROIs restored on return
✓ Scale bar restored
✓ Notes preserved
✓ Nodes visible on restored ROIs
✓ No data corruption

---

## Test 4: Scale Bar Auto-Detection

### Objective
Verify that scale bars are automatically detected on first image open.

### Steps
1. Select a new test folder (one where no analysis has been done)
2. Click on the first image
3. **Verify:** After 1-2 seconds, a notification appears: "Scale bar auto-detected (100µm). Adjust if needed."
4. **Verify:** A yellow scale bar appears on the image with yellow handle circles
5. **Verify:** The scale bar is positioned in the bottom portion of the image
6. **Verify:** Scale value is set to 100µm by default
7. Optionally adjust the scale bar or the µm value
8. Navigate to another image
9. **Verify:** That image also shows auto-detected scale bar

### Expected Results
- Scale bar auto-detected on first open
- Notification confirms detection
- Default scale value is 100µm
- Yellow visualization clearly visible
- Auto-detection works across multiple images

### Pass/Fail Criteria
✓ Auto-detection triggered
✓ Notification shown
✓ Scale bar visible
✓ Default value is 100µm

---

## Test 5: Scale Bar Persistence

### Objective
Verify that scale bars are saved and restored across folder reopens.

### Steps
1. From Test 4, you should have auto-detected scale bars
2. Adjust the scale value to something custom (e.g., 50µm)
3. Move to another image
4. Close the application completely (close folder in app)
5. Select the same folder again
6. Click on the first image
7. **Verify:** Scale bar appears immediately (no re-detection needed)
8. **Verify:** Scale value is your custom value (50µm)
9. **Verify:** Scale bar position is exactly where you left it
10. Check another image
11. **Verify:** Its scale bar is also restored

### Expected Results
- Scale bars saved to persistent storage (analysis file + JSON config)
- Scale bars restored on folder reopen
- Custom scale values preserved
- Scale bar positions preserved
- No need for re-detection

### Pass/Fail Criteria
✓ Scale bar persisted
✓ Custom values restored
✓ Positions preserved
✓ Instant restore on reopen

---

## Test 6: Notes Auto-Save

### Objective
Verify that ROI notes auto-save after user stops typing with proper visual feedback.

### Steps
1. Create or select an existing ROI
2. Click on the notes textarea (bottom right)
3. Type some text (e.g., "This is a pore cell")
4. **Verify:** Orange unsaved indicator (●) appears next to "Notes" label
5. Stop typing and wait 500ms
6. **Verify:** After ~500ms, the textarea gets a green glow animation
7. **Verify:** Green glow fades out over 1.5 seconds
8. **Verify:** Unsaved indicator disappears
9. Edit the notes again
10. **Verify:** Unsaved indicator returns
11. Wait for auto-save again
12. Navigate to another image then back
13. **Verify:** Notes are still there and haven't changed

### Expected Results
- Unsaved indicator appears when notes are changed
- Auto-save triggers 500ms after typing stops
- Green glow animation confirms successful save
- Visual feedback is clear and non-intrusive
- Notes persist across navigation

### Pass/Fail Criteria
✓ Unsaved indicator works
✓ Auto-save delay correct (500ms)
✓ Green glow visible
✓ Notes saved correctly
✓ Notes survive navigation

---

## Test 7: Version Management

### Objective
Verify that notes-only changes don't increment version numbers, preventing version explosion.

### Steps
1. Create a new ROI on an image
2. **Verify:** In the sidebar, ROI shows "v1"
3. Edit the notes and auto-save
4. **Verify:** ROI still shows "v1" (version didn't increment)
5. Edit the polygon (move a node)
6. Click "✓ Confirm" to save changes
7. **Verify:** ROI now shows "v2" (version incremented)
8. Edit notes again
9. **Verify:** ROI still shows "v2" (notes don't bump version)

### Expected Results
- Note-only updates don't increment version
- Geometry changes increment version
- Prevents redundant version rows in Excel
- Clean version history

### Pass/Fail Criteria
✓ Notes-only updates skip version
✓ Geometry changes increment
✓ Correct version display

---

## Test 8: Scale Value Validation

### Objective
Verify that scale values are clamped to safe range (1-10000µm) and prevent corruption.

### Steps
1. Create an ROI with a scale bar
2. In the scale value input field, enter "0"
3. **Verify:** Value snaps to "1" (minimum)
4. Clear and enter "-100"
5. **Verify:** Value snaps to "1"
6. Enter "50000"
7. **Verify:** Value snaps to "10000" (maximum)
8. Enter "500"
9. **Verify:** Value is accepted as "500"
10. Navigate away and back
11. **Verify:** Scale value is still "500" (not corrupted)

### Expected Results
- Invalid values are clamped to safe range
- No corrupted values like "105467.09"
- Custom valid values preserved
- Bounds are enforced consistently

### Pass/Fail Criteria
✓ Min bound enforced
✓ Max bound enforced
✓ Valid values accepted
✓ No corruption

---

## Test 9: Error Recovery and Retry

### Objective
Verify that failed saves show error feedback and can be retried.

### Steps
1. Create an ROI with notes
2. Disconnect network or simulate server down
3. Edit notes
4. **Verify:** After 500ms, red error indicator appears (⚠)
5. **Verify:** "Retry" button appears next to notes
6. Restore network/server
7. Click "Retry" button
8. **Verify:** Save succeeds and green glow appears
9. **Verify:** Error indicator disappears

### Expected Results
- Failed saves show clear error feedback
- Retry button available and functional
- Successful retry resolves error state
- User can manually retry without data loss

### Pass/Fail Criteria
✓ Error indicator shown
✓ Retry button visible
✓ Retry succeeds
✓ Visual feedback clear

---

## Test 10: ROI Sidebar and List Management

### Objective
Verify that ROI sidebar correctly displays and manages ROI list.

### Steps
1. Create 5 ROIs on an image
2. **Verify:** All 5 appear in sidebar with correct numbering
3. **Verify:** Each shows version number
4. **Verify:** Each shows area in µm²
5. **Verify:** Each has edit, delete buttons
6. Delete the 3rd ROI
7. **Verify:** It's removed from sidebar and canvas
8. **Verify:** Remaining ROIs still numbered correctly
9. Click on an ROI in sidebar
10. **Verify:** Its polygon highlights in cyan on canvas
11. **Verify:** Notes textarea populates with its notes

### Expected Results
- Sidebar displays all ROIs
- Version and area information correct
- Edit/delete buttons functional
- ROI selection works correctly
- Notes display correctly

### Pass/Fail Criteria
✓ Sidebar displays all ROIs
✓ Edit/delete functional
✓ Selection highlights work
✓ Notes display correctly

---

## Summary Checklist

Run these tests in order. Mark each as Pass or Fail:

- [ ] Test 1: ROI Creation and Node Visibility - **PASS/FAIL**
- [ ] Test 2: ROI Editing and Node Visibility - **PASS/FAIL**
- [ ] Test 3: Image Navigation Cycle - **PASS/FAIL**
- [ ] Test 4: Scale Bar Auto-Detection - **PASS/FAIL**
- [ ] Test 5: Scale Bar Persistence - **PASS/FAIL**
- [ ] Test 6: Notes Auto-Save - **PASS/FAIL**
- [ ] Test 7: Version Management - **PASS/FAIL**
- [ ] Test 8: Scale Value Validation - **PASS/FAIL**
- [ ] Test 9: Error Recovery and Retry - **PASS/FAIL**
- [ ] Test 10: ROI Sidebar and List Management - **PASS/FAIL**

**Overall Status:** All tests must pass for release.

---

## Known Limitations

None currently. If issues arise during testing, document them here and prioritize fixes.

---

## Regression Testing

After completing above tests, perform quick sanity checks:
- [ ] Application starts without errors
- [ ] Folder selection works
- [ ] Image list loads correctly
- [ ] Canvas renders properly
- [ ] All buttons responsive
- [ ] No console errors in browser DevTools
- [ ] No Python errors in backend logs
