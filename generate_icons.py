"""Generate Tauri icons from logo image"""
import subprocess
from pathlib import Path

# Download logo and create icons
logo_url = "https://raw.githubusercontent.com/Leonardosaved/pores/main/logo.png"

# For now, we'll use ImageMagick to create icons from the default Tauri icon
# You can replace this later with your actual logo

icon_dir = Path("frontend/src-tauri/icons")
base_icon = icon_dir / "icon.png"

# Sizes needed for Windows
sizes = [
    (32, "32x32.png"),
    (64, "128x128.png"),  # Will be resized
    (128, "128x128.png"),
    (256, "128x128@2x.png"),
    (256, "Square107x107Logo.png"),  # Will resize to 107x107
    (284, "Square142x142Logo.png"),  # Will resize
    (300, "Square150x150Logo.png"),  # Will resize
    (568, "Square284x284Logo.png"),
    (60, "Square30x30Logo.png"),
    (600, "Square310x310Logo.png"),
    (88, "Square44x44Logo.png"),
    (142, "Square71x71Logo.png"),
    (178, "Square89x89Logo.png"),
    (79, "StoreLogo.png"),
]

print("Icons directory is ready!")
print(f"Icon sizes to generate: {len(sizes)}")
print("Use ImageMagick or an online tool to resize your ROI logo to these dimensions")
print(f"Place images in: {icon_dir}")
