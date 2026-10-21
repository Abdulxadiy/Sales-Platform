; Native NSIS installer. The uninstaller is generated at install time, so the
; same script builds on Linux and Windows without executing Windows binaries.
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
!include "FileFunc.nsh"
!include "extractAppPackage.nsh"

Name "ILBI"
InstallDir "$LOCALAPPDATA\Programs\ILBI"
InstallDirRegKey HKCU "Software\ILBI\Desktop" "InstallDir"
RequestExecutionLevel user
SetCompressor zlib
!define MUI_ABORTWARNING
Var AutoUpdate
Var RestartApp
Var InstallTarget
Var UpdateStaging
Var UpdateBackup
!define MUI_WELCOMEPAGE_TEXT "Install or update ILBI for this Windows account.$\r$\n$\r$\nA running ILBI will close safely and reopen after updating. Your store database and unsent operations are preserved. Save open forms before continuing."
!define MUI_PAGE_CUSTOMFUNCTION_PRE SkipForUpdate
!insertmacro MUI_PAGE_WELCOME
!define MUI_PAGE_CUSTOMFUNCTION_PRE SkipForUpdate
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_PAGE_CUSTOMFUNCTION_PRE SkipForUpdate
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
  StrCpy $AutoUpdate 0
  StrCpy $RestartApp 0
  ${GetParameters} $R0
  ClearErrors
  ${GetOptions} $R0 "/ILBIUPDATE" $R1
  ${IfNot} ${Errors}
    StrCpy $AutoUpdate 1
    StrCpy $RestartApp 1
    SetAutoClose true
  ${EndIf}
FunctionEnd

Function SkipForUpdate
  ${If} $AutoUpdate == 1
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
  StrCpy $InstallTarget $INSTDIR
  System::Call 'kernel32::GetCurrentProcessId() i .r0'
  StrCpy $UpdateStaging "$INSTDIR.update-$0"
  StrCpy $UpdateBackup "$INSTDIR.previous-$0"
  IfFileExists "$UpdateStaging\*.*" installationFailed
  IfFileExists "$UpdateBackup\*.*" installationFailed
  StrCpy $INSTDIR $UpdateStaging
  SetOutPath "$UpdateStaging"
  !insertmacro extractEmbeddedAppPackage
  StrCpy $INSTDIR $InstallTarget
  IfFileExists "$UpdateStaging\ILBI.exe" 0 installationFailed
  InitPluginsDir
  File /oname=$PLUGINSDIR\ilbi-close.ps1 "${PROJECT_DIR}\windows-close.ps1"
  ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\ilbi-close.ps1" -InstallDirectory "$INSTDIR"' $R0
  ${If} $R0 == 10
    StrCpy $RestartApp 1
  ${ElseIf} $R0 != 0
    MessageBox MB_ICONSTOP "ILBI is still finishing work. The current application and store data were preserved. Please retry after it finishes."
    SetErrorLevel 1
    Quit
  ${EndIf}
  SetOutPath "$TEMP"
  ClearErrors
  IfFileExists "$INSTDIR\ILBI.exe" 0 noPreviousInstallation
  Rename "$INSTDIR" "$UpdateBackup"
  IfErrors installationFailed
  Goto activateInstallation
noPreviousInstallation:
  RMDir "$INSTDIR"
activateInstallation:
  ClearErrors
  Rename "$UpdateStaging" "$INSTDIR"
  IfErrors restoreInstallation
  RMDir /r "$UpdateBackup"
  SetOutPath "$INSTDIR"
  FileOpen $R0 "$INSTDIR\ilbi-installation.id" w
  FileWrite $R0 "uz.ilbi.desktop"
  FileClose $R0
  WriteUninstaller "$INSTDIR\Uninstall ILBI.exe"
  CreateDirectory "$SMPROGRAMS\ILBI"
  CreateShortcut "$SMPROGRAMS\ILBI\ILBI.lnk" "$INSTDIR\ILBI.exe" "" "$INSTDIR\resources\ilbi-desktop-rounded.ico" 0
  CreateShortcut "$DESKTOP\ILBI.lnk" "$INSTDIR\ILBI.exe" "" "$INSTDIR\resources\ilbi-desktop-rounded.ico" 0
  WinShell::SetLnkAUMI "$SMPROGRAMS\ILBI\ILBI.lnk" "${APP_ID}"
  WinShell::SetLnkAUMI "$DESKTOP\ILBI.lnk" "${APP_ID}"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
  WriteRegStr HKCU "Software\ILBI\Desktop" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ILBI" "DisplayName" "ILBI"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ILBI" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ILBI" "Publisher" "ILBI"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ILBI" "DisplayIcon" "$INSTDIR\resources\ilbi-desktop-rounded.ico"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ILBI" "UninstallString" '"$INSTDIR\Uninstall ILBI.exe"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ILBI" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ILBI" "NoRepair" 1
  ${If} $RestartApp == 1
    Exec '"$INSTDIR\ILBI.exe" --ilbi-updated'
  ${EndIf}
  Goto installationDone
restoreInstallation:
  Rename "$UpdateBackup" "$INSTDIR"
installationFailed:
  StrCpy $INSTDIR $InstallTarget
  ${If} $RestartApp == 1
    IfFileExists "$INSTDIR\ILBI.exe" 0 +2
      Exec '"$INSTDIR\ILBI.exe" --ilbi-update-failed'
  ${EndIf}
  MessageBox MB_ICONSTOP "ILBI could not be updated. The previous installation and store data were preserved."
  SetErrorLevel 1
  Quit
installationDone:
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
  WinShell::UninstShortcut "$DESKTOP\ILBI.lnk"
  WinShell::UninstShortcut "$SMPROGRAMS\ILBI\ILBI.lnk"
  WinShell::UninstAppUserModelId "${APP_ID}"
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
