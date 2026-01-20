; ROI Analyzer NSIS Installer
; A professional installer for the ROI Analyzer application

!include "MUI2.nsh"
!include "FileFunc.nsh"

; ===============================================
; Constants and Settings
; ===============================================

Name "ROI Analyzer"
OutFile "ROI_Analyzer_Installer.exe"
InstallDir "$PROGRAMFILES64\ROIAnalyzer"
RequestExecutionLevel admin

; ===============================================
; MUI Settings
; ===============================================

!define MUI_ABORTWARNING

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

; ===============================================
; Installer Sections
; ===============================================

Section "Install ROI Analyzer"
    SetOutPath "$INSTDIR"
    
    ; Create backend subdirectory
    CreateDirectory "$INSTDIR\backend"
    SetOutPath "$INSTDIR\backend"
    File /r "backend\*.*"
    
    ; Create frontend subdirectory
    CreateDirectory "$INSTDIR\frontend"
    SetOutPath "$INSTDIR\frontend\dist"
    File /r "frontend\dist\*.*"
    
    ; Copy launcher files
    SetOutPath "$INSTDIR"
    File "run_roi.bat"
    File "launcher.py"
    File "INSTALLATION_GUIDE.md"
    File "LICENSE"
    
    ; Create Start Menu shortcuts
    CreateDirectory "$SMPROGRAMS\ROI Analyzer"
    CreateShortCut "$SMPROGRAMS\ROI Analyzer\ROI Analyzer.lnk" "$INSTDIR\run_roi.bat"
    CreateShortCut "$SMPROGRAMS\ROI Analyzer\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
    
    ; Create Desktop shortcut
    CreateShortCut "$DESKTOP\ROI Analyzer.lnk" "$INSTDIR\run_roi.bat"
    
    ; Write registry keys for uninstall
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ROIAnalyzer" \
        "DisplayName" "ROI Analyzer"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ROIAnalyzer" \
        "UninstallString" "$INSTDIR\Uninstall.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ROIAnalyzer" \
        "DisplayVersion" "1.0.0"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ROIAnalyzer" \
        "Publisher" "ROI Analyzer Team"
    
    ; Write uninstall exe
    WriteUninstaller "$INSTDIR\Uninstall.exe"
    
    DetailPrint "Installation Complete!"
    MessageBox MB_OK "ROI Analyzer has been successfully installed!$\n$\nYou can launch it from:$\n- Start Menu > ROI Analyzer$\n- Desktop shortcut"
SectionEnd

; ===============================================
; Uninstaller Section
; ===============================================

Section "Uninstall"
    ; Remove shortcuts
    Delete "$SMPROGRAMS\ROI Analyzer\ROI Analyzer.lnk"
    Delete "$SMPROGRAMS\ROI Analyzer\Uninstall.lnk"
    RMDir "$SMPROGRAMS\ROI Analyzer"
    Delete "$DESKTOP\ROI Analyzer.lnk"
    
    ; Remove files and directories
    RMDir /r "$INSTDIR\backend"
    RMDir /r "$INSTDIR\frontend"
    Delete "$INSTDIR\run_roi.bat"
    Delete "$INSTDIR\launcher.py"
    Delete "$INSTDIR\INSTALLATION_GUIDE.md"
    Delete "$INSTDIR\LICENSE"
    Delete "$INSTDIR\Uninstall.exe"
    RMDir "$INSTDIR"
    
    ; Remove registry keys
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ROIAnalyzer"
    
    MessageBox MB_OK "ROI Analyzer has been uninstalled."
SectionEnd

; ===============================================
; Functions
; ===============================================

Function .onInstFailed
    MessageBox MB_OK "Installation failed. Please check that you have admin rights and sufficient disk space."
FunctionEnd


