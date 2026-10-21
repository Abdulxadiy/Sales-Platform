; Native NSIS installer. The uninstaller is generated at install time, so the
; same script builds on Linux and Windows without executing Windows binaries.
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
!include "extractAppPackage.nsh"

Name "ILBI"
InstallDir "$LOCALAPPDATA\Programs\ILBI"
InstallDirRegKey HKCU "Software\ILBI\Desktop" "InstallDir"
RequestExecutionLevel user
SetCompressor zlib
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TEXT "Install ILBI for this Windows account.$\r$\n$\r$\nClose ILBI before installing an update. Your store database and unsent operations are kept separately and will be preserved."
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Function .onInit
  SetShellVarContext current
  SetRegView 64
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "ILBI requires 64-bit Windows."
    Abort
  ${EndIf}
  nsProcess::_FindProcess "ILBI.exe"
  Pop $R0
  ${If} $R0 == 0
    MessageBox MB_ICONSTOP "Close ILBI on this computer before installing an update."
    Abort
  ${EndIf}
FunctionEnd

Function .onVerifyInstDir
  ; The application data folder must never become the program/uninstall folder.
  StrLen $R0 "$APPDATA\ILBI"
  StrCpy $R1 "$INSTDIR" $R0
  StrCmp $R1 "$APPDATA\ILBI" invalid
  IfFileExists "$INSTDIR\ilbi-installation.id" checkExisting
  IfFileExists "$INSTDIR\*.*" invalid valid
checkExisting:
  FileOpen $R0 "$INSTDIR\ilbi-installation.id" r
  FileRead $R0 $R1
  FileClose $R0
  StrCmp $R1 "uz.ilbi.desktop" valid invalid
invalid:
  Abort
valid:
FunctionEnd

Section "ILBI"
  Call .onVerifyInstDir
  SetShellVarContext current
  SetRegView 64
  SetOutPath "$INSTDIR"
  !insertmacro extractEmbeddedAppPackage
  IfFileExists "$INSTDIR\ILBI.exe" +3
    MessageBox MB_ICONSTOP "ILBI could not be extracted. No store data was changed."
    Abort
  FileOpen $R0 "$INSTDIR\ilbi-installation.id" w
  FileWrite $R0 "uz.ilbi.desktop"
  FileClose $R0
  WriteUninstaller "$INSTDIR\Uninstall ILBI.exe"
  CreateDirectory "$SMPROGRAMS\ILBI"
  CreateShortcut "$SMPROGRAMS\ILBI\ILBI.lnk" "$INSTDIR\ILBI.exe"
  CreateShortcut "$DESKTOP\ILBI.lnk" "$INSTDIR\ILBI.exe"
  WriteRegStr HKCU "Software\ILBI\Desktop" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ILBI" "DisplayName" "ILBI"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ILBI" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ILBI" "Publisher" "ILBI"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ILBI" "DisplayIcon" "$INSTDIR\ILBI.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ILBI" "UninstallString" '"$INSTDIR\Uninstall ILBI.exe"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ILBI" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ILBI" "NoRepair" 1
SectionEnd

Section "Uninstall"
  SetShellVarContext current
  SetRegView 64
  nsProcess::_FindProcess "ILBI.exe"
  Pop $R0
  ${If} $R0 == 0
    MessageBox MB_ICONSTOP "Close ILBI before uninstalling it."
    Abort
  ${EndIf}
  IfFileExists "$INSTDIR\ilbi-installation.id" 0 refuseUninstall
  FileOpen $R0 "$INSTDIR\ilbi-installation.id" r
  FileRead $R0 $R1
  FileClose $R0
  StrCmp $R1 "uz.ilbi.desktop" 0 refuseUninstall
  Delete "$DESKTOP\ILBI.lnk"
  Delete "$SMPROGRAMS\ILBI\ILBI.lnk"
  RMDir "$SMPROGRAMS\ILBI"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ILBI"
  DeleteRegKey HKCU "Software\ILBI\Desktop"
  ; Store data at $APPDATA\ILBI is deliberately retained, including the outbox.
  RMDir /r "$INSTDIR"
  Goto doneUninstall
refuseUninstall:
  MessageBox MB_ICONSTOP "ILBI installation marker is missing. No files were removed."
doneUninstall:
SectionEnd
