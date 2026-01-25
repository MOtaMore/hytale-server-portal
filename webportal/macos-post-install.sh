#!/bin/bash

# Post-installation script for macOS
# Automatically installs npm dependencies after DMG installation

set -e

# Get the installation directory (usually /Applications/Hytale Server Portal.app)
APP_PATH="/Applications/Hytale Server Portal.app/Contents/Resources"
INSTALL_DIR="/Applications/Hytale Server Portal.app"
PACKAGE_JSON="$APP_PATH/package.json"
NODE_MODULES="$APP_PATH/node_modules"

echo "🔧 Hytale Server Portal - Post-Installation Setup (macOS)"
echo "═".repeat(60)

# Check if package.json exists
if [ ! -f "$PACKAGE_JSON" ]; then
  echo "❌ Error: package.json not found at $PACKAGE_JSON"
  exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  echo "❌ Error: npm is not installed"
  echo "Please install Node.js from https://nodejs.org/"
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
cd "$APP_PATH"
npm install --production

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Dependencies installed successfully!"
  echo "🚀 Application is ready to use"
  echo ""
  echo "📝 To start the application:"
  echo "  open /Applications/Hytale\ Server\ Portal.app"
  
  # Open the application
  open "$INSTALL_DIR"
  
  exit 0
else
  echo ""
  echo "❌ Error installing dependencies!"
  exit 1
fi
