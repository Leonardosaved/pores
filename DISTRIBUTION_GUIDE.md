# ROI Analyzer - Distribution and Deployment Guide

## Overview

This document explains how to package and distribute the ROI Analyzer application to end users.

## Current Status

✅ **Distribution-Ready Components:**
- Frontend: Fully built and optimized (`frontend/dist/`)
- Backend: Complete with all dependencies (`backend/`)
- Launcher: Batch file and Python launcher scripts included
- Installation Guide: User-friendly documentation included

## Distribution Options

### Option 1: Simple Batch File Distribution (IMMEDIATE - No Installation)

**For:** Users who already have Python installed

**Steps:**
1. Share the entire `ROI Analyzer` folder
2. User double-clicks `run_roi.bat`
3. Application starts automatically

**Pros:**
- No installation needed
- Works immediately
- Easiest for non-technical users
- Easy to update

**Cons:**
- Requires Python to be installed and in PATH

### Option 2: NSIS Installer (RECOMMENDED - Professional Distribution)

**For:** Professional distribution with proper installation experience

**To Build the Installer:**

1. Install NSIS from https://nsis.sourceforge.io/
2. In a command prompt, navigate to the project directory
3. Run: `makensis installer.nsi`
4. Output: `ROI_Analyzer_Installer.exe`

**Installation Flow:**
- User runs `ROI_Analyzer_Installer.exe`
- Selects installation directory
- Creates Start Menu shortcuts
- Creates Desktop shortcut
- Users run from Start Menu or Desktop

**Pros:**
- Professional appearance
- Proper installation to Program Files
- Easy uninstall via Control Panel
- Creates shortcuts automatically
- Can be distributed as a single .exe file

**Cons:**
- Requires NSIS to build (one-time)
- Still requires Python to be installed on target system

### Option 3: PyInstaller Single Executable (Most Portable - Complex Build)

**For:** Completely standalone executable that includes Python

This would require:
1. Python bundled with all dependencies
2. Creating a PyInstaller spec file
3. Building with: `pyinstaller launcher.spec`
4. Result: Single 200MB+ .exe file

**Status:** Possible but complex - Tauri was preferred but requires C++ build tools

## Recommended Distribution Workflow

### For Testing/Small Groups:
```
1. Use Option 1 (Batch File)
2. Share the ROI folder
3. Users run run_roi.bat
```

### For Professional/Wide Distribution:
```
1. Build NSIS installer:
   - Install NSIS
   - Run: makensis installer.nsi
   - Get: ROI_Analyzer_Installer.exe

2. Create a distribution package:
   - README.txt
   - INSTALLATION_GUIDE.md
   - ROI_Analyzer_Installer.exe
   - REQUIREMENTS.txt (lists system requirements)

3. Add to requirements:
   - Windows 10 or later
   - Python 3.9+ installed
   - Python in PATH
   - 4GB RAM minimum
```

## System Requirements (Target)

- **OS:** Windows 10 or later (64-bit recommended)
- **Python:** 3.9, 3.10, 3.11, or 3.12
- **RAM:** 4GB minimum
- **Disk Space:** 500MB
- **Display:** 1920x1080 minimum recommended

## Included Files

### Core Application Files
- `backend/` - FastAPI server
- `frontend/dist/` - Built React application
- `public/` - Static assets

### Launcher Files
- `run_roi.bat` - Batch file launcher (simple, no admin rights needed)
- `launcher.py` - Python launcher script (fallback)

### Documentation
- `INSTALLATION_GUIDE.md` - User-friendly setup instructions
- `README.md` - Project overview
- `LICENSE` - License information
- `installer.nsi` - NSIS installer script

## Pre-Distribution Checklist

Before distributing, verify:

- [ ] Frontend builds successfully: `npm run build` in `frontend/`
- [ ] Backend has all required dependencies in `backend/requirements.txt`
- [ ] Batch file launcher works: `run_roi.bat`
- [ ] All files are included and paths are correct
- [ ] VERSION is updated (if using versioning)
- [ ] License information is accurate

## Installation Instructions for Users

### Quick Start (if Python is installed):
1. Extract ROI Analyzer folder
2. Double-click `run_roi.bat`
3. Wait for browser to open

### Setup (First Time):
1. Extract ROI Analyzer folder
2. Double-click `run_roi.bat`
3. Script will check for and install Python dependencies
4. Browser opens automatically
5. No further setup needed!

## Troubleshooting Distribution

### User can't run run_roi.bat
- Verify Python is installed: `python --version` in Command Prompt
- If not, provide Python installation link
- Ensure Python is in PATH

### Port conflicts on user machine
- Script automatically finds free ports 8000-8100
- Should handle port conflicts gracefully

### Missing dependencies on user system
- Script runs: `pip install -r requirements.txt`
- Dependencies auto-install on first run

## Future Enhancements

Possible improvements for future versions:
1. Electron-based desktop app (cross-platform)
2. Native installers for macOS and Linux
3. Automatic updates feature
4. Portable USB version
5. Docker containerized version

## Contact & Support

For distribution questions or issues, contact the development team.

---

**Last Updated:** January 20, 2025  
**Version:** 1.0.0  
**Status:** Ready for Distribution
