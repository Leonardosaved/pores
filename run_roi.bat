@echo off
REM ROI Analyzer - Launcher
REM This script starts the FastAPI backend and opens the application in the browser

setlocal enabledelayedexpansion

echo.
echo ============================================================
echo            ROI Analyzer - Starting Application
echo ============================================================
echo.

REM Find Python
for /f "delims=" %%i in ('where python') do set PYTHON=%%i
if "%PYTHON%"=="" (
    echo Error: Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/
    pause
    exit /b 1
)

echo Found Python at: %PYTHON%

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

REM Find a free port (start with 8000)
for /L %%i in (8000,1,8100) do (
    netstat -ano | findstr ":%%i " >nul
    if errorlevel 1 (
        set PORT=%%i
        goto port_found
    )
)

:port_found
if not defined PORT (
    echo Error: Could not find a free port
    pause
    exit /b 1
)

echo Using port: %PORT%
echo.
echo Starting backend server...
echo.

REM Start the FastAPI server in a background process
cd /d "%SCRIPT_DIR%\backend"

REM Install dependencies if needed
python -m pip install -q fastapi uvicorn opencv-python tifffile pillow openpyxl >nul 2>&1

REM Start server
start "" cmd /c python -m uvicorn app:app --host 127.0.0.1 --port %PORT% --log-level warning

echo Waiting for server to start...
timeout /t 2 /nobreak

echo.
echo ============================================================
echo Backend server is running!
echo.
echo Opening ROI Analyzer in your browser...
echo URL: http://127.0.0.1:%PORT%
echo.
echo Press Ctrl+C in the backend window to stop the application
echo ============================================================
echo.

REM Open browser
start "" http://127.0.0.1:%PORT%

REM Keep this window open
pause
