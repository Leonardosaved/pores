# Pore ROI Analyzer

The Pore ROI Analyzer is a high-performance, local-first web application designed for scientific microscopy analysis. It allows users to analyze folders of `.tif` images, measure the area of polygonal regions of interest (ROIs), and export the results without any data ever leaving the local machine.

## Philosophy
**"Local-First & High Fidelity"**: Your data never leaves your local disk. The UI is designed to be as responsive as a native desktop application, with zero dependency on cloud services or external network connections.

## Features
- **Local Folder Selection**: Securely select a folder of images using your native OS file dialog.
- **TIFF/TIF Support**: Handles multi-page and various bit-depth TIFF files by converting them to PNGs in memory for display.
- **Automatic Scale Bar Detection**: Automatically finds the scale bar in your image to enable accurate measurements.
- **Manual Scale Correction**: Easily adjust the detected scale bar with draggable handles.
- **Polygonal ROI Drawing**: Draw complex, multi-point polygons to define your regions of interest.
- **Live Area Calculation**: Get immediate feedback on the area of your ROI in both pixels² and micrometers².
- **Data Export**: All measurements are automatically saved to an `roi_measurements.xlsx` file in your image folder.
- **Overlay Generation**: For each confirmed ROI, a PNG overlay is saved to a `_roi_overlays` subfolder for visual verification.
- **Keyboard Shortcuts**: Navigate images and control ROI drawing efficiently.

## Technical Architecture
The application runs as a local web server, consisting of a Python backend and a React frontend.

- **Backend**: Python 3.10+ with **FastAPI** for the API, **OpenCV** for computer vision tasks, **tifffile** for reading scientific images, and **openpyxl** for Excel operations.
- **Frontend**: **React 18+** with **Vite** for a fast development experience, **Zustand** for state management, and **Konva.js** for high-performance canvas rendering.

---

## Installation and Setup

This is a local tool, so you will need to have Python and Node.js installed on your system.

### Prerequisites
- **Python**: Version 3.10 or newer. You can download it from [python.org](https://www.python.org/downloads/).
- **Node.js**: Version 18 or newer. You can download it from [nodejs.org](https://nodejs.org/).

### 1. Backend Setup
Navigate to the `backend` directory and install the required Python packages.

```bash
cd backend
pip install -r requirements.txt
```

### 2. Frontend Setup
Navigate to the `frontend` directory and install the required Node.js packages.

```bash
cd frontend
npm install
```

## How to Run the Application

You will need to run the backend and frontend servers in two separate terminals.

### 1. Run the Backend Server
In a terminal, navigate to the `backend` directory and start the Uvicorn server.

```bash
cd backend
uvicorn app:app --reload
```
The backend will now be running at `http://localhost:8000`.

### 2. Run the Frontend Server
In a second terminal, navigate to the `frontend` directory and start the Vite development server.

```bash
cd frontend
npm run dev
```
The frontend will now be running at `http://localhost:5173`.

### 3. Open the Application
Open your web browser and navigate to **`http://localhost:5173`**. You can now start using the Pore ROI Analyzer.

---

## How Folder Selection Works
Browser security prevents web pages from accessing your local filesystem arbitrarily. This application bypasses this limitation by using a backend-driven approach:
1. When you click "Select Folder", you are interacting with a **native OS folder dialog**, not a browser dialog.
2. The path you select is sent to the backend server and stored securely.
3. The backend is then able to read and write files (like images, Excel sheets, and overlays) directly in that folder, providing a seamless desktop-like experience.

## Troubleshooting
- **PermissionError: Could not write to Excel...**: This error occurs if the `roi_measurements.xlsx` file is open in Microsoft Excel or another program while the application is trying to save data. Please **close the file** and try confirming the ROI again.
- **TIFF Decoding Issues**: The application uses the `tifffile` and `Pillow` libraries, which support a wide range of TIFF formats. If an image fails to load, it may be in an unsupported or rare format.
- **Scale Bar Not Detected**: The automatic detection works best on clear, horizontal scale bars located in the bottom 20% of the image. If it fails, you can easily define the scale bar manually by dragging the handles of the yellow line to the correct endpoints.
