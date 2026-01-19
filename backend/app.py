import os
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
    version: int = 1
    scale_um: float = 0
    scale_bar: Dict = None
    notes: str = ""
    is_modification: bool = False
    is_notes_only: bool = False  # Flag to distinguish notes-only updates from geometry changes

class FolderRequest(BaseModel):
    folder_path: str

app = FastAPI()

# In-memory state for the selected folder
app_state = {
    "selected_folder": None,
}

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],  # Allows the React frontend to connect
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/select-folder")
def select_folder(request: FolderRequest):
    """
    Sets the selected folder path.
    Validates that the folder exists.
    """
    folder_path = request.folder_path.strip()
    
    if not folder_path:
        raise HTTPException(status_code=400, detail="Folder path cannot be empty.")
    
    if not os.path.isdir(folder_path):
        raise HTTPException(status_code=400, detail="The specified path is not a valid directory.")
    
    app_state["selected_folder"] = folder_path
    return {"selected_folder": folder_path}

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


@app.get("/api/images/{filename}/thumbnail")
async def get_thumbnail(filename: str, size: int = 200):
    """
    Returns a low-resolution thumbnail of the image for quick preview.
    """
    folder = app_state.get("selected_folder")
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not selected.")

    filepath = os.path.join(folder, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Image not found.")

    try:
        import numpy as np
        
        with tifffile.TiffFile(filepath) as tif:
            image_array = tif.asarray()

        # Handle multi-channel or multi-page TIFFs
        if len(image_array.shape) > 2:
            # If multi-page, take first page
            if image_array.shape[0] > 1:
                image_array = image_array[0]
            # If multi-channel, take first channel
            elif image_array.shape[2] > 1:
                image_array = image_array[:, :, 0]

        # Normalize to 0-255 range if needed
        if image_array.dtype != np.uint8:
            min_val = np.min(image_array)
            max_val = np.max(image_array)
            if max_val > min_val:
                image_array = ((image_array - min_val) / (max_val - min_val) * 255).astype(np.uint8)
            else:
                image_array = image_array.astype(np.uint8)

        img = Image.fromarray(image_array)
        img.thumbnail((size, size), Image.Resampling.LANCZOS)

        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)

        return StreamingResponse(img_byte_arr, media_type="image/png")

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate thumbnail: {str(e)}")


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


@app.get("/api/images/{filename}/analysis")
def get_saved_analysis(filename: str):
    """
    Loads previously saved analysis for an image (ROIs and scale bar data).
    Returns empty if no analysis found.
    """
    folder = app_state.get("selected_folder")
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not selected.")

    try:
        analysis_data = file_service.load_roi_data(folder, filename)
        # Load notes for this image
        notes = file_service.load_notes(folder, filename)
        analysis_data["notes"] = notes
        return analysis_data
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Return empty analysis instead of erroring - file might not exist yet
        return {"rois": [], "scaleBar": None, "scaleUm": 0, "notes": ""}


@app.post("/api/images/{filename}/scale-bar-save")
def save_scale_bar_config(filename: str, data: Dict):
    """
    Saves scale bar configuration for an image.
    This allows scale bar to persist even without ROIs.
    """
    folder = app_state.get("selected_folder")
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not selected.")

    try:
        # Validate scale_um before saving
        scale_um = data.get("scaleUm", 0)
        if scale_um and (scale_um < 1 or scale_um > 10000):
            scale_um = 100  # Default to 100 if invalid
        
        file_service.save_scale_bar(folder, filename, data.get("scaleBar"), scale_um)
        return {"message": "Scale bar saved."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save scale bar: {str(e)}")


@app.post("/api/images/{filename}/notes")
def save_notes(filename: str, data: Dict):
    """
    Saves analysis notes for an image.
    Notes are stored independently and persist with the image.
    """
    folder = app_state.get("selected_folder")
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not selected.")

    try:
        notes_text = data.get("notes", "")
        file_service.save_notes(folder, filename, notes_text)
        return {"message": "Notes saved."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save notes: {str(e)}")


@app.delete("/api/images/{filename}/analysis")
def delete_image_analysis(filename: str):
    """
    Deletes all ROI analysis data for an image:
    - Removes rows from Excel file
    - Deletes overlay images
    """
    folder = app_state.get("selected_folder")
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not selected.")

    try:
        file_service.delete_image_analysis(folder, filename)
        return {"message": "Analysis data deleted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete analysis: {str(e)}")


@app.post("/api/images/{filename}/roi")
def save_roi(filename: str, roi_data: RoiData):
    """
    Saves ROI data to the Excel sheet and creates an overlay image.
    Includes scale bar position and version information.
    For notes-only updates, the Excel row is updated in-place rather than creating a new row.
    """
    folder = app_state.get("selected_folder")
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not selected.")

    try:
        # For notes-only updates, just update the existing row's notes
        if roi_data.is_notes_only:
            file_service.update_roi_notes(folder, filename, roi_data.selection_number, roi_data.notes)
        else:
            # Save the overlay and get the filename with version info
            overlay_filename = file_service.save_overlay_image(
                folder,
                filename,
                roi_data.selection_number,
                roi_data.points,
                roi_data.version
            )

            # Prepare data for Excel - include all new fields
            excel_data = roi_data.dict()
            excel_data["image_name"] = filename
            excel_data["overlay_file"] = overlay_filename

            # Save to Excel
            file_service.save_roi_to_excel(folder, excel_data)

        return {"message": "ROI saved successfully."}

    except (PermissionError, IOError) as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")


@app.get("/")
def read_root():
    return {"message": "Pore ROI Analyzer Backend"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
