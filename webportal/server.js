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
const USER_DATA_DIR = process.env.USER_DATA_DIR || path.join(os.homedir(), ".hytale-server-portal");
const RESOURCE_BASE_DIR = path.resolve(__dirname, "..", "HytaleServer");
const BASE_DIR = path.join(USER_DATA_DIR, "HytaleServer");
const START_SCRIPT = path.join(BASE_DIR, "start-server.sh");
const STOP_SCRIPT = path.join(BASE_DIR, "stop-server.sh");
const SCREEN_NAME = "HytaleServer";
const CONFIG_PATH = path.join(BASE_DIR, "config.json");
const TOKEN_TTL_MS = Number(process.env.TOKEN_TTL_MS || 1000 * 60 * 60 * 8);
const DISCORD_CONFIG_PATH = path.join(USER_DATA_DIR, "discord-config.json");
const DOWNLOADER_PATH = IS_WINDOWS
  ? path.join(BASE_DIR, "hytale-downloader-windows-amd64.exe")
  : path.join(BASE_DIR, "hytale-downloader-linux-amd64");
const AUTH_CONFIG_PATH = path.join(USER_DATA_DIR, ".auth-secure");
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

const HIDDEN_EXTENSIONS = new Set([".sh"]);
const HIDDEN_FILES = new Set([
  "hytale-downloader-linux-amd64",
  "hytale-downloader-windows-amd64.exe",
  ".hytale-downloader-credentials.json"
]);
const tokens = new Map();

// Directorio de datos del usuario (escribible)
fs.mkdirSync(USER_DATA_DIR, { recursive: true });

async function ensureBaseDir() {
  try {
    await fsp.mkdir(BASE_DIR, { recursive: true });

    const marker = path.join(BASE_DIR, ".initialized");
    if (fs.existsSync(marker)) {
      return;
    }

    // Copiar recursos iniciales del directorio empaquetado si existen
    if (fs.existsSync(RESOURCE_BASE_DIR)) {
      await fsp.cp(RESOURCE_BASE_DIR, BASE_DIR, {
        recursive: true,
        force: false,
        errorOnExist: false
      });
    }

    await fsp.writeFile(marker, "ok", "utf-8");
  } catch (error) {
    console.error("[Init] Error preparando directorio base:", error.message);
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
    await fsp.access(DOWNLOADER_PATH, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

// Cliente de Discord
let discordClient = null;
let discordReady = false;

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
    execFile("bash", [scriptPath], { cwd: BASE_DIR }, (err, stdout, stderr) => {
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
    return Promise.resolve({ running: isServerRunning(), raw: "" });
  }
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

async function getServerProcessUsage(jarName) {
  if (isServerRunning() && serverProcess?.pid) {
    try {
      const stats = await pidusage(serverProcess.pid);
      return { pid: serverProcess.pid, ...stats };
    } catch (e) {
      console.error("[Metrics] pidusage failed for tracked pid:", e.message);
    }
  }

  const pattern = jarName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Attempt 1: Find Java process specifically (exclude screen and bash wrappers)
  const byJava = await new Promise((resolve) => {
    exec(`ps -eo pid,comm,cmd | grep -E "^[[:space:]]*[0-9]+[[:space:]]+java[[:space:]]" | grep "${pattern}" | awk '{print $1}' | head -n 1`, (err, stdout) => {
      if (err || !stdout.trim()) return resolve(null);
      const pid = Number(stdout.trim());
      resolve(Number.isFinite(pid) ? pid : null);
    });
  });

  // Attempt 2: Find by base directory + actual Java command
  const byDir = await new Promise((resolve) => {
    exec(`ps -eo pid,comm,cmd | grep -E "^[[:space:]]*[0-9]+[[:space:]]+java[[:space:]]" | grep "${BASE_DIR}" | awk '{print $1}' | head -n 1`, (err, stdout) => {
      if (err || !stdout.trim()) return resolve(null);
      const pid = Number(stdout.trim());
      resolve(Number.isFinite(pid) ? pid : null);
    });
  });

  // Attempt 3: Search specifically by characteristic memory parameters
  const byMemory = await new Promise((resolve) => {
    exec(`ps -eo pid,comm,cmd | grep -E "^[[:space:]]*[0-9]+[[:space:]]+java[[:space:]]" | grep -E "(Xmx64G|Xmx32G)" | grep -v grep | awk '{print $1}' | head -n 1`, (err, stdout) => {
      if (err || !stdout.trim()) return resolve(null);
      const pid = Number(stdout.trim());
      resolve(Number.isFinite(pid) ? pid : null);
    });
  });

  const pid = byJava || byDir || byMemory;
  if (!pid) return null;

  // Attempt 1: Use /proc directly (most reliable method)
  const procStats = await getProcessStatsFromProc(pid);
  if (procStats) {
    return { pid, ...procStats };
  }

  // Fallback: usar pidusage
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

async function initDiscordBot() {
  const config = await loadDiscordConfig();
  
  if (!config.enabled || !config.botToken) {
    console.log("[Discord] Bot deshabilitado o sin token");
    return;
  }

  if (discordClient) {
    try {
      await discordClient.destroy();
    } catch (e) {
      console.error("[Discord] Error al destruir cliente anterior:", e.message);
    }
  }

  discordClient = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  discordClient.once("ready", () => {
    console.log(`[Discord] Bot conectado como ${discordClient.user.tag}`);
    discordReady = true;
  });

  discordClient.on("error", (error) => {
    console.error("[Discord] Error:", error.message);
    discordReady = false;
  });

  try {
    await discordClient.login(config.botToken);
  } catch (error) {
    console.error("[Discord] Error al iniciar bot:", error.message);
    discordReady = false;
  }
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

async function sendDiscordNotification(isOnline) {
  try {
    const config = await loadDiscordConfig();
    
    if (!config.enabled || !config.channelId || !discordReady || !discordClient) {
      return;
    }

    // Get language and translations from saved configuration
    const language = await getAppLanguage();
    const i18n = await getDiscordTranslations(language);

    const channel = await discordClient.channels.fetch(config.channelId);
    if (!channel || !channel.isTextBased()) {
      console.error("[Discord] Canal no válido");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(isOnline ? i18n.title_online : i18n.title_offline)
      .setDescription(isOnline 
        ? i18n.description_online
        : i18n.description_offline
      )
      .setColor(isOnline ? 0x00FF00 : 0xFF0000)
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

// ============ AUTENTICACIÓN ============

function cleanupTokens() {
  const now = Date.now();
  for (const [token, meta] of tokens.entries()) {
    if (now - meta.createdAt > TOKEN_TTL_MS) {
      tokens.delete(token);
    }
  }
}

function authMiddleware(req, res, next) {
  if (!req.path.startsWith("/api")) {
    return next();
  }
  if (req.path === "/api/login") return next();
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  cleanupTokens();
  if (!token || !tokens.has(token)) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  next();
}

// =============================================================================
// ============ SETUP ROUTES ============
// These routes do NOT require authentication (accessible on first run)
// =============================================================================

// ============ SETUP STATUS ENDPOINT ============
// Check if initial setup has been completed
app.get("/api/setup/status", (req, res) => {
  try {
    if (fs.existsSync(SETUP_CONFIG_PATH)) {
      const setupConfig = JSON.parse(fs.readFileSync(SETUP_CONFIG_PATH, "utf8"));
      res.json({
        setupCompleted: true,
        language: setupConfig.language
      });
    } else {
      res.json({ setupCompleted: false });
    }
  } catch (error) {
    res.json({ setupCompleted: false });
  }
});

// Completar setup inicial
app.post("/api/setup/complete", async (req, res) => {
  try {
    const { username, password, language } = req.body;
    
    if (!username || !password || !language) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
    }
    
    if (password.length < 4) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 4 caracteres" });
    }
    
    // Save setup configuration to file
    const setupConfig = {
      setupCompleted: true,
      language,
      completedAt: new Date().toISOString()
    };
    
    await fsp.writeFile(SETUP_CONFIG_PATH, JSON.stringify(setupConfig, null, 2));
    
    // Encrypt and save authentication configuration
    const encryptedPassword = encryptPassword(password.trim());
    const authConfig = {
      username: username.trim(),
      password: encryptedPassword,
      encrypted: true,
      encryptedAt: new Date().toISOString()
    };
    
    await fsp.writeFile(AUTH_CONFIG_PATH, JSON.stringify(authConfig, null, 2));
    
    // Update environment variables in memory for server process
    process.env.PANEL_USER = username.trim();
    process.env.PANEL_PASS = password.trim();
    
    res.json({ success: true });
  } catch (error) {
    console.error("[ERROR] Setup completion:", error);
    res.status(500).json({ error: "Error al completar el setup" });
  }
});

// =============================================================================
// AUTHENTICATION
// =============================================================================

// ============ AUTHENTICATION MIDDLEWARE ============
// Apply authentication middleware BEFORE defining API routes that require auth
app.use(authMiddleware);

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  
  // Load credentials from config file if it exists (encrypted or plain)
  let expectedUser = "admin";
  let expectedPass = "admin";
  let isEncrypted = false;
  
  try {
    if (fs.existsSync(AUTH_CONFIG_PATH)) {
      const authConfig = JSON.parse(fs.readFileSync(AUTH_CONFIG_PATH, "utf8"));
      expectedUser = authConfig.username || expectedUser;
      
      // Decrypt password if it's encrypted
      if (authConfig.encrypted && authConfig.password) {
        try {
          expectedPass = decryptPassword(authConfig.password);
          isEncrypted = true;
        } catch (error) {
          console.error("[ERROR] Failed to decrypt password:", error);
          expectedPass = authConfig.password;
        }
      } else {
        expectedPass = authConfig.password || expectedPass;
      }
    }
  } catch (error) {
    console.error("[ERROR] Loading auth config:", error);
  }
  
  // Fallback a variables de entorno
  expectedUser = process.env.PANEL_USER || expectedUser;
  expectedPass = process.env.PANEL_PASS || expectedPass;
  
  const receivedUser = (username || "").trim();
  const receivedPass = (password || "").trim();
  
  if (receivedUser === expectedUser && receivedPass === expectedPass) {
    const token = crypto.randomBytes(24).toString("hex");
    tokens.set(token, { createdAt: Date.now() });
    res.json({ token, expiresInMs: TOKEN_TTL_MS });
    return;
  }
  res.status(401).json({ error: "Credenciales inválidas" });
});

app.get("/api/status", async (req, res) => {
  const status = await getScreenStatus();
  res.json(status);
});

app.post("/api/start", async (req, res) => {
  try {
    if (IS_WINDOWS) {
      await startServerProcessNode();
      res.json({ output: "Server started (Windows)" });
    } else {
      const output = await runScript(START_SCRIPT);
      res.json({ output });
    }
    sendDiscordNotification(true).catch(err => 
      console.error("[Discord] Error al enviar notificación de inicio:", err.message)
    );
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.post("/api/stop", async (req, res) => {
  try {
    if (IS_WINDOWS) {
      await stopServerProcessNode();
      res.json({ output: "Server stopped (Windows)" });
    } else {
      const output = await runScript(STOP_SCRIPT);
      res.json({ output });
    }
    sendDiscordNotification(false).catch(err => 
      console.error("[Discord] Error al enviar notificación de detención:", err.message)
    );
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.get("/api/logs", async (req, res) => {
  try {
    const logFile = path.join(BASE_DIR, "server.log");
    const lines = parseInt(req.query.lines) || 100;
    if (!fs.existsSync(logFile)) {
      res.json({ logs: "" });
      return;
    }
    const content = await fsp.readFile(logFile, "utf-8");
    const allLines = content.split("\n").map(stripAnsi);
    const lastLines = allLines.slice(-lines).join("\n");
    res.json({ logs: lastLines });
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.post("/api/command", async (req, res) => {
  try {
    const { command } = req.body;
    if (!command || typeof command !== "string") {
      res.status(400).json({ error: "Comando inválido" });
      return;
    }
    const status = await getScreenStatus();
    if (!status.running) {
      res.status(400).json({ error: "El servidor no está en ejecución" });
      return;
    }

    if (IS_WINDOWS) {
      if (!serverProcess || serverProcessExited || !serverProcess.stdin) {
        res.status(400).json({ error: "No se puede enviar comando: proceso no disponible" });
        return;
      }
      serverProcess.stdin.write(`${command}\n`);
    } else {
      await new Promise((resolve, reject) => {
        execFile(
          "screen",
          ["-S", SCREEN_NAME, "-X", "stuff", `${command}\n`],
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

    res.json({ ok: true, command });
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.get("/api/metrics", async (req, res) => {
  try {
    console.log("[DEBUG] /api/metrics called");
    const { xmx, jarName } = await readStartConfig();
    console.log("[DEBUG] Config: xmx=" + xmx + ", jarName=" + jarName);
    const processUsage = await getServerProcessUsage(jarName);
    console.log("[DEBUG] Process Usage:", processUsage);
    const disk = await checkDiskSpace(BASE_DIR);
    const folderSize = await getFolderSizeBytes(BASE_DIR);
    res.json({
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
    });
  } catch (error) {
    console.error("[ERROR] /api/metrics:", error);
    res.status(500).json({ error: formatError(error) });
  }
});

app.get("/api/files", async (req, res) => {
  try {
    const relPath = req.query.path || ".";
    rejectHiddenPath(relPath);
    const target = resolveSafe(relPath);
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
    res.json({ path: relPath, items });
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
    const zipPath = resolveSafe(relPath);
    if (isHiddenFile(zipPath)) {
      res.status(400).json({ error: "Archivo no permitido" });
      return;
    }
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(path.dirname(zipPath), true);
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
    const target = resolveSafe(relPath);
    if (isHiddenFile(target)) {
      res.status(400).json({ error: "Archivo no permitido" });
      return;
    }
    await fsp.rm(target, { recursive: true, force: true });
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
    const target = resolveSafe(relPath);
    if (isHiddenFile(target)) {
      res.status(400).json({ error: "Archivo no permitido" });
      return;
    }
    const content = await fsp.readFile(target, "utf-8");
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
    const target = resolveSafe(relPath);
    if (isHiddenFile(target)) {
      res.status(400).json({ error: "Archivo no permitido" });
      return;
    }
    const content = req.body?.content;
    if (typeof content !== "string") {
      res.status(400).json({ error: "Contenido inválido" });
      return;
    }
    await fsp.writeFile(target, content, "utf-8");
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
    const { dir } = await resolveBackupDirectory();
    res.json({ available: true, path: dir, backupDir: dir });
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.post("/api/backup/create", async (req, res) => {
  try {
    const { dir: backupDir } = await resolveBackupDirectory();
    await fsp.mkdir(backupDir, { recursive: true });
    const backupName = `HytaleServer-${formatDateForBackup()}`;
    const backupPath = path.join(backupDir, `${backupName}.zip`);
      const zip = new AdmZip();
      await addDirToZipExcludeHidden(zip, BASE_DIR);
      zip.writeZip(backupPath);
    res.json({ ok: true, backup: backupName, path: backupPath });
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.get("/api/backup/list", async (req, res) => {
  try {
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
            file: file
          });
        }
      }
      backups.sort((a, b) => b.mtime - a.mtime);
      res.json({ available: true, backups });
    } catch (error) {
      res.json({ available: true, backups: [] });
    }
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.delete("/api/backup/:file", async (req, res) => {
  try {
    const { dir: backupDir } = await resolveBackupDirectory();
    const file = req.params.file;
    if (!file.endsWith(".zip") || file.includes("..") || file.includes("/")) {
      res.status(400).json({ error: "Nombre de archivo inválido" });
      return;
    }
    const backupPath = path.join(backupDir, file);
    if (!backupPath.startsWith(backupDir + path.sep)) {
      res.status(400).json({ error: "Ruta inválida" });
      return;
    }
    await fsp.unlink(backupPath);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.post("/api/backup/restore/:file", async (req, res) => {
  try {
      const { dir: backupDir } = await resolveBackupDirectory();
      const file = req.params.file;
      if (!file.endsWith(".zip") || file.includes("..") || file.includes("/")) {
        res.status(400).json({ error: "Nombre de archivo inválido" });
        return;
      }
      const backupPath = path.join(backupDir, file);
      if (!backupPath.startsWith(backupDir + path.sep)) {
        res.status(400).json({ error: "Ruta inválida" });
        return;
      }
      if (!fs.existsSync(backupPath)) {
        res.status(404).json({ error: "Backup no encontrado" });
        return;
      }

      // Guardar binarios/protegidos antes de limpiar
      const tempKeepDir = path.join(BASE_DIR, ".temp_keep_backup");
      await fsp.mkdir(tempKeepDir, { recursive: true });
      const keepNames = [
        "hytale-downloader-linux-amd64",
        "hytale-downloader-windows-amd64.exe",
        ".hytale-downloader-credentials.json"
      ];

      const keepFiles = (await fsp.readdir(BASE_DIR))
        .filter(f => f.endsWith('.sh') || keepNames.includes(f))
        .map(f => path.join(BASE_DIR, f));

      for (const keepFile of keepFiles) {
        const fileName = path.basename(keepFile);
        await fsp.copyFile(keepFile, path.join(tempKeepDir, fileName)).catch(() => {});
      }

      // Limpiar directorio actual
      await fsp.rm(BASE_DIR, { recursive: true, force: true });
      await fsp.mkdir(BASE_DIR, { recursive: true });

      // Extraer backup
      const zip = new AdmZip(backupPath);
      zip.extractAllTo(BASE_DIR, true);

      // Restaurar archivos protegidos
      const restoredKeeps = await fsp.readdir(tempKeepDir).catch(() => []);
      for (const fileName of restoredKeeps) {
        const from = path.join(tempKeepDir, fileName);
        const to = path.join(BASE_DIR, fileName);
        await fsp.copyFile(from, to).catch(() => {});
      }

      await fsp.rm(tempKeepDir, { recursive: true, force: true }).catch(() => {});

      res.json({ ok: true, restoredFrom: backupPath });
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

// ============ ENDPOINTS DE DISCORD ============

app.get("/api/discord/config", async (req, res) => {
  try {
    const config = await loadDiscordConfig();
    res.json({
      enabled: config.enabled,
      channelId: config.channelId,
      hasToken: !!config.botToken,
      botStatus: discordReady ? "connected" : "disconnected"
    });
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.post("/api/discord/config", async (req, res) => {
  try {
    const { botToken, channelId, enabled } = req.body;
    const currentConfig = await loadDiscordConfig();
    
    const newConfig = {
      botToken: botToken !== undefined ? botToken : currentConfig.botToken,
      channelId: channelId !== undefined ? channelId : currentConfig.channelId,
      enabled: enabled !== undefined ? enabled : currentConfig.enabled
    };

    await saveDiscordConfig(newConfig);
    
    if (newConfig.enabled && newConfig.botToken) {
      await initDiscordBot();
    } else if (discordClient) {
      await discordClient.destroy();
      discordClient = null;
      discordReady = false;
    }

    res.json({ 
      success: true,
      botStatus: discordReady ? "connected" : "disconnected"
    });
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.post("/api/discord/test", async (req, res) => {
  try {
    if (!discordReady) {
      res.status(400).json({ error: "Bot no está conectado" });
      return;
    }
    await sendDiscordNotification(true);
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
      const downloader = await downloaderExists();
      res.json({
        platform: IS_WINDOWS ? "windows" : "linux",
        javaFound: !!javaPath,
        javaPath: javaPath || null,
        downloaderFound: downloader,
        downloaderPath: downloader ? DOWNLOADER_PATH : null
      });
    } catch (error) {
      res.status(500).json({ error: formatError(error) });
    }
  });
app.get("/api/server/config", async (req, res) => {
  try {
    if (fs.existsSync(SERVER_CONFIG_PATH)) {
      const config = JSON.parse(await fsp.readFile(SERVER_CONFIG_PATH, "utf8"));
      res.json(config);
    } else {
      // Valores por defecto
      res.json({
        threads: 4,
        ramMin: 2048,
        ramMax: 4096
      });
    }
  } catch (error) {
    console.error("[ERROR] Loading server config:", error);
    res.status(500).json({ error: formatError(error) });
  }
});

// Save server configuration (CPU threads and RAM settings)
app.post("/api/server/config", async (req, res) => {
  try {
    const { threads, ramMin, ramMax } = req.body;
    
    // Validaciones
    if (!threads || !ramMin || !ramMax) {
      return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }
    
    if (threads < 1 || threads > 32) {
      return res.status(400).json({ error: "Los hilos deben estar entre 1 y 32" });
    }
    
    if (ramMin >= ramMax) {
      return res.status(400).json({ error: "La RAM mínima debe ser menor que la máxima" });
    }
    
    if (ramMin < 512) {
      return res.status(400).json({ error: "La RAM mínima debe ser al menos 512 MB" });
    }
    
    const config = { threads, ramMin, ramMax };
    await fsp.writeFile(SERVER_CONFIG_PATH, JSON.stringify(config, null, 2));
    
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
    const { dir } = await resolveBackupDirectory();
    res.json({ backupLocation: dir, enabled: true });
  } catch (error) {
    console.error("[ERROR] Loading backup config:", error);
    res.status(500).json({ error: formatError(error) });
  }
});

// Save backup configuration to file
app.post("/api/backup/config", async (req, res) => {
  try {
    const { backupLocation } = req.body;
    
    if (!backupLocation) {
      return res.status(400).json({ error: "Backup location is required" });
    }
    
    // Validar que es una ruta válida
    const absolutePath = path.resolve(backupLocation);
    
    // Crear directorio si no existe
    if (!fs.existsSync(absolutePath)) {
      fs.mkdirSync(absolutePath, { recursive: true });
    }
    
    // Verificar permisos de escritura
    try {
      fs.accessSync(absolutePath, fs.constants.W_OK);
    } catch {
      return res.status(403).json({ error: "No tiene permisos de escritura en esta ubicación" });
    }
    
    const config = {
      backupLocation: absolutePath,
      enabled: true,
      updatedAt: new Date().toISOString()
    };
    
    await fsp.writeFile(BACKUP_CONFIG_PATH, JSON.stringify(config, null, 2));
    
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
    const exists = fs.existsSync(DOWNLOADER_PATH);
    let isExecutable = false;
    let version = null;
    let gameVersion = null;
    let lastDownload = null;
    
    if (exists) {
      const stats = await fsp.stat(DOWNLOADER_PATH);
      isExecutable = !!(stats.mode & fs.constants.X_OK);
      
      // Attempt to get downloader version from executable
      if (isExecutable) {
        try {
          const versionOutput = await new Promise((resolve, reject) => {
            exec(`"${DOWNLOADER_PATH}" -version`, { cwd: BASE_DIR }, (err, stdout) => {
              if (err) reject(err);
              else resolve(stdout.trim());
            });
          });
          version = versionOutput;
          
          // Attempt to get game version from available files
          const gameVersionOutput = await new Promise((resolve, reject) => {
            exec(`"${DOWNLOADER_PATH}" -print-version`, { cwd: BASE_DIR, timeout: 10000 }, (err, stdout) => {
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
    
    // Verificar si ya existe instalación del servidor
    const serverJarExists = fs.existsSync(path.join(BASE_DIR, "HytaleServer.jar"));
    const assetsExists = fs.existsSync(path.join(BASE_DIR, "Assets.zip"));
    const isInstalled = serverJarExists && assetsExists;
    
    // Verificar si el downloader está autenticado (tiene credenciales válidas)
    const credentialsPath = path.join(BASE_DIR, ".hytale-downloader-credentials.json");
    let isAuthenticated = false;
    try {
      if (fs.existsSync(credentialsPath)) {
        const credContent = await fsp.readFile(credentialsPath, "utf-8");
        const credentials = JSON.parse(credContent);
        // Si el archivo existe y tiene contenido válido, está autenticado
        isAuthenticated = !!credentials && Object.keys(credentials).length > 0;
      }
    } catch (e) {
      // Si hay error leyendo, asumimos no autenticado
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
    
    res.json({
      exists,
      isExecutable,
      version,
      gameVersion,
      isInstalled,
      isAuthenticated,
      lastDownload,
      path: DOWNLOADER_PATH
    });
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

// Descargar el servidor usando hytale-downloader
app.post("/api/downloader/download", async (req, res) => {
  try {
    const downloaderExists = fs.existsSync(DOWNLOADER_PATH);
    if (!downloaderExists) {
      res.status(400).json({ error: "El descargador de Hytale no existe en la ruta especificada" });
      return;
    }
    
    // Verificar que sea ejecutable
    const stats = await fsp.stat(DOWNLOADER_PATH);
    if (!(stats.mode & fs.constants.X_OK)) {
      // Attempt to make downloader executable
      await fsp.chmod(DOWNLOADER_PATH, 0o755);
    }
    
    res.json({ 
      success: true, 
      message: "Descarga iniciada. Esto puede tomar varios minutos..."
    });
    
    // Ejecutar en background
    exec(`"${DOWNLOADER_PATH}"`, { cwd: BASE_DIR }, async (err, stdout, stderr) => {
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
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

// Iniciar flujo de autenticación (device code) para el downloader
app.post("/api/downloader/auth/start", async (req, res) => {
  try {
    const exists = fs.existsSync(DOWNLOADER_PATH);
    if (!exists) {
      res.status(400).json({ error: "El descargador de Hytale no existe en la ruta especificada" });
      return;
    }

    const session = createAuthSession();

    // Run downloader WITHOUT arguments to trigger actual download which requires auth
    // This will show the device flow if not authenticated
    const child = spawn(DOWNLOADER_PATH, [], { cwd: BASE_DIR });
    session.child = child;
    session.status = "waiting";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      session.output.push(text);
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const parsed = parseDeviceFlowOutput(line);
        if (parsed.code) session.code = parsed.code;
        if (parsed.url) session.verifyUrl = parsed.url;
        
        // Update status based on authentication messages
        if (parsed.isSuccess && session.status !== "success") {
          session.status = "success";
          console.log("[Downloader Auth] Authentication successful!");
          // Kill the child process since we only wanted to authenticate, not download
          if (session.child) {
            session.child.kill("SIGTERM");
          }
        }
        if (parsed.isFailed && session.status !== "error") {
          session.status = "error";
          console.log("[Downloader Auth] Authentication failed");
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      session.output.push(text);
      // Also parse stderr for auth messages
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const parsed = parseDeviceFlowOutput(line);
        if (parsed.isSuccess) session.status = "success";
        if (parsed.isFailed) session.status = "error";
      }
    });

    child.on("close", (code) => {
      session.exitCode = code;
      // Only mark as error if not already marked as success
      if (session.status !== "success") {
        session.status = code === 0 ? "success" : "error";
      }
      console.log(`[Downloader Auth] Process exited with code ${code}, final status: ${session.status}`);
    });

    res.json({
      id: session.id,
      status: session.status,
      code: session.code,
      verifyUrl: session.verifyUrl
    });
  } catch (error) {
    res.status(500).json({ error: formatError(error) });
  }
});

app.get("/api/downloader/auth/status", (req, res) => {
  const { id } = req.query;
  if (!id || !DOWNLOADER_AUTH_SESSIONS.has(id)) {
    res.status(404).json({ error: "Sesión no encontrada" });
    return;
  }
  const session = DOWNLOADER_AUTH_SESSIONS.get(id);
  res.json({
    id: session.id,
    status: session.status,
    code: session.code,
    verifyUrl: session.verifyUrl,
    exitCode: session.exitCode,
    output: session.output.slice(-50)
  });
});

app.post("/api/downloader/auth/cancel", (req, res) => {
  const { id } = req.body || {};
  if (!id || !DOWNLOADER_AUTH_SESSIONS.has(id)) {
    res.status(404).json({ error: "Sesión no encontrada" });
    return;
  }
  cleanupAuthSession(id);
  res.json({ success: true });
});

// Retrieve saved authentication configuration
app.get("/api/auth/config", async (req, res) => {
  try {
    let config = { authMode: "authenticated", deviceCode: null, authenticated: false };
    
    if (fs.existsSync(AUTH_CONFIG_PATH)) {
      const content = await fsp.readFile(AUTH_CONFIG_PATH, "utf-8");
      config = JSON.parse(content);
    }
    
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
    
    await fsp.writeFile(AUTH_CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
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
    
    await fsp.writeFile(AUTH_CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
    
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
// Middleware to serve translation files WITHOUT authentication (MUST come before authMiddleware)
app.use("/translations", express.static(path.join(__dirname, "public", "translations")));

// Aplicar middleware de autenticación DESPUÉS de definir todas las rutas
app.use(authMiddleware);

app.use(express.static(path.join(__dirname, "public")));

app.use((req, res) => {
  res.status(404).json({ error: "No encontrado" });
});

app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
  console.log(`Panel web activo en http://localhost:${PORT}`);
  initDiscordBot().catch(err => 
    console.error("[Discord] Error al inicializar bot:", err.message)
  );
});
