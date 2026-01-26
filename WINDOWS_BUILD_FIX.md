# ⚙️ Solución: Error de Compilación en Windows

## 🔴 El Problema

```
ERROR: Cannot create symbolic link : El cliente no dispone de un privilegio requerido.
```

Esto ocurre porque **Windows no permite crear symbolic links sin privilegios de Administrador**.

---

## ✅ Solución (3 opciones)

### **Opción 1: Ejecutar como Administrador (RECOMENDADO)**

1. Abre **PowerShell** como Administrador
   - Click derecho → "Run as Administrator"

2. Navega a la carpeta del proyecto
   ```powershell
   cd D:\Proyectos de pelotudeces\hytale-server-portal\webportal
   ```

3. Ejecuta el build
   ```powershell
   npm run build:win
   ```

✅ **Debería funcionar sin problemas**

---

### **Opción 2: Habilitar Developer Mode en Windows**

Si prefieres no usar Administrador cada vez:

**Windows 10/11:**
1. Abre **Settings** → **Update & Security** → **For developers**
2. Activa **Developer mode**
3. Reinicia la computadora
4. Ejecuta `npm run build:win` normalmente

⚠️ Nota: Esto es una opción del sistema, no del proyecto.

---

### **Opción 3: Limpiar caché de electron-builder**

Si ya intentaste varias veces y quedó corrupto:

```powershell
# Eliminar caché
rmdir -Force -Recurse "$env:LOCALAPPDATA\electron-builder"

# O manualmente:
# C:\Users\<tu-usuario>\AppData\Local\electron-builder
```

Luego intenta nuevamente con Administrador.

---

## 📋 Qué cambiamos en el código

En `electron-builder.yml` agregamos:
```yaml
win:
  signingHashAlgorithms: [sha256]
  certificateFile: null
  certificatePassword: null
  signtoolOptions: []
```

Esto desactiva la firma automática de código, que no es necesaria para compilaciones locales.

---

## 🚀 Paso a paso completo

```powershell
# 1. Abre PowerShell como ADMIN
#    (Click derecho en PowerShell → Run as Administrator)

# 2. Navega al proyecto
cd "D:\Proyectos de pelotudeces\hytale-server-portal\webportal"

# 3. Limpia dependencias antiguas (opcional pero recomendado)
rmdir -Force -Recurse node_modules
rmdir -Force -Recurse dist

# 4. Reinstala dependencias
npm install

# 5. Compila
npm run build:win

# 6. Si todo bien, encontrarás el .exe en:
# dist/Hytale Server Portal Setup 1.2.0.exe
# O la versión portable
```

---

## ✅ Debería ver

```
• packaging       platform=win32 arch=x64
• completing asar integrity  resources
✓ Signing tool skipped
✓ dist\Hytale Server Portal Setup 1.2.0.exe
✓ dist\Hytale Server Portal 1.2.0.exe (portable)
```

---

## ⚠️ Troubleshooting

| Problema | Solución |
|----------|----------|
| "Still getting symbolic link error" | Ejecuta como ADMIN (no basta UAC prompt) |
| "npm: command not found" | Instala Node.js desde nodejs.org |
| "electron-builder not found" | Corre `npm install` primero |
| "port 3000 already in use" | Cierra otras apps o cambia puerto en server.js |

---

## 🎯 Verificación Final

Una vez compilado, prueba el .exe:

```powershell
.\dist\Hytale* Server Portal 1.2.0.exe
```

Debería:
1. Abrir la ventana principal
2. Conectar a Express en localhost:3000
3. Mostrar "Sistema detectado: Windows"

---

## 📝 Resumen

✅ **Requisitos:**
- PowerShell abierto como **Administrador**
- Java 25 instalado
- Node.js 18+ instalado
- 5 GB de espacio libre

✅ **Pasos:**
```powershell
cd webportal
npm install
npm run build:win
```

✅ **Resultado:**
- `dist/Hytale Server Portal Setup 1.2.0.exe` (Installer)
- `dist/Hytale Server Portal 1.2.0.exe` (Portable)

🎉 **¡Listo para usar!**
