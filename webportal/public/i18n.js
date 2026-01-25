// ============ INTERNATIONALIZATION SYSTEM (i18n) ============
// Translation key definitions for all supported languages
const translations = {
  es: {
    // Setup
    setup_welcome: "Bienvenido a Hytale Server Portal",
    setup_select_language: "Selecciona tu idioma",
    setup_create_account: "Crear Cuenta de Administrador",
    setup_username: "Usuario",
    setup_password: "Contraseña",
    setup_confirm_password: "Confirmar Contraseña",
    setup_finish: "Finalizar Instalación",
    setup_username_required: "El usuario es obligatorio",
    setup_password_required: "La contraseña es obligatoria",
    setup_passwords_mismatch: "Las contraseñas no coinciden",
    setup_password_min: "La contraseña debe tener al menos 4 caracteres",
    
    // Navigation
    nav_dashboard: "Panel",
    nav_setup: "Setup",
    nav_files: "Gestor",
    nav_backups: "Backups",
    nav_config: "Config",
    nav_discord: "Discord",
    nav_server_config: "Servidor",
    
    // Dashboard
    dashboard_title: "Control del Servidor",
    dashboard_start: "Iniciar",
    dashboard_stop: "Detener",
    dashboard_status: "Estado",
    dashboard_ram: "RAM del servidor",
    dashboard_cpu: "CPU",
    dashboard_disk: "Disco",
    dashboard_folder_size: "Tamaño de carpeta",
    dashboard_console: "Consola del Servidor",
    
    // Server Config
    server_config_title: "Configuración del Servidor",
    server_config_threads: "Hilos de CPU",
    server_config_ram_min: "RAM Mínima (MB)",
    server_config_ram_max: "RAM Máxima (MB)",
    server_config_save: "Guardar Configuración",
    server_config_success: "Configuración guardada exitosamente",
    server_config_error: "Error al guardar la configuración",
    server_config_restart_required: "Reinicia el servidor para aplicar cambios",
    
    // Auth
    auth_login: "Acceso",
    auth_username: "Usuario",
    auth_password: "Contraseña",
    auth_button: "Entrar",
    auth_logout: "Salir",
    
    // Common
    common_save: "Guardar",
    common_cancel: "Cancelar",
    common_loading: "Cargando...",
    common_error: "Error",
    common_success: "Éxito"
  },
  
  en: {
    // Setup
    setup_welcome: "Welcome to Hytale Server Portal",
    setup_select_language: "Select your language",
    setup_create_account: "Create Administrator Account",
    setup_username: "Username",
    setup_password: "Password",
    setup_confirm_password: "Confirm Password",
    setup_finish: "Finish Installation",
    setup_username_required: "Username is required",
    setup_password_required: "Password is required",
    setup_passwords_mismatch: "Passwords do not match",
    setup_password_min: "Password must be at least 4 characters",
    
    // Navigation
    nav_dashboard: "Dashboard",
    nav_setup: "Setup",
    nav_files: "Files",
    nav_backups: "Backups",
    nav_config: "Config",
    nav_discord: "Discord",
    nav_server_config: "Server",
    
    // Dashboard
    dashboard_title: "Server Control",
    dashboard_start: "Start",
    dashboard_stop: "Stop",
    dashboard_status: "Status",
    dashboard_ram: "Server RAM",
    dashboard_cpu: "CPU",
    dashboard_disk: "Disk",
    dashboard_folder_size: "Folder size",
    dashboard_console: "Server Console",
    
    // Server Config
    server_config_title: "Server Configuration",
    server_config_threads: "CPU Threads",
    server_config_ram_min: "Minimum RAM (MB)",
    server_config_ram_max: "Maximum RAM (MB)",
    server_config_save: "Save Configuration",
    server_config_success: "Configuration saved successfully",
    server_config_error: "Error saving configuration",
    server_config_restart_required: "Restart the server to apply changes",
    
    // Auth
    auth_login: "Login",
    auth_username: "Username",
    auth_password: "Password",
    auth_button: "Login",
    auth_logout: "Logout",
    
    // Common
    common_save: "Save",
    common_cancel: "Cancel",
    common_loading: "Loading...",
    common_error: "Error",
    common_success: "Success"
  },
  
  pt: {
    // Setup
    setup_welcome: "Bem-vindo ao Hytale Server Portal",
    setup_select_language: "Selecione seu idioma",
    setup_create_account: "Criar Conta de Administrador",
    setup_username: "Usuário",
    setup_password: "Senha",
    setup_confirm_password: "Confirmar Senha",
    setup_finish: "Concluir Instalação",
    setup_username_required: "O usuário é obrigatório",
    setup_password_required: "A senha é obrigatória",
    setup_passwords_mismatch: "As senhas não coincidem",
    setup_password_min: "A senha deve ter pelo menos 4 caracteres",
    
    // Navigation
    nav_dashboard: "Painel",
    nav_setup: "Configurar",
    nav_files: "Arquivos",
    nav_backups: "Backups",
    nav_config: "Config",
    nav_discord: "Discord",
    nav_server_config: "Servidor",
    
    // Dashboard
    dashboard_title: "Controle do Servidor",
    dashboard_start: "Iniciar",
    dashboard_stop: "Parar",
    dashboard_status: "Status",
    dashboard_ram: "RAM do servidor",
    dashboard_cpu: "CPU",
    dashboard_disk: "Disco",
    dashboard_folder_size: "Tamanho da pasta",
    dashboard_console: "Console do Servidor",
    
    // Server Config
    server_config_title: "Configuração do Servidor",
    server_config_threads: "Threads de CPU",
    server_config_ram_min: "RAM Mínima (MB)",
    server_config_ram_max: "RAM Máxima (MB)",
    server_config_save: "Salvar Configuração",
    server_config_success: "Configuração salva com sucesso",
    server_config_error: "Erro ao salvar configuração",
    server_config_restart_required: "Reinicie o servidor para aplicar as alterações",
    
    // Auth
    auth_login: "Acesso",
    auth_username: "Usuário",
    auth_password: "Senha",
    auth_button: "Entrar",
    auth_logout: "Sair",
    
    // Common
    common_save: "Salvar",
    common_cancel: "Cancelar",
    common_loading: "Carregando...",
    common_error: "Erro",
    common_success: "Sucesso"
  },
  
  fr: {
    // Setup
    setup_welcome: "Bienvenue sur Hytale Server Portal",
    setup_select_language: "Sélectionnez votre langue",
    setup_create_account: "Créer un compte administrateur",
    setup_username: "Nom d'utilisateur",
    setup_password: "Mot de passe",
    setup_confirm_password: "Confirmer le mot de passe",
    setup_finish: "Terminer l'installation",
    setup_username_required: "Le nom d'utilisateur est requis",
    setup_password_required: "Le mot de passe est requis",
    setup_passwords_mismatch: "Les mots de passe ne correspondent pas",
    setup_password_min: "Le mot de passe doit contenir au moins 4 caractères",
    
    // Navigation
    nav_dashboard: "Tableau de bord",
    nav_setup: "Configuration",
    nav_files: "Fichiers",
    nav_backups: "Sauvegardes",
    nav_config: "Config",
    nav_discord: "Discord",
    nav_server_config: "Serveur",
    
    // Dashboard
    dashboard_title: "Contrôle du serveur",
    dashboard_start: "Démarrer",
    dashboard_stop: "Arrêter",
    dashboard_status: "Statut",
    dashboard_ram: "RAM du serveur",
    dashboard_cpu: "CPU",
    dashboard_disk: "Disque",
    dashboard_folder_size: "Taille du dossier",
    dashboard_console: "Console du serveur",
    
    // Server Config
    server_config_title: "Configuration du serveur",
    server_config_threads: "Threads CPU",
    server_config_ram_min: "RAM minimale (MB)",
    server_config_ram_max: "RAM maximale (MB)",
    server_config_save: "Enregistrer la configuration",
    server_config_success: "Configuration enregistrée avec succès",
    server_config_error: "Erreur lors de l'enregistrement",
    server_config_restart_required: "Redémarrez le serveur pour appliquer les modifications",
    
    // Auth
    auth_login: "Connexion",
    auth_username: "Nom d'utilisateur",
    auth_password: "Mot de passe",
    auth_button: "Se connecter",
    auth_logout: "Déconnexion",
    
    // Common
    common_save: "Enregistrer",
    common_cancel: "Annuler",
    common_loading: "Chargement...",
    common_error: "Erreur",
    common_success: "Succès"
  },
  
  zh: {
    // Setup
    setup_welcome: "欢迎使用 Hytale 服务器管理面板",
    setup_select_language: "选择您的语言",
    setup_create_account: "创建管理员账户",
    setup_username: "用户名",
    setup_password: "密码",
    setup_confirm_password: "确认密码",
    setup_finish: "完成安装",
    setup_username_required: "用户名是必需的",
    setup_password_required: "密码是必需的",
    setup_passwords_mismatch: "密码不匹配",
    setup_password_min: "密码必须至少4个字符",
    
    // Navigation
    nav_dashboard: "仪表板",
    nav_setup: "设置",
    nav_files: "文件",
    nav_backups: "备份",
    nav_config: "配置",
    nav_discord: "Discord",
    nav_server_config: "服务器",
    
    // Dashboard
    dashboard_title: "服务器控制",
    dashboard_start: "启动",
    dashboard_stop: "停止",
    dashboard_status: "状态",
    dashboard_ram: "服务器内存",
    dashboard_cpu: "CPU",
    dashboard_disk: "磁盘",
    dashboard_folder_size: "文件夹大小",
    dashboard_console: "服务器控制台",
    
    // Server Config
    server_config_title: "服务器配置",
    server_config_threads: "CPU 线程",
    server_config_ram_min: "最小内存 (MB)",
    server_config_ram_max: "最大内存 (MB)",
    server_config_save: "保存配置",
    server_config_success: "配置保存成功",
    server_config_error: "保存配置时出错",
    server_config_restart_required: "重启服务器以应用更改",
    
    // Auth
    auth_login: "登录",
    auth_username: "用户名",
    auth_password: "密码",
    auth_button: "登录",
    auth_logout: "登出",
    
    // Common
    common_save: "保存",
    common_cancel: "取消",
    common_loading: "加载中...",
    common_error: "错误",
    common_success: "成功"
  }
};

class I18n {
  constructor() {
    this.currentLang = localStorage.getItem('language') || 'es';
  }
  
  setLanguage(lang) {
    if (translations[lang]) {
      this.currentLang = lang;
      localStorage.setItem('language', lang);
      this.updateUI();
    }
  }
  
  t(key) {
    return translations[this.currentLang]?.[key] || key;
  }
  
  updateUI() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (el.tagName === 'INPUT' && el.placeholder !== undefined) {
        el.placeholder = this.t(key);
      } else {
        el.textContent = this.t(key);
      }
    });
    
    // Update input placeholders with translations
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });
  }
  
  getCurrentLanguage() {
    return this.currentLang;
  }
}

// Instancia global
const i18n = new I18n();
