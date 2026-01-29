@echo off
REM Script para iniciar el servidor Hytale en Windows
REM Compatible con Windows 10/11

setlocal enabledelayedexpansion

set "SCREEN_NAME=HytaleServer"
set "SERVER_DIR=%~dp0"
set "SERVER_JAR=HytaleServer.jar"
set "ASSETS_ZIP=Assets.zip"
set "LOG_FILE=%SERVER_DIR%server.log"
set "CONFIG_FILE=%SERVER_DIR%server-config.json"
set "PID_FILE=%SERVER_DIR%server.pid"

REM Valores por defecto
set "DEFAULT_THREADS=4"
set "DEFAULT_RAM_MIN=2048"
set "DEFAULT_RAM_MAX=4096"

echo [INFO] Directorio del servidor: %SERVER_DIR%

REM Cargar configuración desde archivo JSON si existe
if exist "%CONFIG_FILE%" (
    echo [INFO] Cargando configuracion desde %CONFIG_FILE%
    
    REM Extraer valores del JSON usando findstr y for
    for /f "tokens=2 delims=:, " %%a in ('findstr "threads" "%CONFIG_FILE%"') do set "THREADS=%%a"
    for /f "tokens=2 delims=:, " %%a in ('findstr "ramMin" "%CONFIG_FILE%"') do set "RAM_MIN=%%a"
    for /f "tokens=2 delims=:, " %%a in ('findstr "ramMax" "%CONFIG_FILE%"') do set "RAM_MAX=%%a"
    
    REM Limpiar valores (remover espacios y caracteres extra)
    set "THREADS=!THREADS: =!"
    set "RAM_MIN=!RAM_MIN: =!"
    set "RAM_MAX=!RAM_MAX: =!"
) else (
    echo [INFO] Usando configuracion por defecto
    set "THREADS=%DEFAULT_THREADS%"
    set "RAM_MIN=%DEFAULT_RAM_MIN%"
    set "RAM_MAX=%DEFAULT_RAM_MAX%"
)

REM Convertir MB a formato de Java
set "XMS=%RAM_MIN%M"
set "XMX=%RAM_MAX%M"
set "ACTIVE_PROCESSORS=%THREADS%"

echo [INFO] Configuracion:
echo [INFO]   - Hilos CPU: %THREADS%
echo [INFO]   - RAM Minima: %XMS%
echo [INFO]   - RAM Maxima: %XMX%

REM Validar que estamos en el directorio correcto
if not exist "%SERVER_DIR%%SERVER_JAR%" (
    echo [ERROR] No se encontro %SERVER_JAR% en %SERVER_DIR%
    pause
    exit /b 1
)

if not exist "%SERVER_DIR%%ASSETS_ZIP%" (
    echo [ERROR] No se encontro %ASSETS_ZIP% en %SERVER_DIR%
    pause
    exit /b 1
)

cd /d "%SERVER_DIR%"

REM Verificar si ya existe un proceso del servidor
if exist "%PID_FILE%" (
    set /p OLD_PID=<"%PID_FILE%"
    tasklist /FI "PID eq !OLD_PID!" 2>NUL | find /I /N "java.exe">NUL
    if "!ERRORLEVEL!"=="0" (
        echo [AVISO] El servidor ya esta corriendo con PID: !OLD_PID!
        echo [AVISO] Para detenerlo ejecuta: stop-server.bat
        pause
        exit /b 1
    ) else (
        echo [INFO] Limpiando PID antiguo...
        del "%PID_FILE%" 2>NUL
    )
)

REM Validar que Java este instalado
where java >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Java no esta instalado o no esta en el PATH
    echo [ERROR] Por favor instala Java 25 desde:
    echo [ERROR]   - https://www.oracle.com/java/technologies/downloads/
    echo [ERROR]   - https://adoptium.net/
    pause
    exit /b 1
)

REM Obtener version de Java
echo [OK] Verificando version de Java...
java -version 2>&1 | findstr /C:"version"

REM Iniciar servidor en segundo plano
echo [INFO] Iniciando servidor Hytale...
echo [INFO] Los logs se guardaran en: %LOG_FILE%

REM Crear archivo temporal para el comando
set "TEMP_SCRIPT=%TEMP%\hytale_start_%RANDOM%.bat"

REM Escribir comando al archivo temporal
echo @echo off > "%TEMP_SCRIPT%"
echo cd /d "%SERVER_DIR%" >> "%TEMP_SCRIPT%"
echo java -Xms%XMS% -Xmx%XMX% -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:+AlwaysPreTouch -XX:+UseStringDeduplication -XX:+UnlockExperimentalVMOs -XX:ActiveProcessorCount=%ACTIVE_PROCESSORS% -XX:+ParallelRefProcEnabled -jar "%SERVER_JAR%" --assets "%ASSETS_ZIP%" ^>^> "%LOG_FILE%" 2^>^&1 >> "%TEMP_SCRIPT%"

REM Iniciar el servidor usando el archivo temporal
start "Hytale Server" /MIN cmd /c ""%TEMP_SCRIPT%"" ^& del "%TEMP_SCRIPT%"

REM Esperar un momento para obtener el PID
timeout /t 2 /nobreak >nul

REM Obtener el PID del proceso Java
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq java.exe" /FI "WINDOWTITLE eq Hytale Server" /NH') do (
    set "SERVER_PID=%%a"
    goto :found_pid
)

REM Buscar cualquier proceso java.exe reciente (fallback)
for /f "skip=1 tokens=2" %%a in ('tasklist /FI "IMAGENAME eq java.exe" /NH') do (
    set "SERVER_PID=%%a"
    goto :found_pid
)

:found_pid
if defined SERVER_PID (
    echo %SERVER_PID%>"%PID_FILE%"
    echo.
    echo [OK] Servidor iniciado correctamente con PID: %SERVER_PID%
    echo.
    echo Comandos utiles:
    echo   Ver logs:     type "%LOG_FILE%"
    echo   Seguir logs:  powershell Get-Content "%LOG_FILE%" -Wait -Tail 20
    echo   Detener:      stop-server.bat
    echo.
) else (
    echo.
    echo [ERROR] No se pudo obtener el PID del servidor
    echo [INFO] El servidor puede estar ejecutandose igualmente
    echo [INFO] Verifica el archivo de log: %LOG_FILE%
    echo.
)

REM No hacer pausa para que el script termine y el servidor siga corriendo
exit /b 0
