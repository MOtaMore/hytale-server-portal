# Hytale Server Portal

**Aplicación de escritorio para gestionar servidores Hytale en Windows y Linux**

## 📋 Descripción General

Hytale Server Portal es una aplicación Electron profesional que permite a los usuarios gestionar sus servidores Hytale de manera intuitiva. La aplicación está desarrollada con arquitectura POO escalable, multiidioma (8 idiomas), y con características de seguridad avanzadas.

## 🌍 Idiomas Soportados

- 🇪🇸 Español
- 🇵🇹 Portugués
- 🇬🇧 English (Inglés)
- 🇩🇪 Deutsch (Alemán)
- 🇫🇷 Français (Francés)
- 🇨🇳 中文 (Chino)
- 🇯🇵 日本語 (Japonés)
- 🇰🇷 한국어 (Coreano)

## 🏗️ Arquitectura del Proyecto

### Estructura de Carpetas

```
src/
├── main/                    # Main process de Electron
│   └── index.ts            # Ventana principal y IPC handlers
├── preload/                # Preload script (seguridad contextIsolation)
│   └── preload.ts          # APIs expuestas al renderer
├── renderer/               # Renderer process (React + UI)
│   ├── pages/              # Páginas principales
│   │   ├── AuthPage.tsx    # Fase 0: Login/Registro
│   │   └── MainPage.tsx    # Panel principal
│   ├── components/         # Componentes reutilizables
│   ├── styles/             # CSS global
│   ├── App.tsx             # Componente raíz
│   └── index.tsx           # Entry point React
├── shared/                 # Código compartido
│   ├── utils/              # Utilidades POO
│   │   ├── EncryptionManager.ts      # Encriptación segura
│   │   ├── SecureStorageManager.ts   # Almacenamiento encriptado
│   │   └── AuthenticationManager.ts  # Autenticación
│   └── i18n/               # Internacionalización
│       ├── I18nManager.ts           # Gestor de idiomas
│       └── translations.json        # Traducciones
└── services/               # Servicios de negocio (se añadirán)

resources/
├── HytaleServer/           # CLI y scripts del servidor
│   ├── hytale-downloader-*
│   ├── start-server.sh
│   ├── stop-server.sh
│   └── ...
├── icons/                  # Iconos de la aplicación
│   ├── icon.png
│   └── icon.ico
└── assets/                 # Banderas de idiomas
    ├── es.webp
    ├── pt.webp
    └── ...
```

## 🚀 Instalación y Configuración

### Requisitos Previos

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **Electron** 27.0.0 (automático con npm install)

### Pasos de Instalación

1. **Clonar o navegar al proyecto**:
   ```bash
   cd /home/asusmota/work/hytale-server-portal
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Iniciar en modo desarrollo**:
   ```bash
   npm run dev
   ```
   - Webpack compilará el código en modo watch
   - Abrirá la aplicación Electron automáticamente
   - Tendrás acceso a DevTools (F12)

## 📦 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia webpack + electron (recomendado)
npm run dev:main        # Compila main process en watch mode
npm run dev:renderer    # Inicia webpack dev server para renderer

# Build
npm run build           # Compila main + renderer para producción
npm run build:main      # Compila solo main process
npm run build:renderer  # Compila solo renderer

# Packaging
npm run package         # Empaqueta para el SO actual
npm run package:win     # Empaqueta solo para Windows
npm run package:linux   # Empaqueta solo para Linux
npm run package:all     # Empaqueta para Mac, Windows y Linux
```

## 🔐 Seguridad

### Características de Seguridad Implementadas

1. **Context Isolation**: El preload script expone solo APIs seguras al renderer
2. **Encriptación AES**: Todas las contraseñas se hashean con SHA256
3. **Almacenamiento Seguro**: Los datos se encriptan al guardarse en disco
4. **No Remote**: NodeIntegration desactivada

### Gestión de Credenciales

- Las contraseñas se hashean con `SHA256 + SECRET_KEY` antes de guardarse
- Cada usuario tiene una cuenta local encriptada
- El almacenamiento está en `app.getPath('userData')/secure-storage/`

## 🎨 Diseño Visual

### Paleta de Colores

- **Primary**: `#6366f1` (Indigo)
- **Secondary**: `#8b5cf6` (Purple)
- **Success**: `#10b981` (Green)
- **Danger**: `#ef4444` (Red)
- **Background**: `#0f0f0f` (Dark)

### Componentes UI

- Botones con efectos hover y transiciones suaves
- Inputs con focus states diseñados
- Sidebar con navegación clara
- Modales y alertas consistentes
- Soporte responsive (escritorio y tablet)

## 📱 Fases de Desarrollo

### ✅ Fase 0: Autenticación (Completada)

- [x] Selector de idiomas con banderas
- [x] Sistema de registro de usuarios
- [x] Sistema de login
- [x] Almacenamiento encriptado de credenciales
- [x] Gestión de sesiones

### ⏳ Fase 1: Panel de Control del Servidor

- [ ] Iniciar servidor
- [ ] Detener servidor
- [ ] Reiniciar servidor
- [ ] Consola interactiva de comandos
- [ ] Visualización de logs en tiempo real
- [ ] Indicador de estado

### ⏳ Fase 2: Gestor de Descargas

- [ ] Selector de carpeta de instalación
- [ ] Descarga del CLI Hytale
- [ ] Autenticación con dispositivo
- [ ] Descompresiónautomática
- [ ] Limpieza de archivos temporales

### ⏳ Fase 3: Gestor de Archivos

- [ ] Listado de archivos del servidor
- [ ] Eliminar archivos
- [ ] Editar archivos de texto
- [ ] Descargar archivos
- [ ] Descomprimir ZIPs

### ⏳ Fase 4: Gestor de Backups

- [ ] Crear backups
- [ ] Restaurar desde backups
- [ ] Eliminar backups
- [ ] Descargar backups
- [ ] Exclusión de archivos innecesarios

### ⏳ Fase 5: Editor de Configuración

- [ ] Leer archivo config.json
- [ ] Interfaz para editar parámetros
- [ ] Validación de valores
- [ ] Guardado de cambios

### ⏳ Fase 6: Integración Discord

- [ ] Configuración de token del bot
- [ ] Configuración de canal
- [ ] Notificaciones de inicio
- [ ] Notificaciones de apagado
- [ ] Envío de mensajes de estado

## 🛠️ Patrones POO Utilizados

### Managers (Singleton Pattern)

```typescript
// EncryptionManager - Gestiona encriptación
EncryptionManager.encrypt(text)
EncryptionManager.decrypt(encryptedText)
EncryptionManager.hashPassword(password)

// SecureStorageManager - Almacenamiento seguro
SecureStorageManager.save(data)
SecureStorageManager.load()
SecureStorageManager.getUser()

// AuthenticationManager - Autenticación
AuthenticationManager.createAccount(username, email, password)
AuthenticationManager.login(username, password)
AuthenticationManager.getCurrentUser()

// I18nManager - Internacionalización
I18nManager.t(key)
I18nManager.setLanguage(language)
I18nManager.getAvailableLanguages()
```

### Comunicación IPC

Los Managers exponen métodos que se invocan desde el renderer a través de IPC:

```typescript
// Renderer
const result = await window.electron.auth.login(username, password)

// Main Process (IPC Handler)
ipcMain.handle('auth:login', async (event, username, password) => {
  const user = AuthenticationManager.login(username, password)
  return { success: true, user }
})
```

## 📝 Añadir Nueva Funcionalidad

### Ejemplo: Agregar un nuevo Manager

1. **Crear el manager en `src/shared/utils/`**:

```typescript
// src/shared/utils/ServerManager.ts
export class ServerManager {
  static startServer(serverPath: string): Promise<void> {
    // Implementación
  }
}
```

2. **Exponer en IPC en `src/main/index.ts`**:

```typescript
ipcMain.handle('server:start', async (event, serverPath) => {
  await ServerManager.startServer(serverPath)
  return { success: true }
})
```

3. **Actualizar preload en `src/preload/preload.ts`**:

```typescript
server: {
  start: (serverPath: string) => 
    ipcRenderer.invoke('server:start', serverPath)
}
```

4. **Usar en componentes React**:

```typescript
await window.electron.server.start(serverPath)
```

## 🔍 Debugging

### DevTools

Presiona `F12` en la aplicación durante desarrollo para abrir DevTools.

### Logs

Los errores se registran en la consola. Para logs persistentes, añade a `src/main/index.ts`:

```typescript
import * as log from 'electron-log'
log.debug('mensaje')
```

## 📚 Referencias

- [Documentación Hytale Servers](https://support.hytale.com/hc/en-us/articles/45326769420827-Hytale-Server-Manual)
- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## 🤝 Convenciones de Código

- **Archivos**: PascalCase para clases, camelCase para variables
- **Componentes React**: PascalCase
- **Importaciones**: Agrupar en orden: Node → Electron → Compartido → Local
- **Comentarios**: Documentar métodos públicos con JSDoc
- **Estilos**: BEM (Block Element Modifier) para CSS

## 📄 Licencia

Este proyecto está bajo licencia privada.

---

**Siguiente paso**: Ejecuta `npm install` y luego `npm run dev` para iniciar el desarrollo.
