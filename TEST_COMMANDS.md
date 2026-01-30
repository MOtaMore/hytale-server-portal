# Comandos de Prueba Rápidos

## Test 1: Recursos del Sistema

Abre la consola del navegador (F12) y ejecuta:

```javascript
// Probar detección de recursos
const resources = await window.electron.config.getSystemResources();
console.log('CPU Cores:', resources.cpuCores);
console.log('CPU Brand:', resources.cpuModel);
console.log('Total RAM (MB):', resources.totalMemory);
console.log('Available RAM (MB):', resources.availableMemory);
console.log('totalCPUs (compat):', resources.totalCPUs);
console.log('totalRAM (compat):', resources.totalRAM);
```

**Resultado esperado:**
```
CPU Cores: 8 (o el número real de cores)
CPU Brand: "Intel(R) Core(TM) i7-..." (o tu CPU real)
Total RAM (MB): 16384 (o tu RAM real en MB)
Available RAM (MB): 8192 (o RAM disponible real)
totalCPUs (compat): 8
totalRAM (compat): 16384
```

## Test 2: Detección de Servidor

```javascript
// Configurar ruta del servidor
await window.electron.server.setPath('/home/asusmota/work/hytale-server-portal/resources/HytaleServer');

// Verificar si el servidor está instalado
const result = await window.electron.files.isServerInstalled('/home/asusmota/work/hytale-server-portal/resources/HytaleServer');
console.log('Server installed:', result.installed);
```

**Resultado esperado:**
```
Server installed: true
```

Si devuelve `false`, verifica qué archivos hay:
```javascript
const files = await window.electron.files.list('/home/asusmota/work/hytale-server-portal/resources/HytaleServer');
console.log('Files:', files.files.map(f => f.name));
```

## Test 3: Verificar en UI

1. **Ve a Configuración (Settings)**
   - Debería mostrar correctamente:
     - CPU cores disponibles
     - RAM total disponible
   - Los sliders de RAM/CPU deberían tener límites correctos

2. **Ve a Download Manager**
   - Selecciona carpeta del servidor
   - Debería detectar automáticamente si el servidor está instalado
   - Si detecta archivos (`hytale-downloader-linux-amd64`, `start-server.sh`, etc.), debería mostrar "Server already installed"

## Archivos que Detecta como "Servidor Instalado"

El sistema busca cualquiera de estos archivos:
- `hytale-server.jar`
- `server.jar`
- `start-server.sh`
- `start-server.bat`
- `hytale-downloader-linux-amd64`

## Solución de Problemas

### Si resources devuelve valores por defecto (4 cores, 8192 MB)
1. Verifica en terminal los logs:
```bash
npm run dev 2>&1 | grep "\[SYSTEM\]"
```

2. Deberías ver algo como:
```
[SYSTEM] CPU: 8 x Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz
[SYSTEM] Memory: 16384 MB total, 8192 MB used, 8192 MB available
```

3. Si no aparece, el comando no se está ejecutando. Verifica que esté registrado en `lib.rs`

### Si isServerInstalled siempre devuelve false
1. Verifica los logs en consola:
```
[SERVER] Checking if server is installed at: /ruta/...
[SERVER] Files found: X
[SERVER] Server installed: true/false
```

2. Verifica que la carpeta existe y tiene archivos:
```javascript
const files = await window.electron.files.list('/tu/ruta');
console.log(files);
```

3. Si falla con error, verifica permisos de lectura en la carpeta
