@echo off
REM ROI Analyzer - System Check Script
REM This script verifies that the system is ready to run ROI Analyzer

echo.
echo ============================================================
echo            ROI Analyzer - System Requirements Check
echo ============================================================
echo.

REM Check Python
echo Checking for Python...
where python >nul 2>&1
if errorlevel 1 (
    echo [FAIL] Python is not installed or not in PATH
    echo.
    echo To fix this:
    echo 1. Download Python from https://www.python.org/
    echo 2. Run the installer
    echo 3. IMPORTANT: Check "Add Python to PATH"
    echo 4. Restart your computer
    echo.
    pause
    exit /b 1
) else (
    for /f "delims=" %%i in ('where python') do set PYTHON_PATH=%%i
    echo [OK] Python found at: !PYTHON_PATH!
    
    REM Check Python version
    for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
    echo [OK] Python version: !PYTHON_VERSION!
)

echo.

REM Check for required directories
echo Checking for application files...
if not exist "backend" (
    echo [FAIL] backend directory not found
    pause
    exit /b 1
) else (
    echo [OK] backend directory found
)

if not exist "frontend\dist" (
    echo [WARNING] frontend\dist not found - needs to be built
    echo Run: cd frontend ^&^& npm run build
) else (
    echo [OK] frontend/dist found
)

echo.

REM Check pip
echo Checking for pip...
python -m pip --version >nul 2>&1
if errorlevel 1 (
    echo [FAIL] pip is not available
    echo This may prevent automatic dependency installation
) else (
    echo [OK] pip is available
)

echo.

REM Check for required Python packages
echo Checking for required Python packages...
python -c "import fastapi" 2>nul
if errorlevel 1 (
    echo [WARNING] fastapi not installed (will be installed on first run)
) else (
    echo [OK] fastapi installed
)

python -c "import uvicorn" 2>nul
if errorlevel 1 (
    echo [WARNING] uvicorn not installed (will be installed on first run)
) else (
    echo [OK] uvicorn installed
)

python -c "import cv2" 2>nul
if errorlevel 1 (
    echo [WARNING] opencv not installed (will be installed on first run)
) else (
    echo [OK] opencv installed
)

echo.
echo ============================================================
echo System Check Complete!
echo.
if errorlevel 1 (
    echo Some issues were found. Please address them and try again.
) else (
    echo System is ready to run ROI Analyzer!
    echo Double-click run_roi.bat to start the application.
)
echo ============================================================
echo.

pause
