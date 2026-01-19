import os
import cv2
import numpy as np
import openpyxl
from openpyxl import Workbook
from typing import List, Dict, Set

def get_analyzed_images(folder_path: str) -> Set[str]:
    """
    Reads the Excel file and returns a set of image names that have at least one ROI entry.
    """
    filepath = os.path.join(folder_path, "roi_measurements.xlsx")
    analyzed_files = set()

    if not os.path.exists(filepath):
        return analyzed_files

    try:
        workbook = openpyxl.load_workbook(filepath, read_only=True)
        sheet = workbook.active
        # Assuming 'image_name' is the first column
        for row in sheet.iter_rows(min_row=2, values_only=True):
            if row[0]:
                analyzed_files.add(row[0])
    except Exception:
        # If the file is corrupt or unreadable, return an empty set
        return set()

    return analyzed_files

def save_roi_to_excel(folder_path: str, data: Dict):
    """
    Appends a new row with ROI data to the Excel file.
    Creates the file and header if it doesn't exist.
    """
    filepath = os.path.join(folder_path, "roi_measurements.xlsx")

    header = [
        "image_name", "selection_number", "scale_px_per_um",
        "area_um2", "area_px2", "overlay_file"
    ]

    try:
        if not os.path.exists(filepath):
            workbook = Workbook()
            sheet = workbook.active
            sheet.append(header)
            workbook.save(filepath)

        workbook = openpyxl.load_workbook(filepath)
        sheet = workbook.active

        # Simple check for revisions - if a row with the same image and ID exists, remove it.
        # This implements an "update" rather than "append revision" logic.
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            if row[0] == data['image_name'] and row[1] == data['selection_number']:
                sheet.delete_rows(row_idx, 1)
                break

        row_to_add = [
            data["image_name"],
            data["selection_number"],
            data["scale_px_per_um"],
            data["area_um2"],
            data["area_px2"],
            data["overlay_file"]
        ]
        sheet.append(row_to_add)
        workbook.save(filepath)

    except PermissionError:
        raise PermissionError("Could not write to Excel. Please close the file and try again.")
    except Exception as e:
        raise IOError(f"Failed to write to Excel file: {e}")

def save_overlay_image(folder_path: str, image_name: str, selection_number: int, points: List[Dict]):
    """
    Draws the ROI polygon on the original image and saves it as a PNG.
    """
    output_dir = os.path.join(folder_path, "_roi_overlays")
    os.makedirs(output_dir, exist_ok=True)

    original_image_path = os.path.join(folder_path, image_name)
    base_name, _ = os.path.splitext(image_name)
    output_filename = f"{base_name}_{selection_number}.png"
    output_path = os.path.join(output_dir, output_filename)

    try:
        img = cv2.imread(original_image_path)
        if img is None:
            raise IOError("Could not read original image.")

        # Convert points to the format cv2.polylines needs
        pts = np.array([[p['x'], p['y']] for p in points], np.int32)
        pts = pts.reshape((-1, 1, 2))

        # Draw the polygon
        cv2.polylines(img, [pts], isClosed=True, color=(0, 0, 255), thickness=2)

        # Add a label
        label = f"ROI {selection_number}"
        label_pos = (pts[0][0][0], pts[0][0][1] - 10)
        cv2.putText(img, label, label_pos, cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)

        cv2.imwrite(output_path, img)
        return output_filename

    except Exception as e:
        raise IOError(f"Failed to save overlay image: {e}")
