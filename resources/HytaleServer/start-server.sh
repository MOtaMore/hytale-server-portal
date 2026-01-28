#!/bin/bash
# Script para iniciar el servidor Hytale en screen
# Sistema portable - compatible con Ubuntu 24 LTS

set -e

SCREEN_NAME="HytaleServer"
SERVER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_JAR="HytaleServer.jar"
ASSETS_ZIP="Assets.zip"
LOG_FILE="$SERVER_DIR/server.log"
CONFIG_FILE="$SERVER_DIR/server-config.json"

# Valores por defecto
DEFAULT_THREADS=4
DEFAULT_RAM_MIN=2048
DEFAULT_RAM_MAX=4096

# Cargar configuración desde archivo JSON si existe
if [ -f "$CONFIG_FILE" ]; then
    echo "[INFO] Cargando configuración desde $CONFIG_FILE"
    
    # Extraer valores del JSON usando grep y sed (compatible sin jq)
    THREADS=$(grep -oP '"threads"\s*:\s*\K\d+' "$CONFIG_FILE" 2>/dev/null || echo $DEFAULT_THREADS)
    RAM_MIN=$(grep -oP '"ramMin"\s*:\s*\K\d+' "$CONFIG_FILE" 2>/dev/null || echo $DEFAULT_RAM_MIN)
    RAM_MAX=$(grep -oP '"ramMax"\s*:\s*\K\d+' "$CONFIG_FILE" 2>/dev/null || echo $DEFAULT_RAM_MAX)
else
    echo "[INFO] Usando configuración por defecto"
    THREADS=$DEFAULT_THREADS
    RAM_MIN=$DEFAULT_RAM_MIN
    RAM_MAX=$DEFAULT_RAM_MAX
fi

# Convertir MB a formato de Java
XMS="${RAM_MIN}M"
XMX="${RAM_MAX}M"
ACTIVE_PROCESSORS=$THREADS

# Calcular CPU_SET (usar hilos secuenciales desde 0)
if [ $THREADS -gt 1 ]; then
    CPU_SET="0-$((THREADS-1))"
else
    CPU_SET="0"
fi

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}[INFO]${NC} Directorio del servidor: $SERVER_DIR"
echo -e "${YELLOW}[INFO]${NC} Configuración:"
echo -e "${YELLOW}[INFO]${NC}   - Hilos CPU: $THREADS (CPU Set: $CPU_SET)"
echo -e "${YELLOW}[INFO]${NC}   - RAM Mínima: $XMS"
echo -e "${YELLOW}[INFO]${NC}   - RAM Máxima: $XMX"

# Validar que estamos en el directorio correcto
if [ ! -f "$SERVER_DIR/$SERVER_JAR" ]; then
    echo -e "${RED}[ERROR]${NC} No se encontró $SERVER_JAR en $SERVER_DIR"
    exit 1
fi

if [ ! -f "$SERVER_DIR/$ASSETS_ZIP" ]; then
    echo -e "${RED}[ERROR]${NC} No se encontró $ASSETS_ZIP en $SERVER_DIR"
    exit 1
fi

cd "$SERVER_DIR" || exit 1

# Verificar si ya existe una sesión de screen
if screen -list 2>/dev/null | grep -E "[0-9]+\\.${SCREEN_NAME}\\s" > /dev/null; then
    echo -e "${YELLOW}[AVISO]${NC} El servidor ya está corriendo en screen '$SCREEN_NAME'"
    echo -e "${YELLOW}[AVISO]${NC} Para conectarte: screen -r $SCREEN_NAME"
    echo -e "${YELLOW}[AVISO]${NC} Para detenerlo: bash stop-server.sh"
    exit 1
fi

# Validar que Java esté instalado
if ! command -v java &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Java no está instalado"
    exit 1
fi

# Obtener versión de Java
JAVA_VERSION=$(java -version 2>&1 | head -n 1)
echo -e "${GREEN}[OK]${NC} Java encontrado: $JAVA_VERSION"

# Iniciar servidor en screen
echo -e "${YELLOW}[INFO]${NC} Iniciando servidor Hytale en screen '$SCREEN_NAME'..."
echo -e "${YELLOW}[INFO]${NC} Los logs se guardarán en: $LOG_FILE"

screen -dmS "$SCREEN_NAME" bash -c "
    cd '$SERVER_DIR'
    taskset -c $CPU_SET java \
        -Xms$XMS \
        -Xmx$XMX \
        -XX:+AlwaysPreTouch \
        -XX:+UnlockExperimentalVMOptions \
        -XX:ActiveProcessorCount=$ACTIVE_PROCESSORS \
        -XX:+UseStringDeduplication \
        -jar '$SERVER_JAR' \
        --assets '$ASSETS_ZIP' 2>&1 | stdbuf -o0 tee '$LOG_FILE'
"

sleep 4

if screen -list 2>/dev/null | grep -E "[0-9]+\\.${SCREEN_NAME}\\s" > /dev/null; then
    echo -e "${GREEN}✓ Servidor iniciado correctamente${NC}"
    echo ""
    echo "Comandos útiles:"
    echo "  Ver consola: screen -r $SCREEN_NAME"
    echo "  Desconectar: Ctrl+A, luego D"
    echo "  Detener: bash stop-server.sh"
    exit 0
else
    echo -e "${RED}✗ Error al iniciar el servidor${NC}"
    echo "Intenta ejecutar el script manualmente:"
    echo "  cd $SERVER_DIR && java -jar $SERVER_JAR --assets $ASSETS_ZIP"
    exit 1
fi
