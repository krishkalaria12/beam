; Beam NSIS installer — GPUI build (plan G3, Windows lane)
; No WebView2 bootstrapper. Registers beam:// and raycast:// URL schemes.

!define APP_NAME "Beam"
!define APP_PUBLISHER "Krish Kalaria"
!define APP_URL "https://github.com/krishkalaria12/beam"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
!define SCHEMES_ROOT "Software\Classes"

Name "${APP_NAME}"
OutFile "beam-setup.exe"
InstallDir "$LOCALAPPDATA\Programs\beam"
RequestExecutionLevel user
Unicode true

!if "${VERSION}" == ""
  !define VERSION "0.0.0-dev"
!endif

VIProductVersion "0.0.0.0"
VIAddVersionKey /LANG=1033 "ProductName" "${APP_NAME}"
VIAddVersionKey /LANG=1033 "FileDescription" "${APP_NAME} launcher"
VIAddVersionKey /LANG=1033 "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=1033 "ProductVersion" "${VERSION}"

Page directory
Page instfiles
UninstPage uninstConfirm
UninstPage instfiles

Section "Install"
    SetOutPath "$INSTDIR"

    File "/oname=beam.exe" "..\..\target\rust\release\beam.exe"

    ; Start Menu shortcut
    CreateDirectory "$SMPROGRAMS\${APP_NAME}"
    CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\beam.exe"

    ; URL scheme registration (beam:// and raycast://) — the dev-mode
    ; registration from lib.rs becomes the installer's job (plan §03).
    WriteRegStr "${SCHEMES_ROOT}\beam" "" "URL:beam"
    WriteRegStr "${SCHEMES_ROOT}\beam" "URL Protocol" ""
    WriteRegStr "${SCHEMES_ROOT}\beam\shell\open\command" "" '"$INSTDIR\beam.exe" "%1"'

    WriteRegStr "${SCHEMES_ROOT}\raycast" "" "URL:raycast"
    WriteRegStr "${SCHEMES_ROOT}\raycast" "URL Protocol" ""
    WriteRegStr "${SCHEMES_ROOT}\raycast\shell\open\command" "" '"$INSTDIR\beam.exe" "%1"'

    ; Uninstall metadata
    WriteRegStr "${UNINST_KEY}" "DisplayName" "${APP_NAME}"
    WriteRegStr "${UNINST_KEY}" "DisplayVersion" "${VERSION}"
    WriteRegStr "${UNINST_KEY}" "Publisher" "${APP_PUBLISHER}"
    WriteRegStr "${UNINST_KEY}" "URLInfoAbout" "${APP_URL}"
    WriteRegStr "${UNINST_KEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
    WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

Section "Uninstall"
    Delete "$INSTDIR\beam.exe"
    Delete "$INSTDIR\uninstall.exe"
    RMDir "$INSTDIR"
    Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
    RMDir "$SMPROGRAMS\${APP_NAME}"

    DeleteRegKey "${SCHEMES_ROOT}\beam"
    DeleteRegKey "${SCHEMES_ROOT}\raycast"
    DeleteRegKey "${UNINST_KEY}"
SectionEnd
