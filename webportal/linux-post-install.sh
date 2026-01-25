#!/bin/bash

# Post-installation script for Linux (DEB package)
# Automatically installs npm dependencies after package installation

set -e

INSTALL_DIR="/opt/hytale-server-portal"
PACKAGE_JSON="$INSTALL_DIR/package.json"
NODE_MODULES="$INSTALL_DIR/node_modules"

echo "🔧 Hytale Server Portal - Post-Installation Setup (Linux)"
echo "════════════════════════════════════════════════════════"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ This script must be run with sudo privileges"
  exit 1
fi

# Check if package.json exists
if [ ! -f "$PACKAGE_JSON" ]; then
  echo "❌ Error: package.json not found at $PACKAGE_JSON"
  exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  echo "❌ Error: npm is not installed"
  echo "Please install Node.js and npm first:"
  echo "  Ubuntu/Debian: sudo apt-get install nodejs npm"
  echo "  Fedora: sudo dnf install nodejs"
  exit 1
fi

# Skip if node_modules already exists
if [ -d "$NODE_MODULES" ]; then
  echo "✅ Dependencies already installed"
  echo "📦 node_modules found at: $NODE_MODULES"
  exit 0
fi

echo "📦 Installing npm dependencies..."
echo "⏳ This may take a few minutes...\n"

# Install dependencies
cd "$INSTALL_DIR"
npm install --production

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Dependencies installed successfully!"
  echo "🚀 Application is ready to use"
  echo ""
  echo "📝 To start the application:"
  echo "  hytale-server-portal"
  exit 0
else
  echo ""
  echo "❌ Error installing dependencies!"
  exit 1
fi
