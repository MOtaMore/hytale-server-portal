; Hytale Server Portal - NSIS Uninstaller Script
; Esta secuencia se ejecuta cuando el usuario desinstala la aplicación

Function "un.onInit"
  ; Crear diálogo de limpieza de datos
  MessageBox MB_YESNO "¿Deseas eliminar todos los datos de Hytale Server Portal?$\n$\nEsta acción eliminará:$\n  • Configuración$\n  • Credenciales$\n  • Backups$\n  • Logs$\n$\nPero NO eliminará el servidor Hytale.$\n$\n¿Deseas continuar?" IDYES deleteData IDNO done
  
  deleteData:
    DetailPrint "Eliminando datos de AppData..."
    SetShellVarContext current
    
    ; Ruta de datos del usuario
    StrCpy $0 "$APPDATA\Hytale Server Portal"
    
    ; Eliminar la carpeta si existe
    RMDir /r "$0"
    DetailPrint "Datos eliminados: $0"
    
  done:
FunctionEnd
