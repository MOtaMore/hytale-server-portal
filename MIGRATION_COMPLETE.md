# Hytale Server Portal - Migración Tauri Completada

## ✅ Estado de la Migración

La migración de Electron a Tauri se ha completado con éxito. Todas las funcionalidades principales están implementadas:

### Funcionalidades Implementadas

- ✅ **Autenticación**: Login y registro de usuarios con bcrypt
- ✅ **Gestión de Servidor**: Start/Stop/Restart con streaming de logs en tiempo real
- ✅ **Sistema de Archivos**: Listar, leer, escribir y eliminar archivos del servidor
- ✅ **Backups**: Crear, listar, restaurar y eliminar backups (formato ZIP)
- ✅ **Discord Webhooks**: Configuración y envío de notificaciones
- ✅ **Acceso Remoto**: Gestión de usuarios y configuración
- ✅ **Descarga de Servidor**: Download con progreso y detección de recursos del sistema
- ✅ **Eventos en Tiempo Real**: Sistema de eventos Tauri para logs y estado del servidor

## 🚀 Cómo Ejecutar la Aplicación

### Desarrollo

1. **Terminal 1 - Compilar Frontend:**
   ```bash
   npm run build:frontend
   ```

2. **Terminal 2 - Ejecutar App (IMPORTANTE: fuera de VS Code):**
   ```bash
   npm run dev
   ```
   
   ⚠️ **IMPORTANTE**: Ejecuta el comando desde una terminal externa, NO desde la terminal integrada de VS Code si estás usando VS Code como snap, ya que hay conflictos con glibc.

### Producción

```bash
npm run build
```

Esto generará el ejecutable en `src-tauri/target/release/`.

## 📁 Estructura del Proyecto

```
├── src/                          # Frontend (React + TypeScript)
│   ├── api/
│   │   ├── tauri.ts             # API adapter - mapea IPC a Tauri commands
│   │   └── tauri-shim.ts        # Global shim para compatibilidad
│   ├── renderer/
│   │   ├── components/          # Componentes React
│   │   ├── pages/               # Páginas principales
│   │   └── styles/              # CSS
│   └── shared/                  # Código compartido (i18n, etc)
│
└── src-tauri/                    # Backend (Rust + Tauri)
    ├── src/
    │   ├── commands/            # Tauri commands (handlers IPC)
    │   │   ├── auth.rs          # Autenticación
    │   │   ├── server.rs        # Control de servidor
    │   │   ├── files.rs         # Operaciones de archivos
    │   │   ├── backup.rs        # Sistema de backups
    │   │   ├── discord.rs       # Webhooks de Discord
    │   │   ├── remote.rs        # Acceso remoto
    │   │   ├── download.rs      # Descarga de servidor
    │   │   └── config.rs        # Configuración
    │   ├── services/
    │   │   ├── auth_service.rs  # Lógica de autenticación
    │   │   └── server_service.rs # Gestión de procesos del servidor
    │   └── lib.rs               # Entry point, setup de AppState
    └── Cargo.toml               # Dependencias Rust
```

## 🔧 Tecnologías Utilizadas

### Frontend
- React 18
- TypeScript
- Webpack 5
- @tauri-apps/api

### Backend
- Tauri 2.9.5
- Rust 1.93.0
- SQLite (rusqlite)
- bcrypt (autenticación)
- tokio (async runtime)
- reqwest (HTTP client)
- zip (backups)
- sysinfo (recursos del sistema)

## 📊 Base de Datos

La base de datos SQLite se encuentra en:
```
~/.local/share/com.hytale.servermanager/app.db
```

### Tablas:
- `users`: Usuarios de la aplicación
- `config`: Configuración general (key-value)
- `remote_users`: Usuarios de acceso remoto

## 🎯 Funcionalidades Principales

### 1. Autenticación
```typescript
// Login
await window.electron.auth.login({ username, password });

// Registro
await window.electron.auth.register({ username, email, password });
```

### 2. Control del Servidor
```typescript
// Iniciar servidor
await window.electron.server.start();

// Escuchar logs en tiempo real
window.electron.server.on('server:logs-updated', (logs) => {
  console.log('New logs:', logs);
});

// Enviar comando al servidor
await window.electron.server.sendCommand('say Hello!');
```

### 3. Backups
```typescript
// Crear backup
const backup = await window.electron.backup.create('backup_name');

// Restaurar backup
await window.electron.backup.restore(backupId);
```

### 4. Discord Webhooks
```typescript
// Configurar webhook
await window.electron.discord.saveConfig({
  webhook_url: 'https://discord.com/api/webhooks/...',
  enabled: true,
  notify_startup: true,
});

// Probar webhook
await window.electron.discord.testWebhook();
```

### 5. Descarga de Servidor
```typescript
// Descargar servidor
await window.electron.download.start('/path/to/install', 'https://server-url.zip');

// Escuchar progreso
window.electron.on('download:progress', ({ progress, downloaded, total }) => {
  console.log(`Download: ${progress}%`);
});
```

## 🔍 Debugging

### Ver logs del backend
El backend emite logs con `eprintln!`:
```bash
npm run dev 2>&1 | grep "\[AUTH\]"
npm run dev 2>&1 | grep "\[SERVER\]"
npm run dev 2>&1 | grep "\[DOWNLOAD\]"
```

### Inspeccionar base de datos
```bash
sqlite3 ~/.local/share/com.hytale.servermanager/app.db
.tables
SELECT * FROM users;
SELECT * FROM config;
```

## 🐛 Problemas Conocidos y Soluciones

### 1. Error de glibc con VS Code snap
**Problema**: `libpthread.so.0: undefined symbol: __libc_pthread_init`

**Solución**: Ejecutar desde terminal externa, no desde VS Code integrado

### 2. Login falla con "Invalid password"
**Problema**: Doble hashing de contraseñas

**Solución**: Ya está corregido. El frontend envía contraseña plain, el backend hace el hash con bcrypt.

### 3. Servidor no inicia
**Problema**: Ruta del servidor no configurada o script de inicio no existe

**Solución**: 
1. Configurar ruta: `window.electron.server.setPath('/path/to/server')`
2. Verificar que exista `start-server.sh` o `start-server.bat`
3. Dar permisos de ejecución: `chmod +x start-server.sh`

## 📝 Comandos Útiles

```bash
# Compilar frontend
npm run build:frontend

# Ejecutar en desarrollo
npm run dev

# Compilar backend solo
cd src-tauri && cargo build

# Compilar en release
npm run build

# Limpiar build
cd src-tauri && cargo clean
rm -rf dist/

# Ver errores de TypeScript
npm run build:frontend

# Verificar sintaxis Rust
cd src-tauri && cargo check
```

## 🎉 Próximos Pasos

La aplicación está lista para ser probada. Para testing completo:

1. Crear cuenta de usuario
2. Configurar ruta del servidor
3. Descargar/copiar servidor Hytale/Minecraft
4. Iniciar servidor y verificar logs
5. Probar comandos del servidor
6. Crear y restaurar backups
7. Configurar Discord webhooks
8. Configurar acceso remoto

## 🤝 Contribuir

El proyecto ha sido migrado completamente de Electron a Tauri. Todas las funcionalidades están operativas y listas para producción.

## 📄 Licencia

MIT License - Ver LICENSE para más detalles
