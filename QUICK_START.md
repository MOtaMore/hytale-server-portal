# 📚 Hytale Server Portal - Documentation Index

Complete documentation for Hytale Server Portal application.

## 📖 Documentation Files

### 1. **README.md** (ENGLISH)
Complete user and developer guide in English covering:
- Application overview and features
- Installation instructions
- Usage guide (Dashboard, Configuration, Files, Backups, Discord)
- Development setup and architecture
- Technology stack
- Building installers with troubleshooting
- Configuration options
- Support and troubleshooting

**Start here if**: You want complete reference documentation in English

---

### 2. **README_ES.md** (ESPAÑOL)
Documentación completa en español equivalente a README.md:
- Descripción general y características
- Instrucciones de instalación
- Guía de uso (Panel, Configuración, Archivos, Respaldos, Discord)
- Configuración para desarrollo
- Compilación de instaladores
- Configuración
- Solución de problemas

**Comienza aquí si**: Quieres documentación completa de referencia en español

---

### 3. **BUILDING.md** (ENGLISH + ESPAÑOL)
Comprehensive guide for building installers:

**Table of Contents**:
- Universal prerequisites (Node.js, npm, Git)
- Environment setup
- **Windows Build**: Requirements (Visual Studio, Python), step-by-step build
- **Linux Build**: Requirements (build-essential, python3), AppImage + DEB
- **macOS Build**: Requirements (Xcode), DMG creation
- Cross-platform compilation
- Build verification and testing
- Distribution options (GitHub, Releases, websites)
- Advanced troubleshooting
- CI/CD setup with GitHub Actions

**Start here if**: You want to compile installers for distribution

---

### 4. **QUICK_BUILD.md** (ENGLISH + ESPAÑOL)
Fast reference for building installers:

**Content**:
- 30-second prerequisites
- Platform-specific quick commands
- Build requirements summary
- Build output file sizes
- Post-build verification
- Clean build procedure
- Quick command reference
- Troubleshooting table

**Start here if**: You just want to build quickly without lots of reading

---

## 🎯 Quick Navigation

### For End Users
→ Download installers from [Releases](https://github.com/yourusername/hytale-server-portal/releases)  
→ Read: [README.md](./README.md) or [README_ES.md](./README_ES.md) - Installation and Usage sections

### For Developers
→ Clone repository  
→ Read: [README.md](./README.md) - Development section  
→ Run: `npm install && npm run dev`

### For Building Installers
→ Read: [QUICK_BUILD.md](./QUICK_BUILD.md) for fast path  
→ OR [BUILDING.md](./BUILDING.md) for detailed instructions

---

## 📋 Quick Reference by Topic

### 📥 Installation
- **Download pre-built**: [README.md Installation](./README.md#-installation)
- **Build from source**: [BUILDING.md](./BUILDING.md)

### 🚀 Getting Started
- **First launch**: [README.md Quick Start](./README.md#-quick-start)
- **Initial setup**: Create admin account, select language

### 🎮 Using the Application
- **Dashboard**: Monitor server status and performance
- **Configuration**: CPU/RAM settings
- **Files**: Upload/download/manage server files
- **Backups**: Create and restore backups
- **Discord**: Setup notifications

See [README.md Usage Guide](./README.md#-usage-guide)

### 🛠 Development
- **Setup**: Clone, install dependencies, configure .env
- **Run dev**: `npm run dev` for Electron or `npm run dev:web` for web
- **Architecture**: [README.md Project Structure](./README.md#project-structure)
- **Tech stack**: [README.md Technology Stack](./README.md#technology-stack)

### 🔨 Building Installers

**Windows**:
1. Install Visual Studio Build Tools + Python
2. `npm run build:win`
3. Installers in `dist/`

**Linux**:
1. Install build-essential, python3
2. `npm run build:linux`
3. Output: .AppImage and .deb

**macOS**:
1. Install Xcode Command Line Tools
2. `npm run build:mac`
3. Output: .dmg file

See [QUICK_BUILD.md](./QUICK_BUILD.md) or [BUILDING.md](./BUILDING.md)

### 🐛 Troubleshooting
- **General issues**: [README.md Troubleshooting](./README.md#-troubleshooting)
- **Build issues**: [BUILDING.md Troubleshooting](./BUILDING.md#troubleshooting-de-compilación)
- **Quick ref**: [QUICK_BUILD.md Troubleshooting](./QUICK_BUILD.md#-troubleshooting-windows)

---

## 🎓 Learning Path

### Path 1: User Installation and Usage
1. Read [README.md Installation](./README.md#-installation)
2. Run installer from `dist/` or download from Releases
3. Complete first-time setup
4. Explore [Usage Guide](./README.md#-usage-guide)

### Path 2: Developer Setup
1. Clone repository
2. Read [README.md Development](./README.md#-development)
3. Run `npm install`
4. Run `npm run dev`
5. Explore codebase

### Path 3: Building Installers
1. Read [QUICK_BUILD.md](./QUICK_BUILD.md)
2. Install platform-specific prerequisites
3. Run `npm run build` or `npm run build:win/linux/mac`
4. Find installers in `dist/`
5. Test installation

---

## 🔗 Project Structure

```
hytale-server-portal/
├── README.md              ← START HERE (English users)
├── README_ES.md           ← START HERE (Spanish users)
├── BUILDING.md            ← Detailed build guide
├── QUICK_BUILD.md         ← Fast build reference
├── webportal/
│   ├── main.js           # Electron main process
│   ├── server.js         # Express backend
│   ├── package.json      # Dependencies
│   ├── electron-builder.yml  # Build config
│   ├── public/
│   │   ├── index.html    # Main app page
│   │   ├── app.js        # Frontend logic
│   │   ├── translations/ # i18n files
│   │   └── styles.css    # Styling
│   └── dist/             # Build output
└── HytaleServer/         # Server launcher scripts
```

---

## 📊 File Purposes

| File | Purpose | Audience |
|------|---------|----------|
| README.md | Complete English reference | Users, Developers |
| README_ES.md | Complete Spanish reference | Usuarios, Desarrolladores |
| BUILDING.md | Detailed build instructions | Build Engineers |
| QUICK_BUILD.md | Fast build reference | Developers |
| QUICK_START.md | This file - Navigation guide | Everyone |

---

## 🌐 Supported Languages

The application supports 5 languages:
- 🇬🇧 English (en)
- 🇪🇸 Spanish (es)
- 🇧🇷 Portuguese (pt)
- 🇫🇷 French (fr)
- 🇨🇳 Chinese (zh)

Documentation available in:
- 🇬🇧 English: README.md, BUILDING.md, QUICK_BUILD.md
- 🇪🇸 Spanish: README_ES.md, (BUILDING.md/QUICK_BUILD.md include Spanish sections)

---

## 💡 Tips

### Getting Started Quickly
- Just want to run it? Download from Releases
- Want to develop? Clone repo + `npm install` + `npm run dev`
- Want to build installers? See QUICK_BUILD.md

### Finding Answers
- Feature/usage questions → README.md Usage Guide
- Build problems → BUILDING.md Troubleshooting
- Setup issues → QUICK_BUILD.md
- Code questions → README.md Development

### Before Asking for Help
1. Check relevant README section
2. Search BUILDING.md troubleshooting
3. Verify prerequisites installed
4. Try clean build: `npm cache clean --force && npm install`

---

## 🚀 Quick Commands

```bash
# Development
npm install           # Install dependencies
npm run dev          # Run Electron dev
npm run dev:web      # Run web server only

# Building
npm run build        # Build for current OS
npm run build:win    # Windows
npm run build:linux  # Linux
npm run build:mac    # macOS

# Maintenance
npm cache clean      # Clear npm cache
npm audit            # Check vulnerabilities
npm update           # Update dependencies
```

---

## 📞 Support Resources

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Documentation**: Comprehensive guides in English and Spanish
- **Email**: Support contact (if available)

---

## 📝 Document Versions

| Document | Version | Updated |
|----------|---------|---------|
| README.md | 1.0.0 | Jan 25, 2026 |
| README_ES.md | 1.0.0 | Jan 25, 2026 |
| BUILDING.md | 1.0.0 | Jan 25, 2026 |
| QUICK_BUILD.md | 1.0.0 | Jan 25, 2026 |

---

## ✨ Key Features (Quick Overview)

✅ Cross-platform desktop application (Windows, Linux, macOS)  
✅ Real-time server monitoring (CPU, RAM, Disk)  
✅ Server management (Start/Stop/Configure)  
✅ File management (Upload/Download)  
✅ Backup & Restore system  
✅ Discord integration  
✅ Multi-language support (5 languages)  
✅ Secure authentication  
✅ Professional UI with dark theme  

---

## 🎯 Next Steps

1. **Choose your role**:
   - User: Read README.md Installation section
   - Developer: Read README.md Development section
   - Build Engineer: Read BUILDING.md

2. **Follow the relevant path**:
   - Download & Install: [README.md](./README.md)
   - Setup Dev: [README.md Development](./README.md#-development)
   - Build Installers: [BUILDING.md](./BUILDING.md)

3. **Use documentation as reference**:
   - Troubleshooting: See relevant README section
   - Commands: Use QUICK_BUILD.md reference
   - Details: Consult BUILDING.md

---

**Welcome to Hytale Server Portal! 🚀**

*Last Updated: January 25, 2026*

