# 🎮 Hytale Server Portal

**A professional desktop application for managing and controlling Hytale game servers with an intuitive graphical interface.**

![License](https://img.shields.io/badge/license-Private-red)
![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11%20%7C%20Linux%20%7C%20macOS-blue)
![Version](https://img.shields.io/badge/version-1.0.0-green)
![Java](https://img.shields.io/badge/Java-25%2B-orange)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage Guide](#usage-guide)
  - [Dashboard](#dashboard)
  - [Server Configuration](#server-configuration)
  - [File Management](#file-management)
  - [Backups](#backups)
  - [Discord Integration](#discord-integration)
- [Development](#development)
  - [Project Structure](#project-structure)
  - [Technology Stack](#technology-stack)
  - [Setup for Development](#setup-for-development)
- [Building Installers](#building-installers)
  - [Prerequisites](#prerequisites)
  - [Build Commands](#build-commands)
  - [Installer Distribution](#installer-distribution)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Support](#support)

---

## 🎯 Overview

**Hytale Server Portal** is a comprehensive server management tool built with Electron and Express.js that provides server administrators with a unified control center to manage their Hytale game servers. The application combines a modern desktop interface with a robust backend API, offering real-time monitoring, file management, backup operations, and Discord integration.

### Why Hytale Server Portal?

- ✅ **All-in-One Solution**: Manage every aspect of your server from a single interface
- ✅ **Native Cross-Platform**: Windows 10/11 and Linux support without WSL or external scripts
- ✅ **Java 25 Ready**: Automatic detection across multiple Java vendors and installation paths
- ✅ **Multi-Language Support**: Full internationalization (i18n) for 5 languages (English, Spanish, Portuguese, French, Chinese)
- ✅ **Secure Authentication**: Protected endpoints with AES-256-GCM encrypted credential storage
- ✅ **Real-Time Monitoring**: Live CPU, RAM, and disk space monitoring with cross-platform process tracking
- ✅ **Professional UI**: Modern, responsive interface with dark theme and platform status alerts

---

## ⭐ Features

### 🎮 Server Management
- **Start/Stop Server**: Simple one-click server control
- **Real-Time Monitoring**: View CPU, RAM, disk usage in real-time
- **Console Output**: Live server console streaming and interaction
- **Server Status**: Instant status indicators and health checks

### ⚙️ Server Configuration
- **CPU Allocation**: Configure thread count for optimal performance
- **RAM Settings**: Set minimum and maximum RAM allocation
- **Java 25 Auto-Detection**: Automatically finds Java installations on Windows/Linux
- **Cross-Platform Process Control**: Native process management without external scripts
- **Environment Variables**: Manage server environment configuration

### 📁 File Management
- **File Browser**: Navigate and manage server files
- **Upload/Download**: Transfer files between local and server
- **Protected Files**: Automatic backup of critical server files during updates
- **Batch Operations**: Multi-file operations support

### 💾 Backup System
- **Automatic Backups**: Scheduled backup creation
- **Restore Points**: Manage multiple backup versions
- **Selective Restore**: Restore from specific backup snapshots
- **Cross-Platform Compression**: AdmZip-based backups (no external zip dependencies)
- **Custom Backup Location**: Configure backup storage paths with write permission validation

### 🤖 Discord Integration
- **Server Status Notifications**: Automatic Discord channel updates
- **Event Logging**: Discord webhook integration for server events
- **Bot Configuration**: Easy Discord bot setup and management
- **Custom Messages**: Configurable notification templates

### 🌐 Internationalization
- **5 Languages**: English, Spanish, Portuguese, French, Chinese
- **Instant Switching**: Change language without restart
- **Locale-Aware**: Date formatting and number display per locale
- **Complete Coverage**: All UI strings translated

### 🔐 Security Features
- **Admin Authentication**: Secure login with encrypted passwords
- **Session Management**: Persistent session handling
- **Protected Routes**: API endpoint authentication
- **Credential Encryption**: AES-256-GCM encryption for stored credentials
- **Access Control**: Role-based access management

---

## 📦 Requirements

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **OS** | Windows 10 (Build 19041+), Ubuntu 18.04+, macOS 10.13+ | Windows 11, Ubuntu 22.04+, macOS 12+ |
| **RAM** | 2 GB | 4 GB |
| **Disk** | 500 MB | 2 GB |
| **Java** | Java 25+ | Java 25+ |

**Important**: Java 25 is **required** for running the Hytale server. The application will detect Java automatically on startup and show a warning if it's not found.

### Software Requirements

- **Node.js**: v16.0.0 or higher
- **npm**: v7.0.0 or higher
- **Electron**: v31.0.0 (included)
- **Express.js**: v4.19.2 (included)
- **Python**: v3.7+ (for building on Linux/macOS)
- **Build Tools**: 
  - Windows: Visual Studio Build Tools or Visual Studio 2019+
  - Linux: build-essential, python3
  - macOS: Xcode Command Line Tools

---

## 📥 Installation

### Option 1: Download Pre-built Installers

Visit the [Releases Page](https://github.com/yourusername/hytale-server-portal/releases) and download the appropriate installer for your operating system:

- **Windows**: `Hytale-Server-Portal-Setup-1.0.0.exe` (NSIS Installer)
- **Linux**: `Hytale-Server-Portal-1.0.0.AppImage` (AppImage)
- **macOS**: `Hytale-Server-Portal-1.0.0.dmg` (DMG Installer)

#### Windows Installation

**Prerequisites:**
- Java 25 installed ([Download Java 25](https://www.oracle.com/java/technologies/downloads/))
- Windows 10 (Build 19041+) or Windows 11

**Steps:**
1. Download the `.exe` installer
2. Run the installer
3. Follow the installation wizard
4. Click "Finish" when complete
5. Launch from Start Menu or Desktop shortcut

**First Launch:**
- The application will automatically detect Java 25
- If Java is not found, you'll see a warning in the dashboard
- Ensure Java 25 is in your system PATH or installed in standard locations

**Supported Java Locations (auto-detected):**
- `%JAVA_HOME%/bin/java.exe`
- System PATH
- `C:/Program Files/Java/jdk-25/bin/java.exe`
- `C:/Program Files/Eclipse Adoptium/jdk-25/bin/java.exe`
- Other standard Java installation directories

#### Linux Installation
1. Download the `.AppImage` file
2. Make it executable: `chmod +x Hytale-Server-Portal-*.AppImage`
3. Run it: `./Hytale-Server-Portal-*.AppImage`

Or install the `.deb` package:
```bash
sudo dpkg -i hytale-server-portal_1.0.0_amd64.deb
hytale-server-portal
```

#### macOS Installation
1. Download the `.dmg` file
2. Open it and drag Hytale Server Portal to Applications
3. Launch from Applications folder

### Option 3: Running on Windows via WSL (Alternative Method)

**Note**: Native Windows support is now available! WSL is no longer required but remains a valid alternative installation method.

If you prefer to run the Linux version of Hytale Server Portal using WSL2 (Windows Subsystem for Linux), this method allows you to run the native Linux application.

#### Prerequisites

**WSL2 Requirements:**
- Windows 10 version 2004+ (Build 19041+) or Windows 11
- WSL2 installed and enabled
- WSLg (GUI support) enabled
  - **Windows 11**: Enabled by default
  - **Windows 10**: Requires Build 19044+ and manual configuration

#### Step-by-Step Installation

**1. Install WSL2 and Ubuntu**

Open PowerShell or Windows Terminal as Administrator and run:

```powershell
# Install WSL2 with Ubuntu (default distribution)
wsl --install

# Or if WSL is already installed, just install Ubuntu
wsl --install -d Ubuntu
```

Restart your computer when prompted.

**2. Set Up Ubuntu**

Launch Ubuntu from the Start Menu and complete the initial setup:
- Create a Linux username
- Set a Linux password
- Wait for installation to complete

**3. Update System Packages**

Inside the Ubuntu terminal:

```bash
sudo apt update
sudo apt upgrade -y
```

**4. Install Required Dependencies**

```bash
# Install required system packages
sudo apt install -y libgtk-3-0 libnotify4 libnss3 libxss1 \
  libxtst6 xdg-utils libatspi2.0-0 libdrm2 libgbm1 libasound2

# Install GUI support packages (if not already present)
sudo apt install -y x11-apps mesa-utils
```

**5. Install Hytale Server Portal**

Download the Linux `.deb` package to your Windows Downloads folder, then access it from WSL:

```bash
# Navigate to Windows Downloads folder
cd /mnt/c/Users/YourUsername/Downloads

# Install the .deb package
sudo dpkg -i hytale-server-portal_1.0.0_amd64.deb

# Fix any dependency issues (if needed)
sudo apt --fix-broken install -y
```

**6. Launch the Application**

```bash
# Launch from terminal
hytale-server-portal --no-sandbox

# Or with additional verbose logging
hytale-server-portal --no-sandbox --verbose
```

The application window will open directly in Windows thanks to WSLg.

#### WSL Configuration Tips

**Enable WSLg (GUI Support) on Windows 10**

If you're on Windows 10 Build 19044+, ensure WSLg is enabled:

```bash
# Check WSL version
wsl --version

# Update WSL to latest version
wsl --update

# Verify GUI support
echo $DISPLAY  # Should output something like :0
```

**Performance Optimization**

Create or edit `~/.wslconfig` in your Windows user directory (`C:\Users\YourUsername\.wslconfig`):

```ini
[wsl2]
memory=4GB
processors=4
swap=2GB
```

Restart WSL after changes:
```powershell
wsl --shutdown
wsl
```

**Access Windows Files from WSL**

Windows drives are mounted under `/mnt/`:
- C: drive → `/mnt/c/`
- D: drive → `/mnt/d/`

Example: Configure backup location to Windows folder:
```bash
/mnt/c/Users/YourUsername/Documents/HytaleBackups
```

#### Troubleshooting WSL Installation

**Issue: GUI doesn't appear**
```bash
# Verify WSLg is running
ps aux | grep -i wsl

# Restart WSLg
wsl --shutdown
wsl
```

**Issue: "Cannot open display"**
```bash
# Set DISPLAY variable manually
export DISPLAY=:0

# Or add to ~/.bashrc for persistence
echo "export DISPLAY=:0" >> ~/.bashrc
source ~/.bashrc
```

**Issue: Permission denied on Windows files**
```bash
# WSL has read/write access to /mnt/c/ by default
# If issues persist, run with sudo:
sudo hytale-server-portal --no-sandbox
```

**Issue: Application crashes on startup**
```bash
# Install missing libraries
sudo apt install -y libglib2.0-0 libdbus-1-3

# Run with verbose logging
hytale-server-portal --no-sandbox --verbose 2>&1 | tee ~/app-log.txt
```

#### Advantages of WSL Method

✅ **Native Linux Experience**: Full compatibility with Linux-only features  
✅ **No Code Modifications**: Use official Linux `.deb` package as-is  
✅ **Better Performance**: Native Linux commands and shell scripts work seamlessly  
✅ **Easy Updates**: Standard package management with `apt`  
✅ **Development Friendly**: Access to both Windows and Linux environments  

#### Limitations

⚠️ **Not a Native Windows App**: Requires WSL2 to be running  
⚠️ **Initial Setup**: More complex than native Windows installer  
⚠️ **WSLg Required**: GUI support only on recent Windows builds  
⚠️ **File Path Differences**: Linux paths vs Windows paths (`/mnt/c/` prefix)  

#### Creating a Desktop Shortcut (Optional)

Create a Windows shortcut to launch directly from Desktop:

1. Right-click Desktop → New → Shortcut
2. Enter location: `wsl.exe -d Ubuntu -e bash -c "hytale-server-portal --no-sandbox"`
3. Name it "Hytale Server Portal (WSL)"
4. Click Finish

Or create a `.bat` file:

```batch
@echo off
wsl -d Ubuntu -e bash -c "hytale-server-portal --no-sandbox"
```

Save as `HytaleServerPortal.bat` and double-click to launch.

---

### Option 4: Build from Source

See [Building Installers](#building-installers) section below.

---

## 🚀 Quick Start

### First Launch Setup

1. **Platform Detection**: The application automatically detects your OS and checks for:
   - Java 25 installation
   - Hytale server downloader binary
   - System requirements
2. **Language Selection**: Choose your preferred language from the available options
3. **Administrator Account**: Create your admin credentials
   - Username: Enter admin username (minimum 3 characters)
   - Password: Set a strong password (minimum 4 characters)
   - Confirm: Verify your password
4. **Complete Setup**: Click "Finish Installation"
5. **Login**: Use your credentials to access the dashboard

**Note**: If Java 25 is not detected, you'll see a warning message in the dashboard. Install Java 25 before attempting to start the server.

### Basic Server Operations

```
1. Navigate to Dashboard
2. Check Server Status
3. Click "Start" to initialize server
4. Monitor CPU, RAM, Disk in real-time
5. Use Console for advanced commands
6. Click "Stop" to shutdown gracefully
```

---

## 📖 Usage Guide

### Dashboard

The Dashboard is your command center showing:

- **Server Status**: Current state (Running, Stopped, Initializing)
- **Performance Metrics**: 
  - CPU Usage (%)
  - RAM Usage (MB)
  - Disk Space (GB)
- **Console Output**: Real-time server logs
- **Quick Actions**: Start/Stop buttons

**Tips:**
- Refresh manually or wait for auto-refresh (5-second intervals)
- Use console for direct server commands
- Monitor CPU/RAM to prevent performance issues

### Server Configuration

Configure server performance parameters:

1. Navigate to **Server Configuration** section
2. Set **CPU Threads**: Number of CPU cores to allocate
3. Set **RAM Allocation**:
   - Minimum RAM (MB): Startup memory
   - Maximum RAM (MB): Maximum allowed memory
4. Click **Save Configuration**
5. Restart server to apply changes

**Recommendations:**
- Threads: 4-8 for most servers
- Min RAM: 1024 MB (1 GB)
- Max RAM: Based on available system RAM

### File Management

Manage server files and directories:

1. Navigate to **File Manager**
2. Browse directory structure
3. **Operations**:
   - Upload: Select files to upload
   - Download: Click download icon on files
   - Delete: Remove unwanted files
   - Create Folder: Add new directories

**Important**: Protected files (startup scripts) are automatically backed up before modifications.

### Backups

Create and restore server backups:

#### Creating a Backup

1. Navigate to **Backups**
2. Click **Create Backup**
3. Enter backup name and description
4. Select backup location
5. Click **Start Backup**

**Backup includes:**
- Entire server directory
- Configuration files
- World data
- Plugins (if applicable)

#### Restoring from Backup

1. Navigate to **Backups**
2. Select desired backup snapshot
3. Click **Restore**
4. Confirm restoration (warning: current data will be replaced)
5. Wait for restoration to complete
6. Server will be stopped; click Start to resume

**Tips:**
- Create backups before major updates
- Keep multiple backup versions
- Test restoration in development first

### Discord Integration

Set up Discord notifications and bot integration:

1. Navigate to **Discord Settings**
2. **Connect Discord Bot**:
   - Enter Discord Bot Token
   - Specify Channel ID for notifications
3. **Event Configuration**:
   - Server Start/Stop notifications
   - Console error alerts
   - Backup completion updates
4. Click **Save Configuration**

**Setup Discord Bot:**
- Create bot via [Discord Developer Portal](https://discord.com/developers)
- Copy bot token
- Grant bot permissions (Send Messages, Embed Links)
- Paste token in settings

---

## 🛠 Development

### Project Structure

```
hytale-server-portal/
├── webportal/
│   ├── main.js                    # Electron main process
│   ├── preload.js                 # Electron preload script
│   ├── server.js                  # Express backend server
│   ├── package.json               # Dependencies and scripts
│   ├── electron-builder.yml       # Build configuration
│   ├── public/
│   │   ├── index.html            # Main application page
│   │   ├── app.js                # Frontend logic
│   │   ├── styles.css            # Application styling
│   │   ├── i18n-loader.js        # i18n system
│   │   ├── i18n.js               # Translation definitions
│   │   ├── preload.js            # IPC communication
│   │   └── translations/          # Translation JSON files
│   │       ├── en.json
│   │       ├── es.json
│   │       ├── pt.json
│   │       ├── fr.json
│   │       └── zh.json
│   ├── assets/
│   │   ├── icon.ico              # Windows icon
│   │   ├── icon.png              # Linux icon
│   │   └── icon.icns             # macOS icon
│   └── dist/                      # Build output directory
└── HytaleServer/                  # Server binaries and scripts
    ├── hytale-downloader-linux-amd64    # Linux downloader binary
    ├── hytale-downloader-windows-amd64.exe  # Windows downloader binary
    ├── start-server.sh              # Linux server startup script
    └── stop-server.sh               # Linux server stop script
```

### Technology Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Desktop Framework** | Electron | 31.0.0 | Cross-platform desktop apps |
| **Backend** | Express.js | 4.19.2 | REST API server |
| **Runtime** | Node.js | 16+ | JavaScript runtime |
| **Process Management** | child_process (Node.js) | Native | Direct Java process control (Windows/Linux) |
| **Authentication** | JWT + Encryption | AES-256-GCM | Secure credential storage |
| **Database** | JSON Files | Native | Configuration persistence |
| **Build Tool** | electron-builder | 25.0.0 | Multi-platform builds |
| **Compression** | adm-zip | 0.5.12 | Cross-platform backup/restore |
| **Discord** | discord.js | 14.25.1 | Bot integration |
| **Monitoring** | pidusage | 3.0.2 | Cross-platform process metrics |

### Setup for Development

#### 1. Clone Repository

```bash
git clone https://github.com/motamore/hytale-server-portal.git
cd hytale-server-portal/webportal
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Configure Environment

Create `.env` file:

```env
PORT=3000
NODE_ENV=development
ENCRYPTION_KEY=your-encryption-key
DISCORD_TOKEN=your-discord-token
```

#### 4. Run in Development Mode

```bash
# Run Electron with hot-reload
npm run dev

# Or run web server only
npm run dev:web
```

#### 5. Development Workflows

**Frontend Development:**
```bash
npm run dev:web
# Access at http://localhost:3000
```

**Full Application:**
```bash
npm run dev
# Launches Electron with integrated backend
```

**Testing Changes:**
- Frontend: Refresh browser (Ctrl+R)
- Backend: Restart Electron (Ctrl+Q, then npm run dev)

---

## 🔨 Building Installers

### Prerequisites

#### All Platforms
- Node.js v16+
- npm v7+
- 2 GB free disk space

#### Windows
- **Visual Studio Build Tools 2019+** or **Visual Studio 2022**
  - Include "Desktop development with C++" workload
- **Python 3.7+**
- **7-Zip** (optional, for better compression)

Installation:
```bash
# Using Chocolatey (if installed)
choco install visualstudio2022buildtools python

# Or download from official websites
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
# Install Xcode Command Line Tools
xcode-select --install

# Or install full Xcode from App Store
```

### Build Commands

#### Build All Installers

```bash
cd webportal
npm install
npm run build
```

**Output:**
- `dist/Hytale-Server-Portal-Setup-1.0.0.exe` (Windows NSIS)
- `dist/Hytale Server Portal 1.0.0 Setup.exe` (Windows Portable)
- `dist/Hytale-Server-Portal-1.0.0.AppImage` (Linux)
- `dist/hytale-server-portal_1.0.0_amd64.deb` (Linux DEB)
- `dist/Hytale-Server-Portal-1.0.0.dmg` (macOS)

#### Build Specific Platform

**Windows Only:**
```bash
npm run build:win
# Output: dist/*.exe
```

**Linux Only:**
```bash
npm run build:linux
# Output: dist/*.AppImage and dist/*.deb
```

**macOS Only:**
```bash
npm run build:mac
# Output: dist/*.dmg
```

#### Advanced Build Options

**Build without signing (development):**
```bash
npm run pack
```

**Build with code signing (production):**
1. Configure `customSign.js` with your certificate
2. Set certificate path in `electron-builder.yml`
3. Run: `npm run build:win`

### Installer Distribution

#### Windows Installers

**NSIS Installer** (Recommended for end users)
- File: `Hytale-Server-Portal-Setup-1.0.0.exe`
- Size: ~200-250 MB
- Features: Progress bar, installation directory selection, Start Menu shortcuts
- Distribution: Release page or direct download

**Portable Executable**
- File: `Hytale Server Portal 1.0.0 Setup.exe`
- Size: ~180-220 MB
- Features: No installation required, can run from USB drive
- Distribution: For portable deployments

#### Linux Installers

**AppImage**
- File: `Hytale-Server-Portal-1.0.0.AppImage`
- Size: ~200-250 MB
- Usage: `chmod +x *.AppImage && ./Hytale-Server-Portal-1.0.0.AppImage`
- Benefit: Works on most Linux distributions

**DEB Package**
- File: `hytale-server-portal_1.0.0_amd64.deb`
- Installation: `sudo dpkg -i hytale-server-portal_1.0.0_amd64.deb`
- Benefits: Integration with system package manager, automatic updates

#### macOS Installers

**DMG File**
- File: `Hytale-Server-Portal-1.0.0.dmg`
- Size: ~200-250 MB
- Installation: Mount DMG and drag app to Applications folder
- Code Signing: Configure in `electron-builder.yml` for production

### Troubleshooting Build Issues

#### Windows Build Fails

**Issue: "MSBuild not found"**
```bash
# Solution: Install Visual Studio Build Tools
# https://visualstudio.microsoft.com/downloads/
# Select "Desktop development with C++"
```

**Issue: Python not found**
```bash
# Solution: Install Python 3
# https://www.python.org/downloads/
# Add to PATH during installation
```

**Issue: Long path names on Windows**
```bash
# Solution: Enable long path support
reg add HKLM\SYSTEM\CurrentControlSet\Control\FileSystem /v LongPathsEnabled /t REG_DWORD /d 1

# Or build from shorter path
# Not in C:\Users\Username\Projects\very\long\path\name
```

#### Linux Build Fails

**Issue: "libxss1 not found"**
```bash
sudo apt-get install libxss1 libappindicator1 libindicator7
```

**Issue: Permission denied**
```bash
# Solution: Run with sudo (not recommended)
# Better: Fix permissions
sudo chown -R $USER:$USER .
```

#### macOS Build Fails

**Issue: "Xcode Command Line Tools not found"**
```bash
xcode-select --install
```

**Issue: Code signing required**
```bash
# For development builds without signing:
# Modify electron-builder.yml and set:
# certificateFile: null
```

---

## ⚙️ Configuration

### Configuration Files Location

The application stores all configuration and data files in platform-specific directories:

#### Windows
```
%APPDATA%\Hytale Server Portal\
├── config.json                  # Application configuration
├── users.json                   # Admin credentials
├── .initialized                 # Setup completion marker
├── HytaleServer/                # Server directory
│   ├── HytaleServer.jar
│   ├── server.log
│   ├── server-config.json       # RAM/threads configuration
│   ├── hytale-downloader-windows-amd64.exe
│   └── credentials.json         # Downloader authentication
└── backups/                     # Default backup location
    └── *.zip
```

**Example Full Path**: `C:\Users\YourUsername\AppData\Roaming\Hytale Server Portal\config.json`

#### Linux
```
~/.config/Hytale Server Portal/
├── config.json                  # Application configuration
├── users.json                   # Admin credentials
├── .initialized                 # Setup completion marker
├── HytaleServer/                # Server directory
│   ├── HytaleServer.jar
│   ├── start-server.sh
│   ├── stop-server.sh
│   ├── server-config.json       # RAM/threads configuration
│   ├── hytale-downloader-linux-amd64
│   └── credentials.json         # Downloader authentication
└── backups/                     # Default backup location
    └── *.zip
```

**Example Full Path**: `/home/yourusername/.config/Hytale Server Portal/config.json`

#### macOS
```
~/Library/Application Support/Hytale Server Portal/
├── config.json
├── users.json
├── HytaleServer/
└── backups/
```

### Configuration Files

#### `setup-config.json`
Stores setup state and administrator credentials:
```json
{
  "setupComplete": true,
  "language": "en",
  "authMode": "local"
}
```

#### `.env` / `.env.example`
Environment variables:
```env
PORT=3000
NODE_ENV=production
ENCRYPTION_KEY=your-secure-key
DISCORD_TOKEN=your-bot-token
```

#### `electron-builder.yml`
Build and installer configuration:
- Application metadata
- Platform-specific settings
- Installer options
- Code signing configuration

#### Translation Files (`public/translations/*.json`)
Language-specific UI strings for all 5 supported languages.

---

## 🐛 Troubleshooting
### Platform-Specific Issues

#### Windows: "Java 25 not found (required)"

**Problem**: The application cannot detect Java 25 on your system.

**Solutions**:

1. **Install Java 25**: Download and install from [Oracle](https://www.oracle.com/java/technologies/downloads/) or [Eclipse Adoptium](https://adoptium.net/)

2. **Add Java to PATH**:
   ```powershell
   # Open PowerShell as Administrator
   setx /M JAVA_HOME "C:\Program Files\Java\jdk-25"
   setx /M PATH "%PATH%;%JAVA_HOME%\bin"
   ```

3. **Verify Installation**:
   ```powershell
   java -version
   # Should output: java version "25..." or similar
   ```

4. **Restart Application**: Close and reopen Hytale Server Portal after installing Java

**Supported Installation Locations (auto-detected)**:
- `C:\Program Files\Java\jdk-25\bin\java.exe`
- `C:\Program Files\Eclipse Adoptium\jdk-25\bin\java.exe`
- `C:\Program Files\AdoptOpenJDK\jdk-25\bin\java.exe`
- `C:\Program Files\Zulu\zulu-25\bin\java.exe`
- `%JAVA_HOME%\bin\java.exe`
- System PATH variable

#### Windows: "Downloader not found for this platform"

**Problem**: The Hytale server downloader binary is missing.

**Solutions**:

1. **Check Installation Directory**:
   ```
   %APPDATA%\Hytale Server Portal\HytaleServer\hytale-downloader-windows-amd64.exe
   ```

2. **Reinstall Application**: Download and run the installer again

3. **Manual Fix**: Place the Windows downloader binary in the HytaleServer folder

#### Linux: "Java 25 not found (required)"

**Solutions**:

1. **Install Java 25 via Package Manager**:
   ```bash
   # Ubuntu/Debian (if available)
   sudo apt update
   sudo apt install openjdk-25-jdk
   
   # Or download from Adoptium
   wget https://github.com/adoptium/temurin25-binaries/releases/download/.../
   sudo tar -xzf OpenJDK25...tar.gz -C /usr/lib/jvm/
   sudo update-alternatives --install /usr/bin/java java /usr/lib/jvm/jdk-25/bin/java 1
   ```

2. **Verify Installation**:
   ```bash
   java -version
   which java
   ```

3. **Set JAVA_HOME**:
   ```bash
   export JAVA_HOME=/usr/lib/jvm/jdk-25
   export PATH=$JAVA_HOME/bin:$PATH
   echo "export JAVA_HOME=/usr/lib/jvm/jdk-25" >> ~/.bashrc
   ```

#### General Issues

### Application Won't Start

**Problem**: Application fails to launch after installation

**Solutions**:

1. **Check Logs**:
   - Windows: `%APPDATA%\Hytale Server Portal\logs\`
   - Linux: `~/.config/Hytale Server Portal/logs/`
   - macOS: `~/Library/Application Support/Hytale Server Portal/logs/`

2. **Delete Configuration** (reset to defaults):
   - Windows: Delete `%APPDATA%\Hytale Server Portal\.initialized`
   - Linux: Delete `~/.config/Hytale Server Portal/.initialized`

3. **Reinstall**: Uninstall completely and reinstall fresh

### Server Won't Start

**Problem**: Server fails to start even with Java installed

**Solutions**:

1. **Verify Java Version**:
   ```bash
   java -version  # Must show version 25 or higher
   ```

2. **Check RAM Settings**: Ensure configured RAM doesn't exceed available system memory

3. **Check Server Files**: Verify HytaleServer.jar exists in the server directory:
   - Windows: `%APPDATA%\Hytale Server Portal\HytaleServer\HytaleServer.jar`
   - Linux: `~/.config/Hytale Server Portal/HytaleServer/HytaleServer.jar`

4. **Check Server Log**:
   - Windows: `%APPDATA%\Hytale Server Portal\HytaleServer\server.log`
   - Linux: `~/.config/Hytale Server Portal/HytaleServer/server.log`

### Permission Denied Errors

**Problem**: Cannot select backup folders or access certain directories

**Solutions**:

1. **Windows**: Ensure the folder is not in a protected system location (use Documents, Desktop, or custom folders)
2. **Linux**: Check folder permissions with `ls -la` and adjust with `chmod` if needed
3. **Select Different Location**: Choose a folder you have write access to

### General Application Issues

**Application won't start**
```bash
# Clear cache and try again
rm -rf ~/.config/Hytale\ Server\ Portal  # Linux/macOS
rmdir /s %APPDATA%\Hytale Server Portal  # Windows

# Reinstall and launch
```

**Port 3000 already in use**
```bash
# Change port in .env
PORT=3001

# Or kill existing process
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000   # Windows
```

**Login fails after setup**
- Clear browser cache (Ctrl+Shift+Delete)
- Verify credentials in `setup-config.json`
- Reinstall if configuration is corrupted

### Server Issues

**Server won't start**
1. Check Java is installed: `java -version`
2. Verify server files are in correct location
3. Check console output for errors
4. Ensure ports are not blocked by firewall

**CPU/RAM monitoring shows 0**
1. Restart the application
2. Ensure Java process is running
3. Check system permissions
4. Verify pidusage module is correctly installed

### Discord Integration Issues

**Bot not sending messages**
1. Verify bot token is correct
2. Check channel ID format
3. Ensure bot has "Send Messages" permission
4. Check Discord server settings allow bot

**Webhook connection fails**
- Verify internet connection
- Check Discord API status
- Ensure bot token hasn't expired
- Test token with Discord's test endpoint

---

## 📞 Support

### Getting Help

1. **Documentation**: Check [Usage Guide](#usage-guide) section
2. **Troubleshooting**: See [Troubleshooting](#troubleshooting) section
3. **GitHub Issues**: Report bugs at [Issues Page](https://github.com/yourusername/hytale-server-portal/issues)
4. **Discord Community**: Join our [Discord Server](https://discord.gg/yourinvite)

### Reporting Issues

When reporting issues, include:
- Operating system and version
- Application version
- Detailed error message
- Steps to reproduce
- System specifications (CPU, RAM, OS)

### Feature Requests

Have ideas for improvements? Submit feature requests on GitHub with:
- Clear description of requested feature
- Use case and benefits
- Suggested implementation approach

---

## 📄 License

This project is proprietary software. All rights reserved.

**Copyright © 2026 Hytale Server Portal Contributors**

---

## 🙏 Credits

- **Hytale**: Game framework
- **Electron**: Desktop application framework
- **Express.js**: Web server
- **Discord.js**: Discord API integration
- **Community Contributors**: All developers who contribute to improvements

---

## 🔄 Version History

### v1.0.0 (Current)
- ✅ **Native Windows Support**: Full Windows 10/11 compatibility without WSL requirement
- ✅ **Cross-Platform Process Management**: Direct Java process control on Windows and Linux
- ✅ **Java 25 Auto-Detection**: Automatic Java 25 discovery across multiple installation locations
- ✅ **Platform Status Monitoring**: Real-time warnings for missing Java or downloader binaries
- ✅ **Cross-Platform Backups**: AdmZip-based backup/restore system (no external dependencies)
- ✅ **Multi-Language Support**: 5 languages (English, Spanish, Portuguese, French, Chinese)
- ✅ **Discord Integration**: Bot and webhook support for server notifications
- ✅ **Real-Time Monitoring**: CPU, RAM, disk usage tracking
- ✅ **Secure Authentication**: AES-256-GCM encrypted credential storage

---

**Last Updated**: January 25, 2026  
**Status**: Actively Maintained ✅
