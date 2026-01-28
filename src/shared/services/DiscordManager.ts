import fs from 'fs';
import path from 'path';
import https from 'https';

export interface DiscordConfig {
  enabled: boolean;
  botToken: string;
  channelId: string;
  messageOnline: string;
  messageOffline: string;
  channelNameOnline: string;
  channelNameOffline: string;
}

export class DiscordManager {
  private configPath: string;
  private config: DiscordConfig | null = null;

  constructor(appDataPath: string) {
    this.configPath = path.join(appDataPath, 'discord-config.json');
    this.loadConfig();
  }

  /**
   * Carga la configuración de Discord desde el archivo
   */
  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        this.config = JSON.parse(data);
      } else {
        this.config = this.getDefaultConfig();
      }
    } catch (error) {
      console.error('Error cargando configuración de Discord:', error);
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Obtiene la configuración por defecto
   */
  private getDefaultConfig(): DiscordConfig {
    return {
      enabled: false,
      botToken: '',
      channelId: '',
      messageOnline: '✅ Servidor Hytale está en línea',
      messageOffline: '❌ Servidor Hytale está fuera de línea',
      channelNameOnline: '🟢-servidor-online',
      channelNameOffline: '🔴-servidor-offline',
    };
  }

  /**
   * Guarda la configuración de Discord
   */
  async saveConfig(config: DiscordConfig): Promise<void> {
    try {
      this.config = config;
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error guardando configuración de Discord:', error);
      throw new Error('No se pudo guardar la configuración de Discord');
    }
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig(): DiscordConfig {
    return this.config || this.getDefaultConfig();
  }

  /**
   * Envía un mensaje a Discord
   */
  async sendMessage(message: string): Promise<boolean> {
    if (!this.config || !this.config.enabled || !this.config.botToken || !this.config.channelId) {
      console.log('Discord no está configurado o deshabilitado');
      return false;
    }

    return new Promise((resolve) => {
      const data = JSON.stringify({ content: message });

      const options = {
        hostname: 'discord.com',
        port: 443,
        path: `/api/v10/channels/${this.config!.channelId}/messages`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
          'Authorization': `Bot ${this.config!.botToken}`,
        },
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 204) {
            console.log('Mensaje enviado a Discord exitosamente');
            resolve(true);
          } else {
            console.error('Error enviando mensaje a Discord:', res.statusCode, responseData);
            resolve(false);
          }
        });
      });

      req.on('error', (error) => {
        console.error('Error de conexión con Discord:', error);
        resolve(false);
      });

      req.write(data);
      req.end();
    });
  }

  /**
   * Cambia el nombre del canal de Discord
   */
  async updateChannelName(name: string): Promise<boolean> {
    if (!this.config || !this.config.enabled || !this.config.botToken || !this.config.channelId) {
      console.log('Discord no está configurado o deshabilitado');
      return false;
    }

    return new Promise((resolve) => {
      const data = JSON.stringify({ name: name });

      const options = {
        hostname: 'discord.com',
        port: 443,
        path: `/api/v10/channels/${this.config!.channelId}`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
          'Authorization': `Bot ${this.config!.botToken}`,
        },
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('Nombre del canal actualizado exitosamente');
            resolve(true);
          } else {
            console.error('Error actualizando nombre del canal:', res.statusCode, responseData);
            resolve(false);
          }
        });
      });

      req.on('error', (error) => {
        console.error('Error de conexión con Discord:', error);
        resolve(false);
      });

      req.write(data);
      req.end();
    });
  }

  /**
   * Notifica el estado del servidor (online/offline)
   */
  async notifyServerStatus(isOnline: boolean): Promise<boolean> {
    if (!this.config || !this.config.enabled) {
      return false;
    }

    const message = isOnline ? this.config.messageOnline : this.config.messageOffline;
    const channelName = isOnline ? this.config.channelNameOnline : this.config.channelNameOffline;

    // Enviar mensaje
    const messageSent = await this.sendMessage(message);

    // Actualizar nombre del canal
    const channelUpdated = await this.updateChannelName(channelName);

    return messageSent && channelUpdated;
  }

  /**
   * Prueba la conexión con Discord
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config || !this.config.botToken || !this.config.channelId) {
      return {
        success: false,
        message: 'Token o Canal ID no configurados',
      };
    }

    const testMessage = '🧪 Mensaje de prueba - Hytale Server Portal';
    const success = await this.sendMessage(testMessage);

    return {
      success,
      message: success
        ? 'Conexión exitosa con Discord'
        : 'Error al conectar con Discord. Verifica el Token y Canal ID',
    };
  }
}
