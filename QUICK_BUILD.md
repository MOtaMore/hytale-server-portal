# 🚀 Quick Start - Guía Rápida de Compilación

## English / Español

### 📋 Pre-requisitos (All Platforms)

```bash
# Install Node.js v16+ from https://nodejs.org/
node --version      # Check installation
npm --version
cd webportal        # Enter project directory
npm install         # Install dependencies
```

---

## 🪟 Windows Build

### Fast Track (Quickest Path)

```powershell
# PowerShell as Administrator
cd webportal

# Clean previous builds
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

# Build
npm run build

# Output: dist/*.exe files (~200-250 MB each)
```

### Requirements for Windows

- **Visual Studio 2022** or **Build Tools 2019+**
  - Must include "Desktop development with C++" workload
  - Download: https://visualstudio.microsoft.com/
  
- **Python 3.7+**
  - Download: https://www.python.org/
  - ✓ Add to PATH during installation

### Build Commands

```powershell
npm run build:win    # Build all Windows installers
npm run pack         # Build without signing
```

### Troubleshooting Windows

| Problem | Solution |
|---------|----------|
| "MSBuild not found" | Install Visual Studio Build Tools with C++ workload |
| "Python not found" | Install Python and add to PATH |
| Long path error | Enable long paths: `reg add HKLM\SYSTEM\CurrentControlSet\Control\FileSystem /v LongPathsEnabled /t REG_DWORD /d 1` |
| Port 3000 in use | Kill process: `netstat -ano \| findstr :3000` then `taskkill /PID xxx` |

---

## 🐧 Linux Build

### Fast Track

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y build-essential python3 libxss1 libappindicator1 libindicator7

cd webportal
rm -rf dist node_modules/.cache
npm install
npm run build:linux

# Output: dist/*.AppImage and dist/*.deb
chmod +x dist/*.AppImage  # Make executable
```

### Requirements for Linux

```bash
# Ubuntu/Debian
sudo apt-get install build-essential python3 libxss1 libappindicator1 libindicator7

# Fedora/RHEL
sudo dnf groupinstall "Development Tools"
sudo dnf install python3 libxss libappindicator

# Arch
sudo pacman -S base-devel python3 libxss
```

### Build Commands

```bash
npm run build:linux      # Build AppImage and DEB
npm run pack             # Build without signing
```

### Troubleshooting Linux

| Problem | Solution |
|---------|----------|
| "libxss1 not found" | `sudo apt-get install libxss1 libappindicator1 libindicator7` |
| "Python not found" | `sudo apt-get install python3` |
| Permission denied | `sudo chown -R $USER:$USER .` |
| No space left | `npm cache clean --force && rm -rf node_modules/.cache` |

---

## 🍎 macOS Build

### Fast Track

```bash
# Install Xcode Command Line Tools
xcode-select --install

cd webportal
rm -rf dist node_modules/.cache
npm install
npm run build:mac

# Output: dist/*.dmg (~220 MB)
```

### Requirements for macOS

- **Xcode Command Line Tools**
  ```bash
  xcode-select --install
  ```
  
- **Python 3.7+** (usually pre-installed)
  ```bash
  python3 --version
  ```

### Build Commands

```bash
npm run build:mac        # Build DMG installer
npm run pack             # Build without signing
```

### Troubleshooting macOS

| Problem | Solution |
|---------|----------|
| "Xcode not found" | `xcode-select --install` |
| "Python not found" | `brew install python3` or download from python.org |
| Code signing error | Set `codesignIdentity: null` in electron-builder.yml for dev builds |
| DMG creation failed | Check disk space: `df -h` |

---

## 📦 Build Output Sizes

| Platform | File | Size |
|----------|------|------|
| Windows | .exe installer | 220-250 MB |
| Windows | Portable .exe | 200-220 MB |
| Linux | .AppImage | 200-250 MB |
| Linux | .deb | 180-200 MB |
| macOS | .dmg | 200-250 MB |

---

## ✅ Post-Build Verification

### Verify Files Created

```bash
# Windows
dir dist

# Linux/macOS
ls -lh dist/

# Should show .exe/.AppImage/.dmg files
```

### Test Installation

1. **Open installer** from `dist/` folder
2. **Follow installation wizard**
3. **Launch application**
4. **Select language** (5 options available)
5. **Create admin account**
6. **Verify dashboard loads**

---

## 🔄 Clean Build from Scratch

```bash
# All platforms
npm cache clean --force
rm -rf dist node_modules
npm install
npm run build       # or build:win, build:linux, build:mac
```

---

## 📚 Full Documentation

- **English**: [README.md](./README.md)
- **Español**: [README_ES.md](./README_ES.md)
- **Build Guide**: [BUILDING.md](./BUILDING.md)

---

## 🎯 Common Commands Quick Reference

```bash
npm install             # Install dependencies
npm run dev             # Run app in development
npm run build           # Build for current platform
npm run build:win       # Build Windows installers
npm run build:linux     # Build Linux installers
npm run build:mac       # Build macOS installers
npm cache clean --force # Clear npm cache
npm audit               # Check for vulnerabilities
npm audit fix           # Auto-fix vulnerabilities
```

---

## 🆘 Need Help?

1. Check [README.md](./README.md) (English) or [README_ES.md](./README_ES.md) (Español)
2. Read [BUILDING.md](./BUILDING.md) for detailed build instructions
3. Check troubleshooting section above
4. Report issues on GitHub with:
   - OS and version
   - Node/npm version: `node --version && npm --version`
   - Full error message
   - Steps to reproduce

---

**Last Updated**: January 25, 2026  
**App Version**: 1.0.0  
**Build System**: Electron Builder 25.0.0
