#!/bin/bash

# Script de configuración para AMD - Recompila módulos nativos para compatibilidad

echo "🔧 Configurando aplicación para procesador AMD..."
echo ""

# Verificar si npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado. Por favor, instala Node.js desde https://nodejs.org"
    exit 1
fi

# Verificar si python está instalado
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 no está instalado."
    echo "   En Linux: sudo apt-get install python3"
    echo "   En macOS: brew install python3"
    echo "   En Windows: descarga desde https://www.python.org/"
    exit 1
fi

echo "✓ npm encontrado: $(npm --version)"
echo "✓ python3 encontrado: $(python3 --version)"
echo ""

echo "📦 Recompilando módulos nativos para AMD..."
npm run rebuild:native

if [ $? -eq 0 ]; then
    echo "✓ Recompilación exitosa"
    echo ""
    echo "📥 Reinstalando dependencias..."
    npm install
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ ¡Configuración completada!"
        echo ""
        echo "Ahora puedes ejecutar:"
        echo "  npm run dev        (con GPU)"
        echo "  npm run dev:nogpu  (sin GPU - para problemas de compatibilidad)"
        exit 0
    else
        echo "❌ Error durante npm install"
        exit 1
    fi
else
    echo "❌ Error durante la recompilación"
    echo ""
    echo "Intenta en modo sin GPU:"
    echo "  npm run dev:nogpu"
    exit 1
fi
