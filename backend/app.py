import os
import tkinter as tk
from tkinter import filedialog
import io
import tifffile
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
from starlette.responses import StreamingResponse
from cv_service import detect_scale_bar
import file_service

class RoiData(BaseModel):
    selection_number: int
    scale_px_per_um: float
    area_um2: float
    area_px2: float
    points: List[Dict[str, float]]

app = FastAPI()

# In-memory state for the selected folder
app_state = {
    "selected_folder": None,
}

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Allows the React frontend to connect
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/select-folder")
def select_folder():
    """
    Opens a native OS dialog to select a folder.
    Stores the selected path in the application's state.
    """
    root = tk.Tk()
    root.withdraw()  # Hide the main tkinter window
    folder_path = filedialog.askdirectory(title="Select Folder Containing TIFF Images")
    root.destroy()

    if folder_path:
        app_state["selected_folder"] = folder_path
        return {"selected_folder": folder_path}
    return {"selected_folder": None}

@app.get("/api/images")
def get_image_list():
    """
    Returns a list of TIFF images in the selected folder.
    Also checks if analysis has been performed on them by reading the Excel file.
    """
    folder = app_state.get("selected_folder")
    if not folder or not os.path.isdir(folder):
        raise HTTPException(status_code=404, detail="Folder not selected or not found.")

    try:
        files = os.listdir(folder)
        tiff_files = sorted([f for f in files if f.lower().endswith(('.tif', '.tiff'))])

        analyzed_images = file_service.get_analyzed_images(folder)

        response_data = []
        for filename in tiff_files:
            response_data.append({
                "filename": filename,
                "has_data": filename in analyzed_images
            })

        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read directory: {e}")


@app.get("/api/images/{filename}")
async def get_image(filename: str):
    """
    Reads a TIFF file, converts it to PNG in memory, and returns it.
    """
    folder = app_state.get("selected_folder")
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not selected.")

    filepath = os.path.join(folder, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Image not found.")

    try:
        # Read TIFF image using tifffile
        with tifffile.TiffFile(filepath) as tif:
            image_array = tif.asarray()

        # Convert numpy array to PIL Image
        img = Image.fromarray(image_array)

        # Save PIL image to a byte stream
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0) # Go to the beginning of the stream

        return StreamingResponse(img_byte_arr, media_type="image/png")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process image: {e}")


@app.get("/api/images/{filename}/scale-bar")
def get_scale_bar(filename: str):
    """
    Detects and returns the coordinates of the scale bar for an image.
    """
    folder = app_state.get("selected_folder")
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not selected.")

    filepath = os.path.join(folder, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Image not found.")

    coords = detect_scale_bar(filepath)
    if coords:
        x1, y1, x2, y2 = coords
        return {"x1": int(x1), "y1": int(y1), "x2": int(x2), "y2": int(y2)}

    raise HTTPException(status_code=404, detail="Scale bar not detected.")


@app.post("/api/images/{filename}/roi")
def save_roi(filename: str, roi_data: RoiData):
    """
    Saves ROI data to the Excel sheet and creates an overlay image.
    """
    folder = app_state.get("selected_folder")
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not selected.")

    try:
        # Save the overlay and get the filename
        overlay_filename = file_service.save_overlay_image(
            folder,
            filename,
            roi_data.selection_number,
            roi_data.points
        )

        # Prepare data for Excel
        excel_data = roi_data.dict()
        excel_data["image_name"] = filename
        excel_data["overlay_file"] = overlay_filename

        # Save to Excel
        file_service.save_roi_to_excel(folder, excel_data)

        return {"message": "ROI saved successfully.", "overlay_file": overlay_filename}

    except (PermissionError, IOError) as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")


@app.get("/")
def read_root():
    return {"message": "Pore ROI Analyzer Backend"}
