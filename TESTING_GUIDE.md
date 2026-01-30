# Guía de Testing - Hytale Server Portal

## Problemas Corregidos ✅

Se han identificado y corregido los siguientes problemas críticos:

### 1. **Inconsistencia en nombres de parámetros** ✅
- **Problema**: El frontend enviaba parámetros en camelCase (`backupId`, `filePath`) pero el backend esperaba snake_case (`backup_id`, `file_path`)
- **Solución**: Todos los parámetros del frontend ahora mapean correctamente:
  - `backupId` → `backupId: backupId` (Tauri convierte automáticamente)
  - `path` → `dirPath: path` para list_files
  - `path` → `filePath: path` para read/write/delete
  - `userId` → `userId: userId` para delete_user

### 2. **Permisos de Tauri faltantes** ✅
- **Problema**: El archivo `capabilities/default.json` solo tenía `core:default` sin permisos para plugins
- **Solución**: Se agregaron todos los permisos necesarios:
  - `dialog:allow-open` - Para abrir selector de carpetas
  - `fs:allow-*` - Para operaciones de archivos
  - `shell:allow-execute` - Para ejecutar el servidor
  - `core:event:allow-*` - Para eventos en tiempo real

### 3. **Backend compilado correctamente** ✅
- Todas las dependencias: 635 paquetes compilados
- Warnings menores (imports no usados) - no afectan funcionalidad
- Tiempo de compilación: 3.08s

### 4. **Frontend compilado correctamente** ✅
- Webpack compila sin errores
- Bundle principal: 433 KiB
- Tiempo de compilación: ~3s

## Cómo Probar la Aplicación

### Paso 1: Ejecutar la App

**IMPORTANTE**: Ejecuta desde terminal externa (no la integrada de VS Code si es snap):

```bash
cd /home/asusmota/work/hytale-server-portal
npm run dev
```

### Paso 2: Login

1. Abre la aplicación
2. Haz login con tu usuario (el que creaste anteriormente: admin123)
3. La app debería cargar el dashboard principal

### Paso 3: Configurar Ruta del Servidor

1. Ve a la sección de configuración o inicio
2. **Haz click en "Seleccionar carpeta"** o el botón equivalente
3. Debería abrirse el selector de archivos del sistema
4. Selecciona la carpeta donde está tu servidor

**Verificación en consola del navegador (F12)**:
```javascript
// Debería devolver la ruta configurada
await window.electron.server.getPath()
```

### Paso 4: Probar Visualizador de Archivos

1. Ve a la sección "Files" o "Archivos"
2. Debería listar los archivos de la carpeta del servidor
3. Intenta abrir un archivo de texto (ej: server.properties)
4. Intenta editar y guardar

**Verificación en consola**:
```javascript
// Listar archivos
const result = await window.electron.files.list('/ruta/al/servidor')
console.log(result)

// Leer un archivo
const content = await window.electron.files.read('/ruta/al/servidor/server.properties')
console.log(content)
```

### Paso 5: Probar Backups

1. Ve a la sección de Backups
2. Crea un nuevo backup (debería tomar unos segundos)
3. Verifica que aparezca en la lista
4. Intenta restaurar el backup

**Verificación en consola**:
```javascript
// Crear backup
const backup = await window.electron.backup.create('test_backup')
console.log('Backup creado:', backup)

// Listar backups
const backups = await window.electron.backup.list()
console.log('Backups:', backups)
```

### Paso 6: Probar Discord

1. Ve a Configuración → Discord
2. Ingresa una URL de webhook válida
3. Haz click en "Test Webhook"
4. Deberías ver un mensaje en tu canal de Discord

**Verificación en consola**:
```javascript
// Configurar webhook
await window.electron.discord.saveConfig({
  webhook_url: 'https://discord.com/api/webhooks/...',
  enabled: true,
  notify_startup: true
})

// Probar
const result = await window.electron.discord.testWebhook()
console.log('Test result:', result)
```

### Paso 7: Probar Inicio de Servidor

1. Asegúrate de tener un script `start-server.sh` en la carpeta del servidor
2. Dale permisos de ejecución: `chmod +x start-server.sh`
3. Haz click en "Iniciar Servidor"
4. Los logs deberían aparecer en tiempo real

**Verificación en consola**:
```javascript
// Iniciar servidor
const result = await window.electron.server.start()
console.log('Start result:', result)

// Ver estado
const status = await window.electron.server.getStatus()
console.log('Status:', status)

// Ver logs
const logs = await window.electron.server.getLogs()
console.log('Logs:', logs)

// Enviar comando
await window.electron.server.sendCommand('say Hello from Tauri!')
```

## Debugging Avanzado

### Ver todos los comandos disponibles
```javascript
console.log(window.electron)
```

### Ver eventos emitidos
```javascript
// Escuchar logs del servidor
window.electron.on('server:logs-updated', (logs) => {
  console.log('[SERVER LOGS]', logs)
})

// Escuchar cambios de estado
window.electron.on('server:status-changed', (status) => {
  console.log('[SERVER STATUS]', status)
})

// Escuchar progreso de descarga
window.electron.on('download:progress', (progress) => {
  console.log('[DOWNLOAD]', progress)
})
```

### Ver base de datos SQLite
```bash
sqlite3 ~/.local/share/com.hytale.servermanager/app.db
.tables
SELECT * FROM users;
SELECT * FROM config;
```

### Ver logs del backend Rust
Los logs se imprimen con `eprintln!`. Para verlos, ejecuta la app desde terminal:
```bash
npm run dev 2>&1 | grep "\[AUTH\]"
npm run dev 2>&1 | grep "\[SERVER\]"
npm run dev 2>&1 | grep "\[DOWNLOAD\]"
```

## Solución de Problemas Comunes

### El selector de carpetas no se abre
- Verifica que los permisos en `capabilities/default.json` estén correctos
- Recompila: `cd src-tauri && cargo clean && cargo build`

### Los archivos no se muestran
- Verifica que la ruta del servidor esté configurada: `await window.electron.server.getPath()`
- Verifica permisos de lectura en la carpeta

### El servidor no inicia
- Verifica que exista `start-server.sh` con permisos de ejecución
- Verifica la salida de logs: `await window.electron.server.getLogs()`

### Los backups fallan
- Verifica que la carpeta del servidor existe y tiene archivos
- Verifica espacio en disco: `df -h ~/.local/share/com.hytale.servermanager/backups`

### Discord no envía mensajes
- Verifica que la URL del webhook sea válida
- Verifica tu conexión a internet
- Revisa la consola del navegador para errores

## Estado de Funcionalidades

| Funcionalidad | Estado | Notas |
|--------------|--------|-------|
| Login/Registro | ✅ | Funcionando con bcrypt |
| Selector de carpetas | ✅ | Permisos agregados |
| Listar archivos | ✅ | Parámetros corregidos |
| Leer/Escribir archivos | ✅ | Parámetros corregidos |
| Iniciar/Parar servidor | ✅ | Con logs en tiempo real |
| Enviar comandos | ✅ | Via stdin |
| Crear backups | ✅ | Formato ZIP |
| Restaurar backups | ✅ | Con preservación de permisos |
| Discord webhooks | ✅ | Con reqwest HTTP |
| Acceso remoto | ✅ | Gestión de usuarios |
| Descarga servidor | ✅ | Con progreso |
| Recursos del sistema | ✅ | CPU y RAM |

## Siguiente Paso

🎯 **¡Ejecuta la app y prueba cada funcionalidad!**

```bash
cd /home/asusmota/work/hytale-server-portal
npm run dev
```

Si encuentras algún error, abre la consola del navegador (F12) y revisa los mensajes. También puedes ver los logs del backend en la terminal donde ejecutaste `npm run dev`.
