// ============ INITIAL SETUP & FORM ELEMENTS ============
// DOM references for the initial setup screen and form elements
const initialSetup = document.getElementById("initial-setup");
const setupStep1 = document.getElementById("setup-step-1");
const setupStep2 = document.getElementById("setup-step-2");
const setupUsername = document.getElementById("setup-username");
const setupPassword = document.getElementById("setup-password");
const setupConfirmPassword = document.getElementById("setup-confirm-password");
const setupFinishBtn = document.getElementById("setup-finish-btn");
const setupError = document.getElementById("setup-error");
const langButtons = document.querySelectorAll(".lang-btn");

// Server configuration elements for CPU threads and RAM settings
const configThreads = document.getElementById("config-threads");
const configRamMin = document.getElementById("config-ram-min");
const configRamMax = document.getElementById("config-ram-max");
const saveServerConfigBtn = document.getElementById("save-server-config");
const serverConfigMessage = document.getElementById("server-config-message");

// Backup configuration elements for location management
const backupLocation = document.getElementById("backup-location");
const backupChangeLocationBtn = document.getElementById("backup-change-location");
const backupLocationPicker = document.getElementById("backup-location-picker");
const backupLocationMessage = document.getElementById("backup-location-message");

const state = {
  token: localStorage.getItem("hytale_token") || null,
  currentPath: ".",
  editorPath: null,
  downloaderAuthSession: null,
  downloaderAuthInterval: null
};

const navButtons = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");
const logBox = document.getElementById("action-log");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const statusExtra = document.getElementById("status-extra");
const ramMetric = document.getElementById("ram-metric");
const ramBar = document.getElementById("ram-bar");
const cpuMetric = document.getElementById("cpu-metric");
const cpuBar = document.getElementById("cpu-bar");
const storageMetric = document.getElementById("storage-metric");
const storageBar = document.getElementById("storage-bar");
const storageDetail = document.getElementById("storage-detail");

const loginUser = document.getElementById("login-user");
const loginPass = document.getElementById("login-pass");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");
const authBox = document.getElementById("auth-box");

const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");

const serverLogs = document.getElementById("server-logs");
const logsRefreshBtn = document.getElementById("logs-refresh");
const commandInput = document.getElementById("command-input");
const commandSendBtn = document.getElementById("command-send");

const fileGrid = document.getElementById("file-grid");
const currentPath = document.getElementById("current-path");
const uploadInput = document.getElementById("upload-input");
const uploadBtn = document.getElementById("upload-btn");
const refreshBtn = document.getElementById("refresh-btn");

const editor = document.getElementById("file-editor");
const editorTitle = document.getElementById("editor-title");
const editorContent = document.getElementById("editor-content");
const editorSave = document.getElementById("editor-save");
const editorClose = document.getElementById("editor-close");

const configEditor = document.getElementById("config-editor");
const configRefresh = document.getElementById("config-refresh");
const configSave = document.getElementById("config-save");
const configStatus = document.getElementById("config-status");

const backupGrid = document.getElementById("backup-grid");
const backupStatus = document.getElementById("backup-status");
const backupRefresh = document.getElementById("backup-refresh");
const backupCreate = document.getElementById("backup-create");

const discordStatusDot = document.getElementById("discord-status-dot");
const discordStatusText = document.getElementById("discord-status-text");
const discordToken = document.getElementById("discord-token");
const discordChannel = document.getElementById("discord-channel");
const discordEnabled = document.getElementById("discord-enabled");
const discordSave = document.getElementById("discord-save");
const discordTest = document.getElementById("discord-test");
const discordMessage = document.getElementById("discord-message");

// ============ SETUP PAGE ELEMENTS ============
// References to downloader status, version, and installation indicators
const setupRefreshBtn = document.getElementById("setup-refresh");
const downloaderExistsDot = document.getElementById("downloader-exists-dot");
const downloaderExistsText = document.getElementById("downloader-exists-text");
const downloaderVersion = document.getElementById("downloader-version");
const gameVersion = document.getElementById("game-version");
const serverInstalledDot = document.getElementById("server-installed-dot");
const serverInstalledText = document.getElementById("server-installed-text");
const downloadServerBtn = document.getElementById("download-server-btn");
const downloadStatus = document.getElementById("download-status");
const authStatusDot = document.getElementById("auth-status-dot");
const authStatusText = document.getElementById("auth-status-text");
const authModeText = document.getElementById("auth-mode-text");
const authMessage = document.getElementById("auth-message");
const downloaderAuthBtn = document.getElementById("downloader-auth-btn");
const downloaderAuthCancel = document.getElementById("downloader-auth-cancel");
const downloaderAuthCode = document.getElementById("downloader-auth-code");
const downloaderAuthUrl = document.getElementById("downloader-auth-url");
const downloaderAuthDot = document.getElementById("downloader-auth-dot");
const downloaderAuthStatus = document.getElementById("downloader-auth-status");
const downloaderAuthMessage = document.getElementById("downloader-auth-message");
let lastDownloadNotifiedAt = null;

// Help drawer elements
const helpDrawer = document.getElementById("help-drawer");
const helpToggle = document.getElementById("help-toggle");
const helpDrawerClose = document.getElementById("help-drawer-close");

function setActiveView(viewId) {
  views.forEach((view) => view.classList.remove("active"));
  document.getElementById(`view-${viewId}`).classList.add("active");
  navButtons.forEach((btn) => btn.classList.remove("active"));
  document.querySelector(`.nav-item[data-view='${viewId}']`).classList.add("active");
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setActiveView(btn.dataset.view);
  });
});

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "--";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

function log(message) {
  logBox.textContent = message;
}

function getLocaleForLanguage(lang) {
  const map = {
    es: "es-ES",
    en: "en-US",
    pt: "pt-BR",
    fr: "fr-FR",
    zh: "zh-CN"
  };
  return map[lang] || navigator.language || "en-US";
}

function getAuthModeLabel(mode) {
  if (!mode) return i18n.t("setup_auth_mode_unknown");
  const normalized = mode.toLowerCase();
  const key = `setup_auth_mode_${normalized}`;
  const translation = i18n.t(key);
  if (translation && translation !== key) return translation;
  if (normalized === "authenticated") return i18n.t("setup_auth_mode_authenticated");
  if (normalized === "none") return i18n.t("setup_auth_mode_none");
  return mode;
}

async function apiFetch(path, options = {}) {
  const headers = options.headers || {};
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }
  if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(path, { ...options, headers });
  if (res.status === 401) {
    state.token = null;
    localStorage.removeItem("hytale_token");
    authBox.style.display = "flex";
    log(i18n.t("auth_session_expired"));
    return null;
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Error");
  }
  return data;
}

function updateAuthUI() {
  if (state.token) {
    authBox.style.display = "none";
  } else {
    authBox.style.display = "flex";
  }
}

// ============ DISCORD ============

async function refreshDiscord() {
  try {
    const data = await apiFetch("/api/discord/config");
    if (!data) return;
    
    discordStatusDot.classList.toggle("on", data.botStatus === "connected");
    discordStatusText.textContent = data.botStatus === "connected" ? i18n.t("common_yes") : i18n.t("common_no");
    discordChannel.value = data.channelId || "";
    discordEnabled.checked = data.enabled || false;
    
    if (data.hasToken) {
      discordToken.placeholder = i18n.t("discord_token_configured") || "Token configurado (oculto por seguridad)";
    }
  } catch (error) {
    showDiscordMessage(error.message, "error");
  }
}

function showDiscordMessage(text, type = "success") {
  discordMessage.textContent = text;
  discordMessage.className = type;
  setTimeout(() => {
    discordMessage.textContent = "";
    discordMessage.className = "";
  }, 5000);
}

discordSave.addEventListener("click", async () => {
  try {
    const payload = {
      channelId: discordChannel.value.trim(),
      enabled: discordEnabled.checked
    };
    
    if (discordToken.value.trim() && !discordToken.value.includes("oculto")) {
      payload.botToken = discordToken.value.trim();
    }
    
    const data = await apiFetch("/api/discord/config", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    
    if (data) {
      showDiscordMessage(i18n.t("discord_save_success"), "success");
      discordToken.value = "";
      await refreshDiscord();
    }
  } catch (error) {
    showDiscordMessage(error.message, "error");
  }
});

discordTest.addEventListener("click", async () => {
  try {
    const data = await apiFetch("/api/discord/test", { method: "POST" });
    if (data) {
      showDiscordMessage(i18n.t("discord_test_success"), "success");
    }
  } catch (error) {
    showDiscordMessage(error.message, "error");
  }
});

async function validateToken() {
  if (!state.token) return;
  try {
    await apiFetch("/api/status");
  } catch (error) {
    // Token is invalid, clear it and return to login
    state.token = null;
    localStorage.removeItem("hytale_token");
    updateAuthUI();
    log(i18n.t("auth_session_expired"));
  }
}

loginBtn.addEventListener("click", async () => {
  try {
    const data = await apiFetch("/api/login", {
      method: "POST",
      body: JSON.stringify({
        username: loginUser.value,
        password: loginPass.value
      })
    });
    if (data?.token) {
      state.token = data.token;
      localStorage.setItem("hytale_token", data.token);
      loginError.textContent = "";
      updateAuthUI();
      log(i18n.t("auth_login_success"));
      await refreshStatus();
      await refreshMetrics();
      await refreshFiles();
      await refreshBackups();
      await refreshConfig();
    }
  } catch (error) {
    loginError.textContent = error.message;
  }
});

startBtn.addEventListener("click", async () => {
  try {
    const data = await apiFetch("/api/start", { method: "POST" });
    log(data.output || i18n.t("dashboard_started"));
    await refreshStatus();
  } catch (error) {
    log(error.message);
  }
});

stopBtn.addEventListener("click", async () => {
  try {
    const data = await apiFetch("/api/stop", { method: "POST" });
    log(data.output || i18n.t("dashboard_stopped_msg"));
    await refreshStatus();
    await refreshLogs();
  } catch (error) {
    log(error.message);
  }
});
// ============ SETUP ============

async function refreshSetup() {
  try {
    const data = await apiFetch("/api/downloader/status");
    if (!data) return;
    
    // Update downloader status indicator based on existence and executability
    downloaderExistsDot.classList.toggle("on", data.exists && data.isExecutable);
    downloaderExistsText.textContent = data.exists 
      ? (data.isExecutable ? i18n.t("common_yes") : i18n.t("setup_not_executable")) 
      : i18n.t("common_no");
    
    downloaderVersion.textContent = data.version || i18n.t("common_not_available");
    gameVersion.textContent = data.gameVersion || i18n.t("common_not_available");
    
    // Update downloader authentication status
    downloaderAuthDot.classList.toggle("on", data.isAuthenticated);
    downloaderAuthStatus.textContent = data.isAuthenticated 
      ? i18n.t("setup_auth_status_success") 
      : i18n.t("setup_auth_status_pending");
    
    // Disable auth button if already authenticated
    downloaderAuthBtn.disabled = data.isAuthenticated;
    
    // Update server installation status indicator
    serverInstalledDot.classList.toggle("on", data.isInstalled);
    serverInstalledText.textContent = data.isInstalled ? i18n.t("common_yes") : i18n.t("common_no");
    
    // Enable/disable download button based on downloader status and installation state
    downloadServerBtn.disabled = !data.exists || !data.isExecutable || data.isInstalled;
    
    // Fetch authentication configuration and update status display
    const authData = await apiFetch("/api/auth/config");
    if (authData) {
      authStatusDot.classList.toggle("on", authData.authenticated);
      authStatusText.textContent = authData.authenticated ? i18n.t("auth_status_authenticated") : i18n.t("auth_status_not_authenticated");
      authModeText.textContent = getAuthModeLabel(authData.authMode);
    }

    // Show notification when download and extraction are completed
    if (data.lastDownload?.completed && data.lastDownload?.at) {
      if (!lastDownloadNotifiedAt || data.lastDownload.at !== lastDownloadNotifiedAt) {
        showDownloadMessage(i18n.t("setup_download_complete"), "success");
        lastDownloadNotifiedAt = data.lastDownload.at;
      }
    }
  } catch (error) {
    console.error("Error refreshing setup:", error);
  }
}

function showDownloadMessage(text, type = "info") {
  downloadStatus.textContent = text;
  downloadStatus.className = type;
  setTimeout(() => {
    downloadStatus.textContent = "";
    downloadStatus.className = "";
  }, 10000);
}

function showAuthMessage(text, type = "info") {
  authMessage.textContent = text;
  authMessage.className = type;
  setTimeout(() => {
    authMessage.textContent = "";
    authMessage.className = "";
  }, 10000);
}

function showDownloaderAuthMessage(text, type = "info") {
  downloaderAuthMessage.textContent = text;
  downloaderAuthMessage.className = type;
  setTimeout(() => {
    downloaderAuthMessage.textContent = "";
    downloaderAuthMessage.className = "";
  }, 10000);
}

async function startDownloaderAuth() {
  try {
    if (state.downloaderAuthInterval) {
      clearInterval(state.downloaderAuthInterval);
      state.downloaderAuthInterval = null;
    }

    const res = await apiFetch("/api/downloader/auth/start", { method: "POST" });
    if (!res) return;
    state.downloaderAuthSession = res.id;
    downloaderAuthStatus.textContent = i18n.t("setup_auth_waiting");
    downloaderAuthDot.classList.remove("on");
    downloaderAuthCode.textContent = res.code || "--";
    if (res.verifyUrl) {
      downloaderAuthUrl.href = res.verifyUrl;
      downloaderAuthUrl.textContent = res.verifyUrl;
    }
    showDownloaderAuthMessage(i18n.t("setup_auth_started"), "info");

    state.downloaderAuthInterval = setInterval(async () => {
      try {
        const status = await apiFetch(`/api/downloader/auth/status?id=${encodeURIComponent(state.downloaderAuthSession)}`);
        if (!status) return;
        if (status.code) downloaderAuthCode.textContent = status.code;
        if (status.verifyUrl) {
          downloaderAuthUrl.href = status.verifyUrl;
          downloaderAuthUrl.textContent = status.verifyUrl;
        }
        downloaderAuthStatus.textContent = i18n.t(`setup_auth_status_${status.status}`) || status.status;
        const statusKey = `setup_auth_status_${status.status}`;
        const statusLabel = i18n.t(statusKey);
        downloaderAuthStatus.textContent = statusLabel === statusKey ? status.status : statusLabel;
        if (status.status === "success") {
          downloaderAuthDot.classList.add("on");
          showDownloaderAuthMessage(i18n.t("setup_auth_completed"), "success");
          clearInterval(state.downloaderAuthInterval);
          state.downloaderAuthInterval = null;
          state.downloaderAuthSession = null;
          refreshSetup();
        } else if (status.status === "error") {
          downloaderAuthDot.classList.remove("on");
          showDownloaderAuthMessage(i18n.t("setup_auth_failed"), "error");
          clearInterval(state.downloaderAuthInterval);
          state.downloaderAuthInterval = null;
          state.downloaderAuthSession = null;
        }
      } catch (err) {
        console.error(err);
      }
    }, 3000);
  } catch (error) {
    showDownloaderAuthMessage(error.message, "error");
  }
}

async function cancelDownloaderAuth() {
  try {
    if (!state.downloaderAuthSession) return;
    await apiFetch("/api/downloader/auth/cancel", {
      method: "POST",
      body: JSON.stringify({ id: state.downloaderAuthSession })
    });
  } catch (err) {
    // ignore
  } finally {
    if (state.downloaderAuthInterval) {
      clearInterval(state.downloaderAuthInterval);
      state.downloaderAuthInterval = null;
    }
    state.downloaderAuthSession = null;
    downloaderAuthStatus.textContent = i18n.t("common_cancelled");
    downloaderAuthDot.classList.remove("on");
    downloaderAuthCode.textContent = "--";
    downloaderAuthUrl.href = "#";
    downloaderAuthUrl.textContent = "--";
  }
}

setupRefreshBtn.addEventListener("click", refreshSetup);

downloadServerBtn.addEventListener("click", async () => {
  try {
    downloadServerBtn.disabled = true;
    showDownloadMessage(i18n.t("setup_download_starting"), "info");
    
    const data = await apiFetch("/api/downloader/download", {
      method: "POST"
    });
    
    if (data && data.success) {
      showDownloadMessage(data.message, "success");
      // Poll every 5 seconds to check if the download is complete
      const interval = setInterval(async () => {
        await refreshSetup();
        const status = await apiFetch("/api/downloader/status");
        if (status && status.isInstalled) {
          clearInterval(interval);
          showDownloadMessage(i18n.t("setup_download_ready"), "success");
        }
      }, 5000);
    }
  } catch (error) {
    showDownloadMessage(error.message, "error");
    downloadServerBtn.disabled = false;
  }
});

downloaderAuthBtn.addEventListener("click", startDownloaderAuth);
downloaderAuthCancel.addEventListener("click", cancelDownloaderAuth);

// ============ HELP DRAWER ============

helpToggle.addEventListener("click", () => {
  helpDrawer.classList.toggle("open");
});

helpDrawerClose.addEventListener("click", () => {
  helpDrawer.classList.remove("open");
});

// Cerrar drawer al hacer clic fuera
document.addEventListener("click", (e) => {
  if (!helpDrawer.contains(e.target) && !helpToggle.contains(e.target)) {
    helpDrawer.classList.remove("open");
  }
});

// ============ DISCORD ============
async function refreshLogs() {
  try {
    const data = await apiFetch("/api/logs?lines=200");
    if (!data) return;
    serverLogs.textContent = data.logs || i18n.t("dashboard_logs_empty");
    serverLogs.scrollTop = serverLogs.scrollHeight;
  } catch (error) {
    serverLogs.textContent = `${i18n.t("dashboard_logs_error")}: ${error.message}`;
  }
}

logsRefreshBtn.addEventListener("click", refreshLogs);

commandSendBtn.addEventListener("click", async () => {
  try {
    const command = commandInput.value.trim();
    if (!command) return;
    await apiFetch("/api/command", {
      method: "POST",
      body: JSON.stringify({ command })
    });
    log(i18n.t("dashboard_command_sent").replace("{command}", command));
    commandInput.value = "";
    setTimeout(refreshLogs, 500);
  } catch (error) {
    log(error.message);
  }
});

commandInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    commandSendBtn.click();
  }
});

async function refreshStatus() {
  try {
    const data = await apiFetch("/api/status");
    if (!data) return;
    statusDot.classList.toggle("on", data.running);
    statusText.textContent = data.running ? i18n.t("dashboard_status_online") : i18n.t("dashboard_status_offline");
    statusExtra.textContent = data.running ? i18n.t("dashboard_status_screen") : "";
  } catch (error) {
    log(error.message);
  }
}

async function refreshMetrics() {
  try {
    const data = await apiFetch("/api/metrics");
    if (!data) return;
    const memory = data.server.memoryBytes || 0;
    const maxMemory = data.server.maxMemoryBytes || 0;
    const cpu = data.server.cpu || 0;
    ramMetric.textContent = maxMemory ? `${formatBytes(memory)} / ${formatBytes(maxMemory)}` : formatBytes(memory);
    const ramPercent = maxMemory ? (memory / maxMemory) * 100 : 0;
    ramBar.style.width = `${Math.min(ramPercent, 100).toFixed(1)}%`;

    cpuMetric.textContent = `${cpu.toFixed(1)}%`;
    cpuBar.style.width = `${Math.min(cpu, 100).toFixed(1)}%`;

    const usedDisk = data.storage.diskTotalBytes - data.storage.diskFreeBytes;
    storageMetric.textContent = i18n.t("dashboard_storage_used")
      .replace("{used}", formatBytes(data.storage.folderBytes));
    storageBar.style.width = `${((usedDisk / data.storage.diskTotalBytes) * 100).toFixed(1)}%`;
    storageDetail.textContent = i18n.t("dashboard_storage_detail")
      .replace("{used}", formatBytes(usedDisk))
      .replace("{total}", formatBytes(data.storage.diskTotalBytes));
  } catch (error) {
    log(error.message);
  }
}

async function refreshFiles() {
  try {
    const data = await apiFetch(`/api/files?path=${encodeURIComponent(state.currentPath)}`);
    if (!data) return;
    currentPath.textContent = `/${data.path === "." ? "" : data.path}`;
    fileGrid.innerHTML = "";

    if (data.path !== ".") {
      const up = document.createElement("div");
      up.className = "file-card";
      up.innerHTML = `<div class='name'>..</div><div class='meta'>${i18n.t("files_go_up")}</div>`;
      up.addEventListener("click", () => {
        const parts = data.path.split("/").filter(Boolean);
        parts.pop();
        state.currentPath = parts.length ? parts.join("/") : ".";
        refreshFiles();
      });
      fileGrid.appendChild(up);
    }

    data.items
      .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
      .forEach((item) => {
        const card = document.createElement("div");
        card.className = "file-card";
        card.innerHTML = `
          <div class="name">${item.name}</div>
          <div class="meta">${item.type}</div>
          <div class="meta">${formatBytes(item.size)}</div>
          <div class="actions">
            ${item.type === "dir" ? `<button class='open-btn'>${i18n.t("files_open")}</button>` : `<button class='edit-btn'>${i18n.t("files_edit")}</button>`}
            ${item.type === "file" && item.name.toLowerCase().endsWith(".zip") ? `<button class='unzip-btn'>${i18n.t("files_unzip")}</button>` : ""}
            <button class='delete-btn'>${i18n.t("files_delete")}</button>
          </div>
        `;
        if (item.type === "dir") {
          card.querySelector(".open-btn").addEventListener("click", () => {
            state.currentPath = state.currentPath === "." ? item.name : `${state.currentPath}/${item.name}`;
            refreshFiles();
          });
        } else {
          card.querySelector(".edit-btn").addEventListener("click", () => openEditor(item.name));
          if (item.name.toLowerCase().endsWith(".zip")) {
            card.querySelector(".unzip-btn").addEventListener("click", () => unzipFile(item.name));
          }
        }
        card.querySelector(".delete-btn").addEventListener("click", () => deleteEntry(item.name));
        fileGrid.appendChild(card);
      });
  } catch (error) {
    log(error.message);
  }
}

async function openEditor(fileName) {
  try {
    const rel = state.currentPath === "." ? fileName : `${state.currentPath}/${fileName}`;
    const data = await apiFetch(`/api/files/content?path=${encodeURIComponent(rel)}`);
    if (!data) return;
    editor.classList.add("active");
    editorTitle.textContent = i18n.t("files_editing").replace("{file}", fileName);
    editorContent.value = data.content;
    state.editorPath = rel;
  } catch (error) {
    log(error.message);
  }
}

editorSave.addEventListener("click", async () => {
  try {
    if (!state.editorPath) return;
    await apiFetch(`/api/files/content?path=${encodeURIComponent(state.editorPath)}`, {
      method: "PUT",
      body: JSON.stringify({ content: editorContent.value })
    });
    log(i18n.t("files_saved"));
    editor.classList.remove("active");
    state.editorPath = null;
  } catch (error) {
    log(error.message);
  }
});

editorClose.addEventListener("click", () => {
  editor.classList.remove("active");
  state.editorPath = null;
});

async function deleteEntry(name) {
  try {
    const rel = state.currentPath === "." ? name : `${state.currentPath}/${name}`;
    await apiFetch(`/api/files?path=${encodeURIComponent(rel)}`, { method: "DELETE" });
    log(i18n.t("files_deleted"));
    refreshFiles();
  } catch (error) {
    log(error.message);
  }
}

async function unzipFile(name) {
  try {
    const rel = state.currentPath === "." ? name : `${state.currentPath}/${name}`;
    await apiFetch(`/api/files/unzip`, {
      method: "POST",
      body: JSON.stringify({ path: rel })
    });
    log(i18n.t("files_unzipped"));
    refreshFiles();
  } catch (error) {
    log(error.message);
  }
}

uploadBtn.addEventListener("click", async () => {
  try {
    if (!uploadInput.files.length) return;
    const form = new FormData();
    form.append("file", uploadInput.files[0]);
    const res = await apiFetch(`/api/files/upload?path=${encodeURIComponent(state.currentPath)}`, {
      method: "POST",
      body: form
    });
    if (res) {
      log(i18n.t("files_uploaded"));
      uploadInput.value = "";
      refreshFiles();
    }
  } catch (error) {
    log(error.message);
  }
});

refreshBtn.addEventListener("click", refreshFiles);

async function refreshConfig() {
  try {
    const data = await apiFetch("/api/config");
    if (!data) return;
    configEditor.value = data.content || "";
    configStatus.textContent = "";
  } catch (error) {
    configStatus.textContent = error.message;
  }
}

configRefresh.addEventListener("click", refreshConfig);

configSave.addEventListener("click", async () => {
  try {
    await apiFetch("/api/config", {
      method: "PUT",
      body: JSON.stringify({ content: configEditor.value })
    });
    configStatus.textContent = i18n.t("config_saved");
  } catch (error) {
    configStatus.textContent = error.message;
  }
});

async function refreshBackups() {
  try {
    const data = await apiFetch("/api/backup/list");
    if (!data) return;
    if (!data.available) {
      backupStatus.textContent = i18n.t("backup_disk_missing");
      backupGrid.innerHTML = "";
      return;
    }
    backupStatus.textContent = i18n.t("backup_count").replace("{count}", data.backups.length);
    backupGrid.innerHTML = "";
    data.backups.forEach((backup) => {
      const card = document.createElement("div");
      card.className = "backup-card";
      const date = new Date(backup.mtime);
      const locale = getLocaleForLanguage(i18n.getCurrentLanguage());
      const dateStr = date.toLocaleString(locale);
      card.innerHTML = `
        <div class="name">${backup.name}</div>
        <div class="meta">${formatBytes(backup.size)}</div>
        <div class="meta">${dateStr}</div>
        <div class="actions">
          <button class="restore-btn">${i18n.t("backup_restore")}</button>
          <button class="delete-btn danger">${i18n.t("backup_delete")}</button>
        </div>
      `;
      card.querySelector(".restore-btn").addEventListener("click", () => restoreBackup(backup.file));
      card.querySelector(".delete-btn").addEventListener("click", () => deleteBackup(backup.file));
      backupGrid.appendChild(card);
    });
  } catch (error) {
    backupStatus.textContent = error.message;
  }
}

async function restoreBackup(file) {
  try {
    await apiFetch(`/api/backup/restore/${file}`, { method: "POST" });
    log(i18n.t("backup_restored"));
  } catch (error) {
    log(error.message);
  }
}

async function deleteBackup(file) {
  try {
    await apiFetch(`/api/backup/${file}`, { method: "DELETE" });
    log(i18n.t("backup_deleted"));
    refreshBackups();
  } catch (error) {
    log(error.message);
  }
}

backupRefresh.addEventListener("click", refreshBackups);

backupCreate.addEventListener("click", async () => {
  try {
    backupStatus.textContent = i18n.t("backup_creating");
    const data = await apiFetch("/api/backup/create", { method: "POST" });
    if (data) {
      log(i18n.t("backup_created").replace("{name}", data.backup));
      await refreshBackups();
    }
  } catch (error) {
    log(error.message);
    backupStatus.textContent = error.message;
  }
});

// Inicializar UI al cargar
updateAuthUI();
if (state.token) {
  validateToken().then(() => {
    if (state.token) {
      refreshStatus();
      refreshMetrics();
      refreshFiles();
      refreshBackups();
      refreshConfig();
      refreshLogs();
      refreshDiscord();
      refreshSetup();
      setInterval(() => {
        if (state.token) {
          refreshMetrics();
          refreshStatus();
          refreshLogs();
        }
      }, 6000);
    }
  });
}

// =============================================================================
// INITIAL SETUP
// =============================================================================

// ============ INITIAL SETUP FLOW ============
// Check if this is the first installation and show setup screen if needed
async function checkInitialSetup() {
  try {
    const response = await fetch("/api/setup/status");
    const data = await response.json();
    
    if (!data.setupCompleted) {
      // Show setup overlay if setup is not completed
      initialSetup.style.display = "flex";
      document.querySelector(".app").style.display = "none";
    } else {
      // Update language preference if saved from previous setup
      if (data.language) {
        i18n.setLanguage(data.language);
      }
    }
  } catch (error) {
    console.error("Error checking setup:", error);
  }
}

// ============ LANGUAGE SELECTION ============
// Handle language selection during setup
langButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const lang = btn.getAttribute("data-lang");
    i18n.setLanguage(lang);
    
    // Progress to account creation step
    setupStep1.style.display = "none";
    setupStep2.style.display = "block";
  });
});

// ============ SETUP COMPLETION ============
// Handle final setup step: create admin account and complete initialization
setupFinishBtn.addEventListener("click", async () => {
  setupError.textContent = "";
  
  const username = setupUsername.value.trim();
  const password = setupPassword.value;
  const confirmPassword = setupConfirmPassword.value;
  
  // Validate username and password requirements
  if (!username) {
    setupError.textContent = i18n.t("setup_username_required");
    return;
  }
  
  if (!password) {
    setupError.textContent = i18n.t("setup_password_required");
    return;
  }
  
  if (password.length < 4) {
    setupError.textContent = i18n.t("setup_password_min");
    return;
  }
  
  if (password !== confirmPassword) {
    setupError.textContent = i18n.t("setup_passwords_mismatch");
    return;
  }
  
  try {
    setupFinishBtn.disabled = true;
    setupFinishBtn.textContent = i18n.t("common_loading");
    
    const response = await fetch("/api/setup/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        language: i18n.getCurrentLanguage()
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Setup completed successfully, show the app
      initialSetup.style.display = "none";
      document.querySelector(".app").style.display = "flex";
      
      // Prepare for login with the newly created credentials
      loginUser.value = username;
      loginPass.value = password;
      loginBtn.click();
    } else {
      setupError.textContent = data.error || i18n.t("setup_complete_error");
      setupFinishBtn.disabled = false;
      setupFinishBtn.textContent = i18n.t("setup_finish");
    }
  } catch (error) {
    setupError.textContent = error.message;
    setupFinishBtn.disabled = false;
    setupFinishBtn.textContent = i18n.t("setup_finish");
  }
});

// =============================================================================
// SERVER CONFIGURATION
// =============================================================================

// Load saved server configuration from file
async function loadServerConfig() {
  try {
    const response = await fetch("/api/server/config", {
      headers: { "x-token": state.token }
    });
    
    if (response.ok) {
      const data = await response.json();
      configThreads.value = data.threads || 4;
      configRamMin.value = data.ramMin || 2048;
      configRamMax.value = data.ramMax || 4096;
    }
  } catch (error) {
    console.error("Error loading server config:", error);
  }
}

// Save server configuration with validation and error handling
saveServerConfigBtn.addEventListener("click", async () => {
  try {
    const threads = parseInt(configThreads.value);
    const ramMin = parseInt(configRamMin.value);
    const ramMax = parseInt(configRamMax.value);
    
    // Validate that min RAM is less than max RAM
    if (ramMin >= ramMax) {
      // Display error if minimum RAM is not less than maximum RAM
      serverConfigMessage.textContent = i18n.t("server_config_ram_error");
      serverConfigMessage.className = "config-message error";
      return;
    }
    
    if (threads < 1 || threads > 32) {
      // Threads must be within valid range (1-32 CPU cores)
      serverConfigMessage.textContent = i18n.t("server_config_threads_error");
      serverConfigMessage.className = "config-message error";
      return;
    }
    
    saveServerConfigBtn.disabled = true;
    saveServerConfigBtn.textContent = i18n.t("common_loading");
    
    const response = await fetch("/api/server/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-token": state.token
      },
      body: JSON.stringify({ threads, ramMin, ramMax })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      serverConfigMessage.textContent = i18n.t("server_config_success") + " - " + i18n.t("server_config_restart_required");
      serverConfigMessage.className = "config-message success";
    } else {
      serverConfigMessage.textContent = data.error || i18n.t("server_config_error");
      serverConfigMessage.className = "config-message error";
    }
  } catch (error) {
    serverConfigMessage.textContent = error.message;
    serverConfigMessage.className = "config-message error";
  } finally {
    saveServerConfigBtn.disabled = false;
    saveServerConfigBtn.textContent = i18n.t("server_config_save");
  }
});

// ============ BACKUP CONFIGURATION ============
// Load current backup location configuration from backend
async function loadBackupConfig() {
  try {
    const config = await apiFetch("/api/backup/config");
    if (config && backupLocation) {
      backupLocation.value = config.backupLocation || "";
    }
  } catch (error) {
    console.error("Error loading backup config:", error);
  }
}

// Allow user to change backup storage location via file picker
backupChangeLocationBtn?.addEventListener("click", () => {
  backupLocationPicker.click();
});

backupLocationPicker?.addEventListener("change", async (e) => {
  try {
    const files = e.target.files;
    if (files.length === 0) return;

    // Extraer ruta absoluta del primer archivo seleccionado (Electron expone .path)
    const first = files[0];
    const absoluteFilePath = (first.path || "").replace(/\\/g, "/");
    const lastSlash = absoluteFilePath.lastIndexOf("/");
    const directory = lastSlash > 0 ? absoluteFilePath.slice(0, lastSlash) : "";

    if (!directory) {
      backupLocationMessage.textContent = i18n.t("backup_location_error");
      backupLocationMessage.className = "message error";
      return;
    }

    backupChangeLocationBtn.disabled = true;
    backupChangeLocationBtn.textContent = i18n.t("common_loading");

    const data = await apiFetch("/api/backup/config", {
      method: "POST",
      body: JSON.stringify({ backupLocation: directory })
    });

    if (data) {
      backupLocation.value = data.config.backupLocation;
      backupLocationMessage.textContent = i18n.t("backup_location_updated");
      backupLocationMessage.className = "message success";
    }
  } catch (error) {
    backupLocationMessage.textContent = error.message;
    backupLocationMessage.className = "message error";
  } finally {
    backupChangeLocationBtn.disabled = false;
    backupChangeLocationBtn.textContent = i18n.t("backup_change_location");
    backupLocationPicker.value = "";
  }
});

// ============ UNINSTALLER ============

const uninstallBtn = document.getElementById("uninstall-btn");
const uninstallKeepServer = document.getElementById("uninstall-keep-server");
const uninstallMessage = document.getElementById("uninstall-message");

function showUninstallMessage(text, type = "success") {
  uninstallMessage.textContent = text;
  uninstallMessage.className = type;
  setTimeout(() => {
    uninstallMessage.textContent = "";
    uninstallMessage.className = "";
  }, 5000);
}

uninstallBtn.addEventListener("click", async () => {
  const keepServerData = uninstallKeepServer.checked;
  
  const confirmMessage = i18n.t("uninstall_confirm");
  if (!confirm(confirmMessage)) {
    return;
  }
  
  try {
    const data = await apiFetch("/api/uninstall", {
      method: "POST",
      body: JSON.stringify({ keepServerData })
    });
    
    if (data && data.success) {
      showUninstallMessage(i18n.t("uninstall_success"), "success");
      
      // Wait a bit before closing the window
      setTimeout(() => {
        window.close();
      }, 3000);
    }
  } catch (error) {
    const errorMsg = i18n.t("uninstall_error").replace("{error}", error.message);
    showUninstallMessage(errorMsg, "error");
  }
});

// ============ APPLICATION INITIALIZATION ============
// Initialize app after i18n system is loaded and ready
async function refreshPlatformStatus() {
  try {
    if (!state.token) return;
    const data = await apiFetch("/api/platform/status");
    if (!data) return;
    const warnings = [];
    if (!data.javaFound) warnings.push("Java 25 not found (required)");
    if (!data.downloaderFound) warnings.push("Downloader not found for this platform");
    if (warnings.length) {
      statusExtra.textContent = warnings.join(" • ");
      statusExtra.classList.add("warn");
    } else {
      statusExtra.textContent = i18n.t("status_ready") || "Ready";
      statusExtra.classList.remove("warn");
    }
  } catch (error) {
    console.error("Error loading platform status:", error);
  }
}

async function initializeApp() {
  console.log('App initialization started');
  await checkInitialSetup();
  await refreshPlatformStatus();
  
  // Dynamically load server config or backup config when user navigates to those views
  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const view = btn.getAttribute("data-view");
      if (view === "server-config" && state.token) {
        loadServerConfig();
      }
      if (view === "backups" && state.token) {
        loadBackupConfig();
      }
      if (view === "dashboard" && state.token) {
        refreshPlatformStatus();
      }
    });
  });
}

// ============ I18N SYSTEM READINESS ============
// Wait for i18n system to be ready before initializing the app
if (i18n && i18n.loaded) {
  // i18n is already loaded, proceed with initialization
  initializeApp();
} else {
  // Wait for i18n-ready event if i18n is not yet loaded
  window.addEventListener('i18n-ready', initializeApp);
  
  // Fallback timeout: initialize anyway if i18n event doesn't fire within 5 seconds
  setTimeout(() => {
    if (!document.querySelector('[data-view="dashboard"]')?.offsetParent) {
      console.warn('i18n-ready event not received, initializing anyway');
      initializeApp();
    }
  }, 5000);
}

