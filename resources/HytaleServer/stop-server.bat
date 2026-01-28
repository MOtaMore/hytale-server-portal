@echo off
REM Script para detener el servidor Hytale en Windows
REM Compatible con Windows 10/11

setlocal enabledelayedexpansion

set "SERVER_DIR=%~dp0"
set "PID_FILE=%SERVER_DIR%server.pid"
set "SCREEN_NAME=HytaleServer"

echo [INFO] Deteniendo servidor Hytale...

REM Verificar si existe el archivo PID
if exist "%PID_FILE%" (
    set /p SERVER_PID=<"%PID_FILE%"
    echo [INFO] PID encontrado: !SERVER_PID!
    
    REM Verificar si el proceso existe
    tasklist /FI "PID eq !SERVER_PID!" 2>NUL | find /I /N "java.exe">NUL
    if "!ERRORLEVEL!"=="0" (
        echo [INFO] Enviando señal de terminacion al servidor...
        
        REM Intentar cierre graceful primero (SIGTERM equivalente)
        taskkill /PID !SERVER_PID! >nul 2>&1
        
        REM Esperar 5 segundos para cierre graceful
        timeout /t 5 /nobreak >nul
        
        REM Verificar si aun esta corriendo
        tasklist /FI "PID eq !SERVER_PID!" 2>NUL | find /I /N "java.exe">NUL
        if "!ERRORLEVEL!"=="0" (
            echo [AVISO] El servidor no respondio al cierre graceful
            echo [INFO] Forzando cierre del servidor...
            taskkill /F /PID !SERVER_PID! >nul 2>&1
            timeout /t 2 /nobreak >nul
        )
        
        REM Verificar si se detuvo correctamente
        tasklist /FI "PID eq !SERVER_PID!" 2>NUL | find /I /N "java.exe">NUL
        if "!ERRORLEVEL!"=="0" (
            echo [ERROR] No se pudo detener el servidor (PID: !SERVER_PID!)
            echo [ERROR] Intenta cerrar manualmente:
            echo [ERROR]   taskkill /F /PID !SERVER_PID!
            pause
            exit /b 1
        ) else (
            echo [OK] Servidor detenido correctamente
            del "%PID_FILE%" 2>NUL
        )
    ) else (
        echo [AVISO] No se encontro proceso con PID !SERVER_PID!
        echo [INFO] El servidor puede haberse detenido previamente
        del "%PID_FILE%" 2>NUL
    )
) else (
    echo [AVISO] No se encontro archivo PID
    echo [INFO] Buscando procesos Java del servidor...
    
    REM Buscar todos los procesos java.exe que puedan ser el servidor
    set "FOUND=0"
    for /f "skip=1 tokens=2" %%a in ('tasklist /FI "IMAGENAME eq java.exe" /NH 2^>NUL') do (
        set "JAVA_PID=%%a"
        REM Verificar si el proceso tiene el JAR del servidor
        wmic process where "ProcessId=!JAVA_PID!" get CommandLine 2>NUL | findstr /I "HytaleServer.jar" >NUL
        if "!ERRORLEVEL!"=="0" (
            echo [INFO] Encontrado servidor Hytale con PID: !JAVA_PID!
            echo [INFO] Deteniendo proceso...
            taskkill /PID !JAVA_PID! >nul 2>&1
            timeout /t 3 /nobreak >nul
            taskkill /F /PID !JAVA_PID! >nul 2>&1
            set "FOUND=1"
            echo [OK] Servidor detenido
        )
    )
    
    if "!FOUND!"=="0" (
        echo [INFO] No se encontraron procesos del servidor Hytale corriendo
    )
)

echo.
echo [INFO] Operacion completada
pause
exit /b 0
