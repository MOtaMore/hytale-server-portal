#!/bin/bash
# Script para detener el servidor Hytale
# Sistema portable - compatible con Ubuntu 24 LTS

set -e

SCREEN_NAME="HytaleServer"
GRACE_PERIOD=15
FORCE_KILL_DELAY=3

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar si el servidor está corriendo
if ! screen -list 2>/dev/null | grep -E "[0-9]+\\.${SCREEN_NAME}\\s" > /dev/null; then
    echo -e "${YELLOW}[AVISO]${NC} No hay ningún servidor corriendo en screen '$SCREEN_NAME'"
    exit 0
fi

echo -e "${YELLOW}[INFO]${NC} Enviando comando 'stop' al servidor..."
screen -S "$SCREEN_NAME" -X stuff "stop^M" 2>/dev/null || true

echo -e "${YELLOW}[INFO]${NC} Esperando que el servidor se detenga (máximo ${GRACE_PERIOD}s)..."

for i in $(seq 1 $GRACE_PERIOD); do
    if ! screen -list 2>/dev/null | grep -E "[0-9]+\\.${SCREEN_NAME}\\s" > /dev/null; then
        echo ""
        echo -e "${GREEN}✓ Servidor detenido correctamente${NC}"
        exit 0
    fi
    echo -n "."
    sleep 1
done

echo ""
echo -e "${YELLOW}[AVISO]${NC} El servidor aún está corriendo. Intentando detención forzada..."
sleep $FORCE_KILL_DELAY

if screen -list 2>/dev/null | grep -E "[0-9]+\\.${SCREEN_NAME}\\s" > /dev/null; then
    screen -S "$SCREEN_NAME" -X quit 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}✓ Servidor detenido (forzado)${NC}"
else
    echo -e "${GREEN}✓ Servidor detenido correctamente${NC}"
fi

exit 0
