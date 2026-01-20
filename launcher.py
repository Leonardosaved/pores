#!/usr/bin/env python3
"""
ROI Analyzer Desktop Launcher
Launches the FastAPI backend server and opens the web application in the default browser.
"""

import os
import sys
import subprocess
import webbrowser
import time
import socket
import threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, HTTPServer
import json

def find_free_port(start_port=8000):
    """Find a free port starting from start_port."""
    port = start_port
    while port < start_port + 100:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.bind(('127.0.0.1', port))
            sock.close()
            return port
        except OSError:
            port += 1
    raise RuntimeError("Could not find a free port")

def check_port_ready(host, port, timeout=10):
    """Check if a port is ready and accepting connections."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            result = sock.connect_ex((host, port))
            sock.close()
            if result == 0:
                return True
        except:
            pass
        time.sleep(0.5)
    return False

def main():
    """Main launcher function."""
    try:
        # Get the application directory
        if getattr(sys, 'frozen', False):
            # PyInstaller creates a temporary folder
            app_dir = Path(sys.executable).parent
        else:
            # Running from source
            app_dir = Path(__file__).parent
        
        # Resolve paths
        backend_dir = app_dir / 'backend'
        frontend_dist_dir = app_dir / 'frontend' / 'dist'
        
        # Verify backend exists
        if not backend_dir.exists() or not (backend_dir / 'app.py').exists():
            print(f"Error: Backend not found at {backend_dir}")
            input("Press Enter to exit...")
            sys.exit(1)
        
        # Find a free port
        try:
            port = find_free_port(8000)
        except RuntimeError as e:
            print(f"Error: {e}")
            input("Press Enter to exit...")
            sys.exit(1)
        
        print("=" * 60)
        print("           ROI Analyzer - Starting Server")
        print("=" * 60)
        print(f"\nLooking for free port... Found port {port}")
        print(f"Starting ROI Analyzer backend server...")
        print(f"URL: http://127.0.0.1:{port}\n")
        
        # Prepare environment
        env = os.environ.copy()
        env['PYTHONUNBUFFERED'] = '1'
        
        # Start the FastAPI server
        uvicorn_cmd = [
            sys.executable, '-m', 'uvicorn',
            'app:app',
            '--host', '127.0.0.1',
            '--port', str(port),
            '--log-level', 'warning'
        ]
        
        # Create process with appropriate flags
        creationflags = subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == 'win32' else 0
        
        try:
            server_process = subprocess.Popen(
                uvicorn_cmd,
                cwd=str(backend_dir),
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=creationflags,
                universal_newlines=True,
                bufsize=1
            )
        except FileNotFoundError:
            print("Error: Could not start server. Make sure Python is in PATH.")
            input("Press Enter to exit...")
            sys.exit(1)
        
        # Wait for server to be ready
        print("Waiting for server to start...")
        if not check_port_ready('127.0.0.1', port):
            stdout, stderr = server_process.communicate()
            print("Error starting backend server:")
            if stderr:
                print(stderr)
            input("Press Enter to exit...")
            sys.exit(1)
        
        print("✓ Backend server started successfully!")
        time.sleep(1)
        
        # Open web frontend
        url = f'http://127.0.0.1:{port}'
        print(f"\nOpening ROI Analyzer in your browser...")
        print(f"URL: {url}")
        
        # Try to open browser
        try:
            webbrowser.open(url, new=2)  # new=2 opens in new tab/window
        except Exception as e:
            print(f"Could not open browser: {e}")
            print(f"Please manually visit: {url}")
        
        print("\n" + "=" * 60)
        print("Server is running. Close this window to stop ROI Analyzer.")
        print("=" * 60 + "\n")
        
        # Keep the process alive and monitor
        while True:
            if server_process.poll() is not None:
                # Server process ended
                stdout, stderr = server_process.communicate()
                if stderr:
                    print(f"Server error: {stderr}")
                break
            time.sleep(1)
    
    except KeyboardInterrupt:
        print("\n\nShutting down...")
        if 'server_process' in locals():
            server_process.terminate()
            server_process.wait()
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        input("Press Enter to exit...")
        sys.exit(1)

if __name__ == '__main__':
    main()

