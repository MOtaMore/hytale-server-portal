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
npm run dev:amd
```

O si prefieres sin GPU:
```bash
npm run dev:nogpu
```

**IMPORTANTE**: En AMD, NO uses `npm run dev` (puede fallar con errores de sandbox). Usa siempre `npm run dev:amd`.

## 🛠️ ¿Qué hace `npm run rebuild`?

- **Recompila módulos nativos** para tu procesador AMD
- **Reconstruye dependencias** como `socket.io` y `bcryptjs`
- **Reinstala todos los paquetes** para asegurar compatibilidad

## 🚨 Si aún no funciona

Si después de `npm run rebuild` ves un error de "chrome-sandbox", usa:

```bash
npm run dev:amd
```

Este comando:
- Deshabilita el sandbox de Chrome (soluciona errores de permisos en Linux)
- Deshabilita aceleración GPU
- Deshabilita rasterizado por software
- Desabilita uso de memoria compartida
- **Optimizado específicamente para procesadores AMD**

Alternativa con menos optimizaciones:
```bash
npm run dev:nogpu
```

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
npm run dev:amd
```

**O también:**
```bash
npm run dev:nogpu
```

## 🐛 Debugging

Si sigue habiendo problemas, ejecuta en modo debug:

```bash
npm run dev 2>&1 | tee debug.log
```

Y proporciona el contenido de `debug.log` para diagnosticar el problema.
