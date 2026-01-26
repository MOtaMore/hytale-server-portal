import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import fsp from "fs/promises";
import { exec, execFile } from "child_process";
import { spawn } from "child_process";
import crypto from "crypto";
import os from "os";
import multer from "multer";
import AdmZip from "adm-zip";
import pidusage from "pidusage";
import checkDiskSpace from "check-disk-space";
import dotenv from "dotenv";
import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const PORT = process.env.PORT || 3000;
const IS_WINDOWS = process.platform === "win32";
// Directorio para datos de la aplicación (config, credenciales)
const USER_DATA_DIR = process.env.USER_DATA_DIR || path.join(os.homedir(), IS_WINDOWS ? "AppData/Roaming/Hytale Server Portal" : ".config/Hytale Server Portal");

function getDocumentsDir() {
  if (process.env.DOCUMENTS_DIR) return process.env.DOCUMENTS_DIR;

  if (IS_WINDOWS) {
    const home = process.env.USERPROFILE || os.homedir();
    const oneDriveEnv = [process.env.OneDrive, process.env.OneDriveCommercial, process.env.OneDriveConsumer].filter(Boolean);
    const candidates = [
      ...oneDriveEnv.map((d) => path.join(d, "Documents")),
      path.join(home, "OneDrive", "Documents"),
      path.join(home, "Documents")
    ];
    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) return candidate;
      } catch {
        // continue
      }
    }
    return candidates[candidates.length - 1];
  }

  // Intentar respetar XDG en Linux/macOS
  const userDirsFile = path.join(os.homedir(), ".config", "user-dirs.dirs");
  try {
    const content = fs.readFileSync(userDirsFile, "utf-8");
    const match = content.match(/XDG_DOCUMENTS_DIR=\"?(.+?)\"?$/m);
    if (match && match[1]) {
      const expanded = match[1].replace("$HOME", os.homedir());
      return path.resolve(expanded);
    }
  } catch {
    // si no existe, seguimos con el fallback
  }

  return path.join(os.homedir(), "Documents");
}

// Directorio base donde se almacenará y ejecutará el servidor Hytale y los downloaders
const DOCUMENTS_DIR = getDocumentsDir();

// Resolver RESOURCE_BASE_DIR correctamente en diferentes contextos
let RESOURCE_BASE_DIR = null;

// Contexto 1: En desarrollo (desde webportal/server.js)
if (__dirname.includes("webportal")) {
  RESOURCE_BASE_DIR = path.resolve(__dirname, "..", "HytaleServer");
}
// Contexto 2: En producción con ASAR
else if (__dirname.includes("app.asar.unpacked")) {
  RESOURCE_BASE_DIR = path.resolve(__dirname, "..", "..", "HytaleServer");
}
// Contexto 3: En producción con ASAR (alternativa)
else if (__dirname.includes("resources")) {
  const appPath = path.dirname(path.dirname(__dirname));
  RESOURCE_BASE_DIR = path.join(appPath, "HytaleServer");
}
// Fallback
else {
  RESOURCE_BASE_DIR = path.resolve(__dirname, "..", "HytaleServer");
}

// Carpeta principal del servidor en Documents/Documentos
const BASE_DIR = path.join(DOCUMENTS_DIR, "HytaleServer");
const START_SCRIPT = path.join(BASE_DIR, IS_WINDOWS ? "start-server.bat" : "start-server.sh");
const STOP_SCRIPT = path.join(BASE_DIR, IS_WINDOWS ? "stop-server.bat" : "stop-server.sh");
const SCREEN_NAME = "HytaleServer";
const CONFIG_PATH = path.join(BASE_DIR, "config.json");
const TOKEN_TTL_MS = Number(process.env.TOKEN_TTL_MS || 1000 * 60 * 60 * 8);
const DISCORD_CONFIG_PATH = path.join(USER_DATA_DIR, "discord-config.json");

// Función para resolver dinámicamente la ruta del downloader
// Busca primero en BASE_DIR (directorio de datos del usuario) y luego en RESOURCE_BASE_DIR (empaquetado)
function resolveDownloaderPath() {
  const downloaderFileName = IS_WINDOWS
    ? "hytale-downloader-windows-amd64.exe"
    : "hytale-downloader-linux-amd64";

  const userPath = path.join(BASE_DIR, downloaderFileName);
  const resourcePath = path.join(RESOURCE_BASE_DIR, downloaderFileName);

  if (fs.existsSync(userPath)) {
    return { path: userPath, source: "user" };
  }

  if (fs.existsSync(resourcePath)) {
    return { path: resourcePath, source: "resource" };
  }

  // Fallback preferido (aunque no exista) es BASE_DIR
  return { path: userPath, source: "user" };
}

// Conservamos esta constante para logs iniciales; el resto del código usa resolveDownloaderPath()
const DOWNLOADER_PATH = resolveDownloaderPath().path;
const AUTH_CONFIG_PATH = path.join(USER_DATA_DIR, ".auth-secure");
const SERVER_AUTH_CONFIG_PATH = path.join(USER_DATA_DIR, "server-auth.json");
const DOWNLOAD_STATUS_PATH = path.join(BASE_DIR, ".download-status.json");
const SETUP_CONFIG_PATH = path.join(USER_DATA_DIR, "setup-config.json");
const DOWNLOADER_AUTH_SESSIONS = new Map();

// ============================================
// ============ CREDENTIAL ENCRYPTION ============
// AES-256-GCM encryption for secure password storage
// ============================================

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || generateEncryptionKey();
const CIPHER_ALGORITHM = 'aes-256-gcm';

function generateEncryptionKey() {
  // Use environment variable or generate key based on server hostname
  const hostname = os.hostname();
  return crypto.createHash('sha256').update(hostname + 'hytale-server-secure').digest();
}

function encryptPassword(password) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    console.error('[ERROR] Encryption failed:', error);
    throw new Error('Failed to encrypt password');
  }
}

function decryptPassword(encryptedData) {
  try {
    const decipher = crypto.createDecipheriv(
      CIPHER_ALGORITHM, 
      ENCRYPTION_KEY, 
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[ERROR] Decryption failed:', error);
    throw new Error('Failed to decrypt password');
  }
}

const DATA_DISK_PATHS = [
  "/media/motamore/DATA/latampvp",
  "/media/motamore/DATA"
];

const HIDDEN_EXTENSIONS = new Set([".sh", ".bat"]);
const HIDDEN_FILES = new Set([
  "hytale-downloader-linux-amd64",
  "hytale-downloader-windows-amd64.exe",
  ".hytale-downloader-credentials.json",
  "start-server.bat",
  "stop-server.bat",
  "start-server.sh",
  "stop-server.sh"
]);
// Directorio de datos del usuario (escribible)
fs.mkdirSync(USER_DATA_DIR, { recursive: true });
fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });

async function ensureBaseDir() {
  try {
    console.log("[Init] Sistema detectado:", IS_WINDOWS ? "Windows" : "Linux/macOS");
    console.log("[Init] USER_DATA_DIR:", USER_DATA_DIR);
    console.log("[Init] DOCUMENTS_DIR:", DOCUMENTS_DIR);
    console.log("[Init] RESOURCE_BASE_DIR:", RESOURCE_BASE_DIR);
    console.log("[Init] BASE_DIR:", BASE_DIR);
    
    await fsp.mkdir(BASE_DIR, { recursive: true });
    console.log("[Init] ✓ BASE_DIR creada:", BASE_DIR);

    const filesToCopy = IS_WINDOWS
      ? ["hytale-downloader-windows-amd64.exe", "start-server.bat", "stop-server.bat"]
      : ["hytale-downloader-linux-amd64", "start-server.sh", "stop-server.sh"];

    const marker = path.join(BASE_DIR, ".initialized");
    if (fs.existsSync(marker)) {
      console.log("[Init] Ya inicializado previamente");
      const resolved = resolveDownloaderPath();
      console.log("[Init] DOWNLOADER_PATH:", resolved.path, "(source:", resolved.source, ")");
      console.log("[Init] Downloader existe:", fs.existsSync(resolved.path) ? "✓ SÍ" : "✗ NO");

      // Reponer archivos que falten desde RESOURCE_BASE_DIR
      const downloaderFileName = IS_WINDOWS
        ? "hytale-downloader-windows-amd64.exe"
        : "hytale-downloader-linux-amd64";
      const userPath = path.join(BASE_DIR, downloaderFileName);
      const resourcePath = path.join(RESOURCE_BASE_DIR, downloaderFileName);
      if (!fs.existsSync(userPath)) {
        if (fs.existsSync(resourcePath)) {
          console.log("[Init] Downloader faltante en BASE_DIR, copiando desde recursos empaquetados...");
          await fsp.mkdir(BASE_DIR, { recursive: true });
          await fsp.copyFile(resourcePath, userPath);
          if (!IS_WINDOWS) {
            await fsp.chmod(userPath, 0o755);
          }
          console.log("[Init] ✓ Downloader copiado en:", userPath);
        } else {
          console.warn("[Init] ⚠ Downloader NO ENCONTRADO en recursos ni en BASE_DIR");
          console.warn("[Init] Por favor, copia manualmente el downloader a:", userPath);
        }
      }

      // Reponer scripts y downloader que falten
      for (const file of filesToCopy) {
        const sourcePath = path.join(RESOURCE_BASE_DIR, file);
        const destPath = path.join(BASE_DIR, file);
        if (!fs.existsSync(destPath) && fs.existsSync(sourcePath)) {
          console.log(`[Init] Restaurando ${file} en BASE_DIR...`);
          await fsp.copyFile(sourcePath, destPath);
          if (!IS_WINDOWS && (file.includes("downloader") || file.endsWith(".sh"))) {
            await fsp.chmod(destPath, 0o755);
          }
        }
      }
      return;
    }

    // Copiar recursos iniciales del directorio empaquetado si existen
    console.log("[Init] Verificando recursos en:", RESOURCE_BASE_DIR);
    if (fs.existsSync(RESOURCE_BASE_DIR)) {
      console.log("[Init] Copiando recursos desde:", RESOURCE_BASE_DIR);
      
      for (const file of filesToCopy) {
        const sourcePath = path.join(RESOURCE_BASE_DIR, file);
        const destPath = path.join(BASE_DIR, file);
        
        if (fs.existsSync(sourcePath)) {
          console.log(`[Init] Copiando ${file}...`);
          await fsp.copyFile(sourcePath, destPath);
          
          // Dar permisos de ejecución en sistemas Unix
          if (!IS_WINDOWS && (file.includes("downloader") || file.endsWith(".sh"))) {
            await fsp.chmod(destPath, 0o755);
          }
          console.log(`[Init] ✓ ${file} copiado`);
        } else {
          console.warn(`[Init] ⚠ ${file} no encontrado en ${RESOURCE_BASE_DIR}`);
        }
      }
    } else {
      console.warn("[Init] ADVERTENCIA: Directorio de recursos no encontrado en:", RESOURCE_BASE_DIR);
      console.warn("[Init] Por favor, asegúrate de que los archivos del servidor estén en:", BASE_DIR);
    }

    await fsp.writeFile(marker, "ok", "utf-8");
    console.log("[Init] Directorio base inicializado correctamente");
    const resolved = resolveDownloaderPath();
    console.log("[Init] DOWNLOADER_PATH:", resolved.path, "(source:", resolved.source, ")");
    console.log("[Init] Downloader existe:", fs.existsSync(resolved.path) ? "✓ SÍ" : "✗ NO");
  } catch (error) {
    console.error("[Init] Error preparando directorio base:", error.message);
    console.error("[Init] Stack:", error.stack);
    throw error;
  }
}

await ensureBaseDir();

// ================= PLATFORM HELPERS =================

function normalizeExe(file) {
  if (IS_WINDOWS && !file.endsWith(".exe")) return `${file}.exe`;
  return file;
}

async function findJavaExecutable() {
  // Priority: JAVA_HOME/bin/java, then PATH, then common Windows locations for Java 25
  const candidates = [];
  if (process.env.JAVA_HOME) {
    candidates.push(path.join(process.env.JAVA_HOME, "bin", normalizeExe("java")));
  }

  // PATH lookup
  candidates.push("java");

  if (IS_WINDOWS) {
    const programFiles = [
      process.env["ProgramFiles"],
      process.env["ProgramFiles(x86)"],
      "C:/Program Files",
      "C:/Program Files (x86)"
    ].filter(Boolean);
    const javaVendors = [
      "Java",
      "Eclipse Adoptium",
      "AdoptOpenJDK",
      "Zulu",
      "Temurin"
    ];
    for (const root of programFiles) {
      for (const vendor of javaVendors) {
        candidates.push(path.join(root, vendor, "jdk-25", "bin", "java.exe"));
        // Include minor versions
        for (const minor of [0, 1, 2, 3, 4, 5]) {
          candidates.push(path.join(root, vendor, `jdk-25.${minor}`, "bin", "java.exe"));
        }
      }
    }
  } else {
    // Linux typical locations if PATH fails
    candidates.push("/usr/bin/java");
    candidates.push("/usr/local/bin/java");
  }

  for (const candidate of candidates) {
    try {
      await fsp.access(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

// Server process management (cross-platform)
let serverProcess = null;
let serverProcessExited = true;
let serverLogStream = null;

async function downloaderExists() {
  try {
    const { path: downloaderPath } = resolveDownloaderPath();
    if (IS_WINDOWS) {
      return fs.existsSync(downloaderPath);
    }
    await fsp.access(downloaderPath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

// Removed: Discord client variables now managed by DiscordService

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        const safe = resolveSafe(req.query.path || ".");
        cb(null, safe);
      } catch (err) {
        cb(err);
      }
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    }
  }),
  limits: { fileSize: 1024 * 1024 * 1024 }
});

function resolveSafe(relPath) {
  const target = path.resolve(BASE_DIR, relPath || ".");
  if (target === BASE_DIR) return target;
  if (!target.startsWith(BASE_DIR + path.sep)) {
    throw new Error("Ruta inválida");
  }
  return target;
}

function isHiddenFile(filePath) {
  const name = path.basename(filePath);
  if (HIDDEN_FILES.has(name)) return true;
  return HIDDEN_EXTENSIONS.has(path.extname(name).toLowerCase());
}

function rejectHiddenPath(relPath) {
  if (!relPath) return;
  const parts = relPath.split(/[\\/]+/);
  for (const part of parts) {
    if (isHiddenFile(part)) {
      throw new Error("Archivo no permitido");
    }
  }
}

function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    // Cross-platform: use cmd.exe on Windows, bash on Linux/Mac
    const shell = IS_WINDOWS ? "cmd.exe" : "bash";
    const args = IS_WINDOWS ? ["/c", scriptPath] : [scriptPath];
    
    execFile(shell, args, { cwd: BASE_DIR }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || stdout || err.message));
        return;
      }
      resolve(stdout || stderr || "OK");
    });
  });
}

function getScreenStatus() {
  if (IS_WINDOWS) {
    // On Windows, rely on serverProcess tracking
    return Promise.resolve({ running: isServerRunning(), raw: "" });
  }
  // On Linux/Mac, use screen command
  return new Promise((resolve) => {
    exec("screen -list", (err, stdout) => {
      if (err) {
        resolve({ running: false, raw: "" });
        return;
      }
      const running = /[0-9]+\.HytaleServer\b/.test(stdout);
      resolve({ running, raw: stdout });
    });
  });
}

async function readStartConfig() {
  try {
    const content = await fsp.readFile(START_SCRIPT, "utf-8");
    
    // Primero intentar leer la variable XMX definida en el script
    let xmx = null;
    const xmxVarMatch = content.match(/XMX="?(\d+)([kKmMgG])"?/);
    if (xmxVarMatch) {
      xmx = parseSizeToBytes(Number(xmxVarMatch[1]), xmxVarMatch[2]);
    } else {
      // Fallback: buscar directamente en el comando java
      const xmxCmdMatch = content.match(/-Xmx(\d+)([kKmMgG])/);
      if (xmxCmdMatch) {
        xmx = parseSizeToBytes(Number(xmxCmdMatch[1]), xmxCmdMatch[2]);
      }
    }
    
    // Extract JAR name from startup script (may be in a variable or direct reference)
    let jarName = "HytaleServer.jar";
    const jarVarMatch = content.match(/SERVER_JAR="?([^"\s]+)"?/);
    if (jarVarMatch) {
      jarName = jarVarMatch[1];
    } else {
      const jarCmdMatch = content.match(/-jar\s+([^\s\\]+)/);
      if (jarCmdMatch) {
        jarName = jarCmdMatch[1];
      }
    }
    
    return { xmx, jarName };
  } catch {
    return { xmx: null, jarName: "HytaleServer.jar" };
  }
}

async function readServerConfig() {
  const SERVER_CONFIG_PATH = path.join(BASE_DIR, "server-config.json");
  try {
    if (fs.existsSync(SERVER_CONFIG_PATH)) {
      const cfg = JSON.parse(await fsp.readFile(SERVER_CONFIG_PATH, "utf8"));
      return {
        threads: cfg.threads || 4,
        ramMin: cfg.ramMin || 2048,
        ramMax: cfg.ramMax || 4096
      };
    }
  } catch (e) {
    console.error("[ServerConfig] Error reading:", e.message);
  }
  return { threads: 4, ramMin: 2048, ramMax: 4096 };
}

function getServerLogStream() {
  if (!serverLogStream) {
    const logPath = path.join(BASE_DIR, "server.log");
    serverLogStream = fs.createWriteStream(logPath, { flags: "a" });
  }
  return serverLogStream;
}

function closeServerLogStream() {
  if (serverLogStream) {
    try {
      serverLogStream.end();
    } catch {}
    serverLogStream = null;
  }
}

function isServerRunning() {
  return !!(serverProcess && !serverProcessExited);
}

async function startServerProcessNode() {
  if (isServerRunning()) {
    throw new Error("Server already running");
  }

  const javaPath = await findJavaExecutable();
  if (!javaPath) {
    throw new Error("Java 25 not found. Please install Java 25 and try again.");
  }

  const { ramMin, ramMax } = await readServerConfig();
  const { jarName } = await readStartConfig();
  const jarPath = path.join(BASE_DIR, jarName);
  if (!fs.existsSync(jarPath)) {
    throw new Error(`Server jar not found at ${jarPath}`);
  }

  const args = [
    `-Xms${ramMin}M`,
    `-Xmx${ramMax}M`,
    "-jar",
    jarPath
  ];

  const child = spawn(javaPath, args, {
    cwd: BASE_DIR,
    env: {
      ...process.env,
      JAVA_TOOL_OPTIONS: undefined
    },
    stdio: ["pipe", "pipe", "pipe"]
  });

  serverProcess = child;
  serverProcessExited = false;

  const logStream = getServerLogStream();
  const forward = (data) => {
    const text = data.toString();
    logStream.write(text);
    console.log(`[ServerProc] ${text}`);
  };
  child.stdout.on("data", forward);
  child.stderr.on("data", forward);

  child.on("exit", (code, signal) => {
    serverProcessExited = true;
    serverProcess = null;
    closeServerLogStream();
    console.log(`[ServerProc] exited code=${code} signal=${signal}`);
  });

  // Give process a moment to initialize
  return new Promise((resolve, reject) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    }, 2000);

    child.once("error", (err) => {
      if (resolved) return;
      clearTimeout(timer);
      resolved = true;
      reject(err);
    });
  });
}

async function stopServerProcessNode() {
  if (!serverProcess || serverProcessExited) return;

  return new Promise((resolve) => {
    const pid = serverProcess.pid;
    const done = () => {
      serverProcessExited = true;
      serverProcess = null;
      closeServerLogStream();
      resolve();
    };

    if (IS_WINDOWS) {
      const killer = spawn("taskkill", ["/PID", String(pid), "/T", "/F"]);
      killer.on("exit", done);
      killer.on("error", done);
    } else {
      serverProcess.once("exit", done);
      serverProcess.kill("SIGTERM");
      setTimeout(() => {
        if (!serverProcessExited) {
          serverProcess.kill("SIGKILL");
        }
      }, 5000);
    }
  });
}

// Cache for storing the last CPU reading to calculate CPU percentage
const cpuCache = new Map();

async function getProcessStatsFromProc(pid) {
  try {
    const statFile = `/proc/${pid}/stat`;
    const statusFile = `/proc/${pid}/status`;
    
    if (!fs.existsSync(statFile) || !fs.existsSync(statusFile)) {
      return null;
    }

    const stat = await fsp.readFile(statFile, "utf-8");
    const status = await fsp.readFile(statusFile, "utf-8");

    // Parsear memoria desde /proc/pid/status
    const vmRssMatch = status.match(/VmRSS:\s*(\d+)/);
    const memoryKB = vmRssMatch ? parseInt(vmRssMatch[1]) : 0;
    const memoryBytes = memoryKB * 1024;

    // Parsear CPU desde /proc/pid/stat (tiempo de usuario + kernel en ticks)
    const statFields = stat.split(/\s+/);
    const utime = parseInt(statFields[13]) || 0;
    const stime = parseInt(statFields[14]) || 0;
    const totalTicks = utime + stime;

    // Get current time in milliseconds for CPU calculation
    const now = Date.now();

    // Retrieve last cached value for this process
    const cached = cpuCache.get(pid);
    
    let cpu = 0;
    
    if (cached) {
      // Calcular la diferencia de tiempo y ticks
      const timeDeltaMs = now - cached.timestamp;
      const ticksDelta = totalTicks - cached.totalTicks;
      
      // CPU% = (ticksDelta / (timeDeltaMs / 1000)) / numCPUs * 100
      // Simplificado: (ticksDelta * 1000 / timeDeltaMs) / numCPUs * 100
      // Assuming ticks per second = 100 (typical CLK_TCK value on Linux)
      const ticksPerSecond = 100;
      
      if (timeDeltaMs > 0) {
        // Calculate CPU percentage for a single core
        cpu = (ticksDelta / ticksPerSecond) / (timeDeltaMs / 1000) * 100;
      }
    }

    // Update cache with current reading for next calculation
    cpuCache.set(pid, {
      totalTicks,
      timestamp: now
    });

    return {
      pid,
      memory: Math.max(0, memoryBytes),
      cpu: Math.max(0, Math.min(800, cpu)) // Allow up to 800% for multi-core systems
    };
  } catch (error) {
    console.error("Error leyendo /proc:", error.message);
    return null;
  }
}

async function findDataDisk() {
  for (const dataPath of DATA_DISK_PATHS) {
    try {
      await fsp.stat(dataPath);
      return dataPath;
    } catch {
      continue;
    }
  }
  return null;
}

async function loadBackupConfigFile() {
  try {
    if (fs.existsSync(BACKUP_CONFIG_PATH)) {
      const raw = await fsp.readFile(BACKUP_CONFIG_PATH, "utf8");
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error("[Backup] Error leyendo config:", error.message);
  }
  return null;
}

async function resolveBackupDirectory() {
  // Prioridad: configuración guardada -> disco DATA detectado -> carpeta interna
  const config = await loadBackupConfigFile();
  let candidate = config?.backupLocation;

  if (!candidate) {
    const dataDisk = await findDataDisk();
    candidate = dataDisk || path.join(BASE_DIR, "backups");
  }

  const absolutePath = path.isAbsolute(candidate)
    ? candidate
    : path.resolve(candidate);

  try {
    await fsp.mkdir(absolutePath, { recursive: true });
    await fsp.access(absolutePath, fs.constants.W_OK);
  } catch (err) {
    throw new Error("No tiene permisos de escritura en la carpeta seleccionada");
  }

  // Si no había config guardada, persistir la ruta utilizada
  if (!config) {
    const defaultConfig = {
      backupLocation: absolutePath,
      enabled: true,
      updatedAt: new Date().toISOString()
    };
    try {
      await fsp.writeFile(BACKUP_CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
    } catch (err) {
      console.error("[Backup] No se pudo persistir config por defecto:", err.message);
    }
  }

  return { dir: absolutePath, config: config || null };
}

async function addDirToZipExcludeHidden(zip, dirPath, baseDir = "") {
  const entries = await fsp.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (isHiddenFile(entry.name)) continue;
    const fullPath = path.join(dirPath, entry.name);
    const zipPath = path.join(baseDir, entry.name);
    if (entry.isDirectory()) {
      await addDirToZipExcludeHidden(zip, fullPath, zipPath);
    } else if (entry.isFile()) {
      const content = await fsp.readFile(fullPath);
      zip.addFile(zipPath, content);
    }
  }
}

function formatDateForBackup() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${day}-${month}-${year}-${hours}-${minutes}`;
}

function parseSizeToBytes(value, unit) {
  const u = unit.toLowerCase();
  if (u === "k") return value * 1024;
  if (u === "m") return value * 1024 ** 2;
  if (u === "g") return value * 1024 ** 3;
  return value;
}

async function findJavaProcessWindows() {
  // Windows: Use tasklist to find java.exe processes
  return new Promise((resolve) => {
    exec('tasklist /FI "IMAGENAME eq java.exe" /FO LIST /V', (err, stdout) => {
      if (err || !stdout.trim()) return resolve(null);
      
      // Parse tasklist output to find PID
      // Format: "PID                     : 1234"
      const lines = stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/PID\s+:\s+(\d+)/);
        if (match) {
          return resolve(Number(match[1]));
        }
      }
      resolve(null);
    });
  });
}

async function findJavaProcessUnix(jarName) {
  // Unix/Linux/Mac: Use ps command
  const pattern = jarName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Attempt 1: Find Java process specifically
  const byJava = await new Promise((resolve) => {
    exec(`ps -eo pid,comm,cmd | grep -E "^[[:space:]]*[0-9]+[[:space:]]+java[[:space:]]" | grep "${pattern}" | awk '{print $1}' | head -n 1`, (err, stdout) => {
      if (err || !stdout.trim()) return resolve(null);
      const pid = Number(stdout.trim());
      resolve(Number.isFinite(pid) ? pid : null);
    });
  });

  if (byJava) return byJava;

  // Attempt 2: Find by base directory
  const byDir = await new Promise((resolve) => {
    exec(`ps -eo pid,comm,cmd | grep -E "^[[:space:]]*[0-9]+[[:space:]]+java[[:space:]]" | grep "${BASE_DIR}" | awk '{print $1}' | head -n 1`, (err, stdout) => {
      if (err || !stdout.trim()) return resolve(null);
      const pid = Number(stdout.trim());
      resolve(Number.isFinite(pid) ? pid : null);
    });
  });

  if (byDir) return byDir;

  // Attempt 3: Search by memory parameters
  const byMemory = await new Promise((resolve) => {
    exec(`ps -eo pid,comm,cmd | grep -E "^[[:space:]]*[0-9]+[[:space:]]+java[[:space:]]" | grep -E "(Xmx64G|Xmx32G)" | grep -v grep | awk '{print $1}' | head -n 1`, (err, stdout) => {
      if (err || !stdout.trim()) return resolve(null);
      const pid = Number(stdout.trim());
      resolve(Number.isFinite(pid) ? pid : null);
    });
  });

  return byMemory;
}

async function getServerProcessUsage(jarName) {
  // First try: Use tracked process (most reliable)
  if (isServerRunning() && serverProcess?.pid) {
    try {
      const stats = await pidusage(serverProcess.pid);
      return { pid: serverProcess.pid, ...stats };
    } catch (e) {
      console.error("[Metrics] pidusage failed for tracked pid:", e.message);
    }
  }

  // Second try: Find Java process based on platform
  let pid;
  if (IS_WINDOWS) {
    pid = await findJavaProcessWindows();
  } else {
    pid = await findJavaProcessUnix(jarName);
  }

  if (!pid) return null;

  // Third try: Use /proc directly on Linux (most reliable)
  if (!IS_WINDOWS) {
    const procStats = await getProcessStatsFromProc(pid);
    if (procStats) {
      return { pid, ...procStats };
    }
  }

  // Fallback: Use pidusage library (works on all platforms)
  try {
    const stats = await pidusage(pid);
    return { pid, ...stats };
  } catch {
    return null;
  }
}

async function getFolderSizeBytes(dir) {
  let total = 0;
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (isHiddenFile(entry.name)) continue;
    if (entry.isDirectory()) {
      total += await getFolderSizeBytes(full);
    } else if (entry.isFile()) {
      const stat = await fsp.stat(full);
      total += stat.size;
    }
  }
  return total;
}

function formatError(error) {
  if (typeof error === "string") return error;
  return error?.message || "Error";
}

function stripAnsi(text) {
  if (!text) return "";
  return text.replace(/\x1B\[[0-9;]*[ -\/]*[@-~]/g, "");
}

// ==================== SERVICE LAYER (OOP) ====================
// Lightweight service classes to isolate responsibilities and reduce
// the amount of ad-hoc logic inside the route handlers.

class AuthService {
  constructor({ authConfigPath, setupConfigPath, tokenTtlMs }) {
    this.authConfigPath = authConfigPath;
    this.setupConfigPath = setupConfigPath;
    this.tokenTtlMs = tokenTtlMs;
    this.tokens = new Map();
  }

  cleanupTokens() {
    const now = Date.now();
    for (const [token, meta] of this.tokens.entries()) {
      if (now - meta.createdAt > this.tokenTtlMs) {
        this.tokens.delete(token);
      }
    }
  }

  async loadPanelCredentials() {
    let expectedUser = "admin";
    let expectedPass = "admin";

    try {
      if (fs.existsSync(this.authConfigPath)) {
        const authConfig = JSON.parse(await fsp.readFile(this.authConfigPath, "utf8"));
        expectedUser = authConfig.username || expectedUser;

        if (authConfig.encrypted && authConfig.password) {
          try {
            expectedPass = decryptPassword(authConfig.password);
          } catch (error) {
            console.error("[Auth] Failed to decrypt password:", error.message);
            expectedPass = authConfig.password;
          }
        } else {
          expectedPass = authConfig.password || expectedPass;
        }
      }
    } catch (error) {
      console.error("[Auth] Loading auth config:", error.message);
    }

    expectedUser = process.env.PANEL_USER || expectedUser;
    expectedPass = process.env.PANEL_PASS || expectedPass;

    return { expectedUser, expectedPass };
  }

  async login(username, password) {
    const { expectedUser, expectedPass } = await this.loadPanelCredentials();
    const receivedUser = (username || "").trim();
    const receivedPass = (password || "").trim();

    if (receivedUser !== expectedUser || receivedPass !== expectedPass) {
      throw new Error("Credenciales inválidas");
    }

    const token = crypto.randomBytes(24).toString("hex");
    this.tokens.set(token, { createdAt: Date.now() });

    return { token, expiresInMs: this.tokenTtlMs };
  }

  middleware = (req, res, next) => {
    if (!req.path.startsWith("/api")) {
      return next();
    }
    if (req.path === "/api/login" || req.path.startsWith("/api/setup")) {
      return next();
    }

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    this.cleanupTokens();

    if (!token || !this.tokens.has(token)) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }

    next();
  };

  async completeSetup({ username, password, language }) {
    if (!username || !password || !language) {
      throw new Error("Faltan datos requeridos");
    }

    if (password.length < 4) {
      throw new Error("La contraseña debe tener al menos 4 caracteres");
    }

    const setupConfig = {
      setupCompleted: true,
      language,
      completedAt: new Date().toISOString()
    };

    await fsp.writeFile(this.setupConfigPath, JSON.stringify(setupConfig, null, 2));

    const encryptedPassword = encryptPassword(password.trim());
    const authConfig = {
      username: username.trim(),
      password: encryptedPassword,
      encrypted: true,
      encryptedAt: new Date().toISOString()
    };

    await fsp.writeFile(this.authConfigPath, JSON.stringify(authConfig, null, 2));

    process.env.PANEL_USER = username.trim();
    process.env.PANEL_PASS = password.trim();
  }

  async getSetupStatus() {
    try {
      if (fs.existsSync(this.setupConfigPath)) {
        const setupConfig = JSON.parse(await fsp.readFile(this.setupConfigPath, "utf8"));
        return {
          setupCompleted: true,
          language: setupConfig.language
        };
      }
    } catch (error) {
      console.error("[Setup] Error reading setup config:", error.message);
    }
    return { setupCompleted: false };
  }

  async getServerAuthConfig() {
    try {
      if (fs.existsSync(SERVER_AUTH_CONFIG_PATH)) {
        const content = await fsp.readFile(SERVER_AUTH_CONFIG_PATH, "utf-8");
        return JSON.parse(content);
      }
    } catch (error) {
      console.error("[ServerAuth] Error reading config:", error.message);
    }
    return { authMode: "authenticated", deviceCode: null, authenticated: false };
  }

  async saveServerAuthConfig(config) {
    await fsp.writeFile(SERVER_AUTH_CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
  }
}

class ServerService {
  constructor({ baseDir, startScript, stopScript, screenName }) {
    this.baseDir = baseDir;
    this.startScript = startScript;
    this.stopScript = stopScript;
    this.screenName = screenName;
  }

  async start() {
    if (IS_WINDOWS) {
      await startServerProcessNode();
      return "Server started (Windows)";
    }
    return runScript(this.startScript);
  }

  async stop() {
    if (IS_WINDOWS) {
      await stopServerProcessNode();
      return "Server stopped (Windows)";
    }
    return runScript(this.stopScript);
  }

  async getStatus() {
    return getScreenStatus();
  }

  async sendCommand(command) {
    if (!command || typeof command !== "string") {
      throw new Error("Comando inválido");
    }

    const status = await getScreenStatus();
    if (!status.running) {
      throw new Error("El servidor no está en ejecución");
    }

    if (IS_WINDOWS) {
      if (!serverProcess || serverProcessExited || !serverProcess.stdin) {
        throw new Error("No se puede enviar comando: proceso no disponible");
      }
      serverProcess.stdin.write(`${command}\n`);
      return;
    }

    await new Promise((resolve, reject) => {
      execFile(
        "screen",
        ["-S", this.screenName, "-X", "stuff", `${command}\n`],
        (err, stdout, stderr) => {
          if (err) {
            reject(new Error(stderr || stdout || err.message));
            return;
          }
          resolve();
        }
      );
    });
  }

  async readLogs(lines = 100) {
    const logFile = path.join(this.baseDir, "server.log");
    if (!fs.existsSync(logFile)) return "";
    const content = await fsp.readFile(logFile, "utf-8");
    const allLines = content.split("\n").map(stripAnsi);
    return allLines.slice(-lines).join("\n");
  }

  async getMetrics() {
    const { xmx, jarName } = await readStartConfig();
    const processUsage = await getServerProcessUsage(jarName);
    const disk = await checkDiskSpace(this.baseDir);
    const folderSize = await getFolderSizeBytes(this.baseDir);

    return {
      server: {
        pid: processUsage?.pid || null,
        cpu: processUsage?.cpu || 0,
        memoryBytes: processUsage?.memory || 0,
        maxMemoryBytes: xmx
      },
      storage: {
        folderBytes: folderSize,
        diskTotalBytes: disk.total,
        diskFreeBytes: disk.free
      }
    };
  }

  async getServerConfig() {
    return readServerConfig();
  }

  async saveServerConfig({ threads, ramMin, ramMax }) {
    if (!threads || !ramMin || !ramMax) {
      throw new Error("Faltan parámetros requeridos");
    }
    if (threads < 1 || threads > 32) {
      throw new Error("Los hilos deben estar entre 1 y 32");
    }
    if (ramMin >= ramMax) {
      throw new Error("La RAM mínima debe ser menor que la máxima");
    }
    if (ramMin < 512) {
      throw new Error("La RAM mínima debe ser al menos 512 MB");
    }

    const config = { threads, ramMin, ramMax };
    await fsp.writeFile(SERVER_CONFIG_PATH, JSON.stringify(config, null, 2));
    return config;
  }
}

class FileService {
  async list(relPath) {
    rejectHiddenPath(relPath || ".");
    const target = resolveSafe(relPath || ".");
    const entries = await fsp.readdir(target, { withFileTypes: true });
    const items = [];
    for (const entry of entries) {
      if (isHiddenFile(entry.name)) continue;
      const full = path.join(target, entry.name);
      const stat = await fsp.stat(full);
      items.push({
        name: entry.name,
        type: entry.isDirectory() ? "dir" : "file",
        size: stat.size,
        mtime: stat.mtimeMs
      });
    }
    return { path: relPath || ".", items };
  }

  async remove(relPath) {
    if (!relPath) throw new Error("Ruta requerida");
    rejectHiddenPath(relPath);
    const target = resolveSafe(relPath);
    if (isHiddenFile(target)) throw new Error("Archivo no permitido");
    await fsp.rm(target, { recursive: true, force: true });
  }

  async readContent(relPath) {
    if (!relPath) throw new Error("Ruta requerida");
    rejectHiddenPath(relPath);
    const target = resolveSafe(relPath);
    if (isHiddenFile(target)) throw new Error("Archivo no permitido");
    return fsp.readFile(target, "utf-8");
  }

  async writeContent(relPath, content) {
    if (!relPath) throw new Error("Ruta requerida");
    if (typeof content !== "string") throw new Error("Contenido inválido");
    rejectHiddenPath(relPath);
    const target = resolveSafe(relPath);
    if (isHiddenFile(target)) throw new Error("Archivo no permitido");
    await fsp.writeFile(target, content, "utf-8");
  }

  async unzip(relPath) {
    if (!relPath) throw new Error("Ruta requerida");
    rejectHiddenPath(relPath);
    const zipPath = resolveSafe(relPath);
    if (isHiddenFile(zipPath)) throw new Error("Archivo no permitido");
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(path.dirname(zipPath), true);
  }
}

class BackupService {
  async status() {
    const { dir } = await resolveBackupDirectory();
    return { available: true, path: dir, backupDir: dir };
  }

  async createBackup() {
    const { dir: backupDir } = await resolveBackupDirectory();
    await fsp.mkdir(backupDir, { recursive: true });
    const backupName = `HytaleServer-${formatDateForBackup()}`;
    const backupPath = path.join(backupDir, `${backupName}.zip`);
    const zip = new AdmZip();
    await addDirToZipExcludeHidden(zip, BASE_DIR);
    zip.writeZip(backupPath);
    return { backupName, backupPath };
  }

  async listBackups() {
    const { dir: backupDir } = await resolveBackupDirectory();
    try {
      const files = await fsp.readdir(backupDir);
      const backups = [];
      for (const file of files) {
        if (file.endsWith(".zip")) {
          const fullPath = path.join(backupDir, file);
          const stat = await fsp.stat(fullPath);
          backups.push({
            name: file.replace(".zip", ""),
            size: stat.size,
            mtime: stat.mtimeMs,
            file
          });
        }
      }
      backups.sort((a, b) => b.mtime - a.mtime);
      return { available: true, backups };
    } catch (error) {
      console.error("[Backup] listBackups error:", error.message);
      return { available: true, backups: [] };
    }
  }

  async deleteBackup(file) {
    const { dir: backupDir } = await resolveBackupDirectory();
    if (!file.endsWith(".zip") || file.includes("..") || file.includes("/")) {
      throw new Error("Nombre de archivo inválido");
    }
    const backupPath = path.join(backupDir, file);
    if (!backupPath.startsWith(backupDir + path.sep)) {
      throw new Error("Ruta inválida");
    }
    await fsp.unlink(backupPath);
  }

  async restoreBackup(file) {
    const { dir: backupDir } = await resolveBackupDirectory();
    if (!file.endsWith(".zip") || file.includes("..") || file.includes("/")) {
      throw new Error("Nombre de archivo inválido");
    }
    const backupPath = path.join(backupDir, file);
    if (!backupPath.startsWith(backupDir + path.sep)) {
      throw new Error("Ruta inválida");
    }
    if (!fs.existsSync(backupPath)) {
      throw new Error("Backup no encontrado");
    }

    const tempKeepDir = path.join(BASE_DIR, ".temp_keep_backup");
    await fsp.mkdir(tempKeepDir, { recursive: true });
    const keepNames = [
      "hytale-downloader-linux-amd64",
      "hytale-downloader-windows-amd64.exe",
      ".hytale-downloader-credentials.json"
    ];

    const keepFiles = (await fsp.readdir(BASE_DIR))
      .filter((f) => f.endsWith(".sh") || keepNames.includes(f))
      .map((f) => path.join(BASE_DIR, f));

    for (const keepFile of keepFiles) {
      const fileName = path.basename(keepFile);
      await fsp.copyFile(keepFile, path.join(tempKeepDir, fileName)).catch(() => {});
    }

    await fsp.rm(BASE_DIR, { recursive: true, force: true });
    await fsp.mkdir(BASE_DIR, { recursive: true });

    const zip = new AdmZip(backupPath);
    zip.extractAllTo(BASE_DIR, true);

    const restoredKeeps = await fsp.readdir(tempKeepDir).catch(() => []);
    for (const fileName of restoredKeeps) {
      const from = path.join(tempKeepDir, fileName);
      const to = path.join(BASE_DIR, fileName);
      await fsp.copyFile(from, to).catch(() => {});
    }

    await fsp.rm(tempKeepDir, { recursive: true, force: true }).catch(() => {});
    return backupPath;
  }

  async getBackupConfig() {
    const { dir } = await resolveBackupDirectory();
    return { backupLocation: dir, enabled: true };
  }

  async saveBackupConfig(backupLocation) {
    if (!backupLocation) {
      throw new Error("Backup location is required");
    }

    const absolutePath = path.resolve(backupLocation);
    if (!fs.existsSync(absolutePath)) {
      fs.mkdirSync(absolutePath, { recursive: true });
    }

    try {
      fs.accessSync(absolutePath, fs.constants.W_OK);
    } catch {
      throw new Error("No tiene permisos de escritura en esta ubicación");
    }

    const config = {
      backupLocation: absolutePath,
      enabled: true,
      updatedAt: new Date().toISOString()
    };

    await fsp.writeFile(BACKUP_CONFIG_PATH, JSON.stringify(config, null, 2));
    return config;
  }
}

class DownloaderService {
  constructor() {
    this.sessions = DOWNLOADER_AUTH_SESSIONS;
  }

  async status() {
    const { path: downloaderPath, source } = resolveDownloaderPath();
    const exists = fs.existsSync(downloaderPath);
    let isExecutable = false;
    let version = null;
    let gameVersion = null;
    let lastDownload = null;

    if (exists) {
      const stats = await fsp.stat(downloaderPath);
      isExecutable = IS_WINDOWS ? true : !!(stats.mode & fs.constants.X_OK);

      if (isExecutable) {
        try {
          const versionOutput = await new Promise((resolve, reject) => {
            exec(`"${downloaderPath}" -version`, { cwd: BASE_DIR }, (err, stdout) => {
              if (err) reject(err);
              else resolve(stdout.trim());
            });
          });
          version = versionOutput;

          const gameVersionOutput = await new Promise((resolve, reject) => {
            exec(`"${downloaderPath}" -print-version`, { cwd: BASE_DIR, timeout: 10000 }, (err, stdout) => {
              if (err) reject(err);
              else resolve(stdout.trim());
            });
          });
          gameVersion = gameVersionOutput;
        } catch (e) {
          console.error("[Downloader] Error obteniendo versión:", e.message);
        }
      }
    }

    const serverJarExists = fs.existsSync(path.join(BASE_DIR, "HytaleServer.jar"));
    const assetsExists = fs.existsSync(path.join(BASE_DIR, "Assets.zip"));
    const isInstalled = serverJarExists && assetsExists;

    const credentialsPath = path.join(BASE_DIR, ".hytale-downloader-credentials.json");
    let isAuthenticated = false;
    try {
      if (fs.existsSync(credentialsPath)) {
        const credContent = await fsp.readFile(credentialsPath, "utf-8");
        const credentials = JSON.parse(credContent);
        isAuthenticated = !!credentials && Object.keys(credentials).length > 0;
      }
    } catch (e) {
      isAuthenticated = false;
    }

    if (fs.existsSync(DOWNLOAD_STATUS_PATH)) {
      try {
        const content = await fsp.readFile(DOWNLOAD_STATUS_PATH, "utf-8");
        lastDownload = JSON.parse(content);
      } catch {
        lastDownload = null;
      }
    }

    return {
      exists,
      isExecutable,
      version,
      gameVersion,
      isInstalled,
      isAuthenticated,
      lastDownload,
      path: downloaderPath,
      source
    };
  }

  async download() {
    const { path: downloaderPath } = resolveDownloaderPath();
    const downloaderExists = fs.existsSync(downloaderPath);
    if (!downloaderExists) {
      throw new Error("El descargador de Hytale no existe en la ruta especificada");
    }

    const stats = await fsp.stat(downloaderPath);
    if (!IS_WINDOWS && !(stats.mode & fs.constants.X_OK)) {
      await fsp.chmod(downloaderPath, 0o755);
    }

    exec(`"${downloaderPath}"`, { cwd: BASE_DIR }, async (err, stdout, stderr) => {
      if (err) {
        console.error("[Downloader] Error:", stderr || err.message);
      } else {
        console.log("[Downloader] Completado:", stdout);
        const zip = await findDownloadedZip();
        if (zip) {
          console.log(`[Downloader] ZIP encontrado: ${zip}`);
          await unzipAndCleanup(zip);
        }
      }
    });
  }

  createAuthSession() {
    const id = crypto.randomBytes(12).toString("hex");
    const session = {
      id,
      status: "pending",
      code: null,
      verifyUrl: null,
      output: [],
      exitCode: null,
      startedAt: Date.now(),
      child: null
    };
    this.sessions.set(id, session);
    return session;
  }

  cleanupAuthSession(id) {
    const session = this.sessions.get(id);
    if (!session) return;
    if (session.child) {
      session.child.kill("SIGTERM");
    }
    this.sessions.delete(id);
  }

  startAuthFlow() {
    const { path: downloaderPath } = resolveDownloaderPath();
    const exists = fs.existsSync(downloaderPath);
    if (!exists) {
      throw new Error("El descargador de Hytale no existe en la ruta especificada");
    }

    const session = this.createAuthSession();
    const child = spawn(downloaderPath, [], { cwd: BASE_DIR });
    session.child = child;
    session.status = "waiting";

    const handleChunk = (chunk) => {
      const text = chunk.toString();
      session.output.push(text);
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const parsed = parseDeviceFlowOutput(line);
        if (parsed.code) session.code = parsed.code;
        if (parsed.url) session.verifyUrl = parsed.url;
        if (parsed.isSuccess && session.status !== "success") {
          session.status = "success";
          if (session.child) session.child.kill("SIGTERM");
        }
        if (parsed.isFailed && session.status !== "error") {
          session.status = "error";
        }
      }
    };

    child.stdout.on("data", handleChunk);
    child.stderr.on("data", handleChunk);

    child.on("close", (code) => {
      session.exitCode = code;
      if (session.status !== "success") {
        session.status = code === 0 ? "success" : "error";
      }
      console.log(`[Downloader Auth] Process exited with code ${code}, final status: ${session.status}`);
    });

    return {
      id: session.id,
      status: session.status,
      code: session.code,
      verifyUrl: session.verifyUrl
    };
  }

  getAuthStatus(id) {
    if (!id || !this.sessions.has(id)) {
      throw new Error("Sesión no encontrada");
    }
    const session = this.sessions.get(id);
    return {
      id: session.id,
      status: session.status,
      code: session.code,
      verifyUrl: session.verifyUrl,
      exitCode: session.exitCode,
      output: session.output.slice(-50)
    };
  }
}

class DiscordService {
  constructor() {
    this.client = null;
    this.ready = false;
  }

  async loadConfig() {
    try {
      const content = await fsp.readFile(DISCORD_CONFIG_PATH, "utf-8");
      return JSON.parse(content);
    } catch {
      return { botToken: "", channelId: "", enabled: false };
    }
  }

  async saveConfig(config) {
    await fsp.writeFile(DISCORD_CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
  }

  async initBot() {
    const config = await this.loadConfig();

    if (!config.enabled || !config.botToken) {
      console.log("[Discord] Bot deshabilitado o sin token");
      return;
    }

    if (this.client) {
      try {
        await this.client.destroy();
      } catch (e) {
        console.error("[Discord] Error al destruir cliente anterior:", e.message);
      }
    }

    this.client = new Client({ intents: [GatewayIntentBits.Guilds] });

    this.client.once("ready", () => {
      console.log(`[Discord] Bot conectado como ${this.client.user.tag}`);
      this.ready = true;
    });

    this.client.on("error", (error) => {
      console.error("[Discord] Error:", error.message);
      this.ready = false;
    });

    try {
      await this.client.login(config.botToken);
    } catch (error) {
      console.error("[Discord] Error al iniciar bot:", error.message);
      this.ready = false;
    }
  }

  async sendNotification(isOnline) {
    try {
      const config = await this.loadConfig();

      if (!config.enabled || !config.channelId || !this.ready || !this.client) {
        return;
      }

      const language = await getAppLanguage();
      const i18n = await getDiscordTranslations(language);

      const channel = await this.client.channels.fetch(config.channelId);
      if (!channel || !channel.isTextBased()) {
        console.error("[Discord] Canal no válido");
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(isOnline ? i18n.title_online : i18n.title_offline)
        .setDescription(isOnline ? i18n.description_online : i18n.description_offline)
        .setColor(isOnline ? 0x00ff00 : 0xff0000)
        .setTimestamp()
        .setFooter({ text: i18n.footer });

      await channel.send({ embeds: [embed] });

      const newName = isOnline ? i18n.channel_online : i18n.channel_offline;
      try {
        await channel.setName(newName);
      } catch (e) {
        console.error("[Discord] Could not rename channel:", e.message);
      }

      console.log(`[Discord] Notificación enviada: ${isOnline ? "ONLINE" : "OFFLINE"}`);
    } catch (error) {
      console.error("[Discord] Error al enviar notificación:", error.message);
    }
  }
}

// Service singletons
const authService = new AuthService({
  authConfigPath: AUTH_CONFIG_PATH,
  setupConfigPath: SETUP_CONFIG_PATH,
  tokenTtlMs: TOKEN_TTL_MS
});

const serverService = new ServerService({
  baseDir: BASE_DIR,
  startScript: START_SCRIPT,
  stopScript: STOP_SCRIPT,
  screenName: SCREEN_NAME
});

const fileService = new FileService();
const backupService = new BackupService();
const downloaderService = new DownloaderService();
const discordService = new DiscordService();

// ============ DESCARGADOR: AUTH DEVICE FLOW ============

function parseDeviceFlowOutput(line) {
  // Parse code: "Enter code:" followed by the code on the next line
  // or "Authorization code: ABCD-1234"
  const codeMatch = line.match(/(?:Enter code:|Authorization code:)\s*([A-Z0-9-]+)/i) ||
                    line.match(/^\s*([A-Z0-9]{4}-[A-Z0-9]{4})\s*$/); // Code alone on a line
  
  // Parse URLs - prioritize the one with user_code parameter
  const urlWithCodeMatch = line.match(/(https:\/\/[^\s]+\?user_code=[A-Z0-9-]+)/i);
  const urlMatch = line.match(/(https:\/\/accounts\.hytale\.com\/device)/i);
  
  // Check for authentication success messages
  const isSuccess = /authentication successful|authenticated|authorization complete/i.test(line);
  const isFailed = /authentication failed|authorization failed|expired|denied/i.test(line);
  
  return {
    code: codeMatch ? codeMatch[1] : null,
    url: urlWithCodeMatch ? urlWithCodeMatch[1] : (urlMatch ? urlMatch[1] : null),
    isSuccess,
    isFailed
  };
}

async function findDownloadedZip() {
  const entries = await fsp.readdir(BASE_DIR, { withFileTypes: true });
  const zips = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith(".zip")) continue;
    if (entry.name === "Assets.zip") continue;
    const full = path.join(BASE_DIR, entry.name);
    const stat = await fsp.stat(full);
    zips.push({ full, mtime: stat.mtimeMs, size: stat.size });
  }
  if (!zips.length) return null;
  zips.sort((a, b) => b.mtime - a.mtime);
  return zips[0].full;
}

async function unzipAndCleanup(zipPath) {
  try {
    await new Promise((resolve, reject) => {
      execFile("unzip", ["-qo", zipPath, "-d", BASE_DIR], (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr || stdout || err.message));
          return;
        }
        resolve();
      });
    });

    // If extraction created a Server/ folder, move its contents to BASE_DIR
    const nestedServer = path.join(BASE_DIR, "Server");
    if (fs.existsSync(nestedServer)) {
      const entries = await fsp.readdir(nestedServer);
      for (const entry of entries) {
        const from = path.join(nestedServer, entry);
        const to = path.join(BASE_DIR, entry);
        await fsp.rename(from, to).catch(async () => {
          // si existe, eliminar destino y reintentar
          await fsp.rm(to, { recursive: true, force: true });
          await fsp.rename(from, to);
        });
      }
      await fsp.rm(nestedServer, { recursive: true, force: true });
    }

    // Delete start.* scripts (sh/bat) that came with the zip file
    const startCandidates = ["start.sh", "start.bat", "StartServer.sh", "StartServer.bat", "start-server.bat"];
    for (const candidate of startCandidates) {
      const target = path.join(BASE_DIR, candidate);
      if (fs.existsSync(target)) {
        await fsp.unlink(target).catch(() => {});
      }
    }

    await fsp.unlink(zipPath);
    await fsp.writeFile(
      DOWNLOAD_STATUS_PATH,
      JSON.stringify({ completed: true, at: Date.now() }, null, 2),
      "utf-8"
    );
    console.log(`[Downloader] ZIP extraído y eliminado: ${zipPath}`);
  } catch (err) {
    console.error("[Downloader] Error al descomprimir:", err.message);
  }
}

function createAuthSession() {
  const id = crypto.randomBytes(12).toString("hex");
  const session = {
    id,
    status: "pending", // pending | waiting | authorized | success | error
    code: null,
    verifyUrl: null,
    output: [],
    exitCode: null,
    startedAt: Date.now(),
    child: null
  };
  DOWNLOADER_AUTH_SESSIONS.set(id, session);
  return session;
}

function cleanupAuthSession(id) {
  const session = DOWNLOADER_AUTH_SESSIONS.get(id);
  if (!session) return;
  if (session.child) {
    session.child.kill("SIGTERM");
  }
  DOWNLOADER_AUTH_SESSIONS.delete(id);
}

// ============ FUNCIONES DE DISCORD ============

async function loadDiscordConfig() {
  try {
    const content = await fsp.readFile(DISCORD_CONFIG_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return { botToken: "", channelId: "", enabled: false };
  }
}

async function saveDiscordConfig(config) {
  await fsp.writeFile(DISCORD_CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

// Get saved language preference from config file
async function getAppLanguage() {
  try {
    if (fs.existsSync(SETUP_CONFIG_PATH)) {
      const setupConfig = JSON.parse(fs.readFileSync(SETUP_CONFIG_PATH, "utf8"));
      return setupConfig.language || 'es';
    }
  } catch (error) {
    console.error("[i18n] Error reading setup config:", error.message);
  }
  return 'es'; // idioma por defecto
}

// Load Discord integration messages from language config file
async function getDiscordTranslations(language = 'es') {
  try {
    const translationFile = path.join(__dirname, "public", "translations", `${language}.json`);
    if (fs.existsSync(translationFile)) {
      const translations = JSON.parse(fs.readFileSync(translationFile, "utf8"));
      return {
        title_online: translations.discord_title_online || "✅ Server Started",
        title_offline: translations.discord_title_offline || "🛑 Server Stopped",
        description_online: translations.discord_description_online || "Server started successfully",
        description_offline: translations.discord_description_offline || "Server stopped",
        footer: translations.discord_footer || "Hytale Administration Panel",
        channel_online: translations.discord_channel_online || "「🟢」status-on",
        channel_offline: translations.discord_channel_offline || "「🔴」status-off"
      };
    }
  } catch (error) {
    console.error("[i18n] Error loading discord translations:", error.message);
  }
  // Default values in English
  return {
    title_online: "✅ Server Started",
    title_offline: "🛑 Server Stopped",
    description_online: "Server started successfully",
    description_offline: "Server stopped",
    footer: "Hytale Administration Panel",
    channel_online: "「🟢」status-on",
    channel_offline: "「🔴」status-off"
  };
}

// =============================================================================
// ============ SETUP ROUTES ============
// These routes do NOT require authentication (accessible on first run)
// =============================================================================

// ============ SETUP STATUS ENDPOINT ============
// Check if initial setup has been completed
app.get("/api/setup/status", async (_req, res) => {
  try {
    const status = await authService.getSetupStatus();
    res.json(status);
  } catch (error) {
    res.json({ setupCompleted: false });
  }
});

// Completar setup inicial
app.post("/api/setup/complete", async (req, res) => {
  try {
    const { username, password, language } = req.body;
    await authService.completeSetup({ username, password, language });
    res.json({ success: true });
  } catch (error) {
    console.error("[ERROR] Setup completion:", error);
    res.status(400).json({ error: error.message || "Error al completar el setup" });
  }
});

// =============================================================================
// AUTHENTICATION
// =============================================================================

// ============ AUTHENTICATION MIDDLEWARE ============
// Apply authentication middleware BEFORE defining API routes that require auth
app.use(authService.middleware);

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const result = await authService.login(username, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message || "Credenciales inválidas" });
  }
});

app.get("/api/status", async (req, res) => {
  const status = await serverService.getStatus();
  res.json(status);
});

app.post("/api/start", async (req, res) => {
  try {
    const output = await serverService.start();
    res.json({ output });
    discordService.sendNotification(true).catch((err) =>
      console.error("[Discord] Error al enviar notificación de inicio:", err.message)
    );
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.post("/api/stop", async (req, res) => {
  try {
    const output = await serverService.stop();
    res.json({ output });
    discordService.sendNotification(false).catch((err) =>
      console.error("[Discord] Error al enviar notificación de detención:", err.message)
    );
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.get("/api/logs", async (req, res) => {
  try {
    const lines = parseInt(req.query.lines) || 100;
    const logs = await serverService.readLogs(lines);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.post("/api/command", async (req, res) => {
  try {
    const { command } = req.body;
    await serverService.sendCommand(command);
    res.json({ ok: true, command });
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.get("/api/metrics", async (req, res) => {
  try {
    const metrics = await serverService.getMetrics();
    res.json(metrics);
  } catch (error) {
    console.error("[ERROR] /api/metrics:", error);
    res.status(500).json({ error: formatError(error) });
  }
});

app.get("/api/files", async (req, res) => {
  try {
    const relPath = req.query.path || ".";
    rejectHiddenPath(relPath);
    const data = await fileService.list(relPath);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: formatError(error) });
  }
});

app.post("/api/files/upload", upload.single("file"), async (req, res) => {
  try {
    const relPath = req.query.path || ".";
    rejectHiddenPath(relPath);
    if (!req.file) {
      res.status(400).json({ error: "Archivo requerido" });
      return;
    }
    if (isHiddenFile(req.file.originalname)) {
      await fsp.unlink(req.file.path);
      res.status(400).json({ error: "Archivo no permitido" });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: formatError(error) });
  }
});

app.post("/api/files/unzip", async (req, res) => {
  try {
    const relPath = req.body?.path;
    if (!relPath) {
      res.status(400).json({ error: "Ruta requerida" });
      return;
    }
    rejectHiddenPath(relPath);
    await fileService.unzip(relPath);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: formatError(error) });
  }
});

app.delete("/api/files", async (req, res) => {
  try {
    const relPath = req.query.path;
    if (!relPath) {
      res.status(400).json({ error: "Ruta requerida" });
      return;
    }
    rejectHiddenPath(relPath);
    await fileService.remove(relPath);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: formatError(error) });
  }
});

app.get("/api/files/content", async (req, res) => {
  try {
    const relPath = req.query.path;
    if (!relPath) {
      res.status(400).json({ error: "Ruta requerida" });
      return;
    }
    rejectHiddenPath(relPath);
    const content = await fileService.readContent(relPath);
    res.json({ content });
  } catch (error) {
    res.status(400).json({ error: formatError(error) });
  }
});

app.put("/api/files/content", async (req, res) => {
  try {
    const relPath = req.query.path;
    if (!relPath) {
      res.status(400).json({ error: "Ruta requerida" });
      return;
    }
    rejectHiddenPath(relPath);
    const content = req.body?.content;
    await fileService.writeContent(relPath, content);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: formatError(error) });
  }
});

app.get("/api/config", async (req, res) => {
  try {
    const content = await fsp.readFile(CONFIG_PATH, "utf-8");
    let json = null;
    try {
      json = JSON.parse(content);
    } catch {
      json = null;
    }
    res.json({ content, json });
  } catch (error) {
    res.status(400).json({ error: formatError(error) });
  }
});

app.put("/api/config", async (req, res) => {
  try {
    const content = req.body?.content;
    if (typeof content !== "string") {
      res.status(400).json({ error: "Contenido inválido" });
      return;
    }
    JSON.parse(content);
    await fsp.writeFile(CONFIG_PATH, content, "utf-8");
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: formatError(error) });
  }
});

app.get("/api/backup/status", async (req, res) => {
  try {
    const status = await backupService.status();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.post("/api/backup/create", async (req, res) => {
  try {
    const { backupName, backupPath } = await backupService.createBackup();
    res.json({ ok: true, backup: backupName, path: backupPath });
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.get("/api/backup/list", async (req, res) => {
  try {
    const backups = await backupService.listBackups();
    res.json(backups);
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.delete("/api/backup/:file", async (req, res) => {
  try {
    const file = req.params.file;
    await backupService.deleteBackup(file);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.post("/api/backup/restore/:file", async (req, res) => {
  try {
      const file = req.params.file;
      const restoredFrom = await backupService.restoreBackup(file);
      res.json({ ok: true, restoredFrom });
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

// ============ ENDPOINTS DE DISCORD ============

app.get("/api/discord/config", async (req, res) => {
  try {
    const config = await discordService.loadConfig();
    res.json({
      enabled: config.enabled,
      channelId: config.channelId,
      hasToken: !!config.botToken,
      botStatus: discordService.ready ? "connected" : "disconnected"
    });
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.post("/api/discord/config", async (req, res) => {
  try {
    const { botToken, channelId, enabled } = req.body;
    const currentConfig = await discordService.loadConfig();

    const newConfig = {
      botToken: botToken !== undefined ? botToken : currentConfig.botToken,
      channelId: channelId !== undefined ? channelId : currentConfig.channelId,
      enabled: enabled !== undefined ? enabled : currentConfig.enabled
    };

    await discordService.saveConfig(newConfig);
    
    if (newConfig.enabled && newConfig.botToken) {
      await discordService.initBot();
    } else if (discordService.client) {
      await discordService.client.destroy();
      discordService.client = null;
      discordService.ready = false;
    }

    res.json({ 
      success: true,
      botStatus: discordService.ready ? "connected" : "disconnected"
    });
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.post("/api/discord/test", async (req, res) => {
  try {
    if (!discordService.ready) {
      res.status(400).json({ error: "Bot no está conectado" });
      return;
    }
    await discordService.sendNotification(true);
    res.json({ success: true, message: "Mensaje de prueba enviado" });
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

// =============================================================================
// SERVER CONFIGURATION ROUTES
// =============================================================================

const SERVER_CONFIG_PATH = path.join(BASE_DIR, "server-config.json");

// ============ SERVER CONFIGURATION ENDPOINTS ============
// Retrieve server configuration (CPU threads and RAM settings)
  app.get("/api/platform/status", async (req, res) => {
    try {
      const javaPath = await findJavaExecutable();
      const resolved = resolveDownloaderPath();
      const downloader = await downloaderExists();
      const userCandidate = path.join(BASE_DIR, IS_WINDOWS ? "hytale-downloader-windows-amd64.exe" : "hytale-downloader-linux-amd64");
      const resourceCandidate = path.join(RESOURCE_BASE_DIR, IS_WINDOWS ? "hytale-downloader-windows-amd64.exe" : "hytale-downloader-linux-amd64");
      res.json({
        platform: IS_WINDOWS ? "windows" : "linux",
        javaFound: !!javaPath,
        javaPath: javaPath || null,
        downloaderFound: downloader,
        downloaderPath: downloader ? resolved.path : null,
        downloaderSource: resolved.source,
        diagnostics: {
          documentsDir: DOCUMENTS_DIR,
          baseDir: BASE_DIR,
          resourceBaseDir: RESOURCE_BASE_DIR,
          userPath: userCandidate,
          userExists: fs.existsSync(userCandidate),
          resourcePath: resourceCandidate,
          resourceExists: fs.existsSync(resourceCandidate)
        }
      });
    } catch (error) {
      res.status(500).json({ error: formatError(error) });
    }
  });
app.get("/api/server/config", async (req, res) => {
  try {
    const config = await serverService.getServerConfig();
    res.json(config);
  } catch (error) {
    console.error("[ERROR] Loading server config:", error);
    res.status(500).json({ error: formatError(error) });
  }
});

// Save server configuration (CPU threads and RAM settings)
app.post("/api/server/config", async (req, res) => {
  try {
    const { threads, ramMin, ramMax } = req.body;
    const config = await serverService.saveServerConfig({ threads, ramMin, ramMax });
    res.json({ success: true, config });
  } catch (error) {
    console.error("[ERROR] Saving server config:", error);
    res.status(500).json({ error: formatError(error) });
  }
});

// =============================================================================
// BACKUP CONFIGURATION ROUTES
// =============================================================================

const BACKUP_CONFIG_PATH = path.join(BASE_DIR, "backup-config.json");

// Retrieve backup configuration (location and settings)
app.get("/api/backup/config", async (req, res) => {
  try {
    const config = await backupService.getBackupConfig();
    res.json(config);
  } catch (error) {
    console.error("[ERROR] Loading backup config:", error);
    res.status(500).json({ error: formatError(error) });
  }
});

// Save backup configuration to file
app.post("/api/backup/config", async (req, res) => {
  try {
    const { backupLocation } = req.body;
    const config = await backupService.saveBackupConfig(backupLocation);
    res.json({ success: true, config });
  } catch (error) {
    console.error("[ERROR] Saving backup config:", error);
    res.status(500).json({ error: formatError(error) });
  }
});

// ============ ENDPOINTS DE HYTALE DOWNLOADER ============

// Verificar si el downloader existe y es ejecutable
app.get("/api/downloader/status", async (req, res) => {
  try {
    const status = await downloaderService.status();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

// Descargar el servidor usando hytale-downloader
app.post("/api/downloader/download", async (req, res) => {
  try {
    res.json({ 
      success: true, 
      message: "Descarga iniciada. Esto puede tomar varios minutos..."
    });

    await downloaderService.download();
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

// Iniciar flujo de autenticación (device code) para el downloader
app.post("/api/downloader/auth/start", async (req, res) => {
  try {
    const session = downloaderService.startAuthFlow();
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.get("/api/downloader/auth/status", (req, res) => {
  try {
    const { id } = req.query;
    const status = downloaderService.getAuthStatus(id);
    res.json(status);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.post("/api/downloader/auth/cancel", (req, res) => {
  try {
    const { id } = req.body || {};
    downloaderService.cleanupAuthSession(id);
    res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Retrieve saved authentication configuration
app.get("/api/auth/config", async (req, res) => {
  try {
    const config = await authService.getServerAuthConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

// Save authentication configuration to file
app.post("/api/auth/config", async (req, res) => {
  try {
    const { authMode, deviceCode, authenticated } = req.body;

    const config = {
      authMode: authMode || "authenticated",
      deviceCode: deviceCode || null,
      authenticated: authenticated || false,
      lastUpdated: new Date().toISOString()
    };

    await authService.saveServerAuthConfig(config);
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

// Iniciar proceso de autenticación device flow
app.post("/api/auth/start-device-flow", async (req, res) => {
  try {
    // Device flow authentication must be performed manually on the server console
    // Note: Server authentication requires console interaction with the Hytale server
    // Cannot be completed automatically through this API
    
    // For now, save a flag indicating authentication is pending
    const config = {
      authMode: "authenticated",
      deviceCode: null,
      authenticated: false,
      pendingAuth: true,
      lastUpdated: new Date().toISOString()
    };
    
    await authService.saveServerAuthConfig(config);
    
    res.json({
      success: true,
      message: "To authenticate, start the server and run '/auth login device' in the server console",
      instructions: [
        "1. Inicia el servidor Hytale desde el panel",
        "2. En los logs, aparecerá un código de dispositivo",
        "3. Visita https://accounts.hytale.com/device",
        "4. Ingresa el código mostrado en los logs",
        "5. La autenticación se completará automáticamente"
      ]
    });
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

// ============ TRANSLATION FILES ENDPOINT ============
// Middleware to serve translation files WITHOUT authentication (MUST come before auth middleware)
app.use("/translations", express.static(path.join(__dirname, "public", "translations")));

// Aplicar middleware de autenticación DESPUÉS de definir todas las rutas
app.use(authService.middleware);

app.use(express.static(path.join(__dirname, "public")));

app.use((req, res) => {
  res.status(404).json({ error: "No encontrado" });
});

// ============ SETUP LOG FILE ============
// Crear archivo de log para debugging en Windows
const LOG_FILE = path.join(USER_DATA_DIR, "app.log");
const logStream = fs.createWriteStream(LOG_FILE, { flags: "a" });

// Redirect console.log y console.error al archivo de log
const originalLog = console.log;
const originalError = console.error;

console.log = function(...args) {
  originalLog.apply(console, args);
  logStream.write(new Date().toISOString() + " [LOG] " + args.join(" ") + "\n");
};

console.error = function(...args) {
  originalError.apply(console, args);
  logStream.write(new Date().toISOString() + " [ERROR] " + args.join(" ") + "\n");
};

app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
  console.log(`Panel web activo en http://localhost:${PORT}`);
  console.log(`Archivo de log: ${LOG_FILE}`);
  discordService.initBot().catch((err) =>
    console.error("[Discord] Error al inicializar bot:", err.message)
  );
});
