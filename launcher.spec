#!/usr/bin/env python3
"""
PyInstaller spec file for ROI Analyzer desktop application.
This creates a single-file Windows exe that includes the backend, frontend static files, and launcher.
"""

import os
import sys
from pathlib import Path

# Get paths
root_dir = Path(__file__).parent
backend_dir = root_dir / 'backend'
frontend_dir = root_dir / 'frontend'
dist_dir = frontend_dir / 'dist'

block_cipher = None

a = Analysis(
    [str(root_dir / 'launcher.py')],
    pathex=[str(root_dir)],
    binaries=[],
    datas=[
        (str(backend_dir), 'backend'),
        (str(dist_dir), 'frontend'),
    ],
    hiddenimports=[
        'fastapi',
        'uvicorn',
        'uvicorn.lifespan',
        'uvicorn.loops',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.websocket',
        'uvicorn.protocols.websocket.auto',
        'uvicorn.protocols.websocket.wsproto_impl',
        'opencv',
        'cv2',
        'tifffile',
        'PIL',
        'openpyxl',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludedimports=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='ROI',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
