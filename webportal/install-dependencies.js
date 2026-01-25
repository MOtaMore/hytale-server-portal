#!/usr/bin/env node

/**
 * Post-Installation Script for Hytale Server Portal
 * Automatically installs npm dependencies after installation
 * Runs on Windows, Linux, and macOS
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Determine if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
const packageJsonPath = path.join(__dirname, 'package.json');

console.log('🔧 Hytale Server Portal - Post-Installation Setup');
console.log('═'.repeat(50));

// Check if package.json exists
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Error: package.json not found!');
  process.exit(1);
}

// Check if node_modules already exists
if (fs.existsSync(nodeModulesPath)) {
  console.log('✅ Dependencies already installed');
  console.log('📦 node_modules found at:', nodeModulesPath);
  process.exit(0);
}

console.log('📦 Installing npm dependencies...');
console.log('⏳ This may take a few minutes...\n');

// Install dependencies using npm
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npmProcess = spawn(npm, ['install', '--production'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

npmProcess.on('error', (error) => {
  console.error('❌ Error during installation:', error.message);
  process.exit(1);
});

npmProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Dependencies installed successfully!');
    console.log('🚀 Application is ready to use');
    process.exit(0);
  } else {
    console.error(`\n❌ Installation failed with exit code ${code}`);
    process.exit(code);
  }
});
