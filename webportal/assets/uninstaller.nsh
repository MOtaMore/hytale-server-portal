; Hytale Server Portal - NSIS Uninstaller Script
; Esta secuencia se ejecuta cuando el usuario desinstala la aplicación

Function "un.onInit"
  ; Crear diálogo de limpieza de datos
  MessageBox MB_YESNO "¿Deseas eliminar todos los datos de Hytale Server Portal?$\n$\nEsta acción eliminará:$\n  • Configuración$\n  • Credenciales$\n  • Backups$\n  • Logs$\n$\nPero NO eliminará el servidor Hytale.$\n$\n¿Deseas continuar?" IDYES deleteData IDNO skipDelete
  
  deleteData:
    DetailPrint "Eliminando datos de AppData..."
    SetShellVarContext current
    
    ; Ruta de datos del usuario
    StrCpy $0 "$APPDATA\Hytale Server Portal"
    
    ; Verificar si existe la carpeta
    ${If} ${FileExists} "$0"
      RMDir /r "$0"
      DetailPrint "Datos eliminados: $0"
    ${EndIf}
    
    ; También limpiar la carpeta de Program Files si existe
    RMDir /r "$INSTDIR\..\Hytale Server Portal"
    
    Goto done
  
  skipDelete:
    DetailPrint "Datos conservados en: $APPDATA\Hytale Server Portal"
  
  done:
FunctionEnd
