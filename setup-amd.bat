@echo off
REM Script de configuración para AMD - Recompila módulos nativos para compatibilidad Windows

echo.
echo 🔧 Configurando aplicación para procesador AMD (Windows)...
echo.

REM Verificar si npm está instalado
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm no está instalado. Por favor, instala Node.js desde https://nodejs.org
    pause
    exit /b 1
)

echo ✓ npm encontrado
echo.

echo 📦 Recompilando módulos nativos para AMD...
call npm run rebuild:native

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error durante la recompilación
    echo.
    echo Intenta ejecutar de todas formas:
    echo   npm run dev:amd    (RECOMENDADO para AMD)
    echo   npm run dev:nogpu  (alternativa)
    pause
    exit /b 1
)

echo ✓ Recompilación exitosa
echo.

echo 📥 Reinstalando dependencias...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error durante npm install
    pause
    exit /b 1
)

echo.
echo ✅ ¡Configuración completada!
echo.
echo Ahora puedes ejecutar:
echo   npm run dev:amd    (RECOMENDADO para AMD - sin sandbox)
echo   npm run dev:nogpu  (alternativa sin GPU)
echo.
pause
