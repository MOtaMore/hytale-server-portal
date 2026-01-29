# Configuración para Procesadores AMD

Si estás ejecutando esta aplicación en un procesador AMD y encuentras errores al iniciar, sigue estos pasos:

## 🔧 Solución Rápida

### 1. Limpiar módulos compilados (Primera vez o si hay problemas)
```bash
npm run rebuild
```

O manualmente:
```bash
npm run rebuild:native
npm install
```

### 2. Iniciar en modo desarrollo
```bash
npm run dev
```

## 🛠️ ¿Qué hace `npm run rebuild`?

- **Recompila módulos nativos** para tu procesador AMD
- **Reconstruye dependencias** como `socket.io` y `bcryptjs`
- **Reinstala todos los paquetes** para asegurar compatibilidad

## 🚨 Si aún no funciona

Si después de `npm run rebuild` sigue sin funcionar, intenta con:

```bash
npm run dev:nogpu
```

Este comando:
- Deshabilita aceleración GPU
- Deshabilita rasterizado por software
- Desabilita uso de memoria compartida
- Ejecuta sin sandbox
- Esto puede ser más compatible con AMD

## 📋 Requisitos del Sistema

- Node.js 16+ instalado
- npm 8+
- Python 3 (para compilar módulos nativos)
- build-essential (Linux) o Visual Studio Build Tools (Windows)

### Instalar dependencias en Linux (Debian/Ubuntu):
```bash
sudo apt-get install build-essential python3
```

### En Fedora/RHEL:
```bash
sudo dnf install gcc g++ make python3
```

### En Windows:
Instala Visual Studio Build Tools desde: https://visualstudio.microsoft.com/downloads/

## ✅ Verificar que funciona

Después de `npm run rebuild`, deberías ver:

```
✓ electron-rebuild completed
```

Si ves esto, la recompilación fue exitosa. Ahora puedes:

```bash
npm run dev
```

## 🐛 Debugging

Si sigue habiendo problemas, ejecuta en modo debug:

```bash
npm run dev 2>&1 | tee debug.log
```

Y proporciona el contenido de `debug.log` para diagnosticar el problema.
