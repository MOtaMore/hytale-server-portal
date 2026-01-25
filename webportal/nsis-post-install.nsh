; Hytale Server Portal - NSIS Custom Script
; This script is included by electron-builder's NSIS installer
; It adds a post-installation hook to run npm install

!include "MUI2.nsh"
!include "FileFunc.nsh"

; After the installer finishes, run a batch script to install dependencies
!macro customInstall
  CreateDirectory "$INSTDIR"
  
  ; Create setup batch file in installation directory
  FileOpen $0 "$INSTDIR\setup-deps.bat" w
  FileWrite $0 "@echo off$\r$\n"
  FileWrite $0 "echo Installing dependencies for Hytale Server Portal...$\r$\n"
  FileWrite $0 "cd /d $\"$INSTDIR$\"$\r$\n"
  FileWrite $0 "title Hytale Server Portal - Installing Dependencies$\r$\n"
  FileWrite $0 "npm install --production$\r$\n"
  FileWrite $0 "if %ERRORLEVEL% EQU 0 ($\r$\n"
  FileWrite $0 "  echo.$\r$\n"
  FileWrite $0 "  echo Installation successful!$\r$\n"
  FileWrite $0 "  echo Application is ready to use.$\r$\n"
  FileWrite $0 "  timeout /t 3 /nobreak$\r$\n"
  FileWrite $0 "  exit /b 0$\r$\n"
  FileWrite $0 ") else ($\r$\n"
  FileWrite $0 "  echo.$\r$\n"
  FileWrite $0 "  echo Error: Failed to install dependencies!$\r$\n"
  FileWrite $0 "  echo Please ensure Node.js and npm are installed.$\r$\n"
  FileWrite $0 "  echo.$\r$\n"
  FileWrite $0 "  pause$\r$\n"
  FileWrite $0 "  exit /b 1$\r$\n"
  FileWrite $0 ")$\r$\n"
  FileClose $0
  
  ; Store batch file path for later execution
  WriteRegStr HKCU "Software\HytaleServerPortal" "SetupBatchFile" "$INSTDIR\setup-deps.bat"
!macroend

; After installation completes, offer to run npm install
!macro customFinish
  SetShellVarContext all
  IfFileExists "$INSTDIR\setup-deps.bat" 0 +3
    MessageBox MB_YESNO "Would you like to install application dependencies now?$\n$\nThis will download and install required npm packages.$\n$\n(Requires Node.js and npm to be installed)" IDYES installDeps IDNO skipDeps
    
    installDeps:
      SetOutPath "$INSTDIR"
      ExecShell "open" "$INSTDIR\setup-deps.bat"
      Goto done
    
    skipDeps:
      MessageBox MB_ICONINFORMATION "You can manually install dependencies later by running:$\n$\ncd $\"$INSTDIR$\"$\nnpm install --production"
  
  done:
!macroend
