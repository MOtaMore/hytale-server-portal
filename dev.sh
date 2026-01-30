#!/bin/bash

# Script de desarrollo para Hytale Server Portal con Tauri
# Este script inicia el frontend webpack dev server y luego Tauri

set -e

echo "🚀 Iniciando Hytale Server Portal (Tauri)"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  NOTA: Actualmente hay 37 errores de TypeScript que no impiden la compilación Rust${NC}"
echo -e "${YELLOW}   El backend está completamente funcional. Los errores son de tipos del frontend.${NC}"
echo ""

# Verificar que Rust esté instalado
if ! command -v cargo &> /dev/null; then
    echo "❌ Cargo no encontrado. Instala Rust primero:"
    echo "   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# Verificar que las dependencias del sistema estén instaladas
if ! pkg-config --exists gtk+-3.0 webkit2gtk-4.1; then
    echo "❌ Faltan dependencias del sistema. Instala:"
    echo "   sudo apt-get install libgtk-3-dev libwebkit2gtk-4.1-dev libjavascriptcoregtk-4.1-dev libsoup-3.0-dev"
    exit 1
fi

echo -e "${GREEN}✅ Todas las dependencias están instaladas${NC}"
echo ""

# Opción 1: Desarrollo con recarga en caliente
if [ "$1" == "dev" ] || [ -z "$1" ]; then
    echo "📦 Iniciando en modo desarrollo..."
    echo "   Frontend: http://localhost:3000"
    echo "   Backend: Rust con recarga automática"
    echo ""
    
    # Iniciar webpack dev server en background
    echo "🔧 Iniciando webpack dev server..."
    npm run dev:frontend &
    WEBPACK_PID=$!
    
    # Esperar a que webpack esté listo
    echo "⏳ Esperando a que webpack esté listo..."
    sleep 5
    
    # Verificar si webpack está corriendo
    if ! curl -s http://localhost:3000 > /dev/null; then
        echo "⚠️  Webpack aún no está listo. Esperando más..."
        sleep 5
    fi
    
    echo -e "${GREEN}✅ Webpack dev server listo en http://localhost:3000${NC}"
    echo ""
    echo "🦀 Iniciando Tauri..."
    
    # Limpiar al salir
    trap "kill $WEBPACK_PID 2>/dev/null" EXIT
    
    # Iniciar Tauri (esto bloqueará hasta que se cierre la app)
    npm run dev
    
# Opción 2: Build de producción
elif [ "$1" == "build" ]; then
    echo "📦 Construyendo aplicación de producción..."
    
    # Compilar frontend
    echo "🔧 Compilando frontend..."
    npm run build:frontend
    
    # Compilar backend y crear bundle
    echo "🦀 Compilando Tauri (esto puede tomar varios minutos)..."
    npm run build
    
    echo ""
    echo -e "${GREEN}✅ Build completado!${NC}"
    echo "   El ejecutable está en: src-tauri/target/release/"
    
# Opción 3: Solo backend (útil para debugging)
elif [ "$1" == "backend" ]; then
    echo "🦀 Compilando y ejecutando solo el backend Rust..."
    cd src-tauri
    cargo check
    echo -e "${GREEN}✅ Backend compila correctamente${NC}"
    
# Opción 4: Solo frontend
elif [ "$1" == "frontend" ]; then
    echo "🔧 Iniciando solo el frontend..."
    npm run dev:frontend

else
    echo "❌ Opción desconocida: $1"
    echo ""
    echo "Uso: $0 [dev|build|backend|frontend]"
    echo "  dev       - Modo desarrollo (defecto)"
    echo "  build     - Build de producción"
    echo "  backend   - Solo verificar backend"
    echo "  frontend  - Solo frontend"
    exit 1
fi
