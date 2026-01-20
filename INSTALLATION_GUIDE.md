# ROI Analyzer - Installation and Usage Guide

## Quick Start

1. **Install Python** (if you haven't already)
   - Download Python 3.9+ from https://www.python.org/
   - **Important**: Check "Add Python to PATH" during installation

2. **Run ROI Analyzer**
   - Double-click `run_roi.bat` in the ROI Analyzer folder
   - The application will automatically:
     - Install required dependencies
     - Start the backend server
     - Open ROI Analyzer in your default web browser

3. **Using the Application**
   - Open image files (TIFF format preferred)
   - Draw ROI regions using the canvas
   - Detect and apply scale bars
   - Export measurements to Excel

## System Requirements

- **OS**: Windows 10 or later
- **Python**: 3.9 or later (must be in PATH)
- **RAM**: 4GB minimum
- **Disk Space**: 500MB

## Troubleshooting

### "Python is not installed or not in PATH"
- Install Python from https://www.python.org/
- Make sure to check "Add Python to PATH" during installation
- Restart your computer after installing Python

### Application won't start
- Make sure Python is installed and in PATH
- Try running `run_roi.bat` from the command line to see error messages
- Check that port 8000 is not in use by another application

### Port already in use
- The script will automatically try ports 8000-8100
- If all ports are in use, close other applications using these ports

## File Structure

```
roi-analyzer/
├── run_roi.bat           # Run this to start the application
├── launcher.py          # Python launcher script
├── backend/             # FastAPI server
│   ├── app.py          # Main server
│   ├── cv_service.py   # Computer vision operations
│   ├── file_service.py # File handling
│   └── requirements.txt # Python dependencies
└── frontend/            # Web interface
    ├── dist/           # Built React application
    └── public/         # Static assets
```

## Development

To develop or modify the application:

1. Install Node.js from https://nodejs.org/
2. Navigate to the `frontend` directory
3. Run `npm install` to install dependencies
4. Run `npm run dev` to start the development server
5. The backend server can be started separately by running `python -m uvicorn app:app --host 127.0.0.1 --port 8000` in the `backend` directory

## Support

For issues or feature requests, please contact the development team.

## License

See LICENSE file for details.
