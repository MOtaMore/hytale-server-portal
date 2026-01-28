import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

export interface ServerConfig {
  ramMin: number; // En MB
  ramMax: number; // En MB
  cpuMin?: number;
  cpuMax?: number;
  properties: Record<string, any>; // Contenido del config.json
}

export interface SystemResources {
  totalRAM: number; // En MB
  totalCPUs: number;
}

export class ConfigManager {
  private configPath: string;

  constructor(serverPath: string) {
    // Buscar el archivo config.json en la raíz del servidor
    this.configPath = path.join(serverPath, 'config.json');
  }

  /**
   * Lee la configuración del servidor desde config.json
   */
  async readConfig(): Promise<ServerConfig> {
    try {
      const content = await readFile(this.configPath, 'utf-8');
      const jsonData = JSON.parse(content);
      const config = this.parseConfig(jsonData);
      return config;
    } catch (error) {
      console.error('Error leyendo configuración:', error);
      throw new Error('No se pudo leer el archivo de configuración (config.json)');
    }
  }

  /**
   * Escribe la configuración del servidor en config.json
   */
  async writeConfig(config: ServerConfig): Promise<void> {
    try {
      const content = this.buildConfigContent(config);
      await writeFile(this.configPath, content, 'utf-8');
    } catch (error) {
      console.error('Error escribiendo configuración:', error);
      throw new Error('No se pudo escribir el archivo de configuración');
    }
  }

  /**
   * Parsea el contenido JSON de configuración
   */
  private parseConfig(jsonData: Record<string, any>): ServerConfig {
    let ramMin = jsonData.ramMin || 1024; // Default 1GB
    let ramMax = jsonData.ramMax || 2048; // Default 2GB
    let cpuMin = jsonData.cpuMin || 1;
    let cpuMax = jsonData.cpuMax || 4;

    return {
      ramMin,
      ramMax,
      cpuMin,
      cpuMax,
      properties: jsonData,
    };
  }

  /**
   * Construye el contenido del archivo de configuración en JSON
   */
  private buildConfigContent(config: ServerConfig): string {
    const updatedConfig = {
      ...config.properties,
      ramMin: config.ramMin,
      ramMax: config.ramMax,
      cpuMin: config.cpuMin || 1,
      cpuMax: config.cpuMax || 4,
    };

    return JSON.stringify(updatedConfig, null, 2);
  }

  /**
   * Obtiene la ruta del archivo de configuración
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Verifica si el archivo de configuración existe
   */
  async configExists(): Promise<boolean> {
    try {
      fs.accessSync(this.configPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene los recursos disponibles del sistema
   */
  getSystemResources(): SystemResources {
    const totalRAMBytes = os.totalmem();
    const totalRAMMB = Math.floor(totalRAMBytes / (1024 * 1024));
    const totalCPUs = os.cpus().length;

    return {
      totalRAM: totalRAMMB,
      totalCPUs: totalCPUs,
    };
  }

  /**
   * Crea un archivo de configuración por defecto
   */
  async createDefaultConfig(): Promise<void> {
    const defaultConfig = {
      ramMin: 1024,
      ramMax: 2048,
      cpuMin: 1,
      cpuMax: 4,
      // Aquí pueden ir otras propiedades del servidor
    };
    await writeFile(this.configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
  }
}
