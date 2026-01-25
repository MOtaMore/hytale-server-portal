# 🚀 Quick Start - Building & Installing

## TL;DR - Build Now

### Linux Build (✅ Works)

```bash
cd ~/work/hytale-server-portal/webportal
npm install              # First time only
npm run build:linux      # ~3-5 minutes
ls -lah dist/*.deb       # Verify output
```

**Result**: `dist/hytale-server-portal_1.0.0_amd64.deb` (83 MB)

---

## Installation Methods

### Method 1: From DEB Package (Recommended)

```bash
# Install
sudo dpkg -i ~/work/hytale-server-portal/webportal/dist/hytale-server-portal_1.0.0_amd64.deb

# If errors occur:
sudo apt-get install -f

# Run
hytale-server-portal
```

### Method 2: From Unpacked Build

```bash
# Run directly (no installation)
~/work/hytale-server-portal/webportal/dist/linux-unpacked/hytale-server-portal
```

### Method 3: Development Mode

```bash
cd ~/work/hytale-server-portal/webportal
npm run dev     # Runs Electron directly from source
```

---

## All Build Commands

```bash
cd ~/work/hytale-server-portal/webportal

# Setup (one-time)
npm install

# Build targets
npm run build:linux      # ✅ Linux DEB
npm run build:win        # ⚠️ Windows (needs Wine on Linux)
npm run build:mac        # ℹ️ macOS only
npm run build            # All platforms (CI/CD recommended)

# Development
npm run dev              # Run in Electron dev mode
npm run dev:web          # Run web server only
npm start                # Run web server (production mode)
```

---

## Troubleshooting

### Build Fails

```bash
# Clean and rebuild
rm -rf dist node_modules/.cache
npm install
npm run build:linux
```

### Installation Issues (DEB)

```bash
# Check if installed
which hytale-server-portal

# If DEB install fails with dependency errors:
sudo apt-get install -f

# See what's in the DEB:
dpkg -l | grep hytale-server-portal
```

### Application Won't Start

```bash
# Run with debug output
hytale-server-portal --enable-logging

# Or run directly:
/opt/Hytale\ Server\ Portal/hytale-server-portal

# Check processes
ps aux | grep hytale-server-portal
```

### Icons/Display Issues

```bash
# Update icon cache
sudo update-icon-caches /usr/share/icons/hicolor/

# Reopen application menu
```

---

## File Locations

**Installation Directory**: `/opt/Hytale Server Portal/`

**Application Menu Entry**: `/usr/share/applications/hytale-server-portal.desktop`

**Icons**: 
- `/usr/share/icons/hicolor/16x16/apps/hytale-server-portal.png`
- `/usr/share/icons/hicolor/32x32/apps/hytale-server-portal.png`
- `/usr/share/icons/hicolor/64x64/apps/hytale-server-portal.png`
- `/usr/share/icons/hicolor/128x128/apps/hytale-server-portal.png`
- `/usr/share/icons/hicolor/256x256/apps/hytale-server-portal.png`

**Documentation**: `/usr/share/doc/hytale-server-portal/`

---

## Uninstall

```bash
sudo dpkg -r hytale-server-portal
```

---

## Build Details

| Component | Version |
|-----------|---------|
| Electron | 31.7.7 |
| electron-builder | 26.4.0 |
| Node.js | 18.19.1+ |
| npm | 7.0+ |

---

## For Windows/macOS Users

### Windows
- Use Windows native or set up Wine: `sudo apt install wine`
- Or use GitHub Actions workflow for automated builds

### macOS
- Must build on macOS machine
- Run `npm run build:mac` on macOS

---

## Support

📖 **Full Documentation**: See `BUILDING.md` and `BUILD_STATUS_REPORT.md`

🐛 **Common Issues**: See `BUILDING.md` → Troubleshooting sections

💬 **Questions**: Check `README.md` for project overview

---

**✅ Status**: Linux builds working and tested  
**📦 Ready**: Download `hytale-server-portal_1.0.0_amd64.deb` from `dist/` folder
