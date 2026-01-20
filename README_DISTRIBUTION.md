# ROI Analyzer - Desktop Application

A professional image analysis tool for detecting regions of interest (ROI), measuring scale bars, and exporting analysis data.

## Quick Start

### Fastest Way to Start (If you have Python):

1. **Download and extract** the ROI Analyzer folder
2. **Double-click** `run_roi.bat` 
3. **Wait** for the application to open in your browser

That's it! The application will:
- Automatically install required dependencies
- Start the backend server
- Open ROI Analyzer in your default browser
- Be ready to use immediately

### Installation (NSIS Installer):

1. Run `ROI_Analyzer_Installer.exe`
2. Follow the installation wizard
3. Click the Desktop or Start Menu shortcut to launch

## Features

- 📷 Load and view image files (TIFF format optimal)
- 🎯 Draw and manage regions of interest (ROI)
- 📏 Auto-detect and apply scale bars
- 📊 Calculate area measurements in micrometers
- 📄 Export data to Excel spreadsheet
- 💾 Save and load analysis sessions

## System Requirements

- **OS**: Windows 10 or later
- **Python**: 3.9 or later (required for batch file launcher)
- **RAM**: 4GB minimum
- **Disk**: 500MB free space
- **Browser**: Modern browser (Chrome, Edge, Firefox, Safari)

## File Structure

```
ROI Analyzer/
├── run_roi.bat              ← Double-click to start
├── launcher.py              ← Python launcher (fallback)
├── INSTALLATION_GUIDE.md    ← Detailed setup instructions
├── DISTRIBUTION_GUIDE.md    ← For developers/distributing
├── backend/                 ← FastAPI server
│   ├── app.py
│   ├── cv_service.py
│   ├── file_service.py
│   └── requirements.txt
└── frontend/dist/           ← Built React application
    ├── index.html
    └── assets/
```

## Troubleshooting

### "Python is not found" error
**Solution**: Install Python from https://www.python.org/
- Download Python 3.9 or later
- **IMPORTANT**: Check "Add Python to PATH" during installation
- Restart your computer

### Application won't open
- Close the batch file window and try again
- Check that port 8000 is available (close other applications if needed)
- Try opening http://127.0.0.1:8000 manually in your browser

### "Port already in use"
The script automatically tries ports 8000-8100. If all are in use:
1. Close other applications that might use those ports
2. Try again

## How to Use

1. **Load Images**
   - Use "Open Folder" to select an image directory
   - Supported formats: TIFF (preferred), PNG, JPG

2. **Draw ROI**
   - Click and drag on the image to create regions
   - Right-click to delete regions
   - Adjust region properties as needed

3. **Apply Scale Bar**
   - Auto-detect scale from image metadata
   - Or manually set the scale reference
   - System will convert pixels to micrometers

4. **Export Results**
   - Click "Export to Excel" to save all measurements
   - Includes ROI areas, coordinates, and metadata

5. **Save Analysis**
   - Current analysis is auto-saved in browser
   - Load previous sessions to continue work

## Support

For issues, questions, or feature requests, contact the development team.

## License

See LICENSE file for details.

## Version

Version 1.0.0 - January 2025

---

**Ready to use!** Just run `run_roi.bat` and start analyzing images.
