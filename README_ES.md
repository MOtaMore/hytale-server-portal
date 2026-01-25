# 🎮 Portal Servidor Hytale

**Aplicación de escritorio profesional para administrar y controlar servidores de juego Hytale con interfaz gráfica intuitiva.**

![Licencia](https://img.shields.io/badge/licencia-Privada-red)
![Plataforma](https://img.shields.io/badge/plataforma-Windows%20%7C%20Linux%20%7C%20macOS-blue)
![Versión](https://img.shields.io/badge/versi%C3%B3n-1.0.0-green)

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Características](#características)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Inicio Rápido](#inicio-rápido)
- [Guía de Uso](#guía-de-uso)
  - [Panel de Control](#panel-de-control)
  - [Configuración del Servidor](#configuración-del-servidor)
  - [Gestor de Archivos](#gestor-de-archivos)
  - [Copias de Seguridad](#copias-de-seguridad)
  - [Integración Discord](#integración-discord)
- [Desarrollo](#desarrollo)
  - [Estructura del Proyecto](#estructura-del-proyecto)
  - [Stack Tecnológico](#stack-tecnológico)
  - [Configuración para Desarrollo](#configuración-para-desarrollo)
- [Compilación de Instaladores](#compilación-de-instaladores)
  - [Prerequisitos](#prerequisitos)
  - [Comandos de Compilación](#comandos-de-compilación)
  - [Distribución de Instaladores](#distribución-de-instaladores)
- [Configuración](#configuración)
- [Solución de Problemas](#solución-de-problemas)
- [Soporte](#soporte)

---

## 🎯 Descripción General

**Portal Servidor Hytale** es una herramienta integral de gestión de servidores construida con Electron y Express.js que proporciona a los administradores un centro de control unificado para gestionar sus servidores de juego Hytale. La aplicación combina una interfaz de escritorio moderna con una robusta API de backend, ofreciendo monitoreo en tiempo real, gestión de archivos, operaciones de respaldo e integración con Discord.

### ¿Por qué Portal Servidor Hytale?

- ✅ **Solución Integral**: Gestiona todos los aspectos de tu servidor desde una única interfaz
- ✅ **Soporte Multiidioma**: Internacionalización completa (i18n) en 5 idiomas (Inglés, Español, Portugués, Francés, Chino)
- ✅ **Autenticación Segura**: Endpoints protegidos con almacenamiento encriptado de credenciales
- ✅ **Monitoreo en Tiempo Real**: Visualización live de CPU, RAM y espacio en disco
- ✅ **Multiplataforma**: Funciona en Windows, Linux y macOS
- ✅ **Interfaz Profesional**: Interfaz moderna y responsiva con tema oscuro

---

## ⭐ Características

### 🎮 Gestión del Servidor
- **Iniciar/Detener Servidor**: Control simple con un clic
- **Monitoreo en Tiempo Real**: Visualiza CPU, RAM, uso de disco en directo
- **Consola de Servidor**: Transmisión en vivo de la consola del servidor e interacción
- **Estado del Servidor**: Indicadores de estado instantáneo y verificaciones de salud

### ⚙️ Configuración del Servidor
- **Asignación de CPU**: Configura la cantidad de núcleos para rendimiento óptimo
- **Configuración de RAM**: Establece asignación mínima y máxima de RAM
- **Monitoreo de Procesos Java**: Detección automática y monitoreo de procesos del servidor
- **Variables de Entorno**: Gestión de configuración del entorno del servidor

### 📁 Gestión de Archivos
- **Explorador de Archivos**: Navega y gestiona archivos del servidor
- **Carga/Descarga**: Transferencia de archivos entre local y servidor
- **Archivos Protegidos**: Respaldo automático de archivos críticos durante actualizaciones
- **Operaciones por Lotes**: Soporte para operaciones multiarquivo

### 💾 Sistema de Copias de Seguridad
- **Copias Automáticas**: Creación de respaldo programado
- **Puntos de Restauración**: Gestión de múltiples versiones de backup
- **Restauración Selectiva**: Restaura desde instantáneas específicas de backup
- **Compresión**: Almacenamiento eficiente de respaldos con compresión
- **Ubicación Personalizada**: Configura rutas de almacenamiento de respaldos

### 🤖 Integración Discord
- **Notificaciones de Estado**: Actualizaciones automáticas del canal Discord
- **Registro de Eventos**: Integración de webhook de Discord para eventos del servidor
- **Configuración de Bot**: Configuración simple y fácil de bot de Discord
- **Mensajes Personalizados**: Plantillas de notificación configurables

### 🌐 Internacionalización
- **5 Idiomas**: Inglés, Español, Portugués, Francés, Chino
- **Cambio Instantáneo**: Cambia de idioma sin reiniciar
- **Sensible a Locale**: Formato de fecha y visualización de números por región
- **Cobertura Completa**: Todas las cadenas de interfaz traducidas

### 🔐 Características de Seguridad
- **Autenticación de Admin**: Login seguro con contraseñas encriptadas
- **Gestión de Sesión**: Manejo persistente de sesiones
- **Rutas Protegidas**: Autenticación de endpoints de API
- **Encriptación de Credenciales**: Encriptación AES-256-GCM para credenciales almacenadas
- **Control de Acceso**: Gestión de acceso basada en roles

---

## 📦 Requisitos

### Requisitos del Sistema

| Componente | Mínimo | Recomendado |
|-----------|--------|-------------|
| **SO** | Windows 7+, Ubuntu 18.04+, macOS 10.15+ | Windows 10+, Ubuntu 20.04+, macOS 11+ |
| **RAM** | 2 GB | 4 GB |
| **Disco** | 500 MB | 2 GB |
| **Java** | Java 8+ | Java 17+ |

### Requisitos de Software

- **Node.js**: v16.0.0 o superior
- **npm**: v7.0.0 o superior
- **Electron**: v31.0.0 (incluido)
- **Express.js**: v4.19.2 (incluido)
- **Python**: v3.7+ (para compilar en Linux/macOS)
- **Herramientas de Compilación**: 
  - Windows: Visual Studio Build Tools o Visual Studio 2019+
  - Linux: build-essential, python3
  - macOS: Herramientas de Línea de Comandos de Xcode

---

## 📥 Instalación

### Opción 1: Descargar Instaladores Precompilados

Visita la [Página de Releases](https://github.com/yourusername/hytale-server-portal/releases) y descarga el instalador apropiado para tu sistema operativo:

- **Windows**: `Hytale-Server-Portal-Setup-1.0.0.exe` (Instalador NSIS)
- **Linux**: `Hytale-Server-Portal-1.0.0.AppImage` (AppImage)
- **macOS**: `Hytale-Server-Portal-1.0.0.dmg` (Instalador DMG)

#### Instalación en Windows
1. Descarga el instalador `.exe`
2. Ejecuta el instalador
3. Sigue el asistente de instalación
4. Haz clic en "Finalizar" cuando se complete
5. Lanza desde el Menú de Inicio o atajo de escritorio

#### Instalación en Linux
1. Descarga el archivo `.AppImage`
2. Hazlo ejecutable: `chmod +x Hytale-Server-Portal-*.AppImage`
3. Ejecuta: `./Hytale-Server-Portal-*.AppImage`

O instala el paquete `.deb`:
```bash
sudo dpkg -i hytale-server-portal_1.0.0_amd64.deb
hytale-server-portal
```

#### Instalación en macOS
1. Descarga el archivo `.dmg`
2. Ábrelo y arrastra Portal Servidor Hytale a Aplicaciones
3. Lanza desde la carpeta Aplicaciones

### Opción 2: Compilar desde el Código Fuente

Consulta la sección [Compilación de Instaladores](#compilación-de-instaladores) más abajo.

---

## 🚀 Inicio Rápido

### Configuración en el Primer Inicio

1. **Selección de Idioma**: Elige tu idioma preferido de las opciones disponibles
2. **Cuenta de Administrador**: Crea tus credenciales de admin
   - Usuario: Introduce nombre de usuario admin (mínimo 3 caracteres)
   - Contraseña: Establece una contraseña fuerte (mínimo 4 caracteres)
   - Confirmar: Verifica tu contraseña
3. **Completar Configuración**: Haz clic en "Finalizar Instalación"
4. **Login**: Usa tus credenciales para acceder al panel de control

### Operaciones Básicas del Servidor

```
1. Navega al Panel de Control
2. Verifica el Estado del Servidor
3. Haz clic en "Iniciar" para activar el servidor
4. Monitoriza CPU, RAM, Disco en tiempo real
5. Usa la Consola para comandos avanzados
6. Haz clic en "Detener" para apagar correctamente
```

---

## 📖 Guía de Uso

### Panel de Control

El Panel es tu centro de comando mostrando:

- **Estado del Servidor**: Estado actual (En Ejecución, Detenido, Inicializando)
- **Métricas de Rendimiento**: 
  - Uso de CPU (%)
  - Uso de RAM (MB)
  - Espacio en Disco (GB)
- **Salida de Consola**: Registros del servidor en tiempo real
- **Acciones Rápidas**: Botones Iniciar/Detener

**Consejos:**
- Actualiza manualmente o espera a auto-actualización (intervalos de 5 segundos)
- Usa la consola para comandos directos del servidor
- Monitoriza CPU/RAM para prevenir problemas de rendimiento

### Configuración del Servidor

Configura parámetros de rendimiento del servidor:

1. Navega a la sección **Configuración del Servidor**
2. Establece **Hilos de CPU**: Número de núcleos de CPU a asignar
3. Establece **Asignación de RAM**:
   - RAM Mínima (MB): Memoria de inicio
   - RAM Máxima (MB): Memoria máxima permitida
4. Haz clic en **Guardar Configuración**
5. Reinicia el servidor para aplicar cambios

**Recomendaciones:**
- Hilos: 4-8 para la mayoría de servidores
- RAM Min: 1024 MB (1 GB)
- RAM Max: Basado en RAM disponible del sistema

### Gestor de Archivos

Gestiona archivos y directorios del servidor:

1. Navega a **Gestor de Archivos**
2. Explora la estructura de directorios
3. **Operaciones**:
   - Cargar: Selecciona archivos para subir
   - Descargar: Haz clic en icono de descarga en archivos
   - Eliminar: Elimina archivos no deseados
   - Crear Carpeta: Añade nuevos directorios

**Importante**: Los archivos protegidos (scripts de inicio) se respaldan automáticamente antes de modificaciones.

### Copias de Seguridad

Crea y restaura copias de seguridad del servidor:

#### Crear una Copia de Seguridad

1. Navega a **Copias de Seguridad**
2. Haz clic en **Crear Copia de Seguridad**
3. Introduce nombre y descripción del respaldo
4. Selecciona ubicación de respaldo
5. Haz clic en **Iniciar Respaldo**

**La copia incluye:**
- Directorio completo del servidor
- Archivos de configuración
- Datos del mundo
- Plugins (si aplica)

#### Restaurar desde Copia de Seguridad

1. Navega a **Copias de Seguridad**
2. Selecciona instantánea de respaldo deseada
3. Haz clic en **Restaurar**
4. Confirma restauración (advertencia: datos actuales se reemplazarán)
5. Espera a que se complete la restauración
6. El servidor se detendrá; haz clic en Iniciar para reanudar

**Consejos:**
- Crea respaldos antes de actualizaciones importantes
- Mantén múltiples versiones de respaldo
- Prueba restauración en desarrollo primero

### Integración Discord

Configura notificaciones de Discord e integración de bot:

1. Navega a **Configuración Discord**
2. **Conecta Bot de Discord**:
   - Introduce Token del Bot de Discord
   - Especifica ID del Canal para notificaciones
3. **Configuración de Eventos**:
   - Notificaciones de Inicio/Parada del Servidor
   - Alertas de errores de consola
   - Actualizaciones de finalización de respaldo
4. Haz clic en **Guardar Configuración**

**Configurar Bot de Discord:**
- Crea bot a través del [Portal de Desarrolladores de Discord](https://discord.com/developers)
- Copia token del bot
- Otorga permisos al bot (Enviar Mensajes, Incrustar Enlaces)
- Pega token en configuración

---

## 🛠 Desarrollo

### Estructura del Proyecto

```
hytale-server-portal/
├── webportal/
│   ├── main.js                    # Proceso principal de Electron
│   ├── preload.js                 # Script de preload de Electron
│   ├── server.js                  # Servidor backend Express
│   ├── package.json               # Dependencias y scripts
│   ├── electron-builder.yml       # Configuración de compilación
│   ├── public/
│   │   ├── index.html            # Página principal de aplicación
│   │   ├── app.js                # Lógica de frontend
│   │   ├── styles.css            # Estilos de aplicación
│   │   ├── i18n-loader.js        # Sistema i18n
│   │   ├── i18n.js               # Definiciones de traducción
│   │   ├── preload.js            # Comunicación IPC
│   │   └── translations/          # Archivos JSON de traducción
│   │       ├── en.json
│   │       ├── es.json
│   │       ├── pt.json
│   │       ├── fr.json
│   │       └── zh.json
│   ├── assets/
│   │   ├── icon.ico              # Icono de Windows
│   │   ├── icon.png              # Icono de Linux
│   │   └── icon.icns             # Icono de macOS
│   └── dist/                      # Directorio de salida de compilación
└── HytaleServer/                  # Scripts de lanzador de servidor
    ├── start-server.sh
    └── stop-server.sh
```

### Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Framework de Escritorio** | Electron | 31.0.0 |
| **Backend** | Express.js | 4.19.2 |
| **Runtime** | Node.js | 16+ |
| **Autenticación** | JWT + Encriptación | AES-256-GCM |
| **Base de Datos** | Archivos JSON | Nativa |
| **Herramienta de Compilación** | electron-builder | 25.0.0 |
| **Compresión** | adm-zip | 0.5.12 |
| **Discord** | discord.js | 14.25.1 |
| **Monitoreo** | pidusage | 3.0.2 |

### Configuración para Desarrollo

#### 1. Clonar Repositorio

```bash
git clone https://github.com/tuusuario/hytale-server-portal.git
cd hytale-server-portal/webportal
```

#### 2. Instalar Dependencias

```bash
npm install
```

#### 3. Configurar Entorno

Crea archivo `.env`:

```env
PORT=3000
NODE_ENV=development
ENCRYPTION_KEY=tu-clave-encriptación
DISCORD_TOKEN=tu-token-discord
```

#### 4. Ejecutar en Modo Desarrollo

```bash
# Ejecuta Electron con recarga automática
npm run dev

# O ejecuta solo servidor web
npm run dev:web
```

#### 5. Flujos de Trabajo de Desarrollo

**Desarrollo de Frontend:**
```bash
npm run dev:web
# Accede en http://localhost:3000
```

**Aplicación Completa:**
```bash
npm run dev
# Lanza Electron con backend integrado
```

**Probando Cambios:**
- Frontend: Recarga navegador (Ctrl+R)
- Backend: Reinicia Electron (Ctrl+Q, luego npm run dev)

---

## 🔨 Compilación de Instaladores

### Prerequisitos

#### Todas las Plataformas
- Node.js v16+
- npm v7+
- 2 GB espacio libre en disco

#### Windows
- **Visual Studio Build Tools 2019+** o **Visual Studio 2022**
  - Incluye carga de trabajo "Desktop development with C++"
- **Python 3.7+**
- **7-Zip** (opcional, para mejor compresión)

Instalación:
```bash
# Usando Chocolatey (si está instalado)
choco install visualstudio2022buildtools python

# O descarga desde sitios web oficiales
# VS Build Tools: https://visualstudio.microsoft.com/downloads/
# Python: https://www.python.org/downloads/
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt-get install build-essential python3 libxss1 libappindicator1 libindicator7

# Fedora
sudo dnf install gcc gcc-c++ make python3 libxss libappindicator
```

#### macOS
```bash
# Instala Herramientas de Línea de Comandos de Xcode
xcode-select --install

# O instala Xcode completo desde App Store
```

### Comandos de Compilación

#### Compilar Todos los Instaladores

```bash
cd webportal
npm install
npm run build
```

**Salida:**
- `dist/Hytale-Server-Portal-Setup-1.0.0.exe` (Windows NSIS)
- `dist/Hytale Server Portal 1.0.0 Setup.exe` (Windows Portable)
- `dist/Hytale-Server-Portal-1.0.0.AppImage` (Linux)
- `dist/hytale-server-portal_1.0.0_amd64.deb` (Linux DEB)
- `dist/Hytale-Server-Portal-1.0.0.dmg` (macOS)

#### Compilar Plataforma Específica

**Solo Windows:**
```bash
npm run build:win
# Salida: dist/*.exe
```

**Solo Linux:**
```bash
npm run build:linux
# Salida: dist/*.AppImage y dist/*.deb
```

**Solo macOS:**
```bash
npm run build:mac
# Salida: dist/*.dmg
```

#### Opciones Avanzadas de Compilación

**Compilar sin firma (desarrollo):**
```bash
npm run pack
```

**Compilar con firma de código (producción):**
1. Configura `customSign.js` con tu certificado
2. Establece ruta de certificado en `electron-builder.yml`
3. Ejecuta: `npm run build:win`

### Distribución de Instaladores

#### Instaladores de Windows

**Instalador NSIS** (Recomendado para usuarios finales)
- Archivo: `Hytale-Server-Portal-Setup-1.0.0.exe`
- Tamaño: ~200-250 MB
- Características: Barra de progreso, selección de directorio de instalación, accesos directos del Menú de Inicio
- Distribución: Página de release o descarga directa

**Ejecutable Portable**
- Archivo: `Hytale Server Portal 1.0.0 Setup.exe`
- Tamaño: ~180-220 MB
- Características: Sin instalación requerida, puede ejecutarse desde unidad USB
- Distribución: Para despliegues portátiles

#### Instaladores de Linux

**AppImage**
- Archivo: `Hytale-Server-Portal-1.0.0.AppImage`
- Tamaño: ~200-250 MB
- Uso: `chmod +x *.AppImage && ./Hytale-Server-Portal-1.0.0.AppImage`
- Beneficio: Funciona en la mayoría de distribuciones Linux

**Paquete DEB**
- Archivo: `hytale-server-portal_1.0.0_amd64.deb`
- Instalación: `sudo dpkg -i hytale-server-portal_1.0.0_amd64.deb`
- Beneficios: Integración con gestor de paquetes del sistema, actualizaciones automáticas

#### Instaladores de macOS

**Archivo DMG**
- Archivo: `Hytale-Server-Portal-1.0.0.dmg`
- Tamaño: ~200-250 MB
- Instalación: Monta DMG y arrastra app a carpeta Aplicaciones
- Firma de Código: Configura en `electron-builder.yml` para producción

### Solución de Problemas de Compilación

#### Compilación en Windows Falla

**Problema: "MSBuild no encontrado"**
```bash
# Solución: Instala Visual Studio Build Tools
# https://visualstudio.microsoft.com/downloads/
# Selecciona "Desktop development with C++"
```

**Problema: Python no encontrado**
```bash
# Solución: Instala Python 3
# https://www.python.org/downloads/
# Añade a PATH durante instalación
```

**Problema: Nombres de ruta largos en Windows**
```bash
# Solución: Habilita soporte de rutas largas
reg add HKLM\SYSTEM\CurrentControlSet\Control\FileSystem /v LongPathsEnabled /t REG_DWORD /d 1

# O compila desde ruta más corta
# No en C:\Users\Usuario\Proyectos\muy\larga\ruta\nombre
```

#### Compilación en Linux Falla

**Problema: "libxss1 no encontrado"**
```bash
sudo apt-get install libxss1 libappindicator1 libindicator7
```

**Problema: Permiso denegado**
```bash
# Solución: Ejecuta con sudo (no recomendado)
# Mejor: Arregla permisos
sudo chown -R $USER:$USER .
```

#### Compilación en macOS Falla

**Problema: "Herramientas de Línea de Comandos de Xcode no encontrado"**
```bash
xcode-select --install
```

**Problema: Firma de código requerida**
```bash
# Para compilaciones de desarrollo sin firma:
# Modifica electron-builder.yml y establece:
# certificateFile: null
```

---

## ⚙️ Configuración

### Archivos de Configuración

#### `setup-config.json`
Almacena estado de configuración y credenciales de administrador:
```json
{
  "setupComplete": true,
  "language": "es",
  "authMode": "local"
}
```

#### `.env` / `.env.example`
Variables de entorno:
```env
PORT=3000
NODE_ENV=production
ENCRYPTION_KEY=tu-clave-segura
DISCORD_TOKEN=tu-token-bot
```

#### `electron-builder.yml`
Configuración de compilación e instalador:
- Metadatos de aplicación
- Configuraciones específicas de plataforma
- Opciones de instalador
- Configuración de firma de código

#### Archivos de Traducción (`public/translations/*.json`)
Cadenas de interfaz específicas del idioma para todos los 5 idiomas soportados.

---

## 🐛 Solución de Problemas

### Problemas Generales

**La aplicación no inicia**
```bash
# Limpia caché e intenta de nuevo
rm -rf ~/.config/Hytale\ Server\ Portal  # Linux/macOS
rmdir /s %APPDATA%\Hytale Server Portal  # Windows

# Reinstala y lanza
```

**Puerto 3000 ya está en uso**
```bash
# Cambia puerto en .env
PORT=3001

# O mata proceso existente
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000   # Windows
```

**Login falla después de configuración**
- Limpia caché del navegador (Ctrl+Mayús+Supr)
- Verifica credenciales en `setup-config.json`
- Reinstala si la configuración está corrupta

### Problemas del Servidor

**El servidor no inicia**
1. Comprueba que Java esté instalado: `java -version`
2. Verifica que los archivos del servidor estén en ubicación correcta
3. Comprueba salida de consola para errores
4. Asegúrate de que los puertos no estén bloqueados por firewall

**Monitoreo de CPU/RAM muestra 0**
1. Reinicia la aplicación
2. Asegúrate de que el proceso Java está en ejecución
3. Comprueba permisos del sistema
4. Verifica que el módulo pidusage está correctamente instalado

### Problemas de Integración Discord

**Bot no envía mensajes**
1. Verifica que el token del bot sea correcto
2. Comprueba formato del ID de canal
3. Asegúrate de que el bot tiene permiso "Enviar Mensajes"
4. Comprueba configuración del servidor Discord permite bot

**Conexión de webhook falla**
- Verifica conexión a internet
- Comprueba estado de la API de Discord
- Asegúrate de que el token del bot no ha expirado
- Prueba token con endpoint de prueba de Discord

---

## 📞 Soporte

### Obtener Ayuda

1. **Documentación**: Consulta sección [Guía de Uso](#guía-de-uso)
2. **Solución de Problemas**: Ve a sección [Solución de Problemas](#solución-de-problemas)
3. **GitHub Issues**: Reporta errores en [Página de Issues](https://github.com/tuusuario/hytale-server-portal/issues)
4. **Comunidad Discord**: Únete a nuestro [Servidor Discord](https://discord.gg/tuinvitacion)

### Reportar Problemas

Al reportar problemas, incluye:
- Sistema operativo y versión
- Versión de la aplicación
- Mensaje de error detallado
- Pasos para reproducir
- Especificaciones del sistema (CPU, RAM, SO)

### Solicitudes de Características

¿Tienes ideas para mejoras? Envía solicitudes de características en GitHub con:
- Descripción clara de característica solicitada
- Caso de uso y beneficios
- Enfoque de implementación sugerido

---

## 📄 Licencia

Este proyecto es software propietario. Todos los derechos reservados.

**Derechos de Autor © 2026 Contribuyentes del Portal Servidor Hytale**

---

## 🙏 Créditos

- **Hytale**: Marco de juego
- **Electron**: Marco de aplicación de escritorio
- **Express.js**: Servidor web
- **Discord.js**: Integración de API de Discord
- **Contribuyentes de la Comunidad**: Todos los desarrolladores que contribuyen a mejoras

---

## 🔄 Historial de Versiones

### v1.0.0 (Actual)
- Lanzamiento inicial
- Características principales de gestión de servidor
- Soporte multiidioma (5 idiomas)
- Integración con Discord
- Sistema de respaldo y restauración
- Monitoreo en tiempo real
- Autenticación segura

---

**Última Actualización**: 25 de Enero de 2026  
**Estado**: Mantenimiento Activo ✅
